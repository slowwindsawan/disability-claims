# Follow-up Question Agent Test

This test demonstrates the Follow-up Question Agent that analyzes conversation summaries and document summaries to identify ambiguities and generate follow-up questions based on BTL disability evaluation guidelines.

## What It Does

The agent:
1. Reviews the claimant's interview/call summary
2. Analyzes all uploaded medical document summaries
3. Maps findings to BTL disability guideline requirements
4. Identifies material ambiguities or gaps
5. Generates specific follow-up questions to clarify eligibility and maximize claim support

## Running the Test

```bash
# From the backend directory
cd backend

# Make sure you have your .env file with OPENAI_API_KEY set
python demo/test_followup_agent.py
```

## Test Scenarios

### Test 1: Incomplete Case
- Patient with back pain and depression
- Incomplete medical documentation
- Missing specialist reports and formal diagnoses
- **Expected**: Multiple follow-up questions to clarify ambiguities

### Test 2: Complete Case
- Patient with well-documented Major Depressive Disorder
- Comprehensive psychiatric evaluation with diagnosis codes
- Detailed functional assessments and work restrictions
- **Expected**: No follow-up questions - case is complete

## How It Works in Production

1. **User uploads documents** → Documents are analyzed and summarized
2. **User completes voice interview** → Call summary is stored in case metadata
3. **User clicks "Complete" button** → Triggers `/cases/{case_id}/analyze-followup` endpoint
4. **Agent analyzes** → Reviews call_summary + document_summaries from database
5. **Returns results**:
   - If ambiguities found: List of specific follow-up questions
   - If complete: Confirmation that case has sufficient information

## API Endpoint

```
POST /cases/{case_id}/analyze-followup
Form Data:
  - provider: 'gpt' or 'gemini' (default: 'gpt')

Response:
{
  "status": "ok",
  "has_followup_questions": boolean,
  "followup_questions": [...],
  "analysis_summary": "...",
  "ambiguities_found": [...],
  "case_complete": boolean
}
```

## Integration Points

- **call_summary**: Stored in `cases.metadata.call_summary` (from VAPI voice agent)
- **document_summaries**: Stored in `cases.document_summaries` (JSONB array)
- **Agent removes**: `documents_requested_list` key from call_summary before analysis
- **Results stored**: In `cases.metadata.followup_analysis`

## Dependencies

- OpenAI API (GPT model) or Google Gemini
- Existing case with call_summary and document_summaries populated
