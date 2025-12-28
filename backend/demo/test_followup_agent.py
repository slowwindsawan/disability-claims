"""
Test script for Follow-up Question Agent
Tests the agent's ability to analyze conversation and document summaries
to identify ambiguities and generate follow-up questions.
"""
import asyncio
import sys
import os
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.followup_agent import analyze_for_followup
from app.supabase_client import get_case
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Sample test data
SAMPLE_CALL_SUMMARY = """
Patient Interview Summary:
- Name: John Doe
- Age: 42
- Occupation: Construction Worker (unable to work for past 6 months)
- Chief Complaint: Chronic lower back pain and depression

Medical History:
- Patient reports severe lower back pain that started after lifting heavy materials at work
- Pain radiates down left leg
- Reports difficulty sleeping, loss of appetite, and feeling depressed
- Has seen a doctor but unable to provide exact diagnosis details
- Currently taking "some pain medication" but doesn't remember the name

Functional Impact:
- Cannot stand for more than 20 minutes
- Unable to lift anything over 10 pounds
- Difficulty concentrating on tasks
- Has missed work entirely for 6 months

Patient mentions seeing a specialist but cannot recall the type or findings.
"""

SAMPLE_DOCUMENT_SUMMARIES = [
    {
        "file_name": "physician_note.pdf",
        "document_type": "medical_report",
        "is_relevant": True,
        "added_at": "2025-12-13T10:00:00",
        "summary": """Primary care physician note dated November 2025. Patient presents with complaints of lower back pain. Physical examination shows limited range of motion in lumbar spine. Patient reports pain level 7/10. Prescribed ibuprofen 600mg and recommended physical therapy. Note mentions patient should follow up with orthopedic specialist but no specialist report included.""",
        "key_points": [
            "Lower back pain, chronic",
            "Limited range of motion in lumbar spine",
            "Pain level 7/10",
            "Prescribed ibuprofen 600mg",
            "Recommended physical therapy",
            "Recommended orthopedic consultation"
        ]
    },
    {
        "file_name": "psych_eval_partial.pdf",
        "document_type": "psychological_evaluation",
        "is_relevant": True,
        "added_at": "2025-12-13T10:15:00",
        "summary": """Partial psychological evaluation report from November 2025. Patient reports symptoms consistent with depression including low mood, loss of interest in activities, sleep disturbance, and difficulty concentrating. However, the document appears incomplete - missing formal diagnosis, test results, and treatment recommendations. Evaluation appears to be initial intake only.""",
        "key_points": [
            "Symptoms of depression reported",
            "Low mood and loss of interest",
            "Sleep disturbance",
            "Difficulty concentrating",
            "Document incomplete - no formal diagnosis",
            "No standardized test results included"
        ]
    }
]


async def test_followup_agent():
    """Fetch a real case from the DB and run follow-up analysis."""
    CASE_ID = "1f08bbd3-95da-49d4-8261-d0e9f505037b"

    print("\n" + "="*80)
    print(f"ANALYZING CASE {CASE_ID} FOR FOLLOW-UP QUESTIONS")
    print("="*80 + "\n")

    try:
        # Fetch case from DB
        print(f"Fetching case {CASE_ID} from Supabase...")
        case_list = get_case(CASE_ID)
        if not case_list:
            print(f"ERROR: case {CASE_ID} not found in DB")
            return None

        case = case_list[0]
        print(f"✓ Case found! Keys: {list(case.keys())}")

        # Extract metadata / call summary
        metadata = case.get('metadata', {})
        print(f"Raw metadata type: {type(metadata)}")
        
        if isinstance(metadata, str) and metadata:
            try:
                import json
                metadata = json.loads(metadata)
                print(f"✓ Parsed metadata JSON, keys: {list(metadata.keys()) if isinstance(metadata, dict) else 'not a dict'}")
            except Exception as e:
                print(f"⚠ Failed to parse metadata: {e}")
                # leave as raw string
                pass

        # Prefer `call_summary` but fall back to `call_details` if present
        call_summary = ''
        if isinstance(metadata, dict):
            call_summary = metadata.get('call_summary') or metadata.get('call_details') or ''
            print(f"Extracted call_summary from metadata (length: {len(str(call_summary))})")
            if call_summary and isinstance(call_summary, dict):
                print(f"  call_summary is a dict with keys: {list(call_summary.keys())}")
        elif isinstance(metadata, str):
            call_summary = metadata
            print(f"Using raw metadata string as call_summary")

        # Document summaries may be stored on the case row
        document_summaries = case.get('document_summaries', [])
        print(f"Raw document_summaries type: {type(document_summaries)}")
        
        if isinstance(document_summaries, str):
            try:
                import json
                document_summaries = json.loads(document_summaries)
                print(f"✓ Parsed document_summaries JSON")
            except Exception as e:
                print(f"⚠ Failed to parse document_summaries: {e}")
                document_summaries = []
        
        if not isinstance(document_summaries, list):
            document_summaries = []

        if not call_summary:
            print('⚠ WARNING: No call summary found in case metadata')
        
        print(f"\n📊 SUMMARY:")
        print(f"  - Document summaries: {len(document_summaries)}")
        print(f"  - Call summary length: {len(str(call_summary))} chars")
        if document_summaries:
            print(f"  - First doc: {document_summaries[0].get('file_name', 'unknown') if isinstance(document_summaries[0], dict) else 'invalid format'}")
        print()

        # Run follow-up analysis
        result = await analyze_for_followup(
            call_summary=str(call_summary),
            document_summaries=document_summaries,
            case_id=CASE_ID,
            provider='gpt'
        )

        print("\n" + "="*80)
        print("FOLLOW-UP ANALYSIS RESULTS")
        print("="*80 + "\n")

        has_followup = len(result.followup_questions) > 0
        print(f"Has Follow-up Questions: {has_followup}")

        if result.followup_questions:
            print(f"\nFollow-up Questions ({len(result.followup_questions)}):")
            for idx, question in enumerate(result.followup_questions, 1):
                print(f"  {idx}. {question}")
        else:
            print("\n✓ No follow-up questions needed - case appears complete!")

        print("\n" + "="*80 + "\n")

        return result

    except Exception:
        logger.exception("Failed to fetch case or run follow-up analysis")
        raise


