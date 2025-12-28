"""
Eligibility Processing Module (OpenAI GPT REST rewrite)

Handles OCR extraction, GPT summarization, key points extraction,
and scoring based on guidelines.

This version:
- Loads OPENAI_API_KEY and optional OPENAI_MODEL from a .env file
- Uses the OpenAI Responses REST endpoint (/v1/responses)
- Defaults to model "gpt-4o-mini" when OPENAI_MODEL not provided
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional, Literal
from pathlib import Path

import requests
from dotenv import load_dotenv

logger = logging.getLogger('eligibility_processor')

# Load .env (OPENAI_API_KEY, optional OPENAI_MODEL)
load_dotenv()
OPENAI_API_KEY: Optional[str] = os.getenv('OPENAI_API_KEY')
# Default model used here; override via OPENAI_MODEL in .env
OPENAI_MODEL: str = os.getenv('OPENAI_MODEL', 'gpt-5-mini')

# Chat completions endpoint
_OPENAI_BASE = "https://api.openai.com/v1"

# Gemini configuration (optional, enable switching)
GEMINI_API_KEY: Optional[str] = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL_ID: str = os.getenv('GEMINI_MODEL_ID', 'gemini-1.5-mini')
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1"

def _call_gpt(
    prompt: str,
    model: Optional[str] = "gpt-5-mini",
    temperature: float = 0.2,
    max_output_tokens: int = 1024,
    timeout: int = 90,
) -> Dict[str, Any]:
    """
    Internal helper: call OpenAI Responses API using gpt-5-mini
    and return parsed response JSON.

    Uses Authorization: Bearer <OPENAI_API_KEY>
    """

    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured in environment")

    endpoint = f"{_OPENAI_BASE}/responses"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}",
    }

    body = {
        "model": model,
        "input": prompt
    }

    logger.debug(
        "POST %s (model=%s) payload size=%d",
        endpoint,
        model,
        len(prompt),
    )

    try:
        resp = requests.post(
            endpoint,
            headers=headers,
            json=body,
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json()

    except requests.exceptions.HTTPError as e:
        try:
            error_detail = resp.json()
            logger.error("OpenAI API Error: %s", error_detail)
            raise RuntimeError(
                error_detail.get("error", {}).get("message", str(e))
            )
        except Exception:
            logger.error(
                "OpenAI API Error (status %s): %s",
                resp.status_code,
                resp.text,
            )
            raise RuntimeError(
                f"OpenAI API Error (status {resp.status_code}): {resp.text}"
            )


def _extract_text_from_gpt_response(data: Dict[str, Any]) -> str:
    """
    Pulls concatenated text from OpenAI Chat Completions API response.
    
    Expected format: data["choices"][0]["message"]["content"]
    Also handles alternative formats for robustness.

    Returns concatenated text or empty string if none found.
    """
    texts: List[str] = []

    # Primary Chat Completions format: choices[0].message.content
    choices = data.get("choices", [])
    if isinstance(choices, list):
        for choice in choices:
            if isinstance(choice, dict):
                msg = choice.get("message")
                if isinstance(msg, dict):
                    content = msg.get("content")
                    if isinstance(content, str):
                        texts.append(content)
                    elif isinstance(content, list):
                        for c in content:
                            if isinstance(c, dict) and c.get("type") == "text":
                                texts.append(c.get("text", ""))
                            elif isinstance(c, str):
                                texts.append(c)
                # Fallback: choice.text
                elif choice.get("text"):
                    texts.append(choice.get("text"))
    
    # Fallback: older/alternative shapes for compatibility
    output = data.get("output") or data.get("outputs")
    if isinstance(output, list):
        for item in output:
            if isinstance(item, dict):
                content = item.get("content") or item.get("contents")
                if isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict) and c.get("text"):
                            texts.append(c.get("text"))
                        elif isinstance(c, str):
                            texts.append(c)
                elif isinstance(content, str):
                    texts.append(content)
                if item.get("text"):
                    texts.append(item.get("text"))

    # Final fallback: top-level 'text' key
    if not texts and isinstance(data.get("text"), str):
        texts.append(data.get("text"))

    # join with a newline to preserve separation
    return "\n".join(t for t in texts if t).strip()


def _strip_markdown_json_block(s: str) -> str:
    """
    Removes markdown fences (```json or ``` ) if the model returned JSON wrapped in a code block.
    """
    s = s.strip()
    if s.startswith("```json"):
        s = s[len("```json"):].lstrip()
    if s.startswith("```"):
        s = s[3:].lstrip()
    if s.endswith("```"):
        s = s[:-3].rstrip()
    return s.strip()


def _call_gemini(prompt: str,
                 model: Optional[str] = None,
                 temperature: float = 0.2,
                 max_output_tokens: int = 1024,
                 timeout: int = 90) -> Dict[str, Any]:
    """
    Internal helper: call Gemini generateContent via REST and return parsed JSON.
    Uses x-goog-api-key header for authentication.
    """
    model = model or GEMINI_MODEL_ID
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured in environment")

    endpoint = f"{_GEMINI_BASE}/models/{model}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
    }
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
        },
    }
    logger.debug("POST %s (model=%s) payload size=%d", endpoint, model, len(prompt))
    resp = requests.post(endpoint, headers=headers, json=body, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def _extract_text_from_gemini_response(data: Dict[str, Any]) -> str:
    texts: List[str] = []
    for cand in data.get("candidates", []) or []:
        content = cand.get("content", {}) if isinstance(cand, dict) else {}
        parts = content.get("parts", []) if isinstance(content, dict) else []
        for p in parts:
            if isinstance(p, dict) and p.get("text"):
                texts.append(p.get("text"))
            elif isinstance(p, str):
                texts.append(p)
    return "\n".join(t for t in texts if t).strip()


def summarize_and_extract_keypoints(ocr_text: str, answers: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use GPT to summarize the uploaded document and extract key points.

    Returns dict with keys:
        'summary', 'key_points', 'medical_findings', 'work_relation_evidence',
        'injury_severity', 'treatment_details'
    """
    if not OPENAI_API_KEY:
        logger.warning("OpenAI API key not configured; returning placeholder summary")
        return {
            'summary': 'Document uploaded but AI analysis not configured',
            'key_points': [],
            'medical_findings': [],
            'work_relation_evidence': '',
            'injury_severity': '',
            'treatment_details': ''
        }

    prompt = f"""You are a medical-legal document analyst. Analyze the following medical document and questionnaire answers to extract critical information for a disability claim.

QUESTIONNAIRE ANSWERS:
{json.dumps(answers, indent=2)}

MEDICAL DOCUMENT TEXT:
{ocr_text[:20000]}

TASK:
Provide a comprehensive analysis in JSON format with these exact keys:

1. "summary": A concise 2-3 sentence summary of the document's main content
2. "key_points": Array of 5-10 most important facts from the document (medical findings, diagnoses, treatments, restrictions)
3. "medical_findings": Array of specific medical diagnoses, test results, or clinical findings mentioned
4. "work_relation_evidence": String describing any evidence of work-related injury or circumstances
5. "injury_severity": String describing the severity and impact of the injury (mild/moderate/severe with reasoning)
6. "treatment_details": String summarizing current and planned treatments, medications, procedures

Return ONLY valid JSON matching this schema:
{{
  "summary": "string",
  "key_points": ["string"],
  "medical_findings": ["string"],
  "work_relation_evidence": "string",
  "injury_severity": "string",
  "treatment_details": "string"
}}
"""

    try:
        logger.info("Calling OpenAI for document summarization and key points extraction (model=%s)", OPENAI_MODEL)
        raw = _call_gpt(prompt, temperature=0.2, max_output_tokens=1024)
        raw_text = _extract_text_from_gpt_response(raw)

        # Handle code fence wrapping and attempt to parse JSON
        raw_text = _strip_markdown_json_block(raw_text)

        result = json.loads(raw_text)
        # ensure keys exist
        result.setdefault('summary', '')
        result.setdefault('key_points', [])
        result.setdefault('medical_findings', [])
        result.setdefault('work_relation_evidence', '')
        result.setdefault('injury_severity', '')
        result.setdefault('treatment_details', '')
        logger.info("Successfully extracted summary and %d key points", len(result.get('key_points', [])))
        return result

    except json.JSONDecodeError as je:
        logger.exception("Failed to parse JSON from GPT summarization response")
        return {
            'summary': f'Error parsing AI output JSON: {str(je)}',
            'key_points': [],
            'medical_findings': [],
            'work_relation_evidence': '',
            'injury_severity': '',
            'treatment_details': ''
        }
    except Exception as e:
        logger.exception("Failed to call GPT for summarization")
        return {
            'summary': f'Error during AI analysis: {str(e)}',
            'key_points': [],
            'medical_findings': [],
            'work_relation_evidence': '',
            'injury_severity': '',
            'treatment_details': ''
        }


