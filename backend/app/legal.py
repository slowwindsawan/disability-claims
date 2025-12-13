import os
from typing import List, Tuple

from pdfminer.high_level import extract_text as pdf_extract_text


def load_legal_document_chunks(documents_dir: str = '../documents', max_chunk_chars: int = 4000) -> List[dict]:
    """
    Load the first legal document found in `documents_dir` and split into chunks with section ids.
    For PDFs will attempt to extract text via pdfminer.
    Returns list of {section_id, text}
    """
    full_path = None
    for name in os.listdir(documents_dir):
        if name.startswith('.'):
            continue
        full_path = os.path.join(documents_dir, name)
        break

    if not full_path:
        return []

    text = ""
    if full_path.lower().endswith('.pdf'):
        try:
            text = pdf_extract_text(full_path)
        except Exception:
            with open(full_path, 'rb') as f:
                text = f.read().decode(errors='ignore')
    else:
        try:
            with open(full_path, 'r', encoding='utf8') as f:
                text = f.read()
        except Exception:
            with open(full_path, 'rb') as f:
                text = f.read().decode(errors='ignore')

    # naive chunking by characters; in real implementation chunk by semantic sections / headings
    chunks = []
    i = 0
    while i < len(text):
        chunk_text = text[i:i+max_chunk_chars]
        chunks.append({
            'section_id': f'section_{len(chunks)+1}',
            'text': chunk_text
        })
        i += max_chunk_chars
    return chunks
