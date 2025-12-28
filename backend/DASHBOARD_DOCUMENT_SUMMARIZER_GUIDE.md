# Dashboard Document Summarizer Agent

## Overview

The **Dashboard Document Summarizer Agent** is a specialized AI-powered service that analyzes and summarizes documents uploaded through the disability claims dashboard. Unlike generic document analysis, this agent is specifically designed to:

1. **Comprehensively extract** all medical information from documents
2. **Identify relevance** to disability claims
3. **Structure data** for legal evidence evaluation
4. **Provide detailed summaries** suitable for claim support

## Architecture

### Location
- **File**: `backend/app/dashboard_document_summarizer.py`
- **Integration Points**:
  - `POST /cases/{case_id}/documents` - Case document upload
  - `POST /upload/medical-document` - Medical document flow

### Core Function
```python
def summarize_dashboard_document(
    ocr_text: str,
    document_name: str = "Uploaded Document",
    document_type: str = "medical"
) -> Dict[str, Any]
```

## Response Structure

Each document analysis returns a comprehensive JSON response:

```json
{
  "is_relevant": boolean,
  "document_summary": "string (300-1000 words for medical documents)",
  "key_points": ["array of 5-15 specific medical facts"],
  "upload_source": "manual_upload",
  "relevance_score": 0-100,
  "relevance_reason": "string",
  "document_type": "string",
  "relevance_guidance": "string",
  "structured_data": {
    "diagnoses": ["array of diagnoses with severity"],
    "test_results": ["array of test results with values"],
    "medications": ["array of medications with dosages"],
    "functional_limitations": ["array of functional limitations"],
    "work_restrictions": ["array of work restrictions"],
    "provider_info": "string"
  }
}
```

## Response Fields Explained

### `is_relevant` (boolean)
- `true`: Document contains valid medical evidence for disability claim
- `false`: Document is not medical or lacks legal evidence

### `relevance_score` (0-100)
- **0-20**: Not medical (receipt, blank, unrelated)
- **21-50**: Administrative medical (appointment card, insurance form)
- **51-70**: Partial medical info (basic doctor note without findings)
- **71-100**: Strong medical evidence (diagnosis, test results, clinical findings)

### `document_type` (string)
Categorizes the document:
- `medical_report` - General medical report
- `discharge_summary` - Hospital discharge
- `specialist_evaluation` - Specialist consultation
- `psychological_evaluation` - Psychology evaluation
- `neuropsych_evaluation` - Neuropsychological assessment
- `psychiatric_assessment` - Psychiatric evaluation
- `diagnostic_report` - Diagnostic imaging/lab report
- `surgical_report` - Surgical procedure report
- `lab_results` - Laboratory test results
- `imaging_report` - Medical imaging interpretation
- `treatment_record` - Ongoing treatment documentation
- `blank_page` - Blank or unreadable
- `receipt` - Billing/payment document
- `insurance_form` - Insurance documentation
- `appointment_card` - Appointment notification
- `other` - Other document types

### `document_summary` (string)
- **For relevant medical documents**: 300-1000 word comprehensive summary including:
  - Patient demographics and dates
  - ALL diagnoses with severity levels
  - ALL test results with specific values and scores
  - Clinical examination findings
  - Functional limitations and work restrictions
  - Current medications with dosages
  - Treatment plan and prognosis
  - Provider credentials

- **For irrelevant documents**: 2-4 word description (e.g., "Billing receipt")

### `key_points` (array of strings)
Extracts and lists every important medical fact:
- Each diagnosis (e.g., "Major Depressive Disorder, Severe")
- Each test result with values (e.g., "MRI shows L4-L5 disc herniation")
- Each medication with dosage (e.g., "Sertraline 100mg daily")
- Functional limitations (e.g., "Unable to sit longer than 30 minutes")
- Work restrictions (e.g., "No lifting over 10 lbs")
- Clinical findings (e.g., "Patient presents with tremor")

For relevant documents: 5-15 items minimum
For irrelevant documents: empty array

### `structured_data` (object)
Organizes medical information for structured processing:
- `diagnoses`: Array of diagnoses with severity/type
- `test_results`: Array of test results with specific values
- `medications`: Array with medication name and dosage
- `functional_limitations`: Work-related limitations
- `work_restrictions`: Explicit work restrictions from provider
- `provider_info`: Provider name, credentials, specialty

## Usage Examples

### Example 1: Valid Medical Document
```python
from app.dashboard_document_summarizer import summarize_dashboard_document

ocr_text = """
PSYCHOLOGICAL EVALUATION REPORT
Patient: Jane Smith
Date: December 15, 2024
Evaluator: Dr. Michael Chen, Ph.D., Clinical Psychologist

DIAGNOSIS: Major Depressive Disorder, Moderate Severity

TEST RESULTS:
- Beck Depression Inventory: 28 (Moderate)
- WAIS-IV Processing Speed: 72 (Borderline)

MEDICATIONS:
- Sertraline 100mg daily

FUNCTIONAL LIMITATIONS:
- Unable to concentrate for more than 30 minutes
- Unable to work full-time
"""

result = summarize_dashboard_document(ocr_text, "psych_eval.pdf", "psychological_evaluation")

# Returns:
# {
#   "is_relevant": true,
#   "relevance_score": 85,
#   "document_type": "psychological_evaluation",
#   "key_points": [
#     "Major Depressive Disorder, Moderate Severity",
#     "Beck Depression Inventory: 28 (Moderate range)",
#     "WAIS-IV Processing Speed: 72 (Borderline)",
#     "Sertraline 100mg daily",
#     "Unable to concentrate longer than 30 minutes",
#     "Unable to work full-time"
#   ],
#   ...
# }
```

