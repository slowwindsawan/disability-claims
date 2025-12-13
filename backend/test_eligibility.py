"""
Test script for the eligibility analysis workflow.
Run this to verify document relevance check and questionnaire analysis.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.eligibility_processor import (
    check_document_relevance,
    analyze_questionnaire_with_guidelines
)

# Test data
SAMPLE_MEDICAL_DOCUMENT = """
DISCHARGE SUMMARY

Patient Name: John Doe
Date of Service: January 15, 2024
Attending Physician: Dr. Sarah Smith, MD

CHIEF COMPLAINT: Lower back pain following workplace injury

HISTORY OF PRESENT ILLNESS:
45-year-old male presents with acute lumbar strain sustained while lifting heavy equipment at work on 01/10/2024. Patient reports immediate onset of sharp pain in lower back, radiating to right leg. Unable to continue work duties.

PHYSICAL EXAMINATION:
- Limited range of motion in lumbar spine
- Tenderness at L4-L5 level
- Positive straight leg raise test on right
- Decreased sensation in right L5 dermatome

IMAGING:
MRI Lumbar Spine (01/12/2024):
- Mild disc bulge at L4-L5 with nerve root impingement
- No evidence of disc herniation
- Facet joint arthropathy noted

DIAGNOSIS:
1. Acute lumbar strain with radiculopathy
2. L4-L5 disc bulge

TREATMENT:
- Physical therapy 3x per week
- NSAIDs as directed
- Work restrictions: No lifting >10 lbs, no prolonged standing

PLAN:
- Follow up in 2 weeks
- Orthopedic specialist referral if no improvement

Dr. Sarah Smith, MD
License #12345
"""

SAMPLE_RECEIPT = """
ACME PHARMACY
Invoice #98765
Date: 01/15/2024

Items:
- Ibuprofen 200mg   $12.99
- Heating pad       $24.99

Subtotal:  $37.98
Tax:       $3.04
Total:     $41.02

Thank you for your business!
"""

SAMPLE_RANDOM_TEXT = """
Dear Customer,

Thank you for choosing our services. We appreciate your business and look forward 
to serving you again in the future.

Best regards,
Customer Service Team

Visit our website: www.example.com
Call us: 1-800-123-4567
"""

SAMPLE_QUESTIONNAIRE = {
    'work_related': 'yes',
    'injury_date': '2024-01-10',
    'injury_description': 'Lower back injury while lifting heavy equipment weighing approximately 75 lbs',
    'employer_name': 'ABC Manufacturing',
    'job_title': 'Warehouse Worker',
    'medical_treatment': 'yes',
    'physician_name': 'Dr. Sarah Smith',
    'facility_name': 'City General Hospital',
    'diagnosis': 'Acute lumbar strain with radiculopathy, L4-L5 disc bulge',
    'unable_to_work': 'yes',
    'days_off_work': '14',
    'work_restrictions': 'No lifting over 10 lbs, no prolonged standing',
    'imaging_done': 'yes',
    'imaging_type': 'MRI',
    'specialist_seen': 'pending',
    'previous_injuries': 'no'
}

GUIDELINES_TEXT = """
# Overview
- These guidelines consolidate procedural, safety, quality, testing, approval and impairment‑rating rules across operational, manufacturing, procurement, change‑control and medical assessment domains.

# Key Principles
- Always use written, complete documentation before action (no verbal or incomplete submissions).
- Use objective evidence (measurements, calibrated instruments, pathology, imaging, lab tests) to support decisions, ratings and corrective actions.

# Mandatory Requirements (Must-Do)
- Submit complete written applications/plans and safety/rescue documentation before any work or procurement commences.
- For clinical decisions: document objective evidence (tests, imaging, pathology), obtain specialist reports when required, and retain full medical dossiers for adjudication.

