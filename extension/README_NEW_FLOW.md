# Extension Auto-Fill Flow - Updated Architecture

## Overview
The extension now only triggers form auto-fill when explicitly invoked with a payload. No automatic execution on page load.

## Two Ways to Trigger

### 1. From Extension Popup (Example Data)
**User clicks the extension popup button:**
1. Popup sends example payload to background script
2. Popup opens/reloads govforms.gov.il tab
3. Content script loads and signals background script
4. Background script sends payload to content script
5. Content script auto-fills form with example data

**Files involved:**
- `popup.html` - Button labeled "Start with Example Data"
- `popup.js` - Contains `EXAMPLE_PAYLOAD` and sends to background
- `background.js` - Stores payload and sends to content script when ready
- `content.js` - Receives payload and fills form

### 2. From Frontend Application (Real Data)
**User submits form in your frontend app:**
1. Frontend calls `chrome.runtime.sendMessage()` with real payload
2. Frontend opens govforms.gov.il in new tab
3. Content script loads and signals background script
4. Background script sends payload to content script
5. Content script auto-fills form with real user data

**Frontend code example:**
```typescript
// In your form submission handler
chrome.runtime.sendMessage(
  'YOUR_EXTENSION_ID', // Get this from chrome://extensions
  {
    action: 'STORE_PAYLOAD',
    payload: formDataPayload,
    source: 'frontend'
  },
  (response) => {
    if (response?.success) {
      // Open form - extension will auto-fill
      window.open('https://govforms.gov.il/mw/forms/T7801@btl.gov.il', '_blank')
    }
  }
)
```

**Note:** Replace `'YOUR_EXTENSION_ID'` with your actual extension ID from `chrome://extensions`

## Key Changes

### ✅ What Changed
- ❌ Removed auto-trigger on page load
- ✅ Only runs when payload is explicitly sent
- ✅ Content script only loads on `https://govforms.gov.il/*`
- ✅ Both frontend and popup can trigger with different payloads
- ✅ Clear logging shows payload source (frontend vs popup)

### 🔧 Files Modified
1. **manifest.json** - Content script only on govforms.gov.il
2. **content.js** - Removed auto-trigger, added START_FLOW_WITH_PAYLOAD listener
3. **background.js** - Added STORE_PAYLOAD handler and auto-forwarding
4. **popup.js** - Sends example payload before opening tab
5. **popup.html** - Updated button text
6. **frontend/app/legal-review/page.tsx** - Updated to use chrome.runtime.sendMessage

## Message Flow

```
┌─────────────┐
│   Popup     │ Click button
│   Button    │
└──────┬──────┘
       │ STORE_PAYLOAD (example data)
       ▼
┌─────────────┐
│ Background  │ Store payload
│   Script    │
└──────┬──────┘
       │ Open/reload tab
       ▼
┌─────────────┐
│  Content    │ CONTENT_SCRIPT_READY
│   Script    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Background  │ START_FLOW_WITH_PAYLOAD
│   Script    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Content    │ Auto-fill form
│   Script    │
└─────────────┘
```

## Testing

### Test with Example Data
1. Load extension in Chrome
2. Go to any page
3. Click extension icon
4. Click "Start with Example Data"
5. Form opens and auto-fills

### Test with Frontend
1. Update extension ID in `frontend/app/legal-review/page.tsx`
2. Submit form in your frontend
3. New tab opens to govforms.gov.il
4. Form auto-fills with your data

## Troubleshooting

**Form doesn't auto-fill:**
- Check console for "[CONTENT.JS] ✓ Content script ready"
- Look for "[CONTENT.JS] ===== START_FLOW_WITH_PAYLOAD RECEIVED ====="
- Verify payload is logged with green borders

**Extension communication error:**
- Ensure extension ID is correct in frontend code
- Check `externally_connectable` in manifest.json includes your domain
- Reload extension after any manifest changes

**Payload is null:**
- Frontend must send payload BEFORE opening tab
- Popup automatically handles this
- Check background script logs for STORE_PAYLOAD message
