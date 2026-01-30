# Pinecone RAG Integration - Quick Start

## 🎯 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd backend
pip install pinecone-client pypdf2 sentence-transformers
```

### 2. Set API Key
Add to your `.env` file:
```env
PINECONE_API_KEY=your_api_key_here
```

### 3. Add Documents
```bash
# Copy your PDF legal documents to:
backend/pinecone_integration/documents/
```

### 4. Ingest Documents
```bash
cd backend/pinecone_integration
python pdf_to_pinecone.py
```

### 5. Test
```bash
python test_integration.py
```

## ✅ That's It!

The agent will now automatically use RAG when analyzing cases. No code changes needed!

## 📚 More Info

- **Full Guide**: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- **Technical Details**: [README.md](README.md)

## 🔧 Configuration

- **Index**: `adhd`
- **Namespace**: `adhd-documents`
- **Host**: https://adhd-vv6re86.svc.aped-4627-b74a.pinecone.io
- **Region**: us-east-1

## 💡 Tips

- Place BTL regulations, case precedents, and medical guidelines in `documents/`
- PDFs are automatically chunked and embedded
- Agent retrieves top 5 most relevant chunks per query
- Works with chat history for better context
