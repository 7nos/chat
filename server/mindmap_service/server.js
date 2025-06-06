require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const retry = require('async-retry');

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash"; // Updated to use gemini-1.5-flash
const TEMPERATURE = 0.7;
const MAX_TOKENS = 4096;

if (!API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not available in the environment.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Mind Map Service is running' });
});

// Test API key endpoint
app.get('/api/test-key', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent('Test connection');
        res.json({ success: true, message: 'API key is valid' });
    } catch (error) {
        console.error('API key test failed:', error);
        res.status(500).json({ 
            success: false, 
            error: 'API key test failed',
            details: error.message 
        });
    }
});

// Generate mind map endpoint
app.post('/api/generate-mindmap', async (req, res) => {
    try {
        let textContent = '';

        if (req.files && req.files.pdf) {
            const pdfBuffer = req.files.pdf.data;
            const pdfData = await pdfParse(pdfBuffer);
            textContent = pdfData.text;
        } else if (req.body.prompt) {
            textContent = req.body.prompt;
        } else {
            return res.status(400).json({ error: 'No PDF file or prompt provided' });
        }

        const mindMapPrompt = `Generate a structured text outline for a mind map based on the following content. Format the output as follows:

- Root node: 'Mind Map: [Main Topic]'
- List 3-5 main topics, each followed by a colon (:)
- For each main topic, provide 2-4 subtopics or details, separated by commas
- Use only this format, with no additional explanations or formatting markers
- Ensure the output is clear, concise, and hierarchical

Content to analyze:
${textContent}`;

        const result = await retry(
            async () => {
                const model = genAI.getGenerativeModel({ 
                    model: MODEL_NAME,
                    generationConfig: {
                        temperature: TEMPERATURE,
                        maxOutputTokens: MAX_TOKENS,
                    },
                });
                const response = await model.generateContent(mindMapPrompt);
                return response.response.text();
            },
            {
                retries: 3,
                factor: 2,
                minTimeout: 1000,
                maxTimeout: 5000,
                onRetry: (error, attemptNumber) => {
                    console.log(`Retry attempt ${attemptNumber} due to: ${error.message}`);
                },
            }
        );

        // Parse the response into a mind map structure
        const lines = result.split('\n').filter(line => line.trim());
        const mindMap = {
            name: lines[0].replace('Root node: ', '').trim(),
            children: []
        };

        let currentTopic = null;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes(':')) {
                const [topic, subtopics] = line.split(':').map(s => s.trim());
                currentTopic = {
                    name: topic,
                    children: subtopics.split(',').map(s => ({
                        name: s.trim()
                    }))
                };
                mindMap.children.push(currentTopic);
            }
        }

        res.json({ mindmap: mindMap });
    } catch (error) {
        console.error('Error generating mind map:', error);
        res.status(500).json({ 
            error: 'Failed to generate mind map',
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Handle specific error types
    if (err.name === 'GoogleGenerativeAIError') {
        return res.status(500).json({
            error: 'AI Service Error',
            details: err.message,
            type: 'AI_ERROR'
        });
    }
    
    if (err.name === 'PDFParseError') {
        return res.status(400).json({
            error: 'PDF Processing Error',
            details: err.message,
            type: 'PDF_ERROR'
        });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal server error',
        details: err.message,
        type: 'SERVER_ERROR'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Mind Map Service running on port ${PORT}`);
    console.log(`API Key Status: ${API_KEY ? 'Configured' : 'Missing'}`);
    console.log(`Model: ${MODEL_NAME}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 