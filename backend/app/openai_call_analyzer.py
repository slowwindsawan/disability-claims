"""
OpenAI Agents SDK Call Analyzer
Analyzes voice call conversations using OpenAI's advanced agent capabilities.
"""
import os
import json
import logging
from typing import Dict, Any, List
from pathlib import Path
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
# BTL Guidelines Helper
# ------------------------------------------------------------------

def load_btl_guidelines() -> List[Dict[str, Any]]:
    """Load BTL guidelines from btl.json"""
    btl_path = Path(__file__).parent / "btl.json"
    try:
        with open(btl_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            logger.debug(f"[BTL] Loaded {len(data)} BTL guideline topics")
            return data
    except Exception as e:
        logger.error(f"[BTL] Failed to load BTL guidelines: {e}")
        return []

def get_btl_content_by_topics(topic_ids: List[str]) -> str:
    """Extract BTL content for specified topic IDs"""
    logger.debug(f"[BTL] Extracting content for {len(topic_ids)} topic IDs: {topic_ids}")
    if not topic_ids:
        logger.debug("[BTL] No topic IDs provided - returning empty content")
        return ""
    
    btl_data = load_btl_guidelines()
    relevant_content = []
    topics_found = []
    
    for topic in btl_data:
        if topic.get("topic_id") in topic_ids:
            topic_name = topic.get('topic_name', '')
            topics_found.append(topic_name)
            logger.debug(f"[BTL] ✓ Found matching topic: {topic.get('topic_id')} - {topic_name}")
            
            content = f"\n### {topic_name} (BTL Section {topic.get('btl_section', '')})\n"
            content += f"Strategy: {topic.get('vopi_strategy', '')}\n\n"
            
            # Add rules
            if "rules" in topic and topic["rules"]:
                rules_count = len(topic["rules"])
                logger.debug(f"[BTL]   - Adding {rules_count} rules for {topic.get('topic_id')}")
                content += "**Rules and Criteria:**\n"
                for rule in topic["rules"]:
                    content += f"- [{rule.get('code', '')}] {rule.get('criteria', '')}\n"
                    percent = rule.get('percent') or 0
                    if percent > 0:
                        content += f"  Percentage: {percent}%\n"
                content += "\n"
            
            # Add required documents
            if "required_docs" in topic and topic["required_docs"]:
                docs_count = len(topic["required_docs"])
                logger.debug(f"[BTL]   - Adding {docs_count} required documents for {topic.get('topic_id')}")
                content += "**Required Documents:**\n"
                for doc in topic["required_docs"]:
                    content += f"- {doc}\n"
                content += "\n"
            
            relevant_content.append(content)
    
    if topics_found:
        logger.info(f"[BTL] ✅ Successfully extracted {len(topics_found)} topics: {', '.join(topics_found)}")
    else:
        logger.warning(f"[BTL] ⚠️  No matching topics found for IDs: {topic_ids}")
    
    if relevant_content:
        full_content = "\n\n=== RELEVANT BTL GUIDELINES ===\n" + "".join(relevant_content)
        logger.debug(f"[BTL] Generated {len(full_content)} chars of guideline content")
        return full_content
    return ""

def extract_related_topics_from_call_details(call_details: Dict[str, Any]) -> List[str]:
    """Extract related_topics array from call_details.analysis.structuredData.
    Returns empty list if not found - caller should use topic classifier.
    """
    try:
        topics = call_details.get("analysis", {}).get("structuredData", {}).get("related_topics", [])
        logger.debug(f"[BTL] Extracted topics from call_details: {topics}")
        
        # Return what we found (may be empty - classifier will be used)
        if not topics:
            logger.info("[BTL] ℹ️  No related_topics in call_details - will use topic classifier")
            return []
        
        return topics
    except Exception as e:
        logger.warning(f"[BTL] Failed to extract related_topics from call_details: {e}")
        return []

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
    strength_score: float  # 0-100 rating of claim strength based on interview data


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
    
    # Default/fallback prompt
    default_prompt = """You are a legal case analyst specializing in disability claims, with expertise in interpreting and applying BTL disability evaluation guidelines.

You will be provided with:
- The claimant's interview summary
- The claimant's medical records and history
- The applicable BTL disability evaluation guidelines

Objective
Analyze the claimant's interview and medical records strictly under the provided BTL guidelines and produce a structured JSON output matching the ConversationSummarySchema.

Required behavior (schema-first):
1. Always return all fields required by the ConversationSummarySchema.
2. Documents requested are allowed and should be returned **only** in structured form via `documents_requested_list`.
3. Numeric fields (money/amounts) and booleans:
   - If you can compute them strictly from evidence and BTL rules, return that value.
   - If the information is insufficient, return **0** for numeric values, **false** for booleans, and an empty list where applicable. Do NOT guess.
4. Follow-up questions:
   - If follow-up is required, include the follow-up questions as entries in `documents_requested_list` or in `key_legal_points` as an array element labeled clearly.
   - Do not output follow-ups as free text-only that violates the schema.

Instructions
- Map each finding to the relevant BTL rule (include rule code where relevant).
- Calculate `chance_of_approval` (0–100) as a numeric value with a one-line justification inside `case_summary`.
- Calculate `strength_score` (0–100) based on:
  - Completeness of interview data (30 points): Full medical history, symptoms, functional limitations
  - Evidence quality (30 points): Medical documentation, specialist assessments, test results
  - Claim clarity (20 points): Clear connection between condition and disability, work impact
  - BTL guideline alignment (20 points): How well the claim fits BTL disability categories
- For `documents_requested_list`, use `required_docs` and/or probing questions from the BTL topic to populate `name` and `reason`. Set `uploaded` appropriately.
- Do NOT pretty-print or include raw JSON dumps in the response.
- Response in Hebrew only.

Conservatism rules:
- When in doubt, prefer conservative outputs (0, false, empty lists) rather than guesses.
- Use the provided BTL rules only — do not invent monetary formulas unless explicitly given."""
    
    # Fetch prompt from database using the helper function
    from .supabase_client import get_agent_prompt
    
    logger.info("[AGENT] 🔍 Fetching prompt from agents table...")
    agent_config = get_agent_prompt('call_summary_generator', fallback_prompt=default_prompt)
    agent_prompt = agent_config.get('prompt', default_prompt)
    
    if agent_prompt != default_prompt:
        logger.info("[AGENT] ✅ Using prompt from database")
    else:
        logger.info("[AGENT] ℹ️  Using default fallback prompt")
    
    # Always append the dynamic context section
    full_prompt = f"""{agent_prompt}

Context
Claimant interview and medical records:
 context: {workflow_input_as_text}"""
    
    return full_prompt


# ------------------------------------------------------------------
# Agent
# ------------------------------------------------------------------

def create_conversation_summary_agent(model: str = "gpt-4o"):
    """Create agent with appropriate settings based on model"""
    
    # Check if model is gpt-5-nano which requires reasoning
    if "gpt-5" in model.lower():
        logger.info(f"[AGENT] Creating agent with model {model} and reasoning enabled")
        return Agent(
            name="conversation summary",
            instructions=conversation_summary_instructions,
            model=model,
            output_type=ConversationSummarySchema,
            model_settings=ModelSettings(
                reasoning=Reasoning(
                    effort="medium",
                    summary="concise"
                )
            )
        )
    else:
        logger.info(f"[AGENT] Creating agent with model {model} (no reasoning)")
        return Agent(
            name="conversation summary",
            instructions=conversation_summary_instructions,
            model=model,
            output_type=ConversationSummarySchema,
            model_settings=ModelSettings()
        )

# Default agent instance (will be recreated dynamically if model changes)
conversation_summary = create_conversation_summary_agent()

# ------------------------------------------------------------------
# Workflow input
# ------------------------------------------------------------------

class WorkflowInput(BaseModel):
    input_as_text: str


# ------------------------------------------------------------------
# Runner
# ------------------------------------------------------------------

async def run_workflow(workflow_input: WorkflowInput):
    # Fetch agent configuration from database to get the model
    from .supabase_client import get_agent_prompt
    agent_config = get_agent_prompt('call_summary_generator')
    model = agent_config.get('model', 'gpt-4o')
    
    logger.info(f"[AGENT] Using model from database: {model}")
    # Note: OpenAI API key is already set in os.environ at application startup
    
    # Create agent with the configured model
    agent_instance = create_conversation_summary_agent(model)
    
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
            agent_instance,
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
    call_details: Dict[str, Any] | None = None,
) -> Dict[str, Any]:

    try:
        logger.info("[AGENT] ═══════════════════════════════════════════")
        logger.info("[AGENT] Starting OpenAI Call Analyzer")
        logger.info(f"[AGENT] Transcript length: {len(transcript) if transcript else 0} chars")
        logger.info(f"[AGENT] Messages count: {len(messages) if messages else 0}")
        logger.info(f"[AGENT] Eligibility records: {len(eligibility_records) if eligibility_records else 0}")
        logger.info(f"[AGENT] Call details provided: {call_details is not None}")
        
        # Get OpenAI API key from database with fallback to environment
        from .secrets_utils import get_openai_api_key
        openai_key = get_openai_api_key()
        if not openai_key:
            raise ValueError("OPENAI_API_KEY not configured in database or environment")

        eligibility_context = ""
        if eligibility_records:
            logger.info(f"[AGENT] 📋 Processing {len(eligibility_records)} eligibility records")
            eligibility_context += "\n\nUSER ELIGIBILITY DATA:\n"
            for idx, record in enumerate(eligibility_records, 1):
                eligibility_context += f"\nRecord {idx}:\n"
                eligibility_context += f"  - Uploaded file: {record.get('uploaded_file', 'N/A')}\n"
                eligibility_context += f"  - Eligibility data: {json.dumps(record.get('eligibility_raw', {}), indent=2)}\n"
        else:
            logger.info("[AGENT] ℹ️  No eligibility records provided")

        # Extract and include BTL guidelines based on related topics
        btl_guidelines_context = ""
        related_topics = []
        
        if call_details:
            logger.info("[AGENT] 🔍 Extracting related topics from call_details...")
            logger.info(f"[AGENT] 🔍 call_details keys: {list(call_details.keys())}")
            logger.info(f"[AGENT] 🔍 call_details has 'analysis': {'analysis' in call_details}")
            
            if 'analysis' in call_details:
                analysis = call_details.get('analysis', {})
                logger.info(f"[AGENT] 🔍 analysis keys: {list(analysis.keys()) if isinstance(analysis, dict) else 'NOT A DICT'}")
                logger.info(f"[AGENT] 🔍 analysis has 'structuredData': {'structuredData' in analysis if isinstance(analysis, dict) else False}")
                
            related_topics = extract_related_topics_from_call_details(call_details)
            logger.info(f"[AGENT] Related topics extracted: {related_topics}")
        
        # If no topics found, use topic classifier agent
        if not related_topics:
            logger.info("[AGENT] 🤖 No topics in call_details - invoking Topic Classifier Agent...")
            from .openai_topic_classifier_agent import classify_btl_topics
            try:
                related_topics = await classify_btl_topics(transcript, messages)
                logger.info(f"[AGENT] ✅ Topic Classifier identified {len(related_topics)} topics: {related_topics}")
            except Exception as e:
                logger.error(f"[AGENT] ❌ Topic Classifier failed: {e} - proceeding without BTL guidelines")
                related_topics = []
        
        # Load BTL guidelines for identified topics
        if related_topics:
            logger.info(f"[AGENT] ✅ Using {len(related_topics)} related BTL topics: {related_topics}")
            btl_guidelines_context = get_btl_content_by_topics(related_topics)
            logger.info(f"[AGENT] 📚 BTL guidelines context length: {len(btl_guidelines_context)} chars")
        else:
            logger.warning("[AGENT] ⚠️  No related topics identified - BTL guidelines will NOT be included!")

        workflow_input = WorkflowInput(
            input_as_text=(
                f"CONVERSATION TRANSCRIPT:\n{transcript}\n\n"
                f"MESSAGES:\n{json.dumps(messages, indent=2)}"
                f"{eligibility_context}"
                f"{btl_guidelines_context}"
            )
        )

        final_input_length = len(workflow_input.input_as_text)
        logger.info(f"[AGENT] 📊 Final workflow input size: {final_input_length} chars")
        logger.info(f"[AGENT] [Components] Transcript: {len(transcript)}c | Messages: {len(json.dumps(messages, indent=2))}c | Eligibility: {len(eligibility_context)}c | BTL: {len(btl_guidelines_context)}c")
        
        # Print the BTL guidelines section of the prompt
        if btl_guidelines_context:
            logger.info(f"[AGENT] 📚 BTL Guidelines section being sent to agent:")
            logger.info(f"[AGENT] {'='*60}")
            logger.info(btl_guidelines_context)
            logger.info(f"[AGENT] {'='*60}")
        else:
            logger.warning(f"[AGENT] ⚠️  No BTL guidelines context included in prompt")
        
        logger.info("[AGENT] ▶️  Running OpenAI agent workflow...")
        result_wrapper = await run_workflow(workflow_input)

        logger.info("[AGENT] ✅ Workflow completed successfully")
        
        # Print full result_wrapper for debugging
        logger.info("\033[96m" + "="*80)
        logger.info("[AGENT] 🔵 FULL RESULT WRAPPER:")
        logger.info(json.dumps(result_wrapper, indent=2, ensure_ascii=False, default=str))
        logger.info("="*80 + "\033[0m")
        
        # Check for errors in result_wrapper
        if "error" in result_wrapper:
            logger.error("\033[91m" + "="*80)
            logger.error("[AGENT] 🔴 ERROR IN RESULT WRAPPER:")
            logger.error(json.dumps(result_wrapper["error"], indent=2, ensure_ascii=False, default=str))
            logger.error("="*80 + "\033[0m")
        
        result = result_wrapper["output_parsed"]
        
        # Print raw output in green
        logger.info("\033[92m" + "="*80)
        logger.info("[AGENT] 🟢 RAW CALL SUMMARY AGENT OUTPUT:")
        logger.info(json.dumps(result, indent=2, ensure_ascii=False))
        logger.info("="*80 + "\033[0m")
        
        logger.info(f"[AGENT] 📝 Analysis result summary:")
        logger.info(f"[AGENT]   - Risk Assessment: {result.get('risk_assessment', 'N/A')}")
        logger.info(f"[AGENT]   - Chance of Approval: {result.get('chance_of_approval', 'N/A')}%")
        logger.info(f"[AGENT]   - Documents Requested: {len(result.get('documents_requested_list', []))} items")
        logger.info(f"[AGENT]   - Products: {result.get('products', [])}")
        logger.info("[AGENT] ═══════════════════════════════════════════")

        return result

    except Exception as e:
        logger.error("\033[91m" + "="*80)
        logger.error("[AGENT] 🔴 EXCEPTION CAUGHT:")
        logger.error(f"[AGENT] Exception type: {type(e).__name__}")
        logger.error(f"[AGENT] Exception message: {str(e)}")
        import traceback
        logger.error(f"[AGENT] Traceback:\n{traceback.format_exc()}")
        logger.exception("[AGENT] ❌ AGENT ERROR")
        logger.error("="*80 + "\033[0m")
        logger.info("[AGENT] ═══════════════════════════════════════════")
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
            "chance_of_approval": 0.0,
            "strength_score": 0.0,
        }
