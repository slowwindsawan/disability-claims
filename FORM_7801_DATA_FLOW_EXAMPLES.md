# Form 7801 Agent Data Flow & Examples

## Data Structure Examples

### 1. Call Summary Structure (from cases table)

This is what gets extracted from `cases.call_summary`:

```json
{
  "case_summary": "The claimant reported a small fracture in the left leg with potential mobility limitations affecting work capacity. Additional conditions not fully established.",
  "call_summary": "Voice interview conducted to assess disability claim. Claimant has documented leg fracture with unclear functional limitations.",
  "documents_requested_list": [
    {
      "name": "Medical Evaluation Report",
      "reason": "Establish baseline diagnosis and disability percentage",
      "source": "treating physician",
      "status": "pending",
      "file_url": "https://...",
      "required": true,
      "uploaded": true,
      "document_id": "3faed1aa-93c7-48bd-ba6e-d818433cec9b",
      "requested_at": "2025-12-24T15:35:11.615803"
    },
    {
      "name": "Employment Records",
      "reason": "Verify work loss and income impact",
      "source": "employee",
      "status": "pending",
      "file_url": "https://...",
      "required": true,
      "uploaded": true,
      "document_id": "5b3e2f19-c4d8-4e2a-9c7f-1a8b2d3f4e5a",
      "requested_at": "2025-12-24T16:10:22.123456"
    }
  ],
  "estimated_claim_amount": 32000,
  "risk_assessment": "Needs More Info",
  "degree_funding": 0,
  "living_expenses": 0,
  "monthly_allowance": 0,
  "income_tax_exemption": false,
  "key_legal_points": [
    "Establishing exact date of first diagnosis is critical for retroactive benefits",
    "Medical evidence must demonstrate functional impairment impacting work ability",
    "Additional conditions should be explored to reach minimum 20% disability threshold"
  ]
}
```

### 2. Document Metadata Structure (from case_documents table)

For each document in `documents_requested_list`, we fetch from `case_documents` table:

```json
{
  "id": "3faed1aa-93c7-48bd-ba6e-d818433cec9b",
  "case_id": "17e972e5-09b6-4b8b-afb4-3959e4e82eea",
  "file_name": "medical_evaluation_20251224.pdf",
  "file_path": "case-documents/cases/17e972e5-09b6-4b8b-afb4-3959e4e82eea/documents/medical_eval.pdf",
  "file_url": "https://lfcjfpthgaqrvutfvikx.supabase.co/storage/v1/...",
  "metadata": {
    "key_points": [
      "Diagnosed with learning disabilities and ADHD",
      "Phonological processing score: -4.439 (severe impairment)",
      "Reading comprehension score: -2.842 (below average)",
      "Writing speed significantly below average with spelling errors",
      "Attention difficulties with high distractibility",
      "History of learning difficulties since childhood",
      "Recommendations for extended time and accommodations",
      "Evaluation by specialist Hila Yadgar on October 23, 2022"
    ],
    "is_relevant": true,
    "document_type": "psychological_evaluation",
    "document_summary": "This document is a comprehensive evaluation report detailing the claimant's learning disabilities and attention issues. Conducted on October 23, 2022 by a specialist in learning disabilities at Ariel University. The evaluation demonstrates significant cognitive and academic performance impairments, particularly in reading, writing, and attention. Test results show severe phonological processing issues (-4.439), below-average reading comprehension (-2.842), and writing speed significantly below normal parameters. The claimant has documented ADHD diagnosis with history of learning difficulties since childhood. Recommendations include extended time on academic assessments and assistance with reading and writing tasks. This document is critical evidence for disability claim, establishing functional impairments in educational and work settings.",
    "upload_source": "manual_upload",
    "extraction_method": "google_vision_api"
  },
  "uploaded_at": "2025-12-24T15:45:32.123456",
  "created_at": "2025-12-24T15:45:32.123456"
}
```

### 3. Concatenated Context Sent to Agent

The backend concatenates all data into a single text context:

