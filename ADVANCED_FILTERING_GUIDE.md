# Advanced Case Filtering System - Complete Implementation Guide

## Overview
This document describes the complete advanced filtering implementation for the admin panel, allowing admins to filter cases by multiple criteria and save filters for later use.

## Features Implemented

### 1. **Filter Criteria**
The following filter options are now available:

#### a) **Select Status**
- Filter cases by one or multiple status values
- Status values from backend (`CaseStatusConstants`):
  - "Initial questionnaire" - User completes initial eligibility questionnaire
  - "Document submission" - Documents have been submitted but case not finalized
  - "Submission pending" - All documents submitted, awaiting final submission
  - "Submitted" - Case fully submitted and under review

#### b) **Minimum AI Score (Eligibility Score)**
- Filter by minimum eligibility score from `user_eligibility.eligibility_raw.eligibility_score`
- Range: 0-100
- JSON structure: `eligibility_raw = {"eligibility_score": 40, ...}`

#### c) **Maximum AI Score**
- Set upper bound for AI scores (optional)

#### d) **Minimal Income Potential**
- Filter by minimum estimated claim amount from `cases.call_summary.estimated_claim_amount`
- JSON structure: `call_summary = {"estimated_claim_amount": 32000, ...}`

#### e) **Maximum Income Potential**
- Set upper bound for income potential (optional)

#### f) **Start Date (Created At)**
- Filter cases created on or after this date
- Uses `cases.created_at` field

#### g) **End Date (Last Updated Case Date)**
- Filter cases with `updated_at` on or before this date
- Renamed field reference: `cases.updated_at` is "last updated case date"

#### h) **Search Query**
- Search by client name, email, or case ID
- Case-insensitive full-text search

### 2. **Database Schema**

#### New Table: `saved_filters`
```sql
create table public.saved_filters (
  id uuid primary key,
  admin_id uuid not null (fk to user_profile),
  name text not null,
  description text,
  status text[] null,
  min_ai_score integer null,
  max_ai_score integer null,
  min_income_potential float null,
  max_income_potential float null,
  start_date timestamp null,
  end_date timestamp null,
  search_query text null,
  is_default boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### 3. **Backend Implementation**

#### New API Endpoints

##### `POST /admin/cases/filter` - Apply Advanced Filters
```python
Request Body:
{
  "status": ["Initial questionnaire", "Submitted"],
  "min_ai_score": 40,
  "max_ai_score": 100,
  "min_income_potential": 20000,
  "max_income_potential": 50000,
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "search_query": "client name",
  "limit": 100,
  "offset": 0
}

Response:
{
  "status": "ok",
  "data": [
    {
      "case_id": "uuid",
      "user_id": "uuid",
      "client_name": "John Doe",
      "client_email": "john@example.com",
      "client_phone": "0501234567",
      "status": "Submitted",
      "ai_score": 75,
      "eligibility_status": "needs_review",
      "estimated_claim_amount": 32000,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-20T15:45:00Z",
      "products": ["Work Disability"],
      "risk_assessment": "Needs More Info"
    }
  ],
  "total": 5,
  "limit": 100,
  "offset": 0
}
```

##### `POST /admin/saved-filters` - Create Saved Filter
```python
Request Body:
{
  "name": "My Custom Filter",
  "description": "High-value cases needing review",
  "status": ["Submitted"],
  "min_ai_score": 70,
  "max_ai_score": null,
  "min_income_potential": 25000,
  "max_income_potential": null,
  "start_date": null,
  "end_date": null,
  "search_query": null,
  "is_default": false
}

Response:
{
  "status": "ok",
  "data": {
    "id": "filter-uuid",
    "admin_id": "admin-uuid",
    "name": "My Custom Filter",
    ...
    "created_at": "2025-01-20T16:00:00Z"
  }
}
```

##### `GET /admin/saved-filters` - List Saved Filters
Returns all saved filters for the current admin.

##### `GET /admin/saved-filters/{filter_id}` - Get Specific Filter
Returns a single saved filter.

##### `PUT /admin/saved-filters/{filter_id}` - Update Filter
Update filter criteria and metadata.

##### `DELETE /admin/saved-filters/{filter_id}` - Delete Filter
Remove a saved filter.

### 4. **Frontend Implementation**

#### Updated Component: `AdminCasesTable.tsx`
Added advanced filtering panel with:

1. **Filter UI Components**
   - Status checkboxes for multi-select
   - Number inputs for AI score range
   - Number inputs for income potential range
   - Date inputs for start and end dates
   - Text input for search query

2. **Filter Management**
   - Apply button to execute filter
   - Reset button to clear all filters
   - Show/hide advanced filters toggle
   - Visual indication of active filters

3. **Integration**
   - Fetches filtered cases from `/admin/cases/filter` endpoint
   - Displays results in same table format
   - Maintains pagination support
   - Shows filter results count

4. **Saved Filters**
   - Load previously saved filters
   - Quick apply saved filters (future enhancement)
   - Save current filter state

### 5. **Backend Schemas (Pydantic)**

#### `CaseFilterRequest`
```python
class CaseFilterRequest(BaseModel):
    status: Optional[List[str]] = None
    min_ai_score: Optional[int] = None
    max_ai_score: Optional[int] = None
    min_income_potential: Optional[float] = None
    max_income_potential: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search_query: Optional[str] = None
    limit: int = 100
    offset: int = 0
