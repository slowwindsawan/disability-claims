"""
Test script for the dashboard document summarizer agent.
"""
import sys
import os
from pathlib import Path

# Add the backend app to path
backend_path = Path(__file__).parent.parent / "app"
sys.path.insert(0, str(backend_path.parent))

from dotenv import load_dotenv
load_dotenv()

from app.dashboard_document_summarizer import summarize_dashboard_document


def test_medical_document():
    """Test with a sample medical document OCR text."""
    medical_text = """
    CLINICAL EVALUATION REPORT
    
    Patient Name: John Doe
    Date of Evaluation: December 15, 2024
    Evaluator: Dr. Sarah Johnson, Ph.D., Licensed Clinical Psychologist
    
    CHIEF COMPLAINT:
    Patient reports persistent difficulty with concentration, memory, and completing work tasks.
    
    DIAGNOSTIC IMPRESSION:
    1. Major Depressive Disorder, Moderate Severity, Recurrent
    2. Generalized Anxiety Disorder
    3. Cognitive Impairment, Moderate
    
    PSYCHOLOGICAL TESTING RESULTS:
    - Beck Depression Inventory-II (BDI-II): Score 28 (Moderate Depression)
    - Beck Anxiety Inventory (BAI): Score 24 (Moderate Anxiety)
    - WAIS-IV Cognitive Assessment:
      * Verbal Comprehension Index: 88 (Low Average)
      * Processing Speed Index: 72 (Borderline)
      * Working Memory Index: 81 (Low Average)
    
    CLINICAL OBSERVATIONS:
    Patient presents with psychomotor retardation, reduced affect, and difficulty maintaining attention during interview. 
    Speech is slow and deliberate. Patient reports inability to concentrate for more than 20-30 minutes.
    
    FUNCTIONAL IMPAIRMENTS:
    1. Unable to work full-time (maximum 4 hours per day)
    2. Unable to handle complex tasks or make decisions
    3. Unable to sit at desk for extended periods (30 minutes maximum)
    4. Significant difficulty with memory and recall
    5. Unable to manage multiple tasks simultaneously
    
    CURRENT MEDICATIONS:
    - Sertraline (Zoloft) 100mg daily
    - Lorazepam 0.5mg twice daily as needed
    - Melatonin 5mg at bedtime
    
    TREATMENT PLAN:
    Biweekly psychotherapy sessions recommended. Consider medication adjustment if symptoms persist.
    
    RECOMMENDATIONS:
    Patient is unable to maintain consistent full-time employment due to cognitive and emotional limitations.
    Recommend vocational rehabilitation assessment and consideration of disability benefits.
    
    PROGNOSIS:
    Guarded. Patient's conditions are chronic and have not responded well to standard interventions.
    """
    
    print("=" * 80)
    print("TEST 1: MEDICAL DOCUMENT")
    print("=" * 80)
    
    result = summarize_dashboard_document(
        medical_text,
        document_name="Clinical_Evaluation_Report.pdf",
        document_type="psychological_evaluation"
    )
    
    print("\n✓ RESULT:")
    print(f"  is_relevant: {result['is_relevant']}")
    print(f"  relevance_score: {result['relevance_score']}")
    print(f"  document_type: {result['document_type']}")
    print(f"  summary length: {len(result['document_summary'])} chars")
    print(f"  key_points count: {len(result['key_points'])}")
    print(f"\n📋 SUMMARY:\n{result['document_summary'][:500]}...")
    print(f"\n🔑 KEY POINTS:")
    for i, kp in enumerate(result['key_points'][:5], 1):
        print(f"  {i}. {kp}")
    
    return result


def test_blank_document():
    """Test with a blank document."""
    blank_text = ""
    
    print("\n" + "=" * 80)
    print("TEST 2: BLANK DOCUMENT")
    print("=" * 80)
    
    result = summarize_dashboard_document(
        blank_text,
        document_name="blank.pdf",
        document_type="general"
    )
    
    print(f"  is_relevant: {result['is_relevant']}")
    print(f"  relevance_score: {result['relevance_score']}")
    print(f"  document_summary: {result['document_summary']}")
    print(f"  key_points: {result['key_points']}")
    
    return result


def test_receipt_document():
    """Test with a receipt (irrelevant document)."""
    receipt_text = """
    MEDICAL CLINIC RECEIPT
    
    Date: December 20, 2024
    Receipt #: RC-2024-12345
    
    Service: Office Visit
    Amount: $150.00
    
    Payment Method: Cash
    
    Thank you for your visit.
    """
    
    print("\n" + "=" * 80)
    print("TEST 3: RECEIPT (IRRELEVANT)")
    print("=" * 80)
    
    result = summarize_dashboard_document(
        receipt_text,
        document_name="Receipt_2024.pdf",
        document_type="billing"
    )
    
    print(f"  is_relevant: {result['is_relevant']}")
    print(f"  relevance_score: {result['relevance_score']}")
    print(f"  document_type: {result['document_type']}")
    print(f"  summary: {result['document_summary']}")
    print(f"  key_points: {result['key_points']}")
    
    return result


if __name__ == "__main__":
    try:
        print("\n🚀 TESTING DASHBOARD DOCUMENT SUMMARIZER AGENT\n")
        
        # Test 1: Medical document
        result1 = test_medical_document()
        
        # Test 2: Blank document
        result2 = test_blank_document()
        
        # Test 3: Receipt
        result3 = test_receipt_document()
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS COMPLETED")
        print("=" * 80)
        
        # Summary
        print("\n📊 SUMMARY:")
        print(f"  Test 1 (Medical): relevant={result1['is_relevant']}, score={result1['relevance_score']}")
        print(f"  Test 2 (Blank): relevant={result2['is_relevant']}, score={result2['relevance_score']}")
        print(f"  Test 3 (Receipt): relevant={result3['is_relevant']}, score={result3['relevance_score']}")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
