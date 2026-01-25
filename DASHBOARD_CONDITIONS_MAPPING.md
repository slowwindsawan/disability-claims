# Dashboard Conditional Rendering & Data Structure Mapping

## Overview
The dashboard displays different content based on the **case status** and **data structure**. Here's the complete mapping of conditions that determine what content is shown, with direct references to database tables and columns.

---

## Database Tables Overview

### **1. `cases` Table** (Main case data)
```sql
CREATE TABLE public.cases (
  id uuid PRIMARY KEY,                          -- Unique case identifier
  user_id uuid NOT NULL,                        -- References user_profile.user_id
  title text,
  description text,
  status text,                                  -- Case status (see statuses below)
  metadata jsonb,                               -- Flexible JSON: committee_decision, etc.
  created_at timestamp,
  updated_at timestamp,
  boldsign_document_id text,
  signature_status text DEFAULT 'pending',
  signature_completed_at timestamp,
  call_details jsonb,                           -- Initial call information
  call_summary jsonb,                           -- Call analysis (contains documents_requested_list)
  document_summaries jsonb,                     -- Uploaded document analyses
  followups jsonb,
  agreement_signed BOOLEAN DEFAULT FALSE,       -- ⭐ Agreement signature status
  FOREIGN KEY (user_id) REFERENCES user_profile(user_id)
);
```

### **2. `user_profile` Table** (User/profile data)
```sql
CREATE TABLE public.user_profile (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE,                          -- Matches cases.user_id
  full_name text,
  email text UNIQUE,
  phone text,
  identity_code text,
  email_otp text,
  otp_expires_at timestamp,
  verified boolean DEFAULT FALSE,
  eligibility_rating integer,
  eligibility_title text,                       -- Eligibility assessment
  eligibility_message text,
  eligibility_confidence integer,
  eligibility_raw jsonb,                        -- Raw eligibility data
  id_card jsonb,                                -- ⭐ ID card validation: { id_type, full_name, dob, id_number, image_url, validated_at }
  created_at timestamp,
  is_admin boolean,
  role text,
  is_subadmin boolean,
  photo_url text,
  payments jsonb,                               -- Payment details
  contact_details jsonb,                        -- Contact info
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

### **3. `case_documents` Table** (Uploaded documents)
```sql
CREATE TABLE public.case_documents (
  id uuid PRIMARY KEY,
  created_at timestamp,
  case_id uuid,                                 -- References cases.id
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  document_type text,
  uploaded_by uuid,                             -- References user_profile.id
  uploaded_at timestamp,
  metadata jsonb,                               -- Document analysis data
  FOREIGN KEY (case_id) REFERENCES cases(id)
);
```

### **4. `user_eligibility` Table** (Eligibility assessments)
```sql
CREATE TABLE public.user_eligibility (
  id uuid PRIMARY KEY,
  user_id uuid,                                 -- References user_profile.user_id
  case_id uuid,                                 -- References cases.id
  uploaded_file text,
  eligibility_rating integer,
  eligibility_title text,
  eligibility_message text,
  eligibility_confidence integer,
  eligibility_raw jsonb,
  processed_at timestamp
);
```

---

## Core Data Source: `currentCase` Object

**Type:** Fetched from backend via `useCurrentCase()` hook  
**Database Source:** `cases` table + joined `user_profile` data  
**Structure:**
```typescript
currentCase = {
  case: {
    id: string;                                 // FROM: cases.id
    status: string;                             // FROM: cases.status
    stage: string;                              // FROM: cases.metadata->>'stage' (possibly)
    agreement_signed: boolean | null;           // FROM: cases.agreement_signed ⭐
    committee_decision?: {                      // FROM: cases.metadata->>'committee_decision' (JSON)
      status: "approved" | "rejected" | "ineligible" | string;
      decision_date?: string;
      message?: string;
    };
    call_summary?: object;                      // FROM: cases.call_summary (JSONB)
    document_summaries?: object;                // FROM: cases.document_summaries (JSONB)
  }
}
```

---

## Case Status Progression Flow

The dashboard follows a linear status progression:

```
1. Initial questionnaire
   ↓
