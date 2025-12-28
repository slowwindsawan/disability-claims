# Complete Onboarding Flow Implementation

## Overview

This document describes the complete user onboarding flow from initial signup to AI lawyer consultation. The implementation integrates OTP verification, email/password signup, eligibility questionnaire, and VAPI AI lawyer consultation.

## Flow Diagram

```
Landing Page
    ↓
[Check Eligibility Button]
    ↓
1. Phone Number Entry (OTP)
    ↓
2. OTP Code Verification
    ↓
3. Email & Password Signup
    ↓
4. Eligibility Questionnaire (15 questions)
    ↓
5. AI Lawyer Consultation (VAPI)
    ↓
Dashboard
```

## Implementation Details

### 1. Phone Number & OTP Verification

**Location**: `frontend/app/page.tsx` (otpState: "phone" → "code" → "success")

**Features**:
- Mobile phone input with Israel country code (+972)
- 4-digit OTP code entry
- Auto-advance between digits
- Visual success confirmation

**State Management**:
```typescript
const [phone, setPhone] = useState("")
const [otpCode, setOtpCode] = useState(["", "", "", ""])
const [otpState, setOtpState] = useState<"phone" | "code" | "success" | "signup" | "eligibility" | "ai-lawyer">("phone")
```

### 2. Email & Password Signup

**Location**: `frontend/app/page.tsx` (otpState: "signup")

**Features**:
- Email validation (format check)
- Password strength requirement (minimum 6 characters)
- Password confirmation matching
- Error handling and display
- Loading states during API calls

**Backend Endpoint**: `POST /signup-with-case`

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
  "access_token": "jwt_token",
  "message": "User account and case created successfully"
}
```

**Database Operations**:
1. Creates auth user in Supabase Auth (with email auto-confirmation)
2. Creates user_profile record with user details
3. Creates initial case record linked to user
4. Returns access token for authenticated requests

### 3. Eligibility Questionnaire

**Location**: `frontend/components/eligibility-questionnaire.tsx`

**Features**:
- 15 questions covering all eligibility criteria
- Smart conditional logic (questions appear based on previous answers)
- Multiple question types:
  - Yes/No buttons
  - Multiple choice radio buttons
  - Date picker (injury date)
  - Text input (free form answers)
- Progress bar showing completion percentage
- Ineligibility detection (stops flow if work-related = No)
- Optional vs required question indicators
- Help text for each question explaining its importance

**Question Categories**:
1. **Work-related injury** (Critical - stops if No)
2. **Injury date** (Date selection)
3. **Medical treatment status** (Radio: Hospitalized/Outpatient/None)
4. **Unable to work** (Radio: Yes/No/Partially)
5. **Has medical reports** (Yes/No)
6. **Can attend appointment** (Radio: Yes/No/Home only)
7. **Previous disability rating** (Yes/No)
8. **Previous rating details** (Text - conditional)
9. **Has income** (Yes/No)
10. **Income amount** (Text - conditional)
11. **Has lawyer** (Yes/No)
12. **Lawyer contact** (Text - conditional)
13. **Condition worsened** (Radio: Yes/No/No previous rating)
14. **Other injuries** (Yes/No)
15. **Other injury details** (Text - conditional)

**Data Structure**:
```typescript
{
  "work_related": "Yes",
  "injury_date": "2024-01-15",
  "medical_treatment": "מטופל/ת אמבולטורית",
  "unable_to_work": "כן, לא יכול/ה לעבוד כלל",
  // ... more answers
}
```

**Backend Integration**:
- Answers saved to case metadata via `PATCH /cases/{case_id}`
- Stored in `cases.metadata` as JSON
- Used for eligibility scoring and document recommendations

### 4. AI Lawyer Consultation (VAPI)

**Location**: 
- Wrapper: `frontend/components/ai-lawyer-wrapper.tsx`
- Interface: `frontend/components/ai-lawyer-interface.tsx`

**Features**:
- VAPI voice agent integration (existing implementation)
- Error handling wrapper that catches VAPI failures
- Retry mechanism for failed connections
- Skip option if user doesn't want voice consultation
- Visual feedback during loading and errors
- Continue button to proceed to dashboard after consultation

**Error Handling**:
```typescript
// Catches errors related to:
- VAPI loading failures
- Voice/audio permission issues
- Network connectivity problems
- API timeouts

// User options:
1. Retry connection
2. Skip voice consultation
3. Continue to dashboard
```

**User Experience**:
- Full-screen voice consultation interface
- Real-time AI legal advisor conversation
- Floating tags showing detected information
- Professional lawyer avatar and UI
- Encrypted connection indicators

### 5. Case Creation

**Database Schema** (cases table):
```sql
create table public.cases (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  title text null,
  description text null,
  status text null,
  metadata jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  boldsign_document_id text null,
  signature_status text null default 'pending'::text,
  signature_completed_at timestamp with time zone null,
  call_details jsonb null,
  call_summary jsonb null,
  document_summaries jsonb null,
  followups jsonb null,
  constraint cases_pkey primary key (id),
  constraint cases_user_id_fkey foreign key (user_id) references user_profile (user_id) on delete cascade
)
```

**Case Metadata Structure**:
```json
{
  "created_via": "signup",
  "created_at": "2025-12-19T10:30:00Z",
  "eligibility_answers": {
    "work_related": "Yes",
    "injury_date": "2024-01-15",
    // ... all questionnaire answers
  }
}
```

## API Endpoints

### POST /signup-with-case
Creates user account and initial case in one atomic operation.

**Authentication**: None (public endpoint)

**Request Body**:
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
  "access_token": "jwt_token",
  "message": "User account and case created successfully"
}
```

