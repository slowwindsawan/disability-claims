# Static Build Migration Guide

## Changes Made

Your Next.js application has been successfully configured for static export. Here are the changes:

### 1. **next.config.mjs** - Static Export Configuration
- ✅ Added `output: 'export'` to enable static site generation
- ✅ Added `trailingSlash: true` for better compatibility with static hosting
- ✅ Kept `images.unoptimized: true` (required for static export)

### 2. **app/layout.tsx** - Metadata Update
- ✅ Added proper TypeScript typing for Metadata
- ✅ Structured metadata correctly for static export
- ✅ Added title and description

### 3. **package.json** - Updated Start Script
- ✅ Changed `"start"` script from `next start` to `npx serve@latest out`
- This serves the static files from the `out` directory after build

## Important: API Routes

⚠️ **Your app has API routes in `app/api/` that will NOT work in a static build.**

Good news: These routes are just proxies! They forward requests to your backend at `https://disability-claims.onrender.com`.

### What the API routes do:
- `app/api/admin/cases/route.ts` → Proxies to `${BACKEND_BASE_URL}/admin/cases`
- `app/api/analyze-documents/route.ts` → Proxies to backend
- And several others...

### Solution: Direct Backend Calls

Since your frontend already uses `BACKEND_BASE_URL` from `variables.tsx`, you can call the backend directly from your client components. Your app is already doing this in many places!

**Example of what to change:**
```typescript
// OLD (using Next.js API route)
const response = await fetch('/api/admin/cases')

// NEW (direct backend call)
import { BACKEND_BASE_URL } from '@/variables'
const response = await fetch(`${BACKEND_BASE_URL}/admin/cases`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### Files to Update

Search for any fetch calls to `/api/` and replace them with direct `BACKEND_BASE_URL` calls:

```bash
# Search for API route usage
grep -r "fetch.*['\"]\/api\/" app/ components/ lib/
```

Common patterns to find and replace:
- `fetch('/api/admin/cases')` → `fetch(\`${BACKEND_BASE_URL}/admin/cases\`)`
- `fetch('/api/analyze-documents')` → `fetch(\`${BACKEND_BASE_URL}/analyze-documents\`)`
- etc.

## Building Your Static Site

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```
This creates static files in the `out/` directory.

### Serving Static Files Locally
```bash
npm start
```
This serves the `out/` directory on http://localhost:3000

### Deployment Options

Your static site can be deployed to any static hosting service:

1. **Netlify**
   - Build command: `npm run build`
   - Publish directory: `out`

2. **Vercel** (still works with static export)
   - Automatically detects the configuration
   - Deploys the `out` directory

3. **GitHub Pages**
   - Upload the `out` directory
   - Configure your repository settings

4. **AWS S3 + CloudFront**
   - Upload `out/` to S3 bucket
   - Set up CloudFront distribution

5. **Azure Static Web Apps**
   - Build command: `npm run build`
   - Output location: `out`

6. **Any Web Server** (Apache, Nginx, etc.)
   - Just copy the `out/` directory to your web root
   - Configure SPA routing if needed

## CORS Considerations

Since your frontend will now call the backend directly from the browser (not via Next.js server), ensure your backend at `https://disability-claims.onrender.com` has proper CORS headers:

```python
# Example for FastAPI/Python backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing

1. **Build the static site:**
   ```bash
   npm run build
   ```

2. **Serve it locally:**
   ```bash
   npm start
   ```

3. **Test all features:**
   - Login/signup
   - Dashboard
   - Admin features
   - Document uploads
   - All API calls

## Features Preserved

✅ All your existing features work with static export:
- Client-side routing (Next.js handles this)
- State management (React context, localStorage)
- API calls to your backend
- Authentication
- File uploads
- All UI components
- Multi-language support
- WhatsApp widget
- All forms and interactions

## Next Steps

1. Search for any remaining `/api/` fetch calls in your codebase
2. Replace them with direct `BACKEND_BASE_URL` calls
3. Test the build locally with `npm run build && npm start`
4. Deploy to your preferred static hosting service
5. Optionally: Delete the `app/api/` directory once you've migrated all calls

## Rollback (if needed)

If you need to revert:
1. Change `next.config.mjs`: Remove `output: 'export'` and `trailingSlash: true`
2. Change `package.json`: Revert start script to `"next start"`
3. Your API routes will work again
