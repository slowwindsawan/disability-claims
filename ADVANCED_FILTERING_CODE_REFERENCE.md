# Advanced Filtering - Complete Code Implementation Reference

## Files Modified & Created

### 1. Backend Database Migration
**File:** `backend/db/migrations/012_create_saved_filters_table.sql`

```sql
-- Add saved_filters table for admin case filtering
create table if not exists public.saved_filters (
  id uuid not null default gen_random_uuid (),
  admin_id uuid not null,
  name text not null,
  description text null,
  status text[] null,
  min_ai_score integer null,
  max_ai_score integer null,
  min_income_potential float null,
  max_income_potential float null,
  start_date timestamp with time zone null,
  end_date timestamp with time zone null,
  search_query text null,
  is_default boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint saved_filters_pkey primary key (id),
  constraint saved_filters_admin_id_fkey foreign key (admin_id) references user_profile (id) on delete cascade
) TABLESPACE pg_default;

-- Create index for faster queries
create index if not exists saved_filters_admin_id_idx on public.saved_filters (admin_id);
create index if not exists saved_filters_created_at_idx on public.saved_filters (created_at desc);
```

### 2. Backend Schemas
**File:** `backend/app/schemas.py`

**Added Classes:**

```python
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime

# ... existing code ...

# Advanced Filtering Schemas
class CaseFilterRequest(BaseModel):
    """Schema for advanced case filtering"""
    status: Optional[List[str]] = Field(None, description="Filter by case statuses")
    min_ai_score: Optional[int] = Field(None, ge=0, le=100, description="Minimum AI eligibility score")
    max_ai_score: Optional[int] = Field(None, ge=0, le=100, description="Maximum AI eligibility score")
    min_income_potential: Optional[float] = Field(None, description="Minimum income potential (from estimated_claim_amount)")
    max_income_potential: Optional[float] = Field(None, description="Maximum income potential")
    start_date: Optional[datetime] = Field(None, description="Filter cases created after this date")
    end_date: Optional[datetime] = Field(None, description="Filter cases updated before this date (last updated)")
    search_query: Optional[str] = Field(None, description="Search by client name, email, or case ID")
    limit: int = Field(100, ge=1, le=500, description="Number of results to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")


class SavedFilter(BaseModel):
    """Schema for saved filter"""
    id: Optional[str] = None
    admin_id: str
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
    is_default: bool = Field(False, description="Whether this is the default filter")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SavedFilterCreate(BaseModel):
    """Schema for creating a saved filter"""
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


class FilteredCaseResponse(BaseModel):
    """Schema for filtered case response"""
    case_id: str
    user_id: str
    client_name: Optional[str]
    client_email: Optional[str]
    client_phone: Optional[str]
    status: str
    ai_score: int
    eligibility_status: str
    estimated_claim_amount: float
    created_at: datetime
    updated_at: datetime
    products: List[str] = []
    risk_assessment: Optional[str] = None
```

### 3. Backend Supabase Client Functions
**File:** `backend/app/supabase_client.py`

**Added Functions:**

```python
# SavedFilters management
def create_saved_filter(admin_id: str, filter_data: dict) -> dict:
    """Create a new saved filter for the admin."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/saved_filters"
        body = {
            'admin_id': admin_id,
            'name': filter_data.get('name'),
            'description': filter_data.get('description'),
            'status': filter_data.get('status'),
            'min_ai_score': filter_data.get('min_ai_score'),
            'max_ai_score': filter_data.get('max_ai_score'),
            'min_income_potential': filter_data.get('min_income_potential'),
            'max_income_potential': filter_data.get('max_income_potential'),
            'start_date': filter_data.get('start_date'),
            'end_date': filter_data.get('end_date'),
            'search_query': filter_data.get('search_query'),
            'is_default': filter_data.get('is_default', False),
        }
        
        headers = _postgrest_headers().copy()
        headers['Prefer'] = 'return=representation'
        
        resp = requests.post(url, headers=headers, json=body, timeout=15)
        resp.raise_for_status()
        
        result = resp.json()
        return result[0] if isinstance(result, list) and len(result) > 0 else result
    except Exception:
        logger.exception(f'Failed to create saved filter for admin {admin_id}')
        raise


def get_saved_filters(admin_id: str) -> list:
    """Get all saved filters for an admin."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/saved_filters"
        params = {
            'admin_id': f'eq.{admin_id}',
            'order': 'created_at.desc'
        }
        
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        
        return resp.json()
    except Exception:
        logger.exception(f'Failed to get saved filters for admin {admin_id}')
        return []


def get_saved_filter(filter_id: str) -> dict:
    """Get a specific saved filter."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/saved_filters"
        params = {
            'id': f'eq.{filter_id}'
        }
        
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        
        result = resp.json()
        return result[0] if isinstance(result, list) and len(result) > 0 else None
    except Exception:
        logger.exception(f'Failed to get saved filter {filter_id}')
        return None


def update_saved_filter(filter_id: str, filter_data: dict) -> dict:
    """Update a saved filter."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/saved_filters?id=eq.{filter_id}"
        
        # Only update fields that are provided
        body = {}
        for key in ['name', 'description', 'status', 'min_ai_score', 'max_ai_score', 
                    'min_income_potential', 'max_income_potential', 'start_date', 'end_date', 
                    'search_query', 'is_default']:
            if key in filter_data:
                body[key] = filter_data[key]
        
        headers = _postgrest_headers().copy()
        headers['Prefer'] = 'return=representation'
        
        resp = requests.patch(url, headers=headers, json=body, timeout=15)
        resp.raise_for_status()
        
        result = resp.json()
        return result[0] if isinstance(result, list) and len(result) > 0 else result
    except Exception:
        logger.exception(f'Failed to update saved filter {filter_id}')
        raise


def delete_saved_filter(filter_id: str) -> bool:
    """Delete a saved filter."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/saved_filters?id=eq.{filter_id}"
        
        resp = requests.delete(url, headers=_postgrest_headers(), timeout=15)
        resp.raise_for_status()
        
        return True
    except Exception:
        logger.exception(f'Failed to delete saved filter {filter_id}')
        return False
```

