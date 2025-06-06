// client/src/components/FileUploadWidget.js
import React, { useState, useRef } from 'react';
import { uploadFile } from '../services/api';
import './FileUploadWidget.css'; // Import the new CSS file

const FileUploadWidget = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(''); // 'uploading', 'success', 'error', ''
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  const allowedFileTypesString = ".pdf,.txt,.docx,.doc,.pptx,.ppt,.py,.js,.bmp,.png,.jpg,.jpeg";

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileExt = "." + file.name.split('.').pop().toLowerCase();
      if (!allowedFileTypesString.includes(fileExt)) {
           setStatusMessage(`Error: File type (${fileExt}) not allowed.`);
           setUploadStatus('error');
           setSelectedFile(null);
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
      }

      const MAX_SIZE_MB = 20;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
          setStatusMessage(`Error: File exceeds ${MAX_SIZE_MB}MB limit.`);
          setUploadStatus('error');
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      setSelectedFile(file);
      setStatusMessage(`Selected: ${file.name}`);
      setUploadStatus('');

    } else {
        // Handle user cancelling file selection if needed
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage('Please select a file first.');
      setUploadStatus('error');
      return;
    }
    // Ensure userId exists before uploading
     const currentUserId = localStorage.getItem('userId');
     if (!currentUserId) {
         setStatusMessage('Error: Not logged in. Cannot upload file.');
         setUploadStatus('error');
         return;
     }

    setUploadStatus('uploading');
    setStatusMessage(`Uploading ${selectedFile.name}...`);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Interceptor adds user ID header
      const response = await uploadFile(formData);

      setUploadStatus('success');
      setStatusMessage(response.data.message || 'Upload successful!');
      console.log('Upload successful:', response.data);

      setSelectedFile(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }

      if (onUploadSuccess && typeof onUploadSuccess === 'function') {
          onUploadSuccess();
      }

      setTimeout(() => {
          // Check if status is still success before clearing
          setUploadStatus(prevStatus => prevStatus === 'success' ? '' : prevStatus);
          setStatusMessage(prevMsg => prevMsg === (response.data.message || 'Upload successful!') ? '' : prevMsg);
      }, 4000);


    } catch (err) {
      console.error("Upload Error:", err.response || err);
      setUploadStatus('error');
      setStatusMessage(err.response?.data?.message || 'Upload failed. Please check the file or try again.');
      if (err.response?.status === 401) {
          console.warn("FileUpload: Received 401 during upload.");
          // Consider calling a logout function passed via props or context
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload-widget">
      <h4>Upload File</h4>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={allowedFileTypesString}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <button
        type="button"
        className="select-file-btn"
        onClick={triggerFileInput}
        disabled={uploadStatus === 'uploading'}
      >
        Choose File
      </button>
      <div className={`status-message ${uploadStatus}`}>
        {statusMessage || 'No file selected.'}
      </div>
      <button
        type="button"
        className="upload-btn"
        onClick={handleUpload}
        disabled={!selectedFile || uploadStatus === 'uploading'}
      >
        {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default FileUploadWidget;
