"""
OpenAI Agents SDK Call Analyzer
Analyzes voice call conversations using OpenAI's advanced agent capabilities.
"""
import os
import json
import logging
from typing import Dict, Any
from agents import FileSearchTool, RunContextWrapper, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Tool definitions
file_search = FileSearchTool(
    vector_store_ids=[
        "vs_693be980a7348191b8c7cf9ecb62c3b3"
    ]
)


class ConversationSummarySchema(BaseModel):
    call_summary: str
    documents_requested_list: list[str]
    case_summary: str
    key_legal_points: list[str]
    risk_assessment: str
    estimated_claim_amount: str


class ConversationSummaryContext:
    def __init__(self, workflow_input_as_text: str):
        self.workflow_input_as_text = workflow_input_as_text


def conversation_summary_instructions(
    run_context: RunContextWrapper[ConversationSummaryContext],
    _agent: Agent[ConversationSummaryContext]
):
    workflow_input_as_text = run_context.context.workflow_input_as_text
    return f"""You are a legal case analyst for disability claims. Analyze the following voice call conversation between an AI intake agent and a claimant.

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
  
  "risk_assessment": "Choose ONE: 'High Viability' or 'Low Viability' or 'Needs More Info' - assess based on quality/completeness of information gathered",
  
  "estimated_claim_amount": "Estimated compensation range based on the conditions and severity discussed (e.g., '50,000-100,000 NIS' or 'Pending medical evaluation')"
}}

CRITICAL INSTRUCTIONS:
1. Be thorough and professional - this will be used by legal staff
2. For documents_requested_list: Be VERY specific. Don't just say "medical records" - specify what type of medical records for which condition
3. Extract ALL medical conditions mentioned (primary and secondary/related)
4. Note specific dates mentioned (diagnosis dates, onset of work difficulties)
5. Include functional limitations discussed (inability to sit/stand, mobility issues, cognitive impacts, etc.)
6. The call_summary should be comprehensive enough that someone who didn't hear the call can fully understand what was discussed
7. If the conversation does NOT discuss any medical conditions or disability claims, set risk_assessment to "Low Viability" and note this in the call_summary
8. Only include documents in documents_requested_list if actual medical conditions were discussed

Context: {workflow_input_as_text}"""


conversation_summary = Agent(
    name="conversation summary",
    instructions=conversation_summary_instructions,
    model="gpt-4o-mini",
    tools=[file_search],
    output_type=ConversationSummarySchema,
    model_settings=ModelSettings(
        store=False,  # Disable caching for fresh analysis
        temperature=0.3  # Add slight randomness to prevent identical responses
    )
)


class WorkflowInput(BaseModel):
    input_as_text: str


async def run_workflow(workflow_input: WorkflowInput):
    """Run the OpenAI agent workflow to analyze the call conversation."""
    with trace("conversation agent"):
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
            input=[*conversation_history],
            run_config=RunConfig(
                trace_metadata={
                    "__trace_source__": "agent-builder",
                    "workflow_id": "wf_693be850972481908f9381459490d2af0e6c4609c9868f8a"
                }
            ),
            context=ConversationSummaryContext(
                workflow_input_as_text=workflow["input_as_text"]
            )
        )
        conversation_summary_result = {
            "output_text": conversation_summary_result_temp.final_output.json(),
            "output_parsed": conversation_summary_result_temp.final_output.model_dump()
        }
        
        return conversation_summary_result


async def analyze_call_conversation_openai(transcript: str, messages: list) -> Dict[str, Any]:
    """
    Analyze a voice call conversation using OpenAI Agents SDK.
    Returns the exact output from the agent to be stored in DB.
    """
    try:
        if not os.getenv('OPENAI_API_KEY'):
            raise ValueError("OPENAI_API_KEY not configured")
        
        # Prepare input for the workflow
        workflow_input = WorkflowInput(
            input_as_text=f"CONVERSATION TRANSCRIPT:\n{transcript}\n\nMESSAGES:\n{json.dumps(messages, indent=2)}"
        )
        
        # Run the agent workflow
        result_wrapper = await run_workflow(workflow_input)
        result = result_wrapper['output_parsed']
        
        # Print what the agent returned
        print("\n" + "="*80)
        print("🤖 OPENAI AGENT OUTPUT")
        print("="*80)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("="*80 + "\n")
        
        return result
        
    except Exception as e:
        logger.exception(f"OpenAI call analysis failed: {e}")
        return {
            'call_summary': f"Call analysis failed. Please review transcript manually. Error: {str(e)[:100]}",
            'documents_requested_list': [],
            'case_summary': "Analysis pending - manual review required",
            'key_legal_points': ["Analysis failed - manual review required"],
            'risk_assessment': 'Needs More Info',
            'estimated_claim_amount': 'Pending evaluation'
        }
