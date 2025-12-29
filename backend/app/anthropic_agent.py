"""
OpenAI-based agent for analyzing disability claim documents.
Uses GPT-4 with structured output.
"""
import os
import logging
import json
from typing import Dict, Any
from openai import AsyncOpenAI

logger = logging.getLogger('openai_agent')
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Define the output schema for Form 7801 analysis
FORM_7801_SCHEMA = {
    "type": "object",
    "properties": {
        "form_7801": {
            "type": "object",
            "properties": {
                "form_version": {"type": "string"},
                "submission_date": {"type": "string"},
                "form_status": {"type": "string", "enum": ["draft", "submitted", "approved", "rejected"]},
                "eligibility_assessment": {"type": "string"},
                "claim_strength": {"type": "number", "minimum": 0, "maximum": 100},
                "key_findings": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "recommended_next_steps": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["form_version", "submission_date", "form_status"]
        },
        "summary": {"type": "string"},
        "strategy": {"type": "string"},
        "claim_rate": {"type": "number"},
        "recommendations": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["form_7801", "summary", "strategy"]
}


async def run_document_analysis_agent(case_id: str, context_text: str) -> Dict[str, Any]:
    """
    Run the OpenAI agent to analyze documents and generate Form 7801 strategy.
    
    Args:
        case_id: The case ID for reference
        context_text: Concatenated summaries of all uploaded documents
    
    Returns:
        Structured analysis result from the agent
    """
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        logger.info(f"🔵 Starting OpenAI agent analysis for case {case_id}")
        
        # Fetch agent configuration from database
        from .supabase_client import get_agent_prompt
        
        # FALLBACK PROMPT (Original hardcoded version - kept for safety)
        fallback_prompt = """You are an expert Israeli disability claims attorney specializing in BTL (Bittuach Leumi - National Insurance Institute) claims.

Your task is to analyze the provided medical documents and generate a comprehensive analysis for Form 7801 (disability pension claim).

**MEDICAL DOCUMENTS SUMMARY:**
{context_text}

**YOUR ANALYSIS TASK:**

Based on the medical documents provided, please:

1. **Assess Eligibility**: Determine if the claimant meets the minimum disability threshold (66.7% functional impairment) according to BTL guidelines.

2. **Evaluate Claim Strength**: Rate the strength of the claim (0-100):
   - 80-100: Excellent case with strong evidence
   - 60-80: Good case with solid documentation
   - 40-60: Moderate case with some gaps
   - 20-40: Weak case with significant documentation gaps
   - 0-20: Very weak case

3. **Identify Key Findings**: Extract the most compelling evidence from the documents that support the disability claim.

4. **Determine Claim Rate**: What percentage of disability should be requested (50%, 66.7%, 75%, 100%)?

5. **Generate Strategy**: Create a comprehensive strategy for submitting the claim, including:
   - Which documents to prioritize
   - Any gaps in documentation
   - Recommended additional evidence
   - Potential weaknesses to address

6. **Recommendations**: Provide specific actionable recommendations for strengthening the claim.

Respond in Hebrew and provide a thorough, professional analysis suitable for submission to the National Insurance Institute.

Return your response as a JSON object with these fields:
{
    "summary": "Brief summary of findings",
    "claim_strength": number (0-100),
    "eligibility_assessment": "Eligibility assessment text",
    "key_findings": ["finding1", "finding2", ...],
    "recommended_claim_rate": "50% or 66.7% or 75% or 100%",
    "strategy": "Comprehensive strategy text",
    "recommendations": ["rec1", "rec2", ...],
    "gaps": ["gap1", "gap2", ...]
}"""
        
        # Load agent configuration from database
        agent_config = get_agent_prompt('form_7801_analyzer', fallback_prompt)
        prompt_template = agent_config['prompt']
        model = agent_config['model']
        
        # Replace context placeholder in prompt
        prompt = prompt_template.replace('{context_text}', context_text)
        
        logger.info(f"Using agent model: {model}")

        # Call OpenAI API with dynamic model from database
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Israeli disability claims attorney. Respond in Hebrew with structured JSON output."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=3000,
            temperature=0.7
        )
        
        analysis_text = response.choices[0].message.content
        logger.info(f"✅ Agent analysis completed. Response length: {len(analysis_text)} chars")
        
        # Try to parse JSON from response
        try:
            # Extract JSON from response (might be wrapped in markdown code blocks)
            if "```json" in analysis_text:
                json_str = analysis_text.split("```json")[1].split("```")[0].strip()
            elif "```" in analysis_text:
                json_str = analysis_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = analysis_text
            
            parsed_response = json.loads(json_str)
        except json.JSONDecodeError:
            logger.warning("⚠️ Could not parse JSON response, using raw text")
            parsed_response = {
                "summary": analysis_text[:500],
                "claim_strength": 65,
                "strategy": analysis_text,
                "recommendations": ["Review medical documentation", "Ensure BTL compliance"]
            }
        
        # Return structured response
        return {
            "form_7801": {
                "form_version": "1.0",
                "submission_date": __import__('datetime').datetime.now().isoformat().split('T')[0],
                "form_status": "draft",
                "eligibility_assessment": parsed_response.get("eligibility_assessment", ""),
                "claim_strength": parsed_response.get("claim_strength", 65),
                "key_findings": parsed_response.get("key_findings", []),
            },
            "summary": parsed_response.get("summary", ""),
            "strategy": parsed_response.get("strategy", ""),
            "claim_rate": parsed_response.get("recommended_claim_rate", "66.7%"),
            "recommendations": parsed_response.get("recommendations", []),
            "gaps": parsed_response.get("gaps", []),
            "case_id": case_id
        }
        
    except Exception as e:
        logger.exception(f"❌ Error in run_document_analysis_agent: {e}")
        raise
