# Form 7801 OpenAI Agent Integration Guide

## Overview

This integration adds an OpenAI Agent SDK-powered analysis endpoint that analyzes uploaded medical documents and generates comprehensive Form 7801 disability claims analysis. The endpoint is triggered by clicking the "התחל ניתוח AI" (Start AI Analysis) button on the dashboard.

## Architecture

### Backend Flow

```
Frontend Button Click
    ↓
POST /api/analyze-documents-form7801 (Next.js Route)
    ↓
POST /cases/{case_id}/analyze-documents-form7801 (FastAPI)
    ↓
1. Fetch case and verify access
2. Extract documents_requested_list from call_summary
3. Fetch each document from case_documents table
4. Extract metadata.document_summary from each document
5. Concatenate all summaries + call_summary context
    ↓
Call OpenAI Form 7801 Agent
    ↓
Receive structured Form 7801 analysis
    ↓
Store result in cases.form_7801_analysis
    ↓
Return to frontend
    ↓
Update UI with analysis results
```

## Files Created/Modified

### Backend Files

#### 1. **`backend/app/openai_form7801_agent.py`** (NEW)
- OpenAI Agent SDK implementation for Form 7801 analysis
- Defines `FinalDocumentsAnalysisSchema` matching the frontend schema
- Contains the agent instructions and workflow execution
- Public API: `analyze_documents_with_openai_agent(case_id, documents_data, call_summary)`

#### 2. **`backend/app/main.py`** (MODIFIED)
- Added import: `from .openai_form7801_agent import analyze_documents_with_openai_agent`
- Added endpoint: `POST /cases/{case_id}/analyze-documents-form7801`
- Endpoint orchestrates document fetching, concatenation, and agent call

### Frontend Files

#### 3. **`frontend/app/api/analyze-documents-form7801/route.ts`** (NEW)
- Next.js API route that proxies to backend
- Handles authentication header forwarding
- Provides proper error handling and logging

## API Endpoints

### Backend Endpoint

```http
POST /cases/{case_id}/analyze-documents-form7801
Authorization: Bearer <token>
Content-Type: application/json

{}

Response:
{
  "status": "ok",
  "case_id": "string",
  "analysis": {
    "form_7801": {
      "form_version": "1.0",
      "submission_date": "YYYY-MM-DD",
      "form_status": "draft",
      "personal_info": {...},
      "employment_history": {...},
      "disability_info": {...},
      "bank_details": {...},
      "medical_waiver": {...},
      "metadata": {...}
    },
    "summary": "Comprehensive analysis summary",
    "strategy": "Legal strategy and recommendations",
    "claim_rate": 0.0,
    "recommendations": ["recommendation1", "recommendation2"]
  },
  "documents_analyzed": 2,
  "timestamp": "2025-12-27T..."
}
```

### Frontend API Route

```http
POST /api/analyze-documents-form7801
Authorization: Bearer <token>
Content-Type: application/json

{
  "caseId": "string"
}

Response:
Same as backend endpoint response
```

## Frontend Integration

### Button Implementation

Add this button to your dashboard component (e.g., in the case details section):