# Clinical Evaluation & Impairment Rating (medical claims):
- Step 1: Collect full medical dossier and objective evidence (imaging, lab, pathology, PFTs, ECG/ECHO, EMG/NCS, visual fields, audiometry as relevant).
- Step 2: Specialist evaluates, applies condition‑specific severity bands/percentage tables and documents tests and rationale.
- Step 3: Committee reviews; may request additional tests or expert opinion; finalize rating and record decision and appeals info.
"""


def test_medical_document():
    print("=" * 80)
    print("TEST 1: Valid Medical Document")
    print("=" * 80)
    
    result = check_document_relevance(SAMPLE_MEDICAL_DOCUMENT, provider='gemini')
    
    print(f"\nIs Relevant: {result['is_relevant']}")
    print(f"Relevance Score: {result['relevance_score']}/100")
    print(f"Document Type: {result['document_type']}")
    print(f"Reason: {result['relevance_reason']}")
    print(f"Statement: {result['statement']}")
    print(f"\nFocus Excerpt:\n{result['focus_excerpt'][:200]}...")
    
    if result['directions']:
        print(f"\nDirections:")
        for d in result['directions']:
            print(f"  • {d}")
    
    return result['is_relevant']


def test_receipt_document():
    print("\n" + "=" * 80)
    print("TEST 2: Invalid Document (Receipt)")
    print("=" * 80)
    
    result = check_document_relevance(SAMPLE_RECEIPT, provider='gemini')
    
    print(f"\nIs Relevant: {result['is_relevant']}")
    print(f"Relevance Score: {result['relevance_score']}/100")
    print(f"Document Type: {result['document_type']}")
    print(f"Reason: {result['relevance_reason']}")
    print(f"Statement: {result['statement']}")
    print(f"\nDocument Summary:\n{result.get('document_summary', 'N/A')}")
    print(f"\nFocus Excerpt:\n{result['focus_excerpt']}")
    
    if result['directions']:
        print(f"\nDirections:")
        for d in result['directions']:
            print(f"  • {d}")
    
    return result['is_relevant']


def test_random_text():
    print("\n" + "=" * 80)
    print("TEST 3: Non-Medical Random Text")
    print("=" * 80)
    
    result = check_document_relevance(SAMPLE_RANDOM_TEXT, provider='gemini')
    
    print(f"\nIs Relevant: {result['is_relevant']}")
    print(f"Relevance Score: {result['relevance_score']}/100")
    print(f"Document Type: {result['document_type']}")
    print(f"Reason: {result['relevance_reason']}")
    print(f"Statement: {result['statement']}")
    
    if result['directions']:
        print(f"\nDirections:")
        for d in result['directions']:
            print(f"  • {d}")
    
    return result['is_relevant']


def test_questionnaire_analysis(document_summary=None):
    print("\n" + "=" * 80)
    print("TEST 4: Questionnaire Analysis with Document Context")
    print("=" * 80)
    
    if document_summary:
        print(f"\n[Using document summary from validated medical document]")
    
    result = analyze_questionnaire_with_guidelines(
        answers=SAMPLE_QUESTIONNAIRE,
        guidelines_text=GUIDELINES_TEXT,
        provider='gemini',
        document_summary=document_summary
    )
    
    print(f"\nEligibility Status: {result['eligibility_status']}")
    print(f"Eligibility Score: {result['eligibility_score']}/100")
    print(f"Confidence: {result['confidence']}%")
    print(f"\nReason: {result['reason_summary']}")
    
    if result['strengths']:
        print(f"\n✓ Strengths:")
        for s in result['strengths']:
            print(f"  • {s}")
    
    if result['weaknesses']:
        print(f"\n✗ Weaknesses:")
        for w in result['weaknesses']:
            print(f"  • {w}")
    
    if result['required_next_steps']:
        print(f"\n→ Required Next Steps:")
        for step in result['required_next_steps']:
            print(f"  • {step}")
    
    if result['missing_information']:
        print(f"\n? Missing Information:")
        for info in result['missing_information']:
            print(f"  • {info}")
    
    if result['rule_references']:
        print(f"\n📋 Rule References:")
        for ref in result['rule_references'][:3]:  # Show first 3
            print(f"  Section: {ref.get('section', 'N/A')}")
            print(f"  Quote: {ref.get('quote', 'N/A')[:100]}...")
            print(f"  Relevance: {ref.get('relevance', 'N/A')}")
            print()


def main():
    print("\n" + "=" * 80)
    print("ELIGIBILITY PROCESSOR TEST SUITE - STRICT VALIDATION")
    print("=" * 80)
    print("\nTesting lawyer-focused document validation with strict medical evidence requirements")
    
    try:
        # Test 1: Valid medical document
        print("\n[TEST 1: Valid Medical Document - Should ACCEPT]")
        medical_result = check_document_relevance(SAMPLE_MEDICAL_DOCUMENT, provider='gemini')
        is_medical = medical_result['is_relevant']
        medical_summary = medical_result.get('document_summary', '')
        
        # Test 2: Invalid document (receipt)
        print("\n[TEST 2: Pharmacy Receipt - Should REJECT]")
        is_receipt = test_receipt_document()
        
        # Test 3: Random non-medical text
        print("\n[TEST 3: Random Text - Should REJECT]")
        is_random = test_random_text()
        
        # Test 4: Questionnaire analysis with document context
        if is_medical and medical_summary:
            test_questionnaire_analysis(document_summary=medical_summary)
        else:
            print("\n⚠ Skipping questionnaire analysis (medical document test failed)")
        
        print("\n" + "=" * 80)
        print("TEST RESULTS SUMMARY")
        print("=" * 80)
        print(f"\n✓ PASS = Correctly identified | ✗ FAIL = Incorrectly identified\n")
        print(f"  Medical Document Accepted: {'✓ PASS' if is_medical else '✗ FAIL (should accept)'}")
        print(f"  Receipt Rejected: {'✓ PASS' if not is_receipt else '✗ FAIL (should reject)'}")
        print(f"  Random Text Rejected: {'✓ PASS' if not is_random else '✗ FAIL (should reject)'}")
        
        all_pass = is_medical and not is_receipt and not is_random
        print(f"\n{'='*80}")
        print(f"OVERALL: {'✓ ALL TESTS PASSED' if all_pass else '✗ SOME TESTS FAILED'}")
        print(f"{'='*80}")
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    # Check environment
    if not os.getenv('GEMINI_API_KEY') and not os.getenv('OPENAI_API_KEY'):
        print("⚠ WARNING: No API keys found in environment.")
        print("Please set GEMINI_API_KEY or OPENAI_API_KEY in your .env file")
        print("\nFor testing purposes, you can run with mock data or set keys now:")
        print("  export GEMINI_API_KEY=your_key  (or add to backend/.env)")
        sys.exit(1)
    
    main()
