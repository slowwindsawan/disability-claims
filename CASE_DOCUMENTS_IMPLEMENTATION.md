# Case Documents Implementation

## Overview
Implemented a comprehensive case document management system that organizes all uploaded files in Supabase Storage by case_id and tracks metadata in a dedicated database table.

## What Was Changed

### 1. Database Schema (`backend/db/migrations/002_create_case_documents_table.sql`)
**NEW FILE** - Created migration for `case_documents` table:
- Tracks all documents uploaded for each case
- Fields: `id`, `case_id` (FK to cases), `file_path`, `file_name`, `file_type`, `file_size`, `document_type`, `uploaded_by`, `uploaded_at`, `metadata`
- Indexes on `case_id`, `uploaded_by`, and `uploaded_at` for fast queries
- ON DELETE CASCADE when case is deleted

### 2. Backend Helper Functions (`backend/app/supabase_client.py`)
Added 4 new functions for case document management:

#### `insert_case_document(case_id, file_path, file_name, ...)`
- Inserts document record into `case_documents` table
- Returns the created document record

#### `get_case_documents(case_id)`
- Retrieves all documents for a specific case
- Ordered by upload date descending
- Uses supabase-py SDK with HTTP fallback

#### `delete_case_document(document_id)`
- Deletes document record from database
- Does NOT delete physical file (use `storage_delete_file` separately)

#### `storage_delete_file(bucket, path)`
- Deletes file from Supabase Storage
- Uses supabase-py SDK with HTTP fallback
- Required for complete document removal

### 3. Backend API Endpoints (`backend/app/main.py`)

#### Updated: `POST /eligibility-check`
**Before:** Saved files to local `uploads/` directory with random UUID names
**After:** 
- Accepts `case_id` and `user_id` in answers payload
- Uploads to Supabase Storage: `cases/{case_id}/documents/{timestamp}_{filename}`
- Inserts record to `case_documents` table
- Falls back to local storage if no `case_id` provided (backward compatibility)
- Saves temp local copy for OCR processing

#### NEW: `GET /cases/{case_id}/documents`
- Returns all documents for a specific case
- Authorization: User must own the case or be admin
- Returns array of document records with metadata

#### NEW: `POST /cases/{case_id}/documents`
- Upload additional documents to an existing case
- Accepts: `file` (multipart), `document_type` (form field)
- Authorization: User must own the case or be admin
- Returns document record and storage URL

#### NEW: `DELETE /cases/{case_id}/documents/{document_id}`
- Deletes document from both storage and database
- Authorization: User must own the case or be admin
- Verifies document belongs to the specified case before deletion

### 4. Frontend API Functions (`src/lib/api.ts`)
Added 3 new functions:

#### `apiGetCaseDocuments(caseId: string)`
- Fetches all documents for a case
- Returns: `{ status: 'ok', documents: [...] }`

#### `apiUploadCaseDocument(caseId: string, file: File, documentType: string)`
- Uploads additional document to a case
- Uses FormData for multipart upload
- Returns: `{ status: 'ok', document: {...}, storage_url: '...' }`

#### `apiDeleteCaseDocument(caseId: string, documentId: string)`
- Deletes a document from a case
- Returns: `{ status: 'ok', message: 'document_deleted', document_id: '...' }`

### 5. Frontend Upload Integration (`src/components/Onboarding/screens/ProcessingScreen.tsx`)
Updated eligibility check upload to include:
- **case_id**: Retrieved from `localStorage.resume_onboarding_step`
- **user_id**: Extracted from JWT access token in localStorage
- Both values included in answers payload sent to `/eligibility-check`

## Storage Structure

### Before
```
uploads/
  ├── a3f2bc4d.pdf
  ├── 7d8e9f1a.png
  └── ...
```
Files had random names with no organization. No way to find all files for a specific case.

### After
```
Supabase Storage Bucket: case-documents
  cases/
    └── {case_id}/
        └── documents/
            ├── 20240315_143022_medical_report.pdf
            ├── 20240316_091535_pay_slip.pdf
            └── 20240318_162048_identity_document.png
```
Files organized by case with timestamps and original filenames preserved.

## Document Types
Supported `document_type` values:
- `eligibility_document` - Document uploaded during eligibility check
- `medical_report` - Medical reports and records
- `pay_slip` - Pay slips and income documents
- `identity` - Identity documents (ID, passport, etc.)
- `general` - Other documents

