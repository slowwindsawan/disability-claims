# Supabase Phone OTP Authentication Integration

## Overview
The frontend now uses Supabase for phone OTP-based authentication. Email login/signup is hidden in production and only visible in development mode.

## Frontend Changes

### New Files
- **`frontend/lib/supabase-auth.ts`** - Supabase authentication service with:
  - `sendOtp(phone)` - Send OTP to phone number
  - `verifyOtp(phone, otp)` - Verify OTP and get session
  - `signOut()` - Sign out user
  - `getSession()` - Get current session
  - `getCurrentUser()` - Get current user

### Modified Files
- **`frontend/app/page.tsx`**:
  - Default signup method changed from email to phone
  - Email login/signup now hidden unless `NODE_ENV === 'development'`
  - Integrated Supabase phone OTP flow
  - Auto-creates or logs in user based on phone number

## Backend Requirements

### New Endpoint Needed: `/auth/phone-login`

The backend needs to implement this endpoint to sync Supabase authenticated users with your database.

**Method:** `POST`

**Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone": "+972501234567",
  "supabase_user_id": "uuid-from-supabase"
}
```

**Response (200 OK):**
```json
{
  "user_id": "your-db-user-id",
  "case_id": "case-id-if-exists",
  "is_existing_user": true,
  "message": "User logged in successfully"
}
```

**Response (201 Created):** (for new users)
```json
{
  "user_id": "newly-created-user-id",
  "case_id": "newly-created-case-id",
  "is_existing_user": false,
  "message": "New user created successfully"
}
```

### Implementation Logic

1. Verify the Supabase JWT token from Authorization header
2. Check if user exists in your database by:
   - `supabase_user_id` (recommended)
   - or `phone` number
3. If user exists:
   - Return existing `user_id` and `case_id`
   - Set `is_existing_user: true`
4. If user doesn't exist:
   - Create new user record with phone and supabase_user_id
   - Create initial case for the user
   - Return new `user_id` and `case_id`
   - Set `is_existing_user: false`

### Database Schema Addition

Add to your `users` table (or create mapping table):
```sql
ALTER TABLE users ADD COLUMN supabase_user_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX idx_users_supabase_id ON users(supabase_user_id);
CREATE INDEX idx_users_phone ON users(phone);
```

## Environment Variables

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://lfcjfpthgaqrvutfvikx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmY2pmcHRoZ2FxcnZ1dGZ2aWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODg4MzEsImV4cCI6MjA4MDA2NDgzMX0.49GOHecH4ttrzHJG5PGosleFM1SH-0BNf07rF1TvDOU
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Set to 'true' to show email login (for testing only), 'false' or omit for production
NEXT_PUBLIC_SHOW_EMAIL_AUTH=false
```

**Backend** (already configured):
```env
SUPABASE_URL=https://lfcjfpthgaqrvutfvikx.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Testing

### Development Mode (Email visible)
```bash
cd frontend
npm run dev
```
- Both email and phone login options will be visible
- Use for testing backwards compatibility

### Production Mode (Phone only)
```bash
cd frontend
npm run build
npm start
```
- Only phone login will be visible
- Email login completely hidden

## User Flow

### New User
1. Enter phone number → Click "Send Verification Code"
2. Supabase sends SMS with 4-digit OTP
3. User enters OTP → Auto-verifies
4. Backend creates user + case
5. Redirect to wizard (onboarding flow)

### Returning User
1. Enter phone number → Click "Send Verification Code"
2. Supabase sends SMS with 4-digit OTP
3. User enters OTP → Auto-verifies
4. Backend finds existing user
5. Redirect to dashboard

## Security Notes

- Supabase handles all phone verification and SMS sending
- JWT tokens are stored in localStorage
- Backend should verify Supabase JWT on each request
- Phone numbers are stored in E.164 format (+972XXXXXXXXX)

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Failed to send verification code"
- Verify Supabase phone auth is enabled in project settings
- Check that SMS provider is configured in Supabase
- Verify phone number format (+972 for Israel)

### "Backend sync failed"
- Check that `/auth/phone-login` endpoint exists
- Verify JWT verification is working
- Check CORS settings

## Next Steps

1. ✅ Install `@supabase/supabase-js` in frontend
2. ✅ Create `frontend/lib/supabase-auth.ts`
3. ✅ Update `frontend/app/page.tsx` with phone OTP flow
4. ✅ Hide email login except when `NEXT_PUBLIC_SHOW_EMAIL_AUTH=true`
5. ✅ Implement backend `/auth/phone-login` endpoint
6. ✅ Configure Supabase credentials
7. ⏳ **Restart dev server**: `cd frontend && npm run dev`
8. ⏳ Test end-to-end flow with real phone number
9. ⏳ Configure Supabase SMS provider for production (Twilio/other)
