"""
Specialized agent for summarizing documents uploaded on the dashboard.
Focuses purely on extracting comprehensive medical information and key facts.
"""
import json
import logging
from typing import Dict, Any, Optional
import os
from openai import OpenAI

logger = logging.getLogger('dashboard_document_summarizer')

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not configured")

client = OpenAI(api_key=OPENAI_API_KEY)
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4-turbo')


def summarize_dashboard_document(
    ocr_text: str,
    document_name: str = "Uploaded Document",
    document_type: str = "medical"
) -> Dict[str, Any]:
    """
    Summarize a document uploaded on the dashboard.
    
    This agent focuses on:
    1. Determining if it's a valid medical document
    2. Extracting ALL medical information comprehensively
    3. Identifying key points and findings
    4. Assessing relevance to disability claims
    
    Args:
        ocr_text: Extracted text from the document
        document_name: Name of the document
        document_type: Type of document (medical, legal, administrative, other)
    
    Returns:
        {
            "is_relevant": bool,
            "document_summary": str (comprehensive summary),
            "key_points": [str] (list of important facts),
            "upload_source": str (always "manual_upload"),
            "relevance_score": int (0-100),
            "relevance_reason": str,
            "document_type": str,
            "structured_data": {
                "diagnoses": [str],
                "test_results": [str],
                "medications": [str],
                "functional_limitations": [str],
                "work_restrictions": [str],
                "provider_info": str
            }
        }
    """
    
    logger.info(f"Starting document summarization for: {document_name}")
    logger.info(f"Document type: {document_type}")
    logger.info(f"OCR text length: {len(ocr_text)} characters")
    
    if not ocr_text or len(ocr_text.strip()) < 50:
        logger.warning(f"Document contains insufficient text (< 50 chars)")
        return {
            "is_relevant": False,
            "document_summary": "Blank or unreadable document",
            "key_points": [],
            "upload_source": "manual_upload",
            "relevance_score": 0,
            "relevance_reason": "Document is blank or contains minimal text",
            "document_type": "blank",
            "structured_data": {
                "diagnoses": [],
                "test_results": [],
                "medications": [],
                "functional_limitations": [],
                "work_restrictions": [],
                "provider_info": ""
            }
        }
    
    prompt = f"""You are a specialized medical document analyzer. Your ONLY task is to comprehensively summarize and extract information from the following document.

DOCUMENT NAME: {document_name}
DOCUMENT TYPE: {document_type}

---DOCUMENT CONTENT---
{ocr_text}
---END DOCUMENT---

ANALYZE THIS DOCUMENT AND RETURN JSON WITH THE FOLLOWING STRUCTURE:

{{
  "is_relevant": boolean - TRUE only if this is a legitimate medical/clinical document with actual medical information,
  
  "relevance_score": integer 0-100 where:
    - 0-20: Not medical (receipt, blank, unrelated)
    - 21-50: Administrative medical (appointment card, insurance form)
    - 51-70: Partial medical info (basic doctor note without findings)
    - 71-100: Strong medical evidence (diagnosis, test results, clinical findings),
  
  "relevance_reason": string - ONE sentence explaining why it is/isn't relevant,
  
  "document_type": string - One of: medical_report, discharge_summary, specialist_evaluation, 
                           psychological_evaluation, neuropsych_evaluation, psychiatric_assessment,
                           diagnostic_report, surgical_report, lab_results, imaging_report,
                           treatment_record, blank_page, receipt, insurance_form, appointment_card, other,
  
  "document_summary": string - COMPREHENSIVE SUMMARY (300-1000 words) that includes:
    - Patient demographics if available
    - Date of evaluation/service
    - Chief complaint or reason for visit
    - ALL diagnoses mentioned with severity/type
    - ALL test results with specific values, scores, percentiles
    - Clinical examination findings
    - Functional limitations and restrictions
    - Treatment plan and medications with dosages
    - Provider credentials and specialty
    - Prognosis and recommendations
    - Work restrictions or recommendations
    - Any relevant history or context
    
    FOR IRRELEVANT DOCUMENTS: brief description (2-4 words) of what it actually is,
  
  "key_points": array of strings - EXTRACT EVERY IMPORTANT FACT:
    - Each diagnosis with severity (e.g., "Major Depressive Disorder, Severe")
    - Each test result with values (e.g., "MRI shows L4-L5 disc herniation with nerve compression")
    - Each medication with dosage (e.g., "Sertraline 100mg daily")
    - Each functional limitation (e.g., "Unable to sit longer than 30 minutes")
    - Each work restriction (e.g., "No lifting over 10 lbs")
    - Each clinical finding (e.g., "Patient presents with tremor in right hand")
    - Provider type and credentials if available
    - Date of evaluation
    
    FOR IRRELEVANT DOCUMENTS: return empty array [],
  
  "relevance_guidance": string - If irrelevant: specific guidance on what documents are needed.
                                If relevant: note about strengths of this document,
  
  "structured_data": {{
    "diagnoses": [string array of all diagnoses with severity],
    "test_results": [string array of all test results with values],
    "medications": [string array of all medications with dosages],
    "functional_limitations": [string array of functional limitations],
    "work_restrictions": [string array of work restrictions],
    "provider_info": string - name, credentials, specialty of evaluator
  }}
}}

CRITICAL REQUIREMENTS:
1. For relevant medical documents: document_summary MUST be 300+ words with every detail
2. key_points MUST contain 5-15 items minimum for relevant documents
3. Extract specific values, scores, percentiles - NEVER say "test was done" without the result
4. For irrelevant documents: keep summary brief (2-4 words) and key_points empty
5. Be comprehensive - include EVERY diagnosis, test, medication, and limitation mentioned

Return ONLY valid JSON."""

    try:
        logger.info(f"Calling OpenAI API with model: {OPENAI_MODEL}")
        
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical document analyzer. Return ONLY valid JSON with no additional text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            max_tokens=3000,
            response_format={"type": "json_object"}
        )
        
        response_text = response.choices[0].message.content
        logger.info(f"API Response received (length: {len(response_text)})")
        logger.info(f"Response preview: {response_text[:500]}...")
        
        # Parse JSON response
        result = json.loads(response_text)
        
        logger.info("✓ JSON parsed successfully")
        logger.info(f"  is_relevant: {result.get('is_relevant')}")
        logger.info(f"  relevance_score: {result.get('relevance_score')}")
        logger.info(f"  document_type: {result.get('document_type')}")
        logger.info(f"  summary length: {len(result.get('document_summary', ''))} chars")
        logger.info(f"  key_points count: {len(result.get('key_points', []))}")
        
        # Normalize and validate response
        normalized = {
            "is_relevant": bool(result.get('is_relevant', False)),
            "document_summary": str(result.get('document_summary', '')).strip(),
            "key_points": _normalize_key_points(result.get('key_points', [])),
            "upload_source": "manual_upload",
            "relevance_score": int(result.get('relevance_score', 0)),
            "relevance_reason": str(result.get('relevance_reason', '')).strip(),
            "document_type": str(result.get('document_type', 'unknown')).strip(),
            "relevance_guidance": str(result.get('relevance_guidance', '')).strip(),
            "structured_data": _normalize_structured_data(result.get('structured_data', {}))
        }
        
        # Validation checks
        if normalized['is_relevant'] and not normalized['document_summary']:
            logger.warning("⚠️ Relevant document but empty summary - using fallback")
            normalized['document_summary'] = f"Medical document: {document_name}"
        
        if normalized['is_relevant'] and len(normalized['key_points']) == 0:
            logger.warning("⚠️ Relevant document but no key points - extracting from summary")
            normalized['key_points'] = _extract_fallback_key_points(normalized['document_summary'])
        
        logger.info("✓ Document summarization complete")
        return normalized
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
        logger.error(f"Response was: {response_text[:500]}")
        return _fallback_summary(ocr_text, document_name, error_reason="JSON parsing failed")
    
    except Exception as e:
        logger.exception(f"Document summarization failed: {e}")
        return _fallback_summary(ocr_text, document_name, error_reason=str(e))


