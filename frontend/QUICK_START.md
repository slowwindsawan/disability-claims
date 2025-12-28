# 🚀 Static Build Quick Start

Your Next.js app is now configured for **static export** - no server needed!

## ✅ What Changed

1. **next.config.mjs** - Added `output: 'export'`
2. **package.json** - Updated start script to serve static files
3. **app/layout.tsx** - Fixed metadata for static export

## ⚠️ Action Required

You have **18 API route calls** that need to be updated. These won't work in static builds.

### Quick Fix

Use the new helper functions in `lib/api-helper.ts`:

```typescript
// OLD
const response = await fetch('/api/admin/cases', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// NEW - Option 1 (Recommended)
import { authFetch } from '@/lib/api-helper'
const response = await authFetch('/admin/cases')

// NEW - Option 2 (Manual)
import { BACKEND_BASE_URL } from '@/variables'
const token = localStorage.getItem('access_token')
const response = await fetch(`${BACKEND_BASE_URL}/admin/cases`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### Files to Update

See **FILES_TO_UPDATE.md** for the complete list with line numbers.

Quick summary of files needing changes:
- ✏️ `app/admin/page.tsx`
- ✏️ `app/admin/analytics/page.tsx`
- ✏️ `app/admin/advanced-filters/page.tsx`
- ✏️ `app/dashboard/page.tsx`
- ✏️ `app/legal-review/page.tsx`
- ✏️ `src/components/AdminCasesTable.tsx`

## 🔨 Build & Test

```bash
# Build static site
npm run build

# Serve locally (test before deploying)
npm start
```

Visit http://localhost:3000 and test all features!

## 📤 Deploy

Your static site in `out/` folder can be deployed to:

### Netlify (Recommended)
```bash
# Drag & drop the 'out' folder, or use CLI:
netlify deploy --prod --dir=out
```

### Vercel
```bash
vercel --prod
```

### Other Options
- GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps
- Any web server (Nginx, Apache, etc.)

## 📚 Documentation

- **STATIC_BUILD_MIGRATION.md** - Complete migration guide
- **FILES_TO_UPDATE.md** - Detailed file-by-file instructions
- **lib/api-helper.ts** - Helper functions for API calls

## 🐛 Troubleshooting

### Build fails?
Check for remaining `/api/` fetch calls:
```powershell
Select-String -Path "app\**\*.tsx" -Pattern "/api/" -Recurse
```

### CORS errors?
Your backend needs to allow requests from your frontend domain. Check CORS settings on `https://disability-claims.onrender.com`

### Features not working?
Compare local dev (`npm run dev`) vs static (`npm run build && npm start`). If it works in dev but not static, you likely have server-side code that needs to be moved to the client.

## 🎯 Next Steps

1. Update the 18 API fetch calls (see FILES_TO_UPDATE.md)
2. Test locally: `npm run build && npm start`
3. Verify all features work
4. Deploy to your hosting service
5. Optional: Delete `app/api/` folder once migration is complete

## ❓ Need Help?

- Check **STATIC_BUILD_MIGRATION.md** for in-depth explanations
- Review **FILES_TO_UPDATE.md** for specific code changes
- Test with `npm run dev` first to ensure existing features work

---

**Remember:** Your backend at `https://disability-claims.onrender.com` still handles all the logic. Your frontend is now just static HTML/CSS/JS that calls the backend directly from the browser! 🎉
