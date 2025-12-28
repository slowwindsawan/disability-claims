# Agreement Signed Column Implementation

## Overview
When a user completes signing the Power of Attorney agreement on the checkout page (`http://localhost:3000/checkout?case_id=...`), the `agreement_signed` column in the `cases` table is now updated to `true`.

## Changes Made

### 1. Database Migration
**File**: `backend/db/migrations/012_add_agreement_signed_column.sql`

Created a new migration that adds the `agreement_signed` boolean column to the cases table:
```sql
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_cases_agreement_signed ON public.cases (agreement_signed);
```

**To apply the migration**:
```bash
cd backend
python app/apply_migration.py 012_add_agreement_signed_column
```

Or manually run the SQL in the Supabase SQL editor.

### 2. Backend Endpoint
**File**: `backend/app/main.py` (lines 5827-5880)

The `/boldsign/signature-complete` POST endpoint already has the logic to:
- Accept `caseId` and `documentId` from the request payload
- Update the case's metadata with signature completion details
- Set `agreement_signed = True` in the cases table

The endpoint calls `update_case()` with:
```python
update_case(
    case_id=case_id,
    fields={
        'metadata': metadata,
        'agreement_signed': True
    }
)
```

### 3. Frontend Updates
**File**: `frontend/components/document-signing-iframe.tsx`

Enhanced the DocumentSigningIframe component to automatically call the backend when the user signs the document:

1. **Added `markAsCompletedInternal()` function**: Calls the `/boldsign/signature-complete` endpoint with the documentId, documentType, and caseId

2. **Updated message handler**: When BoldSign sends `onDocumentSigned` event, it now:
   - Sets the signing status to "completed"
   - Calls `onSigningComplete?.()` to update the parent component
   - Automatically calls `markAsCompletedInternal()` to update the backend

3. **Updated `markAsCompleted()` function**: Now uses the internal function to avoid code duplication

## Flow Diagram

```
User completes signing on checkout page
↓
BoldSign iframe sends "onDocumentSigned" message event
↓
DocumentSigningIframe receives message
↓
├─→ Calls onSigningComplete() [parent component updates UI]
└─→ Calls markAsCompletedInternal() [backend API call]
    ↓
    /boldsign/signature-complete POST endpoint
    ↓
    Updates cases table:
    - Sets agreement_signed = TRUE
    - Updates metadata with signature status
    ↓
    ✅ Database updated successfully
```

## Implementation Details

### Request Payload
```json
{
  "documentId": "document_id_from_boldsign",
  "documentType": "powerOfAttorney",
  "caseId": "case_id_from_url"
}
```

### Response
```json
{
  "status": "ok",
  "message": "Signature marked as complete"
}
```

### Database Update
```sql
UPDATE cases 
SET agreement_signed = true, 
    metadata = jsonb_set(metadata, '{signature_status}', '"completed"'),
    signature_completed_at = NOW()
WHERE id = 'case_id';
```

## Testing

1. **Apply the migration**:
   ```bash
   cd backend
   python app/apply_migration.py 012_add_agreement_signed_column
   ```

2. **Test the flow**:
   - Navigate to `http://localhost:3000/checkout?case_id=a5984e6a-9aea-40fa-9b58-1bc87b418106`
   - Check the Power of Attorney checkbox
   - Sign the document through BoldSign
   - Verify in the database that `agreement_signed` is set to `true`:
     ```sql
     SELECT id, agreement_signed, metadata 
     FROM cases 
     WHERE id = 'a5984e6a-9aea-40fa-9b58-1bc87b418106';
     ```

## Verification Checklist

- [x] Migration file created with correct SQL
- [x] apply_migration.py updated to accept command-line arguments
- [x] Backend endpoint already configured to update `agreement_signed`
- [x] Frontend component automatically calls backend when signing completes
- [x] Error handling in place for failed backend calls
- [x] Console logging for debugging

## Notes

- The `agreement_signed` column defaults to `FALSE`
- An index is created on this column for faster queries
- The migration is idempotent (uses `IF NOT EXISTS`)
- The implementation automatically triggers without requiring user button clicks (click is optional)
- Previous signing sessions will have `agreement_signed = false` until they sign again
