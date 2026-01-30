# Configuration Guide

## Centralized URL Configuration - NO HARDCODING

All URLs in the extension folder are now **100% centralized** in `extension/config.js`. There are **no hardcoded URLs** anywhere in the extension files.

### Extension Configuration (`extension/config.js`)

Single source of truth for ALL extension URLs:

```javascript
const BACKEND_BASE_URL = 'https://claire-camp-nicholas-gently.trycloudflare.com';
const DEMO_PDF_URL = `${BACKEND_BASE_URL}/demo.pdf`;
const DEMO_IMAGE_URL = `${BACKEND_BASE_URL}/demo.jpeg`;
```

**To change the backend URL, update ONLY ONE line:**
- Edit `extension/config.js` line 13: `const BACKEND_BASE_URL = '...'`

All extension files will automatically use the new URL.

### How Configuration is Loaded

**For Content Scripts (govforms.gov.il):**
- `manifest.json` loads scripts in order: `["config.js", "content.js"]`
- `config.js` defines `BACKEND_BASE_URL`, `DEMO_PDF_URL`, `DEMO_IMAGE_URL` globally
- `content.js` accesses them as global variables

**For Background Service Worker:**
- `background.js` accesses variables as globals (defined by config.js in scope)

**For Popup UI:**
- `popup.html` loads scripts in order: `<script src="config.js"></script>` then `<script src="popup.js"></script>`
- `popup.js` accesses variables as globals

### Extension Files - Updated ✅

| File | Changes |
|------|---------|
| `extension/config.js` | ✅ Source of truth - defines all URLs |
| `extension/content.js` | ✅ Uses global `BACKEND_BASE_URL`, `DEMO_PDF_URL`, `DEMO_IMAGE_URL` - NO hardcoding |
| `extension/background.js` | ✅ Uses global `BACKEND_BASE_URL` for 7801 submission endpoint |
| `extension/popup.js` | ✅ Uses global `DEMO_PDF_URL`, `DEMO_IMAGE_URL` for example payload |
| `extension/popup.html` | ✅ Loads `config.js` before `popup.js` |
| `extension/manifest.json` | ✅ Loads `config.js` before `content.js` in all content scripts |

### Frontend Configuration (`frontend/variables.tsx`)

The frontend also has centralized configuration:

```typescript
export const BACKEND_BASE_URL = "https://claire-camp-nicholas-gently.trycloudflare.com"
```

**To change the backend URL, update ONLY ONE line:**
- Edit `frontend/variables.tsx`

### Verification - No Hardcoded URLs ✅

```bash
# Check for hardcoded localhost URLs in extension (excluding comments and config.js itself)
grep -r "http://localhost:8000" extension/*.js
# Result: Only commented line in config.js (acceptable)
```

### Deployment Instructions

#### For Local Development:
1. Edit `extension/config.js`:
   ```javascript
   const BACKEND_BASE_URL = 'http://localhost:8000';
   ```

2. Edit `frontend/variables.tsx`:
   ```typescript
   export const BACKEND_BASE_URL = "http://localhost:8000"
   ```

#### For Production (Cloudflare Workers):
1. Edit `extension/config.js`:
   ```javascript
   const BACKEND_BASE_URL = 'https://claire-camp-nicholas-gently.trycloudflare.com';
   ```

2. Edit `frontend/variables.tsx`:
   ```typescript
   export const BACKEND_BASE_URL = "https://claire-camp-nicholas-gently.trycloudflare.com"
   ```

3. Reload extension in `chrome://extensions/`

### Verification in Browser

After deployment, check browser console logs:

```
[CONTENT.JS] Backend URL: https://claire-camp-nicholas-gently.trycloudflare.com
[BACKGROUND.JS] Backend URL: https://claire-camp-nicholas-gently.trycloudflare.com
```

If you see `NOT LOADED`, the config.js was not loaded properly - check manifest.json.

## Summary

✅ **Zero hardcoded URLs** in extension files  
✅ **Single source of truth** - config.js  
✅ **Global variables** - loaded by manifest before other scripts  
✅ **Easy deployment** - change one line in two files
