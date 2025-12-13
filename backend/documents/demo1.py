"""
Usage:
    python summarize_guidelines_pdf.py your_guidelines.pdf

Requires:
    pip install pdfminer.six openai python-dotenv
And set:
    export OPENAI_API_KEY="sk-..."   # or use a .env file
"""

import os
import sys
import time
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from pdfminer.high_level import extract_text
from openai import OpenAI

# Load environment variables from .env if present
load_dotenv()

OPENAI_API_KEY = "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"
MODEL = "gpt-5-mini"

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Put it in environment or .env file.")

client = OpenAI(api_key=OPENAI_API_KEY)


# ------------- Helpers -------------
def normalize_text(text: str) -> str:
    """Clean and normalize extracted PDF text for better chunking."""
    if not text:
        return ""
    text = text.replace("\r", "\n")
    # Collapse 3+ newlines to 2
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    # Collapse multiple spaces
    while "  " in text:
        text = text.replace("  ", " ")
    return text.strip()


def chunk_text(text: str, max_chunk_chars: int = 8000) -> List[str]:
    """
    Split large text into chunks that are safe to send to the model.
    Uses simple character-based chunking with a preference for splitting at paragraph boundaries.
    """
    chunks = []
    start = 0
    length = len(text)

    while start < length:
        end = min(start + max_chunk_chars, length)
        if end == length:
            chunks.append(text[start:end])
            break

        # Try splitting on a double newline first, then single newline, else hard cut
        split_pos = text.rfind("\n\n", start, end)
        if split_pos == -1:
            split_pos = text.rfind("\n", start, end)
        if split_pos == -1 or split_pos <= start + 1000:
            split_pos = end

        chunks.append(text[start:split_pos])
        start = split_pos

    return chunks


def extract_text_from_response(response) -> str:
    """
    Robustly extract plain text from the Responses API object, without assuming
    a specific nested shape. This avoids 'NoneType is not subscriptable' crashes.
    """
    try:
        # Most common shape: response.output -> list; each has .content -> list
        output = getattr(response, "output", None)
        if output:
            for part in output:
                content_list = getattr(part, "content", None)
                if not content_list:
                    continue
                for c in content_list:
                    # New-style: type == "output_text"
                    ctype = getattr(c, "type", None)
                    if ctype == "output_text":
                        text_obj = getattr(c, "text", None)
                        if text_obj is not None:
                            value = getattr(text_obj, "value", None)
                            if isinstance(value, str) and value.strip():
                                return value
        # Fallback: some SDKs have a convenience string
        maybe_text = getattr(response, "output_text", None)
        if isinstance(maybe_text, str) and maybe_text.strip():
            return maybe_text

        # Last resort: stringified object
        return str(response)

    except Exception as e:
        print(f"[WARN] Failed to extract text from response: {e}")
        return str(response)


def call_gpt_with_retry(prompt: str, max_retries: int = 3, delay: float = 2.0) -> str:
    """
    Call the OpenAI Responses API with basic retries to handle transient
    network / SSL issues.
    """
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            response = client.responses.create(
                model=MODEL,
                input=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )
            return extract_text_from_response(response)
        except Exception as e:
            last_err = e
            print(f"[WARN] OpenAI request failed (attempt {attempt}/{max_retries}): {e}")
            if attempt < max_retries:
                time.sleep(delay)
    # If we get here, all retries failed
    raise last_err


