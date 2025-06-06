const express = require('express');
const axios = require('axios');
const { tempAuth } = require('../middleware/authMiddleware');
const ChatHistory = require('../models/ChatHistory');
const { v4: uuidv4, validate: isUUID } = require('uuid');
const { generateContentWithHistory } = require('../services/geminiService');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for /message and /rag endpoints
const messageRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later.'
});

// Helper to call Python RAG Query Endpoint
async function queryPythonRagService(userId, query, k = 5) {
    const pythonServiceUrl = process.env.PYTHON_RAG_SERVICE_URL;
    if (!pythonServiceUrl) {
        console.error("RAG service URL not configured. Please set PYTHON_RAG_SERVICE_URL in .env");
        throw new Error("RAG service URL not configured.");
    }

    try {
        const response = await axios.post(`${pythonServiceUrl}/query`, {
            user_id: userId,
            query,
            k
        }, { 
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.data) {
            throw new Error("Empty response from RAG service");
        }

        if (!Array.isArray(response.data.relevantDocs)) {
            console.warn("RAG service returned invalid response format:", response.data);
            return [];
        }

        return response.data.relevantDocs;
    } catch (error) {
        console.error("RAG service error:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            code: error.code
        });
        
        if (error.code === 'ECONNREFUSED') {
            throw new Error("RAG service is not running. Please start the RAG service.");
        }
        
        if (error.code === 'ETIMEDOUT') {
            throw new Error("RAG service request timed out. Please try again.");
        }

        return [];
    }
}

// POST /api/chat/message
router.post('/message', tempAuth, messageRateLimiter, async (req, res) => {
    const { message, sessionId, isRagEnabled } = req.body;
    const userId = req.user._id;

    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ message: 'Message text required.' });
    }
    if (!sessionId || !isUUID(sessionId)) {
        return res.status(400).json({ message: 'Valid session ID required.' });
    }

    try {
        let chatSession = await ChatHistory.findOne({ sessionId, userId });
        if (!chatSession) {
            chatSession = new ChatHistory({
                userId,
                sessionId,
                messages: []
            });
        }

        const userMessage = {
            role: 'user',
            parts: [{ text: message.trim() }],
            timestamp: new Date()
        };
        chatSession.messages.push(userMessage);

        let response;
        try {
            if (isRagEnabled) {
                const relevantDocs = await queryPythonRagService(userId, message.trim());
                if (relevantDocs.length === 0) {
                    console.warn("RAG service returned no relevant documents.");
                    response = {
                        message: "No relevant documents found; answering without RAG context.",
                        timestamp: new Date()
                    };
                } else {
                    const maxContextLength = 5000;
                    const ragContext = relevantDocs
                        .map(doc => doc.content)
                        .join('\n\n')
                        .substring(0, maxContextLength);
                    const systemPromptText = `Use the following documents to help answer the user's question:\n\n${ragContext}`;
                    const generatedText = await generateContentWithHistory(
                        chatSession.messages,
                        systemPromptText,
                        relevantDocs
                    );

                    response = {
                        message: generatedText,
                        timestamp: new Date()
                    };
                }
            } else {
                const generatedText = await generateContentWithHistory(chatSession.messages);
                response = {
                    message: generatedText,
                    timestamp: new Date()
                };
            }
        } catch (err) {
            console.error("Gemini generation error:", err);
            response = {
                message: err.status === 400 ? err.message : "Sorry, there was an issue generating the response.",
                timestamp: new Date()
            };
        }

        const aiMessage = {
            role: 'model',
            parts: [{ text: response.message }],
            timestamp: response.timestamp
        };
        chatSession.messages.push(aiMessage);

        await chatSession.save();

        res.status(200).json({ message: response.message });

    } catch (error) {
        console.error("Message handling error:", error);
        res.status(error.status || 500).json({ message: error.message || 'Failed to process message.' });
    }
});

// POST /api/chat/rag
router.post('/rag', tempAuth, messageRateLimiter, async (req, res) => {
    const { message } = req.body;
    const userId = req.user._id.toString();

    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ message: 'Query message text required.' });
    }

    try {
        const kValue = 5;
        const relevantDocs = await queryPythonRagService(userId, message.trim(), kValue);
        res.status(200).json({ relevantDocs });
    } catch (error) {
        console.error("RAG query error:", error);
        res.status(500).json({ message: "Failed to retrieve relevant documents." });
    }
});

