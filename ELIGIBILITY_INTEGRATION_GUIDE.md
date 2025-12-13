# Eligibility Analysis Integration Guide

## Overview

This guide explains how to integrate the two-phase eligibility analysis workflow into your frontend application.

## Workflow

The eligibility analysis follows a two-step process:

1. **Document Relevance Check** - Verify uploaded document is medical/clinical
2. **Questionnaire Analysis** - Evaluate questionnaire answers against guidelines

## API Endpoints

### 1. Check Document Relevance

**Endpoint:** `POST /eligibility/check-document-relevance`

**Purpose:** Validate that uploaded document is relevant for disability claim (medical report, discharge summary, etc.)

**Request:**
```typescript
const formData = new FormData();
formData.append('file', documentFile); // PDF, JPG, PNG, DOCX
formData.append('provider', 'gemini'); // or 'gpt'

const response = await fetch('http://localhost:8000/eligibility/check-document-relevance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}` // optional
  },
  body: formData
});

const result = await response.json();
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "is_relevant": true,
    "relevance_score": 92,
    "relevance_reason": "Document is a comprehensive medical discharge summary with diagnosis, treatment history, and physician information",
    "focus_excerpt": "DISCHARGE SUMMARY\nPatient: John Doe\nDiagnosis: Acute lumbar strain with radiculopathy...",
    "document_type": "discharge_summary",
    "statement": "✓ This document appears to be a valid medical record suitable for disability claim assessment.",
    "directions": [
      "Proceed with questionnaire submission",
      "Ensure all required fields are completed accurately"
    ]
  }
}
```

**Document Types:**
- `medical_report` - Doctor's medical report
- `discharge_summary` - Hospital discharge summary
- `diagnostic_report` - Lab/imaging results
- `receipt` - Invoice/receipt (usually irrelevant)
- `blank_page` - Empty/blank document
- `other` - Unknown/unclassified

**Error Handling:**
```typescript
if (!result.data.is_relevant) {
  // Show user-friendly error message
  alert(result.data.statement);
  
  // Display next steps
  result.data.directions.forEach(direction => {
    console.log('→', direction);
  });
  
  // Block questionnaire submission
  return;
}

// Document is relevant, proceed to questionnaire
```

---

### 2. Analyze Questionnaire

**Endpoint:** `POST /eligibility/analyze-questionnaire`

**Purpose:** Evaluate questionnaire answers against official disability claim guidelines

**Request:**
```typescript
const formData = new FormData();

const answers = {
  work_related: 'yes',
  injury_date: '2024-01-10',
  injury_description: 'Lower back injury while lifting heavy equipment',
  employer_name: 'ABC Manufacturing',
  job_title: 'Warehouse Worker',
  medical_treatment: 'yes',
  physician_name: 'Dr. Sarah Smith',
  facility_name: 'City General Hospital',
  diagnosis: 'Acute lumbar strain with radiculopathy',
  unable_to_work: 'yes',
  days_off_work: '14',
  work_restrictions: 'No lifting over 10 lbs',
  imaging_done: 'yes',
  imaging_type: 'MRI',
  specialist_seen: 'pending',
  previous_injuries: 'no'
};

formData.append('answers', JSON.stringify(answers));
formData.append('provider', 'gemini'); // or 'gpt'

const response = await fetch('http://localhost:8000/eligibility/analyze-questionnaire', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}` // optional
  },
  body: formData
});

const result = await response.json();
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "eligibility_score": 78,
    "eligibility_status": "pending",
    "confidence": 85,
    "reason_summary": "Application shows strong evidence of work-related injury with medical documentation. Pending specialist evaluation before final determination.",
    "rule_references": [
      {
        "section": "Clinical Evaluation & Impairment Rating",
        "quote": "Collect full medical dossier and objective evidence (imaging, lab, pathology...)",
        "relevance": "MRI imaging completed; awaiting specialist review"
      }
    ],
    "required_next_steps": [
      "Schedule orthopedic specialist evaluation",
      "Obtain specialist's impairment rating report",
      "Submit updated medical documentation within 30 days"
    ],
    "strengths": [
      "Clear documentation of work-related incident with specific date",
      "Immediate medical treatment sought at qualified facility",
      "Objective imaging evidence (MRI) obtained",
      "Specific work restrictions documented by physician"
    ],
    "weaknesses": [
      "Specialist evaluation not yet completed",
      "No formal impairment rating provided",
      "Missing detailed treatment plan beyond initial restrictions"
    ],
    "missing_information": [
      "Orthopedic specialist evaluation report",
      "Formal impairment percentage rating",
      "Long-term prognosis and treatment plan",
      "Employer's incident report"
    ]
  }
}
```

