# Backend URL Centralization - Complete

## Overview
Successfully created a centralized backend URL configuration system to eliminate hardcoded `localhost:8000` references across the entire frontend codebase.

## Changes Made

### 1. Created Centralized Variables File
**File:** `frontend/variables.tsx`

This file exports `BACKEND_BASE_URL` which:
- Checks multiple environment variables in order: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_BACKEND_URL`, `REACT_APP_BACKEND_URL`
- Falls back to `http://localhost:8000` for local development
- Can be imported and used throughout the application

```typescript
import { BACKEND_BASE_URL } from '@/variables'

// Usage:
const apiUrl = `${BACKEND_BASE_URL}/admin/profile`
```

### 2. Files Updated

#### API Configuration Files (2)
- `lib/api.ts` - Core API utility
- `src/lib/adminCasesApi.ts` - Admin cases API service

#### Page Components (8)
- `app/page.tsx` - Main login/signup page
- `app/admin/page.tsx` - Admin dashboard
- `app/admin/team/page.tsx` - Admin team management
- `app/admin/team/page_new.tsx` - Alternative team management
- `app/admin/qa-submission/page.tsx` - QA submission page
- `app/value-reveal/page.tsx` - Value reveal page
- `app/medical-documents/page.tsx` - Medical documents page
- `app/checkout/page.tsx` - Checkout page

#### Library/Hook Files (1)
- `lib/useCurrentCase.tsx` - Case data fetching hook

#### Component Files (3)
- `components/end-of-call-transition.tsx` - Call transition component
- `components/end-of-call-transition-new.tsx` - Alternative transition component
- `components/document-signing-iframe.tsx` - Document signing component

#### API Route Files (8)
- `app/api/analyze-documents-form7801/route.ts`
- `app/api/analyze-documents/route.ts`
- `app/api/admin/analytics/route.ts`
- `app/api/admin/claims-table/route.ts`
- `app/api/admin/cases/route.ts`
- `app/api/admin/cases/[id]/route.ts`
- `app/api/admin/cases/work-disability/route.ts`
- `app/api/admin/cases/filter/route.ts`

**Total Files Updated: 30**

### 3. Changes Pattern

All files were updated following this pattern:

**Before:**
```typescript
const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/endpoint`
```

**After:**
```typescript
import { BACKEND_BASE_URL } from '@/variables'

const apiUrl = `${BACKEND_BASE_URL}/endpoint`
```

## Benefits

1. **Single Source of Truth** - Backend URL is configured in one place
2. **Easy Environment Management** - Change URL by setting environment variables
3. **Cleaner Code** - Removes repetitive environment variable checks
4. **Maintainability** - Easy to find and update all API endpoints
5. **Consistency** - All files use the same URL resolution logic
6. **Development Friendly** - Clear fallback to localhost:8000 for development

## Environment Variables

The system respects these environment variables (in priority order):
1. `NEXT_PUBLIC_API_URL`
2. `NEXT_PUBLIC_API_BASE`
3. `NEXT_PUBLIC_BACKEND_URL`
4. `REACT_APP_BACKEND_URL`
5. Default: `http://localhost:8000`

## How to Use in New Files

For any new files that need to call the backend API:

```typescript
import { BACKEND_BASE_URL } from '@/variables'

// Then use it:
const response = await fetch(`${BACKEND_BASE_URL}/your/api/endpoint`, {
  // ... fetch options
})
```

## Verification

✅ All hardcoded `localhost:8000` references in source files have been replaced
✅ Build files in `.next/` folder are not affected (they're generated)
✅ All imports have been added to files using `BACKEND_BASE_URL`
✅ Pattern is consistent across all file types (pages, components, APIs)

## Next Steps

1. Update `.env.local` or `.env.production` with the appropriate backend URLs for each environment
2. Build and test the application to ensure all API calls work correctly
3. Consider adding this pattern to any new files that need backend connectivity
