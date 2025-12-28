# Case Status Constants - Quick Reference

## Import Statements

```python
# For enum usage (type safety)
from backend.app.constants import CaseStatus

# For string constants and utilities
from backend.app.constants import CaseStatusConstants

# For status management logic
from backend.app.case_status_manager import CaseStatusManager
```

## Valid Status Values

All status values must be one of these exact strings:

```python
CaseStatusConstants.INITIAL_QUESTIONNAIRE      # "Initial questionnaire"
CaseStatusConstants.DOCUMENT_SUBMISSION        # "Document submission"
CaseStatusConstants.SUBMISSION_PENDING         # "Submission pending"
CaseStatusConstants.SUBMITTED                  # "Submitted"

# Or access as a list
CaseStatusConstants.ALL_STATUSES  # ["Initial questionnaire", "Document submission", "Submission pending", "Submitted"]
```

## Common Usage Patterns

### 1. Validate a Status String

```python
from backend.app.constants import CaseStatusConstants

status = "Initial questionnaire"
if CaseStatusConstants.is_valid_status(status):
    # Safe to use
    pass
```

### 2. Set Initial Status When Creating a Case

```python
from backend.app.constants import CaseStatusConstants
from backend.app.supabase_client import create_case

case = create_case(
    user_id="user-123",
    title="My Disability Claim",
    description="Initial application"
)

# Case is created with status = null, set it immediately
update_case(case['id'], {'status': CaseStatusConstants.INITIAL_QUESTIONNAIRE})
```

### 3. Update Status After Questionnaire Completion

```python
from backend.app.constants import CaseStatusConstants
from backend.app.supabase_client import update_case

# After call_summary is generated and stored
update_case(case_id, {
    'status': CaseStatusConstants.INITIAL_QUESTIONNAIRE,
    'call_summary': summary_data
})
```

### 4. Determine Status Based on Case Data

```python
from backend.app.case_status_manager import CaseStatusManager

# Get the appropriate status for a case
case_data = get_case(case_id)
new_status = CaseStatusManager.get_status_for_case(case_data)

update_case(case_id, {'status': new_status})
```

### 5. Get Progress Percentage

```python
from backend.app.case_status_manager import CaseStatusManager

status = "Submission pending"
progress = CaseStatusManager.get_progress_percentage(status)
# Returns: 75
```

### 6. Check if Case Has Documents

```python
case_data = get_case(case_id)
documents = case_data.get('document_summaries', {})

if documents:
    print("Case has documents")
else:
    print("Case needs documents")
```

## Status Flow Example

```python
from backend.app.constants import CaseStatusConstants
from backend.app.case_status_manager import CaseStatusManager
from backend.app.supabase_client import update_case

# Step 1: User creates a case - starts at INITIAL_QUESTIONNAIRE
case_id = create_case(user_id)
update_case(case_id, {'status': CaseStatusConstants.INITIAL_QUESTIONNAIRE})

# Step 2: User completes questionnaire - summary generated
update_case(case_id, {
    'status': CaseStatusConstants.INITIAL_QUESTIONNAIRE,
    'call_summary': questionnaire_summary
})

# Step 3: User needs to upload documents - move to DOCUMENT_SUBMISSION
case = get_case(case_id)
new_status = CaseStatusManager.get_status_for_case(case)
# Returns: DOCUMENT_SUBMISSION (since questionnaire done but no docs)

update_case(case_id, {'status': new_status})

# Step 4: User uploads documents - move to SUBMISSION_PENDING
update_case(case_id, {
    'status': CaseStatusConstants.SUBMISSION_PENDING,
    'document_summaries': {
        'medical_records': {...},
        'income_verification': {...}
    }
})

# Step 5: Case is submitted for review
update_case(case_id, {'status': CaseStatusConstants.SUBMITTED})
```

## Integration Points

### In main.py or route handlers:
```python
from backend.app.constants import CaseStatusConstants

@app.post("/api/cases/{case_id}/submit")
def submit_case(case_id: str):
    # Update status to submitted
    return update_case(case_id, {'status': CaseStatusConstants.SUBMITTED})
```

### In frontend (TypeScript):
```typescript
// Same string values for consistency
const CASE_STATUS = {
  INITIAL_QUESTIONNAIRE: 'Initial questionnaire',
  DOCUMENT_SUBMISSION: 'Document submission',
  SUBMISSION_PENDING: 'Submission pending',
  SUBMITTED: 'Submitted',
} as const;
```

## Important Notes

⚠️ **Always use the constants** - Never hardcode status strings like `'Initial questionnaire'`

✅ **Use exact strings** - The status field expects exact matches (case-sensitive)

✅ **Update `updated_at` automatically** - Database trigger should update this timestamp

✅ **Validate before updating** - Use `CaseStatusConstants.is_valid_status()` before database operations