**Eligibility Statuses:**
- `approved` - Meets all requirements, claim approved
- `pending` - Under review, additional info needed
- `denied` - Does not meet requirements
- `needs_review` - Requires manual committee review

---

## Frontend Integration

### Complete Workflow Example

```typescript
// Step 1: User uploads document
async function handleDocumentUpload(file: File) {
  setLoading(true);
  setError(null);
  
  try {
    // Check document relevance
    const relevanceResult = await checkDocumentRelevance(file);
    
    if (!relevanceResult.is_relevant) {
      // Document is not relevant - show error
      setError({
        title: 'Invalid Document',
        message: relevanceResult.statement,
        directions: relevanceResult.directions,
        type: relevanceResult.document_type
      });
      
      setLoading(false);
      return;
    }
    
    // Document is relevant - show success and enable questionnaire
    setDocumentVerified(true);
    setDocumentSummary({
      type: relevanceResult.document_type,
      score: relevanceResult.relevance_score,
      excerpt: relevanceResult.focus_excerpt
    });
    
    // Enable questionnaire section
    setQuestionnaireEnabled(true);
    
  } catch (err) {
    setError({
      title: 'Upload Failed',
      message: err.message
    });
  } finally {
    setLoading(false);
  }
}

// Step 2: User completes questionnaire
async function handleQuestionnaireSubmit(answers: Record<string, string>) {
  setLoading(true);
  setError(null);
  
  try {
    // Analyze questionnaire
    const analysisResult = await analyzeQuestionnaire(answers);
    
    // Show results to user
    setEligibilityResult({
      status: analysisResult.eligibility_status,
      score: analysisResult.eligibility_score,
      confidence: analysisResult.confidence,
      summary: analysisResult.reason_summary,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      nextSteps: analysisResult.required_next_steps,
      missingInfo: analysisResult.missing_information
    });
    
    // Navigate to results screen
    router.push('/eligibility-results');
    
  } catch (err) {
    setError({
      title: 'Analysis Failed',
      message: err.message
    });
  } finally {
    setLoading(false);
  }
}

// API helper functions
async function checkDocumentRelevance(file: File, provider: 'gemini' | 'gpt' = 'gemini') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('provider', provider);
  
  const response = await fetch(`${API_BASE_URL}/eligibility/check-document-relevance`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Document check failed');
  }
  
  const result = await response.json();
  return result.data;
}

async function analyzeQuestionnaire(
  answers: Record<string, string>, 
  provider: 'gemini' | 'gpt' = 'gemini'
) {
  const formData = new FormData();
  formData.append('answers', JSON.stringify(answers));
  formData.append('provider', provider);
  
  const response = await fetch(`${API_BASE_URL}/eligibility/analyze-questionnaire`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Questionnaire analysis failed');
  }
  
  const result = await response.json();
  return result.data;
}
```

---

## UI Components

### Document Relevance Error Display

```tsx
interface DocumentErrorProps {
  type: string;
  statement: string;
  directions: string[];
}

function DocumentRelevanceError({ type, statement, directions }: DocumentErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Invalid Document
          </h3>
          <p className="text-red-800 mb-4">{statement}</p>
          
          {directions && directions.length > 0 && (
            <div className="bg-white rounded border border-red-200 p-4">
              <h4 className="font-medium text-red-900 mb-2">What to do next:</h4>
              <ul className="space-y-2">
                {directions.map((direction, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-red-800">
                    <span className="text-red-500 mt-1">→</span>
                    <span>{direction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Upload Different Document
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Eligibility Results Display

```tsx
interface EligibilityResultsProps {
  status: string;
  score: number;
  confidence: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
  missingInfo: string[];
}

