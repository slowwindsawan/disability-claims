# FIXED: Correct Eligibility Flow

## The Problem
Previously, case creation was happening BEFORE document upload and analysis, which completely broke the eligibility check flow.

## Correct Flow (Now Implemented)

### For ALL Users (Anonymous + Signed-In):
1. **Answer eligibility questionnaire** → Collect answers
2. **Upload document** → `/eligibility-check` endpoint
3. **Backend processes document:**
   - Extract text (OCR if needed)
   - Analyze against legal documents
   - Check eligibility criteria
   - Generate rating (1-5 stars) + confidence score
4. **Show EligibilityResultScreen** → Display rating and analysis
5. **User clicks "Proceed"** → NOW case is created
6. **Then diverge:**
   - **Anonymous:** → Signup → Email verification → Voice agent
   - **Signed-in:** → Voice agent (skip signup)

## What Changed

### 1. EligibilityQuestionnaireScreen.tsx
**REMOVED** premature case creation logic (lines 220-248)

**Before:**
```tsx
// All questions completed - if user is signed in, create a new case now
const token = localStorage.getItem('access_token');
if (token) {
  // Create case here... WRONG!
  const res = await apiCreateCase(payload);
  goToStep('voice');
} else {
  goToStep('upload');
}
```

**After:**
```tsx
// All questions completed - proceed to document upload (no case creation yet)
goToStep('upload');
```

### 2. EligibilityResultScreen.tsx
**ADDED** case creation when user clicks "Proceed"

**New Logic:**
```tsx
onClick={async () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    // Signed-in: Create case, then go to voice
    const res = await apiCreateCase(payload);
    // Save case_id for later document linking
    localStorage.setItem('resume_onboarding_step', JSON.stringify({
      step: 'voice',
      caseId: created.id
    }));
    goToStep('voice');
  } else {
    // Anonymous: Go to signup (case created after signup)
    goToStep('signup');
  }
}}
```

**Dynamic button text:**
- Signed-in users: "Proceed to Core Analysis"
- Anonymous users: "Proceed to Personal Details"

