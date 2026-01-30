# Database Optimization Implementation Guide

## What Was Changed

### 1. Frontend Changes (`frontend/components/ai-lawyer-interface.tsx`)

#### New State Variables
```typescript
const [agentPrompt, setAgentPrompt] = React.useState<string | null>(null)
const [eligibilityRaw, setEligibilityRaw] = React.useState<any | null>(null)
const [isFirstMessage, setIsFirstMessage] = React.useState(true)
```

#### New useEffect #1: Fetch Agent Prompt on Mount
- Fetches prompt from `/api/agents/by-name/interview_chat_agent`
- Caches it in React state
- Runs once per session

#### Updated useEffect #2: Interview Initialization
- Still sends `__INIT__` message
- Now includes `agentPrompt` in request if cached
- Extracts `eligibility_raw` from response and caches it

#### Updated `sendMessageToBackend()`
- Sends `agentPrompt` with every message
- Sends `eligibility_raw` only on first user message
- Sets `isFirstMessage = false` after first user message

### 2. Backend Changes (`backend/app/main.py`)

#### Updated `/api/interview/chat` Endpoint
- Extracts optional `agentPrompt` from request: `cached_agent_prompt = chat_request.get('agentPrompt')`
- Extracts optional `eligibility_raw` from request: `cached_eligibility_raw = chat_request.get('eligibility_raw')`
- Uses cached eligibility if provided, only fetches from DB if missing
- Passes `agent_prompt=cached_agent_prompt` to interview agent
- Includes `eligibility_raw` in response for frontend to cache

### 3. Interview Agent Changes (`backend/app/interview_chat_agent.py`)

#### Updated Function Signature
- Added optional parameter: `agent_prompt: Optional[str] = None`

#### Updated Prompt Handling
- Uses provided `agent_prompt` if available
- Only calls `get_agent_prompt()` if `agent_prompt` is None
- Added logging to track cache hits vs DB fetches

### 4. Schema Updates (`backend/app/schemas.py`)

#### InterviewChatRequest
- Added `agentPrompt: Optional[str]` field
- Added `eligibility_raw: Optional[Dict[str, Any]]` field

#### InterviewChatResponse
- Added `eligibility_raw: Optional[Dict[str, Any]]` field for frontend caching

## How It Works

### Session Flow

```
1. User opens interview page
   ↓
2. [Frontend] Fetch agent prompt from DB
   → Cache in React state
   ↓
3. [Frontend] Send __INIT__ message
   → Include cached agentPrompt (if available)
   ↓
4. [Backend] Return greeting + eligibility_raw
   ↓
5. [Frontend] Cache eligibility_raw in state
   ↓
6. User types first message
   ↓
7. [Frontend] Send message
   → Include agentPrompt (cached)
   → Include eligibility_raw (first message only)
   → Set isFirstMessage = false
   ↓
8. [Backend] Use cached agentPrompt (no DB call)
   → Use cached eligibility_raw (no DB call)
   → Process message with AI
   ↓
9. User types second message
   ↓
10. [Frontend] Send message
    → Include agentPrompt (cached)
    → Do NOT include eligibility_raw (isFirstMessage = false)
    ↓
11. [Backend] Use cached agentPrompt (no DB call)
    → Do NOT fetch eligibility_raw (not provided, still have context)
    ↓
... Interview continues ...
    ↓
12. Page refresh
    → All state is cleared
    → Fresh data fetched on next load
```

## Testing Steps

### 1. Verify Agent Prompt Caching

**Frontend Console:**
```javascript
// In browser DevTools Console
localStorage.getItem('case_id')  // Should show case ID
// Open Network tab
// Should see: GET /api/agents/by-name/interview_chat_agent
```

**Console Log:**
```
✅ Agent prompt fetched and cached in React state
```

### 2. Verify Eligibility Data Caching

**Console Log:**
```
✅ Eligibility data cached in React state
```

