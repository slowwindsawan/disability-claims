import os
import io
import base64
import logging
import requests
from typing import Tuple
from pathlib import Path

# Load .env from the backend folder if present so this module works
# even when imported standalone (e.g., in tests or CLI helpers).
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except Exception:
    # dotenv is optional in production environments (secrets come from env)
    pass

logger = logging.getLogger(__name__)


def is_pdf(file_bytes: bytes, filename: str = "") -> bool:
    """Check if file is a PDF based on magic bytes or extension."""
    # Check magic bytes
    if file_bytes[:4] == b'%PDF':
        return True
    # Check extension
    if filename.lower().endswith('.pdf'):
        return True
    return False


def is_image(filename: str = "") -> bool:
    """Check if file is an image based on extension."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'}
    if filename:
        ext = Path(filename).suffix.lower()
        return ext in image_extensions
    return False


def ocr_image_with_vision(image_bytes: bytes, filename: str = "image") -> str:
    """Send image bytes to Google Vision OCR via API key."""
    API_KEY = os.getenv("GOOGLE_VISION_API_KEY")
    
    if not API_KEY:
        logger.error("GOOGLE_VISION_API_KEY not set in environment")
        raise Exception("Google Vision API key not configured")
    
    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        
        payload = {
            "requests": [
                {
                    "image": {"content": b64},
                    "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
                }
            ]
        }
        
        url = f"https://vision.googleapis.com/v1/images:annotate?key={API_KEY}"
        resp = requests.post(url, json=payload, timeout=90)
        resp.raise_for_status()
        result = resp.json()
        
        text = result["responses"][0].get("fullTextAnnotation", {}).get("text", "")
        
        if text:
            logger.info(f"Extracted {len(text)} chars from {filename} via Vision API")
            return text
        else:
            logger.warning(f"No text extracted from {filename}")
            return ""
            
    except Exception as e:
        logger.exception(f"Vision API OCR failed for {filename}: {e}")
        raise Exception(f"OCR failed: {str(e)}")


def ocr_pdf_with_vision(pdf_bytes: bytes, filename: str = "document.pdf") -> str:
    """Convert PDF pages to images using PyMuPDF and OCR them with Google Vision."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.error("PyMuPDF (fitz) not installed. Install with: pip install PyMuPDF")
        raise Exception("PyMuPDF not available for PDF processing")
    
    try:
        # Open PDF from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        all_text = []
        
        page_count = len(doc)
        logger.info(f"Processing PDF {filename} with {page_count} pages")
        
        for i, page in enumerate(doc, start=1):
            logger.info(f"OCR page {i}/{page_count}...")
            
            # Render page to PNG image bytes at 200 DPI
            pix = page.get_pixmap(dpi=200)
            image_bytes = pix.tobytes("png")
            
            # OCR the image
            text = ocr_image_with_vision(image_bytes, f"{filename}_page_{i}")
            
            if text:
                all_text.append(text)
        
        doc.close()
        full_text = "\n\n--- PAGE BREAK ---\n\n".join(all_text)
        
        logger.info(f"Successfully extracted {len(full_text)} chars from {page_count} pages of {filename}")
        return full_text
        
    except Exception as e:
        logger.exception(f"PDF OCR failed for {filename}: {e}")
        raise Exception(f"PDF processing failed: {str(e)}")


def extract_text_from_document(file_bytes: bytes, filename: str = "document") -> Tuple[str, bool]:
    """
    Extract text from PDF or image files using Google Vision API.
    Only supports PDF and image formats (JPG, PNG, etc.).
    Returns (text, success)
    """
    # Check API key
    API_KEY = os.getenv("GOOGLE_VISION_API_KEY")
    if not API_KEY:
        logger.error("GOOGLE_VISION_API_KEY not configured in environment")
        raise Exception("Google Vision API key not configured. Set GOOGLE_VISION_API_KEY environment variable.")
    
    # Validate file type
    if not is_pdf(file_bytes, filename) and not is_image(filename):
        logger.error(f"Unsupported file type: {filename}. Only PDF and image files are allowed.")
        raise Exception(f"Unsupported file type. Only PDF and image files (JPG, PNG, etc.) are allowed.")
    
    try:
        # Handle PDFs
        if is_pdf(file_bytes, filename):
            logger.info(f"Processing PDF file: {filename}")
            text = ocr_pdf_with_vision(file_bytes, filename)
            return text, True
        
        # Handle images
        elif is_image(filename):
            logger.info(f"Processing image file: {filename}")
            text = ocr_image_with_vision(file_bytes, filename)
            return text, True
        
        else:
            raise Exception("File type not recognized as PDF or image")
            
    except Exception as e:
        logger.exception(f"Text extraction failed for {filename}: {e}")
        raise Exception(f"Text extraction failed: {str(e)}")


# Legacy function for backward compatibility (now uses Google Vision)
def extract_text_from_pdf(path: str) -> Tuple[str, bool]:
    """
    Legacy function - reads file from path and extracts text using Google Vision.
    Returns (text, ocr_used) for backward compatibility.
    """
    try:
        with open(path, 'rb') as f:
            file_bytes = f.read()
        
        text, success = extract_text_from_document(file_bytes, os.path.basename(path))
        return text, success
        
    except Exception as e:
        logger.error(f"Failed to extract text from {path}: {e}")
        raise
