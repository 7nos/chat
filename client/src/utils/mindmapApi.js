import axios from 'axios';

const MINDMAP_API_BASE_URL = 'http://localhost:5004/api';

const mindmapApi = axios.create({
  baseURL: MINDMAP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
mindmapApi.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
mindmapApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Mind Map API Error:', error);
    
    // Handle specific error types
    if (error.response) {
      const { data } = error.response;
      switch (data.type) {
        case 'AI_ERROR':
          throw new Error(`AI Service Error: ${data.details}`);
        case 'PDF_ERROR':
          throw new Error(`PDF Processing Error: ${data.details}`);
        case 'SERVER_ERROR':
          throw new Error(`Server Error: ${data.details}`);
        default:
          throw new Error(data.error || 'An error occurred');
      }
    }
    
    // Handle network errors
    if (error.request) {
      throw new Error('Network error: Could not connect to the mind map service');
    }
    
    // Handle other errors
    throw new Error(error.message || 'An unexpected error occurred');
  }
);

export const testMindMapApiKey = async () => {
  try {
    const response = await mindmapApi.get('/test-key');
    return response.data;
  } catch (error) {
    console.error('Error testing API key:', error);
    throw error;
  }
};

export const generateMindMap = async (data) => {
  try {
    const formData = new FormData();
    if (data.file) {
      formData.append('pdf', data.file);
    }
    if (data.prompt) {
      formData.append('prompt', data.prompt);
    }

    const response = await mindmapApi.post('/generate-mindmap', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error generating mind map:', error);
    throw error;
  }
};

export default mindmapApi; 