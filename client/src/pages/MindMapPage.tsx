import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import MindMap from '../components/MindMap';
import { testMindMapApiKey, generateMindMap } from '../utils/mindmapApi';
import '../styles/MindMapPage.css';

interface TreeNode {
  name: string;
  children?: TreeNode[];
}

type MindMapType = 'tree' | 'radial' | 'hierarchical' | 'organic';

function MindMapPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mindmap, setMindmap] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mindMapType, setMindMapType] = useState<MindMapType>('tree');
  const [apiKeyValid, setApiKeyValid] = useState(false);

  React.useEffect(() => {
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setPrompt('');
        setError('');
      } else {
        setError('Please select a valid PDF file');
        setFile(null);
      }
    }
  };

  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    setFile(null);
    setError('');
  };

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setMindMapType(e.target.value as MindMapType);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMindmap(null);

    if (!prompt && !file) {
      setError('Please enter a prompt or upload a PDF file.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    let textContent = prompt.trim();

    if (file) {
      formData.append('pdf', file);
    } else if (textContent) {
      const templatePrompt = `Generate a structured text outline for a mind map on the topic '${textContent}'. Format the output as follows:

- Root node: 'Mind Map: ${textContent}'.
- List 3-5 main topics, each followed by a colon (:).
- For each main topic, provide 2-4 subtopics or details, separated by commas.
- Use only this format, with no additional explanations, prose, or formatting markers (e.g., no bullets, hyphens, or numbers unless specified).
- Ensure the output is clear, concise, and hierarchical for compatibility with a text-to-mind-map converter.`;
      formData.append('prompt', templatePrompt);
    }

    try {
      const data = await generateMindMap(formData);
      setMindmap(data.mindmap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
      <header className="mindmap-header">
        <div className="header-left">
          <h1>Mind Map Generator</h1>
          <p className="subtitle">Transform your text or PDF into an interactive mind map</p>
        </div>
        <div className="header-right">
          <button 
            className="header-button chat-button"
            onClick={() => navigate('/chat')}
            disabled={loading}
          >
            Go to Chat
          </button>
        </div>
      </header>

      <main className="mindmap-main">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-section">
            <label htmlFor="prompt">
              Enter a prompt:
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={handlePromptChange}
              rows={4}
              placeholder="Example prompts:
• 'Explain the concept of Artificial Intelligence'
• 'Describe the features of React.js'
• 'What are the different types of databases?'
• 'Explain the process of photosynthesis'
• 'Describe the components of a computer'"
              disabled={file !== null}
            />
            <div className="prompt-tips">
              <p>Tips for better mind maps:</p>
              <ul>
                <li>Be specific about the topic you want to explore</li>
                <li>Mention if you want to focus on particular aspects</li>
                <li>You can ask for comparisons or relationships between concepts</li>
                <li>For complex topics, specify the depth of detail you need</li>
              </ul>
            </div>
          </div>

          <div className="divider">OR</div>

          <div className="input-section">
            <label htmlFor="pdf">
              Upload a PDF file:
            </label>
            <div className="file-input-container">
              <input
                id="pdf"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={prompt.trim() !== ''}
              />
              {file && <span className="file-name">{file.name}</span>}
            </div>
          </div>

          <div className="input-section">
            <label htmlFor="mindmap-type">
              Mind Map Type:
            </label>
            <select
              id="mindmap-type"
              value={mindMapType}
              onChange={handleTypeChange}
              className="type-select"
            >
              <option value="tree">Tree Map</option>
              <option value="radial">Radial Map</option>
              <option value="hierarchical">Hierarchical Map</option>
              <option value="organic">Organic Map</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || (!prompt.trim() && !file)}
            className={`submit-button ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Generating mind map...' : 'Generate Mind Map'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </form>

        {mindmap && (
          <div className="mindmap-display">
            <h2>Generated Mind Map</h2>
            <MindMap data={mindmap} type={mindMapType} />
          </div>
        )}
      </main>
    </div>
  );
}

export default MindMapPage; 