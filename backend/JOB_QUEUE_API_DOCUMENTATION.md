# Job Queue System - API Documentation

## Overview

The job queue system provides asynchronous processing for long-running operations like call analysis and document analysis. Instead of waiting for these operations to complete, the API returns immediately with a job ID that can be polled for status and results.

## Architecture

- **In-Memory Storage**: Jobs are stored in memory (no database required)
- **Async Background Processing**: Long-running tasks execute in the background
- **Polling-Based**: Frontend polls for job status and results
- **Automatic Cleanup**: Old completed jobs are cleaned up automatically

## Job Statuses

- `pending` - Job created but not yet started
- `running` - Job is currently executing
- `completed` - Job finished successfully (result available)
- `failed` - Job failed (error message available)

## API Endpoints

### 1. Create Job (Automatic)

Long-running endpoints automatically create jobs and return immediately:

#### POST `/vapi/re-analyze-call/{case_id}`
Re-analyze a call using the OpenAI agent.

**Request:**
```
POST /vapi/re-analyze-call/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <token>
```

**Response (Immediate):**
```json
{
  "status": "accepted",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Call analysis job created. Poll /jobs/{job_id} for status.",
  "poll_url": "/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### POST `/cases/{case_id}/analyze-with-agent`
Analyze case documents using the Anthropic agent.

**Response (Immediate):**
```json
{
  "status": "accepted",
  "job_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "message": "Document analysis job created. Poll /jobs/{job_id} for status.",
  "poll_url": "/jobs/b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "documents_count": 5
}
```

#### POST `/cases/{case_id}/analyze-documents-form7801`
Analyze case documents using the OpenAI Form 7801 agent.

**Response (Immediate):**
```json
{
  "status": "accepted",
  "job_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "message": "Form 7801 analysis job created. Poll /jobs/{job_id} for status.",
  "poll_url": "/jobs/c3d4e5f6-a7b8-9012-cdef-123456789012",
  "documents_count": 3
}
```

### 2. Poll for Job Status

#### GET `/jobs/{job_id}`
Get the current status and result of a job.

**Request:**
```
GET /jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <token>
```

**Response (Running):**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "job_type": "call_analysis",
  "status": "running",
  "metadata": {
    "case_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user-123",
    "endpoint": "re-analyze-call"
  },
  "result": null,
  "error": null,
  "created_at": "2025-12-31T10:30:00.000000",
  "started_at": "2025-12-31T10:30:01.000000",
  "completed_at": null,
  "progress": 45,
  "progress_message": "Analyzing transcript..."
}
```

**Response (Completed):**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "job_type": "call_analysis",
  "status": "completed",
  "metadata": {
    "case_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user-123",
    "endpoint": "re-analyze-call"
  },
  "result": {
    "case_id": "123e4567-e89b-12d3-a456-426614174000",
    "analysis": {
      "call_summary": "...",
      "case_summary": "...",
      "documents_requested_list": [...],
      "key_legal_points": [...],
      "risk_assessment": "Medium",
      "estimated_claim_amount": "50000-100000 ILS"
    },
    "message": "Call re-analyzed successfully"
  },
  "error": null,
  "created_at": "2025-12-31T10:30:00.000000",
  "started_at": "2025-12-31T10:30:01.000000",
  "completed_at": "2025-12-31T10:31:45.000000",
  "progress": 100,
  "progress_message": "Completed"
}
```

**Response (Failed):**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "job_type": "call_analysis",
  "status": "failed",
  "metadata": {
    "case_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user-123",
    "endpoint": "re-analyze-call"
  },
  "result": null,
  "error": "API rate limit exceeded. Please try again later.\nTraceback: ...",
  "created_at": "2025-12-31T10:30:00.000000",
  "started_at": "2025-12-31T10:30:01.000000",
  "completed_at": "2025-12-31T10:30:15.000000",
  "progress": 0,
  "progress_message": ""
}
```

### 3. List Jobs

#### GET `/jobs`
List all jobs for the current user (admins see all jobs).

**Request:**
```
GET /jobs
Authorization: Bearer <token>
```

