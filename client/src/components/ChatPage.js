import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage, saveChatHistory, getUserFiles } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { v4 as uuidv4 } from 'uuid';
import SystemPromptWidget, { availablePrompts, getPromptTextById } from './SystemPromptWidget';
import HistoryModal from './HistoryModal';
import FileUploadWidget from './FileUploadWidget';
import FileManagerWidget from './FileManagerWidget';
import SpeechToText from './SpeechToText';
import LLMPreferenceWidget from './LLMPreferenceWidget';
import PodcastWidget from './PodcastWidget';
import './ChatPage.css';

const ChatPage = ({ setIsAuthenticated }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [currentSystemPromptId, setCurrentSystemPromptId] = useState('friendly');
  const [editableSystemPromptText, setEditableSystemPromptText] = useState(() => getPromptTextById('friendly'));
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
  const [hasFiles, setHasFiles] = useState(false);
  const [isRagEnabled, setIsRagEnabled] = useState(false);
  const [llmPreference, setLLMPreference] = useState('gemini');  // Always use Gemini

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Define handlePromptSelectChange first since it's used by other functions
  const handlePromptSelectChange = useCallback((newId) => {
    setCurrentSystemPromptId(newId);
    setEditableSystemPromptText(getPromptTextById(newId));
    setError(prev => prev && (prev.includes('Session invalid') || prev.includes('Critical Error')) ? prev : 'Assistant mode changed.');
    setTimeout(() => {
      setError(prev => prev === 'Assistant mode changed.' ? '' : prev);
    }, 3000);
  }, []);

  // Define handleLogout next
  const handleLogout = useCallback((skipSave = false) => {
    const performCleanup = () => {
      console.log('Performing logout cleanup...');
      localStorage.clear();
      setIsAuthenticated(false);
      setMessages([]);
      setSessionId('');
      setUserId('');
      setUsername('');
      setCurrentSystemPromptId('friendly');
      setEditableSystemPromptText(getPromptTextById('friendly'));
      setError('');
      setHasFiles(false);
      setIsRagEnabled(false);
      requestAnimationFrame(() => {
        if (window.location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      });
    };

    if (!skipSave && messages.length > 0) {
      // Use a ref to store the saveAndReset function
      saveAndResetRef.current?.(true, performCleanup);
    } else {
      performCleanup();
    }
  }, [navigate, setIsAuthenticated, messages.length]);

  // Create a ref to store the saveAndReset function
  const saveAndResetRef = useRef(null);

  // Define saveAndReset last, using the ref to break the circular dependency
  const saveAndReset = useCallback(async (isLoggingOut = false, onCompleteCallback = null) => {
    const currentSessionId = localStorage.getItem('sessionId');
    const currentUserId = localStorage.getItem('userId');
    const messagesToSave = [...messages];

    if (!currentSessionId || !currentUserId) {
      console.error('Save Error: Session ID or User ID missing.');
      setError('Critical Error: Session info missing.');
      if (onCompleteCallback) onCompleteCallback();
      return;
    }
    if (isLoading || messagesToSave.length === 0) {
      if (onCompleteCallback) onCompleteCallback();
      return;
    }

    let newSessionId = null;
    setIsLoading(true);
    setError(prev => prev && (prev.includes('Session invalid') || prev.includes('Critical Error')) ? prev : '');

    try {
      console.log(`Saving history for session: ${currentSessionId} (User: ${currentUserId})`);
      const response = await saveChatHistory({ sessionId: currentSessionId, messages: messagesToSave });
      newSessionId = response.data.newSessionId;
      if (!newSessionId) throw new Error('Backend failed to provide new session ID.');

      localStorage.setItem('sessionId', newSessionId);
      setSessionId(newSessionId);
      setMessages([]);
      if (!isLoggingOut) {
        handlePromptSelectChange('friendly');
        setError('');
      }
      console.log(`History saved. New session ID: ${newSessionId}`);
    } catch (err) {
      const failErrorMsg = err.response?.data?.message || err.message || 'Failed to save/reset session.';
      console.error('Save/Reset Error:', err.response || err);
      setError(`Session Error: ${failErrorMsg}`);
      if (err.response?.status === 401 && !isLoggingOut) {
        console.warn('Received 401 saving history, logging out.');
        handleLogout(true);
      } else if (!newSessionId && !isLoggingOut) {
        newSessionId = uuidv4();
        localStorage.setItem('sessionId', newSessionId);
        setSessionId(newSessionId);
        setMessages([]);
        handlePromptSelectChange('friendly');
        console.warn('Save failed, generated new client-side session ID:', newSessionId);
      } else if (isLoggingOut && !newSessionId) {
        console.error('Save failed during logout.');
      }
    } finally {
      setIsLoading(false);
      if (onCompleteCallback) onCompleteCallback();
    }
  }, [messages, isLoading, handlePromptSelectChange, handleLogout]);

  // Update the ref whenever saveAndReset changes
  useEffect(() => {
    saveAndResetRef.current = saveAndReset;
  }, [saveAndReset]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    const storedUserId = localStorage.getItem('userId');
    const storedUsername = localStorage.getItem('username');

    if (!storedUserId || !storedSessionId || !storedUsername) {
      console.warn('ChatPage Mount: Missing auth info in localStorage. Redirecting to login.');
      handleLogout(true);
    } else {
      console.log('ChatPage Mount: Auth info found. Setting state.');
      setSessionId(storedSessionId);
      setUserId(storedUserId);
      setUsername(storedUsername);
    }
  }, [handleLogout]);

  useEffect(() => {
    const checkUserFiles = async () => {
      const currentUserId = localStorage.getItem('userId');
      if (!currentUserId) {
        console.log('User files check skipped: No userId available.');
        setHasFiles(false);
        setIsRagEnabled(false);
        return;
      }
      console.log('Checking user files for userId:', currentUserId);
      try {
        const response = await getUserFiles();
        const filesExist = response.data && response.data.length > 0;
        setHasFiles(filesExist);
        // Only set RAG to false if no files exist
        if (!filesExist) {
          setIsRagEnabled(false);
        }
        console.log('User files check successful:', filesExist ? `${response.data.length} files found.` : 'No files found.');
      } catch (err) {
        console.error('Error checking user files:', err);
        if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
          console.warn('Received 401 checking files, logging out.');
          handleLogout(true);
        } else {
          setError('Could not check user files.');
          setHasFiles(false);
          setIsRagEnabled(false);
        }
      }
    };

    if (userId) {
      checkUserFiles();
    }
  }, [userId, fileRefreshTrigger, handleLogout]);

  const triggerFileRefresh = useCallback(() => setFileRefreshTrigger(prev => prev + 1), []);
  const handlePromptTextChange = useCallback((newText) => {
    setEditableSystemPromptText(newText);
    const matchingPreset = availablePrompts.find(p => p.id !== 'custom' && p.prompt === newText);
    setCurrentSystemPromptId(matchingPreset ? matchingPreset.id : 'custom');
  }, []);
  const closeHistoryModal = useCallback(() => setIsHistoryModalOpen(false), []);

  const handleSelectSessionToContinue = useCallback((sessionData) => {
      console.log('Selected session to continue:', sessionData);
      if (sessionData?.sessionId && Array.isArray(sessionData.messages)) {
          // Save current session if it has messages
          if (messages.length > 0) {
              saveAndReset(false, () => {
                  // After saving, load the selected session
                  setSessionId(sessionData.sessionId);
                  setMessages(sessionData.messages);
                  setIsHistoryModalOpen(false);
                  setError('Previous session saved. Loaded selected session.');
                  setTimeout(() => setError(''), 3000);
              });
          } else {
              // If no current messages, just load the selected session
              setSessionId(sessionData.sessionId);
              setMessages(sessionData.messages);
              setIsHistoryModalOpen(false);
              setError('Session loaded. You can now continue this conversation.');
              setTimeout(() => setError(''), 3000);
          }
      } else {
          console.error('Invalid session data received for continuation:', sessionData);
          setError('Failed to load session for continuation.');
          setTimeout(() => setError(''), 3000);
      }
  }, [messages.length, saveAndReset]);

  const handleLLMPreferenceChange = useCallback((newPreference) => {
    setLLMPreference(newPreference);
    localStorage.setItem('llmPreference', newPreference);
    // Clear messages when switching models to avoid context confusion
    setMessages([]);
    setError('AI model changed. Starting a new conversation.');
    setTimeout(() => setError(''), 3000);
  }, []);

  const handleSendMessage = useCallback(async (inputText) => {
    if (!inputText.trim() || isLoading) return;
    if (!sessionId) {
      setError('Session ID is missing. Please try refreshing the page.');
      return;
    }

    const userMessage = {
        id: uuidv4(),
        text: inputText,
        sender: 'user',
        timestamp: new Date().toISOString()
    };

    // Log the message format before sending
    console.log('Preparing to send message:', {
        messageId: userMessage.id,
        sessionId,
        llmPreference,
        isRagEnabled,
        historyLength: messages.length
    });

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
        // Format message history with correct role values
        const formattedHistory = messages.map(m => ({
            role: m.sender === 'ai' ? 'model' : 'user',  // Convert 'ai' to 'model' for server
            parts: [{ text: m.text }]
        }));

        // Add the current message to history
        formattedHistory.push({
            role: 'user',
            parts: [{ text: inputText }]
        });

        // Log the formatted history
        console.log('Sending formatted history:', {
            historyLength: formattedHistory.length,
            lastMessage: formattedHistory[formattedHistory.length - 1]
        });

        const response = await sendMessage(
            inputText,
            sessionId,
            formattedHistory,
            llmPreference,
            isRagEnabled
        );

        // More flexible response handling
        let aiMessageText;
        if (response?.reply?.parts?.[0]?.text) {
            aiMessageText = response.reply.parts[0].text;
        } else if (response?.text) {
            aiMessageText = response.text;
        } else if (response?.message) {
            aiMessageText = response.message;
        } else {
            console.error('Unexpected response format:', response);
            throw new Error('Invalid response format from server');
        }

        const aiMessage = {
            id: uuidv4(),
            text: aiMessageText,
            sender: 'ai',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
        console.error('Failed to send message:', error);
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.message || 
                           error.message || 
                           'Failed to send message. Please try again.';
        setError(errorMessage);
        
        // If it's a session error, suggest refreshing
        if (error.response?.status === 401 || error.response?.status === 403) {
            setError(`${errorMessage} Please try refreshing the page.`);
        }
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, sessionId, messages, llmPreference, isRagEnabled, setMessages, setInputText, setIsLoading, setError]);

  const handleEnterKey = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(inputText);
      }
    },
    [handleSendMessage, inputText]
  );

  const handleRagToggle = (event) => {
    setIsRagEnabled(event.target.checked);
  };

  const handleSpeechTranscript = useCallback(
    async (transcript, response) => {
      if (!transcript) return;
      setInputText(transcript);
      if (response?.chatResponse?.role && response?.chatResponse?.parts?.length > 0) {
        setMessages(prev => [...prev, response.chatResponse]);
      }
      // Automatically send the transcript as a message
      await handleSendMessage();
    },
    [handleSendMessage]
  );

  const isProcessing = isLoading;

  if (!userId) {
    return <div className="loading-indicator"><span>Initializing...</span></div>;
  }

  return (
    <div className="chat-page-container">
      <div className="sidebar-area">
        <LLMPreferenceWidget 
          currentPreference={llmPreference}
          onPreferenceChange={handleLLMPreferenceChange}
        />
        <SystemPromptWidget
          selectedPromptId={currentSystemPromptId}
          promptText={editableSystemPromptText}
          onSelectChange={handlePromptSelectChange}
          onTextChange={handlePromptTextChange}
        />
        <FileUploadWidget onUploadSuccess={triggerFileRefresh} />
        <FileManagerWidget refreshTrigger={fileRefreshTrigger} />
        <PodcastWidget /> {/* Add the PodcastWidget here */}
      </div>
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
            <h1>AI Assistant</h1>
            <span className="username">Welcome, {username}</span>
          </div>
          <div className="header-right">
            <button 
              className="header-button mindmap-button"
              onClick={() => navigate('/mindmap')}
              disabled={isLoading}
            >
              Mind Map
            </button>
            <button 
              className="header-button history-button"
              onClick={() => setIsHistoryModalOpen(true)}
              disabled={isLoading}
            >
              History
            </button>
            <button 
              className="header-button logout-button"
              onClick={() => handleLogout(false)}
              disabled={isLoading}
            >
              Logout
            </button>
          </div>
        </header>
        <div className="messages-area">
          {messages.map((msg, index) => {
            // Handle both old and new message formats
            const messageText = msg.parts?.[0]?.text || msg.text || '';
            const messageRole = msg.role || msg.sender || 'user';
            const messageTimestamp = msg.timestamp || new Date().toISOString();

            if (!messageText) {
              console.warn('Rendering invalid message structure at index', index, msg);
              return <div key={`error-${index}`} className="message-error">Invalid message format</div>;
            }

            return (
              <div key={msg.id || `${sessionId}-${index}`} className={`message ${messageRole}`}>
                <div className="message-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{messageText}</ReactMarkdown>
                </div>
                <span className="message-timestamp">
                  {new Date(messageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        {isProcessing && <div className="loading-indicator"><span>{isRagEnabled ? 'Searching documents...' : 'Thinking...'}</span></div>}
        {!isProcessing && error && <div className="error-indicator">{error}</div>}
        <footer className="input-area">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleEnterKey}
            placeholder="Ask your tutor..."
            rows="1"
            disabled={isProcessing}
            aria-label="Chat input"
          />
          <SpeechToText onTranscript={handleSpeechTranscript} userId={userId} />
          <div
            className="rag-toggle-container"
            title={!hasFiles ? 'Upload files to enable RAG' : isRagEnabled ? 'Disable RAG' : 'Enable RAG'}
          >
            <input
              type="checkbox"
              id="rag-toggle"
              checked={isRagEnabled}
              onChange={handleRagToggle}
              disabled={!hasFiles || isProcessing}
              aria-label="Enable RAG"
            />
            <label htmlFor="rag-toggle">RAG</label>
          </div>
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={isProcessing || !inputText.trim()}
            title="Send Message"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </footer>
      </div>
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={closeHistoryModal}
        onSessionSelectToContinue={handleSelectSessionToContinue}
      />
    </div>
  );
};

export default ChatPage;