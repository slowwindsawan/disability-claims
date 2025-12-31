# Frontend Integration Quick Start - Job Queue Polling

## Summary
All long-running analysis endpoints now return immediately with a `job_id`. The frontend must poll `/jobs/{job_id}` to get status and results.

## Changed Endpoints

### 1. `/vapi/re-analyze-call/{case_id}` (POST)
**Before:** Waited 30-60 seconds for analysis to complete  
**Now:** Returns immediately with job_id

### 2. `/cases/{case_id}/analyze-with-agent` (POST)
**Before:** Waited for document analysis to complete  
**Now:** Returns immediately with job_id

### 3. `/cases/{case_id}/analyze-documents-form7801` (POST)
**Before:** Waited for Form 7801 analysis to complete  
**Now:** Returns immediately with job_id

## Frontend Changes Required

### Step 1: Update API Call
```typescript
// OLD CODE - Don't use anymore
const response = await fetch('/api/cases/123/analyze-documents-form7801', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const result = await response.json(); // Would hang for 30-60 seconds

// NEW CODE - Use this
const response = await fetch('/api/cases/123/analyze-documents-form7801', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { job_id, poll_url } = await response.json(); // Returns immediately
// Now poll for status...
```

### Step 2: Add Polling Function
```typescript
async function pollJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}
```

### Step 3: Poll Until Complete
```typescript
async function waitForJobCompletion(jobId: string): Promise<any> {
  while (true) {
    const status = await pollJobStatus(jobId);
    
    if (status.status === 'completed') {
      return status.result; // Analysis result
    }
    
    if (status.status === 'failed') {
      throw new Error(status.error);
    }
    
    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### Step 4: Use in Component
```typescript
const handleAnalyze = async () => {
  setLoading(true);
  setProgress(0);
  
  try {
    // Start the job
    const response = await fetch(`/api/cases/${caseId}/analyze-documents-form7801`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { job_id } = await response.json();
    
    // Poll for completion
    const pollInterval = setInterval(async () => {
      const jobStatus = await pollJobStatus(job_id);
      
      // Update progress
      setProgress(jobStatus.progress);
      setProgressMessage(jobStatus.progress_message);
      
      // Check if done
      if (jobStatus.status === 'completed') {
        clearInterval(pollInterval);
        setResult(jobStatus.result);
        setLoading(false);
      } else if (jobStatus.status === 'failed') {
        clearInterval(pollInterval);
        setError(jobStatus.error);
        setLoading(false);
      }
    }, 2000); // Poll every 2 seconds
    
  } catch (error) {
    setError(error.message);
    setLoading(false);
  }
};
```

## Example: Dashboard Analysis Button

```typescript
import { useState, useEffect } from 'react';

interface JobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  progress_message: string;
  result?: any;
  error?: string;
}

export function AnalysisButton({ caseId }: { caseId: string }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Poll when we have a job ID
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const jobStatus: JobStatus = await response.json();
      setStatus(jobStatus);

      // Stop polling when done
      if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
        clearInterval(interval);
        setIsAnalyzing(false);
        
        if (jobStatus.status === 'completed') {
          // Handle success - result is in jobStatus.result
          console.log('Analysis complete:', jobStatus.result);
          // Update your UI with the result
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    
    const response = await fetch(`/api/cases/${caseId}/analyze-documents-form7801`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    const { job_id } = await response.json();
    setJobId(job_id);
  };

  return (
    <div>
      <button 
        onClick={startAnalysis} 
        disabled={isAnalyzing}
        className="btn btn-primary"
      >
        {isAnalyzing ? 'מנתח...' : 'התחל ניתוח AI'}
      </button>
      
      {status && isAnalyzing && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${status.progress}%` }} />
          <p>{status.progress_message || `${status.progress}%`}</p>
        </div>
      )}
      
      {status?.status === 'failed' && (
        <div className="error">
          שגיאה: {status.error}
        </div>
      )}
    </div>
  );
}
```

## Files to Update

### Frontend Files Likely Affected:
1. **Dashboard page** - Where "התחל ניתוח AI" button is located
2. **Call analyzer component** - If using re-analyze-call endpoint
3. **Document upload/analysis** - Any component that triggers document analysis
4. **Admin panel** - If admins can trigger re-analysis

### Search for these patterns:
```bash
# In frontend folder
grep -r "analyze-documents-form7801" .
grep -r "analyze-with-agent" .
grep -r "re-analyze-call" .
```

## Testing the Integration

1. Start backend: `cd backend && python -m uvicorn app.main:app --reload`
2. Trigger an analysis from the frontend
3. Check browser network tab - should see:
   - Initial POST returning job_id immediately
   - Multiple GET requests to `/jobs/{job_id}` every 2 seconds
   - Final GET showing completed status with result

## Troubleshooting

### "Job not found" error
- Job might have expired (>24 hours old)
- Make sure you're using the correct job_id from the response

### Polling never completes
- Check backend logs for errors in the background task
- Verify the analysis functions are working correctly
- Try shorter timeout (5 minutes max)

### Multiple simultaneous analyses
- Each analysis gets its own job_id
- You can track multiple jobs at once
- Use `/jobs` endpoint to list all active jobs

## API Response Examples

### Initial Request
```http
POST /api/cases/123/analyze-documents-form7801
Authorization: Bearer <token>

Response 202:
{
  "status": "accepted",
  "job_id": "abc-123-def-456",
  "message": "Form 7801 analysis job created. Poll /jobs/{job_id} for status.",
  "poll_url": "/jobs/abc-123-def-456",
  "documents_count": 3
}
```

### Polling (Running)
```http
GET /api/jobs/abc-123-def-456
Authorization: Bearer <token>

Response 200:
{
  "job_id": "abc-123-def-456",
  "job_type": "document_analysis_form7801",
  "status": "running",
  "progress": 45,
  "progress_message": "Analyzing documents...",
  "result": null,
  "error": null
}
```

### Polling (Complete)
```http
GET /api/jobs/abc-123-def-456
Authorization: Bearer <token>

Response 200:
{
  "job_id": "abc-123-def-456",
  "job_type": "document_analysis_form7801",
  "status": "completed",
  "progress": 100,
  "progress_message": "Completed",
  "result": {
    "case_id": "123",
    "analysis": { ... },
    "documents_analyzed": 3,
    "timestamp": "2025-12-31T10:30:00Z"
  },
  "error": null
}
```