```typescript
import { useState } from 'react'

export function StartAIAnalysisButton({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/analyze-documents-form7801', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`, // Your auth token getter
        },
        body: JSON.stringify({ caseId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const result = await response.json()
      
      // Handle success - update UI with analysis results
      console.log('✅ Analysis completed:', result.analysis)
      
      // Show results to user
      showAnalysisResults(result.analysis)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('❌ Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAnalysis}
      disabled={loading}
      className="btn btn-primary"
    >
      {loading ? 'מעכשיו מנתח...' : 'התחל ניתוח AI'}
    </button>
  )
}
```

## Data Flow

### 1. Document Gathering

When analysis starts:
1. Backend fetches the case from Supabase
2. Extracts `call_summary.documents_requested_list` containing document IDs
3. For each document ID, queries the `case_documents` table
4. Extracts the document metadata including:
   - `metadata.document_summary` - Full text summary of the document
   - `metadata.key_points` - Extracted key points
   - `metadata.is_relevant` - Whether the document is relevant to the claim
   - `file_name` - Document filename for context

### 2. Context Preparation

All summaries are concatenated with:
- Case summary from `call_summary`
- Key legal points
- Estimated claim amount
- Risk assessment
- Documents requested list

Example concatenated context:
```
CALL SUMMARY DATA:
- Case Summary: Claimant has a documented leg fracture...
- Estimated Claim Amount: 32000
- Risk Assessment: Needs More Info
- Key Legal Points: [...]

UPLOADED MEDICAL DOCUMENTS:
📄 Medical Evaluation (Relevant: true):
[Full document summary text...]

Key Points:
- [point 1]
- [point 2]

---

📄 Hospital Report (Relevant: true):
[Full document summary text...]
```

### 3. Agent Analysis

The OpenAI agent:
1. Receives the concatenated context as input
2. Uses file search tool to access BTL guidelines (vector store)
3. Analyzes the context based on Israeli disability law
4. Extracts Form 7801 fields from documents
5. Generates:
   - Structured Form 7801 data
   - Comprehensive legal summary
   - Strategy and recommendations
   - Claim success rate (0-100)

### 4. Result Storage

The analysis result is stored in the `cases` table:
```json
{
  "form_7801_analysis": { /* full analysis object */ },
  "form_7801_analysis_timestamp": "2025-12-27T...",
  "form_7801_analysis_status": "completed"
}
```

## Configuration

### Environment Variables

**Backend** (`.env`):
```
OPENAI_API_KEY=sk_...  # Required for OpenAI agent SDK
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # Or your backend URL
```

### Agent Settings

In `openai_form7801_agent.py`:
- **Model**: `gpt-4o-mini` (can be changed to `gpt-4o` for better quality)
- **Temperature**: `0.3` (low randomness for consistent results)
- **Tools**: File search tool for accessing BTL guidelines

## Error Handling

### Frontend Errors

If the analysis fails:
1. 400: Case ID missing or invalid
2. 401: Authentication failed
3. 403: Access denied (not case owner or admin)
4. 404: Case not found
5. 500: Server error during analysis

### Backend Fallbacks

If documents can't be fetched:
1. Analysis continues with call_summary context alone
2. Agent generates analysis based on available information
3. Result includes note about missing documents

If agent fails:
1. Returns default error response with empty form_7801
2. Provides helpful error message for user
3. Logs full exception for debugging

## Testing

### Local Testing

1. **Backend**:
```bash
# Start backend
cd backend
python -m uvicorn app.main:app --reload

# Test endpoint
curl -X POST http://localhost:8000/cases/{case_id}/analyze-documents-form7801 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

2. **Frontend**:
```bash
# Start frontend
cd frontend
npm run dev

# Test in browser
fetch('/api/analyze-documents-form7801', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ caseId: 'your-case-id' })
}).then(r => r.json()).then(console.log)
```

### Expected Response Structure

```javascript
{
  "status": "ok",
  "case_id": "3faed1aa-93c7-48bd-ba6e-d818433cec9b",
  "analysis": {
    "form_7801": {
      "form_version": "1.0",
      "submission_date": "2025-12-27",
      "form_status": "draft",
      "personal_info": {
        "id_number": "123456789",
        "full_name": "יוסי כהן",
        "date_of_birth": "1980-01-01",
        // ... more fields
      },
      "employment_history": {
        "employment_records": [{...}],
        "total_employment_months": 120,
        "section_confirmed": false
      },
      "disability_info": {
        "disability_types": {
          "chronic_pain": true,
          "limited_mobility": true,
          // ... more types
        },
        "disability_start_date": "2023-06-15",
        "primary_disability_description": "Multiple chronic conditions including chronic pain...",
        // ... more fields
      },
      "bank_details": {...},
      "medical_waiver": {...},
      "metadata": {...}
    },
    "summary": "Comprehensive legal analysis...",
    "strategy": "Recommended strategy for claim...",
    "claim_rate": 78.5,
    "recommendations": [
      "Submit additional cardiac evaluation",
      "Request employment records from 2023-2024",
      // ... more recommendations
    ]
  },
  "documents_analyzed": 3,
  "timestamp": "2025-12-27T15:30:45.123456"
}
```

## Debugging

### Enable Verbose Logging

Backend (`main.py`):
```python
# Set in environment
export LOG_LEVEL=INFO  # or DEBUG
```

Frontend (`route.ts`):
- Logs are already verbose with emojis
- Check browser console and Next.js server logs

### Common Issues

1. **"OPENAI_API_KEY not configured"**
   - Ensure `OPENAI_API_KEY` is set in backend `.env`
   - Check OpenAI account has API access

2. **"No documents found"**
   - Verify documents exist in `case_documents` table
   - Check document IDs match between `call_summary` and `case_documents`
   - Verify metadata column contains document_summary

3. **"Access denied"**
   - Verify user is case owner or admin
   - Check authentication token is valid and not expired

4. **Agent returns empty form_7801**
   - Documents may lack relevant disability information
   - Agent defaults to empty when info is unclear
   - Recommend user upload medical evaluations

## Next Steps

1. **Frontend Button Integration**
   - Add "התחל ניתוח AI" button to dashboard
   - Use `StartAIAnalysisButton` component above
   - Display analysis results in modal or new page

2. **Result Display**
   - Create Form 7801 display component
   - Show extracted form data
   - Display strategy and recommendations
   - Show claim success rate

3. **Document Management**
   - Link analyzed documents in UI
   - Show which documents were used in analysis
   - Allow user to add more documents and re-analyze

4. **Optimization**
   - Consider caching analysis results
   - Add analysis refresh/re-run capability
   - Implement incremental analysis for new documents

## Performance Notes

- Agent analysis typically takes 15-30 seconds depending on document count
- Document fetching is parallel for multiple docs
- Consider showing progress spinner during analysis
- Store result to avoid re-analysis for same documents

## Security

- All requests require authentication token
- Backend verifies user has access to case
- Documents are fetched from secure Supabase storage
- Agent operates on summaries only (not raw files)
- Results are stored securely in Supabase

---

**Last Updated**: December 27, 2025
**Status**: Ready for Production
