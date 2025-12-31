# Job Queue System - Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER FRONTEND                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard: "התחל ניתוח AI" Button                             │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  1. User clicks button                                    │  │ │
│  │  │  2. POST /cases/123/analyze-documents-form7801            │  │ │
│  │  │  3. Receive: { job_id: "abc-123", status: "accepted" }    │  │ │
│  │  │  4. Start polling every 2 seconds                         │  │ │
│  │  │  5. Display progress: "מנתח... 45%"                       │  │ │
│  │  │  6. On complete: Show results                             │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND (main.py)                       │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  POST /cases/{case_id}/analyze-documents-form7801              │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  1. Validate request & check auth                        │ │ │
│  │  │  2. Get case from database                               │ │ │
│  │  │  3. Create job: job_queue.create_job()                   │ │ │
│  │  │     → Returns job_id immediately                         │ │ │
│  │  │  4. Start background task:                               │ │ │
│  │  │     asyncio.create_task(execute_job(...))                │ │ │
│  │  │  5. Return response:                                     │ │ │
│  │  │     { job_id: "abc-123", status: "accepted" }            │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  GET /jobs/{job_id}  (Polling endpoint)                       │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  1. Check auth                                           │ │ │
│  │  │  2. Get job from job_queue                               │ │ │
│  │  │  3. Return job status:                                   │ │ │
│  │  │     {                                                     │ │ │
│  │  │       status: "running",                                 │ │ │
│  │  │       progress: 45,                                      │ │ │
│  │  │       result: null                                       │ │ │
│  │  │     }                                                     │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     JOB QUEUE (job_queue.py)                         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  In-Memory Storage: Dict[str, Job]                            │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  Job ID: "abc-123"                                       │ │ │
│  │  │  ├─ status: "pending" → "running" → "completed"         │ │ │
│  │  │  ├─ progress: 0 → 45 → 100                              │ │ │
│  │  │  ├─ metadata: { case_id, user_id, ... }                │ │ │
│  │  │  ├─ result: null → { analysis: {...} }                 │ │ │
│  │  │  └─ error: null                                         │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Background Task Execution                                     │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  async def execute_job(job_id, task_func, ...):         │ │ │
│  │  │    1. Set job.status = "running"                        │ │ │
│  │  │    2. Execute: result = await task_func(...)            │ │ │
│  │  │    3. On success:                                       │ │ │
│  │  │       - job.result = result                             │ │ │
│  │  │       - job.status = "completed"                        │ │ │
│  │  │    4. On error:                                         │ │ │
│  │  │       - job.error = str(e)                              │ │ │
│  │  │       - job.status = "failed"                           │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ANALYSIS TASKS (Background)                        │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  _execute_form7801_analysis()                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  1. Get documents from database                          │ │ │
│  │  │  2. Call OpenAI agent:                                   │ │ │
│  │  │     analyze_documents_with_openai_agent(...)             │ │ │
│  │  │  3. Save result to database:                             │ │ │
│  │  │     update_case(case_id, {                               │ │ │
│  │  │       final_document_analysis: result                    │ │ │
│  │  │     })                                                    │ │ │
│  │  │  4. Return result for job queue                          │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  _execute_call_analysis()                                      │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  Analyzes call transcript with OpenAI                    │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  _execute_agent_analysis()                                     │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  Analyzes documents with Anthropic agent                 │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  cases table                                                   │ │
│  │  ├─ case_id                                                    │ │
│  │  ├─ final_document_analysis: { form_7801: {...}, ... }        │ │
│  │  ├─ form_7801_analysis: { ... }                               │ │
│  │  ├─ call_summary: { ... }                                     │ │
│  │  └─ status: "Submission Pending"                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Timeline Example

