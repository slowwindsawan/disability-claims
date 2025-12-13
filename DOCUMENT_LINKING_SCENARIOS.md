# Document Linking for Both User Scenarios

## Overview
Implemented automatic document linking that handles both anonymous and signed-in user flows, ensuring uploaded eligibility documents are always properly organized by case_id in Supabase Storage.

## Two Scenarios

### Scenario 1: Anonymous User (Upload → Signup → Case Creation)
**Flow:**
1. User uploads document during eligibility check (no account yet)
2. `/eligibility-check` endpoint saves file locally to `uploads/` directory
3. Creates `user_eligibility` record with `uploaded_file` path but **NO** `case_id`
4. User completes signup form
5. `/user/register` endpoint creates auth user + profile
6. **NEW:** Creates initial case and calls `_link_eligibility_documents_to_case()`
7. Helper function finds eligibility records with uploaded files but no case_id
8. Uploads files to Supabase Storage: `cases/{case_id}/documents/{timestamp}_eligibility_document{ext}`
9. Inserts records to `case_documents` table
10. Deletes temporary local files after successful upload

**Code Location:** `backend/app/main.py`
- Lines 784-875: `_link_eligibility_documents_to_case()` helper function
- Lines 935-942: Call to helper after case creation (verification required path)
- Lines 975-982: Call to helper after case creation (no verification path)

### Scenario 2: Signed-In User (Case Creation → Document Upload)
**Flow:**
1. User is already signed in
2. Case is created in `EligibilityQuestionnaireScreen` (frontend)
3. `case_id` stored in localStorage
4. User uploads document during eligibility check
5. `/eligibility-check` receives `case_id` in answers payload
6. Immediately uploads to Supabase Storage: `cases/{case_id}/documents/{timestamp}_{filename}`
7. Inserts record to `case_documents` table
8. Saves temp local copy for OCR processing only

**Code Location:** `backend/app/main.py`
- Lines 625-698: `/eligibility-check` endpoint with case_id handling
- Lines 657-698: Supabase Storage upload when `case_id` is present

## Key Implementation Details

### Helper Function: `_link_eligibility_documents_to_case()`
```python
def _link_eligibility_documents_to_case(user_id: str, case_id: str):
    """
    Finds user_eligibility records with uploaded files but no case_id,
    uploads those files to Supabase Storage organized by case_id,
    and inserts records to case_documents table.
    """
```

**What it does:**
1. Queries all eligibility records for the user
2. Filters for records with `uploaded_file` but no `case_id`
3. For each matching record:
   - Reads the local file
   - Uploads to `case-documents` bucket in Supabase Storage
   - Creates path: `cases/{case_id}/documents/{timestamp}_eligibility_document{ext}`
   - Inserts to `case_documents` table with metadata:
     - `document_type`: 'eligibility_document'
     - `uploaded_by`: user_id
     - `metadata`: `{'source': 'anonymous_eligibility_check', 'linked_at_signup': True}`
   - Deletes local temp file after successful upload

### Frontend Integration
**File:** `src/components/Onboarding/screens/ProcessingScreen.tsx`
- Lines 23-48: Extracts `case_id` from localStorage and `user_id` from JWT token
- Includes both in the answers payload sent to `/eligibility-check`

**Storage Path Pattern:**
```
cases/
  └── {case_id}/
      └── documents/
          ├── 20241204_143022_eligibility_document.pdf  (from anonymous upload)
          ├── 20241204_150315_medical_report.pdf
          └── 20241204_162048_pay_slip.pdf
```

## Database Schema

