// Test file to verify API key accessibility
const testApiKey = () => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    console.log('API Key available:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    return apiKey;
};

export default testApiKey; 