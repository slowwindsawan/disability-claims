# Code Changes - Line-by-Line Details

## File 1: backend/app/main.py

### Change 1: Remove SavedFilterCreate from imports
**Location**: Line 8

**Before**:
```python
from .schemas import EligibilityRequest, EligibilityResult, CaseFilterRequest, SavedFilterCreate
```

**After**:
```python
from .schemas import EligibilityRequest, EligibilityResult, CaseFilterRequest
```

---

### Change 2: Replace all saved_filters endpoints with new JSON-based endpoints
**Location**: Lines 978-1290+ (entire endpoint section replaced)

**What was removed**:
```python
# OLD - 6 endpoints (REMOVED):
@app.post('/admin/cases/filter')  # filter_cases_advanced
@app.post('/admin/saved-filters')  # create_saved_filter
@app.get('/admin/saved-filters')  # get_saved_filters
@app.get('/admin/saved-filters/{filter_id}')  # get_saved_filter
@app.put('/admin/saved-filters/{filter_id}')  # update_saved_filter
@app.delete('/admin/saved-filters/{filter_id}')  # delete_saved_filter
```

**What was added**:
```python
# NEW - 4 endpoints (ADDED):
@app.post('/admin/cases/filter')  # Filter cases with criteria
@app.post('/admin/filters')  # Save filter to user_profile.admin_filters
@app.get('/admin/filters')  # Get all filters from user_profile.admin_filters
@app.delete('/admin/filters/{filter_name}')  # Delete filter from user_profile.admin_filters
```

---

## File 2: backend/app/supabase_client.py

### Change: Remove 5 SavedFilters CRUD functions
**Location**: Lines ~1572-1706

**Functions Removed**:
```python
# REMOVED (5 functions):
def create_saved_filter(admin_id: str, filter_data: dict) -> dict:
def get_saved_filters(admin_id: str) -> list:
def get_saved_filter(filter_id: str) -> dict:
def update_saved_filter(filter_id: str, filter_data: dict) -> dict:
def delete_saved_filter(filter_id: str) -> bool:
```

**Why**: All CRUD operations now handled directly in main.py via PostgREST API calls to user_profile table

---

## File 3: frontend/src/components/AdminCasesTable.tsx

### Change 1: Update End Date Label
**Location**: Line ~475

**Before**:
```tsx
<label className="block text-xs text-slate-600 mb-1">
  עד תאריך (עדכון אחרון)
</label>
```

**After**:
```tsx
<label className="block text-xs text-slate-600 mb-1">
  עד תאריך (תאריך עדכון אחרון של התיק)
</label>
```

---

### Change 2: Update Saved Filters Fetch Endpoint
**Location**: Line ~155

**Before**:
```tsx
const response = await fetch('/api/admin/saved-filters', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
});
```

**After**:
```tsx
const response = await fetch('/api/admin/filters', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
});
```

---

## File 4: backend/db/migrations/add_saved_filters_table.sql

### Change: Deprecate the migration
**Location**: All content

**Before**:
```sql
-- Add saved_filters table for admin case filtering
create table if not exists public.saved_filters (
  id uuid not null default gen_random_uuid (),
  admin_id uuid not null,
  ...
) TABLESPACE pg_default;

create index if not exists saved_filters_admin_id_idx on public.saved_filters (admin_id);
create index if not exists saved_filters_created_at_idx on public.saved_filters (created_at desc);
```

**After**:
```sql
-- DEPRECATED: This table is no longer used
-- Filters are now stored as JSON in user_profile.admin_filters column
-- Keep this migration for backward compatibility only
-- 
-- If you want to clean up, you can drop this table:
-- DROP TABLE IF EXISTS public.saved_filters CASCADE;

-- Original table schema (preserved for reference):
-- [full schema commented out for reference]
```

---

## Summary of Changes

