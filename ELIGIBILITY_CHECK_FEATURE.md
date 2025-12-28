# Eligibility Record Check - Implementation Summary

## Feature: Skip Eligibility Quiz for Returning Users

### Overview
When a logged-in user clicks "Test Eligibility", the system now checks if they already have an eligibility record in the `user_eligibility` table. If a record exists, they skip the eligibility quiz and go directly to the voice agent interview.

## Changes Made

### File: `frontend/app/page.tsx`

#### 1. **Added State Variable**
```typescript
const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
```
- Tracks the checking process to prevent UI glitches during the API call

#### 2. **Enhanced `handleStartQuiz` Function**
The function now:

1. **Checks if user is logged in**
   - If not logged in → shows phone login screen
   - If logged in → checks for existing eligibility records

2. **Fetches User Data**
   - Makes API call to `/auth/me` endpoint
   - Includes authorization token
   - Gets user profile with eligibilities array

3. **Analyzes Eligibility Records**
   ```typescript
   const eligibilities = userData?.user?.eligibilities || []
   
   if (eligibilities && eligibilities.length > 0) {
     // User has existing records → skip quiz
     setOtpState("ai-lawyer")
   } else {
     // No records → show eligibility quiz
     setOtpState("wizard")
   }
   ```

4. **Error Handling**
   - Catches network errors
   - Defaults to wizard (eligibility quiz) on error
   - Logs errors to console for debugging

### Flow Diagram

```
User clicks "Test Eligibility"
    ↓
Is user logged in?
    ├─ NO  → Show phone login
    │
    └─ YES → Check eligibility records
             ↓
             API call: GET /auth/me
             ↓
             Has eligibility records?
             ├─ YES  → Go directly to VAPI Voice Agent (ai-lawyer)
             │        └─ router.push("/dashboard") on completion
             │
             └─ NO   → Show eligibility quiz (wizard)
                      └─ Complete all questions
                      └─ Then → VAPI Voice Agent
                      └─ Then → Dashboard
```

## User Experience

### New Users (No Eligibility Records)
1. Click "Test Eligibility"
2. Login/Signup if needed
3. Complete eligibility questionnaire (wizard - 6 steps)
4. Complete voice agent interview (VAPI)
5. Redirected to dashboard

### Returning Users (Has Eligibility Records)
1. Click "Test Eligibility"
2. **Already logged in** → Automatically checks records
3. **Has record** → Skips quiz, goes directly to voice agent
4. Complete voice agent interview (VAPI)
5. Redirected to dashboard

## API Integration

### Endpoint Used
- **GET** `/auth/me`
- **Headers**: `Authorization: Bearer {token}`
- **Response includes**: `eligibilities` array

### Response Structure
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "eligibilities": [
      {
        "id": "eligibility_id",
        "summary": "...",
        "metadata": {...}
      }
    ]
  }
}
```

## Error Handling

| Error Scenario | Behavior |
|---|---|
| No token in localStorage | Defaults to phone login screen |
| API fetch fails | Defaults to eligibility quiz (wizard) |
| Network timeout | Defaults to eligibility quiz (wizard) |
| Invalid token | Defaults to eligibility quiz (wizard) |
| Empty eligibilities array | Shows eligibility quiz (wizard) |

All errors are logged to console for debugging.

## Implementation Status

✅ Logic implemented in `handleStartQuiz`
✅ State variable added for checking status
✅ API call with proper authorization
✅ Error handling with fallbacks
✅ Proper state transitions ("ai-lawyer" state)
✅ Routes to dashboard on completion
✅ Console logging for debugging

## Testing Checklist

- [ ] Log in with existing user
- [ ] Click "Test Eligibility"
- [ ] Verify API call is made
- [ ] Verify user goes directly to voice agent
- [ ] Verify voice agent loads (VAPI)
- [ ] Complete voice conversation
- [ ] Verify redirect to dashboard
- [ ] Test error handling (disable network, invalid token)
- [ ] Verify new users still see quiz
- [ ] Check console for proper logging

## Notes

- The feature uses the existing `ai-lawyer` otpState which was already set up in the UI
- The eligibility records are fetched from the backend's `/auth/me` endpoint
- The implementation is non-blocking - if the check fails, users still get the quiz
- No database schema changes required
- Backward compatible with existing user flows
