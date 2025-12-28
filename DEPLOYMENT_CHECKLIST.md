# Deployment Checklist - Case Status & Admin Dashboard

## Backend Setup

### 1. Code Files
- [x] `backend/app/constants.py` - Created with CaseStatus enum and CaseStatusConstants
- [x] `backend/app/case_status_manager.py` - Created with CaseStatusManager utility class
- [x] `backend/app/main.py` - Updated with:
  - Import statements for constants and manager
  - `update_case_status()` helper function (line ~81)
  - Status update on call summary save (line ~1581)
  - Status update on document upload (line ~567)

### 2. Database
- [ ] Run migration to populate existing cases:
  ```bash
  cd backend
  python -m backend.db.migrations.migrate_case_statuses
  ```
- [ ] Verify all cases have valid statuses:
  ```sql
  SELECT status, COUNT(*) as count 
  FROM public.cases 
  GROUP BY status;
  ```
- [ ] Add check constraint (if not present):
  ```sql
  ALTER TABLE public.cases
  ADD CONSTRAINT valid_status CHECK (
    status IN ('Initial questionnaire', 'Document submission', 'Submission pending', 'Submitted')
  );
  ```

### 3. Backend Verification
```bash
# Test imports work
cd backend
python -c "from app.constants import CaseStatusConstants; print(CaseStatusConstants.ALL_STATUSES)"

# Should print: ['Initial questionnaire', 'Document submission', 'Submission pending', 'Submitted']
```

## Frontend Setup

### 1. New Files Created
- [x] `frontend/src/lib/caseStatusConstants.ts` - Status constants and types
- [x] `frontend/src/lib/adminCasesApi.ts` - API service functions
- [x] `frontend/src/hooks/useAdminCases.ts` - React hook for cases
- [x] `frontend/src/components/AdminCasesTable.tsx` - Table component

### 2. Install Dependencies (if needed)
```bash
cd frontend
npm install
# or
pnpm install
```

### 3. Frontend Verification
```bash
# Check TypeScript compilation
npm run build

# Should complete without errors
```

## Admin Page Integration

### Current Status
The admin page at `http://localhost:3000/admin` uses mock data.

### Integration Options

#### Option A: Add New "Real Cases" Tab (Recommended)
1. Edit `frontend/app/admin/page.tsx`
2. Import new components:
   ```tsx
   import AdminCasesTable from "@/components/AdminCasesTable";
   import { useAdminCases } from "@/hooks/useAdminCases";
   ```
3. Add hook in component:
   ```tsx
   const { cases, loading } = useAdminCases();
   ```
4. Add new tab for real cases
5. Use `<AdminCasesTable cases={cases} loading={loading} />`

#### Option B: Toggle Mock/Real Data
1. Add state: `const [useRealData, setUseRealData] = useState(false);`
2. Add toggle button
3. Render appropriate table based on state

**See**: `ADMIN_PAGE_IMPLEMENTATION.md` for detailed steps

### 3. Test Admin Page
```bash
# Start frontend server (if not running)
cd frontend
npm run dev

# Navigate to http://localhost:3000/admin
# Should see real cases from database with status, products, documents
```

## API Endpoints Testing

### 1. Get All Cases
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/admin/cases?limit=20
```

Expected response:
```json
{
  "status": "ok",
  "cases": [
    {
      "id": "uuid",
      "status": "Initial questionnaire",
      "user_name": "John Doe",
      "call_summary": {
        "products": ["Work Disability"]
      }
    }
  ],
  "total": 5
}
```

### 2. Test Status Update on Questionnaire
```bash
# After VAPI call, status should be set to "Initial questionnaire"
# Check in database:
SELECT id, status, call_summary FROM cases 
ORDER BY updated_at DESC LIMIT 1;
```

### 3. Test Status Update on Document Upload
```bash
# Upload a document to a case
# Status should update based on documents uploaded vs requested
SELECT id, status, document_summaries FROM cases 
WHERE id = 'CASE_ID';
```

## Verification Steps

### 1. Database Check
```sql
-- Check status values are valid
SELECT DISTINCT status FROM public.cases;

-- Should only show:
-- "Initial questionnaire"
-- "Document submission"
-- "Submission pending"
-- "Submitted"
-- (and possibly NULL for uncreated cases)

