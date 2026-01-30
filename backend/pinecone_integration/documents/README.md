# PDF Documents for Pinecone RAG

## 📁 Place Your PDF Files Here

This folder is where you should place all PDF documents that you want to ingest into the Pinecone vector database for RAG (Retrieval-Augmented Generation).

## 📚 Recommended Documents

### BTL (National Insurance Institute) Documents
- BTL disability regulations
- Form 7801 guidelines
- Eligibility criteria documents
- Medical evaluation standards

### Legal Precedents
- Previous disability claim decisions
- Court rulings
- Administrative precedents

### Medical Guidelines
- Functional impairment assessment criteria
- Medical documentation requirements
- Disability evaluation protocols

### Reference Materials
- ADHD-specific guidelines
- Mental health disability criteria
- Any other relevant legal/medical documents

## 🚀 Usage

1. **Add PDFs**: Copy your PDF files to this folder
2. **Run Ingestion**: Execute `python pdf_to_pinecone.py` from the parent directory
3. **Verify**: Check logs for successful ingestion

## ⚙️ Processing Details

- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Embedding**: Automatic via Pinecone
- **Storage**: Pinecone index `adhd`, namespace `adhd-documents`

## 🔒 Security Note

This folder is in `.gitignore` to prevent committing sensitive documents. PDFs stored here will NOT be tracked by Git.

## 📝 File Naming Tips

Use descriptive filenames for better tracking:
- ✅ `btl_disability_regulations_2024.pdf`
- ✅ `form_7801_guidelines.pdf`
- ✅ `adhd_evaluation_criteria.pdf`
- ❌ `document1.pdf`
- ❌ `temp.pdf`

Filenames appear in search results metadata!

## 🔄 Re-ingestion

You can re-run the ingestion script anytime to add new documents. Existing documents with the same name will be updated.

```bash
cd backend/pinecone_integration
python pdf_to_pinecone.py
```

## 🎯 Current Status

- [ ] BTL regulations added
- [ ] Form 7801 guidelines added
- [ ] Medical evaluation criteria added
- [ ] Legal precedents added
- [ ] ADHD-specific documents added

Check off items as you add them!