### `case_documents` Table
```sql
CREATE TABLE case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  document_type TEXT DEFAULT 'general',
  uploaded_by UUID REFERENCES user_profile(user_id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Document Types
- `eligibility_document` - Documents uploaded during eligibility check
- `medical_report` - Medical records
- `pay_slip` - Income documents
- `identity` - ID documents
- `general` - Other documents

## Metadata Tracking

### Anonymous Upload Metadata
```json
{
  "source": "anonymous_eligibility_check",
  "linked_at_signup": true
}
```

### Signed-In Upload Metadata
```json
{
  "source": "eligibility_check"
}
```

## Error Handling

### Scenario 1 (Anonymous)
- If local file not found → logs warning, continues with other files
- If upload fails → logs exception, continues with other files
- If `insert_case_document` fails → logs exception, continues
- All errors are non-fatal to avoid breaking the signup flow

### Scenario 2 (Signed-In)
- If upload fails → raises HTTPException 500
- If `insert_case_document` fails → raises HTTPException 500
- Errors are fatal because user expects immediate feedback

## Testing Checklist

### Scenario 1: Anonymous User
- [ ] Upload document without being signed in
- [ ] Verify file saved to local `uploads/` directory
- [ ] Verify `user_eligibility` record created with `uploaded_file` path and no `case_id`
- [ ] Complete signup flow
- [ ] Verify case created with proper metadata
- [ ] Verify `_link_eligibility_documents_to_case()` called
- [ ] Check Supabase Storage for file at `cases/{case_id}/documents/...`
- [ ] Verify `case_documents` record created with correct metadata
- [ ] Verify local temp file deleted after upload

### Scenario 2: Signed-In User
- [ ] Sign in first
- [ ] Complete eligibility questionnaire (case created)
- [ ] Verify `case_id` stored in localStorage
- [ ] Upload document during eligibility check
- [ ] Verify file uploaded directly to Supabase Storage
- [ ] Verify `case_documents` record created immediately
- [ ] Verify temp local copy created for OCR
- [ ] Check that document appears in case detail view

## Benefits

1. **No Data Loss:** Documents are never lost regardless of signup timing
2. **Proper Organization:** All documents organized by case_id in Supabase Storage
3. **Backward Compatible:** Falls back to local storage if no case_id provided
4. **Clean Separation:** Anonymous vs signed-in flows handled transparently
5. **Easy Retrieval:** All case documents accessible via `/cases/{case_id}/documents`
6. **Automatic Cleanup:** Temp files deleted after successful upload to storage

## Future Enhancements

1. **Batch Upload:** Process multiple pre-signup documents in a single transaction
2. **Storage Quotas:** Add user/case storage limits
3. **Document Preview:** Generate thumbnails for images during upload
4. **Retention Policy:** Auto-delete documents after case closure + 90 days
5. **Virus Scanning:** Scan uploaded files before storage
6. **Document Versioning:** Track document revisions over time

## API Endpoints Summary

### POST /eligibility-check
- **Anonymous:** Saves locally, creates eligibility record (no case_id)
- **Signed-In:** Uploads to Storage immediately (with case_id)

### POST /user/register
- Creates auth user and profile
- Creates initial case
- **NEW:** Calls `_link_eligibility_documents_to_case()` to upload pre-signup documents

### GET /cases/{case_id}/documents
- Returns all documents for a case
- Authorization: User must own case or be admin

### POST /cases/{case_id}/documents
- Upload additional documents to existing case
- Authorization: User must own case or be admin

### DELETE /cases/{case_id}/documents/{document_id}
- Delete document from storage and database
- Authorization: User must own case or be admin

## Files Modified

1. `backend/app/main.py`
   - Added `_link_eligibility_documents_to_case()` helper function
   - Updated `/user/register` to call helper after case creation (both paths)
   - Existing `/eligibility-check` already handles both scenarios correctly

2. `src/components/Onboarding/screens/ProcessingScreen.tsx`
   - Already updated to pass `case_id` and `user_id` in answers payload

3. `backend/app/supabase_client.py`
   - Already has helper functions: `storage_upload_file()`, `insert_case_document()`

4. `backend/db/migrations/002_create_case_documents_table.sql`
   - Already created in previous implementation

## Configuration Required

1. **Supabase Storage Bucket:** `case-documents` (must be created)
2. **Environment Variables:** No new variables required
3. **Database Migration:** Run `002_create_case_documents_table.sql`

## Security Considerations

- All endpoints enforce proper authorization (user owns case or is admin)
- Files stored with random UUIDs to prevent enumeration
- Storage bucket should be configured as public for easy access (URLs contain unguessable paths)
- Consider adding file type validation (PDFs, images only)
- Consider adding file size limits (e.g., 10MB max)