def summarize_chunk(chunk: str, index: int, total: int) -> str:
    """
    Summarize a single chunk of the guidelines PDF as a structured, guidelines-style summary.
    """
    prompt = f"""
You are an expert at summarizing long POLICY / GUIDELINE documents into clear, actionable instructions.

You are summarizing PART {index + 1} of {total} of a larger guidelines document.

SOURCE TEXT (raw; may contain layout noise, page numbers, etc.):
---
{chunk}
---

TASK:
1. Ignore layout noise, repeated headers/footers, and page numbers.
2. Extract the IMPORTANT rules, processes, definitions, roles, and conditions.
3. Use bullet points and short paragraphs.
4. Preserve distinctions like:
   - MUST vs SHOULD vs MAY
   - Different roles (e.g., Admin, Staff, Reviewer, User, Client)
   - Exceptions, thresholds, approvals, deadlines.

Return your answer in this format:

SECTION SUMMARY:
- Short paragraph summarizing this part.

KEY RULES:
- Bullet list of concrete rules/instructions.

ROLES & RESPONSIBILITIES:
- Role → responsibilities (bullet list).

EXCEPTIONS / SPECIAL CASES:
- Bullet list of any exceptions, conditions, or warnings.

Do NOT mention "part X of Y" in your actual output text.
""".strip()

    text = call_gpt_with_retry(prompt)
    return text


def combine_chunk_summaries(chunk_summaries: List[str]) -> str:
    """
    Combine all the chunk-level summaries into a final, clean guidelines summary.
    """
    combined = "\n\n".join(
        f"### SECTION {i+1}\n{summary}"
        for i, summary in enumerate(chunk_summaries)
    )

    prompt = f"""
You are summarizing a long GUIDELINES / POLICY document that has already been pre-summarized into sections.

Here are the section-level summaries:

---
{combined}
---

Now produce ONE FINAL, well-structured guidelines summary.

Your output MUST follow exactly this structure (Markdown headings):

# Overview
- 2–4 bullet points describing the purpose and scope of these guidelines.

# Key Principles
- Bullet list of the most important high-level principles.

# Roles & Responsibilities
- For each role:
  - Role Name:
    - Responsibility 1
    - Responsibility 2
    - ...

# Processes / Workflows
- For each major process:
  - Process Name:
    - Step 1: ...
    - Step 2: ...
    - ...

# Mandatory Requirements (Must-Do)
- Bullet list of mandatory requirements.

# Prohibited Actions (Must-Not)
- Bullet list of what is prohibited or strongly discouraged.

# Exceptions / Edge Cases
- Bullet list summarizing exceptions, special cases, thresholds, or approval requirements.

# Practical Checklist
- A concise checklist someone can use to comply with these guidelines day-to-day.

Rules:
- Do NOT invent new rules that are not supported by the summaries.
- Be clear, concrete, and practical.
""".strip()

    text = call_gpt_with_retry(prompt)
    return text


def summarize_pdf_file(pdf_path: Path) -> str:
    """
    Orchestrate:
    - Extract text from PDF.
    - Chunk the text.
    - Summarize each chunk.
    - Combine into final guidelines summary.
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    print(f"[INFO] Extracting text from: {pdf_path.name}")
    raw_text = extract_text(str(pdf_path))  # uses pdfminer.six
    text = normalize_text(raw_text)

    if not text or len(text) < 50:
        raise ValueError("PDF appears to contain little or no extractable text.")

    print(f"[INFO] Extracted {len(text)} characters from PDF.")
    chunks = chunk_text(text)
    print(f"[INFO] Split into {len(chunks)} chunk(s).")

    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        print(f"[INFO] Summarizing chunk {i + 1}/{len(chunks)}...")
        summary = summarize_chunk(chunk, i, len(chunks))
        chunk_summaries.append(summary)

    print("[INFO] Combining chunk summaries into final guidelines summary...")
    final_summary = combine_chunk_summaries(chunk_summaries)
    return final_summary


def main():
    if len(sys.argv) < 2:
        print("Usage: python summarize_guidelines_pdf.py your_guidelines.pdf")
        sys.exit(1)

    pdf_filename = sys.argv[1]
    pdf_path = Path(pdf_filename)

    try:
        summary = summarize_pdf_file(pdf_path)

        # Save to .txt file next to the PDF
        out_path = pdf_path.with_suffix(".summary.txt")
        out_path.write_text(summary, encoding="utf-8")

        print(f"[SUCCESS] Summary saved to: {out_path}")
    except Exception as e:
        print(f"[ERROR] Failed to summarize PDF: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