| File | Change Type | Lines | Description |
|------|-------------|-------|-------------|
| main.py | Remove Import | 8 | Remove SavedFilterCreate |
| main.py | Replace Endpoints | 978-1290+ | 6 endpoints → 4 JSON-based endpoints |
| supabase_client.py | Remove Functions | 1572-1706 | Remove 5 CRUD functions |
| AdminCasesTable.tsx | Update Label | 475 | End date label rename |
| AdminCasesTable.tsx | Update Endpoint | 155 | Fetch from /api/admin/filters |
| add_saved_filters_table.sql | Deprecate | All | Mark as deprecated, not deleted |

---

## New API Endpoints (Complete Implementation)

### Endpoint 1: POST /admin/cases/filter
**Purpose**: Filter cases by all criteria

**Request**:
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

**Response**:
```json
{
  "status": "ok",
  "data": [...filtered cases...],
  "total": 45,
  "limit": 200,
  "offset": 0
}
```

---

### Endpoint 2: POST /admin/filters
**Purpose**: Save a filter to user_profile.admin_filters

**Request** (form data):
```
filter_name: "my_filter"
filter_data: {"status":["Initial questionnaire"],"min_ai_score":50}
```

**Response**:
```json
{
  "status": "ok",
  "filter_name": "my_filter"
}
```

---

### Endpoint 3: GET /admin/filters
**Purpose**: Get all filters from user_profile.admin_filters

**Response**:
```json
{
  "status": "ok",
  "data": {
    "my_filter": {
      "criteria": {...},
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-01-15T10:30:00"
    }
  }
}
```

---

### Endpoint 4: DELETE /admin/filters/{filter_name}
**Purpose**: Delete a filter from user_profile.admin_filters

**Response**:
```json
{
  "status": "ok",
  "deleted": true
}
```

---

## Key Differences: Before vs After

### Storage
- **Before**: Separate `saved_filters` table with 14 columns
- **After**: Single JSONB column `user_profile.admin_filters`

### API Complexity
- **Before**: 6 complex endpoints with separate CRUD functions
- **After**: 4 simple endpoints using REST for JSON manipulation

### Filter Update Process
- **Before**: 
  1. POST to create filter
  2. PUT to update filter
  3. DELETE to remove filter
  
- **After**:
  1. POST to save/update filter
  2. DELETE to remove filter

### Data Access Pattern
- **Before**: Query `saved_filters` table → 2 joins, 2 indexes
- **After**: Query `user_profile` → direct JSONB column access

### Admin Filter Isolation
- **Before**: Filters scattered in separate table, requires admin_id join
- **After**: All filters in user_profile record (atomic, contained)

---

## Migration Path (If Needed)

If you have existing data in `saved_filters` table and want to migrate to JSON:

```python
# Migration script (to be run once):
for filter_row in saved_filters:
    admin_id = filter_row['admin_id']
    filter_name = filter_row['name']
    
    criteria = {
        'status': filter_row['status'],
        'min_ai_score': filter_row['min_ai_score'],
        'max_ai_score': filter_row['max_ai_score'],
        'min_income_potential': filter_row['min_income_potential'],
        'max_income_potential': filter_row['max_income_potential'],
        'start_date': filter_row['start_date'],
        'end_date': filter_row['end_date'],
        'search_query': filter_row['search_query']
    }
    
    # Create JSON structure in user_profile.admin_filters
    admin_filters = {
        filter_name: {
            'criteria': criteria,
            'created_at': filter_row['created_at'],
            'updated_at': filter_row['updated_at']
        }
    }
    
    # Update user_profile
    # UPDATE user_profile SET admin_filters = jsonb_set(...) WHERE id = admin_id
```

---

## Verification Checklist

- [x] main.py imports updated
- [x] main.py endpoints replaced (4 new endpoints)
- [x] supabase_client.py CRUD functions removed
- [x] AdminCasesTable.tsx end date label updated
- [x] AdminCasesTable.tsx fetch endpoint updated
- [x] Migration file marked as deprecated
- [x] No syntax errors in Python files
- [x] No syntax errors in TypeScript files
- [x] Case status constants properly integrated
- [x] Admin authorization checks present
- [x] Error handling implemented
- [x] Documentation created

---

**All code changes completed and verified** ✅
