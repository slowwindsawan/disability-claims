# Eligibility Analysis - Quick Start Checklist

## ✅ Implementation Status

### Backend Implementation
- [x] `check_document_relevance()` function in `eligibility_processor.py`
- [x] `analyze_questionnaire_with_guidelines()` function in `eligibility_processor.py`
- [x] Provider switching (Gemini/GPT) support
- [x] Heuristic fallback for relevance check
- [x] Error handling and logging
- [x] API endpoint: `POST /eligibility/check-document-relevance`
- [x] API endpoint: `POST /eligibility/analyze-questionnaire`
- [x] Test script: `test_eligibility.py`
- [x] Backend usage documentation: `ELIGIBILITY_USAGE.md`
- [x] Frontend integration guide: `ELIGIBILITY_INTEGRATION_GUIDE.md`

### What's Left To Do

#### 1. Install Required Packages
```bash
cd backend
.\venv\Scripts\Activate.ps1
pip install google-generativeai openai boldsign
```

**Verification:**
```bash
python -c "import google.generativeai; print('✓ Gemini installed')"
python -c "import openai; print('✓ OpenAI installed')"
python -c "import boldsign; print('✓ BoldSign installed')"
```

---

#### 2. Configure Environment Variables

Edit `backend/.env` and add:

```bash
# Gemini AI (primary provider)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL_ID=gemini-1.5-flash

# OpenAI (fallback provider)
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Google Cloud (for OCR)
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/your/service-account.json
```

**Where to get API keys:**
- Gemini: https://makersuite.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys
- Google Cloud: https://console.cloud.google.com/apis/credentials

---

#### 3. Test Backend Functions

```bash
cd backend
python test_eligibility.py
```

**Expected output:**
```
TEST 1: Valid Medical Document - ✓ PASS
TEST 2: Receipt Rejected - ✓ PASS
TEST 3: Questionnaire Analysis - Shows eligibility results
```

If any test fails:
- Check API keys in .env
- Verify packages installed
- Check logs for detailed errors

---

#### 4. Test API Endpoints

Start the backend server:
```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

**Test with curl:**

```bash
# Test document relevance check
curl -X POST http://localhost:8000/eligibility/check-document-relevance \
  -F "file=@path/to/medical_document.pdf" \
  -F "provider=gemini"

# Test questionnaire analysis
curl -X POST http://localhost:8000/eligibility/analyze-questionnaire \
  -F 'answers={"work_related":"yes","injury_date":"2024-01-10","diagnosis":"Lumbar strain"}' \
  -F "provider=gemini"
```

**Or use Postman:**
1. Import endpoints from collection
2. Set file upload and form data
3. Send requests and verify responses

---

#### 5. Frontend Integration

Add API helper functions to your React app:

**Create:** `src/lib/eligibilityApi.ts`

```typescript
const API_BASE_URL = 'http://localhost:8000';

export async function checkDocumentRelevance(
  file: File, 
  provider: 'gemini' | 'gpt' = 'gemini'
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('provider', provider);
  
  const response = await fetch(`${API_BASE_URL}/eligibility/check-document-relevance`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: formData
  });
  
  if (!response.ok) throw new Error('Document check failed');
  const result = await response.json();
  return result.data;
}