## Authorization
All document endpoints enforce authorization:
- Users can only access documents for cases they own
- Admins can access documents for any case
- Implemented via `require_auth` dependency + case ownership check

## Database Migration Required
Before using this feature, run the migration:
```sql
-- Execute: backend/db/migrations/002_create_case_documents_table.sql
-- In Supabase SQL Editor or via psql
```

## Storage Bucket Required
Create Supabase Storage bucket:
```
Bucket name: case-documents
Public: Yes (for easy access to uploaded files)
```

## Next Steps (Optional Enhancements)
1. **Frontend UI Components**
   - Create document viewer component for case detail pages
   - Add upload button and file list to MyCase component
   - Show document thumbnails for images

2. **Document Metadata**
   - Add OCR text extraction results to metadata
   - Store document verification status
   - Track document expiration dates

3. **Security Enhancements**
   - Add file type validation (only allow PDFs, images, etc.)
   - Add file size limits (prevent large uploads)
   - Implement virus scanning for uploads

4. **User Experience**
   - Add drag-and-drop upload interface
   - Show upload progress bar
   - Generate document previews/thumbnails
   - Allow document renaming

## Testing Checklist
- [ ] Run database migration `002_create_case_documents_table.sql`
- [ ] Create `case-documents` bucket in Supabase Storage
- [ ] Test eligibility check upload with case_id
- [ ] Test eligibility check upload without case_id (fallback)
- [ ] Test GET /cases/{case_id}/documents
- [ ] Test POST /cases/{case_id}/documents
- [ ] Test DELETE /cases/{case_id}/documents/{document_id}
- [ ] Verify authorization (user can't access other user's documents)
- [ ] Verify admin can access all documents
- [ ] Check that files are properly organized in storage
- [ ] Verify case deletion cascades to case_documents

## Example API Usage

### Upload Document During Onboarding
```typescript
// Already implemented in ProcessingScreen.tsx
const form = new FormData();
form.append('answers', JSON.stringify({
  ...eligibilityAnswers,
  case_id: 'uuid-here',
  user_id: 'user-uuid-here'
}));
form.append('file', file);

await fetch('/eligibility-check', { method: 'POST', body: form });
```

### Get All Documents for a Case
```typescript
import { apiGetCaseDocuments } from '@/lib/api';

const result = await apiGetCaseDocuments('case-uuid-here');
console.log(result.documents); // Array of document records
```

### Upload Additional Document
```typescript
import { apiUploadCaseDocument } from '@/lib/api';

const file = document.getElementById('file-input').files[0];
const result = await apiUploadCaseDocument(
  'case-uuid-here',
  file,
  'medical_report'
);
console.log(result.storage_url); // Public URL to access file
```

### Delete Document
```typescript
import { apiDeleteCaseDocument } from '@/lib/api';

await apiDeleteCaseDocument('case-uuid-here', 'document-uuid-here');
```

## Database Record Example
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "case_id": "123e4567-e89b-12d3-a456-426614174000",
  "file_path": "cases/123e4567-e89b-12d3-a456-426614174000/documents/20240315_143022_medical_report.pdf",
  "file_name": "medical_report.pdf",
  "file_type": "application/pdf",
  "file_size": 2457600,
  "document_type": "medical_report",
  "uploaded_by": "auth-user-uuid-here",
  "uploaded_at": "2024-03-15T14:30:22.123456+00:00",
  "metadata": {
    "source": "eligibility_check",
    "ocr_confidence": 0.95,
    "page_count": 5
  }
}
```

## Files Modified
1. `backend/db/migrations/002_create_case_documents_table.sql` ✨ NEW
2. `backend/app/supabase_client.py` - Added helper functions
3. `backend/app/main.py` - Updated /eligibility-check, added 3 new endpoints
4. `src/lib/api.ts` - Added 3 new API functions
5. `src/components/Onboarding/screens/ProcessingScreen.tsx` - Updated to pass case_id and user_id

## Backward Compatibility
The system maintains backward compatibility:
- If no `case_id` is provided, files are saved locally to `uploads/` (legacy behavior)
- Existing endpoints continue to work without modification
- Frontend can gradually adopt the new document management features
