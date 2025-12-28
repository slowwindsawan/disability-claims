"""
OpenAI Agents SDK Call Analyzer
Analyzes voice call conversations using OpenAI's advanced agent capabilities.
"""
import os
import json
import logging
from typing import Dict, Any
from agents import (
    FileSearchTool,
    RunContextWrapper,
    Agent,
    ModelSettings,
    TResponseInputItem,
    Runner,
    RunConfig,
    trace,
)
from pydantic import BaseModel
from openai.types.shared.reasoning import Reasoning

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Tool definitions
# ------------------------------------------------------------------

file_search = FileSearchTool(
    vector_store_ids=[
        "vs_693be980a7348191b8c7cf9ecb62c3b3"
    ]
)

# ------------------------------------------------------------------
# Output schema
# ------------------------------------------------------------------

class ConversationSummarySchema__DocumentsRequestedListItem(BaseModel):
    name: str
    reason: str
    source: str
    required: bool
    uploaded: bool


class ConversationSummarySchema(BaseModel):
    call_summary: str
    documents_requested_list: list[ConversationSummarySchema__DocumentsRequestedListItem]
    case_summary: str
    key_legal_points: list[str]
    risk_assessment: str
    estimated_claim_amount: float
    degree_funding: float
    monthly_allowance: float
    income_tax_exemption: bool
    living_expenses: float
    products: list[str]
    chance_of_approval: float


# ------------------------------------------------------------------
# Context
# ------------------------------------------------------------------

class ConversationSummaryContext:
    def __init__(self, workflow_input_as_text: str):
        self.workflow_input_as_text = workflow_input_as_text


# ------------------------------------------------------------------
# Instructions
# ------------------------------------------------------------------

def conversation_summary_instructions(
    run_context: RunContextWrapper[ConversationSummaryContext],
    _agent: Agent[ConversationSummaryContext],
):
    workflow_input_as_text = run_context.context.workflow_input_as_text
    return f"""You are a legal case analyst specializing in disability claims, with expertise in interpreting and applying BTL disability evaluation guidelines.

You will be provided with:
- The claimant's interview summary
- The claimant's medical records and history
- The applicable BTL disability evaluation guidelines

Objective
Analyze the claimant's interview and medical records strictly under the BTL guidelines to determine:
1. The chance of approval (0-100%) based on the strength of the case
2. Whether any follow-up information is required to remove ambiguity, clarify eligibility, and ensure the claim is evaluated at the highest supportable level under the guidelines

Your role is not to reassess medical facts, but to:
- Calculate the realistic probability of claim approval based on evidence alignment with BTL requirements
- Identify missing, unclear, or insufficient information that—if clarified—could materially impact eligibility, impairment classification, or benefit amount under the BTL framework

Instructions
- Carefully review the full context, including:
  - The claimant's statements from the interview
  - Medical diagnoses, clinical findings, test results, treatment history, and functional limitations
- Extract all findings relevant to disability determination
- Map each finding explicitly to the corresponding BTL guideline requirement or criterion
- Calculate chance_of_approval based on:
  - Strength of medical evidence supporting impairment
  - Alignment with BTL diagnostic and functional criteria
  - Completeness of documentation
  - Severity and duration of condition
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
- ALWAYS calculate chance_of_approval (0-100%) as a numeric value
- ALWAYS populate products array with the type(s) of claim identified (e.g., "Work Disability", "Permanent Disability", "Temporary Disability", "Partial Disability", etc.)
  - The products field must contain at least one value in every case
  - Multiple claim types can be listed if applicable
- If follow-up is required, output only the follow-up questions, formatted as a bullet list
- Each question must:
  - Be specific and unambiguous
  - Directly reference a missing or unclear BTL guideline criterion
  - Be necessary to support a higher or clearer claim determination
- If no follow-up is required, output nothing at all in documents (no text, no placeholders, no explanations)

Context
Claimant interview and medical records:
 context: {workflow_input_as_text} """


# ------------------------------------------------------------------
# Agent
# ------------------------------------------------------------------

conversation_summary = Agent(
    name="conversation summary",
    instructions=conversation_summary_instructions,
    model="gpt-5-mini",
    tools=[file_search],
    output_type=ConversationSummarySchema,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(
            effort="high",
            summary="concise"
        )
    )
)

# ------------------------------------------------------------------
# Workflow input
# ------------------------------------------------------------------

class WorkflowInput(BaseModel):
    input_as_text: str


# ------------------------------------------------------------------
# Runner
# ------------------------------------------------------------------

async def run_workflow(workflow_input: WorkflowInput):
    with trace("conversation agent"):
        state = {}
        workflow = workflow_input.model_dump()
        conversation_history: list[TResponseInputItem] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": workflow["input_as_text"]
                    }
                ]
            }
        ]
        conversation_summary_result_temp = await Runner.run(
            conversation_summary,
            input=[
                *conversation_history
            ],
            run_config=RunConfig(trace_metadata={
                "__trace_source__": "agent-builder",
                "workflow_id": "wf_693be850972481908f9381459490d2af0e6c4609c9868f8a"
            }),
            context=ConversationSummaryContext(workflow_input_as_text=workflow["input_as_text"])
        )
        conversation_summary_result = {
            "output_text": conversation_summary_result_temp.final_output.json(),
            "output_parsed": conversation_summary_result_temp.final_output.model_dump()
        }
        return conversation_summary_result


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

async def analyze_call_conversation_openai(
    transcript: str,
    messages: list,
    eligibility_records: list | None = None,
) -> Dict[str, Any]:

    try:
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY not configured")

        eligibility_context = ""
        if eligibility_records:
            eligibility_context += "\n\nUSER ELIGIBILITY DATA:\n"
            for idx, record in enumerate(eligibility_records, 1):
                eligibility_context += f"\nRecord {idx}:\n"
                eligibility_context += f"  - Uploaded file: {record.get('uploaded_file', 'N/A')}\n"
                eligibility_context += f"  - Eligibility data: {json.dumps(record.get('eligibility_raw', {}), indent=2)}\n"

        workflow_input = WorkflowInput(
            input_as_text=(
                f"CONVERSATION TRANSCRIPT:\n{transcript}\n\n"
                f"MESSAGES:\n{json.dumps(messages, indent=2)}"
                f"{eligibility_context}"
            )
        )

        logger.info("[AGENT] Running OpenAI agent workflow...")
        result_wrapper = await run_workflow(workflow_input)

        return result_wrapper["output_parsed"]

    except Exception as e:
        logger.exception("[AGENT] ❌ AGENT ERROR")
        return {
            "call_summary": "Call analysis failed. Manual review required.",
            "documents_requested_list": [],
            "case_summary": "Analysis failed",
            "key_legal_points": ["Manual review required"],
            "risk_assessment": "Needs More Info",
            "estimated_claim_amount": 0.0,
            "degree_funding": 0.0,
            "monthly_allowance": 0.0,
            "income_tax_exemption": False,
            "living_expenses": 0.0,
            "products": [],
        }