export async function analyzeQuestionnaire(
  answers: Record<string, string>,
  provider: 'gemini' | 'gpt' = 'gemini'
) {
  const formData = new FormData();
  formData.append('answers', JSON.stringify(answers));
  formData.append('provider', provider);
  
  const response = await fetch(`${API_BASE_URL}/eligibility/analyze-questionnaire`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: formData
  });
  
  if (!response.ok) throw new Error('Analysis failed');
  const result = await response.json();
  return result.data;
}
```

---

#### 6. Update Onboarding Flow

**In your document upload screen:**

```typescript
async function handleFileUpload(file: File) {
  setLoading(true);
  
  try {
    // Step 1: Check document relevance
    const relevance = await checkDocumentRelevance(file);
    
    if (!relevance.is_relevant) {
      // Show error to user
      setError({
        title: 'Invalid Document',
        message: relevance.statement,
        directions: relevance.directions
      });
      return;
    }
    
    // Document is valid - proceed
    setDocumentVerified(true);
    setUploadedFile(file);
    
  } catch (err) {
    setError({ message: 'Upload failed. Please try again.' });
  } finally {
    setLoading(false);
  }
}
```

**In your questionnaire submission:**

```typescript
async function handleSubmit(answers: Record<string, string>) {
  setLoading(true);
  
  try {
    // Step 2: Analyze questionnaire
    const analysis = await analyzeQuestionnaire(answers);
    
    // Show results
    navigate('/results', {
      state: {
        status: analysis.eligibility_status,
        score: analysis.eligibility_score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        nextSteps: analysis.required_next_steps
      }
    });
    
  } catch (err) {
    setError({ message: 'Analysis failed. Please try again.' });
  } finally {
    setLoading(false);
  }
}
```

---

#### 7. Add UI Components

**Document Error Component:**

```tsx
// src/components/DocumentError.tsx
export function DocumentError({ statement, directions }: {
  statement: string;
  directions: string[];
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <p className="text-red-800 mb-4">{statement}</p>
      {directions?.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-red-900">What to do next:</p>
          <ul className="list-disc list-inside space-y-1">
            {directions.map((d, i) => (
              <li key={i} className="text-red-700">{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Eligibility Results Component:**

```tsx
// src/components/EligibilityResults.tsx
export function EligibilityResults({ 
  status, 
  score, 
  strengths, 
  weaknesses, 
  nextSteps 
}: {
  status: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold capitalize">{status}</h2>
        <p className="text-6xl font-bold mt-2">{score}/100</p>
      </div>
      
      {strengths?.length > 0 && (
        <div className="bg-green-50 p-4 rounded">
          <h3 className="font-bold mb-2">✓ Strengths</h3>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm">• {s}</li>
            ))}
          </ul>
        </div>
      )}
      
      {weaknesses?.length > 0 && (
        <div className="bg-orange-50 p-4 rounded">
          <h3 className="font-bold mb-2">⚠ Areas to Improve</h3>
          <ul className="space-y-1">
            {weaknesses.map((w, i) => (
              <li key={i} className="text-sm">• {w}</li>
            ))}
          </ul>
        </div>
      )}
      
      {nextSteps?.length > 0 && (
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-bold mb-2">→ Next Steps</h3>
          <ol className="space-y-2">
            {nextSteps.map((step, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="font-bold">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

---

## Testing Checklist

### Backend Tests
- [ ] Test script runs without errors
- [ ] Medical document recognized as relevant
- [ ] Receipt/invoice rejected as irrelevant
- [ ] Questionnaire analysis returns results
- [ ] Provider switching works (gemini → gpt)
- [ ] Error handling works (missing API keys, invalid inputs)

### API Tests
- [ ] Document relevance endpoint responds
- [ ] Questionnaire analysis endpoint responds
- [ ] OCR extraction works for PDF
- [ ] OCR extraction works for images
- [ ] Authentication (if enabled) works
- [ ] Error responses are properly formatted

### Frontend Tests
- [ ] File upload triggers relevance check
- [ ] Invalid documents show error message
- [ ] Valid documents enable questionnaire
- [ ] Questionnaire submission triggers analysis
- [ ] Results display correctly
- [ ] Loading states work
- [ ] Error states work

---

## Troubleshooting

### "Module not found: google.generativeai"
**Solution:** Run `pip install google-generativeai` in backend venv

### "API key not found"
**Solution:** Add GEMINI_API_KEY or OPENAI_API_KEY to backend/.env

### "Could not extract text from document"
**Solution:** 
1. Check GOOGLE_APPLICATION_CREDENTIALS is set
2. Verify service account has Vision API enabled
3. Try different document format

### "Analysis takes too long"
**Solution:**
1. Use faster model: GEMINI_MODEL_ID=gemini-1.5-flash
2. Reduce document size
3. Check network connection

### "Confidence score is very low"
**Solution:**
1. Improve questionnaire answers (more details)
2. Upload better quality medical document
3. Ensure document matches questionnaire content

---

## Performance Optimization

### Backend
- [ ] Enable response caching for identical documents
- [ ] Use connection pooling for API calls
- [ ] Implement rate limiting to prevent abuse
- [ ] Add request timeout handling

### Frontend
- [ ] Show loading spinner during analysis
- [ ] Implement retry logic for failed requests
- [ ] Cache results locally (sessionStorage)
- [ ] Optimize file upload (compress before sending)

---

## Deployment Checklist

### Environment Variables
- [ ] GEMINI_API_KEY set in production
- [ ] OPENAI_API_KEY set in production
- [ ] GOOGLE_APPLICATION_CREDENTIALS configured
- [ ] API rate limits configured

### Monitoring
- [ ] Log API usage and costs
- [ ] Track confidence scores over time
- [ ] Monitor error rates
- [ ] Set up alerts for failures

### Security
- [ ] API keys stored securely (not in code)
- [ ] File upload size limits enforced
- [ ] Authentication enabled for endpoints
- [ ] Input validation active
- [ ] Rate limiting configured

---

## Success Criteria

✅ Backend functions work independently  
✅ API endpoints return correct responses  
✅ Frontend can upload documents and get relevance check  
✅ Frontend can submit questionnaire and get analysis  
✅ Error cases handled gracefully  
✅ User sees clear feedback at each step  
✅ Confidence scores are reasonable (>70% for good submissions)  
✅ Performance is acceptable (<15s total)  

---

## Next Steps After Implementation

1. **User Testing** - Get feedback from real users on clarity of results
2. **Accuracy Tuning** - Monitor confidence scores and adjust prompts
3. **Guidelines Updates** - Keep eligibility.pdf up to date with policy changes
4. **Feature Additions** - Consider adding:
   - Document comparison (uploaded vs questionnaire)
   - Multi-document support
   - Historical tracking of submissions
   - Admin review dashboard

---

## Documentation References

- **Backend Usage**: `backend/ELIGIBILITY_USAGE.md`
- **Frontend Integration**: `ELIGIBILITY_INTEGRATION_GUIDE.md`
- **Implementation Summary**: `ELIGIBILITY_IMPLEMENTATION_SUMMARY.md`
- **Test Script**: `backend/test_eligibility.py`

---

**Status**: Ready for testing and integration  
**Estimated Time**: 2-4 hours for complete integration  
**Priority**: High (core feature for eligibility assessment)

---

Need help? Check the troubleshooting section or review the integration guide.
