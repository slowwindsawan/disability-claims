from agents import Agent, ModelSettings, RunContextWrapper, Runner, RunConfig, TResponseInputItem, trace
from pydantic import BaseModel
from openai.types.shared.reasoning import Reasoning
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Case Validation Output Schema
# ------------------------------------------------------------------

class UploadedFileIssue(BaseModel):
    document_name: str
    document_id: str
    issue_description: str
    severity: str  # "critical", "important", "minor"
    missing_elements: List[str]  # What specific data is missing in this file

class RecommendedDocument(BaseModel):
    document_name: str
    reason: str
    priority: str  # "required", "strongly_recommended", "optional"
    source: str

class CaseStrength(BaseModel):
    overall_score: int  # 0-100
    category: str  # "weak", "moderate", "strong"
    explanation: str

class ValidationResult(BaseModel):
    case_strength: CaseStrength
    strengths: List[str]  # What's good about the case
    uploaded_file_issues: List[UploadedFileIssue]  # Problems with already uploaded files
    recommended_documents: List[RecommendedDocument]  # What else should be uploaded
    risk_factors: List[str]  # Potential risks if proceeding as-is
    approval_probability: int  # 0-100

# ------------------------------------------------------------------
# Agent Context
# ------------------------------------------------------------------

class CaseValidatorContext:
    def __init__(self, input_data: str):
        self.input_data = input_data

def case_validator_instructions(run_context: RunContextWrapper[CaseValidatorContext], _agent: Agent[CaseValidatorContext]):
    input_data = run_context.context.input_data
    return f"""You are an expert case validator for Israeli disability claims (Bituach Leumi / BTL).

Your task: Analyze the provided case data to assess whether the case is ready for Form 7801 submission or if more documentation is needed.

You will receive:
1. call_summary - Contains AI analysis of the initial interview, including:
   - documents_requested_list (what documents were requested)
   - case_summary (initial assessment)
   - risk_assessment
   - chance_of_approval
2. uploaded_documents - List of documents the user has uploaded, with:
   - document name, file_path, metadata
   - OCR text content (if available)
3. eligibility_raw - User's questionnaire responses
4. user_profile - Contact and personal information

Your analysis must:

1. **Case Strength Assessment**
   - Score 0-100 based on completeness, quality, and BTL alignment
   - Categorize as weak (<40), moderate (40-70), or strong (>70)
   - Explain what makes the case strong or weak

2. **Identify Strengths**
   - What evidence is already present
   - Which documents are complete and useful
   - What aspects align well with BTL requirements

3. **Uploaded File Issues**
   - For EACH uploaded document, check if it contains the required information
   - If a medical report lacks treatment chronology, diagnosis dates, or functional assessment - FLAG IT
   - If employment records lack dates, salary info, or termination reason - FLAG IT
   - Specify EXACTLY what is missing from each file
   - Rate severity: critical (case cannot proceed), important (significantly weakens case), minor (nice to have)

4. **Recommended Documents**
   - Based on documents_requested_list from call_summary
   - Check which documents are marked as required but NOT uploaded
   - Check which uploaded documents have issues and need to be re-submitted
   - Prioritize: required (must have), strongly_recommended (greatly improves case), optional (supplementary)

5. **Risk Factors**
   - What could lead to denial or low percentage if proceeding now
   - Gaps in evidence, missing dates, lack of functional assessments
   - Inconsistencies between documents

6. **Approval Probability**
   - Based on current evidence, what's the realistic chance of approval (0-100)
   - Consider BTL requirements for the claimed conditions

**Important Rules:**
- Be specific about what's missing in uploaded files (e.g., "Medical report lacks treatment dates and functional assessment")
- If call_summary says a document is required but it's not uploaded, include it in recommended_documents
- If an uploaded document exists but lacks critical data, list it in uploaded_file_issues AND in recommended_documents (user needs to re-upload)
- Consider BTL guidelines for the claimed disability type
- Be realistic and evidence-based in assessments

Input Data:
{input_data}
"""

case_validator_agent = Agent(
    name="Case Validator",
    instructions=case_validator_instructions,
    model="gpt-4o",
    output_type=ValidationResult
)

# ------------------------------------------------------------------
# Main Validation Function
# ------------------------------------------------------------------

async def validate_case_readiness(input_data: Dict[str, Any]) -> ValidationResult:
    """
    Validate case readiness before Form 7801 generation.
    
    Args:
        input_data: Dict containing:
            - case_id: str
            - call_summary: dict
            - uploaded_documents: list (with OCR text if available)
            - documents_requested_list: list
            - eligibility_raw: dict
            - user_profile: dict
    
    Returns:
        ValidationResult with case assessment and recommendations
    """
    logger.info(f"[VALIDATOR] Starting case validation for case {input_data.get('case_id')}")
    
    try:
        # Prepare input text for agent
        input_text = json.dumps(input_data, indent=2, ensure_ascii=False)
        
        # Create conversation history
        conversation_history: list[TResponseInputItem] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": input_text
                    }
                ]
            }
        ]
        
        # Create context
        context = CaseValidatorContext(input_data=input_text)
        
        # Run agent
        logger.info("[VALIDATOR] Running validation agent...")
        with trace("Case Validation"):
            result = await Runner.run(
                case_validator_agent,
                input=conversation_history,
                run_config=RunConfig(trace_metadata={
                    "__trace_source__": "case-validator",
                    "case_id": input_data.get('case_id')
                }),
                context=context
            )
        
        logger.info(f"[VALIDATOR] Validation complete - Score: {result.final_output.case_strength.overall_score}, Category: {result.final_output.case_strength.category}")
        logger.info(f"[VALIDATOR] Found {len(result.final_output.uploaded_file_issues)} file issues, {len(result.final_output.recommended_documents)} recommended documents")
        
        return result.final_output
        
    except Exception as e:
        logger.exception(f"[VALIDATOR] Error during case validation: {e}")
        raise
