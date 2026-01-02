"""
Eligibility Processing Module (OpenAI GPT REST rewrite)

Handles OCR extraction, GPT summarization, key points extraction,
and scoring based on BTL guidelines from btl.json.

This version:
- Loads OPENAI_API_KEY and optional OPENAI_MODEL from a .env file
- Uses the OpenAI Responses REST endpoint (/v1/responses)
- Defaults to model "gpt-5-nano" when OPENAI_MODEL not provided
- Integrates BTL guidelines from btl.json for enhanced analysis
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional, Literal
from pathlib import Path

import requests
from dotenv import load_dotenv

logger = logging.getLogger('eligibility_processor')

# ------------------------------------------------------------------
# BTL Guidelines Helper
# ------------------------------------------------------------------

def load_btl_guidelines() -> List[Dict[str, Any]]:
    """Load BTL guidelines from btl.json"""
    btl_path = Path(__file__).parent / "btl.json"
    try:
        with open(btl_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data
    except Exception as e:
        logger.error(f"[BTL] Failed to load btl.json: {e}")
        return []

def get_btl_content_by_topics(topic_ids: List[str] = None) -> str:
    """Extract BTL content for specified topic IDs.
    If topic_ids is None or empty, return ALL BTL guidelines.
    """
    if topic_ids is None:
        topic_ids = []
    
    btl_data = load_btl_guidelines()
    
    # If no specific topics requested, use all
    if not topic_ids:
        topic_ids = [topic.get('topic_id') for topic in btl_data if topic.get('topic_id')]
        logger.warning(f"[BTL_SELECT] No topics specified - using ALL {len(topic_ids)} topics")
    else:
        logger.warning(f"[BTL_SELECT] Selecting {len(topic_ids)} specific topics: {topic_ids}")
    
    relevant_content = []
    matched_topics = []
    
    for topic in btl_data:
        if topic.get("topic_id") in topic_ids:
            topic_name = topic.get('topic_name', '')
            matched_topics.append(f"{topic.get('topic_id')}:{topic_name}")
            
            content = f"\n### {topic_name} (BTL Section {topic.get('btl_section', '')})\n"
            
            # Add strategy if available
            if topic.get('vopi_strategy'):
                content += f"**Strategy:** {topic.get('vopi_strategy')}\n\n"
            
            # Add rules
            if "rules" in topic and topic["rules"]:
                content += "**Rules and Criteria:**\n"
                for rule in topic["rules"]:
                    content += f"- [{rule.get('code', '')}] {rule.get('criteria', '')}\n"
                    percent = rule.get('percent') or 0
                    if percent > 0:
                        content += f"  → Percentage: {percent}%\n"
                content += "\n"
            
            # Add required documents
            if "required_docs" in topic and topic["required_docs"]:
                content += "**Required Documents:**\n"
                for doc in topic["required_docs"]:
                    content += f"- {doc}\n"
                content += "\n"
            
            relevant_content.append(content)
    
    if matched_topics:
        logger.warning(f"[BTL_SELECT] Topics matched: {', '.join(matched_topics)}")
    
    if relevant_content:
        full_content = "\n\n=== RELEVANT BTL GUIDELINES ===\n" + "".join(relevant_content)
        logger.warning(f"[BTL_INJECT] Injecting {len(matched_topics)} BTL topics ({len(full_content)} chars into prompt)")
        return full_content
    
    logger.error("[BTL_SELECT] No matching BTL topics found")
    return ""

# Load .env (OPENAI_API_KEY, optional OPENAI_MODEL)
load_dotenv()
OPENAI_API_KEY: Optional[str] = os.getenv('OPENAI_API_KEY')
# Default model used here; override via OPENAI_MODEL in .env
OPENAI_MODEL: str = os.getenv('OPENAI_MODEL', 'gpt-5-nano')

# Chat completions endpoint
_OPENAI_BASE = "https://api.openai.com/v1"

# Gemini configuration (optional, enable switching)
GEMINI_API_KEY: Optional[str] = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL_ID: str = os.getenv('GEMINI_MODEL_ID', 'gemini-1.5-mini')
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1"

def _call_gpt(
    prompt: str,
    model: Optional[str] = "gpt-5-nano",
    temperature: float = 0.2,
    max_output_tokens: int = 1024,
    timeout: int = 90,
) -> Dict[str, Any]:
    """
    Internal helper: call OpenAI Responses API using gpt-5-nano
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