2. Document submission
   ↓
3. Submission pending
   ↓
4. Submitted
   ↓
5. Committee Decision (final stage)
   ├── approved
   ├── rejected
   └── ineligible
```

---

## Dashboard Conditional Rendering Logic

### **Condition 1: Waiting for Response Page**
```typescript
// Location: frontend/app/dashboard/page.tsx:1471-1472
if (
  currentCase?.case?.status === "submitted" &&                    // FROM: cases.status = "Submitted"
  (!currentCase?.case?.stage || currentCase?.case?.stage === "initial_questionnaire") &&  // Still in initial review
  !currentCase.case.committee_decision?.status                    // FROM: cases.metadata->>'committee_decision' is NULL/empty
) {
  return <WaitingForResponsePage callSummary={callSummary} />
}
```
**Shows:** Loading/waiting state while government reviews the case  
**Database Source:** 
- `cases.status` = "Submitted"
- `cases.metadata` JSONB path: `metadata->>'committee_decision'` is null or doesn't have `status` field
- `cases.call_summary` JSONB (shown to user)

---

### **Condition 2: Agreement Pending**
```typescript
// Location: frontend/app/dashboard/page.tsx:1475-1499
if (
  !currentCase?.case?.agreement_signed ||
  currentCase?.case?.agreement_signed == null
) {
  return (
    <>
      <div>Agreement Pending</div>
      <button onClick={() => router.push(`/checkout?case_id=${currentCase?.case?.id}`)}>
        Review & Sign Agreement
      </button>
    </>
  )
}
```
**Shows:** Agreement signing screen  
**Database Source:** 
- `cases.agreement_signed` = FALSE or NULL
- Set to TRUE by: `/complete-boldsign-flow` endpoint
- Set to TRUE by: `/complete-boldsign-flow-manual` endpoint

**Action:** Redirects to `/checkout?case_id={cases.id}` for signature

---

### **Condition 3: Committee Decision Results**
```typescript
// Location: frontend/app/dashboard/page.tsx:1501-1510
if (currentCase?.case?.committee_decision) {
  if (currentCase.case.committee_decision.status === "approved") {
    return <ClaimApprovedPage />
  } 
  else if (currentCase.case.committee_decision.status === "rejected") {
    return <ClaimRejectedPage />
  } 
  else if (currentCase.case.committee_decision.status === "ineligible") {
    return <NotEligiblePage />
  }
}
```
**Shows:** Final decision pages  
**Database Source:**
- `cases.metadata` JSONB → `committee_decision` object
- Example structure:
```json
{
  "committee_decision": {
    "status": "approved|rejected|ineligible",
    "decision_date": "2024-01-15T10:30:00Z",
    "message": "Your claim has been approved..."
  }
}
```
- Query: `SELECT metadata->>'committee_decision' FROM cases WHERE id = $1`

---

### **Condition 4: Default Document Checklist**
```typescript
// If none of the above conditions match, show the main document upload interface
```
**Shows:** Document list, upload interface, progress tracking  
**Database Sources:** 
- `cases.call_summary` JSONB → `documents_requested_list` array
  ```json
  {
    "documents_requested_list": [
      {
        "id": "uuid",
        "name": "Medical Report",
        "reason": "To verify medical history",
        "source": "Hospital",
        "status": "uploaded|missing",
        "uploaded_at": "2024-01-10",
        "category": "medical",
        "required": true
      }
    ]
  }
  ```
- `case_documents` table records with matching `case_id`
- `user_profile.id_card` JSONB → must not be NULL
  ```json
  {
    "id_type": "state_id|driving_license",
    "full_name": "John Doe",
    "dob": "1991-10-30",
    "id_number": "123456789",
    "image_url": "https://...",
    "validated_at": "2024-01-05T14:20:00Z"
  }
  ```

---

## Additional Conditional Elements Within Dashboard

### **4.1: ID Card Upload Alert**
```typescript
// Location: frontend/app/dashboard/page.tsx:1043-1062
if (!loadingProfile && !idCardUploaded) {
  return <Card>Upload ID Card</Card>
}
```
**Condition:** `!profile?.id_card`  
**Shows:** Alert prompting ID card upload  
**Database Source:** 
- `user_profile.id_card` JSONB is NULL or empty
- Set by: `/upload-id-card` endpoint after successful validation
- Contains: `{ id_type, full_name, dob, id_number, image_url, validated_at }`

---

### **4.2: Payment Details Completed Alert**
```typescript
// Location: frontend/app/dashboard/page.tsx:1064-1083
if (!loadingProfile && !paymentDetailsCompleted) {
  return <Card>Complete Payment Details</Card>
}
```
**Condition:** `!paymentDetailsCompleted` (state variable)  
**Shows:** Alert to complete bank/health fund info  
**Database Source:**
- Could be checked from `user_profile.payments` JSONB field
- Current implementation uses component state
- Should verify: `user_profile.payments` contains bank and health fund info

---

### **4.3: Rejected Documents Alert**
```typescript
// Location: frontend/app/dashboard/page.tsx:1085-1103
if (requiredCount > 0 && uploadedCount === 0) {
  return <Card>Documents Stopped Case</Card>
}
```
**Condition:** Documents required but none uploaded  
**Shows:** High-priority alert that case is blocked  
**Database Sources:**
- Count from `cases.call_summary` JSONB → `documents_requested_list` length
- Filter by `status = "missing"` and `required = true`
- Alternatively check `case_documents` table count where `case_id = X`

---

## Document Upload Flow & Storage

### **When User Uploads Document:**

1. **Frontend Action:** POST to `/cases/{caseId}/upload-document`
   - Uploads file to Supabase Storage bucket

2. **Backend Processing:**
   - Stores in bucket: `eligibility-documents/{case_id}/{filename}`
   - Creates record in `case_documents` table
   - Updates `cases.call_summary` JSONB:
     - Finds matching document in `documents_requested_list`
     - Sets `status = "uploaded"`
     - Sets `uploaded_at = now()`

3. **Frontend Refetch:**
   - Calls `apiGetCase(caseId)`
   - Gets updated `cases.call_summary`
   - Parses `documents_requested_list` array
   - Updates component state with new status

4. **Result in DB:**
```sql
-- cases table gets updated:
UPDATE cases SET 
  call_summary = jsonb_set(
    call_summary,
    '{documents_requested_list,0,status}',
    '"uploaded"'
  ),
  updated_at = now()