async def test_complete_case():
    """Test with a complete case that should not require follow-up"""
    print("\n" + "="*80)
    print("TESTING WITH COMPLETE CASE (Should have no follow-up)")
    print("="*80 + "\n")
    
    complete_call_summary = """
Patient Interview Summary:
- Name: Jane Smith
- Age: 35
- Occupation: Office Manager
- Diagnosis: Major Depressive Disorder, Severe, Recurrent (confirmed by psychiatrist)

Medical History:
- Diagnosed with MDD in 2023 by board-certified psychiatrist Dr. Johnson
- Multiple hospitalizations for severe depression
- Failed multiple medication trials
- Currently on Lexapro 20mg daily and Wellbutrin 300mg XL
- In weekly therapy with licensed psychologist

Functional Impact:
- Unable to work full-time - reduced to 20 hours/week
- Difficulty concentrating for extended periods
- Psychiatrist has documented work restrictions: no more than 4 hours per day
- Regular panic attacks interfere with job duties
- Formal accommodations requested and denied by employer
"""
    
    complete_documents = [
        {
            "file_name": "psychiatrist_report.pdf",
            "document_type": "psychiatric_assessment",
            "is_relevant": True,
            "summary": """Comprehensive psychiatric evaluation by Dr. Sarah Johnson, MD, Board Certified Psychiatrist, dated December 2025. DIAGNOSIS: Major Depressive Disorder, Severe, Recurrent (DSM-5 296.33). Beck Depression Inventory score: 38 (severe range). Patient has failed 3 antidepressant trials. Currently prescribed Lexapro 20mg daily and Wellbutrin 300mg XL. Patient exhibits significant functional impairment with inability to concentrate more than 2-3 hours consecutively. Work restriction documented: Maximum 4 hours work per day with frequent breaks. Prognosis: guarded, requires ongoing treatment. Patient is compliant with medication and therapy.""",
            "key_points": [
                "Diagnosis: Major Depressive Disorder, Severe, Recurrent (DSM-5 296.33)",
                "Beck Depression Inventory: 38 (severe range)",
                "Failed 3 antidepressant medication trials",
                "Current medications: Lexapro 20mg, Wellbutrin 300mg XL",
                "Work restriction: Maximum 4 hours per day",
                "Cannot concentrate more than 2-3 hours consecutively",
                "Board certified psychiatrist evaluation",
                "Prognosis: Guarded",
                "Patient compliant with treatment"
            ]
        },
        {
            "file_name": "therapy_summary.pdf",
            "document_type": "psychological_evaluation",
            "is_relevant": True,
            "summary": """Psychological treatment summary by Dr. Robert Chen, Licensed Clinical Psychologist. Patient has been in weekly cognitive behavioral therapy since January 2024. Current Global Assessment of Functioning (GAF) score: 45 (serious symptoms). Patient demonstrates persistent depressed mood, anhedonia, and cognitive impairment affecting occupational functioning. Treatment progress has been limited despite regular attendance. Patient requires ongoing intensive mental health treatment.""",
            "key_points": [
                "Weekly CBT since January 2024",
                "GAF score: 45 (serious symptoms)",
                "Persistent depressed mood and anhedonia",
                "Cognitive impairment documented",
                "Limited progress despite treatment compliance",
                "Licensed Clinical Psychologist evaluation"
            ]
        }
    ]
    
    try:
        result = await analyze_for_followup(
            call_summary=complete_call_summary,
            document_summaries=complete_documents,
            case_id="test_complete_case",
            provider='gpt'
        )
        
        print("\n" + "="*80)
        print("RESULTS FOR COMPLETE CASE")
        print("="*80 + "\n")
        
        has_followup = len(result.followup_questions) > 0
        print(f"Has Follow-up Questions: {has_followup}")
        
        if result.followup_questions:
            print(f"\n⚠ Unexpected Follow-up Questions Found:")
            for idx, question in enumerate(result.followup_questions, 1):
                print(f"  {idx}. {question}")
        else:
            print("\n✓ Correctly identified as complete - no follow-up needed!")
        
        print("\n" + "="*80 + "\n")
        
    except Exception as e:
        logger.exception("Test failed with error")
        raise


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("FOLLOW-UP AGENT TEST SUITE")
    print("="*80)
    
    # Run only the DB-backed follow-up analysis test
    print("\n### RUNNING DB-BACKED FOLLOW-UP ANALYSIS ###")
    await test_followup_agent()
    
    print("\n" + "="*80)
    print("RUN COMPLETED")
    print("="*80 + "\n")


if __name__ == "__main__":
    # Check for required environment variables
    if not os.getenv('OPENAI_API_KEY'):
        print("ERROR: OPENAI_API_KEY environment variable not set")
        print("Please set it in your .env file or environment")
        sys.exit(1)
    
    asyncio.run(main())
