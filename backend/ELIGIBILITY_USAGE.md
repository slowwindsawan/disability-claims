# Eligibility Analysis Usage Guide

## Overview

The eligibility processor now has a **two-step analysis workflow**:

1. **Document Relevance Check** - Verifies the uploaded document is a relevant medical document
2. **Questionnaire Analysis** - Analyzes user answers against official guidelines

## Workflow

### Step 1: Check Document Relevance

After OCR extraction, first check if the document is relevant:

```python
from app.eligibility_processor import check_document_relevance

# After OCR extracts text from uploaded document
ocr_text = "... extracted text from medical document ..."

# Check relevance (default provider is 'gemini')
relevance_result = check_document_relevance(
    ocr_text=ocr_text,
    provider='gemini'  # or 'gpt'
)

# Check results
if not relevance_result['is_relevant']:
    # Show error to user
    print(f"Document Type: {relevance_result['document_type']}")
    print(f"Issue: {relevance_result['relevance_reason']}")
    print(f"Excerpt: {relevance_result['focus_excerpt']}")
    print(f"What to do:")
    for direction in relevance_result['directions']:
        print(f"  - {direction}")
    
    # Don't proceed with questionnaire analysis
    return {
        'error': 'irrelevant_document',
        'message': relevance_result['statement'],
        'directions': relevance_result['directions'],
        'focus_excerpt': relevance_result['focus_excerpt']
    }
```

**Relevance Result Structure:**
```python
{
    'is_relevant': False,  # boolean
    'relevance_score': 25,  # 0-100
    'relevance_reason': 'Document appears to be a receipt, not a medical report',
    'focus_excerpt': 'Invoice #12345\nAmount Due: $50.00...',
    'document_type': 'receipt',
    'statement': 'This document is not a medical report. Please upload medical documentation.',
    'directions': [
        'Please upload a MEDICAL DOCUMENT such as:',
        '• Discharge summary from hospital',
        '• Specialist consultation note',
        '...'
    ]
}
```

### Step 2: Analyze Questionnaire (only if document is relevant)

```python
from app.eligibility_processor import analyze_questionnaire_with_guidelines

# Load official guidelines
guidelines_text = """
# Overview
- These guidelines consolidate procedural, safety, quality...
[Your full guidelines text]
"""

# User's questionnaire answers
answers = {
    'work_related': 'yes',
    'injury_date': '2024-01-15',
    'injury_description': 'Lower back injury while lifting heavy equipment',
    'medical_treatment': 'yes',
    'physician_name': 'Dr. Smith',
    'diagnosis': 'Lumbar strain',
    'unable_to_work': 'yes',
    'work_restrictions': 'No lifting over 10 lbs',
    # ... more answers
}

# Analyze questionnaire
eligibility_result = analyze_questionnaire_with_guidelines(
    answers=answers,
    guidelines_text=guidelines_text,
    provider='gemini'  # or 'gpt'
)

# Check results
print(f"Status: {eligibility_result['eligibility_status']}")
print(f"Score: {eligibility_result['eligibility_score']}/100")
print(f"Confidence: {eligibility_result['confidence']}%")
print(f"\nReason: {eligibility_result['reason_summary']}")
print(f"\nStrengths:")
for s in eligibility_result['strengths']:
    print(f"  ✓ {s}")
print(f"\nWeaknesses:")
for w in eligibility_result['weaknesses']:
    print(f"  ✗ {w}")
print(f"\nNext Steps:")
for step in eligibility_result['required_next_steps']:
    print(f"  → {step}")
```

**Eligibility Result Structure:**
```python
{
    'eligibility_score': 75,  # 0-100
    'eligibility_status': 'likely',  # 'eligible'|'likely'|'needs_review'|'not_eligible'
    'confidence': 80,  # 0-100
    'reason_summary': 'Application shows work-related injury with medical documentation...',
    'rule_references': [
        {
            'section': 'Mandatory Requirements',
            'quote': 'Submit complete written applications...',
            'relevance': 'User has provided initial documentation'
        }
    ],
    'required_next_steps': [
        'Obtain specialist evaluation from orthopedic surgeon',
        'Submit imaging reports (MRI or X-ray) with radiologist interpretation',
        'Provide employer incident report'
    ],
    'strengths': [
        'Clear work-related incident documented',
        'Treating physician identified',
        'Timeline documented within acceptable range'
    ],
    'weaknesses': [
        'Missing objective imaging evidence',
        'No specialist consultation on file',
        'Employer documentation not provided'
    ],
    'missing_information': [
        'MRI or X-ray results',
        'Orthopedic specialist consultation',
        'Employer incident report'
    ]
}
```

## Provider Switching

Both functions support switching between Gemini and GPT:

```python
# Use Gemini (default, gemini-5-mini)
result = check_document_relevance(ocr_text, provider='gemini')

# Use OpenAI GPT (gpt-4o-mini)
result = check_document_relevance(ocr_text, provider='gpt')
```

## Environment Variables

### For Gemini:
```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_ID=gemini-5-mini  # optional, defaults to gemini-5-mini
```

### For OpenAI GPT:
```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
```

## Complete Example

```python
from app.eligibility_processor import (
    check_document_relevance,
    analyze_questionnaire_with_guidelines
)

def process_eligibility_claim(ocr_text: str, answers: dict, guidelines: str):
    """Complete eligibility analysis workflow."""
    
    # Step 1: Check document relevance
    print("Step 1: Checking document relevance...")
    doc_check = check_document_relevance(ocr_text, provider='gemini')
    
    if not doc_check['is_relevant']:
        return {
            'success': False,
            'stage': 'document_validation',
            'error': 'Document is not a relevant medical document',
            'details': doc_check
        }
    
    print(f"✓ Document verified as: {doc_check['document_type']}")
    
    # Step 2: Analyze questionnaire
    print("\nStep 2: Analyzing questionnaire against guidelines...")
    eligibility = analyze_questionnaire_with_guidelines(
        answers=answers,
        guidelines_text=guidelines,
        provider='gemini'
    )
    
    print(f"✓ Analysis complete: {eligibility['eligibility_status']}")
    
    return {
        'success': True,
        'document_check': doc_check,
        'eligibility_analysis': eligibility
    }

# Usage
result = process_eligibility_claim(
    ocr_text=my_ocr_text,
    answers=my_questionnaire_answers,
    guidelines=official_guidelines_text
)

if result['success']:
    print(f"Eligibility Status: {result['eligibility_analysis']['eligibility_status']}")
    print(f"Score: {result['eligibility_analysis']['eligibility_score']}/100")
else:
    print(f"Error: {result['error']}")
    print(f"Directions: {result['details']['directions']}")
```

## UI Integration

### Show Document Error:
```typescript
if (!documentCheck.is_relevant) {
  showError({
    title: "Invalid Document Type",
    message: documentCheck.statement,
    excerpt: documentCheck.focus_excerpt,
    directions: documentCheck.directions,
    documentType: documentCheck.document_type
  });
  // Show upload button again
  return;
}
```

### Show Eligibility Results:
```typescript
const statusColors = {
  'eligible': 'green',
  'likely': 'blue',
  'needs_review': 'yellow',
  'not_eligible': 'red'
};

showResults({
  status: eligibility.eligibility_status,
  color: statusColors[eligibility.eligibility_status],
  score: eligibility.eligibility_score,
  summary: eligibility.reason_summary,
  strengths: eligibility.strengths,
  weaknesses: eligibility.weaknesses,
  nextSteps: eligibility.required_next_steps,
  missingInfo: eligibility.missing_information
});
```