def _normalize_key_points(key_points: Any) -> list:
    """Normalize key_points to a list of strings."""
    if not isinstance(key_points, list):
        return []
    
    normalized = []
    for item in key_points:
        if isinstance(item, str) and item.strip():
            normalized.append(item.strip())
        elif isinstance(item, dict) and 'text' in item:
            normalized.append(item['text'].strip())
    
    return normalized[:15]  # Max 15 key points


def _normalize_structured_data(data: Any) -> Dict[str, Any]:
    """Normalize structured data."""
    if not isinstance(data, dict):
        data = {}
    
    return {
        "diagnoses": _normalize_list(data.get('diagnoses', [])),
        "test_results": _normalize_list(data.get('test_results', [])),
        "medications": _normalize_list(data.get('medications', [])),
        "functional_limitations": _normalize_list(data.get('functional_limitations', [])),
        "work_restrictions": _normalize_list(data.get('work_restrictions', [])),
        "provider_info": str(data.get('provider_info', '')).strip()
    }


def _normalize_list(items: Any) -> list:
    """Normalize a list of strings."""
    if not isinstance(items, list):
        return []
    
    normalized = []
    for item in items:
        if isinstance(item, str) and item.strip():
            normalized.append(item.strip())
    
    return normalized


def _extract_fallback_key_points(summary: str) -> list:
    """Extract key points from summary using heuristics."""
    key_points = []
    
    # Simple heuristic: split by common medical terms
    medical_keywords = [
        'diagnosed with', 'diagnosis:', 'diagnosed',
        'presents with', 'patient reports', 'shows',
        'results', 'finding', 'score', 'test',
        'medication', 'prescribed', 'treatment',
        'restriction', 'limitation', 'unable to'
    ]
    
    sentences = summary.split('.')
    for sentence in sentences:
        sentence = sentence.strip()
        if any(keyword in sentence.lower() for keyword in medical_keywords) and len(sentence) > 10:
            key_points.append(sentence)
        
        if len(key_points) >= 8:
            break
    
    return key_points[:10]


def _fallback_summary(ocr_text: str, document_name: str, error_reason: str) -> Dict[str, Any]:
    """Provide fallback response when AI processing fails."""
    logger.warning(f"Using fallback summary due to: {error_reason}")
    
    text_length = len(ocr_text.strip())
    has_medical_keywords = any(
        keyword in ocr_text.lower() 
        for keyword in ['diagnosis', 'medical', 'doctor', 'patient', 'treatment', 'doctor', 'hospital']
    )
    
    return {
        "is_relevant": has_medical_keywords and text_length > 100,
        "document_summary": f"Document: {document_name}. Unable to fully process due to {error_reason}.",
        "key_points": [],
        "upload_source": "manual_upload",
        "relevance_score": 30 if has_medical_keywords else 10,
        "relevance_reason": f"Processing error: {error_reason}",
        "document_type": "unknown",
        "relevance_guidance": "Please retry document upload or contact support if issue persists.",
        "structured_data": {
            "diagnoses": [],
            "test_results": [],
            "medications": [],
            "functional_limitations": [],
            "work_restrictions": [],
            "provider_info": ""
        }
    }
