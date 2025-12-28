# Admin Dashboard - Cases Integration Guide

## Overview
The admin dashboard at `http://localhost:3000/admin` displays all disability claim cases with the new status tracking system integrated.

## Architecture

### Backend Components
- **Constants** (`backend/app/constants.py`): Defines all valid case statuses
- **Status Manager** (`backend/app/case_status_manager.py`): Logic for determining case status
- **Main API** (`backend/app/main.py`): Endpoints that integrate status updates

### Frontend Components
- **Constants** (`frontend/src/lib/caseStatusConstants.ts`): Frontend status constants (mirrors backend)
- **API Service** (`frontend/src/lib/adminCasesApi.ts`): Fetches case data from backend
- **Hook** (`frontend/src/hooks/useAdminCases.ts`): React hook for managing cases state
- **Component** (`frontend/src/components/AdminCasesTable.tsx`): Reusable cases table component
- **Admin Page** (`frontend/app/admin/page.tsx`): Main admin dashboard (Next.js)

## Database Schema Integration

### Cases Table Fields Used
```
id:                   UUID (Primary Key)
user_id:              UUID (Foreign Key)
title:                Text
description:          Text
status:               Text (NEW - tracks case progress)
created_at:           Timestamp
updated_at:           Timestamp
call_summary:         JSONB (Contains products, documents_requested_list, etc.)
document_summaries:   JSONB (Stores uploaded document info)
call_details:         JSONB (Stores VAPI call details)
signature_status:     Text (BoldSign integration)
```

## Status Flow

The case status automatically progresses based on user actions:

```
┌─────────────────────────┐
│  Initial questionnaire  │  ← Case created + questionnaire completed
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│  Document submission    │  ← Questionnaire done, documents needed
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│ Submission pending      │  ← All documents uploaded, ready for review
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│  Submitted              │  ← Final state, case submitted
└─────────────────────────┘
```

## Backend Integration Points

### When Case is Created
- Status is NOT set initially (handled by schema default)
- Initial questionnaire endpoint should set it explicitly

### When Call Summary is Saved (Questionnaire Completed)
**File**: `backend/app/main.py` (Line ~1580)
```python
update_payload = {
    'call_details': call_dict,
    'call_summary': json.dumps(analysis_result, ensure_ascii=False),
    'status': CaseStatusConstants.INITIAL_QUESTIONNAIRE  # SET HERE
}
update_case(case_id, update_payload)
```

### When Documents are Uploaded
**File**: `backend/app/main.py` (Line ~567)
```python
# After document is saved, update case status
updated_case = get_case(case_id)
if updated_case:
    new_status = update_case_status(case_id, updated_case[0])
```

### Admin Endpoints

#### List All Cases
```
GET /api/admin/cases?limit=20&offset=0&status=&search=
```

**Response**:
```json
{
  "status": "ok",
  "cases": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "status": "Initial questionnaire",
      "user_name": "string",
      "user_email": "string",
      "call_summary": {
        "products": ["Work Disability"],
        "call_summary": "...",
        "documents_requested_list": [
          {
            "name": "...",
            "required": true,
            "where_get": "...",
            "why_required": "..."
          }
        ]
      },
      "document_summaries": {...},
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "total": 123
}
```

#### Get Single Case
```
GET /api/admin/cases/{case_id}
```

#### Update Case Status (Optional - usually automatic)
```
PATCH /api/admin/cases/{case_id}
Body: { "status": "Submission pending" }
```

## Frontend Implementation

### Using the AdminCasesTable Component

```tsx
import AdminCasesTable from "@/components/AdminCasesTable";
import { useAdminCases } from "@/hooks/useAdminCases";

export default function AdminPage() {
  const { cases, loading, error, updateFilters } = useAdminCases();

  return (
    <AdminCasesTable
      cases={cases}
      loading={loading}
      onCaseClick={(caseData) => {
        // Handle case click
        console.log("Selected case:", caseData);
      }}
    />
  );
}
```

### Custom Filtering

```tsx
const { cases, updateFilters } = useAdminCases();

// Filter by status
updateFilters({
  status: "Document submission"
});

// Filter by search query
updateFilters({
  search: "John Doe"
});

// Paginate
updateFilters({
  limit: 20,
  offset: 20 // Second page
});
```

## Products Display

The "Products" column displays data from `call_summary.products` array:

```json
{
  "products": [
    "Work Disability",
    "Mobility Allowance"
  ]
}
```

These are displayed as colored badges in the table:
- "Work Disability" → Blue badge
- "Mobility" → Purple badge
- "Special Services" → Orange badge

## Status Indicators

Each case row shows:
- **Status Badge**: Color-coded status (blue/amber/purple/green)
- **Progress Bar**: Visual indicator of completion (25%/50%/75%/100%)
- **Documents Count**: "X/Y" uploaded vs requested
- **Risk Assessment**: "Needs More Info", "High", "Low", etc.

## Document Management

When documents are uploaded:
1. OCR extracts text from PDF/images
2. Document is analyzed for relevance
3. Summary is stored in `document_summaries`
4. Case status automatically updates:
   - If "Initial questionnaire" → stays same
   - If "Document submission" → checks if all required docs uploaded
     - If all uploaded → "Submission pending"
     - If some missing → stays "Document submission"

## Testing the Integration

### Test Case Creation
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d {
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "phone": "1234567890"
  }
```

### Test Admin Dashboard
1. Login as admin user
2. Navigate to `/admin`
3. Should see list of all cases with status, products, documents
4. Filter by status to see case progression

### Database Check
```sql
SELECT id, user_id, status, call_summary, document_summaries, created_at
FROM public.cases
ORDER BY created_at DESC
LIMIT 10;
```

## Known Limitations

1. **Status is not retroactive**: Existing cases without status need migration
   - Run: `python -m backend.db.migrations.migrate_case_statuses`

2. **Status updates are reactive**: Status updates only on:
   - Call summary saved
   - Documents uploaded
   - Manual admin update (if endpoint created)

3. **No status locking**: Cases can move backward in status progression
   - Can be restricted in `CaseStatusManager.validate_status_transition()`

## Future Enhancements

1. **Automatic Status Reset**: Reset to previous status if documents deleted
2. **Status Webhooks**: Notify users when status changes
3. **Status History**: Track all status changes with timestamps
4. **Bulk Status Update**: Admin bulk action to update multiple cases
5. **Status-based Actions**: Auto-trigger notifications/reminders on status change

## Troubleshooting

### Cases showing "Unknown" status
- Check if case `status` field is NULL in database
- Run migration: `python backend/db/migrations/migrate_case_statuses.py`

### Products not displaying
- Check `call_summary` field contains JSON with `products` array
- Verify VAPI analysis is being stored correctly

### Document count wrong
- Check `document_summaries` field is valid JSON object
- Verify `case_documents` table has records for case

## Performance Notes

- Admin page queries all cases (consider pagination in production)
- Case enrichment happens at query time (add caching if needed)
- Document summaries are generated on upload (may be slow for large files)

## Security Considerations

- Only admin/subadmin users can access `/admin/cases`
- Users can only see their own cases in user dashboard
- File uploads are validated (PDF/image only)
- Documents stored in Supabase Storage with signed URLs
