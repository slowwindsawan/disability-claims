# Pinecone Integration for ADHD Legal Documents

This folder contains the Pinecone vector database integration for RAG (Retrieval-Augmented Generation) in the AI lawyer agent.

## Setup

### 1. Install Dependencies

```bash
pip install pinecone-client pypdf2 sentence-transformers
```

### 2. Set Environment Variables

Add the following to your `.env` file:

```env
PINECONE_API_KEY=your_api_key_here
```

### 3. Configuration

- **Index Name**: `adhd`
- **Host**: `https://adhd-vv6re86.svc.aped-4627-b74a.pinecone.io`
- **Region**: `us-east-1`
- **Namespace**: `adhd-documents`

## Usage

### Ingesting PDF Documents

1. Place your PDF files in the `documents/` folder
2. Run the ingestion script:

```bash
python pdf_to_pinecone.py
```

This will:
- Extract text from all PDFs in the `documents/` folder
- Split text into chunks (1000 characters with 200 character overlap)
- Generate embeddings using `all-MiniLM-L6-v2` model
- Upload to Pinecone with metadata (file name, chunk index, etc.)

### Using the Pinecone Retriever in Agent

The `pinecone_retriever.py` module provides RAG functionality:

```python
from pinecone_integration.pinecone_retriever import PineconeRetriever

retriever = PineconeRetriever()
retriever.connect()

# Retrieve relevant context
context = retriever.retrieve_context(
    query="What are the eligibility requirements for disability claims?",
    top_k=5
)

# Use in agent prompt
prompt = f"Context: {context}\n\nQuestion: {query}"
```

## Files

- `pdf_to_pinecone.py` - Script to ingest PDF documents into Pinecone
- `pinecone_retriever.py` - RAG retrieval module for the agent
- `documents/` - Place your PDF files here for ingestion
- `README.md` - This file

## Data Format

Records are stored in Pinecone with the following structure:

```python
{
    "_id": "filename.pdf_chunk_0",
    "chunk_text": "The actual text content...",
    "category": "legal_document",
    "source_file": "filename.pdf",
    "chunk_index": 0,
    "total_chunks": 10
}
```

## Notes

- Chunks are created with 1000 character size and 200 character overlap
- Text is automatically embedded using Pinecone's inference API
- Documents are stored in the `adhd-documents` namespace
- The system uses semantic search to find the most relevant chunks