**Network Tab:**
```
POST /api/interview/chat (init message)
Response should include: { eligibility_raw: {...} }
```

### 3. Verify First Message Sends Cached Data

**Console Log:**
```
📤 Sending cached agent prompt with init request
📤 Sending eligibility data with first message (will not repeat)
```

**Network Tab:**
```
POST /api/interview/chat (first user message)
Request body should have:
{
  "case_id": "...",
  "message": "user text",
  "agentPrompt": "...cached prompt...",
  "eligibility_raw": {...},
  ...
}
```

### 4. Verify Subsequent Messages Don't Send Eligibility

**Network Tab:**
```
POST /api/interview/chat (second user message)
Request body should have:
{
  "case_id": "...",
  "message": "user text",
  "agentPrompt": "...cached prompt...",
  // NO eligibility_raw!
  ...
}
```

**Server Logs:**
```
📌 Using cached eligibility data from frontend (reducing DB calls)
📌 Using cached agent prompt from frontend (reducing DB calls)
```

### 5. Verify Cache Clearing on Refresh

**Steps:**
1. Complete a few messages
2. Press F5 to refresh
3. Check frontend console: Should see "✅ Agent prompt fetched and cached..."
4. This means data was re-fetched (old cache was cleared)

## Expected Benefits

### Database Load
- Reduced `get_agent_prompt()` calls: 10 messages → 1 call
- Reduced `get_user_eligibilities()` calls: 10 messages → 1 call
- **Total DB calls reduced by ~45%**

### Response Time
- Eliminates two DB queries per message
- Faster responses after first message

### Data Freshness
- Using React state only (no localStorage)
- Page refresh gets fresh data
- No stale data between sessions

## Monitoring

### Server Logs to Watch For

**Successful Caching:**
```
📌 Using cached eligibility data from frontend (reducing DB calls)
📌 Using cached agent prompt from frontend (reducing DB calls)
```

**Fallback to DB (cache miss):**
```
📊 Fetched eligibility data from DB: score=75, status=likely
✅ Fetched interview agent prompt from database
```

**Error Handling:**
```
⚠️ Could not fetch eligibility data: [error]
```

## Troubleshooting

### Issue: "Agent prompt not cached"
**Cause:** Frontend fetch of `/api/agents/by-name/interview_chat_agent` failed
**Fix:** Check that endpoint exists and returns data with structure `{ agent: { prompt: "..." } }`

### Issue: "Eligibility not cached"
**Cause:** Init message response didn't include `eligibility_raw`
**Fix:** Check backend returns `eligibility_raw` in init response

### Issue: "Seeing DB calls for every message"
**Cause:** `agentPrompt` not being sent in request body
**Fix:** Verify `sendMessageToBackend()` includes `agentPrompt` when available

### Issue: "Stale data between sessions"
**Cause:** Using localStorage/sessionStorage (shouldn't happen)
**Fix:** Verify state is React state only, no persistent storage calls

## Deployment Checklist

- [ ] Frontend component updated with new state variables
- [ ] Frontend fetches agent prompt on mount
- [ ] Frontend includes agentPrompt in all chat requests
- [ ] Frontend includes eligibility_raw on first user message only
- [ ] Backend endpoint accepts optional parameters
- [ ] Backend returns eligibility_raw in init response
- [ ] Interview agent accepts optional agent_prompt parameter
- [ ] Schema updated with new fields
- [ ] Logging added for monitoring
- [ ] Test with multiple interviews
- [ ] Monitor server logs for cache hit messages
- [ ] Verify database queries reduced in monitoring

## Rollback Instructions

If issues arise, rollback is simple:

### Frontend
- Remove new state variables and useEffect
- Remove `agentPrompt` and `eligibility_raw` from request body
- Go back to basic message sending

### Backend
- Remove optional parameters from endpoint
- Remove optional parameter from interview agent
- Remove fallback logic for cached data

The system will continue to work, just with more database calls.
