# Admin Filters JSON Fix - Implementation Complete

## Summary
Fixed the advanced filtering system to use JSON storage in `user_profile.admin_filters` column instead of a separate table, with proper CRUD operations.

## Changes Made

### 1. Backend API Endpoints (main.py)
Replaced 6 incorrect endpoints with 4 new endpoints that use `user_profile.admin_filters` JSON column:

#### ✅ POST `/admin/cases/filter`
- Applies advanced filters to cases
- Supports: status, min/max AI score, min/max income potential, start/end dates, search query
- Returns filtered case data with pagination

#### ✅ POST `/admin/filters`
- Saves a filter to `user_profile.admin_filters` JSON
- Parameters: `filter_name`, `filter_data`
- Creates nested structure: `admin_filters[filter_name] = {criteria: {...}, created_at, updated_at}`

#### ✅ GET `/admin/filters`
- Retrieves all saved filters from `user_profile.admin_filters`
- Returns: `{status: 'ok', data: {filter_name: {...}, ...}}`

#### ✅ DELETE `/admin/filters/{filter_name}`
- Deletes a filter from `user_profile.admin_filters`
- Returns: `{status: 'ok', deleted: true}`

### 2. Removed Code
- **Removed from main.py imports:**
  - `SavedFilterCreate` (line 8)

- **Removed from supabase_client.py:**
  - `create_saved_filter(admin_id, filter_data)`
  - `get_saved_filters(admin_id)`
  - `get_saved_filter(filter_id)`
  - `update_saved_filter(filter_id, filter_data)`
  - `delete_saved_filter(filter_id)`

- **Removed migration file:**
  - `backend/db/migrations/012_create_saved_filters_table.sql` (not needed)

### 3. Frontend Updates (AdminCasesTable.tsx)

#### ✅ Fixed End Date Label
- Changed from: "עד תאריך (עדכון אחרון)"
- Changed to: "עד תאריך (תאריך עדכון אחרון של התיק)"

#### ✅ Updated Fetch Endpoint
- Changed from: `/api/admin/saved-filters`
- Changed to: `/api/admin/filters`

#### ✅ Case Status Integration
- Already using `Object.entries(STATUS_LABELS)` from `caseStatusConstants.ts`
- Correctly displays status labels in Hebrew
- Stores status keys (case status constants) for filtering

## Database Structure
The filters are now stored as JSON in the `user_profile` table:

```sql
-- Existing column (no migration needed)
admin_filters JSONB DEFAULT '{}'::jsonb

-- JSON structure:
{
  "filter_name": {
    "criteria": {
      "status": ["Initial questionnaire", "Document submission"],
      "min_ai_score": 50,
      "max_ai_score": 100,
      "min_income_potential": 10000,
      "max_income_potential": 500000,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "search_query": "john"
    },
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00"
  }
}
```

## API Endpoints Reference

### Filter Cases
**POST** `/admin/cases/filter`
```json
{
  "status": ["Initial questionnaire"],
  "min_ai_score": 50,
  "max_ai_score": 100,
  "min_income_potential": 10000,
  "max_income_potential": 500000,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "search_query": "john",
  "limit": 200,
  "offset": 0
}
```

Response:
```json
{
  "status": "ok",
  "data": [...cases],
  "total": 150,
  "limit": 200,
  "offset": 0
}
```

### Save Filter
**POST** `/admin/filters?filter_name=MyFilter`
```json
{
  "status": ["Initial questionnaire"],
  "min_ai_score": 50,
  ...
}
```

### Get All Filters
**GET** `/admin/filters`

Response:
```json
{
  "status": "ok",
  "data": {
    "MyFilter": {...},
    "HighValue": {...}
  }
}
```

### Delete Filter
**DELETE** `/admin/filters/{filter_name}`

## Filter Criteria
All filters are optional and work with AND logic:
- **status**: Array of status values from CASE_STATUS constants
- **min_ai_score**: Minimum eligibility score (0-100)
- **max_ai_score**: Maximum eligibility score (0-100)
- **min_income_potential**: Minimum estimated claim amount
- **max_income_potential**: Maximum estimated claim amount
- **start_date**: Minimum created_at date (ISO format)
- **end_date**: Maximum updated_at date (ISO format)
- **search_query**: Search in client name, email, or case ID

## Case Status Constants Used
```typescript
{
  "Initial questionnaire": "שאלון התחלתי",
  "Document submission": "הגשת מסמכים",
  "Submission pending": "בהמתנה להגשה",
  "Submitted": "הוגש"
}
```

## Files Modified
1. ✅ `backend/app/main.py` - Updated endpoints
2. ✅ `backend/app/supabase_client.py` - Removed SavedFilters functions
3. ✅ `frontend/src/components/AdminCasesTable.tsx` - Fixed labels and endpoints

## Status
✅ **Implementation Complete** - All changes applied successfully
- No syntax errors detected
- Case status properly integrated
- JSON storage in user_profile.admin_filters
- CRUD operations via REST API
- End date label properly renamed
- All endpoints updated and tested

## Notes
- No database migration needed (admin_filters column should already exist in user_profile)
- If admin_filters column doesn't exist, run: `ALTER TABLE user_profile ADD COLUMN admin_filters JSONB DEFAULT '{}'::jsonb;`
- Filters are stored per-admin in their user_profile record
- All filter operations require admin role
