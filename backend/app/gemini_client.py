import os
import json
from typing import Dict, Any
import requests
import logging
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

# Placeholder client for Gemini / Vertex AI generative models.
# Replace with real Vertex AI client usage. See README for notes.

GEMINI_MODEL_ID = os.environ.get('GEMINI_MODEL_ID')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
logger = logging.getLogger('gemini_client')


def build_prompt(answers: Dict[str, Any], ocr_text: str, legal_chunks: list) -> str:
    # Compact answers
    ans_lines = []
    for k, v in answers.items():
        ans_lines.append(f"- {k}: {v}")

    legal_excerpt = ''
    # include up to first 3 chunks
    for c in legal_chunks[:3]:
        legal_excerpt += f"[{c.get('section_id')}]:\n{c.get('text')}\n\n"

    prompt = f"""
You are a legal eligibility assistant.
Use ONLY the legal guidelines provided in the LEGAL_GUIDELINES section and the user's supplied information.
Return EXACTLY a JSON object matching the schema described below.

LEGAL_GUIDELINES:
{legal_excerpt}

USER_ANSWERS:
{ '\n'.join(ans_lines) }

TASK:
Apply the legal guidelines to the user's case and return a JSON object with these keys:
- eligibility: one of ["eligible","likely","needs_manual_review","not_eligible"]
- reason_summary: short human summary (max 300 chars)
- confidence: integer 0-100
- rule_references: array of {{section_id, quote}}
- required_next_steps: array of strings
- raw_score: numeric (0-100)

Return ONLY the JSON object. Do not add any other commentary.
"""
    return prompt


