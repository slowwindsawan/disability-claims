# Pinecone RAG Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AI Lawyer Disability Claims System              │
│                          with Pinecone RAG                          │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                          INGESTION PHASE (One-time setup)                 │
└───────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │  Legal Documents    │
    │  (PDF Files)        │
    │                     │
    │  • BTL regulations  │
    │  • Form 7801 guide  │
    │  • Precedents       │
    │  • Medical criteria │
    └──────────┬──────────┘
               │
               │ 1. Read PDFs
               ▼
    ┌──────────────────────────────────┐
    │  pdf_to_pinecone.py              │
    │                                  │
    │  • Extract text from PDFs        │
    │  • Chunk into 1000 char pieces   │
    │  • 200 char overlap              │
    │  • Add metadata                  │
    └──────────┬───────────────────────┘
               │
               │ 2. Upsert records
               ▼
    ┌─────────────────────────────────────────┐
    │  Pinecone Vector Database               │
    │                                         │
    │  Index: adhd                            │
    │  Namespace: adhd-documents              │
    │  Region: us-east-1                      │
    │                                         │
    │  ┌───────────────────────────────┐     │
    │  │ Record                        │     │
    │  │ {                             │     │
    │  │   "_id": "doc_chunk_0",       │     │
    │  │   "chunk_text": "...",        │     │
    │  │   "category": "legal_doc",    │     │
    │  │   "source_file": "doc.pdf",   │     │
    │  │   "chunk_index": 0            │     │
    │  │ }                             │     │
    │  └───────────────────────────────┘     │
    │                                         │
    │  [Automatic Embedding Generation]      │
    └─────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                       RETRIEVAL PHASE (Runtime)                           │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  User Request    │
    │  "Analyze Case"  │
    └────────┬─────────┘
             │
             │ 3. Create case
             ▼
    ┌───────────────────────────────┐
    │  Case Documents               │
    │  (Uploaded by user)           │
    │                               │
    │  • Medical reports            │
    │  • Test results               │
    │  • Previous claims            │
    └───────────┬───────────────────┘
                │
                │ 4. Summarize docs
                ▼
    ┌────────────────────────────────────────┐
    │  document_analyzer_agent.py            │
    │                                        │
    │  • Concatenates document summaries     │
    │  • Prepares context                    │
    └────────────┬───────────────────────────┘
                 │
                 │ 5. Request analysis
                 ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │  anthropic_agent.py                                             │
    │                                                                 │
    │  ┌───────────────────────────────────────────────────────┐    │
    │  │ RAG Enhancement (NEW)                                 │    │
    │  │                                                       │    │
    │  │  6. Create query from case summary                   │    │
    │  │  7. Call pinecone_retriever.py                       │    │
    │  │  8. Retrieve top 5 relevant chunks                   │    │
    │  └────────────┬──────────────────────────────────────────┘    │
    │               │                                                │
    │               │ Query                                          │
    │               ▼                                                │
    │  ┌─────────────────────────────────────────────────────┐      │
    │  │  pinecone_retriever.py                              │      │
    │  │                                                     │      │
    │  │  • Semantic search in Pinecone                     │      │
    │  │  • Consider chat history                           │      │
    │  │  • Get top-k results                               │      │
    │  │  • Return concatenated context                     │      │
    │  └──────────┬──────────────────────────────────────────┘      │
    │             │                                                  │
    │             │ RAG Context                                      │
    │             ▼                                                  │
    │  ┌────────────────────────────────────────────────────┐       │
    │  │ Pinecone Vector DB                                 │       │
    │  │                                                    │       │
    │  │ Searches:                                          │       │
    │  │ ✓ Semantic similarity                              │       │
    │  │ ✓ Returns: Chunk text + metadata                   │       │
    │  │ ✓ Sorted by relevance score                        │       │
    │  └──────────┬─────────────────────────────────────────┘       │
    │             │                                                  │
    │             │ Relevant legal precedents                        │
    │             ▼                                                  │
    │  ┌────────────────────────────────────────────────────────┐   │
    │  │ Enhanced Prompt Builder                                │   │
    │  │                                                        │   │
    │  │  Prompt = {                                           │   │
    │  │    "Case Documents": context_text,                    │   │
    │  │    "Legal Precedents": rag_context,  ← NEW!          │   │
    │  │    "Instructions": form_7801_instructions             │   │
    │  │  }                                                    │   │
    │  └────────────┬───────────────────────────────────────────┘   │
    │               │                                                │
    │               │ 9. Send to OpenAI                              │
    │               ▼                                                │
    │  ┌──────────────────────────────────────┐                     │
    │  │  OpenAI GPT-4                        │                     │
    │  │                                      │                     │
    │  │  Analyzes with:                      │                     │
    │  │  ✓ Case documents                    │                     │
    │  │  ✓ Legal precedents (RAG)  ← NEW!   │                     │
    │  │  ✓ Expert instructions               │                     │
    │  └────────────┬─────────────────────────┘                     │
    │               │                                                │
    │               │ 10. Return analysis                            │
    │               ▼                                                │
    └─────────────────────────────────────────────────────────────────┘
                    │
                    │ Structured JSON Response
                    ▼
    ┌────────────────────────────────────────────┐
    │  Form 7801 Analysis Result                 │
    │                                            │
    │  • Eligibility assessment                  │
    │  • Claim strength (0-100)                  │
    │  • Key findings                            │
    │  • Strategy recommendations                │
    │  • Legal precedents cited (NEW!)          │
    │  • Documentation gaps                      │
    └────────────┬───────────────────────────────┘
                 │
                 │ 11. Display to user
                 ▼
    ┌──────────────────────────┐
    │  Frontend Dashboard      │
    │  (Enhanced Analysis)     │
    └──────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW                                      │
