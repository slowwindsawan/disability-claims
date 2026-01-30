# Pinecone RAG Integration Guide

## Overview

The AI lawyer agent now includes Pinecone vector database integration for Retrieval-Augmented Generation (RAG). This allows the agent to access a knowledge base of legal documents, precedents, and guidelines when analyzing disability claims.

## Architecture

```
┌─────────────────────┐
│   PDF Documents     │
│   (in documents/)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  pdf_to_pinecone.py                     │
│  - Extracts text from PDFs              │
│  - Chunks text (1000 chars, 200 overlap)│
│  - Generates embeddings                 │
│  - Uploads to Pinecone                  │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Pinecone Index: "adhd"                 │
│  - Namespace: "adhd-documents"          │
│  - Host: adhd-vv6re86.svc...pinecone.io│
│  - Region: us-east-1                    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  pinecone_retriever.py                  │
│  - Semantic search                      │
│  - Chat history aware retrieval         │
│  - Category filtering                   │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  anthropic_agent.py                     │
│  - Retrieves relevant context           │
│  - Enhances prompt with RAG             │
│  - Generates Form 7801 analysis         │
└─────────────────────────────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install pinecone-client pypdf2 sentence-transformers
```

Or install from requirements:

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Add to your `.env` file:

```env
PINECONE_API_KEY=your_actual_api_key_here
```

### 3. Prepare PDF Documents

Place your legal documents (precedents, guidelines, BTL regulations, etc.) in:

```
backend/pinecone_integration/documents/
```

### 4. Ingest Documents into Pinecone

Run the ingestion script:

```bash
cd backend/pinecone_integration
python pdf_to_pinecone.py
```

This will:
- Extract text from all PDFs in the `documents/` folder
- Split into chunks (1000 characters with 200 overlap)
- Generate embeddings automatically
- Upload to Pinecone index `adhd` in namespace `adhd-documents`

### 5. Verify Ingestion

```bash
python pinecone_retriever.py
```

This runs a test query to verify the integration works.

## Usage in Agent

The agent automatically uses RAG when analyzing cases:

```python
from app.document_analyzer_agent import analyze_case_documents_with_agent

# Analyze with RAG (default)
result = await analyze_case_documents_with_agent(
    case_id="12345",
    documents_data=documents,
    chat_history=[
        {"role": "user", "content": "Previous question"},
        {"role": "assistant", "content": "Previous answer"}
    ],
    use_rag=True  # Default
)

# Disable RAG if needed
result = await analyze_case_documents_with_agent(
    case_id="12345",
    documents_data=documents,
    use_rag=False
)
```

## How RAG Works

1. **Query Formation**: The agent creates a query from the case documents summary
2. **Semantic Search**: Pinecone retrieves the top 5 most relevant chunks from the knowledge base
3. **Context Enhancement**: Retrieved content is added to the agent's prompt
4. **Analysis**: The agent analyzes the case with both the case documents AND relevant legal precedents

## Data Format in Pinecone

Records are stored with this structure:

```python
{
    "_id": "document_name.pdf_chunk_0",
    "chunk_text": "The actual legal text content...",
    "category": "legal_document",
    "source_file": "document_name.pdf",
    "chunk_index": 0,
    "total_chunks": 15
}
```

## Features

### 1. Semantic Search
Finds relevant content based on meaning, not just keywords.

### 2. Chat History Awareness
Considers previous conversation for better context retrieval.

### 3. Category Filtering
Can filter by document category (e.g., only BTL regulations).

### 4. Automatic Fallback
If Pinecone is unavailable, the agent continues without RAG.

## API Endpoints

The RAG integration is transparent to existing API endpoints. No changes needed to:

- `/cases/{case_id}/analyze` - Uses RAG automatically
- `/chat` endpoints - Can pass chat_history for better retrieval

## Performance

- **Query Time**: ~200-500ms for retrieval
- **Top-K Results**: 5 chunks (configurable)
- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Embedding Model**: `all-MiniLM-L6-v2` (fast, accurate)

## Monitoring

Check logs for RAG status:

```
✅ Pinecone RAG enabled
✅ Retrieved RAG context: 3421 characters
⚠️ No RAG context retrieved from Pinecone
⚠️ RAG retrieval failed: [error]. Continuing without RAG context.
```

## Troubleshooting

### "Pinecone integration not available"
- Install: `pip install pinecone-client`
- Check: `PINECONE_API_KEY` in environment

### "No results found for query"
- Run ingestion: `python pdf_to_pinecone.py`
- Check namespace: Default is `adhd-documents`
- Verify index: `adhd` in Pinecone console

### "Connection timeout"
- Check internet connection
- Verify Pinecone API key is valid
- Check host URL: `https://adhd-vv6re86.svc.aped-4627-b74a.pinecone.io`

## Customization

### Adjust Number of Retrieved Chunks

In [anthropic_agent.py](../app/anthropic_agent.py):

```python
rag_context = retriever.retrieve_context(
    query=query,
    top_k=10  # Change from 5 to 10
)
```

### Change Chunk Size

In [pdf_to_pinecone.py](pdf_to_pinecone.py):

```python
CHUNK_SIZE = 1500  # Increase from 1000
CHUNK_OVERLAP = 300  # Increase from 200
```

### Filter by Category

```python
rag_context = retriever.retrieve_by_category(
    query=query,
    category="btl_regulations",
    top_k=5
)
```

## Files Created

```
backend/pinecone_integration/
├── pdf_to_pinecone.py      # PDF ingestion script
├── pinecone_retriever.py   # RAG retrieval module
├── requirements.txt         # Dependencies
├── README.md               # Basic usage
├── .env.example            # Environment template
├── documents/              # Place PDFs here
└── USAGE_GUIDE.md         # This file
```

## Next Steps

1. **Populate Knowledge Base**: Add BTL regulations, case precedents, medical guidelines
2. **Fine-tune Retrieval**: Adjust top_k based on performance
3. **Add Categories**: Tag documents for filtered retrieval
4. **Monitor Quality**: Review RAG context in agent responses
5. **Expand Coverage**: Continuously add relevant legal documents

## Example Workflow

```bash
# 1. Add new PDF documents
cp new_document.pdf backend/pinecone_integration/documents/

# 2. Ingest into Pinecone
cd backend/pinecone_integration
python pdf_to_pinecone.py

# 3. Test retrieval
python pinecone_retriever.py

# 4. Agent automatically uses RAG in analysis
# No code changes needed!
```

## Benefits

✅ **More Accurate Analysis**: Agent has access to legal precedents
✅ **Consistent Guidance**: Uses official BTL guidelines
✅ **Better Recommendations**: References similar cases
✅ **Reduced Hallucination**: Grounded in actual legal documents
✅ **Scalable**: Add documents without code changes
