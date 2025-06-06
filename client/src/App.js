// client/src/App.js
import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CircularProgress } from '@mui/material';
import './styles/global.css';  // Import our global styles
import { testApiKey } from './utils/api';
import MindMapPage from './pages/MindMapPage';
import './App.css';

// Lazy load components to reduce initial bundle size
const AuthPage = React.lazy(() => import('./components/AuthPage'));
const ChatPage = React.lazy(() => import('./components/ChatPage'));

// Create a theme that uses our CSS variables
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: 'var(--primary-500)',
      light: 'var(--primary-400)',
      dark: 'var(--primary-600)',
      contrastText: 'var(--dark-text-primary)',
    },
    background: {
      default: 'var(--dark-bg-main)',
      paper: 'var(--dark-bg-secondary)',
    },
    text: {
      primary: 'var(--dark-text-primary)',
      secondary: 'var(--dark-text-secondary)',
    },
    error: {
      main: '#ef4444', // fallback to hex, matches --error-500
    },
    success: {
      main: '#22c55e', // fallback to hex, matches --success-500
    },
    warning: {
      main: '#f59e0b', // fallback to hex, matches --warning-500
    },
  },
  typography: {
    fontFamily: 'var(--typography-fontFamily-sans)',
    h1: {
      fontSize: 'var(--typography-fontSize-4xl)',
      fontWeight: 'var(--typography-fontWeight-semibold)',
      lineHeight: 'var(--typography-lineHeight-tight)',
    },
    h2: {
      fontSize: 'var(--typography-fontSize-3xl)',
      fontWeight: 'var(--typography-fontWeight-semibold)',
      lineHeight: 'var(--typography-lineHeight-tight)',
    },
    h3: {
      fontSize: 'var(--typography-fontSize-2xl)',
      fontWeight: 'var(--typography-fontWeight-semibold)',
      lineHeight: 'var(--typography-lineHeight-tight)',
    },
    body1: {
      fontSize: 'var(--typography-fontSize-base)',
      lineHeight: 'var(--typography-lineHeight-normal)',
    },
    body2: {
      fontSize: 'var(--typography-fontSize-sm)',
      lineHeight: 'var(--typography-lineHeight-normal)',
    },
  },
  shape: {
    borderRadius: 'var(--borderRadius-md)',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 'var(--borderRadius-md)',
          padding: 'var(--spacing-2) var(--spacing-4)',
          transition: 'all var(--transitions-fast)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: 'var(--shadow-md)',
          },
        },
        contained: {
          background: 'var(--primary-500)',
          '&:hover': {
            background: 'var(--primary-600)',
          },
        },
        outlined: {
          borderColor: 'var(--dark-border-color)',
          '&:hover': {
            borderColor: 'var(--primary-500)',
            background: 'var(--primary-500/10)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'var(--dark-bg-secondary)',
          borderRadius: 'var(--borderRadius-lg)',
          border: '1px solid var(--dark-border-color)',
          boxShadow: 'var(--shadow-md)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'var(--dark-bg-secondary)',
          borderRadius: 'var(--borderRadius-lg)',
          border: '1px solid var(--dark-border-color)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 'var(--borderRadius-md)',
            background: 'var(--dark-bg-input)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--primary-500)',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--primary-500)',
                borderWidth: '2px',
              },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--borderRadius-full)',
          background: 'var(--dark-bg-input)',
          '&.MuiChip-clickable:hover': {
            background: 'var(--primary-500/10)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 'var(--borderRadius-xl)',
          background: 'var(--dark-bg-secondary)',
          boxShadow: 'var(--shadow-lg)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'var(--dark-bg-secondary)',
          borderRadius: 'var(--borderRadius-md)',
          padding: 'var(--spacing-2) var(--spacing-3)',
          fontSize: 'var(--typography-fontSize-sm)',
        },
      },
    },
  },
});

const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--dark-bg-main)'
  }}>
    <CircularProgress />
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('userId'));

  useEffect(() => {
    // Test API key on component mount
    const apiKey = testApiKey();
    if (!apiKey) {
      console.error('Warning: Gemini API key not found in environment variables');
    }

    const handleStorageChange = (event) => {
      if (event.key === 'userId') {
        const hasUserId = !!event.newValue;
        console.log("App Storage Listener: userId changed, setting isAuthenticated to", hasUserId);
        setIsAuthenticated(hasUserId);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? 
                <Navigate to="/chat" /> : 
                <AuthPage setIsAuthenticated={setIsAuthenticated} />
              } 
            />
            <Route 
              path="/auth" 
              element={
                isAuthenticated ? 
                <Navigate to="/chat" /> : 
                <AuthPage setIsAuthenticated={setIsAuthenticated} />
              } 
            />
            <Route 
              path="/chat" 
              element={
                isAuthenticated ? 
                <ChatPage setIsAuthenticated={setIsAuthenticated} /> : 
                <Navigate to="/login" />
              } 
            />
            <Route 
              path="/mindmap" 
              element={
                isAuthenticated ? 
                <MindMapPage setIsAuthenticated={setIsAuthenticated} /> : 
                <Navigate to="/login" />
              } 
            />
            <Route 
              path="*" 
              element={<Navigate to="/" />} 
            />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
