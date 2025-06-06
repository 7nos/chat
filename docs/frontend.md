# Frontend Documentation (React)

## Overview
The frontend is a React application that provides a modern, responsive user interface for the AI tutor chatbot. It includes features like real-time chat, file management, and user authentication.

## Directory Structure
```
client/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   │   ├── auth/       # Authentication components
│   │   ├── chat/       # Chat interface components
│   │   ├── files/      # File management components
│   │   └── common/     # Shared components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── styles/         # CSS/SCSS files
│   └── App.js          # Main application component
├── package.json         # Dependencies
└── webpack.config.js    # Build configuration
```

## Key Components

### Authentication Components
- **LoginForm**: User login interface
- **RegisterForm**: User registration
- **AuthGuard**: Protected route wrapper
- **SessionManager**: JWT token handling

### Chat Components
- **ChatWindow**: Main chat interface
- **MessageList**: Message display
- **MessageInput**: User input
- **ChatHistory**: Session history
- **RAGToggle**: RAG feature toggle

### File Management Components
- **FileUpload**: Drag-and-drop upload
- **FileList**: File browser
- **FilePreview**: Document preview
- **FileManager**: File operations

### Common Components
- **Navbar**: Navigation bar
- **Modal**: Reusable modal
- **Loading**: Loading indicators
- **ErrorBoundary**: Error handling
- **ThemeToggle**: Dark/light mode

## State Management

### Context Providers
```javascript
// AuthContext
const AuthContext = createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false
});

// ChatContext
const ChatContext = createContext({
  messages: [],
  sessionId: null,
  sendMessage: () => {},
  loadHistory: () => {},
  useRag: true
});

// FileContext
const FileContext = createContext({
  files: [],
  uploadFile: () => {},
  deleteFile: () => {},
  refreshFiles: () => {}
});
```

### Custom Hooks
```javascript
// useAuth
const useAuth = () => {
  const { user, token, login, logout } = useContext(AuthContext);
  return { user, token, login, logout };
};

// useChat
const useChat = () => {
  const { messages, sendMessage, loadHistory } = useContext(ChatContext);
  return { messages, sendMessage, loadHistory };
};

// useFiles
const useFiles = () => {
  const { files, uploadFile, deleteFile } = useContext(FileContext);
  return { files, uploadFile, deleteFile };
};
```

## API Integration

### API Services
```javascript
// authService.js
const authService = {
  login: async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },
  // ... other auth methods
};

// chatService.js
const chatService = {
  sendMessage: async (message, sessionId) => {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, sessionId })
    });
    return response.json();
  },
  // ... other chat methods
};

// fileService.js
const fileService = {
  uploadFile: async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    });
    return response.json();
  },
  // ... other file methods
};
```

## UI/UX Features

### Responsive Design
- Mobile-first approach
- Breakpoints:
  ```scss
  $breakpoints: (
    'small': 576px,
    'medium': 768px,
    'large': 992px,
    'xlarge': 1200px
  );
  ```

### Theme System
```javascript
const themes = {
  light: {
    primary: '#007bff',
    background: '#ffffff',
    text: '#212529',
    // ... other colors
  },
  dark: {
    primary: '#0d6efd',
    background: '#212529',
    text: '#ffffff',
    // ... other colors
  }
};
```

### Loading States
- Skeleton loaders
- Progress indicators
- Infinite scroll
- Optimistic updates

## Error Handling

### Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Toast Notifications
```javascript
const Toast = {
  success: (message) => {
    // Show success toast
  },
  error: (message) => {
    // Show error toast
  },
  warning: (message) => {
    // Show warning toast
  }
};
```

## Performance Optimization

### Code Splitting
```javascript
const ChatWindow = React.lazy(() => import('./components/chat/ChatWindow'));
const FileManager = React.lazy(() => import('./components/files/FileManager'));
```

### Memoization
```javascript
const MemoizedMessage = React.memo(({ message }) => {
  return <MessageComponent message={message} />;
});
```

### Virtualization
```javascript
const VirtualizedMessageList = ({ messages }) => {
  return (
    <VirtualList
      height={400}
      itemCount={messages.length}
      itemSize={50}
      itemData={messages}
    >
      {MessageRow}
    </VirtualList>
  );
};
```

## Development Guidelines

### Code Style
- ESLint configuration
- Prettier formatting
- Component documentation
- TypeScript types

### Testing
- Jest unit tests
- React Testing Library
- Cypress E2E tests
- Component snapshots

### Build Process
1. Development server
2. Production build
3. Code splitting
4. Asset optimization
5. Environment configuration

## Deployment

### Build Steps
```bash
# Install dependencies
npm install

# Development
npm start

# Production build
npm run build

# Test production build
npm run serve
```

### Environment Variables
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_RAG_SERVICE_URL=http://localhost:5000
REACT_APP_ENV=development
```

### CI/CD
- GitHub Actions workflow
- Automated testing
- Build verification
- Deployment pipeline

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast
- Focus management 