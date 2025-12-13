# boldsign_embed_ui.py
"""
Single-file FastAPI app that:
 - Serves a simple UI at GET /ui where users enter name/email and click "Start Signing".
 - Server generates a minimal one-page PDF on the fly (no upload required),
   creates a BoldSign document, requests an embedded signing link, and returns it.
 - The UI loads the BoldSign embedded signing link in an iframe so the user signs
   using BoldSign's signing canvas.
 - The server stores a simple in-memory mapping (DOCUMENT_ID -> record). You can
   replace SIGNATURES with a DB in production.
 - Webhook endpoint /webhook/boldsign updates mapping when BoldSign posts events.
 - GET /status/{document_id} returns the stored mapping.

Requirements:
  pip install fastapi uvicorn requests python-multipart reportlab

Environment:
  export BOLDSIGN_API_KEY="your_boldsign_api_key"
  (Windows PowerShell: $env:BOLDSIGN_API_KEY="your_boldsign_api_key")

Run:
  uvicorn boldsign_embed_ui:app --reload --port 8080
  Open http://localhost:8080/ui

Notes:
 - This demo creates a tiny PDF containing "Please sign below" and a visible box.
 - BoldSign requires an API key. This file reads it from the environment (BOLDSIGN_API_KEY).
 - For production: verify webhooks, persist to DB, add auth, handle errors/edge cases.
"""

import os
import io
import json
import time
import uuid
from typing import Dict, Any

import requests
from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# --- Config ---
BOLDSIGN_API_KEY = "YWQ3YjI2ZDktZmJhNy00M2M2LWFlOGQtNDBiZWNkOTYxMWM4"
if not BOLDSIGN_API_KEY:
    raise RuntimeError("BOLDSIGN_API_KEY environment variable is required. Set it to your BoldSign API key.")

REDIRECT_URL = os.getenv("REDIRECT_URL", "http://localhost:8080/ui?completed=1")
API_BASE = "https://api.boldsign.com/v1"

PORT = int(os.getenv("PORT", 8080))
SIGN_DIR = os.getenv("SIGN_DIR", "signatures")  # not used for PDF generation here, but could be used to save locally
os.makedirs(SIGN_DIR, exist_ok=True)

app = FastAPI(title="BoldSign Embedded Signing (single-file)")

# Simple in-memory store for demo purposes. Replace with DB for production.
# document_id -> info
SIGNATURES: Dict[str, Dict[str, Any]] = {}

