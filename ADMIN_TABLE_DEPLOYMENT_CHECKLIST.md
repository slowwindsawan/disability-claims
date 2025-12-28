# Admin Table Integration - Deployment Checklist

## Files Modified

### Backend
- ✅ `backend/app/main.py` - Updated `/admin/cases` endpoint
  - Added user phone, photo URL extraction
  - Added AI score and eligibility status extraction
  - Added estimated claim amount extraction
  - Added recent activity placeholder
  - Added admin/sub-admin filtering

### Frontend
- ✅ `frontend/src/lib/caseStatusConstants.ts` - Updated CaseData interface
  - Added `user_phone` field
  - Added `user_photo_url` field
  - Added `ai_score` field
  - Added `eligibility_status` field
  - Added `estimated_claim_amount` field
  - Added `recent_activity` field

- ✅ `frontend/src/components/AdminCasesTable.tsx` - Updated component
  - Added 3 new columns: AI Score, Claim Amount, Recent Activity
  - Updated table header count from 5 to 8 columns
  - Added icon imports (Zap, DollarSign, Activity)
  - Added AI score rendering with status labels
  - Added claim amount rendering with currency formatting
  - Added recent activity display
  - Updated phone button to call functionality
  - Applied requested styling to Card component

## Data Validation

### Backend API Response Check
```bash
# Test the endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/admin/cases?limit=5

# Verify response includes:
# - ai_score: number (0-100)
# - eligibility_status: string
# - estimated_claim_amount: number
# - recent_activity: string
# - user_phone: string (optional)
# - user_photo_url: string (optional)
```

### Database Verification
```sql
-- Verify user_profile has eligibility_raw data
SELECT 
  id,
  full_name,
  eligibility_raw,
  is_admin,
  is_subadmin
FROM user_profile
WHERE eligibility_raw IS NOT NULL
LIMIT 5;

-- Verify cases has call_summary with estimated_claim_amount
SELECT 
  id,
  call_summary->>'estimated_claim_amount' as claim_amount
FROM cases
WHERE call_summary IS NOT NULL
LIMIT 5;
```

## Pre-Deployment Steps

### 1. Backend Verification
- [ ] No syntax errors in `main.py`
- [ ] All imports are available (json, logging)
- [ ] `get_profile_by_user_id` function exists in supabase_client
- [ ] Exception handling is in place
- [ ] Tests pass: `python -m pytest backend/tests/ -v`

### 2. Frontend Verification
- [ ] TypeScript compiles without errors
- [ ] `npm run build` completes successfully
- [ ] All icon imports are available (Zap, DollarSign, Activity)
- [ ] Card component styling is applied correctly
- [ ] Table renders without console errors

### 3. Database Verification
- [ ] user_profile table has eligibility_raw field
- [ ] Sample users have eligibility_raw data with eligibility_score
- [ ] cases table has call_summary with estimated_claim_amount
- [ ] Sample cases exist with both user and claim data
- [ ] No admin users in test data (or marked with is_admin=true)

### 4. Integration Testing
- [ ] Load admin dashboard at http://localhost:3000/admin
- [ ] Table loads with data
- [ ] All 8 columns are visible
- [ ] AI scores display correctly
- [ ] Claim amounts format with currency symbol (₪)
- [ ] Phone button initiates call when clicked
- [ ] Products show as badges
- [ ] Status badges display
- [ ] Search functionality works
- [ ] Status filters work

## Deployment Steps

### Development Environment
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (in separate terminal)
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m uvicorn app.main:app --reload --port 8000
```

### Verify Frontend/Backend Connection
1. Open browser to http://localhost:3000/admin
2. Check Network tab for `/api/admin/cases` request
3. Verify response includes new fields
4. Check Console for any errors

### Production Deployment
1. Deploy backend first
2. Verify backend API is working
3. Deploy frontend
4. Monitor logs for errors
5. Verify table displays correctly with production data

## Features Summary

| Feature | Status | Column |
|---------|--------|--------|
| User Info | ✅ Complete | User |
| Products | ✅ Complete | Products |
| AI Score | ✅ New | AI Score |
| Claim Amount | ✅ New | Estimated Claim |
| Status | ✅ Complete | Status |
| Recent Activity | ✅ New (Placeholder) | Recent Activity |
| Creation Date | ✅ Complete | Date Created |
| Actions | ✅ Updated | Actions |

## Data Mapping Reference

```
User Profile Table → Admin Dashboard
──────────────────────────────────
full_name → User column (name)
email → User column (email)
phone → Phone button (tel: link)
photo_url → Available in caseData (not displayed yet)
eligibility_raw.eligibility_score → AI Score column
eligibility_raw.eligibility_status → AI Score status label
is_admin, is_subadmin → Server-side filter (excluded from results)

