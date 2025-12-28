# Quick Reference: Eligibility Check Feature

## What Changed?
When a logged-in user clicks "Test Eligibility", the system now automatically checks if they already have an eligibility record. If they do, they skip the quiz and go straight to the voice agent.

## User Flow

### **New User (No Record)**
```
Click "Test Eligibility"
  ↓ (already logged in)
Check records (API call)
  ↓ (no records found)
Eligibility Quiz (6 steps)
  ↓
Voice Agent (VAPI)
  ↓
Dashboard
```

### **Returning User (Has Record)**
```
Click "Test Eligibility"
  ↓ (already logged in)
Check records (API call)
  ↓ (records found!)
Skip quiz ✓
  ↓
Voice Agent (VAPI) - directly!
  ↓
Dashboard
```

## Implementation Details

**File Modified**: `frontend/app/page.tsx`

**Function**: `handleStartQuiz()`

**Key Changes**:
1. Added `isCheckingEligibility` state variable
2. Made function async
3. Added API call to `/auth/me` endpoint
4. Check eligibilities array
5. Route to "ai-lawyer" state if records exist
6. Route to "wizard" state if no records or error

## API Call
```
GET /auth/me
Authorization: Bearer {token}
```

Response includes `user.eligibilities[]` array.

## Error Handling
- If API fails → defaults to eligibility quiz
- If no token → defaults to eligibility quiz
- If network error → defaults to eligibility quiz
- All errors logged to console

## States Used
- `"wizard"` - Eligibility quiz (new users)
- `"ai-lawyer"` - Voice agent (existing records or after quiz)
- `"phone"` - Login screen (not logged in)

## Testing

1. **New user**: Should see eligibility quiz
2. **Returning user**: Should skip quiz and go to voice agent
3. **Logged out user**: Should show login screen

Run tests in console:
```javascript
// Check if token exists
localStorage.getItem('access_token')

// Check API response
fetch('/auth/me', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
}).then(r => r.json()).then(d => console.log(d.user.eligibilities))
```

## Status
✅ Complete and ready for testing