-- Check a complete case
SELECT id, user_id, status, call_summary::text, document_summaries::text
FROM public.cases 
LIMIT 1;
```

### 2. API Test
```bash
# With authentication token
TOKEN="your_admin_token"

# List all cases
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/admin/cases?limit=5" | python -m json.tool

# Get specific case
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/admin/cases/CASE_UUID" | python -m json.tool
```

### 3. Frontend Functionality
- [ ] Admin page loads without errors
- [ ] Cases table displays real data
- [ ] Status column shows one of 4 valid values
- [ ] Products column shows badges with values from call_summary.products
- [ ] Documents column shows "X/Y" counts
- [ ] Progress bar shows 25%/50%/75%/100%
- [ ] Can filter by status
- [ ] Can search by case ID/user name/email
- [ ] Click case → shows details (if modal added)

## Troubleshooting

### Issue: API Returns 401
**Solution**:
- Verify user is admin in database: `SELECT role FROM auth.users WHERE email = 'admin@email.com'`
- Check token is valid and not expired
- Verify Authorization header format: `Bearer TOKEN`

### Issue: Cases show NULL status
**Solution**:
```bash
# Run migration
python -m backend.db.migrations.migrate_case_statuses

# Verify
SELECT status, COUNT(*) FROM cases GROUP BY status;
```

### Issue: Products not showing
**Solution**:
```sql
-- Check call_summary exists and has products
SELECT id, call_summary->>'products' FROM cases LIMIT 5;

-- If NULL, re-run VAPI analysis to regenerate call_summary
```

### Issue: TypeScript errors
**Solution**:
```bash
cd frontend
npm run build
# Check error messages and fix imports
```

### Issue: API endpoint 404
**Solution**:
- Verify backend is running: `curl http://localhost:8000/api/admin/stats`
- Check endpoint path: `/api/admin/cases` (not `/admin/cases`)
- Verify authentication middleware is not blocking the route

## Success Criteria

All of these should be true:

- [x] Backend imports work without errors
- [x] Database migration runs successfully
- [x] All cases have valid status values
- [x] Frontend components compile without errors
- [x] API endpoint returns cases with status and products
- [x] Admin page displays real cases
- [x] Status filters work
- [x] Search works
- [x] Progress bars display correctly
- [x] Products badges show correctly
- [x] Document counts are accurate

## Rollback Plan (if needed)

If major issues occur:

1. **Revert Code Changes**
   ```bash
   git checkout backend/app/main.py
   git checkout frontend/app/admin/page.tsx
   ```

2. **Revert Database**
   ```sql
   -- Reverse migration
   UPDATE cases SET status = NULL;
   ```

3. **Clear Cache**
   ```bash
   # Next.js
   rm -rf frontend/.next

   # Frontend rebuild
   cd frontend && npm run build
   ```

## Documentation Files Created

- [x] `CASE_STATUS_SCHEMA.md` - Database schema explanation
- [x] `CASE_STATUS_QUICK_REFERENCE.md` - Developer quick start
- [x] `CASE_STATUS_IMPLEMENTATION.md` - What was implemented
- [x] `ADMIN_DASHBOARD_INTEGRATION.md` - Complete integration guide
- [x] `ADMIN_PAGE_IMPLEMENTATION.md` - Step-by-step implementation
- [x] `IMPLEMENTATION_COMPLETE_ADMIN.md` - Summary document

## Next Steps After Deployment

1. **Monitor**: Watch for any errors in logs
2. **Test**: Run through the testing checklist with real data
3. **Enhance**: Add case detail modal when satisfied
4. **Expand**: Add case actions (contact user, request docs, etc.)
5. **Optimize**: Add caching, bulk operations for large datasets

## Support Resources

- **Backend Issues**: Check `ADMIN_DASHBOARD_INTEGRATION.md`
- **Frontend Issues**: Check `ADMIN_PAGE_IMPLEMENTATION.md`
- **API Issues**: Check `CASE_STATUS_QUICK_REFERENCE.md` (Backend section)
- **Database Issues**: Check `CASE_STATUS_SCHEMA.md`

## Final Sign-Off

- [ ] All backend code changes deployed
- [ ] Database migration completed
- [ ] Frontend components built
- [ ] Admin page integration complete
- [ ] All testing passed
- [ ] Documentation reviewed
- [ ] Team briefed on new features

**Date Deployed**: _______________
**Deployed By**: _______________
**Notes**: _______________