```

#### `SavedFilter` and `SavedFilterCreate`
```python
class SavedFilterCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[List[str]] = None
    min_ai_score: Optional[int] = None
    max_ai_score: Optional[int] = None
    min_income_potential: Optional[float] = None
    max_income_potential: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search_query: Optional[str] = None
    is_default: bool = False
```

### 6. **Data Flow**

```
Admin UI (AdminCasesTable)
    ↓
Filter Form Submission
    ↓
POST /admin/cases/filter
    ↓
Backend Filter Logic:
  1. Get all cases
  2. Join with user_profile for AI scores
  3. Apply status filter (PostgREST)
  4. Apply date filters (PostgREST)
  5. Parse eligibility_raw JSON for AI scores
  6. Apply AI score filters (Python)
  7. Parse call_summary JSON for income potential
  8. Apply income potential filters (Python)
  9. Apply search filters (Python)
    ↓
Return Filtered Results
    ↓
Update Frontend Table
```

### 7. **Filtering Logic Details**

#### Status Filtering
- Uses PostgREST `in` operator for efficient database filtering
- Example: `status.in.("Initial questionnaire","Submitted")`

#### Date Filtering
- Start date: Uses `created_at.gte` (greater than or equal)
- End date: Uses `updated_at.lte` (less than or equal)
- Both filters combined with AND logic

#### AI Score Filtering
- Extracts from `user_profile.eligibility_raw` JSON column
- Parses JSON safely with error handling
- Applies range filter in Python after retrieval

#### Income Potential Filtering
- Extracts from `cases.call_summary` JSON column
- Uses `estimated_claim_amount` field
- Applies range filter in Python after retrieval

#### Search Filtering
- Case-insensitive matching on:
  - Client full name
  - Client email
  - Case ID (UUID string)
- Partial string matching supported

### 8. **Migration Steps**

1. **Database**
   - Run migration: `python -m backend.app.apply_migration` or execute SQL in migration file
   - Creates `saved_filters` table with proper indexes

2. **Backend**
   - Update `schemas.py` with new Pydantic models
   - Update `supabase_client.py` with SavedFilters CRUD functions
   - Update `main.py` with new API endpoints

3. **Frontend**
   - Replace `AdminCasesTable.tsx` with enhanced version
   - Add Filter and X icons to imports

### 9. **Usage Examples**

#### Example 1: Find high-value cases needing review
```javascript
{
  "status": ["Submitted"],
  "min_ai_score": 70,
  "min_income_potential": 50000
}
```

#### Example 2: Find recent cases in document submission stage
```javascript
{
  "status": ["Document submission"],
  "start_date": "2025-01-01T00:00:00Z",
  "limit": 50
}
```

#### Example 3: Find cases for specific client
```javascript
{
  "search_query": "John Doe",
  "limit": 10
}
```

### 10. **Error Handling**

- Invalid dates: Returns HTTP 422 (Pydantic validation)
- Non-existent filter: Returns HTTP 404
- Access denied (not admin): Returns HTTP 403
- JSON parsing errors: Safely defaults to empty object
- Missing profiles/cases: Skips gracefully with warnings

### 11. **Performance Considerations**

- PostgREST filters reduce initial result set before Python processing
- Indexes on `admin_id`, `created_at` for faster queries
- Limit parameter controls result set size
- Offset parameter enables pagination

### 12. **Future Enhancements**

- [ ] Scheduled filter exports
- [ ] Email alerts for filter results
- [ ] Filter sharing between admins
- [ ] Advanced statistics on filtered results
- [ ] Filter templates for common queries
- [ ] Bulk actions on filtered results

## Testing Checklist

- [x] Create filter endpoint returns saved filter
- [x] Get filters returns all admin filters
- [x] Status filtering works with single value
- [x] Status filtering works with multiple values
- [x] AI score range filtering works
- [x] Income potential range filtering works
- [x] Date range filtering works
- [x] Search query filtering works
- [x] Filters can be combined
- [x] Saved filters can be created
- [x] Saved filters can be retrieved
- [x] Saved filters can be updated
- [x] Saved filters can be deleted
- [x] Admin access control enforced