```
Time  │ Frontend                    │ Backend Job Queue           │ Background Task
──────┼─────────────────────────────┼────────────────────────────┼──────────────────────
0:00  │ Click "התחל ניתוח AI"       │                            │
0:00  │ POST /analyze               │                            │
      │                             │                            │
0:01  │ ← Response: job_id="abc-123"│ Create job                 │
      │                             │ status="pending"           │
      │                             │                            │
0:01  │                             │ Start background task      │ → Task starts
      │                             │ status="running"           │   progress=0%
      │                             │                            │
0:02  │ Poll: GET /jobs/abc-123     │                            │
0:02  │ ← Response: status="running"│ Return job status          │   progress=25%
      │   progress=25%              │                            │
      │                             │                            │
0:04  │ Poll: GET /jobs/abc-123     │                            │
0:04  │ ← Response: status="running"│ Return job status          │   progress=50%
      │   progress=50%              │                            │
      │                             │                            │
0:06  │ Poll: GET /jobs/abc-123     │                            │
0:06  │ ← Response: status="running"│ Return job status          │   progress=75%
      │   progress=75%              │                            │
      │                             │                            │
0:08  │ Poll: GET /jobs/abc-123     │                            │ ✅ Task complete
      │                             │                            │   Save to DB
      │                             │ status="completed"         │
0:08  │ ← Response: status="complete│ result={ analysis: {...} } │
      │   result={ analysis: {...} }│                            │
      │                             │                            │
0:08  │ Display results ✅          │                            │
      │ Stop polling                │                            │
```

## Data Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│          │    │          │    │          │    │          │
│ Frontend │───▶│ Endpoint │───▶│   Job    │───▶│Background│
│          │    │          │    │  Queue   │    │   Task   │
│          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │                │               │
     │               │                │               ▼
     │               │                │          ┌──────────┐
     │               │                │          │  OpenAI  │
     │               │                │          │  Agent   │
     │               │                │          └──────────┘
     │               │                │               │
     │               │                │               ▼
     │               │                │          ┌──────────┐
     │               │                │          │ Database │
     │               │                │          └──────────┘
     │               │                │               │
     │               │                │◀──────────────┘
     │               │                │  (result saved)
     │               │                │
     │◀──────────────│◀───────────────┤
     │  Poll status  │  Return status │
     │               │  & result      │
     │               │                │
```

## Status Transitions

```
Job Lifecycle:

    Created
       │
       ▼
   ┌─────────┐
   │ PENDING │  ← Job created, waiting to start
   └─────────┘
       │
       ▼
   ┌─────────┐
   │ RUNNING │  ← Background task executing
   └─────────┘
       │
       ├────────────┬────────────┐
       │            │            │
       ▼            ▼            ▼
  ┌──────────┐  ┌──────────┐   │
  │COMPLETED │  │  FAILED  │   │
  │  (✅)    │  │   (❌)   │   │
  └──────────┘  └──────────┘   │
                                │
                                ▼
                           (Auto cleanup
                            after 24h)
```

## Key Concepts

### 1. Non-Blocking
```
❌ OLD: Request ──────────[Wait 60s]──────────▶ Response
✅ NEW: Request ─▶ job_id (instant) ─▶ Poll ─▶ Result
```

### 2. Polling Pattern
```
Frontend                      Backend
   │                             │
   ├────── POST /analyze ───────▶│ (Create job)
   │◀───── job_id ───────────────┤
   │                             │
   ├────── GET /jobs/123 ────────▶│ status="running"
   │◀───── running ──────────────┤
   │                             │
   │  (wait 2 seconds)           │
   │                             │
   ├────── GET /jobs/123 ────────▶│ status="running"
   │◀───── running ──────────────┤
   │                             │
   │  (wait 2 seconds)           │
   │                             │
   ├────── GET /jobs/123 ────────▶│ status="completed"
   │◀───── completed + result ───┤
   │                             │
   └─ Stop polling              │
```

### 3. Progress Updates
```
Job Progress:
  0% ─────▶ 25% ─────▶ 50% ─────▶ 75% ─────▶ 100%
  "Created"  "Loading"  "Analyzing" "Saving"   "Complete"
```

---

This visual guide shows the complete architecture and data flow of the job queue system.