```
CALL SUMMARY DATA:
- Case Summary: The claimant reported a small fracture in the left leg with potential mobility limitations affecting work capacity. Additional conditions not fully established.
- Estimated Claim Amount: 32000
- Risk Assessment: Needs More Info
- Key Legal Points: [
  "Establishing exact date of first diagnosis is critical for retroactive benefits",
  "Medical evidence must demonstrate functional impairment impacting work ability",
  "Additional conditions should be explored to reach minimum 20% disability threshold"
]

UPLOADED MEDICAL DOCUMENTS:
📄 medical_evaluation_20251224.pdf (Relevant: true):
This document is a comprehensive evaluation report detailing the claimant's learning disabilities and attention issues. Conducted on October 23, 2022 by a specialist in learning disabilities at Ariel University. The evaluation demonstrates significant cognitive and academic performance impairments, particularly in reading, writing, and attention. Test results show severe phonological processing issues (-4.439), below-average reading comprehension (-2.842), and writing speed significantly below normal parameters. The claimant has documented ADHD diagnosis with history of learning difficulties since childhood. Recommendations include extended time on academic assessments and assistance with reading and writing tasks. This document is critical evidence for disability claim, establishing functional impairments in educational and work settings.

Key Points:
- Diagnosed with learning disabilities and ADHD
- Phonological processing score: -4.439 (severe impairment)
- Reading comprehension score: -2.842 (below average)
- Writing speed significantly below average with spelling errors
- Attention difficulties with high distractibility
- History of learning difficulties since childhood
- Recommendations for extended time and accommodations
- Evaluation by specialist Hila Yadgar on October 23, 2022

---

📄 employment_records_20251224.pdf (Relevant: true):
[Employment document summary...]

Key Points:
- Employment terminated due to inability to work
- Last employment: Software Developer, 2020-2023
- [More key points...]
```

## Agent Processing

### Input to Agent

**Model:** GPT-4o-mini
**Temperature:** 0.3 (deterministic)
**Tools:** File search (for BTL guidelines access)

**System Prompt:**
```
You are an expert Israeli disability claims attorney specializing in BTL 
(Bituach Leumi) claims and Form 7801 analysis.

TASK: Analyze the provided medical documents and extract data to generate 
a comprehensive Form 7801 disability claim form.

You MUST return a complete JSON response matching the exact structure...
[full schema shown]

ANALYSIS GUIDELINES:
1. Disability Classification - identify types and score percentages
2. Retroactivity Period - determine eligible back-pay period (up to 12 months)
3. Disability Percentage - calculate total score (>20% required)
4. IEL Assessment - Impairment of Earning Capacity (50-100% required)
5. Documentation Status - identify missing required documents
6. Legal Strategy - develop comprehensive claim strategy with BTL references
```

### Agent Output

The agent returns a structured response:

```json
{
  "form_7801": {
    "form_version": "1.0",
    "submission_date": "2025-12-27",
    "form_status": "draft",
    "personal_info": {
      "id_number": "123456789",
      "full_name": "יוסי כהן",
      "date_of_birth": "1975-03-15",
      "gender": "זכר",
      "marital_status": "married",
      "number_of_children": 2,
      "address": "רחוב דרך הים 42",
      "city": "תל אביב",
      "postal_code": "69000",
      "phone": "054-1234567",
      "email": "yosi@example.com",
      "section_confirmed": false
    },
    "employment_history": {
      "employment_records": [
        {
          "employer_name": "Tech Company Ltd",
          "start_date": "2015-01-15",
          "end_date": "2023-06-30",
          "monthly_salary_gross": 12000,
          "position_title": "Software Developer",
          "employment_type": "full_time"
        }
      ],
      "total_employment_months": 102,
      "section_confirmed": false
    },
    "disability_info": {
      "disability_types": {
        "chronic_pain": true,
        "limited_mobility": true,
        "anxiety": true,
        "depression": false,
        "neurological_disorder": true,
        "back_problems": true,
        "joint_problems": true,
        // ... other types as false
      },
      "disability_start_date": "2023-06-15",
      "primary_disability_description": "Multiple musculoskeletal injuries with chronic pain syndrome affecting functional capacity and preventing return to software development work. Associated anxiety from chronic condition.",
      "treating_physicians": [
        {
          "physician_id": "1",
          "name": "Dr. Moshe Cohen",
          "specialty": "Orthopedics",
          "clinic_name": "Tel Aviv Medical Center",
          "clinic_type": "public",
          "phone": "03-6974111",
          "last_visit_date": "2025-12-20"
        }
      ],
      "hospitalizations": [
        {
          "hospitalization_id": "1",
          "hospital_name": "Ichilov Hospital",
          "department": "Orthopedic Surgery",
          "admission_date": "2023-06-15",
          "discharge_date": "2023-06-22",
          "reason_for_admission": "Acute leg fracture repair",
          "length_of_stay_days": 7
        }
      ],
      "section_confirmed": false
    },
    "bank_details": {
      "bank_name": "Bank Hapoalim",
      "branch_number": "12345",
      "account_number": "123456789",
      "account_holder_name": "יוסי כהן",
      "account_type": "checking",
      "section_confirmed": false
    },
    "medical_waiver": {
      "waiver_accepted": false,
      "waiver_date": "",
      "waiver_version": "1.0",
      "section_confirmed": false
    },
    "metadata": {
      "all_sections_confirmed": false,
      "completion_percentage": 85,
      "created_at": "2025-12-27T15:30:45Z",
      "updated_at": "2025-12-27T15:30:45Z",
      "submitted_at": "",
      "case_id": "17e972e5-09b6-4b8b-afb4-3959e4e82eea",
      "user_id": "user-123",
      "language": "hebrew",
      "document_extraction_confidence": 0.92
    }
  },
  "summary": "Claimant is a 50-year-old Israeli male with documented musculoskeletal injuries resulting from an acute leg fracture in June 2023. Medical evaluation confirms significant functional limitations affecting mobility and work capacity. Claimant was employed as a software developer earning ₪12,000/month until forced to resign due to disability in June 2023. Current functional limitations prevent return to desk work due to mobility restrictions and chronic pain. Medical documentation supports claim for disability benefits with strong evidence of functional impairment impacting earning capacity.",
  "strategy": "RECOMMENDED LEGAL STRATEGY:\n\n1. RETROACTIVITY CLAIM (June 2023 - Present)\n- Establish June 15, 2023 as disability onset date based on hospitalization records\n- Claim 30 months of retroactive benefits (maximum allowed by BTL law)\n- Supporting evidence: Medical discharge summary, employment termination letter\n\n2. DISABILITY ASSESSMENT\n- Primary disability: Musculoskeletal impairment (estimated 35% disability)\n- Secondary conditions: Chronic pain syndrome (15%), Anxiety disorder (10%)\n- Total disability percentage: 45% (exceeds 20% BTL threshold)\n\n3. IEL (Impairment of Earning Capacity) Assessment\n- Functional limitations: Unable to sit/stand for prolonged periods, limited manual dexterity\n- Work activities affected: Computer work, physical labor, prolonged standing\n- Previous occupation: Software developer - incompatible with current functional capacity\n- IEL assessment: 75% (within 50-100% range for claim approval)\n\n4. REQUIRED DOCUMENTATION\n- Updated medical evaluation (obtained 2025-12-20) ✓\n- Employment termination letter (need to obtain)\n- Physician's statement on functional limitations (need to request)\n- Hospital discharge summary (available from Ichilov Hospital)\n\n5. NEXT STEPS\n1. Obtain employment termination letter from Tech Company Ltd\n2. Request formal disability assessment from Dr. Moshe Cohen\n3. File Form 7801 with BTL within 60 days\n4. Prepare medical committee presentation\n5. Document all healthcare costs for reimbursement claim",
  "claim_rate": 78.5,
  "recommendations": [
    "Obtain employer confirmation of employment termination due to medical reasons",
    "Request comprehensive functional capacity evaluation from treating physician",
    "Document all ongoing medical treatment and expenses for cost reimbursement",
    "Prepare written statement detailing impact of disability on daily living activities",
    "Gather witness statements from employer regarding functional limitations at work",
    "Consider requesting psychiatric evaluation to support anxiety diagnosis",
    "Obtain bank statements for past 12 months to demonstrate income loss",
    "Schedule appointment with BTL representative to file claim in person"
  ]
}
```