def _extract_json_from_text(text: str) -> str:
    """
    Robust JSON extraction that handles:
    - Text before/after JSON
    - Multiple JSON objects (returns first valid one)
    - Malformed JSON with trailing commas
    - Comments in JSON
    
    Returns cleaned JSON string ready for parsing.
    """
    import re
    
    # First strip markdown
    text = _strip_markdown_json_block(text)
    
    # Try to find JSON object boundaries
    # Look for outermost { ... }
    start_idx = text.find('{')
    if start_idx == -1:
        return text  # No JSON found, return as-is
    
    # Find matching closing brace
    brace_count = 0
    end_idx = -1
    for i in range(start_idx, len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
    
    if end_idx == -1:
        # No matching brace found, return original
        return text
    
    json_str = text[start_idx:end_idx]
    
    # Remove trailing commas before closing braces/brackets (common LLM error)
    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
    
    # Remove comments (// ... and /* ... */)
    json_str = re.sub(r'//.*?$', '', json_str, flags=re.MULTILINE)
    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
    
    return json_str.strip()


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

    # Fetch agent configuration from database
    from .supabase_client import get_agent_prompt
    
    # FALLBACK PROMPT (Original hardcoded version - kept for safety)
    fallback_prompt = """You are a medical-legal document analyst. Analyze the following medical document and questionnaire answers to extract critical information for a disability claim.

QUESTIONNAIRE ANSWERS:
{answers}

MEDICAL DOCUMENT TEXT:
{ocr_text}

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
    
    # Load agent configuration from database
    agent_config = get_agent_prompt('eligibility_processor', fallback_prompt)
    prompt_template = agent_config['prompt']
    
    # Replace placeholders in prompt
    prompt = prompt_template.replace('{answers}', json.dumps(answers, indent=2)).replace('{ocr_text}', ocr_text[:20000]).replace('{document_text}', ocr_text[:20000])

    try:
        logger.warning(f"[SUMMARY] Extracting document summary and key points")
        raw = _call_gpt(prompt, temperature=0.2, max_output_tokens=1024)
        raw_text = _extract_text_from_gpt_response(raw)

        # Use robust JSON extraction
        json_text = _extract_json_from_text(raw_text)
        result = json.loads(json_text)
        # ensure keys exist
        result.setdefault('summary', '')
        result.setdefault('key_points', [])
        result.setdefault('medical_findings', [])
        result.setdefault('work_relation_evidence', '')
        result.setdefault('injury_severity', '')
        result.setdefault('treatment_details', '')
        logger.warning(f"[SUMMARY] Extracted {len(result.get('key_points', []))} key points")
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

    from .supabase_client import get_agent_prompt
    
    # FALLBACK PROMPT (Original hardcoded version - kept for safety)
    fallback_prompt = """You are a disability claims eligibility expert analyzing Bituach Leumi (BTL) disability claims. Analyze the following information and determine eligibility based on BTL regulations.

=== BTL REGULATORY FRAMEWORK ===
{guidelines_text}

=== CLAIMANT INFORMATION ===
QUESTIONNAIRE ANSWERS:
{answers}

DOCUMENT ANALYSIS:
{document_analysis}

=== ANALYSIS TASK ===
Evaluate the claimant's eligibility based on BTL guidelines above. Consider:
1. Medical threshold (conditions, severity, alignment with BTL categories)
2. Documentation quality and completeness per BTL requirements
3. Work inability and functional limitations (IEL)
4. Retroactivity eligibility
5. Any missing documentation per BTL requirements

Return ONLY valid JSON matching this exact schema:
{{
  "eligibility_score": integer (0-100, where 100 is highly eligible),
  "eligibility_status": "eligible" | "likely" | "needs_review" | "not_eligible",
  "confidence": integer (0-100, your confidence in this assessment),
  "reason_summary": "string (2-3 sentences explaining the decision)",
  "rule_references": [
    {{"section": "string (BTL section/category)", "quote": "specific guideline text", "relevance": "how this applies to claimant"}}
  ],
  "required_next_steps": ["array of specific actions per BTL requirements"],
  "strengths": ["array of claim strengths per BTL guidelines"],
  "weaknesses": ["array of gaps or concerns per BTL requirements"]
}}
"""
    
    # Load agent configuration from database
    agent_config = get_agent_prompt('eligibility_scorer', fallback_prompt)
    prompt_template = agent_config['prompt']
    
    # Replace placeholders in prompt
    prompt = prompt_template.replace('{guidelines_text}', guidelines_text[:20000])
    prompt = prompt.replace('{answers}', json.dumps(answers, indent=2))
    prompt = prompt.replace('{document_analysis}', json.dumps(document_analysis, indent=2))

    try:
        logger.warning(f"[BTL_SCORE] Scoring eligibility using {agent_config['model']}")
        raw = _call_gpt(prompt, model=agent_config['model'], temperature=0.1, max_output_tokens=1024)
        raw_text = _extract_text_from_gpt_response(raw)
        
        # Use robust JSON extraction
        json_text = _extract_json_from_text(raw_text)
        result = json.loads(json_text)
        # set defaults to avoid KeyError downstream
        result.setdefault('eligibility_score', 0)
        result.setdefault('eligibility_status', 'needs_review')
        result.setdefault('confidence', 0)
        result.setdefault('reason_summary', '')
        result.setdefault('rule_references', [])
        result.setdefault('required_next_steps', [])
        result.setdefault('strengths', [])
        result.setdefault('weaknesses', [])
        logger.warning(f"[BTL_SCORE_RESULT] status={result.get('eligibility_status')}, score={result.get('eligibility_score')}/100, confidence={result.get('confidence')}%")
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
    """Load eligibility guidelines from BTL regulations (btl.json).
    Returns formatted guideline text for use in LLM prompts.
    """
    try:
        btl_content = get_btl_content_by_topics()  # Load ALL BTL guidelines
        if btl_content:
            logger.info("[GUIDELINES] ✅ Loaded BTL guidelines successfully")
            return btl_content
        else:
            logger.warning("[GUIDELINES] ⚠️  No BTL content available, using fallback")
            return "General disability eligibility guidelines: Work-related injury, medical documentation, unable to work for extended period."
    except Exception as e:
        logger.exception(f"[GUIDELINES] ❌ Error loading eligibility guidelines: {e}")
        return "General disability eligibility guidelines: Work-related injury, medical documentation, unable to work for extended period."


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

    from .supabase_client import get_agent_prompt
    
    # FALLBACK PROMPT (Original hardcoded version - kept for safety)
    fallback_prompt = """
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
{guidelines_text}

OCR_DOCUMENT_TEXT:
{ocr_text}

CONTEXT:
{extra_context}

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
    
    # Load agent configuration from database
    agent_config = get_agent_prompt('guidelines_analyzer', fallback_prompt)
    prompt_template = agent_config['prompt']
    
    # Replace placeholders in prompt
    prompt = prompt_template.replace('{guidelines_text}', guidelines_text[:12000])
    prompt = prompt.replace('{ocr_text}', ocr_text[:12000])
    prompt = prompt.replace('{extra_context}', json.dumps(extra_context, ensure_ascii=False))

    try:
        if provider == 'gemini':
            logger.info("Calling Gemini for doc+guidelines analysis (model=%s)", agent_config['model'])
            raw = _call_gemini(prompt, temperature=0.2, max_output_tokens=1024)
            raw_text = _extract_text_from_gemini_response(raw)
        else:
            logger.info("Calling OpenAI for doc+guidelines analysis (model=%s)", agent_config['model'])
            raw = _call_gpt(prompt, model=agent_config['model'], temperature=0.2, max_output_tokens=1024)
            raw_text = _extract_text_from_gpt_response(raw)

        # Use robust JSON extraction
        json_text = _extract_json_from_text(raw_text)
        result = json.loads(json_text)

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
    # Fetch agent configuration from database
    from .supabase_client import get_agent_prompt
    
    # FALLBACK PROMPT (Original hardcoded version - kept for safety)
    fallback_prompt = """You are a LAWYER specializing in BTL (Bituach Leumi) disability claims. You are reviewing a document submitted by your client to determine if it contains VALID MEDICAL EVIDENCE that can support their disability claim case under BTL regulations.

YOU MUST BE STRICT. Your client's claim depends on having proper medical documentation that meets BTL legal requirements.

=== BTL DISABILITY CLAIM REQUIREMENTS ===
{btl_guidelines}

=== MEDICAL EVIDENCE STANDARDS ===

VALID MEDICAL EVIDENCE (Accept for BTL claims):
✓ Hospital discharge summaries with diagnosis, treatment, prognosis
✓ Physician/specialist reports with clinical examination findings
✓ Psychiatric/psychological evaluations with test results and diagnoses
✓ Cognitive/learning disability assessments with standardized scores
✓ Neuropsychological testing reports
✓ Imaging reports (MRI, CT, X-ray) with radiologist interpretation
✓ Laboratory or pathology results WITH physician interpretation
✓ Surgical/operative reports
✓ Physical therapy or rehabilitation assessments
✓ EMG/nerve conduction studies, EEG with clinical correlation
✓ Treatment records documenting ongoing care and functional impact
✓ Work restriction letters from treating physicians
✓ Disability percentages assigned by medical committee (if available)

INVALID DOCUMENTS (Reject - NOT legal evidence for BTL):
✗ Receipts, invoices, billing statements
✗ Appointment cards, scheduling notices
✗ Insurance forms or correspondence
✗ Blank or nearly blank pages
✗ Pharmacy labels without clinical context
✗ Patient education materials
✗ Documents without patient name, dates, or provider signature
✗ Illegible or garbled scans

DOCUMENT TO ANALYZE:
---
{ocr_text}
---

AS THE CLIENT'S LAWYER, evaluate this document:

1. Does it contain objective medical evidence per BTL requirements?
2. Does it have proper documentation (provider, dates, signatures)?
3. Can it support a BTL disability claim legally?
4. If NOT valid, what specific document IS needed per BTL?

Return ONLY valid JSON:
{{
  "is_relevant": boolean (TRUE only if contains valid medical evidence for BTL claim),
  "relevance_score": integer (0-30 non-medical; 40-69 weak; 70-100 strong),
  "relevance_reason": "ONE sentence explaining decision (max 15 words)",
  "document_summary": "if rejected: 2-4 words; if relevant: COMPREHENSIVE 200-500 words with ALL medical details",
  "key_points": [array of specific medical facts],
  "document_type": "string",
  "focus_excerpt": "most relevant 300-char excerpt",
  "btl_relevance": "how this document supports BTL claim",
  "structured_data": {{
    "diagnoses": [],
    "test_results": [],
    "medications": [],
    "functional_limitations": [],
    "work_restrictions": [],
    "provider_info": ""
  }}
}}"""
    
    # Load BTL guidelines to inject into prompt
    btl_content = get_btl_content_by_topics()  # Load ALL BTL guidelines
    
    # Load agent configuration from database    
    agent_config = get_agent_prompt('document_relevance_checker', fallback_prompt)
    prompt_template = agent_config['prompt']
    
    # Replace placeholders in prompt
    prompt = prompt_template.replace('{ocr_text}', ocr_text[:15000]).replace('{document_text}', ocr_text[:15000])
    prompt = prompt.replace('{btl_guidelines}', btl_content[:10000])

    try:
        logger.warning(f"[RELEVANCE_CHECK] Provider={provider}, OCR={len(ocr_text)} chars")
        
        if provider == 'gemini':
            raw = _call_gemini(prompt, temperature=0.1, max_output_tokens=2000)
            raw_text = _extract_text_from_gemini_response(raw)
        else:
            raw = _call_gpt(prompt, temperature=0.1, max_output_tokens=2000)
            raw_text = _extract_text_from_gpt_response(raw)

        # Use robust JSON extraction
        json_text = _extract_json_from_text(raw_text)
        
        # Debug log the raw response if JSON parsing fails
        try:
            result = json.loads(json_text)
        except json.JSONDecodeError as json_err:
            logger.error(f"JSON parse error: {json_err}")
            logger.error(f"Raw response (first 1000 chars): {raw_text[:1000]}")
            logger.error(f"Extracted JSON attempt (first 500 chars): {json_text[:500]}")
            raise
        
        logger.warning(f"[RELEVANCE_RESULT] is_relevant={result.get('is_relevant')}, score={result.get('relevance_score')}, type={result.get('document_type')}")

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
    
    from .supabase_client import get_agent_prompt
    
    # FALLBACK PROMPT (Original hardcoded version - kept for safety)
    fallback_prompt = """You are a LAWYER specializing in disability claims. You are evaluating your client's case to determine 
eligibility for disability benefits. Your job is to:

1. Build the strongest possible legal case for your client
2. Identify weaknesses that could jeopardize the claim
3. Advise what additional evidence is needed
4. Provide a realistic assessment based on official guidelines

OFFICIAL DISABILITY CLAIM GUIDELINES:
---
{guidelines_text}
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
{answers}
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
    
    # Load agent configuration from database
    agent_config = get_agent_prompt('legal_case_evaluator', fallback_prompt)
    prompt_template = agent_config['prompt']
    
    # Replace placeholders in prompt
    prompt = prompt_template.replace('{guidelines_text}', guidelines_text[:18000])
    prompt = prompt.replace('{document_context}', document_context)
    prompt = prompt.replace('{answers}', json.dumps(answers, indent=2))

    try:
        if provider == 'gemini':
            logger.info("Calling Gemini for questionnaire analysis (model=%s)", agent_config['model'])
            raw = _call_gemini(prompt, temperature=0.1, max_output_tokens=1200)
            raw_text = _extract_text_from_gemini_response(raw)
        else:
            logger.info("Calling OpenAI for questionnaire analysis (model=%s)", agent_config['model'])
            raw = _call_gpt(prompt, model=agent_config['model'], temperature=0.1, max_output_tokens=1200)
            raw_text = _extract_text_from_gpt_response(raw)

        # Use robust JSON extraction
        json_text = _extract_json_from_text(raw_text)
        result = json.loads(json_text)

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
