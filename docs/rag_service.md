# RAG Service Documentation (Python)

## Overview
The RAG (Retrieval-Augmented Generation) microservice is a Python Flask application that handles document processing, embedding generation, and semantic search using FAISS. It provides the core functionality for document-based question answering.

## Directory Structure
```
rag_service/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── models/             # ML model wrappers
│   ├── embeddings.py   # SentenceTransformer wrapper
│   └── llm.py         # Gemini model wrapper
├── processors/         # Document processors
│   ├── pdf.py         # PDF processing
│   ├── docx.py        # DOCX processing
│   └── text.py        # Text processing
├── utils/             # Utility functions
│   ├── chunking.py    # Text chunking utilities
│   └── search.py      # FAISS search utilities
└── requirements.txt    # Python dependencies
```

## API Endpoints

### Document Processing (`/api/rag/*`)
- **POST /process**
  - Input: Document file and user ID
  - Output: Processing status and document ID
  - Steps:
    1. Extract text from document
    2. Chunk text into segments
    3. Generate embeddings
    4. Store in FAISS index

- **POST /query**
  - Input: Query text, user ID, subject
  - Output: Relevant text chunks and scores
  - Steps:
    1. Generate query embedding
    2. Search FAISS index
    3. Return top matches

## Document Processing

### Supported Formats
- PDF (using PyPDF2)
- DOCX (using python-docx)
- TXT (plain text)
- Code files (with syntax highlighting)

### Text Chunking Strategy
```python
{
    "chunk_size": 1000,
    "chunk_overlap": 200,
    "separators": ["\n\n", "\n", ".", "!", "?", ";", ":", " ", ""],
    "metadata": {
        "source": "filename",
        "page": "page_number",
        "timestamp": "processing_time"
    }
}
```

### Embedding Generation
- Model: `mxbai-embed-large-v1`
- Dimension: 1024
- Batch size: 32
- Normalization: L2

## FAISS Index Management

### Index Structure
```python
{
    "user_id": {
        "subject": {
            "index": "FAISS index object",
            "metadata": {
                "document_ids": [],
                "chunk_metadata": {},
                "last_updated": "timestamp"
            }
        }
    }
}
```

### Index Operations
- Create new index
- Update existing index
- Merge indices
- Delete index
- Backup/restore

## Models

### Embedding Model
```python
class EmbeddingModel:
    def __init__(self, model_name="mxbai-embed-large-v1"):
        self.model = SentenceTransformer(model_name)
        self.dimension = 1024

    def encode(self, texts, batch_size=32):
        return self.model.encode(texts, batch_size=batch_size)

    def encode_query(self, query):
        return self.model.encode([query])[0]
```

### LLM Model (Gemini)
```python
class LLMModel:
    def __init__(self, api_key, model_name="gemini-1.5-flash"):
        self.model = genai.GenerativeModel(model_name)
        self.api_key = api_key

    def generate(self, prompt, context):
        return self.model.generate_content(
            prompt,
            context=context,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40
            }
        )
```

## Environment Variables
```env
PORT=5000
EMBEDDING_MODEL=mxbai-embed-large-v1
FAISS_INDEX_PATH=../faiss_indices
GEMINI_API_KEY=your_gemini_api_key
BATCH_SIZE=32
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## Performance Optimization

### Caching
- Embedding cache for frequent queries
- Document text cache
- Index metadata cache

### Batch Processing
- Parallel document processing
- Batch embedding generation
- Asynchronous index updates

### Memory Management
- Index memory mapping
- Garbage collection optimization
- Resource cleanup

## Error Handling

### Common Errors
- Document processing errors
- Embedding generation failures
- Index access errors
- API rate limits

### Error Recovery
- Automatic retry for transient errors
- Fallback to backup indices
- Graceful degradation

## Monitoring

### Metrics
- Processing time
- Query latency
- Index size
- Memory usage
- Error rates

### Logging
- Processing logs
- Error logs
- Performance metrics
- Access logs

## Development Guidelines

### Code Style
- Follow PEP 8
- Type hints
- Docstring documentation
- Unit tests

### Testing
- Unit tests for processors
- Integration tests for API
- Performance benchmarks
- Error handling tests

### Security
- Input validation
- API key management
- Rate limiting
- Resource limits

## Deployment

### Requirements
- Python 3.8+
- Virtual environment
- GPU (optional)
- Sufficient RAM

### Setup Steps
1. Create virtual environment
2. Install dependencies
3. Set environment variables
4. Initialize FAISS indices
5. Start Flask application

### Scaling
- Horizontal scaling with load balancer
- Index sharding
- Caching layer
- Resource monitoring 