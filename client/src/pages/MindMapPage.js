import React, { useState, useEffect } from 'react';
import MindMap from '../components/MindMap';
import { testMindMapApiKey, generateMindMap } from '../utils/mindmapApi';
import './MindMapPage.css';

const MindMapPage = () => {
    const [prompt, setPrompt] = useState('');
    const [file, setFile] = useState(null);
    const [mindmap, setMindmap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mindMapType, setMindMapType] = useState('tree');
    const [apiKeyValid, setApiKeyValid] = useState(false);

    useEffect(() => {
        const checkApiKey = async () => {
            try {
                await testMindMapApiKey();
                setApiKeyValid(true);
            } catch (error) {
                console.error('API key validation failed:', error);
                setApiKeyValid(false);
            }
        };
        checkApiKey();
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Please select a valid PDF file');
            setFile(null);
        }
    };

    const handlePromptChange = (e) => {
        setPrompt(e.target.value);
        setError(null);
    };

    const handleTypeChange = (e) => {
        setMindMapType(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!prompt && !file) {
                throw new Error('Please provide either a prompt or upload a PDF file');
            }

            const data = await generateMindMap({ prompt, file });
            setMindmap(data.mindmap);
        } catch (error) {
            console.error('Error generating mind map:', error);
            setError(error.response?.data?.error || error.message || 'Failed to generate mind map');
        } finally {
            setLoading(false);
        }
    };

    if (!apiKeyValid) {
        return (
            <div className="mindmap-page">
                <div className="error-message">
                    <h2>API Key Error</h2>
                    <p>Unable to connect to the mind map service. Please check your API key configuration.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mindmap-page">
            <div className="mindmap-header">
                <h1>Mind Map Generator</h1>
                <p>Generate mind maps from text or PDF files</p>
            </div>

            <form onSubmit={handleSubmit} className="mindmap-form">
                <div className="form-group">
                    <label htmlFor="prompt">Enter your prompt:</label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={handlePromptChange}
                        placeholder="Enter a topic or concept to generate a mind map..."
                        rows={4}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="file">Or upload a PDF file:</label>
                    <input
                        type="file"
                        id="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="type">Mind Map Type:</label>
                    <select
                        id="type"
                        value={mindMapType}
                        onChange={handleTypeChange}
                    >
                        <option value="tree">Tree</option>
                        <option value="radial">Radial</option>
                        <option value="force">Force-Directed</option>
                    </select>
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Mind Map'}
                </button>

                {error && <div className="error-message">{error}</div>}
            </form>

            {mindmap && (
                <div className="mindmap-display">
                    <h2>Generated Mind Map</h2>
                    <div className="mindmap-container">
                        <MindMap data={mindmap} type={mindMapType} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindMapPage; 