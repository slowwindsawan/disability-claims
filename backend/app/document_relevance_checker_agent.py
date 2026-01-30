"""
Document Relevance Checker Agent
Validates uploaded documents against required specifications from call_summary.documents_requested_list
"""
import json
import logging
from typing import Dict, Any, Optional, List
import os
from openai import OpenAI
from pydantic import BaseModel, Field

logger = logging.getLogger('document_relevance_checker')

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not configured")

client = OpenAI(api_key=OPENAI_API_KEY)
# Use gpt-4o for structured outputs support (gpt-4-turbo doesn't support json_schema)
OPENAI_MODEL = os.environ.get('RELEVANCE_CHECKER_MODEL', 'gpt-4o')


class RelevanceCheckResult(BaseModel):
    """Structured output schema for document relevance check"""
    is_relevant: bool = Field(description="Whether the document matches the required specification")
    confidence: int = Field(description="Confidence score 0-100 on the relevance assessment", ge=0, le=100)
    detailed_analysis: str = Field(description="Detailed explanation of why document is or isn't relevant")
    missing_items: List[str] = Field(description="List of specific items/information missing from the document")
    recommendations: str = Field(description="Actionable recommendations for the user")
    matched_aspects: List[str] = Field(description="List of aspects that correctly match the requirement")


def check_document_relevance(
    document_summary: str,
    document_key_points: List[str],
    structured_data: Dict[str, Any],
    required_document_spec: Dict[str, Any],
    ocr_text_sample: str = ""
) -> Dict[str, Any]:
    """
    Check if uploaded document is relevant to the required document specification.
    
    Args:
        document_summary: AI-generated summary of the uploaded document
        document_key_points: List of key points extracted from document
        structured_data: Structured medical/legal data from document
        required_document_spec: Required document specification from call_summary.documents_requested_list
            Should contain: {name, reason, source, required}
        ocr_text_sample: Optional sample of OCR text (first 2000 chars) for deeper analysis
    
    Returns:
        {
            "is_relevant": bool,
            "confidence": int (0-100),
            "detailed_analysis": str,
            "missing_items": [str],
            "recommendations": str,
            "matched_aspects": [str]
        }
    """
    
    logger.info(f"Starting relevance check for document")
    logger.info(f"Required document: {required_document_spec.get('name', 'Unknown')}")
    
    if not document_summary or not required_document_spec:
        logger.warning("Missing document_summary or required_document_spec")
        return {
            "is_relevant": False,
            "confidence": 0,
            "detailed_analysis": "Insufficient information to perform relevance check",
            "missing_items": ["Document analysis data"],
            "recommendations": "Please ensure document was properly analyzed before relevance checking",
            "matched_aspects": []
        }
    
    # Build comprehensive document representation
    document_representation = {
        "summary": document_summary,
        "key_points": document_key_points,
        "structured_data": structured_data,
        "ocr_sample": ocr_text_sample[:2000] if ocr_text_sample else None
    }
    
    # Build requirement specification
    requirement_name = required_document_spec.get('name', '')
    requirement_reason = required_document_spec.get('reason', required_document_spec.get('why_required', ''))
    requirement_source = required_document_spec.get('source', required_document_spec.get('where_get', ''))
    is_required = required_document_spec.get('required', False)
    
    # Construct the prompt
    system_prompt = """You are a medical document validation specialist for disability insurance claims in Israel. 

Your role is to verify if an uploaded document matches the required document specification. This is critical because:
- Incorrect documents delay claim processing
- Missing information can result in claim rejection
- BTL (Bituach Leumi - Israeli National Insurance) has strict documentation requirements

Be THOROUGH and STRICT in your assessment. Consider:
1. Document type match (e.g., is it actually a medical report vs a receipt?)
2. Content relevance (does it contain the required medical/legal information?)
3. Source verification (is it from the correct provider/authority?)
4. Completeness (does it include all necessary details mentioned in the requirement?)
5. BTL compliance (does it meet Israeli disability claim documentation standards?)

Provide confidence score:
- 90-100: Perfect match, all requirements met
- 70-89: Good match, minor items missing or unclear
- 50-69: Partial match, significant gaps but somewhat relevant
- 30-49: Poor match, major issues or wrong document type
- 0-29: Complete mismatch, wrong document entirely"""

    user_prompt = f"""REQUIRED DOCUMENT SPECIFICATION:
Name: {requirement_name}
Reason Required: {requirement_reason}
Expected Source: {requirement_source}
Is Mandatory: {is_required}

---

UPLOADED DOCUMENT ANALYSIS:

Summary:
{document_summary}

Key Points:
{json.dumps(document_key_points, indent=2, ensure_ascii=False)}

Structured Medical Data:
{json.dumps(structured_data, indent=2, ensure_ascii=False)}

{f'OCR Text Sample (first 2000 chars):\\n{ocr_text_sample[:2000]}' if ocr_text_sample else ''}

---

TASK:
Compare the uploaded document against the required specification and provide:
1. Is this document relevant to the requirement? (True/False)
2. Confidence score (0-100) on your assessment
3. Detailed analysis explaining your reasoning in Hebrew (שפה עברית)
4. List of specific missing items/information (in Hebrew)
5. Actionable recommendations for the user (in Hebrew)
6. List of aspects that correctly match the requirement (in Hebrew)

Be specific and reference actual content from both the requirement and the document."""

    try:
        logger.info("Calling OpenAI for relevance check with structured output")
        
        response = client.beta.chat.completions.parse(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format=RelevanceCheckResult,
            temperature=0.3  # Lower temperature for more consistent validation
        )
        
        result = response.choices[0].message.parsed
        
        result_dict = {
            "is_relevant": result.is_relevant,
            "confidence": result.confidence,
            "detailed_analysis": result.detailed_analysis,
            "missing_items": result.missing_items,
            "recommendations": result.recommendations,
            "matched_aspects": result.matched_aspects
        }
        
        logger.info(f"Relevance check complete: is_relevant={result.is_relevant}, confidence={result.confidence}")
        logger.info(f"Missing items: {len(result.missing_items)}")
        logger.info(f"Matched aspects: {len(result.matched_aspects)}")
        
        return result_dict
        
    except Exception as e:
        logger.exception(f"Error during relevance check: {e}")
        return {
            "is_relevant": False,
            "confidence": 0,
            "detailed_analysis": f"שגיאה בבדיקת התאמת המסמך: {str(e)}",
            "missing_items": ["לא ניתן היה לבצע בדיקת התאמה בשל שגיאה טכנית"],
            "recommendations": "אנא נסה להעלות את המסמך שוב או פנה לתמיכה טכנית",
            "matched_aspects": []
        }


