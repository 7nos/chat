import axios from 'axios';

const getApiBaseUrl = () => {
  const backendPort = process.env.REACT_APP_BACKEND_PORT || 5001; // Main server port
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const backendHost = hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname;
  return `${protocol}//${backendHost}:${backendPort}/api`;
};

const API_BASE_URL = getApiBaseUrl();
console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      config.headers['x-user-id'] = userId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/signin', credentials);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const testApiKey = async () => {
  try {
    const response = await api.get('/test-key');
    return response.data;
  } catch (error) {
    console.error('Error testing API key:', error);
    throw error;
  }
};

export const sendMessage = async (message, sessionId, messageHistory, llmPreference, isRagEnabled = false) => {
    try {
        const payload = {
            message,
            sessionId,
            history: messageHistory,
            llmPreference,
            isRagEnabled
        };

        console.log('Sending message with full payload:', {
            payload,
            messageLength: message.length,
            sessionId,
            historyLength: messageHistory.length,
            llmPreference,
            isRagEnabled,
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': localStorage.getItem('userId')
            }
        });

        const response = await api.post('/chat/message', payload);
        
        // Validate response format
        if (!response.data) {
            throw new Error('Empty response from server');
        }

        // Log successful response for debugging
        console.log('Received response:', {
            hasReply: !!response.data.reply,
            hasText: !!response.data.text,
            hasMessage: !!response.data.message,
            responseType: typeof response.data,
            responseKeys: Object.keys(response.data)
        });

        return response.data;
    } catch (error) {
        // Enhanced error logging
        const errorDetails = {
            error: error.response?.data || error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            requestPayload: {
                message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                sessionId,
                llmPreference,
                isRagEnabled,
                historyLength: messageHistory.length,
                historyPreview: messageHistory.slice(-2).map(m => ({
                    role: m.role,
                    textPreview: m.parts?.[0]?.text?.substring(0, 50) + '...'
                }))
            },
            headers: error.response?.headers,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                baseURL: error.config?.baseURL
            }
        };
        
        console.error('Error sending message:', errorDetails);
        
        // Create a more informative error
        const enhancedError = new Error(
            error.response?.data?.message || 
            error.response?.data?.error || 
            error.message || 
            'Failed to send message'
        );
        enhancedError.details = errorDetails;
        throw enhancedError;
    }
};
export const saveChatHistory = (historyData) => api.post('/chat/history', historyData);
export const queryRagService = (queryData) => api.post('/chat/rag', queryData);
export const getChatSessions = () => api.get('/chat/sessions');
export const getSessionDetails = (sessionId) => api.get(`/chat/sessions/${sessionId}`);
export const deleteSession = (sessionId) => api.delete(`/chat/sessions/${sessionId}`);
export const uploadFile = (formData) => api.post('/upload', formData);
export const getUserFiles = () => api.get('/files');
export const getFileContentUrl = (relativePath) => `${API_BASE_URL}/files/content/${relativePath}`;
export const renameUserFile = (serverFilename, newOriginalName) => api.patch(`/files/${serverFilename}`, { newOriginalName });
export const deleteUserFile = (serverFilename) => api.delete(`/files/${serverFilename}`);
export const sendSpeechToText = (text) =>
  api.post(
    '/speech',
    { text },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    }
  );

// User Preferences
export const updateLLMPreference = (preference) => api.post('/user/preferences/llm', { preference });

export default api;