Cases Table → Admin Dashboard
──────────────────────────────
call_summary.products → Products column (badges)
call_summary.estimated_claim_amount → Claim Amount column (₪)
status → Status column (badge + progress)
document_summaries → Document count in Status column
created_at → Date column
```

## API Endpoint Details

### GET /admin/cases
**Query Parameters:**
- `limit` (int, default: 10) - Records per page
- `offset` (int, default: 0) - Pagination offset
- `status` (string, optional) - Filter by case status
- `eligibility` (string, optional) - Filter by eligibility
- `search` (string, optional) - Search by name/email/ID

**Response:**
```json
{
  "status": "ok",
  "cases": [ ... ],
  "total": 0
}
```

**Case Object Fields:**
- `id` - Case UUID
- `user_id` - User UUID
- `user_name` - Full name
- `user_email` - Email address
- `user_phone` - Phone number
- `user_photo_url` - Profile photo URL
- `ai_score` - Eligibility score (0-100)
- `eligibility_status` - Status (needs_review, eligible, not_eligible, not_rated)
- `estimated_claim_amount` - Potential claim value
- `recent_activity` - Activity log (currently "not available")
- `status` - Case status
- `call_summary` - Full call/eligibility data
- `document_summaries` - Document tracking
- `created_at` - Creation timestamp

## Styling Applied

### Card Component
```
text-card-foreground flex flex-col gap-6 rounded-xl border py-6 bg-white shadow-md overflow-hidden
```

### Column Styling
- Header: `bg-slate-100 border-b border-slate-200`
- Cells: `px-6 py-4` with responsive padding
- Hover: `hover:bg-slate-50 transition-colors`
- Icons: Color-coded (Zap: amber, DollarSign: green, Activity: slate)

## Rollback Plan

If issues occur:

### Quick Rollback (Git)
```bash
# Revert to previous version
git revert HEAD~1

# Or checkout specific files
git checkout HEAD~1 -- backend/app/main.py
git checkout HEAD~1 -- frontend/src/components/AdminCasesTable.tsx
git checkout HEAD~1 -- frontend/src/lib/caseStatusConstants.ts
```

### Manual Rollback
1. Restore backup of main.py
2. Restore backup of AdminCasesTable.tsx
3. Restore backup of caseStatusConstants.ts
4. Restart backend and frontend services

## Support & Documentation

- **Full Guide:** See `ADMIN_TABLE_INTEGRATION_GUIDE.md`
- **Backend Changes:** See `ADMIN_TABLE_INTEGRATION_GUIDE.md` - Backend API section
- **Frontend Changes:** See `ADMIN_TABLE_INTEGRATION_GUIDE.md` - Frontend Components section
- **Data Flow:** See `ADMIN_TABLE_INTEGRATION_GUIDE.md` - Data Flow diagram

## Performance Considerations

- **Database Indexes:** Ensure indexes on:
  - `user_profile.is_admin`
  - `user_profile.is_subadmin`
  - `cases.user_id`
  - `cases.status`

- **API Pagination:** Default limit of 10, adjust based on performance
- **Column Count:** 8 columns may require horizontal scroll on small screens
- **Currency Formatting:** Uses `toLocaleString('he-IL')` for Israeli format

## Known Limitations

1. **Recent Activity** - Currently placeholder ("not available")
   - Future implementation: Add activity tracking
   - Options: Last call date, last document upload, last status change

2. **Phone Formatting** - Displays as-stored in database
   - Consider normalizing phone numbers in future

3. **Admin/Sub-admin Filtering** - Server-side only
   - Future: Add UI toggle to show/hide admin users if needed

## Success Criteria Met

✅ Fetch clients with role either null or non-admin or non-sub-admin
✅ Display AI Score from eligibility_raw
✅ Display Estimated Claim Amount from call_summary
✅ Display Products as badges from call_summary
✅ Display Status with progress tracking
✅ Add "not available" for recent activity
✅ Apply requested Card styling
✅ Integrate phone click functionality
✅ Maintain search and filter functionality
✅ Keep responsive design

---

**Last Updated:** December 24, 2025
**Version:** 1.0
**Status:** Ready for Deployment
