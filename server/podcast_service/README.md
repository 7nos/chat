# Document to Podcast Service

This service converts text documents (TXT, PDF, DOCX) into conversational podcasts using text-to-speech technology.

## Features

- Supports multiple document formats (TXT, PDF, DOCX)
- Converts text into a conversational format with two speakers
- Generates MP3 audio output
- RESTful API endpoints for document upload and audio retrieval

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Create required directories:
```bash
mkdir -p static/uploads static/generated_audio
```

3. Start the service:
```bash
python app.py
```

The service will run on `http://localhost:5003`

## API Endpoints

### Upload Document
- **URL**: `/upload`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `document`: File (TXT, PDF, or DOCX)
- **Response**: 
  - Success: `{"message": "Podcast generated successfully!", "audio_url": "/generated_audio/podcast_[uuid].mp3"}`
  - Error: `{"error": "error message"}`

### Get Generated Audio
- **URL**: `/generated_audio/<filename>`
- **Method**: `GET`
- **Response**: MP3 audio file

## Requirements

- Python 3.7+
- FFmpeg (for audio processing)
- System TTS voices (Windows: SAPI5, Linux: espeak, macOS: NSSpeechSynthesizer)

## Notes

- The service uses system TTS voices, so the quality and availability of voices depends on your operating system
- Generated audio files are stored in `static/generated_audio`
- Temporary files are automatically cleaned up after processing 