└───────────────────────────────────────────────────────────────────────────┘

Without RAG:
    Case Docs → Agent → Analysis
    (Limited to case documents only)

With RAG:
    Case Docs + Pinecone Knowledge Base → Agent → Enhanced Analysis
    (Includes legal precedents, guidelines, and expert knowledge)


┌───────────────────────────────────────────────────────────────────────────┐
│                         KEY IMPROVEMENTS                                  │
└───────────────────────────────────────────────────────────────────────────┘

Before:
    ❌ Agent relies only on training data
    ❌ May miss recent regulations
    ❌ No specific BTL precedents
    ❌ Generic recommendations

After:
    ✅ Agent has access to actual legal docs
    ✅ Uses current BTL regulations
    ✅ References specific precedents
    ✅ Grounded recommendations
    ✅ Reduced hallucination
    ✅ More accurate analysis


┌───────────────────────────────────────────────────────────────────────────┐
│                         FOLDER STRUCTURE                                  │
└───────────────────────────────────────────────────────────────────────────┘

backend/
├── app/
│   ├── anthropic_agent.py         [MODIFIED] - Added RAG retrieval
│   ├── document_analyzer_agent.py [MODIFIED] - Added chat history
│   └── ...
│
├── pinecone_integration/          [NEW FOLDER]
│   ├── pdf_to_pinecone.py        → Ingestion script
│   ├── pinecone_retriever.py     → Retrieval module
│   ├── test_integration.py       → Test suite
│   ├── requirements.txt          → Dependencies
│   ├── QUICKSTART.md             → 5-min setup
│   ├── USAGE_GUIDE.md            → Full docs
│   ├── IMPLEMENTATION_SUMMARY.md → This summary
│   ├── SETUP_CHECKLIST.md        → Deployment checklist
│   ├── README.md                 → Technical details
│   ├── .env.example              → Config template
│   └── documents/                → PDF storage
│       ├── .gitignore           → Ignore PDFs
│       └── README.md            → Document guide
│
└── requirements.txt              [MODIFIED] - Added sentence-transformers


┌───────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION DETAILS                                  │
└───────────────────────────────────────────────────────────────────────────┘

Pinecone Index:
    Name:      adhd
    Host:      https://adhd-vv6re86.svc.aped-4627-b74a.pinecone.io
    Region:    us-east-1
    Namespace: adhd-documents

Chunking Strategy:
    Chunk Size:    1000 characters
    Overlap:       200 characters
    Why:           Balance between context and specificity

Retrieval Settings:
    Top-K:         5 chunks per query
    Model:         all-MiniLM-L6-v2 (fast, accurate)
    Search Type:   Semantic (meaning-based)

Agent Integration:
    RAG Enabled:   Yes (by default)
    Fallback:      Graceful (continues without RAG if unavailable)
    Chat History:  Supported (for context-aware retrieval)