### Example 2: Irrelevant Document (Receipt)
```python
ocr_text = """
CLINIC RECEIPT
Date: December 20, 2024
Service: Office Visit
Amount: $150.00
"""

result = summarize_dashboard_document(ocr_text, "receipt.pdf", "billing")

# Returns:
# {
#   "is_relevant": false,
#   "relevance_score": 0,
#   "document_type": "receipt",
#   "document_summary": "Billing receipt",
#   "key_points": [],
#   "directions": ["Please upload medical documentation such as evaluation reports or test results"]
#   ...
# }
```

## Key Differences from Previous Implementation

### Old Implementation (`check_document_relevance`)
- ❌ Would return empty values on API failures
- ❌ Didn't provide comprehensive summaries for medical documents
- ❌ Limited key points extraction
- ❌ No structured data organization
- ❌ Failed silently with empty responses

### New Implementation (`summarize_dashboard_document`)
- ✅ **Explicit requirements** for medical document comprehensiveness
- ✅ **Structured extraction** of diagnoses, tests, medications, restrictions
- ✅ **Fallback handling** with heuristic analysis if API fails
- ✅ **Always returns meaningful data** even on partial failures
- ✅ **Clear validation** ensuring no empty responses for valid documents
- ✅ **Comprehensive key points** with specific values and findings
- ✅ **Detailed error messages** for debugging

## API Requirements in Prompts

The agent is explicitly instructed to:

1. **For Relevant Medical Documents**:
   - Provide 300-1000 word comprehensive summaries
   - Extract EVERY diagnosis, test result, medication, limitation
   - Include specific values, scores, and percentiles
   - Never provide generic summaries

2. **For Irrelevant Documents**:
   - Keep summaries to 2-4 words
   - Return empty key_points array
   - Provide specific guidance on what documents are needed

3. **Fallback Behavior**:
   - If API fails: Use heuristic analysis of OCR text
   - Return meaningful partial results rather than empty values
   - Include error reason in guidance field

## Testing

Run the test script to validate the agent:
```bash
python backend/test_dashboard_summarizer.py
```

Test cases include:
1. **Medical Document** - Validates comprehensive extraction
2. **Blank Document** - Validates empty/unreadable handling
3. **Receipt** - Validates irrelevant document rejection

## Integration with Dashboard

### Document Upload Flow
1. User uploads document via dashboard
2. Document extracted via OCR
3. `summarize_dashboard_document()` called
4. Results stored in case_documents metadata
5. Response returned to frontend with full analysis

### Response to Frontend
```json
{
  "status": "ok",
  "document": {...},
  "storage_url": "...",
  "summary": "comprehensive medical summary",
  "key_points": ["diagnosis", "test result", "medication", ...]
}
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for API calls
- `OPENAI_MODEL`: Model to use (default: gpt-4-turbo)

### Model Settings
- **Temperature**: 0.2 (deterministic, consistent analysis)
- **Max Tokens**: 3000 (allow comprehensive responses)
- **Response Format**: JSON with validation

## Error Handling

The agent gracefully handles errors:

1. **JSON Parsing Errors**: Falls back to heuristic analysis
2. **API Failures**: Returns heuristic summary with error notation
3. **Empty Text**: Returns blank document response
4. **Malformed Responses**: Validates and normalizes all fields

## Performance Considerations

- **Average Processing Time**: 2-5 seconds per document
- **Token Usage**: ~800-1500 tokens per analysis
- **Cost Efficiency**: Optimized prompts for minimal token usage
- **Concurrency**: Supports parallel document uploads

## Future Enhancements

1. **Batch Processing**: Support multiple documents in single request
2. **Caching**: Cache summaries for duplicate documents
3. **Custom Categories**: Allow custom medical categories
4. **Integration with Form 7801**: Link documents to form fields
5. **Multi-language Support**: Process documents in multiple languages
6. **OCR Quality Assessment**: Flag low-quality scans for re-upload

## Troubleshooting

### Issue: Empty response returned
**Solution**: Check logs for API errors, ensure OCR text is extracted properly

### Issue: Wrong document classification
**Solution**: Provide more context in document_name and document_type parameters

### Issue: Missing key points
**Solution**: Ensure document has sufficient medical detail (>100 words of medical content)

### Issue: API rate limiting
**Solution**: Implement request queuing or upgrade OpenAI plan

## Support

For issues or enhancements, refer to:
- Agent implementation: `backend/app/dashboard_document_summarizer.py`
- Integration points: `backend/app/main.py` (search for `summarize_dashboard_document`)
- Test cases: `backend/test_dashboard_summarizer.py`
