# AI Tutor Chatbot (GeminiV3)

A sophisticated AI tutor chatbot application built with Node.js backend, Python microservice for RAG, and React frontend. This application provides an interactive learning experience with document analysis, chat functionality, and personalized tutoring features.

## Project Architecture

The project consists of three main components:

1. **Node.js Backend Server** (Port: 3000)
   - Express.js server handling user authentication, file management, and chat operations
   - MongoDB database for user data and chat history
   - RESTful API endpoints for client communication

2. **Python RAG Microservice** (Port: 5000)
   - Flask-based service for document processing and RAG operations
   - Handles document chunking, embeddings, and vector search
   - Uses FAISS for efficient similarity search
   - SentenceTransformers for embeddings

3. **React Frontend** (Port: 3001)
   - Modern UI with responsive design
   - Real-time chat interface
   - File management system
   - User authentication and session management

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- MongoDB
- npm or yarn
- Git

## Project Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Chatbot-geminiV3
```

### 2. Backend Setup (Node.js)
```bash
cd server
npm install
# Create .env file with required environment variables
cp .env.example .env
# Edit .env with your configuration
npm start
```

Required environment variables for backend (.env):
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatbot
JWT_SECRET=your_jwt_secret
RAG_SERVICE_URL=http://localhost:5000
```

### 3. Python RAG Service Setup
```bash
cd server/rag_service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Required environment variables for RAG service (.env):
```
PORT=5000
EMBEDDING_MODEL=mxbai-embed-large-v1
FAISS_INDEX_PATH=../faiss_indices
```

### 4. Frontend Setup
```bash
cd client
npm install
npm start
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

#### POST /api/auth/login
Login user
```json
{
  "username": "string",
  "password": "string"
}
```

### Chat Endpoints

#### POST /api/chat/send
Send a message to the chatbot
```json
{
  "message": "string",
  "sessionId": "string",
  "useRag": boolean,
  "subject": "string"
}
```

#### GET /api/chat/history
Get chat history for a session
```
Query Parameters:
- sessionId: string
- limit: number (optional)
- skip: number (optional)
```

### File Management Endpoints

#### POST /api/files/upload
Upload a document
```
Content-Type: multipart/form-data
Body:
- file: File
- type: string (docs|images|code|others)
```

#### GET /api/files/list
List uploaded files
```
Query Parameters:
- type: string (optional)
```

#### DELETE /api/files/:fileId
Delete a file
```
Parameters:
- fileId: string
```

### RAG Service Endpoints

#### POST /api/rag/process
Process a document for RAG
```json
{
  "fileId": "string",
  "userId": "string"
}
```

#### POST /api/rag/query
Query the RAG system
```json
{
  "query": "string",
  "userId": "string",
  "subject": "string"
}
```

## Frontend Implementation Guide

### Key Components

1. **Authentication**
   - Login/Register forms
   - JWT token management
   - Protected routes

2. **Chat Interface**
   - Real-time message display
   - Markdown rendering
   - File upload integration
   - RAG toggle

3. **File Management**
   - Drag-and-drop upload
   - File type categorization
   - File listing and deletion

4. **User Interface**
   - Responsive design
   - Dark/Light theme
   - Loading states
   - Error handling

### State Management
- Uses React Context for global state
- Local state for component-specific data
- Custom hooks for API communication

### API Integration
Example of chat message sending:
```javascript
const sendMessage = async (message, sessionId) => {
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        sessionId,
        useRag: true,
        subject: currentSubject
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
```

## Development Guidelines

1. **Code Style**
   - Follow ESLint configuration
   - Use Prettier for formatting
   - Write meaningful commit messages

2. **Testing**
   - Unit tests for utilities
   - Integration tests for API endpoints
   - E2E tests for critical user flows

3. **Security**
   - Validate all user inputs
   - Sanitize file uploads
   - Use environment variables for secrets
   - Implement rate limiting

4. **Performance**
   - Optimize bundle size
   - Implement caching where appropriate
   - Use pagination for large datasets

## Troubleshooting

Common issues and solutions:

1. **MongoDB Connection Issues**
   - Verify MongoDB is running
   - Check connection string in .env
   - Ensure network access

2. **RAG Service Not Responding**
   - Check Python service is running
   - Verify port 5000 is available
   - Check embedding model installation

3. **File Upload Failures**
   - Verify file size limits
   - Check file type restrictions
   - Ensure proper permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Specify your license here]

## Support

For support, please [specify contact method or issue reporting process]

```env
PORT=5001 # Port for the backend (make sure it's free)
MONGO_URI=mongodb://localhost:27017/chatbot_gemini # Your MongoDB connection string
JWT_SECRET=your_super_strong_and_secret_jwt_key_12345! # A strong, random secret key for JWT
GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY_HERE # Your actual Gemini API Key
```
*   **MONGO_URI:**
    *   For local MongoDB: `mongodb://localhost:27017/chatbot_gemini` (or your chosen DB name).
    *   For MongoDB Atlas: Get the connection string from your Atlas cluster (replace `<password>` and specify your database name). Example: `mongodb+srv://<username>:<password>@yourcluster.mongodb.net/chatbot_gemini?retryWrites=true&w=majority`
*   **JWT_SECRET:** Generate a strong random string for security.
*   **GEMINI_API_KEY:** Paste the key you obtained from Google AI Studio.
