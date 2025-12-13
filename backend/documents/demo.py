import io
import base64
import requests
import fitz  # PyMuPDF
import sys
from pathlib import Path

# ================== CONFIG ==================
API_KEY = "AIzaSyCOaS5C7UC1CZbrxkx9J-SM7TYPxUa3hqQ"
# ============================================

VISION_URL = f"https://vision.googleapis.com/v1/images:annotate?key={API_KEY}"


def ocr_image(image_bytes: bytes) -> str:
    """Send image bytes to Google Vision OCR via API key."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "requests": [
            {
                "image": {"content": b64},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
            }
        ]
    }

    r = requests.post(VISION_URL, json=payload)
    result = r.json()

    try:
        return result["responses"][0]["fullTextAnnotation"]["text"]
    except Exception:
        return ""


def ocr_pdf(pdf_path: str) -> str:
    """Convert PDF pages to images using PyMuPDF and OCR them."""
    doc = fitz.open(pdf_path)
    all_text = []

    for i, page in enumerate(doc, start=1):
        print(f"OCR page {i}...")

        # Render page → PNG image bytes
        pix = page.get_pixmap(dpi=200)
        image_bytes = pix.tobytes("png")

        # OCR
        text = ocr_image(image_bytes)
        print(text + "\n------------>------------\n")
        all_text.append(text)

    return "\n".join(all_text)


def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr_pdf_api_key.py <pdf_filename>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).resolve()

    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    if API_KEY == "YOUR_API_KEY_HERE":
        print("Please insert your API_KEY at the top of the script.")
        sys.exit(1)

    text = ocr_pdf(str(pdf_path))

    # Save result
    output = pdf_path.with_suffix(".txt")
    with open(output, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"\nFull OCR text saved to: {output}")


if __name__ == "__main__":
    main()
