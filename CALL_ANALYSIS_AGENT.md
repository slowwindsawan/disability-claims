# Call Analysis Agent Implementation

## Overview
Created a separate Gemini-powered agent to analyze voice call conversations between the AI intake agent and claimants. This replaces the previous dependency on Vapi's built-in analysis.

## Changes Made

### 1. New Function: `analyze_call_conversation()` in `gemini_client.py`

**Purpose:** Analyze voice call transcripts and generate comprehensive summaries and document lists.

**Input:**
- `transcript` (str): Full conversation transcript
- `messages` (list): List of message objects with role, time, and message fields

**Output:**
```json
{
  "call_summary": "Comprehensive 3-5 paragraph summary of the conversation",
  "documents_requested_list": ["Specific document type 1", "Specific document type 2", ...],
  "case_summary": "Concise 2-3 sentence legal summary",
  "key_legal_points": ["Critical fact 1", "Critical fact 2", ...],
  "risk_assessment": "High Viability | Low Viability | Needs More Info"
}
```

**Key Features:**
- Uses Gemini API with detailed prompting for legal case analysis
- Extracts all medical conditions (primary and secondary)
- Identifies specific documents needed for each condition
- Notes critical dates (diagnosis, work impact onset)
- Assesses case viability based on information quality
- Falls back to basic heuristic analysis if API fails

### 2. Updated Endpoint: `/vapi/call-details`

**Enhanced Flow:**
1. Fetch call details from Vapi API (unchanged)
2. Extract transcript and messages from call data
3. **NEW:** Analyze conversation using `analyze_call_conversation()`
4. Save both raw call details AND analysis to database
5. Return combined data to frontend

**Database Updates:**
- `call_details`: Raw Vapi response (unchanged)
- `call_summary`: **NEW** - Comprehensive Gemini-generated summary saved directly to cases table

**Response Structure:**
```json
{
  "status": "ok",
  "call": {
    // Original Vapi call data
    "transcript": "...",
    "messages": [...],
    // NEW: Our analysis added to response
    "analysis": {
      "summary": "...",
      "structured_data": {
        "case_summary": "...",
        "documents_requested_list": [...],
        "key_legal_points": [...],
        "risk_assessment": "..."
      }
    }
  },
  "analysis": {
    // Standalone analysis object for easy access
    "call_summary": "...",
    "documents_requested_list": [...],
    ...
  }
}
```

### 3. Document Request Endpoint Compatibility

The `/vapi/requested-documents` endpoint continues to work as before, now reading from our Gemini-generated analysis instead of Vapi's:

```python
# Still extracts from call_details.analysis.structured_data.documents_requested_list
# No changes needed to this endpoint
```

## Benefits

### 1. **Full Control Over Analysis**
- Custom prompting tailored to disability claims legal requirements
- Can iterate and improve analysis without waiting for Vapi updates
- Better extraction of legal/medical facts

### 2. **More Comprehensive Summaries**
- Vapi's summary: 1-2 sentences
- Our summary: 3-5 detailed paragraphs with all key information
- Includes functional limitations, timeline details, and patient concerns

### 3. **Better Document Specificity**
- Vapi: "Medical records"
- Ours: "Medical evaluation report from orthopedic specialist for backbone fracture with imaging results"

### 4. **Legal Focus**
- Extracts key facts needed for Bituach Leumi committee review
- Identifies retroactivity implications
- Notes functional limitations for IEL (Impairment of Earning Capacity) assessment

### 5. **Cost Efficiency**
- No longer paying for Vapi's analysis feature
- Using same Gemini API already configured for other features

## Example Analysis Output

**Input Transcript:**
```
AI: What is the main medical condition preventing you from working?
User: I have a fracture in my backbone.
AI: Are these learning disabilities (dyslexia, ADHD) separate issues?
User: They're related. I'll upload 2 documents showing the connection.
AI: When was the fracture first diagnosed?
User: 3 months ago.
```

**Generated Analysis:**
```json
{
  "call_summary": "The user identified a backbone fracture, diagnosed three months ago, as their primary medical condition preventing them from working, alongside pre-existing learning disabilities (dyslexia and ADHD) which they stated are related. The AI attempted to gather more details about the onset of the fracture's impact on work, while the user repeatedly inquired about the specific documents required for their claim. The AI advised that medical evaluation reports, including diagnosis, treatment, and functional limitations, would be needed for both conditions.",
  
  "documents_requested_list": [
    "Medical evaluation report from orthopedic specialist for backbone fracture with complete diagnosis and treatment plan",
    "Imaging reports for backbone fracture (X-rays, MRI, CT scans)",
    "Learning disability evaluation from licensed specialist at Ariel University",
    "Documentation showing relationship between backbone fracture and learning disabilities",
    "Medical records documenting functional limitations and work impact",
    "Employment records showing work difficulties starting 3 months ago"
  ],
  
  "case_summary": "Claimant reporting disability due to backbone fracture diagnosed 3 months ago and related learning disabilities (dyslexia, ADHD). Work difficulties began at time of fracture diagnosis. Will provide documentation showing relationship between conditions.",
  
  "key_legal_points": [
    "Main medical conditions: Backbone fracture, Dyslexia, ADHD",
    "Date of backbone fracture diagnosis: Approximately 3 months ago",
    "Onset of work difficulties: Approximately 3 months ago (coinciding with fracture diagnosis)",
    "Claimant states backbone fracture and learning disabilities are related",
    "Retroactivity potential: Up to 3 months based on diagnosis date"
  ],
  
  "risk_assessment": "Needs More Info"
}
```

## Error Handling

### Graceful Degradation:
1. If Gemini API fails → Use heuristic fallback analysis
2. If transcript missing → Return placeholder analysis
3. If database save fails → Still return analysis in response
4. Never block the endpoint due to analysis failure

### Fallback Analysis:
- Extracts basic info from transcript using keyword matching
- Provides generic document list
- Flags case as "Needs More Info"

## Configuration

**Required Environment Variables:**
- `GEMINI_API_KEY`: Your Gemini API key (already configured)
- `GEMINI_MODEL_ID`: Model to use (already configured, e.g., `gemini-2.5-flash`)
- `VAPI_API_KEY`: Vapi API key for fetching call data (unchanged)

## Testing

### Test the Analysis Function:
```python
from app.gemini_client import analyze_call_conversation

transcript = """
AI: What is your main medical condition?
User: I have a backbone fracture.
"""

messages = [
    {"role": "bot", "message": "What is your main medical condition?"},
    {"role": "user", "message": "I have a backbone fracture."}
]

result = analyze_call_conversation(transcript, messages)
print(json.dumps(result, indent=2))
```

### Test the Full Endpoint:
```bash
curl -X GET "http://localhost:8000/vapi/call-details?call_id=019b0e04-9d04-7ff1-b039-c48253d81bbf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Future Enhancements

1. **Multi-language Support**: Detect language and adapt prompts
2. **Sentiment Analysis**: Assess caller confidence/anxiety levels
3. **Completeness Scoring**: Rate how thoroughly information was gathered
4. **Follow-up Recommendations**: Suggest additional questions to ask
5. **Pattern Recognition**: Identify common claim types for better routing

## Migration Notes

**No Breaking Changes:**
- Existing endpoints continue to work
- Response structure expanded (backward compatible)
- Database schema unchanged (using existing `call_summary` field)

**Frontend Changes Needed:**
- Can now read from `call.analysis.structured_data.documents_requested_list` (preferred)
- Old path `call.analysis.structuredData.documents_requested_list` also populated for compatibility
- `call_summary` field now contains rich analysis instead of Vapi's brief summary
