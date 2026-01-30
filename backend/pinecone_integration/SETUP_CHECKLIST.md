# 🎯 Pinecone RAG Integration - Setup Checklist

Use this checklist to ensure proper setup and deployment of the Pinecone RAG integration.

## ✅ Pre-Setup

- [ ] Pinecone account created
- [ ] Index `adhd` created in Pinecone console
- [ ] API key obtained from Pinecone
- [ ] Index host URL confirmed: `https://adhd-vv6re86.svc.aped-4627-b74a.pinecone.io`
- [ ] Region confirmed: `us-east-1`

## 📦 Installation

- [ ] Navigate to backend directory
- [ ] Run `pip install pinecone-client pypdf2 sentence-transformers`
- [ ] Verify installations: `pip list | grep -E "pinecone|pypdf|sentence"`
- [ ] Check no import errors: `python -c "import pinecone; import PyPDF2; import sentence_transformers"`

## 🔧 Configuration

- [ ] Copy `.env.example` to `.env` (if needed)
- [ ] Add `PINECONE_API_KEY=your_actual_key` to `.env`
- [ ] Verify API key loaded: `python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('PINECONE_API_KEY'))"`
- [ ] Backend `.env` file has Pinecone key (same file as `OPENAI_API_KEY`)

## 📚 Document Preparation

- [ ] Created `backend/pinecone_integration/documents/` folder
- [ ] Collected BTL regulations PDFs
- [ ] Collected Form 7801 guidelines PDFs
- [ ] Collected medical evaluation criteria PDFs
- [ ] Collected legal precedent PDFs
- [ ] Collected ADHD-specific documents PDFs
- [ ] Copied all PDFs to `documents/` folder
- [ ] Verified PDFs are readable (not encrypted/password-protected)

## 🚀 Ingestion

- [ ] Navigate to `cd backend/pinecone_integration`
- [ ] Run `python pdf_to_pinecone.py`
- [ ] Check logs for "✅ Successfully ingested X records from Y PDF files"
- [ ] No error messages in output
- [ ] All PDFs processed successfully
- [ ] Verify in Pinecone console: namespace `adhd-documents` has vectors

## 🧪 Testing

- [ ] Run `python test_integration.py`
- [ ] Connection test passes ✅
- [ ] Retrieval test passes ✅
- [ ] Chat history retrieval test passes ✅
- [ ] All 3/3 tests pass
- [ ] Test retrieval manually: `python pinecone_retriever.py`

## 🔗 Agent Integration

- [ ] Verify [anthropic_agent.py](../app/anthropic_agent.py) has RAG imports
- [ ] Verify "✅ Pinecone RAG enabled" log appears on backend startup
- [ ] Check [document_analyzer_agent.py](../app/document_analyzer_agent.py) passes `use_rag` parameter
- [ ] No import errors in backend logs

## 🎯 Functional Testing

- [ ] Start backend server: `uvicorn app.main:app --reload`
- [ ] Check startup logs for "✅ Pinecone RAG enabled"
- [ ] Create a test case with documents
- [ ] Run agent analysis on test case
- [ ] Check logs for "✅ Retrieved RAG context: X characters"
- [ ] Verify agent response includes relevant legal precedents
- [ ] Response quality improved compared to without RAG

## 📊 Monitoring

- [ ] Check backend logs regularly for RAG status
- [ ] Monitor Pinecone dashboard for usage
- [ ] Track query performance (should be 200-500ms)
- [ ] Review which chunks are retrieved most often
- [ ] Adjust top_k if needed (currently 5)

## 🔄 Maintenance

- [ ] Document what PDFs were added (in `documents/README.md`)
- [ ] Set up process for adding new documents
- [ ] Plan regular reviews of RAG quality
- [ ] Schedule periodic re-ingestion if documents updated

## 📝 Documentation Review

- [ ] Read [QUICKSTART.md](QUICKSTART.md)
- [ ] Read [USAGE_GUIDE.md](USAGE_GUIDE.md)
- [ ] Understand [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- [ ] Know where to find troubleshooting info

## 🚨 Troubleshooting Completed

If you encountered issues, check these:

- [ ] API key is correct and has access to index
- [ ] Index name is exactly `adhd` (case-sensitive)
- [ ] Namespace is `adhd-documents`
- [ ] Network can reach Pinecone (no firewall blocking)
- [ ] PDFs are valid and contain text (not just images)
- [ ] Python version is 3.8+
- [ ] All dependencies installed correctly
- [ ] Backend can import from `pinecone_integration/` folder

## ✅ Production Ready

- [ ] All tests passing
- [ ] Agent using RAG successfully
- [ ] Knowledge base populated with key documents
- [ ] No errors in production logs
- [ ] Monitoring in place
- [ ] Team trained on adding new documents
- [ ] Backup plan if Pinecone unavailable (agent continues without RAG)

## 🎉 Success Criteria

You can check off "Ready for Production" when:

1. ✅ At least 10+ legal documents ingested
2. ✅ Test queries return relevant results
3. ✅ Agent analysis includes RAG context
4. ✅ No errors in logs for 24 hours
5. ✅ Team can add new documents independently

---

## 📞 Support

If you encounter issues:

1. Check logs for specific error messages
2. Review [USAGE_GUIDE.md](USAGE_GUIDE.md) troubleshooting section
3. Verify all checklist items above
4. Test each component independently (connection → retrieval → agent)

## 🎯 Quick Commands Reference

```bash
# Install
pip install pinecone-client pypdf2 sentence-transformers

# Ingest
cd backend/pinecone_integration
python pdf_to_pinecone.py

# Test
python test_integration.py

# Run backend
cd backend
uvicorn app.main:app --reload
```

---

**Date Completed**: ___________

**Completed By**: ___________

**Notes**: ___________