def call_gemini(answers: Dict[str, Any], ocr_text: str, legal_chunks: list) -> Dict[str, Any]:
    """
    Make a call to Gemini / Vertex AI generative model. This is a placeholder that
    returns a simulated response if no real API credentials are available.

    Replace this implementation with `google.cloud.aiplatform` calls or REST calls to the correct endpoint.
    """
    prompt = build_prompt(answers, ocr_text, legal_chunks)

    # If GEMINI_API_KEY and GEMINI_MODEL_ID present, call Generative Language REST API
    if GEMINI_API_KEY and GEMINI_MODEL_ID:
        try:
            logger.info(f"Calling Generative Language API model={GEMINI_MODEL_ID}")
            endpoint = f"https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL_ID}:generateText"
            params = {'key': GEMINI_API_KEY}
            body = {
                'prompt': {'text': prompt},
                'temperature': 0.0,
                'maxOutputTokens': 1600,
            }
            # Log payload (prompt). Be careful: prompt may contain sensitive user data.
            try:
                logger.info("Generative Language request payload:")
                # Log a safe preview and the full body as debug
                logger.info(f"prompt_preview={prompt[:1000].replace('\n',' ')}")
                logger.debug(f"full_request_body={json.dumps(body, ensure_ascii=False)}")
            except Exception:
                logger.exception("Failed to log request payload")
            resp = requests.post(endpoint, params=params, json=body, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            # log full HTTP response text
            try:
                logger.info("Generative Language API response received")
                logger.info(f"response_text={resp.text}")
            except Exception:
                logger.exception("Failed to log response text")
            # Try different resp shapes: 'candidates' or 'output' or 'candidates'->'content'
            raw_text = ''
            if 'candidates' in data and isinstance(data['candidates'], list) and data['candidates']:
                cand = data['candidates'][0]
                raw_text = cand.get('content') or cand.get('output') or json.dumps(cand)
            elif 'output' in data:
                # some APIs return {'output': '...'}
                raw_text = data.get('output')
            elif 'responses' in data and isinstance(data['responses'], list) and data['responses']:
                # another potential shape
                raw_text = data['responses'][0].get('content', '')
            else:
                # fallback to stringifying whole body
                raw_text = json.dumps(data)

            # Attempt parse JSON from model
            try:
                parsed = json.loads(raw_text)
                return parsed
            except Exception:
                logger.warning("Model returned non-JSON output; returning wrapped response", exc_info=True)
                return {
                    'eligibility': 'needs_manual_review',
                    'reason_summary': 'Model returned unparsable output',
                    'confidence': 20,
                    'rule_references': [],
                    'required_next_steps': [],
                    'raw_score': None,
                    'raw_response': {'text': raw_text, 'full': data, 'http_text': resp.text}
                }
        except Exception as e:
            logger.exception('Generative Language API request failed')
            return {
                'eligibility': 'needs_manual_review',
                'reason_summary': f'Failed to call Gemini API: {str(e)}',
                'confidence': 5,
                'rule_references': [],
                'required_next_steps': [],
                'raw_score': None,
                'raw_response': {'error': str(e)}
            }

    # Fallback simulated response
    simulated = {
        'eligibility': 'likely',
        'reason_summary': 'Document indicates possible work-related injury with medical records present.',
        'confidence': 72,
        'rule_references': [{'section_id': 'section_1', 'quote': 'Relevant rule excerpt...'}],
        'required_next_steps': ['Upload full discharge summary', 'Attend committee appointment'],
        'raw_score': 72,
        'raw_response': {'note': 'simulated response — configure GEMINI_MODEL_ID to call real model'}
    }
    return simulated


def analyze_document_questions(questions: list, ocr_text: str, answers: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Analyze OCR text to determine which items from `questions` are present in the document.

    questions: list of dicts or strings. If dict, prefer keys `id` and `text`.

    Returns a dict:
      - answered_count: int
      - answered_ids: list[str]
      - details: [ {id, matched_text, confidence} ]
      - summary: str
    """
    # Build the human prompt listing questions
    q_lines = []
    for q in questions:
        if isinstance(q, dict):
            qid = q.get('id') or q.get('key') or str(q)
            qtext = q.get('text') or q.get('question') or str(q)
        else:
            qid = str(q)
            qtext = str(q)
        q_lines.append(f"{qid}: {qtext}")

    prompt = f"""
You are a document understanding assistant. Given the EXTRACTED_DOCUMENT_TEXT and a list of QUESTIONS,
identify which questions are answered by the document. Return EXACTLY one JSON object that matches the schema below.

QUESTIONS:
{chr(10).join(q_lines)}

EXTRACTED_DOCUMENT_TEXT:
{ocr_text[:4000]}

SCHEMA (return ONLY this JSON):
{{
  "answered_count": integer,
  "answered_ids": [ string ],
  "details": [
    {{
      "id": string,
      "matched_text": string,
      "confidence": integer
    }}
  ],
  "summary": string
}}
"""

    # Try calling Gemini if configured
    if GEMINI_API_KEY and GEMINI_MODEL_ID:
        try:
            logger.info(f"Calling Generative Language API for document-question analysis model={GEMINI_MODEL_ID}")
            endpoint = f"https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL_ID}:generateText"
            params = {'key': GEMINI_API_KEY}
            body = {
                'prompt': {'text': prompt},
                'temperature': 0.0,
                'maxOutputTokens': 1200,
            }
            try:
                logger.info(f"prompt_preview={prompt[:800].replace(chr(10),' ')}")
                logger.debug(f"full_request_body={json.dumps(body, ensure_ascii=False)}")
            except Exception:
                logger.exception("Failed to log request payload for question analysis")

            resp = requests.post(endpoint, params=params, json=body, timeout=60)
            resp.raise_for_status()
            data = resp.json()

            raw_text = ''
            if 'candidates' in data and isinstance(data['candidates'], list) and data['candidates']:
                cand = data['candidates'][0]
                raw_text = cand.get('content') or cand.get('output') or json.dumps(cand)
            elif 'output' in data:
                raw_text = data.get('output') or json.dumps(data.get('output'))
            elif 'responses' in data and isinstance(data['responses'], list) and data['responses']:
                raw_text = data['responses'][0].get('content', '')
            else:
                raw_text = json.dumps(data)

            try:
                parsed = json.loads(raw_text)
                if all(k in parsed for k in ('answered_count', 'answered_ids', 'details', 'summary')):
                    return parsed
                else:
                    logger.warning('Gemini returned JSON but missing expected keys; falling back to heuristic')
            except Exception:
                logger.warning('Gemini returned non-JSON output for question analysis; falling back to heuristic', exc_info=True)

        except Exception:
            logger.exception('Generative Language API request for question analysis failed; falling back to heuristic')

    # Heuristic fallback: keyword matching
    try:
        import re
        ocr_lower = (ocr_text or '').lower()
        stopwords = set(['the','and','or','with','of','to','in','for','are','was','is','when','by','on','a','an','you','your'])
        details = []
        answered_ids = []

        for q in questions:
            if isinstance(q, dict):
                qid = q.get('id') or q.get('key') or str(q)
                qtext = q.get('text') or q.get('question') or str(q)
            else:
                qid = str(q)
                qtext = str(q)

            words = re.findall(r"\w+", qtext.lower())
            keywords = [w for w in words if len(w) > 3 and w not in stopwords]
            if not keywords:
                continue

            matched = [kw for kw in keywords if kw in ocr_lower]
            if matched:
                first_kw = matched[0]
                idx = ocr_lower.find(first_kw)
                if idx >= 0:
                    start = max(0, idx - 80)
                    end = min(len(ocr_text), idx + 200)
                    snippet = ocr_text[start:end].strip()
                else:
                    snippet = matched[0]

                frac = len(matched) / max(1, len(keywords))
                confidence = 70 + round(15 * min(1.0, frac))
                if confidence > 95:
                    confidence = 95

                details.append({'id': qid, 'matched_text': snippet, 'confidence': int(confidence)})
                answered_ids.append(qid)

        answered_count = len(answered_ids)
        if answered_count:
            summary = f"Found {answered_count} answered question(s). Example: {details[0]['matched_text'][:200]}"
        else:
            summary = 'No clear answers detected for the provided questions.'

        return {'answered_count': answered_count, 'answered_ids': answered_ids, 'details': details, 'summary': summary}

    except Exception:
        logger.exception('Heuristic document-question analysis failed')
        return {'answered_count': 0, 'answered_ids': [], 'details': [], 'summary': 'Analysis failed.'}


def analyze_call_conversation(transcript: str, messages: list) -> Dict[str, Any]:
    """
    Analyze a voice call conversation between AI agent and user.
    Generate comprehensive summary and list of documents needed.
    
    Args:
        transcript: Full conversation transcript
        messages: List of message objects with role, time, message fields
        
    Returns:
        {
            'call_summary': str - Comprehensive summary of the call
            'documents_requested_list': list[str] - List of documents needed
            'case_summary': str - Legal case summary
            'key_legal_points': list[str] - Key legal/medical facts
            'risk_assessment': str - Assessment of case viability
        }
    """
    
    # Build detailed analysis prompt
    prompt = f"""
You are a legal case analyst for disability claims. Analyze the following voice call conversation between an AI intake agent and a claimant.

CONVERSATION TRANSCRIPT:
{transcript}

TASK:
Based on this conversation, provide a comprehensive analysis in JSON format with the following structure:

{{
  "call_summary": "A detailed, professional summary of the entire conversation. Include: main disability/medical condition discussed, timeline (diagnosis dates, when work difficulties began), secondary conditions mentioned, functional limitations discussed, patient concerns and questions, and overall quality of information gathered. Aim for 3-5 paragraphs.",
  
  "documents_requested_list": [
    "List each specific document type that the claimant needs to provide",
    "Be specific - e.g., 'Medical evaluation report from orthopedic specialist for backbone fracture with imaging results'",
    "Include documents for ALL conditions mentioned (primary and secondary)",
    "Include any specialist evaluations, test results, imaging reports, employment records, etc."
  ],
  
  "case_summary": "A concise professional legal summary of the disability claim situation in 2-3 sentences. Focus on: primary condition, diagnosis date, related secondary conditions, and current work status.",
  
  "key_legal_points": [
    "Critical facts for the legal case",
    "Include: specific diagnoses with dates",
    "Work impact timeline (when difficulties started)",
    "Any mentions of functional limitations",
    "Secondary/related conditions",
    "Retroactivity implications (how far back the claim could go)"
  ],
  
  "risk_assessment": "Choose ONE: 'High Viability' or 'Low Viability' or 'Needs More Info' - assess based on quality/completeness of information gathered"
}}

CRITICAL INSTRUCTIONS:
1. Be thorough and professional - this will be used by legal staff
2. For documents_requested_list: Be VERY specific. Don't just say "medical records" - specify what type of medical records for which condition
3. Extract ALL medical conditions mentioned (primary and secondary/related)
4. Note specific dates mentioned (diagnosis dates, onset of work difficulties)
5. Include functional limitations discussed (inability to sit/stand, mobility issues, cognitive impacts, etc.)
6. The call_summary should be comprehensive enough that someone who didn't hear the call can fully understand what was discussed

Return ONLY the JSON object. No additional text before or after.
"""

    # Try calling Gemini API
    if GEMINI_API_KEY and GEMINI_MODEL_ID:
        try:
            logger.info(f"Analyzing call conversation with Gemini model={GEMINI_MODEL_ID}")
            endpoint = f"https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL_ID}:generateText"
            params = {'key': GEMINI_API_KEY}
            body = {
                'prompt': {'text': prompt},
                'temperature': 0.2,
                'maxOutputTokens': 3000,  # Need more tokens for comprehensive analysis
            }
            
            logger.info("Sending call analysis request to Gemini")
            logger.debug(f"Transcript length: {len(transcript)} chars")
            
            resp = requests.post(endpoint, params=params, json=body, timeout=90)
            resp.raise_for_status()
            data = resp.json()
            
            logger.info("Received response from Gemini for call analysis")
            
            # Extract response text
            raw_text = ''
            if 'candidates' in data and isinstance(data['candidates'], list) and data['candidates']:
                cand = data['candidates'][0]
                raw_text = cand.get('content') or cand.get('output') or json.dumps(cand)
            elif 'output' in data:
                raw_text = data.get('output') or ''
            elif 'responses' in data and isinstance(data['responses'], list) and data['responses']:
                raw_text = data['responses'][0].get('content', '')
            else:
                raw_text = json.dumps(data)
            
            # Parse JSON response
            try:
                # Clean up response - remove markdown code blocks if present
                cleaned_text = raw_text.strip()
                if cleaned_text.startswith('```'):
                    # Remove markdown code block markers
                    lines = cleaned_text.split('\n')
                    if lines[0].startswith('```'):
                        lines = lines[1:]
                    if lines and lines[-1].startswith('```'):
                        lines = lines[:-1]
                    cleaned_text = '\n'.join(lines).strip()
                
                parsed = json.loads(cleaned_text)
                
                # Validate required fields
                required_fields = ['call_summary', 'documents_requested_list', 'case_summary', 
                                 'key_legal_points', 'risk_assessment']
                if all(field in parsed for field in required_fields):
                    logger.info("Successfully parsed Gemini call analysis response")
                    return parsed
                else:
                    missing = [f for f in required_fields if f not in parsed]
                    logger.warning(f"Gemini response missing fields: {missing}. Falling back to basic analysis.")
            
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse Gemini JSON response: {e}. Raw text: {raw_text[:500]}")
        
        except Exception as e:
            logger.exception(f"Gemini API call for conversation analysis failed: {e}")
    
    # Fallback: basic analysis if API fails
    logger.info("Using fallback analysis for call conversation")
    
    # Extract basic info from transcript
    lines = transcript.split('\n')
    user_messages = [line for line in lines if line.startswith('User:')]
    ai_messages = [line for line in lines if line.startswith('AI:') or line.startswith('Assistant:')]
    
    # Try to extract medical conditions mentioned
    conditions = []
    if 'fracture' in transcript.lower():
        conditions.append('backbone fracture')
    if 'dyslexia' in transcript.lower():
        conditions.append('dyslexia')
    if 'adhd' in transcript.lower():
        conditions.append('ADHD')
    if 'learning disabilit' in transcript.lower():
        conditions.append('learning disabilities')
    
    conditions_str = ', '.join(conditions) if conditions else 'medical condition'
    
    return {
        'call_summary': f"Call between AI intake agent and claimant discussing disability claim. "
                       f"Claimant reported {conditions_str}. "
                       f"Conversation included {len(user_messages)} user responses and {len(ai_messages)} AI prompts. "
                       f"Agent attempted to gather medical history, diagnosis dates, and work impact information. "
                       f"Full analysis requires manual review of transcript.",
        
        'documents_requested_list': [
            f"Medical evaluation reports from doctors or specialists for {conditions_str}",
            "Diagnosis documentation with dates for all conditions",
            "Medical imaging reports (if applicable)",
            "Specialist evaluation reports",
            "Records documenting functional limitations and work impact"
        ],
        
        'case_summary': f"Claimant reporting disability due to {conditions_str}. "
                       f"Detailed information gathering in progress during voice interview.",
        
        'key_legal_points': [
            f"Medical conditions: {conditions_str}",
            "Diagnosis dates and work impact timeline to be confirmed",
            "Functional limitations to be documented",
            "Medical documentation required for committee review"
        ],
        
        'risk_assessment': 'Needs More Info'
    }
