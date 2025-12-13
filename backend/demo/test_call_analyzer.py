"""
Test script for the call conversation analyzer agent.
Fetches call details from Vapi and tests the OpenAI Agents SDK analysis.
"""
import os
import sys
import json
import asyncio
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Import OpenAI Agents SDK
from agents import FileSearchTool, RunContextWrapper, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace
from pydantic import BaseModel
from openai.types.shared.reasoning import Reasoning

# VAPI call ID to test with
CALL_ID = "019b0e04-9d04-7ff1-b039-c48253d81bbf"

# Case ID for context
CASE_ID = "3a59f69e-41a5-4c4e-ba8b-82173bbbd68b"


# ============================================================================
# OpenAI Agent Configuration
# ============================================================================

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

Context: {workflow_input_as_text}"""


conversation_summary = Agent(
    name="conversation summary",
    instructions=conversation_summary_instructions,
    model="gpt-5-mini",
    tools=[file_search],
    output_type=ConversationSummarySchema,
    model_settings=ModelSettings(
        store=True,
        # reasoning=Reasoning(
        #     effort="high",
        #     summary="concise"
        # )
    )
)


class WorkflowInput(BaseModel):
    input_as_text: str


# Main code entrypoint
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


def fetch_vapi_call_details(call_id: str):
    """Fetch call details from Vapi API."""
    try:
        from vapi import Vapi
        
        vapi_token = os.getenv('VAPI_API_KEY')
        if not vapi_token:
            print("❌ VAPI_API_KEY not found in environment")
            return None
        
        print(f"📞 Fetching call details from Vapi API...")
        print(f"   Call ID: {call_id}")
        
        client = Vapi(token=vapi_token)
        call_details = client.calls.get(id=call_id)
        
        # Convert to dict
        call_dict = call_details.model_dump(mode='json') if hasattr(call_details, 'model_dump') else call_details.dict()
        
        print(f"✅ Successfully fetched call details")
        print(f"   Status: {call_dict.get('status')}")
        print(f"   Duration: {call_dict.get('endedAt')} - {call_dict.get('startedAt')}")
        print(f"   Transcript length: {len(call_dict.get('transcript', ''))} characters")
        print(f"   Message count: {len(call_dict.get('messages', []))} messages")
        
        return call_dict
        
    except Exception as e:
        print(f"❌ Failed to fetch call details: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_analyzer(call_details: dict):
    """Test the call analyzer with fetched call details."""
    if not call_details:
        print("❌ No call details to analyze")
        return None
    
    transcript = call_details.get('transcript', '')
    messages = call_details.get('messages', [])
    
    if not transcript:
        print("❌ No transcript found in call details")
        return None
    
    print("\n" + "="*80)
    print("🤖 TESTING OPENAI CALL ANALYZER AGENT")
    print("="*80)
    
    print(f"\n📝 Input:")
    print(f"   Transcript length: {len(transcript)} characters")
    print(f"   Message count: {len(messages)} messages")
    print(f"\n   First 500 chars of transcript:")
    print(f"   {transcript[:500]}...")
    
    print(f"\n⚙️  Analyzing conversation with OpenAI Agent (GPT-5-mini with high reasoning)...")
    
    try:
        # Prepare input for the workflow
        workflow_input = WorkflowInput(
            input_as_text=f"CONVERSATION TRANSCRIPT:\n{transcript}\n\nMESSAGES:\n{json.dumps(messages, indent=2)}"
        )
        
        # Run the agent workflow
        result_wrapper = await run_workflow(workflow_input)
        result = result_wrapper['output_parsed']
        
        print(f"\n✅ Analysis completed successfully!")
        print("\n" + "="*80)
        print("📊 ANALYSIS RESULTS")
        print("="*80)
        
        # Print call summary
        print(f"\n📋 CALL SUMMARY:")
        print(f"{'-'*80}")
        summary = result.get('call_summary', '')
        # Wrap text at 80 chars
        for i in range(0, len(summary), 80):
            print(f"{summary[i:i+80]}")
        
        # Print documents list
        print(f"\n📄 DOCUMENTS REQUESTED ({len(result.get('documents_requested_list', []))}):")
        print(f"{'-'*80}")
        for i, doc in enumerate(result.get('documents_requested_list', []), 1):
            print(f"{i}. {doc}")
        
        # Print case summary
        print(f"\n⚖️  CASE SUMMARY:")
        print(f"{'-'*80}")
        case_summary = result.get('case_summary', '')
        for i in range(0, len(case_summary), 80):
            print(f"{case_summary[i:i+80]}")
        
        # Print key legal points
        print(f"\n🔑 KEY LEGAL POINTS ({len(result.get('key_legal_points', []))}):")
        print(f"{'-'*80}")
        for i, point in enumerate(result.get('key_legal_points', []), 1):
            print(f"{i}. {point}")
        
        # Print risk assessment
        print(f"\n⚠️  RISK ASSESSMENT:")
        print(f"{'-'*80}")
        print(f"{result.get('risk_assessment', 'Unknown')}")
        
        # Print estimated claim amount (NEW)
        print(f"\n💰 ESTIMATED CLAIM AMOUNT:")
        print(f"{'-'*80}")
        print(f"{result.get('estimated_claim_amount', 'Not estimated')}")
        
        # Save to file
        output_file = Path(__file__).parent / f"call_analysis_{CALL_ID[:8]}_openai.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Full analysis saved to: {output_file}")
        
        return result
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return None


def compare_with_vapi_analysis(call_details: dict, our_analysis: dict):
    """Compare our analysis with Vapi's original analysis."""
    print("\n" + "="*80)
    print("🔍 COMPARISON: Our Analysis vs Vapi Analysis")
    print("="*80)
    
    vapi_analysis = call_details.get('analysis', {})
    
    if not vapi_analysis:
        print("\n⚠️  No Vapi analysis found in call details")
        return
    
    # Compare summaries
    print(f"\n📋 SUMMARY COMPARISON:")
    print(f"{'-'*80}")
    
    vapi_summary = vapi_analysis.get('summary', '')
    our_summary = our_analysis.get('call_summary', '')
    
    print(f"\n🔵 Vapi Summary ({len(vapi_summary)} chars):")
    for i in range(0, len(vapi_summary), 80):
        print(f"   {vapi_summary[i:i+80]}")
    
    print(f"\n🟢 Our Summary ({len(our_summary)} chars):")
    for i in range(0, len(our_summary), 80):
        print(f"   {our_summary[i:i+80]}")
    
    # Compare document lists
    print(f"\n📄 DOCUMENT LIST COMPARISON:")
    print(f"{'-'*80}")
    
    vapi_docs = vapi_analysis.get('structuredData', {}).get('documents_requested_list', [])
    our_docs = our_analysis.get('documents_requested_list', [])
    
    print(f"\n🔵 Vapi Documents ({len(vapi_docs)}):")
    for i, doc in enumerate(vapi_docs, 1):
        print(f"   {i}. {doc}")
    
    print(f"\n🟢 Our Documents ({len(our_docs)}):")
    for i, doc in enumerate(our_docs, 1):
        print(f"   {i}. {doc}")
    
    # Stats
    print(f"\n📊 STATISTICS:")
    print(f"{'-'*80}")
    print(f"Summary length:        Vapi: {len(vapi_summary):4d} chars | Ours: {len(our_summary):4d} chars")
    print(f"Documents requested:   Vapi: {len(vapi_docs):4d} docs  | Ours: {len(our_docs):4d} docs")
    print(f"Improvement factor:    {len(our_summary) / max(len(vapi_summary), 1):.1f}x more detailed summary")
    print("raw ", our_analysis)


