# Files to Update for Static Build

## Summary
Found 18 fetch calls to `/api/*` routes that need to be migrated to direct backend calls.

## Migration Strategy

Two options:

### Option 1: Use the Helper Function (Recommended)
Import and use the `authFetch` or `apiFetch` helper from `lib/api-helper.ts`:

```typescript
import { authFetch } from '@/lib/api-helper'

// OLD:
const response = await fetch('/api/admin/cases', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// NEW:
const response = await authFetch('/admin/cases')
```

### Option 2: Direct Replacement
Replace `/api/*` with `${BACKEND_BASE_URL}/*`:

```typescript
import { BACKEND_BASE_URL } from '@/variables'

// OLD:
const response = await fetch('/api/admin/cases')

// NEW:
const response = await fetch(`${BACKEND_BASE_URL}/admin/cases`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

## Files Requiring Updates

### 1. app/admin/page.tsx
**Line 380:**
```typescript
// Current:
const response = await fetch('/api/admin/cases/work-disability', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Update to:
import { authFetch } from '@/lib/api-helper'
const response = await authFetch('/admin/cases/work-disability')
```

### 2. app/admin/analytics/page.tsx
**Line 73:**
```typescript
// Current:
const response = await fetch(`/api/admin/analytics?time_range=${range}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Update to:
import { authFetch } from '@/lib/api-helper'
const response = await authFetch(`/admin/analytics?time_range=${range}`)
```

### 3. app/admin/advanced-filters/page.tsx
**Lines 95, 131, 181, 205:**
```typescript
// Replace all /api/admin/filters with /admin/filters
// Replace all /api/admin/cases/filter with /admin/cases/filter

import { authFetch } from '@/lib/api-helper'

// Line 95:
const response = await authFetch('/admin/filters')

// Line 131:
const response = await authFetch('/admin/cases/filter', {
  method: 'POST',
  body: JSON.stringify(filters)
})

// Line 181:
const response = await authFetch('/admin/filters', {
  method: 'POST',
  body: JSON.stringify({ name, filters: selectedFilters })
})

// Line 205:
const response = await authFetch(`/admin/filters/${encodeURIComponent(name)}`, {
  method: 'DELETE'
})
```

### 4. app/dashboard/page.tsx
**Line 592:**
```typescript
// Current:
const response = await fetch("/api/analyze-documents-form7801", {
  method: "POST",
  body: formData,
})

// Update to:
import { BACKEND_BASE_URL } from '@/variables'
const token = localStorage.getItem('access_token')
const response = await fetch(`${BACKEND_BASE_URL}/analyze-documents-form7801`, {
  method: "POST",
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData,
})
```

### 5. app/legal-review/page.tsx
**Line 216:**
```typescript
// Current:
const casesResponse = await fetch("/api/user/cases", {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Update to:
import { authFetch } from '@/lib/api-helper'
const casesResponse = await authFetch("/user/cases")
```

### 6. src/components/AdminCasesTable.tsx
**Lines 102, 157, 195:**
```typescript
import { authFetch } from '@/lib/api-helper'

// Line 102:
const response = await authFetch('/admin/claims-table?limit=200&offset=0')

// Line 157:
const response = await authFetch('/admin/filters')

// Line 195:
const response = await authFetch('/admin/cases/filter', {
  method: 'POST',
  body: JSON.stringify(filters)
})
```

### 7. new-resources/ folder files
**Note:** The `new-resources/` folder appears to be a duplicate or template. You may want to:
- Delete it if unused, OR
- Update it the same way as the main files

Files in new-resources that need updates:
- `new-resources/app/legal-review/page.tsx` (lines 196, 264, 322, 357)
- `new-resources/app/dashboard/page.tsx` (lines 196, 241, 258)

## Quick Migration Commands

### Search for remaining API calls:
```powershell
# In PowerShell
Select-String -Path "app\**\*.tsx","app\**\*.ts","components\**\*.tsx","lib\**\*.tsx","src\**\*.tsx" -Pattern "fetch\s*\(\s*['\`\"/]api/" -Recurse
```

### Or use VS Code search:
1. Press `Ctrl+Shift+F`
2. Enable regex mode
3. Search for: `fetch\s*\(\s*['"\`]/api/`
4. Review all matches

## Testing Checklist

After making changes, test:
- ✅ Login/signup functionality
- ✅ Admin dashboard loads cases
- ✅ Analytics page displays data
- ✅ Filters can be created and applied
- ✅ Document upload and analysis works
- ✅ User profile loads correctly
- ✅ All form submissions work

## Build Test

```bash
npm run build
```

If build succeeds without errors, the static export is working!

## Deploy Test

```bash
npm run build
npm start
```

Visit http://localhost:3000 and test all features.