def score_eligibility_with_guidelines(
    answers: Dict[str, Any],
    document_analysis: Dict[str, Any],
    guidelines_text: str
) -> Dict[str, Any]:
    """
    Use GPT to score eligibility based on questionnaire answers, document analysis,
    and the eligibility.pdf guidelines.

    Returns:
        {
            'eligibility_score': int (0-100),
            'eligibility_status': str ('eligible'|'likely'|'needs_review'|'not_eligible'),
            'confidence': int (0-100),
            'reason_summary': str,
            'rule_references': List[Dict],
            'required_next_steps': List[str],
            'strengths': List[str],
            'weaknesses': List[str]
        }
    """
    if not OPENAI_API_KEY:
        logger.warning("OpenAI credentials not configured; returning default score")
        return {
            'eligibility_score': 50,
            'eligibility_status': 'needs_review',
            'confidence': 30,
            'reason_summary': 'AI scoring not configured - manual review required',
            'rule_references': [],
            'required_next_steps': ['Complete manual review'],
            'strengths': [],
            'weaknesses': []
        }

    prompt = f"""You are a disability claims eligibility expert. Analyze the following information and determine eligibility based on the official guidelines.

OFFICIAL GUIDELINES:
{guidelines_text[:20000]}

QUESTIONNAIRE ANSWERS:
{json.dumps(answers, indent=2)}

DOCUMENT ANALYSIS:
{json.dumps(document_analysis, indent=2)}

TASK:
Carefully review all information against the official guidelines and provide a comprehensive eligibility assessment.

Return ONLY valid JSON matching this schema:
{{
  "eligibility_score": integer (0-100, where 100 is highly eligible),
  "eligibility_status": "eligible" | "likely" | "needs_review" | "not_eligible",
  "confidence": integer (0-100, your confidence in this assessment),
  "reason_summary": "string (2-3 sentences explaining the decision)",
  "rule_references": [
    {{"section": "string", "quote": "string", "relevance": "string"}}
  ],
  "required_next_steps": ["array of specific actions user needs to take"],
  "strengths": ["array of points that support eligibility"],
  "weaknesses": ["array of concerns or missing elements"]
}}
"""

    try:
        logger.info("Calling OpenAI for eligibility scoring (model=%s)", OPENAI_MODEL)
        raw = _call_gpt(prompt, temperature=0.1, max_output_tokens=1024)
        raw_text = _extract_text_from_gpt_response(raw)
        raw_text = _strip_markdown_json_block(raw_text)

        result = json.loads(raw_text)
        print("------------>", result, "<------------")
        # set defaults to avoid KeyError downstream
        result.setdefault('eligibility_score', 0)
        result.setdefault('eligibility_status', 'needs_review')
        result.setdefault('confidence', 0)
        result.setdefault('reason_summary', '')
        result.setdefault('rule_references', [])
        result.setdefault('required_next_steps', [])
        result.setdefault('strengths', [])
        result.setdefault('weaknesses', [])
        logger.info("Eligibility scored: %s (%s/100)", result.get('eligibility_status'), result.get('eligibility_score'))
        return result

    except json.JSONDecodeError as je:
        logger.exception("Failed to parse JSON from GPT scoring response")
        return {
            'eligibility_score': 0,
            'eligibility_status': 'needs_review',
            'confidence': 0,
            'reason_summary': f'Error parsing AI output JSON: {str(je)}',
            'rule_references': [],
            'required_next_steps': ['Manual review required due to processing error'],
            'strengths': [],
            'weaknesses': ['Processing error occurred']
        }
    except Exception as e:
        logger.exception("Failed to call GPT for scoring")
        return {
            'eligibility_score': 0,
            'eligibility_status': 'needs_review',
            'confidence': 0,
            'reason_summary': f'Error during AI scoring: {str(e)}',
            'rule_references': [],
            'required_next_steps': ['Manual review required due to processing error'],
            'strengths': [],
            'weaknesses': ['Processing error occurred']
        }


