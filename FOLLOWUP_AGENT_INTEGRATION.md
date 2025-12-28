# Follow-up Questions Agent Integration

## Overview
Integrated the follow-up questions agent into the onboarding flow. After users complete document uploads, the system analyzes their case for missing information and asks targeted follow-up questions if needed.

## Implementation Details

### Backend Changes

#### 1. Enhanced Endpoint: `/cases/{case_id}/analyze-followup` (main.py)
- Analyzes call summary and document summaries using the follow-up agent
- Stores results in both `metadata` and new `followups` column
- Returns follow-up questions to frontend

#### 2. Updated PATCH Endpoint: `/cases/{case_id}` (main.py)
- Handles `followup_answers` field specially
- Stores answers in `followups` JSONB column with metadata:
  ```json
  {
    "questions": ["Q1", "Q2"],
    "answers": [{"question": "Q1", "answer": "A1"}, ...],
    "analyzed_at": "2025-12-13T...",
    "answered": true,
    "answered_at": "2025-12-13T..."
  }
  ```

#### 3. Database Migration: `009_add_followups_column.sql`
- Adds `followups JSONB` column to `cases` table
- Run with: `psql -f backend/db/migrations/009_add_followups_column.sql`

### Frontend Changes

#### 1. New Component: `FollowupQuestionsScreen.tsx`
- Displays loading state while analyzing case
- Shows follow-up questions in a clean form interface
- Validates all questions are answered before submission
- Automatically skips to success screen if no follow-ups needed
- Stores answers via PATCH to `/cases/{case_id}`

#### 2. Updated: `CaseDocumentUploadScreen.tsx`
- All "Continue" and "Complete" buttons now navigate to `'followup'` step
- Flow: documents → followup analysis → success

#### 3. Updated: `OnboardingFlow.tsx`
- Added `'followup'` to `OnboardingStep` type
- Imported and registered `FollowupQuestionsScreen`
- Added to `stepsOrder` array for navigation control

## User Flow

1. **User completes document upload**
   - Clicks "Complete" or "Continue" button

2. **System analyzes case**
   - Shows loading spinner: "Analyzing Your Case..."
   - Calls `/cases/{case_id}/analyze-followup`
   - AI agent reviews call summary + document summaries

3. **If follow-up questions found**
   - Displays questions in numbered format
   - User fills in text answers for each question
   - "Submit Answers & Continue" button (disabled until all answered)
   - Stores answers in `cases.followups` column

4. **If no follow-up questions**
   - Automatically redirects to success screen
   - No user interaction needed

## Testing

### Test the Follow-up Agent
```bash
cd backend/demo
python test_followup_agent.py
```

This fetches real data from case ID: `1f08bbd3-95da-49d4-8261-d0e9f505037b`

### Database Column Structure
```sql
SELECT id, followups FROM cases WHERE followups IS NOT NULL;
```

Expected format:
```json
{
  "questions": [
    "Can you provide the exact diagnosis from your psychiatrist?",
    "What medications have you tried and failed?"
  ],
  "analyzed_at": "2025-12-13T10:30:00",
  "answered": true,
  "answered_at": "2025-12-13T10:35:00",
  "answers": [
    {
      "question": "Can you provide the exact diagnosis...",
      "answer": "Major Depressive Disorder, DSM-5 296.33"
    },
    {
      "question": "What medications have you tried...",
      "answer": "Tried Zoloft, Prozac, and Lexapro. All had severe side effects."
    }
  ]
}
```

## API Reference

### POST `/cases/{case_id}/analyze-followup`
**Request:**
```
FormData: provider=gpt
```

**Response:**
```json
{
  "status": "ok",
  "has_followup_questions": true,
  "followup_questions": [
    "Question 1?",
    "Question 2?"
  ],
  "case_complete": false
}
```

### PATCH `/cases/{case_id}`
**Request:**
```json
{
  "followup_answers": [
    {"question": "Q1?", "answer": "Answer 1"},
    {"question": "Q2?", "answer": "Answer 2"}
  ]
}
```

**Response:**
```json
{
  "status": "ok",
  "case": { ... }
}
```

## Next Steps

1. **Run Database Migration**
   ```bash
   cd backend/db/migrations
   # Connect to your Supabase DB and run:
   psql -h <host> -U postgres -d postgres -f 009_add_followups_column.sql
   ```

2. **Test End-to-End Flow**
   - Create new case through onboarding
   - Upload documents
   - Click "Complete"
   - Verify follow-up questions appear
   - Answer and submit
   - Verify stored in database

3. **Monitor in Production**
   - Check agent performance
   - Review follow-up question quality
   - Adjust prompts if needed in `followup_agent.py`

## Files Modified

**Backend:**
- `backend/app/main.py` - Added followup storage logic
- `backend/db/migrations/009_add_followups_column.sql` - New migration
- `backend/demo/test_followup_agent.py` - Updated to fetch from DB

**Frontend:**
- `src/components/Onboarding/screens/FollowupQuestionsScreen.tsx` - New component
- `src/components/Onboarding/screens/CaseDocumentUploadScreen.tsx` - Updated navigation
- `src/components/Onboarding/OnboardingFlow.tsx` - Registered new step
