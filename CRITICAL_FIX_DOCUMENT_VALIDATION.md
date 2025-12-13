# CRITICAL FIX: Document Validation in /eligibility-check

## Problem Identified

When uploading a **random/irrelevant document** (like a receipt or non-medical file), the system was:
- ❌ Still analyzing it and giving an eligibility score (85/100 in your case)
- ❌ Not warning the user about the irrelevant document
- ❌ Proceeding with questionnaire analysis despite invalid document

## Root Cause

The `/eligibility-check` endpoint was using the **old** `call_gemini()` function which didn't have strict document validation. It was bypassing the new lawyer-focused strict validation system entirely.

## Solution Implemented

### Backend Changes (`backend/app/main.py`)

Updated `/eligibility-check` endpoint to use the **strict 2-step validation**:

#### STEP 1: Document Relevance Check (MANDATORY)
```python
relevance_result = check_document_relevance(text, provider='gemini')

# If document is NOT relevant, return 400 error immediately
if not relevance_result['is_relevant']:
    return JSONResponse({
        'status': 'error',
        'error': 'document_not_relevant',
        'message': relevance_result['statement'],
        'data': {
            'is_relevant': False,
            'document_type': relevance_result['document_type'],
            'statement': relevance_result['statement'],
            'directions': relevance_result['directions']  # What to upload instead
        }
    }, status_code=400)
```

#### STEP 2: Questionnaire Analysis (Only if Step 1 passes)
```python
# Only executed if document is validated
guidelines_text = load_eligibility_guidelines()
model_res = analyze_questionnaire_with_guidelines(
    answers=answers_obj,
    guidelines_text=guidelines_text,
    provider='gemini',
    document_summary=document_summary  # From validated document
)
```

### Frontend Changes (`src/components/Onboarding/screens/ProcessingScreen.tsx`)

Updated to handle document rejection errors:

```typescript
// Check if document was rejected
if (payload.status === 'error' && payload.error === 'document_not_relevant') {
  const data = payload.data;
  const directions = data.directions || [];
  
  // Show clear error message with directions
  const errorMsg = `
${data.statement}

What you need to upload:
${directions.map((d: string) => `• ${d}`).join('\n')}
  `.trim();
  
  setError(errorMsg);
  setLoading(false);
  return;  // Stop processing
}
```

Also updated eligibility status mapping to use new values:
- `approved` → 5 stars "Likely Approved"
- `pending` (score ≥70) → 4 stars "Strong Case"
- `pending` (score <70) → 3 stars "Pending Review"
- `denied` (score ≥40) → 2 stars "Weak Case"
- `denied` (score <40) → 1 star "Likely Denied"

## What Happens Now

### Valid Medical Document ✓
```
1. User uploads hospital discharge summary
2. Document validation: PASS (score: 92/100)
3. Questionnaire analysis runs with document context
4. Result: Eligibility score 85/100, status "pending"
5. User sees: "Strong Case" with detailed feedback
```

### Invalid Document (Receipt) ✗
```
1. User uploads pharmacy receipt
2. Document validation: FAIL (score: 15/100)
3. ⛔ Processing STOPS immediately
4. User sees error message:
   
   "✗ This document does not contain valid medical evidence for a disability claim."
   
   What you need to upload:
   • Please upload medical records such as: physician reports, hospital discharge summaries...
   • Receipts and billing statements are NOT valid medical evidence
   • Contact your healthcare provider to obtain proper medical documentation

5. User can retry with correct document
```

### Random Non-Medical Text ✗
```
1. User uploads random text file
2. Document validation: FAIL (score: 5/100)
3. ⛔ Processing STOPS immediately
4. User sees error with clear guidance
```

## Testing

### Test Invalid Document
1. Go to onboarding flow
2. Upload a receipt or random text file
3. Should see error message immediately
4. Should NOT see eligibility score screen

### Test Valid Document
1. Upload medical report or discharge summary
2. Should proceed normally
3. Should see eligibility results with document context

## Impact

✅ **Prevents false positives** - No more high scores for irrelevant documents  
✅ **Clear user guidance** - Tells user exactly what type of document to upload  
✅ **Saves time** - Stops processing immediately for invalid documents  
✅ **Better legal accuracy** - Only analyzes cases with proper medical evidence  
✅ **Cross-referencing** - Questionnaire answers validated against medical document  

## Files Changed

1. **backend/app/main.py**
   - Updated `/eligibility-check` endpoint
   - Added 2-step validation (document → questionnaire)
   - Returns 400 error for invalid documents
   - Includes document context in analysis

2. **src/components/Onboarding/screens/ProcessingScreen.tsx**
   - Handles `document_not_relevant` error
   - Shows clear error message with directions
   - Updated status mapping for new values

## Backward Compatibility

✅ **Fully backward compatible**
- Old responses still work (using `data.eligibility`)
- New responses use `data.eligibility_status` and `data.eligibility_score`
- Frontend checks both fields

## Next Steps

1. Test with various document types (receipts, medical reports, random files)
2. Monitor user feedback on error messages
3. Adjust strictness if too many valid documents rejected
4. Add document type examples/previews in UI

---

**Fixed:** December 9, 2025  
**Critical:** Yes - Prevents incorrect eligibility assessments  
**Status:** Ready for testing
