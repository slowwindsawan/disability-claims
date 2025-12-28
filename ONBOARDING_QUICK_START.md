# Quick Start Guide - New Onboarding Flow

## What Was Implemented

The complete user onboarding flow has been implemented with the following sequence:

1. **Phone + OTP Entry** → Verify user's phone number
2. **Email & Password Signup** → Create account with credentials
3. **Eligibility Questionnaire** → 15 questions to assess eligibility
4. **AI Lawyer Consultation** → VAPI voice agent consultation
5. **Dashboard** → User redirected to main dashboard

## Files Created/Modified

### New Files
- `frontend/components/eligibility-questionnaire.tsx` - 15-question eligibility form
- `frontend/components/ai-lawyer-wrapper.tsx` - Error handling wrapper for VAPI
- `COMPLETE_ONBOARDING_FLOW.md` - Detailed documentation

### Modified Files
- `frontend/app/page.tsx` - Complete flow integration
- `backend/app/main.py` - Added `/signup-with-case` endpoint + CORS

## Key Features

### 1. Email/Password Signup
- After OTP verification, user enters email and password
- Creates auth user, profile, and initial case in one request
- Returns JWT access token for authenticated requests

### 2. Eligibility Questionnaire
- 15 questions based on disability claim requirements
- Smart conditional logic (questions appear based on previous answers)
- Stops flow if work-related = No (ineligibility)
- Saves answers to case metadata
- Progress bar and question counter

### 3. AI Lawyer Integration
- Wrapped with error handling for VAPI failures
- Retry mechanism if loading fails
- Skip option if user prefers
- Continue button to proceed to dashboard

### 4. Case Creation
When user signs up, automatically creates:
- Auth user account (Supabase Auth)
- User profile record (user_profile table)
- Initial case record (cases table) with metadata

## API Endpoints

### POST /signup-with-case
Creates user account and case.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "phone": "0501234567",
  "name": "User Name"
}
```

**Response**:
```json
{
  "status": "ok",
  "user_id": "uuid",
  "case_id": "uuid",
  "access_token": "jwt_token"
}
```

### PATCH /cases/{case_id}
Updates case with eligibility answers.

**Request**:
```json
{
  "metadata": {
    "eligibility_answers": {
      "work_related": "Yes",
      "injury_date": "2024-01-15",
      ...
    }
  }
}
```

## Testing Steps

### Frontend
1. Start frontend: `cd frontend && npm run dev`
2. Open http://localhost:3000
3. Click "Check Eligibility"
4. Follow the flow:
   - Enter phone number
   - Enter OTP code (mock: 1234)
   - Enter email and password
   - Answer eligibility questions
   - Experience AI lawyer (or skip)
   - Arrive at dashboard

### Backend
1. Start backend: `cd backend && python -m uvicorn app.main:app --reload`
2. Test signup endpoint:
```bash
curl -X POST http://localhost:8000/signup-with-case \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "phone": "0501234567"
  }'
```

## Environment Setup

### Backend .env
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Frontend .env.local
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_key
```

## Database Schema

### cases table
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to user_profile)
- title (text)
- description (text)
- status (text)
- metadata (jsonb) ← Stores eligibility_answers
- created_at (timestamp)
- updated_at (timestamp)
- call_details (jsonb)
- call_summary (jsonb)
- document_summaries (jsonb)
- followups (jsonb)
```

## Flow Diagram

```
┌─────────────────────┐
│   Landing Page      │
│  "Check Eligibility"│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Phone Number       │
│  (+972-xxx-xxxx)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  OTP Code Entry     │
│  (4 digits)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Success Animation  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Email & Password   │  ← NEW!
│  Signup Form        │
└──────────┬──────────┘
           │
           ▼ (Creates user + case)
┌─────────────────────┐
│  Eligibility        │  ← NEW!
│  Questionnaire      │
│  (15 questions)     │
└──────────┬──────────┘
           │
           ▼ (Saves answers)
┌─────────────────────┐
│  AI Lawyer          │  ← Enhanced!
│  (VAPI Agent)       │
│  with Error Handle  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Dashboard          │
│  (Case visible)     │
└─────────────────────┘
```

## Troubleshooting

### User Already Exists Error
**Problem**: Email already registered
**Solution**: Backend returns 409 error, frontend can offer login option

### VAPI Not Loading
**Problem**: AI Lawyer interface fails to load
**Solution**: Error wrapper shows retry/skip options

### Case Not Created
**Problem**: Backend fails to create case
**Solution**: Check backend logs, verify Supabase credentials

### Eligibility Answers Not Saving
**Problem**: PATCH request fails
**Solution**: Verify access_token is valid and stored in localStorage

## Next Steps

1. **Test the complete flow** from landing to dashboard
2. **Add actual OTP verification** (currently mocked)
3. **Implement email verification** (optional)
4. **Add analytics** to track completion rates
5. **Monitor error rates** in production

## Support

For questions or issues:
1. Check `COMPLETE_ONBOARDING_FLOW.md` for detailed docs
2. Review backend logs for API errors
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

---

**Status**: ✅ Implementation Complete
**Last Updated**: December 19, 2025