**Error Responses**:
- 400: Missing required fields or invalid format
- 409: User already exists
- 500: Server error during creation

### PATCH /cases/{case_id}
Updates case with eligibility answers and other metadata.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "metadata": {
    "eligibility_answers": { /* questionnaire answers */ }
  },
  "description": "Eligibility answers collected at 2025-12-19T10:30:00Z"
}
```

**Response**:
```json
{
  "status": "ok",
  "case": { /* updated case object */ }
}
```

## State Management

**Frontend State** (`frontend/app/page.tsx`):
```typescript
// Flow state
const [otpState, setOtpState] = useState<"phone" | "code" | "success" | "signup" | "eligibility" | "ai-lawyer">("phone")

// User data
const [phone, setPhone] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const [confirmPassword, setConfirmPassword] = useState("")

// Eligibility data
const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, string>>({})

// IDs for backend integration
const [userId, setUserId] = useState<string | null>(null)
const [caseId, setCaseId] = useState<string | null>(null)

// UI state
const [signupLoading, setSignupLoading] = useState(false)
const [signupError, setSignupError] = useState("")
```

## Error Handling

### Signup Errors
- Email already exists (409)
- Weak password (< 6 chars)
- Passwords don't match
- Invalid email format
- Network errors

### Eligibility Errors
- Ineligibility detection (work-related = No)
- Missing required answers
- Backend save failures (non-blocking)

### AI Lawyer Errors
- VAPI loading failures
- Audio permission denied
- Network connectivity issues
- API timeouts
- Offers retry and skip options

## Testing Checklist

### Phone & OTP Flow
- [ ] Phone number validation (9-10 digits)
- [ ] OTP code entry with auto-advance
- [ ] Success animation displays
- [ ] Transitions to signup screen

### Signup Flow
- [ ] Email validation works
- [ ] Password strength check (6+ chars)
- [ ] Password confirmation matching
- [ ] Error messages display correctly
- [ ] User creation succeeds
- [ ] Case creation succeeds
- [ ] Access token received and stored

### Eligibility Questionnaire
- [ ] All 15 questions display
- [ ] Progress bar updates correctly
- [ ] Conditional questions show/hide properly
- [ ] Required vs optional indicators work
- [ ] Date picker limits to past dates
- [ ] Ineligibility stops flow appropriately
- [ ] Answers saved to backend
- [ ] Navigation (back/forward) works

### AI Lawyer
- [ ] VAPI interface loads
- [ ] Voice conversation works
- [ ] Error wrapper catches failures
- [ ] Retry mechanism works
- [ ] Skip option available
- [ ] Continue button navigates to dashboard

### End-to-End
- [ ] Complete flow from landing to dashboard
- [ ] Data persists between steps
- [ ] User can login after creation
- [ ] Case visible in dashboard
- [ ] No data loss during flow

## Environment Variables

**Backend** (`.env`):
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# CORS (optional)
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_key
```

## Deployment Notes

### Backend
1. Ensure CORS middleware is configured for production domain
2. Set appropriate environment variables
3. Test signup endpoint thoroughly
4. Monitor case creation success rate

### Frontend
1. Update API_URL to production backend
2. Ensure VAPI keys are production keys
3. Test complete flow in production environment
4. Monitor error rates and user dropoff points

## Future Enhancements

### Potential Improvements
1. **Save & Resume**: Allow users to save progress and resume later
2. **Email Verification**: Add optional email verification step
3. **Phone Verification**: Implement actual OTP via SMS
4. **Multi-language**: Add English translations for all questions
5. **Answer Validation**: Add more sophisticated validation rules
6. **Progress Sync**: Sync progress across devices
7. **Analytics**: Track completion rates and drop-off points
8. **A/B Testing**: Test different question orders and formats
9. **Voice Alternative**: Add text chat option if VAPI fails
10. **Pre-fill**: Pre-populate answers from uploaded documents

## Support & Troubleshooting

### Common Issues

**Issue**: User already exists error
**Solution**: Check if user previously signed up, offer login option

**Issue**: Case not created
**Solution**: Check backend logs, verify database permissions

**Issue**: VAPI not loading
**Solution**: Check VAPI API key, verify browser permissions

**Issue**: Eligibility answers not saving
**Solution**: Verify JWT token is valid, check network connectivity

### Debug Mode
Enable detailed logging by setting `LOG_LEVEL=DEBUG` in backend `.env`

## Contact
For issues or questions, contact the development team or check project documentation.
