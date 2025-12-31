# Job Queue System - Quick Reference

## 🎯 What Changed?

Long-running API endpoints now return **immediately** with a `job_id`. The frontend must **poll** for status and results.

## 📋 Affected Endpoints

| Endpoint | Old Behavior | New Behavior |
|----------|-------------|--------------|
| `POST /vapi/re-analyze-call/{case_id}` | Waited 30-60s | Returns job_id immediately |
| `POST /cases/{case_id}/analyze-with-agent` | Waited 30-90s | Returns job_id immediately |
| `POST /cases/{case_id}/analyze-documents-form7801` | Waited 30-90s | Returns job_id immediately |

## 🚀 Quick Start (Frontend)

### 1. Start Analysis
```typescript
const response = await fetch('/api/cases/123/analyze-documents-form7801', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { job_id } = await response.json();
```

### 2. Poll for Status (Every 2 Seconds)
```typescript
const checkStatus = async () => {
  const response = await fetch(`/api/jobs/${job_id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const job = await response.json();
  
  if (job.status === 'completed') {
    console.log('Result:', job.result);
    return job.result;
  }
  
  if (job.status === 'failed') {
    throw new Error(job.error);
  }
  
  // Still running, poll again
  setTimeout(checkStatus, 2000);
};

checkStatus();
```

## 📁 Files

### Backend
- ✅ `app/job_queue.py` - Job queue system
- ✅ `app/main.py` - Modified endpoints
- 📖 `JOB_QUEUE_API_DOCUMENTATION.md` - Full API docs
- 📖 `JOB_QUEUE_IMPLEMENTATION_SUMMARY.md` - Implementation details
- 🧪 `test_job_queue.py` - Test file

### Frontend
- 📖 `FRONTEND_JOB_POLLING_INTEGRATION.md` - Integration guide
- ⚠️ Dashboard components need updates
- ⚠️ Analysis button components need updates

## 🔍 Job Status Values

- `pending` - Job created, not started yet
- `running` - Job executing now
- `completed` - Job finished ✅ (result available)
- `failed` - Job failed ❌ (error available)

## 📊 API Response Structure

### Create Job Response
```json
{
  "status": "accepted",
  "job_id": "abc-123-def-456",
  "poll_url": "/jobs/abc-123-def-456",
  "message": "Job created. Poll for status."
}
```

### Poll Status Response
```json
{
  "job_id": "abc-123-def-456",
  "job_type": "document_analysis_form7801",
  "status": "running",
  "progress": 45,
  "progress_message": "Analyzing documents...",
  "result": null,
  "error": null,
  "created_at": "2025-12-31T10:30:00Z",
  "started_at": "2025-12-31T10:30:01Z",
  "completed_at": null
}
```

### Completed Job Response
```json
{
  "job_id": "abc-123-def-456",
  "status": "completed",
  "progress": 100,
  "result": {
    "case_id": "123",
    "analysis": { ... },
    "documents_analyzed": 3
  },
  "error": null,
  "completed_at": "2025-12-31T10:31:45Z"
}
```

## 🧪 Testing

```bash
# Test the job queue system
cd backend
python test_job_queue.py

# Start the server
python -m uvicorn app.main:app --reload

# Test an endpoint
curl -X POST http://localhost:8000/cases/YOUR_CASE_ID/analyze-documents-form7801 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ⚠️ Important Notes

1. **Jobs are in-memory** - Lost on server restart
2. **Poll every 2-3 seconds** - Not more frequently
3. **Stop polling** when status is `completed` or `failed`
4. **Jobs expire after 24 hours** - Auto-cleaned up
5. **Users can only see their own jobs** (admins see all)

## 📚 Documentation

- **Full API Documentation**: [JOB_QUEUE_API_DOCUMENTATION.md](./JOB_QUEUE_API_DOCUMENTATION.md)
- **Frontend Integration**: [../frontend/FRONTEND_JOB_POLLING_INTEGRATION.md](../frontend/FRONTEND_JOB_POLLING_INTEGRATION.md)
- **Implementation Details**: [JOB_QUEUE_IMPLEMENTATION_SUMMARY.md](./JOB_QUEUE_IMPLEMENTATION_SUMMARY.md)

## 🐛 Troubleshooting

### "Job not found"
- Job expired (>24 hours old)
- Wrong job_id
- Server restarted (jobs are in-memory)

### Polling never completes
- Check backend logs for errors
- Try shorter timeout (5 minutes max)
- Verify analysis function is working

### Can't see job results
- Make sure you're checking `job.result` when status is `completed`
- Verify you're authenticated with the correct user

## 🎨 Example React Component

```tsx
function AnalyzeButton({ caseId }: { caseId: string }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;
    
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      const job = await res.json();
      setStatus(job);
      
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [jobId]);

  const handleClick = async () => {
    const res = await fetch(`/api/cases/${caseId}/analyze-documents-form7801`, {
      method: 'POST'
    });
    const { job_id } = await res.json();
    setJobId(job_id);
  };

  return (
    <div>
      <button onClick={handleClick} disabled={!!jobId}>
        Analyze
      </button>
      {status && <div>Status: {status.status} ({status.progress}%)</div>}
    </div>
  );
}
```

## ✅ Checklist for Frontend Developer

- [ ] Read `FRONTEND_JOB_POLLING_INTEGRATION.md`
- [ ] Update analysis button to create job
- [ ] Implement polling logic
- [ ] Add progress indicator
- [ ] Handle completed state
- [ ] Handle failed state
- [ ] Test with real case
- [ ] Verify polling stops when done
- [ ] Check error handling

---

**Need Help?** See the full documentation files or check the example code in `test_job_queue.py`.