## Key Data Transformations

### 1. Document Summary to Form Fields

**Input:** Document summaries about employment history
**Processing:** Agent extracts employment dates, positions, salaries
**Output:** `form_7801.employment_history` populated

### 2. Medical Documents to Disability Types

**Input:** Medical evaluation mentioning specific conditions
**Processing:** Agent maps conditions to disability_types checkboxes
**Output:** `form_7801.disability_info.disability_types` with true/false for each condition

### 3. Context to Strategy

**Input:** All concatenated documents + call summary
**Processing:** Agent analyzes under BTL law framework
**Output:** `strategy` field with numbered recommendations and legal references

### 4. Evidence Assessment to Claim Rate

**Input:** Quality and completeness of evidence
**Processing:** Agent scores based on disability percentage, documentation, legal precedent
**Output:** `claim_rate` (0-100%) - estimated success probability

## Error Handling

### If Documents Missing Summary

```python
# In backend
if not doc.get('metadata', {}).get('document_summary'):
    logger.warning(f"Document {doc_id} missing summary, skipping")
    # Continue with other documents
```

### If Agent Returns Incomplete Data

```python
# Agent has fallback values
{
  "form_7801": {
    "form_version": "1.0",
    "personal_info": {},  # Empty if not in documents
    "employment_history": {
      "employment_records": [],
      "total_employment_months": 0,
      "section_confirmed": False
    },
    # ... all fields have defaults
  }
}
```

### If No Documents Provided

Agent still analyzes based on call summary:
- Generates summary from conversation
- Identifies key legal points
- Provides recommendations for needed documentation
- Returns partial form with call data

## Performance Notes

- **Processing Time:** 15-30 seconds per case
- **Bottleneck:** Agent API call (10-20 seconds)
- **Optimization:** Can cache results if documents unchanged
- **Concurrent:** Multiple cases can be analyzed in parallel

---

This integration provides end-to-end Form 7801 analysis automation using AI,
dramatically reducing manual form preparation time while ensuring consistent
legal compliance with Israeli BTL requirements.