**Response:**
```json
{
  "jobs": [
    {
      "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "job_type": "call_analysis",
      "status": "completed",
      "metadata": {...},
      "result": {...},
      "created_at": "2025-12-31T10:30:00.000000",
      ...
    },
    {
      "job_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "job_type": "document_analysis_form7801",
      "status": "running",
      "metadata": {...},
      "created_at": "2025-12-31T10:35:00.000000",
      ...
    }
  ],
  "count": 2
}
```

## Frontend Integration Guide

### React/TypeScript Example

```typescript
interface JobResponse {
  status: string;
  job_id: string;
  message: string;
  poll_url: string;
}

interface JobStatus {
  job_id: string;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: any;
  error: string | null;
  progress: number;
  progress_message: string;
}

// 1. Start the analysis
async function startAnalysis(caseId: string): Promise<string> {
  const response = await fetch(`/api/cases/${caseId}/analyze-documents-form7801`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data: JobResponse = await response.json();
  return data.job_id;
}

// 2. Poll for job status
async function pollJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
}

// 3. Complete polling flow with React hooks
function useJobPolling(jobId: string | null) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  useEffect(() => {
    if (!jobId) return;
    
    setIsPolling(true);
    
    const pollInterval = setInterval(async () => {
      const jobStatus = await pollJobStatus(jobId);
      setStatus(jobStatus);
      
      // Stop polling when job is done
      if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
        clearInterval(pollInterval);
        setIsPolling(false);
      }
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(pollInterval);
  }, [jobId]);
  
  return { status, isPolling };
}

// 4. Component usage
function AnalysisButton({ caseId }: { caseId: string }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const { status, isPolling } = useJobPolling(jobId);
  
  const handleAnalyze = async () => {
    const newJobId = await startAnalysis(caseId);
    setJobId(newJobId);
  };
  
  return (
    <div>
      <button 
        onClick={handleAnalyze} 
        disabled={isPolling}
      >
        {isPolling ? 'Analyzing...' : 'Start Analysis'}
      </button>
      
      {status && (
        <div>
          <p>Status: {status.status}</p>
          <p>Progress: {status.progress}%</p>
          <p>{status.progress_message}</p>
          
          {status.status === 'completed' && (
            <div>Analysis complete! {JSON.stringify(status.result)}</div>
          )}
          
          {status.status === 'failed' && (
            <div>Error: {status.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### Polling Frequency
- **Recommended**: Poll every 2-3 seconds
- **Don't**: Poll more frequently than once per second (wastes resources)
- **Do**: Stop polling once job reaches `completed` or `failed` status

### Error Handling
```typescript
async function pollWithRetry(jobId: string, maxRetries = 3): Promise<JobStatus> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pollJobStatus(jobId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Timeout Handling
```typescript
async function pollWithTimeout(jobId: string, timeoutMs = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await pollJobStatus(jobId);
    
    if (status.status === 'completed') {
      return status.result;
    }
    
    if (status.status === 'failed') {
      throw new Error(status.error || 'Job failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Job timeout exceeded');
}
```

### UI States
Show appropriate UI for each status:
- `pending`: "Job queued..."
- `running`: "Processing... {progress}% - {progress_message}"
- `completed`: Show results
- `failed`: Show error message with retry option

## Job Types

- `call_analysis` - Call transcript analysis
- `document_analysis_agent` - Anthropic agent document analysis
- `document_analysis_form7801` - OpenAI Form 7801 analysis

## Security

- Jobs include `user_id` in metadata for access control
- Users can only access their own jobs (unless admin)
- Job results are stored in memory and cleared after 24 hours

## Performance

- Jobs execute asynchronously without blocking the API
- Multiple jobs can run in parallel
- Old jobs (>24 hours) are automatically cleaned up
- No database overhead (fully in-memory)

## Limitations

- Jobs are stored in memory - server restart will lose all jobs
- No persistent job history
- No job prioritization (first-come, first-served)
- Maximum job age: 24 hours (then auto-cleaned)

## Migration from Synchronous Endpoints

Old synchronous behavior:
```typescript
// Old way - blocks until complete
const response = await fetch('/cases/123/analyze', { method: 'POST' });
const result = await response.json(); // Could take 30+ seconds
```

New polling behavior:
```typescript
// New way - returns immediately
const initResponse = await fetch('/cases/123/analyze', { method: 'POST' });
const { job_id } = await initResponse.json(); // Returns in <100ms

// Poll for result
const result = await pollWithTimeout(job_id);
```
