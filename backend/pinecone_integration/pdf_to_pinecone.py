import os
import json
import logging
from pathlib import Path
from typing import List

from dotenv import load_dotenv
import PyPDF2

from pinecone import Pinecone
from openai import OpenAI


# =========================
# CONFIG
# =========================

load_dotenv()

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.secrets_utils import get_openai_api_key

PINCONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINCONE_INDEX_HOST = "adhd-v2-vv6re86.svc.aped-4627-b74a.pinecone.io"
OPENAI_API_KEY = get_openai_api_key()

PDF_DIRECTORY = Path(__file__).parent / "documents"
STATE_FILE = Path(__file__).parent / "ingestion_state.json"

NAMESPACE = "adhd-documents"

EMBEDDING_MODEL = "text-embedding-3-small"  # 3072 dims
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
UPSERT_BATCH_SIZE = 50


# =========================
# LOGGING
# =========================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info("=" * 80)
logger.info("🚀 PDF to Pinecone Ingestion System Started")
logger.info("=" * 80)


# =========================
# STATE
# =========================

def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {}


def save_state(state: dict):
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2), encoding="utf-8")
    tmp.replace(STATE_FILE)


# =========================
# INGESTER
# =========================

class PDFToPineconeIngester:
    def __init__(self):
        if not all([PINECONE_API_KEY, PINECONE_INDEX_HOST, OPENAI_API_KEY]):
            logger.error("❌ Missing required environment variables:")
            logger.error(f"   PINECONE_API_KEY: {bool(PINECONE_API_KEY)}")
            logger.error(f"   PINECONE_INDEX_HOST: {bool(PINECONE_INDEX_HOST)}")
            logger.error(f"   OPENAI_API_KEY: {bool(OPENAI_API_KEY)}")
            raise RuntimeError("Missing env vars")

        logger.info("\n📌 Pinecone Configuration:")
        logger.info(f"   Host: {PINECONE_INDEX_HOST}")
        logger.info(f"   Namespace: {NAMESPACE}")
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        self.index = self.pc.Index(host=PINECONE_INDEX_HOST)
        logger.info("✅ Connected to Pinecone")
        
        logger.info("\n🤖 Processing Configuration:")
        logger.info(f"   Embedding Model: {EMBEDDING_MODEL}")
        logger.info(f"   Chunk Size: {CHUNK_SIZE} chars")
        logger.info(f"   Chunk Overlap: {CHUNK_OVERLAP} chars")
        logger.info(f"   Batch Size: {UPSERT_BATCH_SIZE} vectors")
        self.openai = OpenAI(api_key=OPENAI_API_KEY)
        
        self.state = load_state()
        if self.state:
            logger.info("\n📋 Resuming from previous state:")
            for file, progress in self.state.items():
                logger.info(f"   {file}: chunk {progress}")
        else:
            logger.info("\n📋 Fresh ingestion (no previous state)")

    def extract_text(self, pdf: Path) -> str:
        logger.debug(f"  📖 Extracting text...")
        text = ""
        try:
            with open(pdf, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                num_pages = len(reader.pages)
                logger.debug(f"     Pages: {num_pages}")
                
                for page_num, page in enumerate(reader.pages, 1):
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                
                extracted_chars = len(text.strip())
                logger.info(f"  ✅ Extracted {extracted_chars:,} characters from {num_pages} pages")
        except Exception as e:
            logger.error(f"  ❌ Text extraction failed: {e}")
            raise
        
        return text.strip()

    def chunk_text(self, text: str) -> List[str]:
        logger.debug(f"  🔪 Creating chunks...")
        chunks, start = [], 0
        text_len = len(text)
        
        while start < text_len:
            end = start + CHUNK_SIZE
            chunk = text[start:end]

            if end < text_len:
                split = max(chunk.rfind("."), chunk.rfind("\n"))
                if split > CHUNK_SIZE * 0.5:
                    chunk = chunk[: split + 1]
                    end = start + split + 1

            chunks.append(chunk.strip())
            start = end - CHUNK_OVERLAP
        
        logger.info(f"  ✅ Created {len(chunks)} chunks")
        return chunks

    def embed(self, texts: List[str]) -> List[List[float]]:
        try:
            logger.debug(f"     Generating {len(texts)} embeddings...")
            res = self.openai.embeddings.create(
                model=EMBEDDING_MODEL,
                input=texts,
            )
            embeddings = [d.embedding for d in res.data]
            logger.debug(f"     ✅ Generated {len(embeddings)} embeddings")
            return embeddings
        except Exception as e:
            logger.error(f"     ❌ Embedding failed: {e}")
            raise

    def ingest(self):
        logger.info(f"\n📁 Scanning documents folder: {PDF_DIRECTORY}")
        PDF_DIRECTORY.mkdir(exist_ok=True)
        
        pdfs = list(PDF_DIRECTORY.glob("*.pdf"))
        logger.info(f"📄 Found {len(pdfs)} PDF files")
        
        if not pdfs:
            logger.warning("⚠️ No PDF files found. Ingestion skipped.")
            return
        
        total_chunks = 0
        for idx, pdf in enumerate(pdfs, 1):
            logger.info(f"\n[{idx}/{len(pdfs)}] Processing: {pdf.name}")
            chunks = self.ingest_pdf(pdf)
            total_chunks += chunks
        
        logger.info(f"\n" + "=" * 80)
        logger.info(f"🎉 Ingestion Complete!")
        logger.info(f"   Total chunks uploaded: {total_chunks}")
        logger.info("=" * 80)

    def ingest_pdf(self, pdf: Path) -> int:
        name = pdf.name
        start = self.state.get(name, 0)

        text = self.extract_text(pdf)
        if not text:
            logger.warning(f"  ⚠️ No text extracted from {name}")
            return 0

        chunks = self.chunk_text(text)
        if start >= len(chunks):
            logger.info(f"  ✅ Already fully ingested ({len(chunks)} chunks)")
            return len(chunks)

        logger.info(f"  ▶️ Resuming from chunk {start}/{len(chunks)}")
        
        total_upserted = 0
        for batch_num, i in enumerate(range(start, len(chunks), UPSERT_BATCH_SIZE), 1):
            batch = chunks[i:i + UPSERT_BATCH_SIZE]
            logger.debug(f"     Batch {batch_num}: chunks {i}-{i+len(batch)-1}")
            
            embeddings = self.embed(batch)

            vectors = [
                {
                    "id": f"{name}_{i + j}",
                    "values": emb,
                    "metadata": {
                        "text": chunk,
                        "source": name,
                        "chunk_index": i + j,
                        "total_chunks": len(chunks),
                    },
                }
                for j, (chunk, emb) in enumerate(zip(batch, embeddings))
            ]

            try:
                self.index.upsert(
                    namespace=NAMESPACE,
                    vectors=vectors,
                )
                total_upserted += len(vectors)
                logger.debug(f"     ✅ Upserted {len(vectors)} vectors")
            except Exception as e:
                logger.error(f"     ❌ Upsert failed: {e}")
                raise

            self.state[name] = i + len(batch)
            save_state(self.state)
        
        logger.info(f"  ✅ Upserted {total_upserted} chunks")
        return total_upserted
            save_state(self.state)

            logger.info(f"✅ {name}: chunks {i} → {self.state[name] - 1}")


# =========================
# MAIN
# =========================

if __name__ == "__main__":
    PDFToPineconeIngester().ingest()
