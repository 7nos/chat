const express = require('express');
const cors = require('cors');
const path = require('path');
const { getLocalIPs } = require('./utils/networkUtils');
const fs = require('fs');
const axios = require('axios');
const mongoose = require('mongoose');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

const connectDB = require('./config/db');
const { performAssetCleanup } = require('./utils/assetCleanup');

// Configuration Defaults
const DEFAULT_PORT = 5001;
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/chatbotGeminiDB';
const DEFAULT_PYTHON_RAG_URL = 'http://localhost:5002';

let port = process.env.PORT || DEFAULT_PORT;
let mongoUri = process.env.MONGO_URI || '';
let pythonRagUrl = process.env.PYTHON_RAG_SERVICE_URL || '';
let geminiApiKey = process.env.GEMINI_API_KEY || '';

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json());

// Basic Root Route
app.get('/', (req, res) => res.send('Chatbot Backend API is running...'));

// API Route Mounting
app.use('/api/network', require('./routes/network'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/files', require('./routes/files'));
app.use('/api/syllabus', require('./routes/syllabus'));

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack || err);
    const statusCode = err.status || 500;
    let message = err.message || 'An internal server error occurred.';
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An internal server error occurred.';
    }
    res.status(statusCode).json({ message });
});

// Server Instance
let server;

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    readline.close();
    try {
        if (server) {
            server.close(async () => {
                console.log('HTTP server closed.');
                try {
                    await mongoose.connection.close();
                    console.log('MongoDB connection closed.');
                } catch (dbCloseError) {
                    console.error("Error closing MongoDB connection:", dbCloseError);
                }
                process.exit(0);
            });
        } else {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed.');
            } catch (dbCloseError) {
                console.error("Error closing MongoDB connection:", dbCloseError);
            }
            process.exit(0);
        }

        setTimeout(() => {
            console.error('Graceful shutdown timed out, forcing exit.');
            process.exit(1);
        }, 10000);
    } catch (shutdownError) {
        console.error("Error during graceful shutdown:", shutdownError);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// RAG Service Health Check
async function checkRagService(url) {
    console.log(`\nChecking RAG service health at ${url}...`);
    try {
        const response = await axios.get(`${url}/health`, { timeout: 7000 });
        if (response.status === 200 && response.data?.status === 'ok') {
            console.log('✓ RAG service is available and healthy.');
            console.log(`  Embedding: ${response.data.embedding_model_type} (${response.data.embedding_model_name})`);
            console.log(`  Default Index Loaded: ${response.data.default_index_loaded}`);
            if (response.data.message && response.data.message.includes("Warning:")) {
                console.warn(`  RAG Health Warning: ${response.data.message}`);
            }
            return true;
        } else {
            console.warn(`! RAG service responded but status is not OK: ${response.status} - ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        console.warn('! RAG service is not reachable.');
        if (error.code === 'ECONNREFUSED') {
            console.warn(`  Connection refused at ${url}. Ensure the RAG service is running.`);
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.warn(`  Connection timed out to ${url}. The RAG service might be slow or unresponsive.`);
        } else {
            console.warn(`  Error: ${error.message}`);
        }
        console.warn('  RAG features (document upload processing, context retrieval) will be unavailable.');
        return false;
    }
}

// Directory Structure Check
async function ensureServerDirectories() {
    const dirs = [
        path.join(__dirname, 'assets'),
        path.join(__dirname, 'backup_assets'),
    ];
    console.log("\nEnsuring server directories exist...");
    try {
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
                console.log(`  Created directory: ${dir}`);
            }
        }
        console.log("✓ Server directories checked/created.");
    } catch (error) {
        console.error('!!! Error creating essential server directories:', error);
        throw error;
    }
}

// Prompt for Configuration
function askQuestion(query) {
    return new Promise(resolve => readline.question(query, resolve));
}

async function configureAndStart() {
    console.log("--- Starting Server Configuration ---");

    if (!geminiApiKey) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! FATAL: GEMINI_API_KEY environment variable is not set. !!!");
        console.error("!!! Please set it before running the server:               !!!");
        console.error("!!! export GEMINI_API_KEY='YOUR_API_KEY'                   !!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        process.exit(1);
    } else {
        console.log("✓ GEMINI_API_KEY found.");
    }

    if (!mongoUri) {
        const answer = await askQuestion(`Enter MongoDB URI or press Enter for default (${DEFAULT_MONGO_URI}): `);
        mongoUri = answer.trim() || DEFAULT_MONGO_URI;
    }
    console.log(`Using MongoDB URI: ${mongoUri}`);

    if (!pythonRagUrl) {
        const answer = await askQuestion(`Enter Python RAG Service URL or press Enter for default (${DEFAULT_PYTHON_RAG_URL}): `);
        pythonRagUrl = answer.trim() || DEFAULT_PYTHON_RAG_URL;
    }
    console.log(`Using Python RAG Service URL: ${pythonRagUrl}`);

    console.log(`Node.js server will listen on port: ${port}`);

    readline.close();

    process.env.MONGO_URI = mongoUri;
    process.env.PYTHON_RAG_SERVICE_URL = pythonRagUrl;

    console.log("--- Configuration Complete ---");

    await startServer();
}

async function startServer() {
    console.log("\n--- Starting Server Initialization ---");
    try {
        await ensureServerDirectories();
        await connectDB(mongoUri);
        await performAssetCleanup();
        await checkRagService(pythonRagUrl);

        const PORT = port;
        const availableIPs = getLocalIPs();

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n=== Node.js Server Ready ===');
            console.log(`🚀 Server listening on port ${PORT}`);
            console.log('   Access the application via these URLs (using common frontend ports):');
            const frontendPorts = [3000, 3001, 8080, 5173];
            availableIPs.forEach(ip => {
                frontendPorts.forEach(fp => {
                    console.log(`   - http://${ip}:${fp} (Frontend) -> Connects to Backend at http://${ip}:${PORT}`);
                });
            });
            console.log('============================\n');
            console.log("💡 Hint: Client automatically detects backend IP based on how you access the frontend.");
            console.log(`   Ensure firewalls allow connections on port ${PORT} (Backend) and your frontend port.`);
            console.log("--- Server Initialization Complete ---");
        });
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! Failed to start Node.js server:", error.message);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        process.exit(1);
    }
}

configureAndStart();