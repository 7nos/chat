# RAG Service Documentation

## API Endpoints

### 1. **Health Check**
- **Endpoint:** `GET /health`
- **Purpose:** Checks if the RAG service is running and the embedding model is loaded.
- **Command:**
  ```bash
  curl -X GET http://localhost:5002/health
  ```
- **Response:**
  ```json
  {
    "default_index_dim": 1024,
    "default_index_loaded": true,
    "default_index_vectors": 924,
    "embedding_dimension": 1024,
    "embedding_model_loaded": true,
    "status": "healthy"
  }
  ```

### 2. **Add Document**
- **Endpoint:** `POST /add_document`
- **Purpose:** Ingests a document, chunks it, and adds it to the FAISS index.
- **Command:**
  ```bash
  curl -X POST http://localhost:5002/add_document \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"683dd48563adc328df41f503\",\"file_path\":\"C:/Users/suvar/Downloads/Chatbot-main/Chatbot-geminiV3/server/test_docs/embedded_final.txt\",\"original_name\":\"embedded_final.txt\"}"
  ```
- **Response:**
  ```json
  {
    "message": "Document 'embedded_final.txt' processed and added to index.",
    "filename": "embedded_final.txt",
    "chunks_added": 2,
    "status": "added"
  }
  ```

### 3. **Query**
- **Endpoint:** `POST /query`
- **Purpose:** Queries the FAISS index for similar documents.
- **Command:**
  ```bash
  curl -X POST http://localhost:5002/query \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"683dd48563adc328df41f503\",\"query\":\"Microcontrollers (ARM, RISC-V)\",\"k\":5}"
  ```
- **Response:**
  ```json
  [
    {
      "content": "CHAPTER13.LINEARFACTORMODELS\nTrainingsparsecodingwithmaximumlikelihoodisintractable.Instead,the\ntrainingalternatesbetweenencodingthedataandtrainingthedecodertobetter\nreconstructthedatagiventheencoding.Thisapproachwillbejustiﬁedfurtheras\naprincipledapproximation tomaximumlikelihoodlater,insection.19.3\nFormodelssuchasPCA,wehaveseentheuseofaparametricencoderfunction\nthatpredicts handconsistsonlyofmultiplication byaweightmatrix.Theencoder",
      "metadata": {
        "source": "[19]part-3-chapter-13.pdf",
        "chunk_id": 40,
        "type": "default"
      }
    },
    ...
  ]
  ```

## Backend API Endpoints

### 1. **Health Check**
- **Endpoint:** `GET /health`
- **Purpose:** Checks if the backend service is running.
- **Command:**
  ```bash
  curl -X GET http://localhost:5000/health
  ```
- **Response:**
  ```json
  {
    "status": "healthy"
  }
  ```

### 2. **Add Document**
- **Endpoint:** `POST /add_document`
- **Purpose:** Ingests a document, chunks it, and adds it to the FAISS index.
- **Command:**
  ```bash
  curl -X POST http://localhost:5000/add_document \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"683dd48563adc328df41f503\",\"file_path\":\"C:/Users/suvar/Downloads/Chatbot-main/Chatbot-geminiV3/server/test_docs/embedded_final.txt\",\"original_name\":\"embedded_final.txt\"}"
  ```
- **Response:**
  ```json
  {
    "message": "Document 'embedded_final.txt' processed and added to index.",
    "filename": "embedded_final.txt",
    "chunks_added": 2,
    "status": "added"
  }
  ```

### 3. **Query**
- **Endpoint:** `POST /query`
- **Purpose:** Queries the FAISS index for similar documents.
- **Command:**
  ```bash
  curl -X POST http://localhost:5000/query \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"683dd48563adc328df41f503\",\"query\":\"Microcontrollers (ARM, RISC-V)\",\"k\":5}"
  ```
- **Response:**
  ```json
  [
    {
      "content": "CHAPTER13.LINEARFACTORMODELS\nTrainingsparsecodingwithmaximumlikelihoodisintractable.Instead,the\ntrainingalternatesbetweenencodingthedataandtrainingthedecodertobetter\nreconstructthedatagiventheencoding.Thisapproachwillbejustiﬁedfurtheras\naprincipledapproximation tomaximumlikelihoodlater,insection.19.3\nFormodelssuchasPCA,wehaveseentheuseofaparametricencoderfunction\nthatpredicts handconsistsonlyofmultiplication byaweightmatrix.Theencoder",
      "metadata": {
        "source": "[19]part-3-chapter-13.pdf",
        "chunk_id": 40,
        "type": "default"
      }
    },
    ...
  ]
  ``` 