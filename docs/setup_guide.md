# Chatbot GeminiV3 Setup Guide

This guide provides step-by-step instructions for setting up and running the Chatbot GeminiV3 application, which consists of three main components: Frontend (React), Backend (Node.js/Express), and RAG Service (Python).

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- MongoDB
- npm or yarn package manager
- Git

## Directory Structure

```
Chatbot-geminiV3/
├── client/                 # React frontend
├── server/                 # Node.js backend
└── python_rag_service/     # Python RAG service
```

## 1. Backend Setup (Node.js/Express)

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory with the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatbot
GEMINI_API_KEY=your_gemini_api_key
PYTHON_RAG_SERVICE_URL=http://localhost:5001
```

4. Start the backend server:
```bash
npm start
```

The backend server will run on http://localhost:5000

## 2. Frontend Setup (React)

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the client directory:
```env
REACT_APP_API_URL=http://localhost:5000
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will be available at http://localhost:3000

## 3. RAG Service Setup (Python)

conda activate RAG

python server/rag_service/app.py
OR
python -m server.rag_service.app
```

3. Activate the virtual environment:
- Windows:
```bash
venv\Scripts\activate
```
- Unix/MacOS:
```bash
source venv/bin/activate
```

4. Install required Python packages:
```bash
pip install -r requirements.txt
```

5. Start the RAG service:
```bash
python app.py
```

The RAG service will run on http://localhost:5001

## Running the Complete Application

1. Start MongoDB service on your machine

2. Open three separate terminal windows and run each service:

Terminal 1 (Backend):
```bash
cd server
npm start
```

Terminal 2 (Frontend):
```bash
cd client
npm start
```

Terminal 3 (RAG Service):
```bash
cd python_rag_service
python app.py
```

## Verifying the Setup

1. Frontend: Open http://localhost:3000 in your browser
   - You should see the login/signup page
   - Create an account or sign in

2. Backend: Test the API
   - The server should be running on http://localhost:5000
   - You can test endpoints using tools like Postman

3. RAG Service: Test the service
   - The service should be running on http://localhost:5001
   - The backend will automatically connect to it

## Common Issues and Solutions

### Backend Issues
1. MongoDB Connection Error:
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file
   - Verify MongoDB port (default: 27017)

2. Port Already in Use:
   - Check if port 5000 is available
   - Kill any process using the port:
     ```bash
     # Windows
     netstat -ano | findstr :5000
     taskkill /PID <PID> /F
     
     # Unix/MacOS
     lsof -i :5000
     kill -9 <PID>
     ```

### Frontend Issues
1. Node Modules Error:
   - Delete node_modules folder
   - Run `npm install` again

2. Port 3000 in Use:
   - Similar to backend port issue
   - Use different port: `PORT=3001 npm start`

### RAG Service Issues
1. Python Package Errors:
   - Ensure virtual environment is activated
   - Update pip: `python -m pip install --upgrade pip`
   - Reinstall requirements: `pip install -r requirements.txt`

2. Port 5001 in Use:
   - Similar to other port issues
   - Change port in app.py and update backend .env

## Development Workflow

1. Code Changes:
   - Frontend: Changes will auto-reload
   - Backend: Server will auto-restart
   - RAG Service: Manual restart required

2. Testing:
   - Frontend: `npm test`
   - Backend: `npm test`
   - RAG Service: `python -m pytest`

## Production Deployment

1. Frontend Build:
```bash
cd client
npm run build
```

2. Backend Production:
```bash
cd server
NODE_ENV=production npm start
```

3. RAG Service Production:
```bash
cd python_rag_service
gunicorn app:app
```

## Security Notes

1. Never commit .env files
2. Keep API keys secure
3. Use environment variables
4. Implement proper authentication
5. Use HTTPS in production
6. Regular security updates

## Support

For issues:
1. Check error logs
2. Verify all services are running
3. Check environment variables
4. Ensure all dependencies are installed
5. Check MongoDB connection
6. Verify ports are available 