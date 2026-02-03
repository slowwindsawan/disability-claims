"""
OpenAI Topic Classifier Agent
Identifies relevant BTL topics from interview conversations to optimize analysis prompt size.
"""
import os
import json
import logging
from typing import List, Dict, Any
from pathlib import Path
from agents import (
    Agent,
    ModelSettings,
    RunContextWrapper,
    TResponseInputItem,
    Runner,
    RunConfig,
    trace,
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# BTL Topics Metadata
# ------------------------------------------------------------------

def load_btl_topics_metadata() -> List[Dict[str, str]]:
    """Load topic metadata (ID, name, section, strategy) from btl.json"""
    btl_path = Path(__file__).parent / "btl.json"
    try:
        with open(btl_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            topics_metadata = []
            for topic in data:
                topics_metadata.append({
                    'topic_id': topic.get('topic_id', ''),
                    'topic_name': topic.get('topic_name', ''),
                    'btl_section': topic.get('btl_section', ''),
                    'vopi_strategy': topic.get('vopi_strategy', '')
                })
            logger.debug(f"[CLASSIFIER] Loaded {len(topics_metadata)} BTL topic metadata entries")
            return topics_metadata
    except Exception as e:
        logger.error(f"[CLASSIFIER] Failed to load BTL topics metadata: {e}")
        return []

# ------------------------------------------------------------------
# Output Schema
# ------------------------------------------------------------------

class IdentifiedTopic(BaseModel):
    topic_id: str
    topic_name: str
    confidence: float  # 0.0 to 1.0
    reason: str  # Why this topic is relevant

class TopicClassificationResult(BaseModel):
    identified_topics: List[IdentifiedTopic]
    summary: str  # Brief summary of claimant's primary conditions

# ------------------------------------------------------------------
# Context
# ------------------------------------------------------------------

class TopicClassificationContext:
    def __init__(self, interview_content: str, available_topics: str):
        self.interview_content = interview_content
        self.available_topics = available_topics

# ------------------------------------------------------------------
# Instructions
# ------------------------------------------------------------------

def topic_classifier_instructions(
    run_context: RunContextWrapper[TopicClassificationContext],
    _agent: Agent[TopicClassificationContext],
):
    interview_content = run_context.context.interview_content
    available_topics = run_context.context.available_topics
    
    # Fetch prompt from database or use default
    default_prompt = """You are a medical classification specialist with expertise in Israeli BTL (Bituach Leumi) disability evaluation guidelines.

Your task is to analyze an interview conversation and identify which BTL disability topics are relevant to the claimant's case.

Available BTL Topics:
{available_topics}

Instructions:
1. Read the interview content carefully to understand the claimant's medical conditions and functional limitations.
2. For each relevant BTL topic:
   - Assign a confidence score (0.0 to 1.0) based on how clearly the topic applies
   - Provide a brief reason explaining why this topic is relevant
3. Only include topics with confidence >= 0.3 (at least moderately relevant)
4. Be conservative - it's better to include a topic with moderate confidence than to miss it
5. Include ALL potentially relevant topics - the analysis agent will do deeper filtering

Common scenarios:
- Neurological conditions (hemiplegia, paraplegia, cognitive deficits) → neuro_3
- Mental health conditions (depression, anxiety, PTSD, psychosis) → psych_4
- Arm/hand/shoulder injuries or limitations → upperlimbs_5
- Leg/foot/hip mobility issues → lowerlimbs_6
- Hearing loss, speech problems, nasal/throat issues → ent_7
- Dental problems, jaw issues → oral_8
- Burn scars, skin conditions, disfigurement → scars_9
- Procedural questions about claim process → disab_2

Return a structured JSON response with the TopicClassificationResult schema.
"""

    from .supabase_client import get_agent_prompt
    logger.info("[CLASSIFIER] 🔍 Fetching prompt from agents table...")
    agent_config = get_agent_prompt('btl_topic_classifier', fallback_prompt=default_prompt)
    agent_prompt = agent_config.get('prompt', default_prompt)
    
    if agent_prompt != default_prompt:
        logger.info("[CLASSIFIER] ✅ Using prompt from database")
    else:
        logger.info("[CLASSIFIER] ℹ️  Using default fallback prompt")
    
    # Format the prompt with available topics
    full_prompt = agent_prompt.format(available_topics=available_topics)
    
    # Append the interview content
    full_prompt += f"""

Interview Content to Analyze:
{interview_content}

Analyze the interview and return the TopicClassificationResult JSON."""
    
    return full_prompt

# ------------------------------------------------------------------
# Agent
# ------------------------------------------------------------------

def create_topic_classifier_agent(model: str = "gpt-4o-mini"):
    """Create topic classifier agent - using mini model since classification is simpler"""
    logger.info(f"[CLASSIFIER] Creating agent with model {model}")
    return Agent(
        name="btl topic classifier",
        instructions=topic_classifier_instructions,
        model=model,
        output_type=TopicClassificationResult,
        model_settings=ModelSettings()
    )

# Default agent instance
topic_classifier_agent = create_topic_classifier_agent()

# ------------------------------------------------------------------
# Workflow Input
# ------------------------------------------------------------------

class ClassifierWorkflowInput(BaseModel):
    interview_content: str
    available_topics: str

# ------------------------------------------------------------------
# Runner
# ------------------------------------------------------------------

async def run_classifier_workflow(workflow_input: ClassifierWorkflowInput):
    # Fetch agent configuration from database to get the model
    from .supabase_client import get_agent_prompt
    agent_config = get_agent_prompt('btl_topic_classifier')
    model = agent_config.get('model', 'gpt-4o-mini')
    
    logger.info(f"[CLASSIFIER] Using model from database: {model}")
    
    # Create agent with the configured model
    agent_instance = create_topic_classifier_agent(model)
    
    with trace("topic classifier agent"):
        conversation_history: list[TResponseInputItem] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": workflow_input.interview_content
                    }
                ]
            }
        ]
        result_temp = await Runner.run(
            agent_instance,
            input=conversation_history,
            run_config=RunConfig(trace_metadata={
                "__trace_source__": "agent-builder",
                "workflow_id": "btl_topic_classifier"
            }),
            context=TopicClassificationContext(
                interview_content=workflow_input.interview_content,
                available_topics=workflow_input.available_topics
            )
        )
        result = {
            "output_text": result_temp.final_output.json(),
            "output_parsed": result_temp.final_output.model_dump()
        }
        return result

# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

async def classify_btl_topics(
    transcript: str,
    messages: list,
) -> List[str]:
    """
    Classify interview content to identify relevant BTL topics.
    
    Args:
        transcript: Full interview transcript text
        messages: List of message dicts with role and content
    
    Returns:
        List of topic IDs (e.g., ['neuro_3', 'psych_4'])
    """
    try:
        logger.info("[CLASSIFIER] ═══════════════════════════════════════════")
        logger.info("[CLASSIFIER] Starting BTL Topic Classification")
        logger.info(f"[CLASSIFIER] Transcript length: {len(transcript) if transcript else 0} chars")
        logger.info(f"[CLASSIFIER] Messages count: {len(messages) if messages else 0}")
        
        # Get OpenAI API key from database with fallback to environment
        from .secrets_utils import get_openai_api_key
        openai_key = get_openai_api_key()
        if not openai_key:
            raise ValueError("OPENAI_API_KEY not configured in database or environment")
        
        # Load topic metadata
        topics_metadata = load_btl_topics_metadata()
        if not topics_metadata:
            logger.error("[CLASSIFIER] Failed to load BTL topics metadata")
            return []
        
        # Format topics for agent
        topics_text = "\n".join([
            f"- {t['topic_id']}: {t['topic_name']} (Section {t['btl_section']})\n  Strategy: {t['vopi_strategy']}"
            for t in topics_metadata
        ])
        
        # Prepare interview content
        interview_content = f"TRANSCRIPT:\n{transcript}\n\nMESSAGES:\n{json.dumps(messages, indent=2, ensure_ascii=False)}"
        
        logger.info(f"[CLASSIFIER] 📊 Input size: {len(interview_content)} chars")
        logger.info(f"[CLASSIFIER] 📋 Available topics: {len(topics_metadata)}")
        
        # Run classifier
        workflow_input = ClassifierWorkflowInput(
            interview_content=interview_content,
            available_topics=topics_text
        )
        
        logger.info("[CLASSIFIER] ▶️  Running classification workflow...")
        result_wrapper = await run_classifier_workflow(workflow_input)
        
        logger.info("[CLASSIFIER] ✅ Classification completed successfully")
        
        result = result_wrapper["output_parsed"]
        
        # Log results in color
        logger.info("\033[92m" + "="*80)
        logger.info("[CLASSIFIER] 🟢 CLASSIFICATION RESULTS:")
        logger.info(json.dumps(result, indent=2, ensure_ascii=False))
        logger.info("="*80 + "\033[0m")
        
        # Extract topic IDs
        identified_topics = result.get('identified_topics', [])
        topic_ids = [topic['topic_id'] for topic in identified_topics]
        
        logger.info(f"[CLASSIFIER] 📝 Identified {len(topic_ids)} relevant topics: {topic_ids}")
        logger.info(f"[CLASSIFIER] 💬 Summary: {result.get('summary', 'N/A')}")
        
        # Log confidence levels
        for topic in identified_topics:
            logger.info(f"[CLASSIFIER]   - {topic['topic_id']}: {topic['confidence']:.2f} ({topic['reason']})")
        
        logger.info("[CLASSIFIER] ═══════════════════════════════════════════")
        
        return topic_ids
        
    except Exception as e:
        logger.error("\033[91m" + "="*80)
        logger.error("[CLASSIFIER] 🔴 EXCEPTION CAUGHT:")
        logger.error(f"[CLASSIFIER] Exception type: {type(e).__name__}")
        logger.error(f"[CLASSIFIER] Exception message: {str(e)}")
        import traceback
        logger.error(f"[CLASSIFIER] Traceback:\n{traceback.format_exc()}")
        logger.exception("[CLASSIFIER] ❌ CLASSIFIER ERROR")
        logger.error("="*80 + "\033[0m")
        logger.info("[CLASSIFIER] ═══════════════════════════════════════════")
        
        # Return empty list on error - will skip BTL filtering
        return []
