# Quick Reference Card - Case Status System

## 🎯 What This Does

Tracks disability claim progress through 4 stages:
1. **Initial questionnaire** - User completed eligibility call
2. **Document submission** - Documents are being uploaded  
3. **Submission pending** - Ready for final review
4. **Submitted** - Under review

## 📊 Admin Dashboard Display

```
User Name | Products      | Status             | Docs  | Progress
----------|---------------|-------------------|-------|----------
John Doe  | Work Disab.   | Initial quest...   | 0/3   | ███░░░
Jane Smith| Mobility,Srv  | Submission pending | 3/3   | ███████░
```

## 🔧 Backend Files

### constants.py
```python
from backend.app.constants import CaseStatusConstants

# Valid statuses:
CaseStatusConstants.INITIAL_QUESTIONNAIRE      # "Initial questionnaire"
CaseStatusConstants.DOCUMENT_SUBMISSION        # "Document submission"
CaseStatusConstants.SUBMISSION_PENDING         # "Submission pending"
CaseStatusConstants.SUBMITTED                  # "Submitted"

# Helper methods:
CaseStatusConstants.is_valid_status(status)
CaseStatusConstants.get_next_status(current)
CaseStatusConstants.ALL_STATUSES  # List of all
```

### case_status_manager.py
```python
from backend.app.case_status_manager import CaseStatusManager

# Get appropriate status for a case:
new_status = CaseStatusManager.get_status_for_case(case_data)

# Get progress percentage:
progress = CaseStatusManager.get_progress_percentage(status)
# Returns: 25, 50, 75, or 100

# Check if should update:
should_update = CaseStatusManager.should_update_to_submission_pending(case_data)
```

### main.py Updates
```python
# When call_summary is saved:
update_case(case_id, {
    'call_summary': json.dumps(analysis),
    'status': CaseStatusConstants.INITIAL_QUESTIONNAIRE
})

# When documents uploaded:
new_status = update_case_status(case_id, case_data)
# Automatically determines new status
```

## 🎨 Frontend Files

### caseStatusConstants.ts
```tsx
import { 
  CASE_STATUS, 
  STATUS_COLORS, 
  STATUS_LABELS,
  STATUS_PROGRESS,
  type CaseData
} from "@/lib/caseStatusConstants";

// Status values:
CASE_STATUS.INITIAL_QUESTIONNAIRE
CASE_STATUS.DOCUMENT_SUBMISSION
CASE_STATUS.SUBMISSION_PENDING
CASE_STATUS.SUBMITTED

// For display:
STATUS_LABELS[status]      // "שאלון התחלתי"
STATUS_COLORS[status]      // "bg-blue-100 text-blue-700"
STATUS_PROGRESS[status]    // 25, 50, 75, 100

// Utilities:
getProductsList(callSummary)        // ["Work Disability"]
getDocumentCount(documentSummaries) // 3
getStatusProgress(status)            // 50
```

### adminCasesApi.ts
```tsx
import { fetchAdminCases, fetchCaseDetail } from "@/lib/adminCasesApi";

// Fetch cases:
const response = await fetchAdminCases({ 
  limit: 20, 
  offset: 0,
  status: "Document submission",
  search: "john"
});
// Returns: { status, cases, total }

// Fetch one case:
const caseData = await fetchCaseDetail(caseId);
```

### useAdminCases.ts
```tsx
import { useAdminCases } from "@/hooks/useAdminCases";

const { 
  cases,        // CaseData[]
  loading,      // boolean
  error,        // Error | null
  total,        // number
  refetch,      // () => Promise<void>
  updateFilters // (options) => void
} = useAdminCases();

// Update filters:
updateFilters({ 
  status: "Submission pending",
  search: "Jane",
  limit: 20,
  offset: 0
});
```

### AdminCasesTable.tsx
```tsx
import AdminCasesTable from "@/components/AdminCasesTable";

<AdminCasesTable
  cases={cases}
  loading={false}
  onCaseClick={(caseData) => {
    console.log("Clicked case:", caseData);
  }}
/>
```

## 🔌 API Endpoints

### List Cases
```bash
GET /api/admin/cases
  ?limit=20
  &offset=0
  &status=Document submission
  &search=john

Response: { status, cases[], total }
```

### Get Case Details
```bash
GET /api/admin/cases/{case_id}

Response: { case }
```

### Update Case Status (Optional)
```bash
PATCH /api/admin/cases/{case_id}
Body: { "status": "Submitted" }
```

## 📱 Component Structure