def load_eligibility_guidelines() -> str:
    """Load the eligibility.pdf guidelines text (placeholder behavior)."""
    try:
        guidelines_path = Path(__file__).parent.parent / 'documents' / 'eligibility.pdf'
        if not guidelines_path.exists():
            logger.warning("Guidelines not found at %s", guidelines_path)
            return ""
        # If you later add PDF OCR extraction, replace this placeholder
        logger.info("Skipping eligibility.pdf OCR - using placeholder guidelines")
        return "General disability eligibility guidelines: Work-related injury, medical documentation, unable to work for extended period."
    except Exception:
        logger.exception("Error loading eligibility guidelines")
        return ""


def analyze_document_with_guidelines(
    ocr_text: str,
    guidelines_text: str,
    provider: Literal['gemini', 'gpt'] = 'gemini',
    extra_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Relevance-first analysis of OCR text against guidelines with provider switching (Gemini default, GPT optional).

    Returns required keys:
    - is_relevant (bool), relevance_score (0-100), relevance_reason (str), focus_excerpt (<=300 chars)
    - score (0-100 if relevant else 0), summary (str), statement (str), directions ([str])
    """
    extra_context = extra_context or {}

    prompt = f"""
You are an expert reviewer. First, determine if the OCR-extracted document is a relevant medical report for disability/clinical assessment. If irrelevant (e.g., receipts, unrelated letters, blank/garbled scans), clearly flag this and provide guidance. Then, if relevant, evaluate the document against the GUIDELINES.

Return ONLY valid JSON with the following keys:
- is_relevant: boolean
- relevance_score: integer (0-100)
- relevance_reason: string (1-3 sentences explaining why relevant/irrelevant)
- focus_excerpt: short excerpt (<=300 chars) that supports your determination; if irrelevant, pick the most indicative excerpt
- score: integer (0-100) overall guideline compliance/quality score (0 if irrelevant)
- summary: string concise narrative (if irrelevant, summarize what it appears to be)
- statement: user-facing statement of result; if irrelevant, tell user what to upload instead
- directions: array of concrete next steps for the user; if irrelevant, include exact document types needed (e.g., discharge summary, imaging report, specialist note)

GUIDELINES:
{guidelines_text[:12000]}

OCR_DOCUMENT_TEXT:
{ocr_text[:12000]}

CONTEXT:
{json.dumps(extra_context, ensure_ascii=False)}

SCHEMA:
{{
  "is_relevant": true,
  "relevance_score": 0,
  "relevance_reason": "string",
  "focus_excerpt": "string",
  "score": 0,
  "summary": "string",
  "statement": "string",
  "directions": ["string"]
}}
"""

    try:
        if provider == 'gemini':
            logger.info("Calling Gemini for doc+guidelines analysis (model=%s)", GEMINI_MODEL_ID)
            raw = _call_gemini(prompt, temperature=0.2, max_output_tokens=1024)
            raw_text = _extract_text_from_gemini_response(raw)
        else:
            logger.info("Calling OpenAI for doc+guidelines analysis (model=%s)", OPENAI_MODEL)
            raw = _call_gpt(prompt, temperature=0.2, max_output_tokens=1024)
            raw_text = _extract_text_from_gpt_response(raw)

        raw_text = _strip_markdown_json_block(raw_text)
        result = json.loads(raw_text)

        # Validate and fill with heuristic defaults when missing
        required_keys = (
            'is_relevant', 'relevance_score', 'relevance_reason', 'focus_excerpt',
            'score', 'summary', 'statement', 'directions'
        )
        missing = [k for k in required_keys if k not in result]
        if missing:
            result = {**result, **_heuristic_relevance_defaults(ocr_text)}

        # Normalize
        result['is_relevant'] = bool(result.get('is_relevant'))
        try:
            result['relevance_score'] = int(result.get('relevance_score', 0))
        except Exception:
            result['relevance_score'] = 0
        result['relevance_reason'] = str(result.get('relevance_reason', ''))
        result['focus_excerpt'] = str(result.get('focus_excerpt', ''))[:300]
        try:
            result['score'] = int(result.get('score', 0)) if result['is_relevant'] else 0
        except Exception:
            result['score'] = 0
        result['summary'] = str(result.get('summary', ''))
        result['statement'] = str(result.get('statement', ''))
        dirs = result.get('directions') or []
        if not isinstance(dirs, list):
            dirs = [str(dirs)]
        result['directions'] = [str(d) for d in dirs][:10]

        if not result['is_relevant'] and not result['directions']:
            result['directions'] = [
                'Upload a relevant medical report such as a discharge summary, specialist consultation, imaging report, or lab results with physician interpretation.',
                'Ensure the document includes patient identifiers, dates, objective findings, and clinician signature/details.'
            ]
        return result
    except Exception as e:
        logger.exception('Document-guidelines analysis failed')
        return {
            'score': 50,
            'summary': f'Analysis error: {str(e)}',
            'statement': 'Unable to fully validate the document against guidelines.',
            'directions': ['Verify approvals, objective evidence, and chain-of-custody records as per mandatory requirements.'],
            'is_relevant': False,
            'relevance_score': 0,
            'relevance_reason': 'Processing error occurred while determining relevance',
            'focus_excerpt': (ocr_text or '')[:200]
        }


def _heuristic_relevance_defaults(ocr_text: str) -> Dict[str, Any]:
    """
    Fallback heuristic to determine medical relevance when AI fails.
    Uses strict keyword matching for legal evidence requirements.
    """
    try:
        text = (ocr_text or '').lower()
        
        # Strong medical evidence indicators
        strong_medical = [
            'discharge summary', 'diagnosis:', 'diagnosed with', 'clinical findings',
            'physical examination', 'mri shows', 'ct scan reveals', 'x-ray demonstrates',
            'pathology report', 'lab results', 'physician notes', 'surgical report',
            'specialist evaluation', 'treatment plan', 'functional impairment'
        ]
        
        # General medical terms
        medical_terms = [
            'patient', 'physician', 'doctor', 'hospital', 'clinic', 'medical',
            'diagnosis', 'treatment', 'medication', 'symptom', 'examination',
            'imaging', 'mri', 'ct', 'x-ray', 'lab', 'pathology', 'biopsy',
            'specialist', 'therapy', 'orthopedic', 'neurology', 'cardiology'
        ]
        
        # Non-medical/administrative indicators
        non_medical = [
            'receipt', 'invoice', 'payment', 'total:', 'subtotal', 'tax',
            'thank you for your business', 'credit card', 'visa', 'mastercard',
            'terms and conditions', 'privacy policy', 'appointment card'
        ]
        
        strong_hits = sum(1 for term in strong_medical if term in text)
        medical_hits = sum(1 for term in medical_terms if term in text)
        non_medical_hits = sum(1 for term in non_medical if term in text)
        
        # Strict relevance: need strong evidence or many medical terms, and no administrative keywords
        is_relevant = (strong_hits >= 2 or medical_hits >= 5) and non_medical_hits == 0
        
        if is_relevant:
            score = min(100, 50 + strong_hits * 12 + medical_hits * 3)
            reason = f'Contains {strong_hits} strong medical indicators and {medical_hits} medical keywords'
            statement = '✓ Document appears to contain medical evidence that may support disability claim.'
            doc_type = 'medical_report'
            directions = [
                'Document preliminary accepted based on keyword analysis',
                'Proceed with questionnaire submission',
                'Ensure answers align with document content'
            ]
            summary = f'Medical document with {strong_hits} clinical findings'
        else:
            score = max(0, 15 - non_medical_hits * 5)
            if non_medical_hits > 0:
                reason = f'Billing/receipt document without medical evidence'
                doc_type = 'receipt'
                summary = 'Payment receipt'
            else:
                reason = f'Lacks required medical evidence and clinical findings'
                doc_type = 'other'
                summary = 'Non-medical document'
            statement = '✗ Document does not appear to be valid medical evidence for a disability claim.'
            directions = [
                'Please upload valid medical documentation:',
                '• Hospital discharge summary with diagnosis and treatment',
                '• Physician report with clinical examination findings',
                '• Diagnostic test results (MRI, CT, X-ray) with interpretation',
                '• Specialist evaluation with medical opinion',
                'Receipts and billing statements are NOT valid medical evidence'
            ]
        
        return {
            'is_relevant': is_relevant,
            'relevance_score': score,
            'relevance_reason': reason,
            'document_summary': summary,
            'focus_excerpt': (ocr_text or '').strip()[:300],
            'document_type': doc_type,
            'statement': statement,
            'directions': directions
        }
    except Exception:
        return {
            'is_relevant': False,
            'relevance_score': 0,
            'relevance_reason': 'Heuristic relevance check failed',
            'document_summary': 'Unable to analyze document',
            'focus_excerpt': (ocr_text or '')[:300],
            'document_type': 'unknown',
            'statement': 'Unable to verify document type. Please upload a clear medical document.',
            'directions': ['Upload a clear, readable medical document', 'Ensure document contains clinical information']
        }


def check_document_relevance(
    ocr_text: str,
    provider: Literal['gemini', 'gpt'] = 'gpt'
) -> Dict[str, Any]:
    """
    STEP 1: Check if uploaded document is a relevant medical document.
    
    Returns:
        {
            'is_relevant': bool,
            'relevance_score': int (0-100),
            'relevance_reason': str,
            'focus_excerpt': str (<=300 chars),
            'document_type': str (e.g., 'medical_report', 'discharge_summary', 'receipt', 'blank'),
            'statement': str (user-facing message),
            'directions': [str] (what user should do if irrelevant)
        }
    """
    prompt = f"""You are a LAWYER specializing in disability claims. You are reviewing a document submitted by your client to determine if it contains VALID MEDICAL EVIDENCE that can support their disability claim case.

YOU MUST BE STRICT. Your client's claim depends on having proper medical documentation that meets legal requirements.

DISABILITY CLAIM GUIDELINES CONTEXT:
- Claims require: written complete documentation, objective medical evidence (imaging, lab tests, pathology)
- Must have: specialist reports, clinical examination findings, documented functional impairments
- Must have: physician notes with diagnoses, treatment records, work restrictions
- Must have: traceable medical records with dates, signatures, and objective test results

VALID MEDICAL EVIDENCE (Accept these):
✓ Hospital discharge summaries with diagnosis, treatment, prognosis
✓ Physician reports with clinical examination findings and medical opinions
✓ Specialist consultation notes (orthopedic, neurologic, cardiac, psychiatric, etc.)
✓ Psychological/neuropsychological evaluation reports with test results and diagnoses
✓ Mental health assessments with clinical findings (depression, anxiety, ADHD, PTSD, etc.)
✓ Cognitive/learning disability evaluations with standardized test scores
✓ Imaging reports (MRI, CT, X-ray) with radiologist interpretation and findings
✓ Laboratory or pathology results WITH physician interpretation
✓ Surgical/operative reports with procedure details
✓ Physical therapy or rehabilitation reports with functional assessments
✓ EMG/nerve conduction studies, EEG reports with clinical correlation
✓ Treatment records documenting ongoing care and response
✓ Psychiatric evaluations with DSM diagnoses and functional assessments

INVALID DOCUMENTS (Reject these - NOT legal evidence):
✗ Receipts, invoices, billing statements (even from hospitals/clinics)
✗ Appointment cards, scheduling notices, reminders
✗ Insurance authorization forms or correspondence
✗ Blank or nearly blank pages (< 50 meaningful words)
✗ Pharmacy prescription labels without clinical context
✗ Patient education materials or general health information
✗ Documents without patient name, dates, or provider information
✗ Illegible or garbled scans that cannot be read

DOCUMENT TO ANALYZE:
---
{ocr_text[:15000]}
---

AS THE CLIENT'S LAWYER, evaluate this document:

1. Does it contain objective medical evidence? (diagnoses, test results, clinical findings)
2. Does it have proper documentation? (provider name, dates, signatures)
3. Can it support a disability claim legally?
4. If NOT valid, what specific type of document IS needed?

Return ONLY valid JSON:
{{
  "is_relevant": boolean (TRUE only if contains valid medical evidence for legal claim),
  "relevance_score": integer (0-30 for non-medical; 40-69 for administrative/weak; 70-100 for strong medical evidence),
  "relevance_reason": "ONE clear sentence explaining why rejected/accepted (max 15 words) - e.g. 'This is a billing receipt without any medical findings' or 'Contains diagnosis and clinical examination results'",
  "document_summary": "if rejected: 2-4 words describing what it is (e.g. 'Payment receipt', 'Blank scan', 'Appointment card'); if RELEVANT MEDICAL DOCUMENT: COMPREHENSIVE DETAILED SUMMARY (200-500 words) that captures EVERY important detail including: 1) ALL diagnoses/conditions mentioned with severity/type, 2) ALL test results with specific scores/values/findings, 3) Clinical observations and examination findings, 4) Functional limitations and work restrictions documented, 5) Treatment plan and medications with dosages, 6) Provider credentials and type of evaluation, 7) Patient history relevant to claims, 8) Prognosis and recommendations. NEVER summarize medical documents in less than 100 words - include EVERY medical fact that could support the disability claim.",
  "key_points": ["if relevant: array of 8-20 SPECIFIC medical facts extracted from document - include EVERY diagnosis, test result, medication, functional limitation, work restriction, clinical finding. Examples: 'Diagnosed with Major Depressive Disorder, Severe, Recurrent', 'Beck Depression Inventory score: 32 (severe range)', 'MRI shows disc herniation L4-L5 with nerve root compression', 'Unable to sit for more than 30 minutes per physician note', 'Prescribed Lexapro 20mg daily for depression', 'Processing speed 5th percentile on WAIS-IV', 'Patient reports difficulty concentrating, completing tasks', 'Orthopedist recommends no lifting over 10 lbs'. If not relevant: empty array []"],
  "focus_excerpt": "most critical section showing document type (100-300 chars)",
  "document_type": "medical_report|discharge_summary|specialist_evaluation|psychological_evaluation|neuropsych_evaluation|psychiatric_assessment|diagnostic_report|surgical_report|receipt|blank_page|administrative|other",
  "statement": "clear message to client about whether this document supports their legal case",
  "directions": ["if rejected: specific guidance on what medical documents they need to obtain; if accepted: note strengths"]
}}

CRITICAL REQUIREMENTS:

FOR REJECTED DOCUMENTS:
- relevance_reason: ONE sentence max 15 words explaining the rejection (e.g., "Receipt without clinical findings", "Administrative form lacking medical evidence")
- document_summary: 2-4 words only (e.g., "Billing receipt", "Blank page", "Insurance form")
- key_points: empty array []

FOR ACCEPTED MEDICAL DOCUMENTS (THIS IS CRITICAL):
- document_summary: MUST BE 200-500 WORDS MINIMUM. Extract and include EVERY medical detail: all diagnoses (with subtypes/severity), all test results (with scores/values), all medications (with dosages), all functional limitations, all work restrictions, all clinical findings, provider type, evaluation type, dates, history. DO NOT write generic summaries like "Learning disability evaluation report" - this is UNACCEPTABLE. You must extract and list EVERY specific medical finding.
- key_points: MUST have 8-20 items minimum. Include EVERY diagnosis, EVERY test score, EVERY medication, EVERY limitation, EVERY clinical observation mentioned in the document.

BE STRICT. Only accept documents with real medical evidence. Reject receipts and administrative paperwork."""

    try:
        logger.info("="*80)
        logger.info("AI DOCUMENT RELEVANCE CHECK")
        logger.info(f"Provider: {provider}")
        logger.info(f"OCR Text Length: {len(ocr_text)} chars")
        logger.info(f"OCR Text Sample (first 500 chars):\n{ocr_text[:500]}")
        logger.info("-"*80)
        
        if provider == 'gemini':
            logger.info(f"Calling Gemini API (model={GEMINI_MODEL_ID})")
            raw = _call_gemini(prompt, temperature=0.1, max_output_tokens=2000)
            raw_text = _extract_text_from_gemini_response(raw)
        else:
            logger.info(f"Calling OpenAI API (model={OPENAI_MODEL})")
            raw = _call_gpt(prompt, temperature=0.1, max_output_tokens=2000)
            raw_text = _extract_text_from_gpt_response(raw)

        logger.info("-"*80)
        logger.info(f"AI Raw Response:\n{raw_text[:1000]}")
        logger.info("-"*80)
        
        raw_text = _strip_markdown_json_block(raw_text)
        result = json.loads(raw_text)
        
        logger.info("AI Response Parsed Successfully")
        logger.info(f"  is_relevant: {result.get('is_relevant')}")
        logger.info(f"  relevance_score: {result.get('relevance_score')}")
        logger.info(f"  document_type: {result.get('document_type')}")
        logger.info(f"  document_summary length: {len(result.get('document_summary', ''))} chars")
        logger.info(f"  document_summary: {result.get('document_summary', '')[:300]}...")
        logger.info(f"  key_points count: {len(result.get('key_points', []))}")
        logger.info(f"  key_points: {result.get('key_points', [])}")
        logger.info("="*80)

        # Normalize fields
        result['is_relevant'] = bool(result.get('is_relevant', False))
        result['relevance_score'] = int(result.get('relevance_score', 0))
        result['relevance_reason'] = str(result.get('relevance_reason', ''))[:150]  # Truncate to ensure brevity
        result['document_summary'] = str(result.get('document_summary', ''))[:5000]  # Allow comprehensive medical summaries (up to 5000 chars)
        result['focus_excerpt'] = str(result.get('focus_excerpt', ''))[:500]
        result['document_type'] = str(result.get('document_type', 'unknown'))
        result['statement'] = str(result.get('statement', ''))
        
        # Normalize key_points array
        key_points = result.get('key_points', [])
        if not isinstance(key_points, list):
            key_points = []
        result['key_points'] = [str(kp).strip() for kp in key_points if kp][:10]  # Max 10 key points
        
        dirs = result.get('directions', [])
        if not isinstance(dirs, list):
            dirs = [str(dirs)]
        result['directions'] = [str(d) for d in dirs][:10]

        # Add default guidance if irrelevant
        if not result['is_relevant'] and not result['directions']:
            result['directions'] = [
                'Please upload a MEDICAL DOCUMENT such as:',
                '• Discharge summary from hospital',
                '• Specialist consultation note',
                '• Imaging report (X-ray, MRI, CT scan) with radiologist interpretation',
                '• Lab results with physician assessment',
                '• Treatment records or medical chart notes',
                'Ensure document includes patient name, dates, clinical findings, and provider signature.'
            ]

        return result

    except Exception as e:
        logger.exception('Document relevance check failed')
        # Fallback to heuristic
        heuristic = _heuristic_relevance_defaults(ocr_text)
        return {
            'is_relevant': heuristic.get('is_relevant', False),
            'relevance_score': heuristic.get('relevance_score', 0),
            'relevance_reason': heuristic.get('relevance_reason', f'AI check failed: {str(e)}'),
            'focus_excerpt': heuristic.get('focus_excerpt', ''),
            'document_type': 'unknown',
            'statement': 'Unable to fully verify document type.',
            'directions': [
                'Please upload a clear medical document.',
                'Ensure document is readable and contains clinical information.'
            ]
        }


def analyze_questionnaire_with_guidelines(
    answers: Dict[str, Any],
    guidelines_text: str,
    provider: Literal['gemini', 'gpt'] = 'gemini',
    document_summary: Optional[str] = None
) -> Dict[str, Any]:
    """
    STEP 2: Analyze user's questionnaire answers against the official guidelines.
    This happens AFTER document relevance is confirmed.
    Acts as a lawyer building a case for the client's disability claim.
    
    Args:
        answers: Questionnaire responses
        guidelines_text: Official disability claim guidelines
        provider: AI provider ('gemini' or 'gpt')
        document_summary: Optional summary from validated medical document
    
    Returns:
        {
            'eligibility_score': int (0-100),
            'eligibility_status': str ('approved'|'pending'|'denied'|'needs_review'),
            'confidence': int (0-100),
            'reason_summary': str,
            'rule_references': [{'section': str, 'quote': str, 'relevance': str}],
            'required_next_steps': [str],
            'strengths': [str],
            'weaknesses': [str],
            'missing_information': [str]
        }
    """
    # Include document summary if provided
    document_context = ""
    if document_summary:
        document_context = f"""

VALIDATED MEDICAL DOCUMENT SUMMARY:
{document_summary}

IMPORTANT: Cross-reference the questionnaire answers with this medical document.
The answers should align with the medical evidence. Flag any discrepancies between what
the client states and what the medical record shows.
"""
    
    prompt = f"""You are a LAWYER specializing in disability claims. You are evaluating your client's case to determine 
eligibility for disability benefits. Your job is to:

1. Build the strongest possible legal case for your client
2. Identify weaknesses that could jeopardize the claim
3. Advise what additional evidence is needed
4. Provide a realistic assessment based on official guidelines

OFFICIAL DISABILITY CLAIM GUIDELINES:
---
{guidelines_text[:18000]}
---

KEY LEGAL REQUIREMENTS (from guidelines):
✓ Written, complete documentation with objective medical evidence
✓ Specialist reports and diagnostic tests (imaging, lab, pathology, EMG, etc.)
✓ Full medical dossier documenting functional impairments and work restrictions
✓ Clinical examination findings with documented severity/classification
✓ Traceable medical records with proper chain-of-custody
✓ Work-related injury must be clearly established and documented
✓ Formal impairment ratings from qualified specialists
✓ Treatment records showing ongoing care and response
✓ NO verbal-only reports - all evidence must be written and signed{document_context}

CLIENT'S QUESTIONNAIRE ANSWERS:
---
{json.dumps(answers, indent=2)}
---

YOUR LEGAL ASSESSMENT TASK:

As the client's disability claims lawyer, evaluate this case:

1. CASE STRENGTH: Does the submission meet mandatory guideline requirements?
2. EVIDENCE QUALITY: Is there sufficient objective medical evidence documented?
3. WEAKNESSES: What gaps or issues could lead to claim denial?
4. LEGAL STRATEGY: What additional documentation/actions will strengthen the case?
5. REALISTIC OUTCOME: Based on current evidence, what is the likely outcome?

CRITICAL CONSIDERATIONS:
- Must have: written medical documentation (not just verbal reports)
- Must have: objective tests (imaging, labs, pathology) - not just symptoms
- Must have: specialist evaluation if condition requires it
- Must have: work-related injury clearly documented
- Must have: functional impairment ratings
- Red flags: Missing documentation, inconsistencies, lack of objective evidence

Return ONLY valid JSON:
{{
  "eligibility_score": integer (0-100, realistic score based on legal requirements - be honest about weaknesses),
  "eligibility_status": "approved" | "pending" | "denied" | "needs_review",
  "confidence": integer (0-100, confidence in assessment based on available evidence),
  "reason_summary": "comprehensive legal explanation of case strength and eligibility determination (3-5 sentences)",
  "rule_references": [
    {{
      "section": "specific guideline section name",
      "quote": "exact quote from guidelines",
      "relevance": "how this rule applies to client's case"
    }}
  ],
  "required_next_steps": ["specific legal/medical actions client MUST take to strengthen case or meet requirements"],
  "strengths": ["positive aspects that support the claim - be specific with evidence"],
  "weaknesses": ["critical issues that could weaken or jeopardize the claim - be honest"],
  "missing_information": ["specific documents, tests, or evidence still needed for a complete case"]
}}

BE THOROUGH and LEGALLY RIGOROUS. Your client's claim depends on your assessment."""

    try:
        if provider == 'gemini':
            logger.info("Calling Gemini for questionnaire analysis (model=%s)", GEMINI_MODEL_ID)
            raw = _call_gemini(prompt, temperature=0.1, max_output_tokens=1200)
            raw_text = _extract_text_from_gemini_response(raw)
        else:
            logger.info("Calling OpenAI for questionnaire analysis (model=%s)", OPENAI_MODEL)
            raw = _call_gpt(prompt, temperature=0.1, max_output_tokens=1200)
            raw_text = _extract_text_from_gpt_response(raw)

        raw_text = _strip_markdown_json_block(raw_text)
        result = json.loads(raw_text)

        # Set defaults
        result.setdefault('eligibility_score', 0)
        result.setdefault('eligibility_status', 'needs_review')
        result.setdefault('confidence', 0)
        result.setdefault('reason_summary', '')
        result.setdefault('rule_references', [])
        result.setdefault('required_next_steps', [])
        result.setdefault('strengths', [])
        result.setdefault('weaknesses', [])
        result.setdefault('missing_information', [])

        logger.info("Questionnaire analyzed: %s (%d/100)", 
                   result.get('eligibility_status'), 
                   result.get('eligibility_score'))
        return result

    except json.JSONDecodeError as je:
        logger.exception("Failed to parse JSON from questionnaire analysis")
        return {
            'eligibility_score': 0,
            'eligibility_status': 'needs_review',
            'confidence': 0,
            'reason_summary': f'Error parsing AI response: {str(je)}',
            'rule_references': [],
            'required_next_steps': ['Manual review required due to processing error'],
            'strengths': [],
            'weaknesses': ['Processing error occurred'],
            'missing_information': []
        }
    except Exception as e:
        logger.exception("Failed to analyze questionnaire")
        return {
            'eligibility_score': 0,
            'eligibility_status': 'needs_review',
            'confidence': 0,
            'reason_summary': f'Error during analysis: {str(e)}',
            'rule_references': [],
            'required_next_steps': ['Manual review required due to processing error'],
            'strengths': [],
            'weaknesses': ['Processing error occurred'],
            'missing_information': []
        }
