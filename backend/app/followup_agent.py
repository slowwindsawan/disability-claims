"""
Follow-up Question Agent
Analyzes conversation summary and document summaries to identify ambiguities
and generate follow-up questions based on BTL disability evaluation guidelines.
"""
import logging
import json
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

logger = logging.getLogger('followup_agent')

class FollowUpResponse(BaseModel):
    """Response schema for follow-up analysis"""
    followup_questions: List[str]


async def analyze_for_followup(
    call_summary: str,
    document_summaries: List[Dict[str, Any]],
    case_id: str,
    provider: str = 'gpt'
) -> FollowUpResponse:
    """
    Analyze conversation summary and document summaries to identify follow-up questions.
    
    Args:
        call_summary: The conversation/interview summary (without documents_requested_list)
        document_summaries: Array of document summary objects from cases table
        case_id: The case ID being analyzed
        provider: AI provider to use ('gpt' or 'gemini')
    
    Returns:
        FollowUpResponse with follow-up questions if any ambiguities found
    """
    logger.info("="*80)
    logger.info(f"FOLLOW-UP ANALYSIS AGENT - Case ID: {case_id}")
    
    # Combine all document summaries into context
    documents_context = ""
    if document_summaries:
        documents_context = "\n\n=== MEDICAL DOCUMENTS ANALYZED ===\n"
        for idx, doc in enumerate(document_summaries, 1):
            documents_context += f"\n--- Document {idx}: {doc.get('file_name', 'Unknown')} ---\n"
            documents_context += f"Type: {doc.get('document_type', 'Unknown')}\n"
            documents_context += f"Relevant: {doc.get('is_relevant', 'Unknown')}\n"
            documents_context += f"Summary: {doc.get('summary', 'No summary available')}\n"
            if doc.get('key_points'):
                documents_context += f"Key Points:\n"
                for point in doc.get('key_points', []):
                    documents_context += f"  • {point}\n"
            documents_context += "\n"
    
    # Construct the full context
    full_context = f"""CLAIMANT INTERVIEW SUMMARY:
{call_summary}

{documents_context}"""
    
    prompt = f"""You are a legal case analyst specializing in disability claims, with expertise in interpreting and applying BTL disability evaluation guidelines.

You will be provided with:
- The claimant's interview summary
- The claimant's medical records and history
- The applicable BTL disability evaluation guidelines

Objective
Analyze the claimant's interview and medical records strictly under the BTL guidelines to determine whether any follow-up information is required to remove ambiguity, clarify eligibility, and ensure the claim is evaluated at the highest supportable level under the guidelines.

Your role is not to reassess medical facts, but to identify missing, unclear, or insufficient information that—if clarified—could materially impact eligibility, impairment classification, or benefit amount under the BTL framework.

Instructions
- Carefully review the full context, including:
  - The claimant's statements from the interview
  - Medical diagnoses, clinical findings, test results, treatment history, and functional limitations
- Extract all findings relevant to disability determination.
- Map each finding explicitly to the corresponding BTL guideline requirement or criterion.
- Identify only material ambiguities or gaps that prevent:
  - A clear guideline-based determination, or
  - Full consideration of the maximum claim amount supported by the evidence

Follow-up Rules (Strict)
- Generate follow-up questions only when required by the BTL guidelines to:
  - Clarify missing or ambiguous criteria
  - Substantiate severity, duration, functional impact, or causation
  - Resolve uncertainty that could affect eligibility or benefit level
- Do not ask follow-up questions for:
  - Minor inconsistencies
  - Redundant or already implied information
  - Details not required or not weighted under the BTL guidelines

Output Requirements
Return ONLY valid JSON in this exact format:
{{
  "has_followup_questions": boolean (true if follow-up needed, false if case is complete),
  "followup_questions": ["Array of specific follow-up questions that reference BTL guideline criteria. Empty array if no follow-up needed."],
  "analysis_summary": "Brief 2-3 sentence summary of your analysis and whether the case has sufficient information for evaluation.",
  "ambiguities_found": ["List of specific ambiguities or gaps found that require clarification. Empty array if none found."]
}}

Rules:
- If NO follow-up is required, set has_followup_questions to false and return empty arrays
- Each question must be specific, unambiguous, and directly reference a BTL guideline criterion
- Questions must be necessary to support a higher or clearer claim determination
- Do not generate questions for minor details or information already implied in the documents

Context:
{full_context}
"""

    try:
        if provider == 'gemini':
            from .gemini_client import call_gemini
            logger.info(f"Calling Gemini API for follow-up analysis")
            response = call_gemini(prompt, temperature=0.2, max_output_tokens=3000)
            
            # Extract text from Gemini response
            if isinstance(response, dict) and 'candidates' in response:
                text = response['candidates'][0]['content']['parts'][0]['text']
            else:
                text = str(response)
        else:
            from .eligibility_processor import _call_gpt, _extract_text_from_gpt_response
            logger.info(f"Calling OpenAI API for follow-up analysis")
            response = _call_gpt(prompt, temperature=0.2, max_output_tokens=3000)
            text = _extract_text_from_gpt_response(response)
        
        logger.info("-"*80)
        logger.info(f"AI Response (first 1000 chars):\n{text[:1000]}")
        logger.info("-"*80)
        
        # Parse JSON response
        # Strip markdown code blocks if present
        if text.strip().startswith('```'):
            text = text.strip()
            if text.startswith('```json'):
                text = text[7:]
            elif text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
        
        result = json.loads(text)
        
        # Validate and construct response
        response_obj = FollowUpResponse(
            followup_questions=result.get('followup_questions', [])
        )
        
        logger.info("✓ Follow-up analysis complete")
        logger.info(f"  Number of questions: {len(response_obj.followup_questions)}")
        logger.info(f"  Has follow-up: {len(response_obj.followup_questions) > 0}")
        if response_obj.followup_questions:
            logger.info("  Questions:")
            for idx, q in enumerate(response_obj.followup_questions, 1):
                logger.info(f"    {idx}. {q}")
        else:
            logger.info("  Case is complete - no follow-up needed")
        logger.info("="*80)
        
        return response_obj
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        logger.error(f"Response text: {text}")
        raise ValueError(f"Invalid JSON response from AI: {str(e)}")
    except Exception as e:
        logger.exception("Follow-up analysis failed")
        raise