function EligibilityResults({
  status,
  score,
  confidence,
  summary,
  strengths,
  weaknesses,
  nextSteps,
  missingInfo
}: EligibilityResultsProps) {
  const statusColors = {
    approved: 'bg-green-50 border-green-200 text-green-900',
    pending: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    denied: 'bg-red-50 border-red-200 text-red-900',
    needs_review: 'bg-blue-50 border-blue-200 text-blue-900'
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Banner */}
      <div className={`border rounded-lg p-6 ${statusColors[status] || statusColors.pending}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold capitalize">{status.replace('_', ' ')}</h2>
          <div className="text-right">
            <div className="text-3xl font-bold">{score}/100</div>
            <div className="text-sm opacity-75">{confidence}% confidence</div>
          </div>
        </div>
        <p className="text-lg">{summary}</p>
      </div>
      
      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-green-800">
                <span className="text-green-500 mt-1">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Weaknesses */}
      {weaknesses && weaknesses.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-2 text-orange-800">
                <span className="text-orange-500 mt-1">⚠</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Required Next Steps */}
      {nextSteps && nextSteps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <ArrowRightIcon className="w-5 h-5" />
            Required Next Steps
          </h3>
          <ol className="space-y-3">
            {nextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-blue-800">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-900 flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      
      {/* Missing Information */}
      {missingInfo && missingInfo.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5" />
            Missing Information
          </h3>
          <ul className="space-y-2">
            {missingInfo.map((info, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-gray-400 mt-1">•</span>
                <span>{info}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## Environment Setup

Make sure these environment variables are configured in `backend/.env`:

```bash
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_ID=gemini-1.5-flash  # or gemini-1.5-pro

# OpenAI (alternative provider)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o

# Google Cloud (for OCR)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

---

## Testing

Run the test script to verify implementation:

```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
python test_eligibility.py
```

Expected output:
```
===============================================================================
TEST 1: Valid Medical Document
===============================================================================

Is Relevant: True
Relevance Score: 92/100
Document Type: discharge_summary
Reason: Comprehensive medical discharge summary with diagnosis, treatment, imaging...
Statement: ✓ This document appears to be a valid medical record...

===============================================================================
TEST 2: Invalid Document (Receipt)
===============================================================================

Is Relevant: False
Relevance Score: 15/100
Document Type: receipt
Reason: This appears to be a pharmacy receipt/invoice, not a medical document
Statement: ✗ This document does not appear to be a medical record...

===============================================================================
TEST 3: Questionnaire Analysis
===============================================================================

Eligibility Status: pending
Eligibility Score: 78/100
Confidence: 85%

✓ Strengths:
  • Clear work-related injury documentation
  • Medical treatment obtained promptly
  • Objective imaging evidence (MRI)
  
✗ Weaknesses:
  • Specialist evaluation pending
  • No formal impairment rating
```

---

## Provider Switching

Both endpoints support switching between Gemini and GPT:

```typescript
// Use Gemini (default)
await checkDocumentRelevance(file, 'gemini');
await analyzeQuestionnaire(answers, 'gemini');

// Use GPT (fallback)
await checkDocumentRelevance(file, 'gpt');
await analyzeQuestionnaire(answers, 'gpt');
```

**When to use each provider:**
- **Gemini**: Faster, more cost-effective, good for most cases
- **GPT**: Higher accuracy, better reasoning, use for complex cases or when Gemini fails

---

## Error Handling

```typescript
try {
  const result = await checkDocumentRelevance(file);
} catch (error) {
  if (error.message.includes('API key')) {
    // API key issue - contact support
    showError('Service temporarily unavailable. Please contact support.');
  } else if (error.message.includes('extract')) {
    // OCR failed - document quality issue
    showError('Could not read document. Please upload a clearer image or PDF.');
  } else if (error.message.includes('token limit')) {
    // Document too long
    showError('Document is too large. Please upload a shorter document.');
  } else {
    // Generic error
    showError('Analysis failed. Please try again.');
  }
}
```

---

## Best Practices

1. **Always check document relevance first** - Don't let users complete questionnaire with invalid document
2. **Show clear error messages** - Use `statement` and `directions` fields for user guidance
3. **Display all feedback** - Show strengths, weaknesses, and next steps for transparency
4. **Enable provider fallback** - If Gemini fails, retry with GPT automatically
5. **Cache results** - Don't re-analyze same document/questionnaire unnecessarily
6. **Show loading states** - AI analysis can take 5-15 seconds
7. **Handle errors gracefully** - Provide actionable error messages

---

## FAQ

**Q: What happens if document relevance check fails?**  
A: The API returns `is_relevant: false` with clear `directions` for the user. Block questionnaire submission and show error message.

**Q: Can I skip document relevance check?**  
A: Technically yes, but not recommended. Irrelevant documents will result in poor questionnaire analysis.

**Q: How long does analysis take?**  
A: Document relevance: 3-8 seconds. Questionnaire analysis: 8-15 seconds.

**Q: What file types are supported?**  
A: PDF, JPG, PNG, DOCX. OCR works on both digital and scanned documents.

**Q: What if OCR fails?**  
A: API returns 400 error with message "Could not extract meaningful text". Ask user to upload clearer document.

**Q: How accurate is the AI analysis?**  
A: Confidence scores typically 75-95%. Manual review recommended for borderline cases (score 40-60).

**Q: Can I customize the guidelines?**  
A: Yes, modify `backend/data/eligibility.pdf` or pass custom `guidelines_text` to analysis function.

---

## Support

For issues or questions:
- Check logs: `backend/app.log`
- Run test script: `python test_eligibility.py`
- Review usage docs: `backend/ELIGIBILITY_USAGE.md`