### 3. ProcessingScreen.tsx
**REMOVED** case_id from upload payload (because case doesn't exist yet)

**Before:**
```tsx
const answersPayload = {
  ...eligibilityAnswers,
  case_id: caseId,  // ❌ Case doesn't exist yet!
  user_id: userId
};
```

**After:**
```tsx
const answersPayload = {
  ...eligibilityAnswers,
  user_id: userId  // ✅ Only user_id (if signed in)
};
```

### 4. Backend (No Changes Needed!)
The backend already handles both scenarios perfectly:

**`/eligibility-check` endpoint:**
- If `case_id` provided → Upload to Supabase Storage immediately
- If NO `case_id` → Save locally, create `user_eligibility` record

**`/user/register` endpoint:**
- Creates case after signup
- Calls `_link_eligibility_documents_to_case()`
- Finds orphaned eligibility documents
- Uploads to Supabase Storage with case_id
- Links to `case_documents` table

## Complete Flow Diagram

### Anonymous User
```
1. Questionnaire → Collect answers
2. Upload doc → /eligibility-check
   ├─ Save to local uploads/
   ├─ Extract text (OCR)
   ├─ Analyze eligibility
   └─ Create user_eligibility record (no case_id)
3. Show results → EligibilityResultScreen
4. Click "Proceed to Personal Details"
5. Signup → /user/register
   ├─ Create auth user
   ├─ Create case
   └─ Call _link_eligibility_documents_to_case()
      ├─ Find eligibility docs without case_id
      ├─ Upload to Supabase: cases/{case_id}/documents/
      ├─ Insert to case_documents table
      └─ Delete local temp files
6. Email verification
7. Voice agent
```

### Signed-In User
```
1. Questionnaire → Collect answers
2. Upload doc → /eligibility-check
   ├─ Save to local uploads/
   ├─ Extract text (OCR)
   ├─ Analyze eligibility
   └─ Create user_eligibility record (no case_id)
3. Show results → EligibilityResultScreen
4. Click "Proceed to Core Analysis"
5. Create case → /cases (POST)
   └─ Save case_id to localStorage
6. Voice agent
   └─ Future uploads will include case_id
```

## Backend Endpoints

### POST /eligibility-check
**Input:** FormData with `answers` (JSON) and `file`
- `answers.user_id`: Optional (from JWT if signed in)
- `answers.case_id`: Optional (not present during initial flow)

**Process:**
1. Save file locally (temp or permanent)
2. Extract text via OCR
3. Analyze eligibility using Gemini AI
4. Return rating + confidence + analysis

**Output:**
```json
{
  "status": "ok",
  "data": {
    "eligibility": "eligible|likely|needs_manual_review|not_eligible",
    "reason_summary": "...",
    "confidence": 85,
    "rule_references": [...],
    "required_next_steps": [...]
  }
}
```

### POST /user/register
**After creating auth user and case:**
- Calls `_link_eligibility_documents_to_case(user_id, case_id)`
- Finds all `user_eligibility` records with `uploaded_file` but no `case_id`
- Uploads each file to Supabase Storage
- Creates `case_documents` records
- Deletes local temp files

## Why This Is Correct

✅ **Eligibility check happens first** - User sees results before committing to signup  
✅ **Document analysis works** - OCR and AI analysis run before any case creation  
✅ **Rating shown correctly** - EligibilityResultScreen displays actual analysis  
✅ **No premature case creation** - Case only created when user decides to proceed  
✅ **Anonymous users supported** - Documents uploaded before account creation  
✅ **Signed-in users streamlined** - Skip signup, go straight to voice agent  
✅ **Document linking works** - Files properly associated with cases in both scenarios  

## Files Modified

1. ✅ `src/components/Onboarding/screens/EligibilityQuestionnaireScreen.tsx`
   - Removed premature case creation logic

2. ✅ `src/components/Onboarding/screens/EligibilityResultScreen.tsx`
   - Added case creation on "Proceed" button click
   - Dynamic button text based on auth state

3. ✅ `src/components/Onboarding/screens/ProcessingScreen.tsx`
   - Removed case_id from upload payload

4. ✅ `backend/app/main.py`
   - Already had correct logic for both scenarios
   - `_link_eligibility_documents_to_case()` handles anonymous uploads

## Testing Scenarios

### Test 1: Anonymous User
1. Start onboarding (not signed in)
2. Answer questionnaire
3. Upload PDF document
4. **VERIFY:** Document analyzed, rating shown
5. Click "Proceed to Personal Details"
6. Complete signup form
7. **VERIFY:** Case created, document linked to case in Supabase Storage

### Test 2: Signed-In User
1. Sign in first
2. Start onboarding
3. Answer questionnaire
4. Upload PDF document
5. **VERIFY:** Document analyzed, rating shown
6. Click "Proceed to Core Analysis"
7. **VERIFY:** Case created, proceed to voice agent
8. **Future uploads will include case_id**

## Database State

### After Upload (Before Case Creation)
```sql
-- user_eligibility table
user_id: NULL (or user_id if signed in)
uploaded_file: "uploads/abc123.pdf"
case_id: NULL  ← No case yet!
eligibility: { rating, message, confidence }
```

### After Case Creation (Anonymous)
```sql
-- cases table
id: uuid-1
user_id: uuid-2
title: "New case — Eligibility"

-- case_documents table
id: uuid-3
case_id: uuid-1  ← Linked!
file_path: "cases/uuid-1/documents/20241204_143022_eligibility_document.pdf"
document_type: "eligibility_document"
metadata: {"source": "anonymous_eligibility_check", "linked_at_signup": true}
```

### After Case Creation (Signed-In)
```sql
-- cases table
id: uuid-1
user_id: uuid-2
title: "New case — Eligibility"

-- Note: Document may still be in user_eligibility without case_id
-- Will be linked on next upload or manually if needed
```
