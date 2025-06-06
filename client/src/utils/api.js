const API_BASE_URL = 'http://localhost:5004/api';

export const testApiKey = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/test-key`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API key test failed');
    }
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error testing API key:', error);
    throw error;
  }
};

export const generateMindMap = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-mindmap`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate mind map');
    }

    const data = await response.json();
    return data.mindmap;
  } catch (error) {
    console.error('Error generating mind map:', error);
    throw error;
  }
}; 