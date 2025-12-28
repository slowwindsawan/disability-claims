# Code Changes: Eligibility Record Check

## File: frontend/app/page.tsx

### Change 1: Added State Variable (Line 54)
```typescript
const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
```

**Purpose**: Tracks the checking process to prevent UI glitches

---

### Change 2: Enhanced handleStartQuiz Function (Lines 66-115)

**Before**:
```typescript
const handleStartQuiz = () => {
  setShowQuiz(true)
  if (isLoggedIn) {
    setOtpState("wizard")
  } else {
    setOtpState("phone")
  }
}
```

**After**:
```typescript
const handleStartQuiz = async () => {
  setShowQuiz(true)
  
  // If already logged in, check if user has existing eligibility record
  if (isLoggedIn) {
    setIsCheckingEligibility(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setOtpState("wizard")
        return
      }

      // Fetch user profile to check for eligibility records
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        const eligibilities = userData?.user?.eligibilities || []
        
        // If user has eligibility records, skip quiz and go directly to voice agent
        if (eligibilities && eligibilities.length > 0) {
          console.log('User has existing eligibility records, skipping quiz and going to voice agent')
          setOtpState("ai-lawyer")
        } else {
          // No existing records, show eligibility quiz
          setOtpState("wizard")
        }
      } else {
        // Error fetching user data, default to wizard
        setOtpState("wizard")
      }
    } catch (error) {
      console.error('Error checking eligibility records:', error)
      // Default to wizard on error
      setOtpState("wizard")
    } finally {
      setIsCheckingEligibility(false)
    }
  } else {
    // Not logged in, show login/signup
    setOtpState("phone")
  }
}
```

---

## Key Improvements

1. **Async Operation**: Function is now `async` to handle API calls
2. **API Integration**: Fetches user data from `/auth/me` endpoint
3. **Smart Routing**: 
   - Has record → `ai-lawyer` state (voice agent)
   - No record → `wizard` state (eligibility quiz)
   - Not logged in → `phone` state (login)
4. **Error Handling**: Gracefully defaults to quiz on any error
5. **Logging**: Console logs for debugging

---

## Logic Flow

```javascript
handleStartQuiz() called
  ↓
showQuiz = true
  ↓
isLoggedIn?
  ├─ NO  → setOtpState("phone") → Stop
  │
  └─ YES → isCheckingEligibility = true
           ↓
           Get token from localStorage
           ↓
           API call: GET /auth/me
           ├─ FAIL → setOtpState("wizard") → Stop
           │
           └─ OK → Get eligibilities array
                  ↓
                  eligibilities.length > 0?
                  ├─ YES → setOtpState("ai-lawyer")
                  └─ NO  → setOtpState("wizard")
           ↓
           isCheckingEligibility = false
```

---

## Integration Points

- **Component**: `AILawyerWrapper` (already exists, handles "ai-lawyer" state)
- **Endpoint**: `/auth/me` (already exists in backend)
- **Database**: Reads from `user_eligibility` table (via backend)
- **States**: Uses existing otpState management

---

## No Breaking Changes

✅ Fully backward compatible
✅ No database schema changes
✅ Uses existing API endpoints
✅ Existing user flows unchanged
✅ Error handling provides fallback
