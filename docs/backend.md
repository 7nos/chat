# Backend Documentation (Node.js)

## Overview
The backend server is built with Node.js and Express.js, handling user authentication, file management, chat operations, and communication with the RAG microservice.

## Directory Structure
```
server/
├── config/           # Configuration files
├── middleware/       # Express middleware
├── models/          # MongoDB models
├── routes/          # API route handlers
├── services/        # Business logic
├── utils/           # Utility functions
├── assets/          # User uploaded files
├── backup_assets/   # Backup of old assets
├── faiss_indices/   # FAISS index storage
├── rag_service/     # Python RAG microservice
└── server.js        # Main application file
```

## API Endpoints

### Authentication Routes (`/api/auth/*`)
- **POST /register**: User registration
  - Validates username, password, email
  - Creates user in MongoDB
  - Returns JWT token
- **POST /login**: User authentication
  - Validates credentials
  - Returns JWT token
- **GET /verify**: Token verification
  - Validates JWT token
  - Returns user info

### Chat Routes (`/api/chat/*`)
- **POST /send**: Send chat message
  - Validates message and session
  - Processes with/without RAG
  - Stores in MongoDB
- **GET /history**: Retrieve chat history
  - Paginated results
  - Filtered by session
- **GET /sessions**: List chat sessions
  - Grouped by date
  - Includes metadata

### File Routes (`/api/files/*`)
- **POST /upload**: File upload
  - Handles multipart/form-data
  - Validates file type/size
  - Stores in user-specific directory
- **GET /list**: List user files
  - Filtered by type
  - Includes metadata
- **DELETE /:fileId**: Delete file
  - Moves to backup
  - Updates database

### RAG Routes (`/api/rag/*`)
- **POST /process**: Process document
  - Sends to Python service
  - Updates FAISS index
- **POST /query**: Query RAG system
  - Forwards to Python service
  - Returns relevant chunks

## Database Models

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  createdAt: Date,
  lastLogin: Date
}
```

### Chat Model
```javascript
{
  userId: ObjectId,
  sessionId: String,
  message: String,
  isUser: Boolean,
  timestamp: Date,
  metadata: {
    useRag: Boolean,
    subject: String,
    references: [String]
  }
}
```

### File Model
```javascript
{
  userId: ObjectId,
  filename: String,
  originalName: String,
  type: String,
  size: Number,
  path: String,
  uploadedAt: Date,
  processed: Boolean
}
```

## Middleware

### Authentication Middleware
- JWT token validation
- User role checking
- Session management

### File Upload Middleware
- File size limits
- Type validation
- Virus scanning
- Storage management

### Error Handling Middleware
- Custom error classes
- Error logging
- Client-friendly responses

## Security Features

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Token refresh mechanism
- Session management

### File Security
- File type validation
- Size limits
- Virus scanning
- Secure storage paths

### API Security
- Rate limiting
- CORS configuration
- Input validation
- XSS protection

## Environment Variables
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatbot
JWT_SECRET=your_jwt_secret
RAG_SERVICE_URL=http://localhost:5000
FILE_UPLOAD_LIMIT=10mb
ALLOWED_FILE_TYPES=pdf,docx,txt,py,java,cpp
```

## Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 413: Payload Too Large
- 415: Unsupported Media Type
- 500: Internal Server Error

## Development Guidelines

### Code Style
- Use ESLint configuration
- Follow REST API best practices
- Document all routes with JSDoc
- Use async/await for async operations

### Testing
- Unit tests for services
- Integration tests for routes
- API endpoint testing
- Error handling tests

### Performance
- Implement caching
- Use connection pooling
- Optimize database queries
- Handle file uploads efficiently

## Deployment
1. Set up environment variables
2. Install dependencies
3. Build the application
4. Start with PM2 or similar
5. Set up reverse proxy (Nginx)
6. Configure SSL
7. Set up monitoring

## Monitoring
- Use Winston for logging
- Implement health checks
- Monitor memory usage
- Track API performance
- Set up error reporting 