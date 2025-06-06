import React, { useState } from 'react';
import './PodcastWidget.css';

const PodcastWidget = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [status, setStatus] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.type === 'application/pdf' || 
                file.type === 'application/msword' || 
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.type === 'text/plain') {
                setSelectedFile(file);
                setStatus('');
            } else {
                setStatus('Please select a PDF, DOCX, or TXT file.');
                setSelectedFile(null);
            }
        }
    };

    const handleConvert = async () => {
        if (!selectedFile) {
            setStatus('Please select a file first.');
            return;
        }

        setIsLoading(true);
        setStatus('Converting document to podcast...');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('http://localhost:5003/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Conversion failed');
            }

            const data = await response.json();
            setAudioUrl(`http://localhost:5003${data.audio_url}`);
            setStatus('Conversion successful! Click play to listen.');
        } catch (error) {
            setStatus('Error: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerFileInput = () => {
        document.getElementById('podcast-file-input').click();
    };

    return (
        <div className="podcast-widget">
            <h4>Document to Podcast</h4>
            <div className="podcast-controls">
                <input
                    type="file"
                    id="podcast-file-input"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                />
                <button
                    className="select-file-btn"
                    onClick={triggerFileInput}
                    disabled={isLoading}
                >
                    Select Document
                </button>
                <button
                    className="convert-btn"
                    onClick={handleConvert}
                    disabled={!selectedFile || isLoading}
                >
                    {isLoading ? 'Converting...' : 'Convert to Podcast'}
                </button>
            </div>
            {selectedFile && (
                <div className="selected-file">
                    Selected: {selectedFile.name}
                </div>
            )}
            {status && (
                <div className={`status-message ${isLoading ? 'loading' : status.includes('Error') ? 'error' : 'success'}`}>
                    {status}
                </div>
            )}
            {audioUrl && (
                <div className="audio-player">
                    <audio controls src={audioUrl}>
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </div>
    );
};

export default PodcastWidget;
