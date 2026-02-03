# Onboarding Flow Implementation Summary

## ✅ What Was Implemented:

### User Onboarding Logic

1. **Name Check from Supabase Auth**
   - After phone OTP verification, checks `user.user_metadata.full_name`
   - If null → User is new → Start onboarding from name entry

2. **Case Status Check**
   - Backend returns `case_status` in `/auth/phone-login` response
   - New users get status: `"Initial questionnaire"`
   - Check prevents dashboard access if status is `"Initial questionnaire"`

3. **Onboarding Flow Control**
   ```
   User logs in → OTP verified →
   ├─ No name OR status="Initial questionnaire"
   │   └─> Start wizard (onboarding)
   │       ├─ Step 0: Enter name (saved to backend + Supabase metadata)
   │       ├─ Steps 1-6: Questionnaire
   │       └─ Complete → Status = "Document collection" → Dashboard access
   └─ Has name AND status≠"Initial questionnaire"
       └─> Go directly to dashboard
   ```

---

## Changes Made:

### Frontend (`frontend/app/page.tsx`)

**1. Updated `handleOtpChange` (Line ~290)**
   - Checks user name from Supabase: `result.user?.user_metadata?.full_name`
   - Checks case status from backend: `backendData.case_status`
   - Determines onboarding need: `!userName || caseStatus === 'Initial questionnaire'`
   - Routes accordingly:
     - Needs onboarding → `setOtpState("wizard")` + `setWizardStep(userName ? 1 : 0)`
     - Complete → `router.push("/dashboard")`

**2. Updated `handleSaveName` (Line ~142)**
   - Saves name to backend profile via `/user/profile` PATCH
   - ALSO saves to Supabase auth metadata:
     ```typescript
     await supabase.auth.updateUser({
       data: { full_name: fullName.trim() }
     })
     ```

**3. Updated `handleWizardNext` (Line ~470)**
   - When wizard completes (step 7), updates case status:
     ```typescript
     await fetch(`${BACKEND_BASE_URL}/cases/${caseId}`, {
       method: 'PATCH',
       body: JSON.stringify({ status: 'Document collection' })
     })
     ```
   - Then navigates to `/medical-documents`

---

### Backend (`backend/app/main.py`)

**1. Updated `/auth/phone-login` - New User Path (Line ~6310)**
   - Creates case with initial status:
     ```python
     metadata={'status': 'Initial questionnaire'}
     ```
   - Explicitly updates case status after creation
   - Returns response:
     ```json
     {
       "user_id": "...",
       "case_id": "...",
       "case_status": "Initial questionnaire",
       "is_existing_user": false
     }
     ```

**2. Updated `/auth/phone-login` - Existing User Path (Line ~6283)**
   - Fetches case status from cases table
   - Returns case_status in response:
     ```json
     {
       "user_id": "...",
       "case_id": "...",
       "case_status": "Document collection",  // or "Initial questionnaire"
       "is_existing_user": true
     }
     ```

---

## Flow Examples:

### Example 1: Brand New User
```
1. User enters phone +972501234567
2. Receives OTP, enters 1234
3. Backend creates user + case with status="Initial questionnaire"
4. Frontend checks: no name, status="Initial questionnaire"
5. → Starts wizard at step 0 (name entry)
6. User enters name "John Doe"
7. Name saved to both backend profile AND Supabase auth metadata
8. Continues through steps 1-6 (questionnaire)
9. On completion, status updated to "Document collection"
10. → Redirected to /medical-documents
```

### Example 2: Returning User (Incomplete Onboarding)
```
1. User logs in with phone
2. Backend finds user, returns case_status="Initial questionnaire"
3. Frontend checks: has name BUT status="Initial questionnaire"
4. → Forces through wizard starting at step 1 (skips name)
5. Completes wizard → Status updated → Dashboard access granted
```

### Example 3: Returning User (Complete Onboarding)
```
1. User logs in with phone
2. Backend returns case_status="Document collection"
3. Frontend checks: has name AND status≠"Initial questionnaire"
4. → Goes directly to dashboard
```

---

## Status Flow:

```
New User → "Initial questionnaire"
            ↓
     Complete wizard
            ↓
     "Document collection"
            ↓
     (Further status changes as documents are uploaded)
```

---

## Database Schema Notes:

### Supabase Auth Table (`auth.users`)
- `user_metadata.full_name` - Stores user's full name
- Used to check if user has completed initial setup

### Backend Cases Table
- `status` column values:
  - `"Initial questionnaire"` - User hasn't completed onboarding
  - `"Document collection"` - Onboarding complete, collecting documents
  - Other statuses for later stages...

---

## Testing Steps:

1. **New User Test:**
   ```bash
   # Clear browser localStorage
   # Login with new phone number
   # Should see name entry screen
   # Complete wizard
   # Should redirect to medical-documents
   ```

2. **Incomplete Onboarding Test:**
   ```sql
   -- Set case status back to Initial questionnaire
   UPDATE cases SET status = 'Initial questionnaire' WHERE id = 'your-case-id';
   ```
   ```bash
   # Login with same phone
   # Should force through wizard again
   ```

3. **Complete Onboarding Test:**
   ```bash
   # Login with phone that completed wizard
   # Should go directly to dashboard
   ```

---

## Key Features:

✅ Name check from Supabase auth metadata
✅ Case status check prevents dashboard bypass
✅ Status set to "Initial questionnaire" for all new users
✅ Wizard completion updates status to "Document collection"
✅ Name saved to both backend AND Supabase auth
✅ Graceful handling of missing data (defaults to wizard)
✅ Console logging for debugging onboarding flow

---

## Files Modified:

1. `frontend/app/page.tsx` - Onboarding logic and routing
2. `backend/app/main.py` - Case status handling in `/auth/phone-login`

**Everything is implemented and ready for testing!**