def check_document_relevance_simple(
    document_summary: str,
    required_document_name: str,
    required_document_reason: str
) -> Dict[str, Any]:
    """
    Simplified relevance check using only document summary and requirement name/reason.
    Use when structured data is not available.
    
    Args:
        document_summary: Summary of the uploaded document
        required_document_name: Name of required document
        required_document_reason: Reason why document is required
    
    Returns:
        Same structure as check_document_relevance()
    """
    return check_document_relevance(
        document_summary=document_summary,
        document_key_points=[],
        structured_data={},
        required_document_spec={
            "name": required_document_name,
            "reason": required_document_reason,
            "source": "",
            "required": True
        },
        ocr_text_sample=""
    )


if __name__ == "__main__":
    # Test the relevance checker
    logging.basicConfig(level=logging.INFO)
    
    # Example test case
    test_document_summary = """דוח רפואי מקיף מהפסיכיאטר המטפל ד"ר כהן. 
    מתועד אבחנה של ADHD מסוג משולב מיום 15.3.2023. 
    התיעוד כולל ראיון קליני מפורט, תיאור תסמינים והשפעה על תפקוד חברתי ותעסוקתי.
    מטופל בריטלין 20 מ"ג פעמיים ביום. 
    מתועדים קשיים משמעותיים בריכוז, ארגון וניהול זמן המשפיעים על העבודה."""
    
    test_key_points = [
        "אבחנת ADHD מסוג משולב",
        "ראיון קליני מפורט",
        "תיעוד השפעה על תפקוד חברתי ותעסוקתי",
        "טיפול תרופתי בריטלין"
    ]
    
    test_structured_data = {
        "diagnoses": ["ADHD - Attention Deficit Hyperactivity Disorder, Combined Type"],
        "medications": ["Ritalin 20mg twice daily"],
        "functional_limitations": ["Difficulty concentrating", "Organizational challenges", "Time management issues"],
        "provider_info": "Dr. Cohen, Psychiatrist"
    }
    
    test_required_spec = {
        "name": "Physician's ADHD diagnostic report and clinical interview notes",
        "reason": "BTL requires a physician-documented ADHD diagnosis with explicit evidence of impairment in at least two domains (social, educational, occupational) and a continuous documented treatment history",
        "source": "Treating psychiatrist/neurologist/GP",
        "required": True
    }
    
    result = check_document_relevance(
        document_summary=test_document_summary,
        document_key_points=test_key_points,
        structured_data=test_structured_data,
        required_document_spec=test_required_spec
    )
    
    print("\n" + "="*80)
    print("RELEVANCE CHECK RESULT")
    print("="*80)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("="*80)