# Serve UI
@app.get("/ui", response_class=HTMLResponse)
async def ui(request: Request):
    """
    UI: Enter name/email (no PDF needed), click Start Signing. The iframe will load
    the BoldSign embedded signing UI (the real BoldSign signature canvas).
    """
    html = """
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BoldSign Embedded Signing (Demo)</title>
<style>
  body{{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:24px;background:#f8fafc;color:#0f172a}}
  .card{{max-width:920px;margin:0 auto;background:#fff;padding:18px;border-radius:12px;box-shadow:0 8px 30px rgba(2,6,23,0.06)}}
  label{{display:block;margin-top:10px;font-weight:600}}
  input[type=text],input[type=email]{{width:100%;padding:10px;border:1px solid #e6eef6;border-radius:8px}}
  button{{margin-top:12px;padding:10px 14px;border-radius:8px;border:none;background:#2563eb;color:white;font-weight:700;cursor:pointer}}
  iframe{{width:100%;height:720px;border:0;margin-top:14px;border-radius:10px}}
  .meta{{margin-top:12px;color:#374151;font-size:13px}}
  .small{{font-size:13px;color:#6b7280}}
</style>
</head>
<body>
  <div class="card">
    <h2>Embedded Signing (BoldSign) — Demo</h2>
    <p class="small">This demo generates a tiny PDF server-side and opens the BoldSign embedded signing canvas (iframe). After the signer finishes, BoldSign will redirect to this page with <code>?completed=1</code> and the UI will mark the flow complete. The returned <strong>documentId</strong> is shown and kept in a JS variable for you to store.</p>

    <label>Name</label>
    <input id="name" type="text" placeholder="Jane Doe" value="Demo User" />

    <label>Email</label>
    <input id="email" type="email" placeholder="jane@example.com" value="signer@example.com" />

    <label>User ID (app)</label>
    <input id="user_id" type="text" placeholder="your-app-user-id" value="demo-user-123" />

    <div style="display:flex;gap:8px;">
      <button id="startBtn">Start Signing</button>
      <button id="clearBtn" style="background:#ef4444">Clear</button>
    </div>

    <div class="meta">Status: <span id="status">idle</span></div>

    <div id="docMeta" class="meta" style="display:none;margin-top:12px;">
      <div>Document ID: <code id="documentId"></code></div>
      <div>Saved mapping (server): <pre id="savedRecord" style="white-space:pre-wrap"></pre></div>
      <div style="margin-top:8px;">You can use <code>window.latestDocumentId</code> in console to access the last ID.</div>
    </div>

    <div id="iframeWrap" style="display:none;margin-top:12px;">
      <h3>Signing iframe</h3>
      <iframe id="signFrame" src=""></iframe>
    </div>
  </div>

<script>
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const iframeWrap = document.getElementById('iframeWrap');
const signFrame = document.getElementById('signFrame');
const documentIdEl = document.getElementById('documentId');
const savedRecordEl = document.getElementById('savedRecord');
const docMetaEl = document.getElementById('docMeta');

let latestDocumentId = null;
window.latestDocumentId = null;

startBtn.addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const user_id = document.getElementById('user_id').value.trim() || 'anonymous';

  if (!name || !email) { alert('Please provide name and email'); return; }

  statusEl.textContent = 'creating document...';

  try {
    const resp = await fetch('/create-embed-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, user_id })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || 'Failed to create embed link');
    }
    const data = await resp.json();
    const { signingLink, documentId, saved } = data;

    latestDocumentId = documentId;
    window.latestDocumentId = documentId;

    documentIdEl.textContent = documentId;
    savedRecordEl.textContent = JSON.stringify(saved, null, 2);
    docMetaEl.style.display = 'block';

    // Load the BoldSign embedded signing link in iframe
    signFrame.src = signingLink;
    iframeWrap.style.display = 'block';
    statusEl.textContent = 'in-progress';

    // Listen for iframe load events; when BoldSign redirects to REDIRECT_URL (same-origin),
    // parent can read the iframe's location and detect ?completed=1
    signFrame.onload = () => {
      try {
        const href = signFrame.contentWindow.location.href;
        if (href && href.indexOf('?') !== -1) {
          const params = new URL(href).searchParams;
          if (params.get('completed') === '1') {
            statusEl.textContent = 'completed (redirect detected)';
            // You can now call backend /status/{documentId} or simply use the saved mapping
            console.log('Signing completed for document:', latestDocumentId);
          }
        }
      } catch (e) {
        // cross-origin while BoldSign domain is loaded - ignore until it redirects back to our domain
      }
    };
  } catch (err) {
    console.error(err);
    alert('Error: ' + (err.message || err));
    statusEl.textContent = 'error';
  }
});

clearBtn.addEventListener('click', () => {
  signFrame.src = '';
  iframeWrap.style.display = 'none';
  docMetaEl.style.display = 'none';
  statusEl.textContent = 'idle';
  latestDocumentId = null;
  window.latestDocumentId = null;
});
</script>
</body>
</html>
"""
    return HTMLResponse(html)


def generate_demo_pdf_bytes(name: str) -> bytes:
    """
    Generate a minimal one-page PDF in memory with a visible box labelled "Sign here".
    """
    buf = io.BytesIO()
    p = canvas.Canvas(buf, pagesize=letter)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(72, 700, f"Document for {name}")
    p.setFont("Helvetica", 11)
    p.drawString(72, 680, "Please sign in the box below using the embedded signing canvas.")
    # draw a rectangle that visually indicates a signature area
    x = 72
    y = 560
    width = 400
    height = 80
    p.rect(x, y, width, height, stroke=1, fill=0)
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(x + 6, y + height + 6, "Sign here:")
    p.showPage()
    p.save()
    buf.seek(0)
    return buf.read()