// GET /api/chat/history
router.get('/history', tempAuth, async (req, res) => {
    const userId = req.user._id;
    const { sessionId, page = 1, limit = 50 } = req.query;

    if (sessionId && !isUUID(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID format.' });
    }

    try {
        const query = { userId };
        if (sessionId) query.sessionId = sessionId;

        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            ChatHistory.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('sessionId messages createdAt updatedAt'),
            ChatHistory.countDocuments(query)
        ]);

        const formattedSessions = sessions.map(session => ({
            sessionId: session.sessionId,
            messageCount: session.messages.length,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            preview: session.messages[0]?.parts[0]?.text?.substring(0, 75) || 'Chat Session'
        }));

        res.status(200).json({
            sessions: formattedSessions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("History retrieval error:", error);
        res.status(500).json({ message: 'Failed to retrieve chat history.' });
    }
});

// GET /api/chat/sessions
router.get('/sessions', tempAuth, async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    try {
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            ChatHistory.find({ userId })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('sessionId messages createdAt updatedAt'),
            ChatHistory.countDocuments({ userId })
        ]);

        const sessionsByDate = sessions.reduce((acc, session) => {
            const date = session.updatedAt.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push({
                sessionId: session.sessionId,
                messageCount: session.messages.length,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                preview: session.messages[0]?.parts[0]?.text?.substring(0, 75) || 'Chat Session'
            });
            return acc;
        }, {});

        res.status(200).json({
            sessionsByDate,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Sessions retrieval error:", error);
        res.status(500).json({ message: 'Failed to retrieve chat sessions.' });
    }
});

// GET /api/chat/sessions/:sessionId
router.get('/sessions/:sessionId', tempAuth, async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user._id;

    if (!sessionId || !isUUID(sessionId)) {
        return res.status(400).json({ message: 'Valid session ID parameter is required.' });
    }

    try {
        const session = await ChatHistory.findOne({ sessionId, userId });
        if (!session) {
            return res.status(404).json({ message: 'Chat session not found or access denied.' });
        }
        res.status(200).json(session);
    } catch (error) {
        console.error("Session retrieval error:", error);
        res.status(500).json({ message: 'Failed to retrieve chat session details.' });
    }
});

// POST /api/chat/sessions
router.post('/sessions', tempAuth, async (req, res) => {
    const userId = req.user._id;
    const sessionId = uuidv4();

    try {
        const session = new ChatHistory({
            userId,
            sessionId,
            messages: []
        });
        await session.save();
        res.status(201).json({ sessionId });
    } catch (error) {
        console.error("Session creation error:", error);
        res.status(500).json({ message: 'Failed to create chat session.' });
    }
});

// DELETE /api/chat/sessions/:sessionId
router.delete('/sessions/:sessionId', tempAuth, async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user._id;

    if (!sessionId || !isUUID(sessionId)) {
        return res.status(400).json({ message: 'Valid session ID parameter is required.' });
    }

    try {
        const result = await ChatHistory.findOneAndDelete({ sessionId, userId });
        if (!result) {
            return res.status(404).json({ message: 'Chat session not found or access denied.' });
        }
        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error("Session deletion error:", error);
        res.status(500).json({ message: 'Failed to delete chat session.' });
    }
});

// GET /api/chat/session/:sessionId
router.get('/session/:sessionId', tempAuth, async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user._id;

    if (!sessionId || !isUUID(sessionId)) {
        return res.status(400).json({ message: 'Valid session ID required.' });
    }

    try {
        const session = await ChatHistory.findOne({ sessionId, userId });
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // Format the session data
        const formattedSession = {
            sessionId: session.sessionId,
            messages: session.messages.map(msg => ({
                role: msg.role,
                parts: msg.parts,
                timestamp: msg.timestamp
            })),
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messages.length
        };

        res.status(200).json(formattedSession);
    } catch (error) {
        console.error("Error fetching session details:", error);
        res.status(500).json({ message: 'Failed to fetch session details.' });
    }
});

module.exports = router;