```
AdminDashboard
├── useAdminCases() ───────────→ Fetch cases from API
│                              ↓
├── AdminCasesTable
│   ├── Search & Filters
│   ├── Table Header
│   └── Table Rows (per case)
│       ├── User Info
│       ├── Products (from call_summary.products)
│       ├── Status Badge (colored)
│       ├── Progress Bar
│       ├── Document Count (uploaded/requested)
│       └── Actions (email, view, etc.)
│
└── Case Detail Modal (optional)
    └── Full case information
```

## 🚀 Common Tasks

### Show Products
```tsx
{caseData.call_summary?.products?.map(p => (
  <Badge key={p}>{p}</Badge>
))}
```

### Show Document Status
```tsx
const docs = caseData.document_summaries || {};
const requested = caseData.call_summary?.documents_requested_list || [];
`${Object.keys(docs).length}/${requested.length}`
```

### Show Progress
```tsx
const progress = STATUS_PROGRESS[caseData.status];
<ProgressBar value={progress} />
```

### Filter Cases
```tsx
const { updateFilters } = useAdminCases();

updateFilters({ 
  status: "Submission pending" 
});
```

## 🔍 Database Queries

### Check Status Distribution
```sql
SELECT status, COUNT(*) as count 
FROM cases 
GROUP BY status;
```

### Find Cases Needing Documents
```sql
SELECT id, user_id, status, 
       jsonb_array_length(call_summary->'documents_requested_list') as needed_docs,
       jsonb_object_keys(document_summaries) as uploaded_docs
FROM cases
WHERE status = 'Document submission'
LIMIT 10;
```

### Get Full Case Info
```sql
SELECT id, user_id, status, 
       call_summary->>'products' as products,
       call_summary->>'case_summary' as summary
FROM cases
WHERE id = 'case-uuid'
LIMIT 1;
```

## ⚠️ Common Mistakes

❌ Hardcoding status strings
```tsx
// BAD
if (status === 'Initial questionnaire') { }

// GOOD
if (status === CASE_STATUS.INITIAL_QUESTIONNAIRE) { }
```

❌ Not parsing JSON
```tsx
// BAD
{caseData.call_summary.products}

// GOOD
{getProductsList(caseData.call_summary)}
```

❌ Wrong endpoint
```bash
# BAD
/admin/cases (no /api prefix)

# GOOD
/api/admin/cases
```

❌ Status not updating
```python
# BAD - manual update only
update_case(id, {'status': 'Submitted'})

# GOOD - auto-determines status
new_status = update_case_status(id, case_data)
```

## 📖 Documentation Files

- **Schema**: `CASE_STATUS_SCHEMA.md`
- **Quick Start**: `CASE_STATUS_QUICK_REFERENCE.md`
- **Implementation**: `CASE_STATUS_IMPLEMENTATION.md`
- **Admin Setup**: `ADMIN_PAGE_IMPLEMENTATION.md`
- **Integration**: `ADMIN_DASHBOARD_INTEGRATION.md`
- **Deployment**: `DEPLOYMENT_CHECKLIST.md`
- **Visual**: `VISUAL_SUMMARY.md`

## ✅ Verification Checklist

- [ ] Backend imports work: `python -c "from app.constants import CaseStatusConstants"`
- [ ] Frontend builds: `npm run build`
- [ ] API returns cases: `curl http://localhost:8000/api/admin/cases`
- [ ] Cases have status: `SELECT DISTINCT status FROM cases`
- [ ] Products display: Check admin page "Products" column
- [ ] Progress shows: Check progress bars at 25%/50%/75%/100%
- [ ] Filters work: Can filter by status
- [ ] Search works: Can search by name/email/ID

## 🆘 Troubleshooting

**Status is NULL?**
- Run migration: `python -m backend.db.migrations.migrate_case_statuses`

**Products not showing?**
- Check `call_summary` has `products` array

**API 401 error?**
- Verify user is admin
- Check auth token

**TypeScript errors?**
- Run `npm run build` to see full errors
- Check imports match file paths

## Quick Links

```
Backend Status Update:  main.py line ~1581
Document Upload:        main.py line ~567
Constants:             constants.py
Manager Logic:         case_status_manager.py
Frontend Hook:         useAdminCases.ts
Table Component:       AdminCasesTable.tsx
API Service:           adminCasesApi.ts
Frontend Constants:    caseStatusConstants.ts
```

---

**Last Updated**: December 24, 2025
**Version**: 1.0 - Complete Implementation