WHERE id = $1;

-- case_documents table gets new record:
INSERT INTO case_documents (case_id, file_path, file_name, document_type, uploaded_at, metadata)
VALUES ($1, $2, $3, $4, now(), $5);
```

---

## Database Field Mapping: Frontend → Columns

| Frontend Field | Database Table | Column | Type | Notes |
|---|---|---|---|---|
| `currentCase.case.id` | `cases` | `id` | UUID | Primary key |
| `currentCase.case.status` | `cases` | `status` | TEXT | "Initial questionnaire", "Document submission", "Submission pending", "Submitted" |
| `currentCase.case.stage` | `cases` | `metadata->>'stage'` | JSONB | Optional pipeline stage |
| `currentCase.case.agreement_signed` | `cases` | `agreement_signed` | BOOLEAN | Set to TRUE after BoldSign |
| `currentCase.case.committee_decision` | `cases` | `metadata->>'committee_decision'` | JSONB | Government decision object |
| `currentCase.case.call_summary` | `cases` | `call_summary` | JSONB | Contains `documents_requested_list` |
| `currentCase.case.document_summaries` | `cases` | `document_summaries` | JSONB | Analyzed documents |
| `profile.id_card` | `user_profile` | `id_card` | JSONB | ID card validation data |
| `profile.full_name` | `user_profile` | `full_name` | TEXT | User name |
| `profile.email` | `user_profile` | `email` | TEXT | User email |
| `profile.eligibility_title` | `user_profile` | `eligibility_title` | TEXT | Eligibility assessment |
| `requiredDocuments[].status` | `cases.call_summary` | `documents_requested_list[].status` | JSONB | "uploaded" or "missing" |
| `requiredDocuments[].date` | `cases.call_summary` | `documents_requested_list[].uploaded_at` | JSONB | ISO timestamp |

---

## Key Status Indicators & Database Values

| Frontend Display | `cases.status` | `cases.agreement_signed` | `cases.metadata.committee_decision` | Component Shown |
|---|---|---|---|---|
| Questionnaire Phase | "Initial questionnaire" | - | NULL | Document checklist |
| Upload Documents | "Document submission" | - | NULL | Document checklist |
| Ready to Submit | "Submission pending" | FALSE | NULL | Document checklist |
| Ready to Submit | "Submission pending" | TRUE | NULL | Document checklist |
| ⏳ Waiting | "Submitted" | TRUE | NULL | `WaitingForResponsePage` |
| ✅ Approved | "Submitted" | TRUE | `{ status: "approved" }` | `ClaimApprovedPage` |
| ❌ Rejected | "Submitted" | TRUE | `{ status: "rejected" }` | `ClaimRejectedPage` |
| ❌ Not Eligible | "Submitted" | TRUE | `{ status: "ineligible" }` | `NotEligiblePage` |
| 🚫 Blocked | Any | FALSE | NULL | Agreement pending + blocked |

### **Get Current Case Status:**
```sql
SELECT 
  id,
  status,
  agreement_signed,
  (metadata->>'committee_decision')::jsonb as committee_decision,
  call_summary,
  updated_at
