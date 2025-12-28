# Cases Schema and Status Management

## Schema Definition

```sql
create table public.cases (
  id uuid not null default gen_random_uuid (),
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
) tablespace pg_default;
```

## Case Status Flow

The `status` field in the `cases` table follows a defined progression:

### Status Sequence

1. **Initial questionnaire**
   - Initial state when a case is created
   - Set when: User completes the initial eligibility questionnaire and the summary is generated
   - Shown on: "value-reveal" page
   - Next status: "Document submission"

2. **Document submission**
   - Set when: User has completed initial questionnaire BUT hasn't uploaded all required documents
   - Indicates: Partial submission - more documents needed
   - Next status: "Submission pending" or back to "Document submission" if more docs needed

3. **Submission pending**
   - Set when: ALL required documents have been uploaded successfully
   - Indicates: Ready for final submission/review
   - Next status: "Submitted"

4. **Submitted**
   - Final state
   - Set when: Case is fully submitted and under review
   - Indicates: No further document uploads expected at this stage

### Implementation Notes

- All status strings are defined in `backend/app/constants.py` as `CaseStatusConstants`
- Use `CaseStatus` enum for type safety
- Use `CaseStatusConstants.ALL_STATUSES` to access the list of valid statuses
- Use `CaseStatusConstants.get_next_status()` for status progression logic
- Status is automatically updated when:
  - Initial questionnaire is completed
  - Documents are uploaded
  - Case is submitted for final review

## Related Fields

- **signature_status**: Tracks the BoldSign document signature status ('pending', 'signed', etc.)
- **call_details**: Stores VAPI voice call information
- **call_summary**: Stores processed call summary from voice agent
- **document_summaries**: Stores summaries of uploaded documents
- **followups**: Stores follow-up actions and tracking

## Status Transitions in Code

```python
from backend.app.constants import CaseStatusConstants

# Check if status is valid
if CaseStatusConstants.is_valid_status(status):
    # Process status update

# Get next status
next_status = CaseStatusConstants.get_next_status(current_status)

# Get all valid statuses
valid_statuses = CaseStatusConstants.ALL_STATUSES
```

## Database Migration

If adding this to an existing database, ensure:
1. The `status` field exists in the `cases` table
2. Set default status for existing cases to "Initial questionnaire"
3. Update statuses based on the presence of documents and completion status
