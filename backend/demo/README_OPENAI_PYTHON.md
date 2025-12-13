# Call Analyzer Agent Test - OpenAI Agents SDK

This test script uses the **OpenAI Agents Python SDK** to analyze voice call conversations from Vapi.

## Setup

### 1. Install Dependencies

```bash
cd demo
pip install -r requirements.txt
```

Or install individually:
```bash
pip install openai-agents python-dotenv pydantic vapi-python
```

### 2. Environment Variables

Make sure your `.env` file in the `backend/` directory contains:
```env
VAPI_API_KEY=your_vapi_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Running the Test

```bash
cd demo
python test_call_analyzer.py
```

## What the Test Does

1. **✅ Checks Environment** - Validates API keys
2. **📞 Fetches Call from Vapi** - Gets call ID `019b0e04-9d04-7ff1-b039-c48253d81bbf`
3. **🤖 Analyzes with OpenAI Agent** - Uses:
   - **Model**: GPT-4o-mini
   - **Reasoning**: High effort, concise summary
   - **Tools**: File search (vector store)
   - **Output**: Structured Pydantic model
4. **📊 Displays Results** - Formatted output with:
   - Comprehensive call summary (3-5 paragraphs)
   - Specific document list
   - Case summary
   - Key legal points
   - Risk assessment
   - **💰 Estimated claim amount** (bonus field!)
5. **🔍 Compares with Vapi** - Side-by-side comparison
6. **💾 Saves JSON** - Full analysis saved to `call_analysis_019b0e04_openai.json`

## Output Schema

```python
class ConversationSummarySchema(BaseModel):
    call_summary: str                    # Detailed 3-5 paragraph summary
    documents_requested_list: list[str]  # Specific documents per condition
    case_summary: str                    # 2-3 sentence legal summary
    key_legal_points: list[str]          # Critical facts array
    risk_assessment: str                 # "High Viability" | "Low Viability" | "Needs More Info"
    estimated_claim_amount: str          # Compensation estimate (NEW!)
```

## Key Features

### OpenAI Agent Advantages:
- ✅ **Structured Output** - Validated with Pydantic schemas
- ✅ **High Reasoning** - GPT-4o-mini with configurable reasoning effort
- ✅ **File Search Tool** - Integrated vector store search
- ✅ **Tracing** - Built-in conversation tracing and metadata
- ✅ **Type Safety** - Full Python type hints
- ✅ **Async Support** - Proper async/await handling

### Agent Configuration:
```python
conversation_summary = Agent(
    name="conversation summary",
    instructions=conversation_summary_instructions,
    model="gpt-4o-mini",
    tools=[file_search],
    output_type=ConversationSummarySchema,
    model_settings=ModelSettings(
        store=True,
        reasoning=Reasoning(
            effort="high",        # Low | Medium | High
            summary="concise"     # Concise | Detailed
        )
    )
)
```

## Customization

### Change Call ID
```python
CALL_ID = "your-call-id-here"
CASE_ID = "your-case-id-here"
```

### Adjust Model
```python
model="gpt-4o-mini",  # or "gpt-4o", "gpt-4-turbo", "o1-preview"
```

### Change Reasoning Effort
```python
reasoning=Reasoning(
    effort="medium",    # "low" | "medium" | "high"
    summary="detailed"  # "concise" | "detailed"
)
```

### Add More Vector Stores
```python
file_search = FileSearchTool(
    vector_store_ids=[
        "vs_693be980a7348191b8c7cf9ecb62c3b3",
        "vs_your_other_store_id"
    ]
)
```

## Example Output

```
================================================================================
🧪 OPENAI CALL ANALYZER AGENT TEST
================================================================================

Case ID: 3a59f69e-41a5-4c4e-ba8b-82173bbbd68b
Call ID: 019b0e04-9d04-7ff1-b039-c48253d81bbf

🔧 Environment Check:
   VAPI_API_KEY: ✅ Set
   OPENAI_API_KEY: ✅ Set

================================================================================
STEP 1: Fetch Call Details from Vapi
================================================================================
📞 Fetching call details from Vapi API...
   Call ID: 019b0e04-9d04-7ff1-b039-c48253d81bbf
✅ Successfully fetched call details
   Status: ended
   Transcript length: 1234 characters
   Message count: 28 messages

================================================================================
STEP 2: Analyze with Our OpenAI Agent
================================================================================

🤖 TESTING OPENAI CALL ANALYZER AGENT
================================================================================

📝 Input:
   Transcript length: 1234 characters
   Message count: 28 messages

   First 500 chars of transcript:
   AI: Hello. Help you maximize your claim with Bitwise Lumi...

⚙️  Analyzing conversation with OpenAI Agent (GPT-4o-mini with high reasoning)...

✅ Analysis completed successfully!

================================================================================
📊 ANALYSIS RESULTS
================================================================================

📋 CALL SUMMARY:
--------------------------------------------------------------------------------
The user identified a backbone fracture, diagnosed three months ago, as their 
primary medical condition preventing them from working...

📄 DOCUMENTS REQUESTED (6):
--------------------------------------------------------------------------------
1. Medical evaluation report from orthopedic specialist for backbone fracture...
2. Imaging reports for backbone fracture (X-rays, MRI, CT scans)
...

💰 ESTIMATED CLAIM AMOUNT:
--------------------------------------------------------------------------------
50,000-100,000 NIS based on severity and work impact

💾 Full analysis saved to: call_analysis_019b0e04_openai.json
```

## Integration with Backend

To use this agent in your FastAPI backend, update `gemini_client.py`:

```python
# Option 1: Replace Gemini with OpenAI Agent
from agents import FileSearchTool, Agent, Runner, RunConfig
from pydantic import BaseModel

# ... define agent as in test_call_analyzer.py ...

async def analyze_call_conversation(transcript: str, messages: list) -> dict:
    """Analyze call using OpenAI Agent."""
    workflow_input = WorkflowInput(
        input_as_text=f"TRANSCRIPT:\n{transcript}\n\nMESSAGES:\n{json.dumps(messages)}"
    )
    
    result = await run_workflow(workflow_input)
    return result['output_parsed']
```

## Troubleshooting

### Import Error: `agents` module not found
```bash
pip install openai-agents
```

### OpenAI API Key Error
Check that `OPENAI_API_KEY` is set in your `.env` file:
```bash
echo $env:OPENAI_API_KEY  # PowerShell
```

### Vapi SDK Error
```bash
pip install vapi-python
```

### Async Runtime Error
The script uses `asyncio.run(main())` which requires Python 3.7+.

### Rate Limit Errors
If you hit OpenAI rate limits, the agent will retry automatically. Consider upgrading your OpenAI tier if needed.

## Comparison: Gemini vs OpenAI Agent

| Feature | Gemini (Current) | OpenAI Agent (New) |
|---------|------------------|-------------------|
| **Model** | Gemini 2.5 Flash | GPT-4o-mini |
| **Output** | JSON string | Pydantic model |
| **Reasoning** | Basic prompt | High-effort reasoning |
| **Tools** | None | File search, custom tools |
| **Tracing** | Manual logging | Built-in tracing |
| **Type Safety** | Dict[str, Any] | Type-safe Pydantic |
| **Async** | Manual | Native async |
| **Fallback** | ✅ Heuristic | ❌ None |
| **Cost** | Lower | Higher |
| **Quality** | Good | Excellent |

## Next Steps

1. **Run the test** to see the difference in quality
2. **Compare costs** between Gemini and OpenAI
3. **Decide which to use** based on your needs
4. **Integrate into backend** by updating `main.py`
