FastAPI backend for eligibility orchestration

Overview

This backend provides a basic orchestration endpoint to:
- Accept user questionnaire answers and an uploaded medical PDF/image
- Extract text (PDF text extraction + OCR fallback)
- Load the legal guideline from `backend/documents`
- Build a prompt and call a generative model (Gemini / Vertex AI) — currently a placeholder
- Return a structured eligibility decision

Setup (local / dev)

1. Create and activate a Python virtualenv (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Install OS dependencies for `pdf2image` and `pytesseract`:
- `poppler` (for `pdf2image`) — install via package manager or from https://poppler.freedesktop.org/
- `Tesseract OCR` — install from https://github.com/tesseract-ocr/tesseract

3. Create `.env` using `.env.example` and set any credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS) if you will call Vertex AI.
4. (Optional) If you prefer Google Vision OCR for uploaded documents, set `GOOGLE_VISION_API_KEY` in your `.env` file. The backend will use Vision OCR only for user-uploaded documents (the legal guideline in `backend/documents` is not sent to Vision).

Run (development):

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

API

POST /eligibility-check
- Accepts multipart form with `answers` (JSON) and `file` (PDF/PNG/JPG/DOCX)
- Returns a structured JSON object with `eligibility`, `confidence`, `reason_summary`, and `raw_response` (model output)

Notes

- `gemini_client.py` contains a placeholder function `call_gemini` — replace with actual Vertex AI/Google SDK usage and your model ID.
- This scaffolding focuses on wiring: extraction -> prompt generation -> model call -> return result.
- For production usage: add authentication, secure storage, persistent DB, background job queue, and strict PII redaction before sending to external APIs.
