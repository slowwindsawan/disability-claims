# Document Relevance Verification - Quick Reference

## 🎯 What It Does

When users upload documents in the dashboard, the system now:
1. ✅ Analyzes the document content using AI
2. ✅ Compares it against required document specifications from `call_summary.documents_requested_list`
3. ✅ Returns confidence score (0-100)
4. ⚠️ If confidence ≤ 60: Shows user a detailed dialog with analysis
5. ✅ User can confirm (upload anyway) or reject (delete and re-upload)

## 🚀 Quick Integration (3 Steps)

### Step 1: Import Components
```typescript
import { useDocumentUploadWithRelevance } from '@/hooks/use-document-upload-with-relevance'
import { DocumentRelevanceDialog } from '@/components/DocumentRelevanceDialog'
```

### Step 2: Initialize Hook
```typescript
const {
  uploadDocument,
  confirmUpload,
  rejectUpload,
  isUploading,
  relevanceCheck,
  showRelevanceDialog,
  pendingUpload,
} = useDocumentUploadWithRelevance({
  onSuccess: (result) => {
    console.log('✅ Uploaded:', result)
    // Refresh your data here
  },
  onError: (error) => {
    console.error('❌ Error:', error)
  },
})
```

### Step 3: Use in Your Component
```typescript
// When user selects file
const handleUpload = async () => {
  await uploadDocument(
    caseId,
    selectedFile,
    'medical_report',      // document type
    undefined,             // document_id (optional)
    'תעודה רפואית',       // document_name (for matching)
    false                  // confirmed (always false initially)
  )
}

// Render the dialog
return (
  <>
    <Button onClick={handleUpload} disabled={isUploading}>
      {isUploading ? 'מעלה...' : 'העלה מסמך'}
    </Button>
    
    {relevanceCheck && (
      <DocumentRelevanceDialog
        isOpen={showRelevanceDialog}
        onOpenChange={() => {}}
        relevanceCheck={relevanceCheck}
        documentName={pendingUpload?.documentName}
        onConfirm={confirmUpload}
        onReject={rejectUpload}
        isConfirming={isUploading}
        isRejecting={isUploading}
      />
    )}
  </>
)
```

## 📊 Confidence Scoring

| Score Range | Meaning | Action |
|------------|---------|--------|
| 90-100 | Perfect match | ✅ Auto-upload |
| 70-89 | Good match, minor gaps | ✅ Auto-upload |
| 61-69 | Acceptable | ✅ Auto-upload |
| 41-60 | Significant issues | ⚠️ Show dialog |
| 0-40 | Wrong document | ⚠️ Show dialog |

**Threshold:** Confidence > 60 = auto-approve

## 🔧 Backend Endpoints

### Upload Document
```http
POST /cases/{case_id}/documents
Content-Type: multipart/form-data

file: File
document_type: string
document_id?: string
document_name?: string
confirmed: boolean = false
```

**Response (High Confidence):**
```json
{
  "status": "ok",
  "document": {...},
  "storage_url": "...",
  "relevance_check": {...}
}
```

**Response (Low Confidence):**
```json
{
  "status": "needs_confirmation",
  "relevance_check": {
    "is_relevant": false,
    "confidence": 45,
    "detailed_analysis": "המסמך חסר...",
    "missing_items": ["אבחנה רפואית", "..."],
    "recommendations": "יש להעלות...",
    "matched_aspects": ["..."]
  },
  "temp_storage_info": {
    "storage_path": "cases/123/documents/...",
    "storage_url": "https://...",
    "file_name": "document.pdf",
    "file_size": 12345,
    "document_type": "medical"
  }
}
```

### Delete Temp Document
```http
DELETE /cases/{case_id}/documents/temp?storage_path={path}
```

## 🎨 Dialog UI Features

The dialog displays:
- 🎯 **Confidence Badge:** Visual score indicator
- 📝 **Detailed Analysis:** AI explanation in Hebrew
- ✅ **Matched Aspects:** What's correct (green)
- ❌ **Missing Items:** What's wrong (red)
- 💡 **Recommendations:** What to do (blue)
- ⚠️ **Warning:** Proceed with caution message

## 🛠️ Customization

### Change Confidence Threshold
Edit `backend/app/main.py` around line 1508:
```python
if confidence > 60:  # Change this value
    should_proceed_with_save = True
```

### Modify AI Prompt
Edit `backend/app/document_relevance_checker_agent.py`:
- Adjust `system_prompt` for stricter/looser validation
- Modify temperature (default: 0.3)

### Customize Dialog Appearance
Edit `frontend/components/DocumentRelevanceDialog.tsx`:
- Change colors in severity badges
- Modify button text
- Adjust layout

## 🐛 Troubleshooting

### Issue: Dialog Doesn't Show
**Check:**
- Is `document_name` parameter provided in upload call?
- Does case have `documents_requested_list` in `call_summary`?
- Is document name matching exactly?

### Issue: All Documents Rejected
**Check:**
- Verify OpenAI API key is set
- Check backend logs for relevance check results
- Ensure required doc spec has proper `name`, `reason`, `source` fields

### Issue: Documents Auto-Approve When They Shouldn't
**Solution:**
- Lower confidence threshold (try 70 or 80)
- Improve AI prompt to be more strict

## 📁 Files to Know

**Backend:**
- `backend/app/document_relevance_checker_agent.py` - AI agent
- `backend/app/main.py` - Upload endpoint (line ~1394)
- `backend/app/supabase_client.py` - Storage utilities

**Frontend:**
- `frontend/lib/api.ts` - API functions
- `frontend/hooks/use-document-upload-with-relevance.ts` - Upload hook
- `frontend/components/DocumentRelevanceDialog.tsx` - Dialog UI
- `frontend/components/DocumentUploadIntegrationGuide.tsx` - Full examples

## 💡 Pro Tips

1. **Always provide `document_name`** - It's used for matching against required specs
2. **Handle `onSuccess` callback** - Refresh your UI after successful upload
3. **Don't disable the dialog** - Let users close it naturally
4. **Test with various documents** - Ensure relevance checking works for your use case
5. **Monitor backend logs** - Confidence scores are logged for analysis

## 🔗 Related Documentation

- Full Implementation: `DOCUMENT_RELEVANCE_IMPLEMENTATION.md`
- Integration Examples: `frontend/components/DocumentUploadIntegrationGuide.tsx`
- Agent Documentation: Comments in `document_relevance_checker_agent.py`

---

**Need Help?** Check the integration guide or backend logs for detailed debug information.