FROM cases
WHERE id = $1;
```

### **Get Case with Committee Decision:**
```sql
SELECT 
  c.id,
  c.status,
  c.agreement_signed,
  (c.metadata->>'committee_decision')::jsonb as committee_decision,
  c.call_summary->>'stage' as stage
FROM cases c
WHERE c.id = $1 
  AND c.metadata->>'committee_decision' IS NOT NULL;
```

### **Get All Documents for a Case:**
```sql
SELECT 
  doc_list.value as document_entry,
  doc_list.key as index_position
FROM cases c,
  jsonb_array_elements(c.call_summary->'documents_requested_list') WITH ORDINALITY doc_list(value, key)
WHERE c.id = $1;
```

### **Get ID Card Validation Status:**
```sql
SELECT 
  id_card,
  COALESCE((id_card IS NOT NULL), FALSE) as id_card_verified,
  (id_card->>'validated_at')::timestamp as validation_date
FROM user_profile
WHERE user_id = $1;
```

### **Check if Case Needs ID Card:**
```sql
SELECT 
  c.id,
  c.status,
  up.id_card,
  (up.id_card IS NULL) as needs_id_card_upload
FROM cases c
JOIN user_profile up ON c.user_id = up.user_id
WHERE c.id = $1;
```

### **Count Required vs Uploaded Documents:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE (doc->>'required')::boolean = true) as required_count,
  COUNT(*) FILTER (WHERE doc->>'status' = 'uploaded') as uploaded_count,
  COUNT(*) FILTER (WHERE (doc->>'required')::boolean = true AND doc->>'status' = 'missing') as missing_required_count
FROM cases c,
  jsonb_array_elements(c.call_summary->'documents_requested_list') as doc
WHERE c.id = $1;
```

### **Get All Cases by Status:**
```sql
SELECT 
  id,
  user_id,
  status,
  agreement_signed,
  (metadata->>'committee_decision')::jsonb as committee_decision,
  created_at,
  updated_at
FROM cases
WHERE user_id = $1
ORDER BY updated_at DESC;
```

### **Find Cases Waiting for Government Response:**
```sql
SELECT 
  c.id,
  c.status,
  c.created_at as submitted_date,
  EXTRACT(DAY FROM NOW() - c.updated_at) as days_waiting
FROM cases c
WHERE c.status = 'Submitted'
  AND c.agreement_signed = true
  AND (c.metadata->>'committee_decision' IS NULL)
ORDER BY c.updated_at ASC;
```

