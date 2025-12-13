# OpenAI Agent Test for Call Analyzer

This directory contains a TypeScript test script that uses the OpenAI Agents SDK to analyze voice call conversations.

## Setup

1. **Install Dependencies**
```bash
cd demo
npm install
```

2. **Environment Variables**
Make sure your `.env` file in the `backend/` directory contains:
```env
VAPI_API_KEY=your_vapi_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Running the Test

### Option 1: Using tsx (Recommended - No compilation needed)
```bash
npm run test:openai
```

### Option 2: Compile first, then run
```bash
npm run test:openai-compiled
```

### Option 3: Direct execution with tsx
```bash
npx tsx test_call_analyzer_openai.ts
```

## What the Test Does

1. **Fetches Call Details** - Gets call data from Vapi API
2. **Analyzes with OpenAI Agent** - Uses your custom agent with:
   - GPT-4o-mini model
   - High reasoning effort
   - File search tool
   - Structured output schema
3. **Displays Results** - Shows formatted analysis including:
   - Comprehensive call summary
   - Specific document list
   - Case summary
   - Key legal points
   - Risk assessment
   - **Estimated claim amount** (bonus feature)
4. **Compares with Vapi** - Side-by-side comparison with original Vapi analysis
5. **Saves JSON** - Saves full analysis to `call_analysis_019b0e04_openai.json`

## Output Schema

The agent returns:
```typescript
{
  call_summary: string;              // 3-5 paragraph detailed summary
  documents_requested_list: string[]; // Specific documents needed
  case_summary: string;              // 2-3 sentence legal summary
  key_legal_points: string[];        // Critical facts array
  risk_assessment: string;           // "High Viability" | "Low Viability" | "Needs More Info"
  estimated_claim_amount: string;    // Compensation estimate
}
```

## Differences from Gemini Version

### OpenAI Agent Features:
- ✅ Uses structured output with Zod schema validation
- ✅ Built-in reasoning with configurable effort level
- ✅ File search tool integration
- ✅ Conversation tracing and metadata
- ✅ Includes estimated claim amount
- ✅ Better integration with OpenAI ecosystem

### Gemini Version Features:
- ✅ Simpler API calls
- ✅ Fallback to heuristic analysis
- ✅ Works with Google Cloud ecosystem

## Customization

### Change the Call ID
Edit the constants at the top of `test_call_analyzer_openai.ts`:
```typescript
const CALL_ID = "your-call-id-here";
const CASE_ID = "your-case-id-here";
```

### Adjust Reasoning Effort
In the agent configuration:
```typescript
modelSettings: {
  reasoning: {
    effort: "high",  // "low" | "medium" | "high"
    summary: "concise"
  }
}
```

### Change Model
```typescript
model: "gpt-4o-mini",  // or "gpt-4o", "gpt-4-turbo", etc.
```

## Troubleshooting

### Module not found errors
```bash
npm install
```

### TypeScript errors
```bash
npm install --save-dev @types/node typescript
```

### Environment variable errors
Check that `.env` file exists in `backend/` directory and contains required keys.

### Vapi API errors
Verify your `VAPI_API_KEY` is valid and has access to the call ID.

## Integration with Backend

To use this agent in your FastAPI backend:

1. Create a Node.js microservice that wraps this agent
2. Call it from Python using `subprocess` or HTTP
3. Or convert the logic to use OpenAI Python SDK with similar structured outputs

Example Python integration:
```python
import subprocess
import json

def analyze_call_with_openai(transcript: str, messages: list):
    input_data = {
        "input_as_text": f"TRANSCRIPT:\n{transcript}\n\nMESSAGES:\n{json.dumps(messages)}"
    }
    
    result = subprocess.run(
        ["npx", "tsx", "demo/test_call_analyzer_openai.ts"],
        input=json.dumps(input_data),
        capture_output=True,
        text=True
    )
    
    return json.loads(result.stdout)
```