### 4. Backend API Endpoints
**File:** `backend/app/main.py`

**Key Endpoints Added:**

1. **POST /admin/cases/filter** - Advanced case filtering
2. **POST /admin/saved-filters** - Create saved filter
3. **GET /admin/saved-filters** - List saved filters
4. **GET /admin/saved-filters/{filter_id}** - Get specific filter
5. **PUT /admin/saved-filters/{filter_id}** - Update filter
6. **DELETE /admin/saved-filters/{filter_id}** - Delete filter

**Updated Imports:**
```python
from .schemas import EligibilityRequest, EligibilityResult, CaseFilterRequest, SavedFilterCreate
```

### 5. Frontend Component Enhancement
**File:** `frontend/src/components/AdminCasesTable.tsx`

**Key Changes:**

1. **Added Interfaces:**
```typescript
interface AdvancedFilters {
  status: string[];
  minAiScore: number | null;
  maxAiScore: number | null;
  minIncomePotential: number | null;
  maxIncomePotential: number | null;
  startDate: string | null;
  endDate: string | null;
  searchQuery: string;
}
```

2. **Added State Variables:**
```typescript
const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({...});
const [savedFilters, setSavedFilters] = useState<any[]>([]);
const [applyingAdvancedFilter, setApplyingAdvancedFilter] = useState(false);
```

3. **Added Functions:**
- `applyAdvancedFilters()` - Execute filter request
- `resetFilters()` - Clear all filters
- Enhanced filter UI rendering

4. **Added UI Elements:**
- Advanced filter toggle button
- Filter criteria inputs
- Status checkboxes
- AI score range inputs
- Income potential range inputs
- Date inputs
- Apply/Reset buttons

---

## 🔄 Integration Checklist

- [x] Database migration file created
- [x] Pydantic schemas defined
- [x] SavedFilters CRUD functions implemented
- [x] API endpoints implemented
- [x] Frontend component enhanced
- [x] Error handling added
- [x] Access control implemented
- [x] Documentation created

---

## 📋 Deployment Steps

1. **Backup Database**
   ```bash
   # Via Supabase dashboard or CLI
   ```

2. **Run Migration**
   ```bash
   cd backend
   # Option A: Via Python
   python -m app.apply_migration
   
   # Option B: Via Supabase SQL Editor
   # Copy content from 012_create_saved_filters_table.sql and execute
   ```

3. **Restart Backend**
   ```bash
   # Kill existing process
   # Restart with: uvicorn app.main:app --reload
   ```

4. **Verify Frontend**
   - Open admin panel
   - Check "סינון מתקדם" button appears
   - Test filter application

---

## 🧪 Quick Test Commands

### Test Filter Endpoint
```bash
curl -X POST http://localhost:8000/admin/cases/filter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": ["Submitted"],
    "min_ai_score": 50,
    "limit": 10,
    "offset": 0
  }'
```

### Test Create Saved Filter
```bash
curl -X POST http://localhost:8000/admin/saved-filters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Filter",
    "description": "A test filter",
    "status": ["Submitted"],
    "min_ai_score": 60
  }'
```

### Test Get Saved Filters
```bash
curl -X GET http://localhost:8000/admin/saved-filters \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Database Verification

```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'saved_filters';

-- Check indexes
SELECT * FROM pg_indexes 
WHERE tablename = 'saved_filters';

-- Check sample data
SELECT * FROM saved_filters LIMIT 5;
```

---

## 🔍 Troubleshooting

### Migration Failed
- Check Supabase credentials
- Verify table doesn't already exist
- Check SQL syntax in migration file

### Filter Endpoint Returns 500
- Check logs for JSON parsing errors
- Verify Supabase connectivity
- Check user authentication

### Frontend Filters Don't Show
- Check browser console for JS errors
- Verify API endpoints are accessible
- Check authentication token validity

### Slow Filtering
- Check database indexes were created
- Check query with EXPLAIN ANALYZE
- Consider adding more filters to reduce result set

---

## 📈 Performance Tips

1. **Use Narrow Date Ranges** when possible
2. **Increase Filter Specificity** to reduce result set
3. **Use Saved Filters** to avoid re-entering criteria
4. **Monitor Database** for query performance
5. **Consider Caching** frequently used filters

---

## 🔐 Security Verification

```bash
# Test non-admin access denied
curl -X POST http://localhost:8000/admin/cases/filter \
  -H "Authorization: Bearer NON_ADMIN_TOKEN"
# Should return 403

# Test without auth
curl -X POST http://localhost:8000/admin/cases/filter
# Should return 401
```

---

## 📚 Code References

- **Filter Logic:** `/admin/cases/filter` endpoint in `main.py` (lines ~975-1130)
- **SavedFilters CRUD:** `supabase_client.py` (lines ~1570-1750)
- **Frontend UI:** `AdminCasesTable.tsx` (entire component)
- **Schemas:** `schemas.py` (lines ~24-95)

---

**Implementation Complete ✅**  
**Ready for Testing & Deployment**