### **Find Cases Missing ID Card Verification:**
```sql
SELECT 
  c.id,
  c.user_id,
  c.status,
  up.full_name,
  up.email,
  (up.id_card IS NULL) as missing_id_card
FROM cases c
JOIN user_profile up ON c.user_id = up.user_id
WHERE c.status IN ('Initial questionnaire', 'Document submission', 'Submission pending')
  AND up.id_card IS NULL
ORDER BY c.created_at DESC;
```

---

## Important Notes for Data Remapping

1. **Status values are exact strings** - Always use exact values:
   - `"Initial questionnaire"`
   - `"Document submission"`
   - `"Submission pending"`
   - `"Submitted"`

2. **`agreement_signed` column is boolean** - Check for NULL or FALSE
   - NULL means not yet determined
   - FALSE means not signed
   - TRUE means signed with BoldSign

3. **`metadata` is JSONB flexible field** - Contains:
   - `committee_decision` (object with status field)
   - `stage` (optional pipeline indicator)
   - Other custom data

4. **`call_summary` JSONB contains array** of documents:
   - `documents_requested_list[].status` = "uploaded" | "missing"
   - `documents_requested_list[].required` = true | false
   - Not all documents are required

5. **`id_card` JSONB nullable field** - If NULL, card not uploaded
   - If present, contains validation data
   - Query: `WHERE id_card IS NOT NULL`

6. **`case_documents` table separate** - Stores actual files
   - `file_path` = storage bucket path
   - `metadata` = analysis results
   - Cross-check with `call_summary.documents_requested_list`

7. **User profile references two IDs**:
   - `user_profile.id` (UUID primary key)
   - `user_profile.user_id` (UUID from auth.users, in cases table)
   - Foreign key: `cases.user_id → user_profile.user_id`

8. **Timestamps are important**:
   - `cases.created_at` = when case started
   - `cases.updated_at` = last modification
   - `cases.signature_completed_at` = when signed
   - Document `uploaded_at` in JSONB

---

## Page Components & Their Requirements

| Component | Shows When | Requires DB Fields | Data Source |
|---|---|---|---|
| `WaitingForResponsePage` | Status=Submitted + NO committee_decision | `cases.call_summary` | `cases.call_summary` |
| `ClaimApprovedPage` | committee_decision.status="approved" | `cases.metadata` | `cases.metadata->>'committee_decision'` |
| `ClaimRejectedPage` | committee_decision.status="rejected" | `cases.metadata` | `cases.metadata->>'committee_decision'` |
| `NotEligiblePage` | committee_decision.status="ineligible" | `cases.metadata` | `cases.metadata->>'committee_decision'` |
| Main Dashboard | All other cases | `cases.*`, `user_profile.*`, `call_summary` | All tables |

---

## Troubleshooting: If Dashboard Shows Wrong Content

**Check this order:**

1. **Wrong status shown?**
   - Verify `cases.status` value in Supabase
   - Check `CaseStatusConstants` in backend (constants.py)

2. **Agreement pending incorrectly?**
   - Check `cases.agreement_signed` is TRUE (not NULL)
   - See BoldSign completion endpoints

3. **Committee decision not showing?**
   - Query: `SELECT metadata->>'committee_decision' FROM cases WHERE id=...`
   - Ensure JSON path is correct: `metadata['committee_decision']['status']`

4. **Documents not updating after upload?**
   - Verify `case_documents` record created
   - Check `call_summary` JSONB was updated
   - Ensure `documents_requested_list[X].status` changed to "uploaded"

5. **ID card verification blocking form?**
   - Check `user_profile.id_card` is NULL
   - Verify `/upload-id-card` endpoint was called successfully
   - Check validation returned valid response

6. **Payment details blocking form?**
   - Check `user_profile.payments` JSONB field
   - Or check component state initialization
   - Verify `/complete-payment-details` was called