@app.post("/create-embed-link")
async def create_embed_link(request: Request):
    """
    Create a BoldSign document from a small generated PDF and request an embedded signing link.
    Payload JSON: { name, email, user_id }
    Returns: { signingLink, documentId, saved }
    """
    payload = await request.json()
    name = payload.get("name")
    email = payload.get("email")
    user_id = payload.get("user_id", "anonymous")

    if not name or not email:
        raise HTTPException(status_code=400, detail="name and email are required")

    # 1) generate PDF bytes
    pdf_bytes = generate_demo_pdf_bytes(name)

    # 2) call BoldSign /document/send (multipart).
    send_url = f"{API_BASE}/document/send"
    headers = {"X-API-KEY": BOLDSIGN_API_KEY}

    # Use Recipients instead of Signers (more recent API style)
    recipients = [
        {
            "name": name,
            "emailAddress": email,
            "recipientType": "Signer",
            "recipientOrder": 1,
            # Let them place the signature field in the UI; no FormFields here
        }
    ]

    files = {
        "files": ("document.pdf", pdf_bytes, "application/pdf")
    }

    # BoldSign expects Recipients as JSON string in multipart
    data = {
        "title": f"Agreement for {name}",
        "message": "Please sign this document.",
        "disableEmails": "true",
        "recipients": json.dumps(recipients),
    }

    try:
        r = requests.post(send_url, headers=headers, data=data, files=files, timeout=60)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to call BoldSign send endpoint: {e}")

    if r.status_code >= 400:
        raise HTTPException(
            status_code=500,
            detail=f"BoldSign /document/send failed: {r.status_code} {r.text}",
        )

    send_resp = r.json()
    # Grab documentId (check multiple casings)
    document_id = (
        send_resp.get("documentId")
        or send_resp.get("DocumentId")
        or send_resp.get("documentID")
    )
    if not document_id:
        raise HTTPException(
            status_code=500,
            detail=f"BoldSign did not return documentId. Response: {send_resp}",
        )

    # 3) request embedded sign link
    get_link_url = f"{API_BASE}/document/getEmbeddedSignLink"
    params = {"documentId": document_id, "signerEmail": email, "redirectUrl": REDIRECT_URL}

    try:
        r2 = requests.get(get_link_url, headers=headers, params=params, timeout=30)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to call BoldSign getEmbeddedSignLink: {e}",
        )

    if r2.status_code >= 400:
        raise HTTPException(
            status_code=500,
            detail=f"BoldSign getEmbeddedSignLink failed: {r2.status_code} {r2.text}",
        )

    link_resp = r2.json()
    signing_link = (
        link_resp.get("signLink")
        or link_resp.get("SignLink")
        or link_resp.get("signingLink")
    )
    if not signing_link:
        raise HTTPException(
            status_code=500,
            detail=f"BoldSign did not return signLink. Response: {link_resp}",
        )

    # 4) save mapping in memory
    record = {
        "document_id": document_id,
        "user_id": user_id,
        "name": name,
        "email": email,
        "status": "Sent",
        "created_at": int(time.time()),
        "boldsend_response": send_resp,
        "embed_response": link_resp,
    }
    SIGNATURES[document_id] = record

    return JSONResponse(
        {"signingLink": signing_link, "documentId": document_id, "saved": record}
    )

@app.post("/webhook/boldsign")
async def boldsign_webhook(request: Request):
    """
    Basic webhook handler to receive BoldSign events and update SIGNATURES mapping.
    Configure this endpoint in BoldSign webhook settings (POST JSON).
    IMPORTANT: In production, verify webhook authenticity.
    """
    payload = await request.json()
    event = payload.get("event", {})
    data = payload.get("data", {}) or {}
    # BoldSign payloads vary; common place for document id:
    document_id = data.get("documentId") or data.get("DocumentId") or data.get("document_id")
    event_type = event.get("eventType") or event.get("event") or None

    if document_id:
        rec = SIGNATURES.get(document_id, {})
        old = rec.get("status")
        if event_type:
            rec["status"] = event_type
        rec.setdefault("webhooks", []).append(payload)
        SIGNATURES[document_id] = rec
        print(f"[webhook] document {document_id} event {event_type}, old={old} new={rec.get('status')}")
    else:
        print("[webhook] received event without document_id:", payload)
    return JSONResponse({"ok": True})


@app.get("/status/{document_id}")
async def get_status(document_id: str):
    """
    Return stored mapping for a document. Fallback: call BoldSign document/properties.
    """
    if document_id in SIGNATURES:
        return JSONResponse(SIGNATURES[document_id])

    # fallback to BoldSign API
    url = f"{API_BASE}/document/properties"
    headers = {"X-API-KEY": BOLDSIGN_API_KEY}
    params = {"documentId": document_id}
    r = requests.get(url, headers=headers, params=params, timeout=20)
    if r.status_code >= 400:
        raise HTTPException(status_code=404, detail=f"Not found locally and BoldSign returned {r.status_code}: {r.text}")
    return JSONResponse(r.json())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("boldsign:app", host="0.0.0.0", port=PORT, reload=True)