async def main():
    """Main test function."""
    print("="*80)
    print("🧪 OPENAI CALL ANALYZER AGENT TEST")
    print("="*80)
    print(f"\nCase ID: {CASE_ID}")
    print(f"Call ID: {CALL_ID}")
    
    # Check environment
    print(f"\n🔧 Environment Check:")
    print(f"   VAPI_API_KEY: {'✅ Set' if os.getenv('VAPI_API_KEY') else '❌ Missing'}")
    print(f"   OPENAI_API_KEY: {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Missing'}")
    
    # Step 1: Fetch call details from Vapi
    print("\n" + "="*80)
    print("STEP 1: Fetch Call Details from Vapi")
    print("="*80)
    call_details = fetch_vapi_call_details(CALL_ID)
    
    if not call_details:
        print("\n❌ Test failed: Could not fetch call details")
        return
    
    # Step 2: Test our analyzer
    print("\n" + "="*80)
    print("STEP 2: Analyze with Our OpenAI Agent")
    print("="*80)
    our_analysis = await test_analyzer(call_details)
    
    if not our_analysis:
        print("\n❌ Test failed: Analysis failed")
        return
    
    # Step 3: Compare with Vapi's analysis
    print("\n" + "="*80)
    print("STEP 3: Compare Results")
    print("="*80)
    compare_with_vapi_analysis(call_details, our_analysis)
    
    print("\n" + "="*80)
    print("✅ TEST COMPLETED SUCCESSFULLY")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
