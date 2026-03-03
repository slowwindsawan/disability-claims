from agents import RunContextWrapper, Agent, TResponseInputItem, Runner, RunConfig, trace
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import json
import logging

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic schemas matching extension/phase2.js  step2ExamplePayload exactly
# ──────────────────────────────────────────────────────────────────────────────

class Form270StatusesSchema(BaseModel):
    GeneralDisabled: bool = False
    WorkInjury: bool = False
    ZionPrisoner: bool = False
    Volunteer: bool = False
    HandicappedPartner: bool = False
    ParentAChildDied: bool = False
    Widower: bool = False
    HostilitiesVictim: bool = False


class Form270RehabSection(BaseModel):
    shikumReason: str = ""
    shikumWishes: str = ""
    financeRight: str = "no"          # "yes" | "no" | "unknown"
    financeRightFrom: List[int] = []  # 1–5, where 5 = Other
    explainOther: str = ""


class Form270OtherDocument(BaseModel):
    name: str
    fileType: str
    fileUrl: str


class Form270PayloadSchema(BaseModel):
    statuses: Form270StatusesSchema = Form270StatusesSchema()
    filedGeneralDisabilityClaim: str = "no"   # "yes" | "no"
    firstName: str = ""
    lastName: str = ""
    idNumber: str = ""
    gender: str = ""                           # "male" | "female" | ""
    birthDate: str = ""                        # DD/MM/YYYY
    phone: str = ""
    repeatPhone: str = ""
    otherPhone: str = ""
    email: str = ""
    repeatEmail: str = ""
    acceptDigital: bool = True
    otherAddress: bool = False
    accountOwnerName: str = ""
    hasOtherOwners: bool = False
    bankName: str = ""
    branchName: str = ""
    accountNumber: str = ""
    rehab: Form270RehabSection = Form270RehabSection()
    otherDocuments: List[Form270OtherDocument] = []


# ──────────────────────────────────────────────────────────────────────────────
# Context object
# ──────────────────────────────────────────────────────────────────────────────

class Form270Context:
    def __init__(self, input_data_as_text: str):
        self.input_data_as_text = input_data_as_text


# ──────────────────────────────────────────────────────────────────────────────
# Agent instructions
# ──────────────────────────────────────────────────────────────────────────────

def form270_payload_instructions(run_context: RunContextWrapper[Form270Context], _agent: Agent[Form270Context]) -> str:
    input_data = run_context.context.input_data_as_text

    return f"""You are a Form 270 (T270 – Bituach Leumi Professional Rehabilitation) payload generation agent for the Israeli National Insurance disability benefits system.

Your task is to analyze the provided user data and construct a complete, accurate Form 270 payload that will be used to auto-fill the government form at govforms.gov.il/mw/forms/T270@btl.gov.il.

DATA PROVIDED:
{input_data}

═══════════════════════════════════════════════════════
FIELD MAPPING INSTRUCTIONS
═══════════════════════════════════════════════════════

DATA PRIORITY ORDER (highest → lowest):
  1. FORM 7801 DATA — already AI-extracted from the intake call; most accurate for name, ID, bank, phone, DOB
  2. USER PROFILE — verified account data (email, phone, full_name)
  3. ELIGIBILITY DATA — questionnaire answers
  4. CALL DETAILS / CALL SUMMARY — raw transcription data

NOTE: The form_7801_data object uses these exact field names (use them directly):
  - form_7801_data.firstName       → first name
  - form_7801_data.lastName        → last name
  - form_7801_data.idNumber        → 9-digit Israeli ID number
  - form_7801_data.dob             → date of birth (may be DD/MM/YYYY or other format; convert to DD/MM/YYYY)
  - form_7801_data.gender          → "1" means male, "2" means female (convert to "male" / "female" for this form)
  - form_7801_data.phoneNumber     → primary phone number
  - form_7801_data.bankName        → bank name in Hebrew
  - form_7801_data.localBankName   → branch name / branch number string
  - form_7801_data.accountNumber   → bank account number
  - form_7801_data.accountOwnerName → account holder name

1. PERSONAL INFORMATION:
   Priority: form_7801_data fields first, then user_profile, then eligibility_raw, then call_details/call_summary.
   - firstName:    form_7801_data.firstName → split user_profile.full_name (first word) → eligibility_raw
   - lastName:     form_7801_data.lastName  → split user_profile.full_name (rest)       → eligibility_raw
   - idNumber:     form_7801_data.idNumber  → eligibility_raw → call_details → call_summary (9-digit Israeli ID)
   - gender:       form_7801_data.gender ("1"→"male", "2"→"female") → eligibility_raw → call_details
   - birthDate:    form_7801_data.dob (convert to DD/MM/YYYY if needed) → eligibility_raw → call_details
   - phone:        form_7801_data.phoneNumber → user_profile.phone; MUST be Israeli local format 05XXXXXXXX (10 digits, NO country code — strip leading +972 or 972 if present, replace with 0)
   - repeatPhone:  same as phone
   - otherPhone:   secondary phone if found, else ""
   - email:        user_profile.email (always prefer verified account email)
   - repeatEmail:  same as email
   - acceptDigital: true (default — user has an account in the system)
   - otherAddress: false unless explicit different address found

2. DISABILITY STATUS CHECKBOXES (statuses object — set to true based on case data):
   Analyze the call_summary, call_details, and eligibility_raw to determine which apply:
   - GeneralDisabled:    True if the primary claim is for general disability (נכות כללית)
   - WorkInjury:         True if there is a work injury component (נפגע עבודה / תאונת עבודה)
   - ZionPrisoner:       True ONLY if explicitly mentioned as prisoner of Zion (אסיר ציון)
   - Volunteer:          True ONLY if explicitly mentioned as volunteer injured in service (מתנדב)
   - HandicappedPartner: True ONLY if the claimant is the spouse/partner of a disabled person
   - ParentAChildDied:   True ONLY if the claimant is a parent whose child died
   - Widower:            True ONLY if the claimant is a widow/widower claiming due to spouse's death
   - HostilitiesVictim:  True if there is a hostilities/terror-related injury component (נפגע פעולות איבה)
   
   IMPORTANT: At minimum set GeneralDisabled=true unless the data clearly indicates otherwise.
   Multiple statuses can be true simultaneously.

3. FILED GENERAL DISABILITY CLAIM (filedGeneralDisabilityClaim):
   - "yes" if the case data indicates a prior general disability claim was filed
   - "no" otherwise (default)
   - Look in call_summary.case_summary, call_details.analysis for any mention of prior claims

4. BANK DETAILS:
   Priority: form_7801_data (highest), then eligibility_raw, call_details, call_summary, user_profile.contact_details.
   - accountOwnerName: form_7801_data.accountOwnerName → full name of account owner → default firstName + " " + lastName
   - bankName:         form_7801_data.bankName → Hebrew bank name (e.g. "בנק הפועלים", "בנק לאומי", "מזרחי טפחות", etc.)
   - branchName:       form_7801_data.localBankName → Branch name or number string (e.g. "100 - ירושלים מרכז")
   - accountNumber:    form_7801_data.accountNumber → Account number string
   - hasOtherOwners:   false unless joint account is explicitly mentioned

5. REHABILITATION SECTION (rehab object) — this is the MOST IMPORTANT section:
   - shikumReason:   A coherent Hebrew paragraph explaining WHY the person needs professional rehabilitation.
     Write it based on:
     * The disability/condition mentioned in call_summary and call_details
     * The impact on their ability to work in their previous profession
     * The need for retraining or professional rehabilitation
     * Use 2-4 sentences in fluent, formal Hebrew
     * Example starter: "בשל מצבי הרפואי ופגיעתי ב..."
   
   - shikumWishes:   Hebrew paragraph describing what rehabilitation they want/need.
     * What kind of profession/training they wish to pursue after rehabilitation
     * Any preferences for schedule, location, or type of program
     * If unclear from data, write a general request for guidance in finding a suitable training path
     * Can be 1-3 sentences, or "" if truly nothing is known
   
   - financeRight:   "yes" / "no" / "unknown"
     * "yes" if the call data mentions they receive or are entitled to funding from another source (Ministry of Defense, Ministry of Health, etc.)
     * "no" if explicitly denied or no other funding mentioned
     * "unknown" if data is insufficient to determine
   
   - financeRightFrom: Array of integers 1-5 indicating OTHER funding sources:
     * 1 = משרד הביטחון (Ministry of Defense) — include if military-related
     * 2 = משרד הבריאות (Ministry of Health) — include if health ministry relevant
     * 3 = משרד הרווחה (Ministry of Welfare) — include if welfare ministry relevant
     * 4 = מינהל הסטודנטים (Student Administration) — include if student
     * 5 = אחר (Other) — include if other source mentioned
     * Leave as [] if financeRight is "no" or "unknown"
   
   - explainOther:   Hebrew text explaining what the "other" funding source is; "" if financeRightFrom does not contain 5

6. DOCUMENTS (otherDocuments array):
   Map uploaded documents that are relevant to the rehabilitation claim:
   - Medical documents, disability assessments, work injury reports
   - Use file_name as the name field
   - Use the actual file_url from the documents data
   - fileType: "pdf" for PDF files, "image" for JPG/PNG files, "other" otherwise
   - Only include documents that have a valid file_url

═══════════════════════════════════════════════════════
FIELD CONSTRAINTS
═══════════════════════════════════════════════════════
- gender: ONLY "male" or "female" (no other values); use "" only if truly unknown
- birthDate: MUST be DD/MM/YYYY format or ""
- idNumber: 9-digit Israeli ID string or ""
- phone/repeatPhone: Israeli local format 05XXXXXXXX (10 digits, no country code — if stored as +972XXXXXXXXX or 972XXXXXXXXX, convert by replacing the leading +972/972 with 0)
- financeRight: ONLY one of "yes", "no", "unknown"
- financeRightFrom: Array of integers from 1-5 only, empty array if none
- shikumReason: NON-EMPTY meaningful Hebrew text if any disability info is available
- All date fields: DD/MM/YYYY format only
- All boolean fields: true or false (not strings)

═══════════════════════════════════════════════════════
IMPORTANT RULES
═══════════════════════════════════════════════════════
- Write shikumReason and shikumWishes in fluent, formal, compassionate Hebrew
- Do NOT make up medical diagnoses not mentioned in the data
- Do NOT fabricate bank account numbers or IDs
- If a field value is not found, use the specified default (empty string, false, etc.)
- The output must be a valid Form270PayloadSchema JSON

Return a valid Form 270 payload JSON following the schema exactly."""


# ──────────────────────────────────────────────────────────────────────────────
# Agent instance
# ──────────────────────────────────────────────────────────────────────────────

form270_payload_agent = Agent(
    name="Form 270 Payload Generator",
    instructions=form270_payload_instructions,
    model="gpt-4o",
    output_type=Form270PayloadSchema,
)


# ──────────────────────────────────────────────────────────────────────────────
# Public async function called from main.py
# ──────────────────────────────────────────────────────────────────────────────

async def generate_form270_payload(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Form 270 (T270 – Professional Rehabilitation) payload from gathered DB data.

    Args:
        input_data: Dictionary containing:
            - case_id:         Case ID string
            - documents:       List of documents with file_url, metadata, file_name
            - eligibility_raw: Eligibility data from user_eligibility table
            - user_profile:    User profile data (email, phone, full_name, contact_details)
            - call_details:    call_details JSONB from cases table
            - call_summary:    call_summary JSONB from cases table

    Returns:
        Form 270 payload dictionary matching step2ExamplePayload structure in phase2.js
    """
    try:
        input_text = f"""
=== CASE ID ===
{input_data.get('case_id', 'N/A')}

=== FORM 7801 DATA (pre-parsed, HIGHEST PRIORITY — use these values first for personal details, ID, bank info) ===
{json.dumps(input_data.get('form_7801_data', {}), indent=2, ensure_ascii=False)}

=== USER PROFILE ===
{json.dumps(input_data.get('user_profile', {}), indent=2, ensure_ascii=False)}

=== ELIGIBILITY DATA ===
{json.dumps(input_data.get('eligibility_raw', {}), indent=2, ensure_ascii=False)}

=== CALL SUMMARY ===
{json.dumps(input_data.get('call_summary', {}), indent=2, ensure_ascii=False)}

=== CALL DETAILS ===
{json.dumps(input_data.get('call_details', {}), indent=2, ensure_ascii=False)}

=== DOCUMENTS (with file URLs) ===
{json.dumps(input_data.get('documents', []), indent=2, ensure_ascii=False)}
"""

        logger.info("[FORM270] Preparing Form 270 payload generation agent call...")
        logger.info(f"[FORM270] Input data keys: {list(input_data.keys())}")
        logger.info(f"[FORM270] Documents count: {len(input_data.get('documents', []))}")

        conversation_history: list[TResponseInputItem] = [
            {
                "role": "user",
                "content": [{"type": "input_text", "text": input_text}],
            }
        ]

        with trace("Form 270 Payload Generation"):
            result = await Runner.run(
                form270_payload_agent,
                input=conversation_history,
                run_config=RunConfig(
                    trace_metadata={
                        "__trace_source__": "form270-generator",
                        "case_id": input_data.get("case_id"),
                    }
                ),
                context=Form270Context(input_data_as_text=input_text),
            )

        logger.info("[FORM270] ✅ Agent completed successfully")

        payload = result.final_output.model_dump()

        logger.info(f"[FORM270] Generated payload — rehab reason length: {len(payload.get('rehab', {}).get('shikumReason', ''))}")
        logger.info(f"[FORM270] Documents in payload: {len(payload.get('otherDocuments', []))}")

        return payload

    except Exception as e:
        logger.exception(f"[FORM270] ❌ Error generating Form 270 payload: {e}")

        # Return minimal valid payload (same shape the frontend expects)
        return {
            "statuses": {
                "GeneralDisabled": True,
                "WorkInjury": False,
                "ZionPrisoner": False,
                "Volunteer": False,
                "HandicappedPartner": False,
                "ParentAChildDied": False,
                "Widower": False,
                "HostilitiesVictim": False,
            },
            "filedGeneralDisabilityClaim": "no",
            "firstName": "",
            "lastName": "",
            "idNumber": "",
            "gender": "",
            "birthDate": "",
            "phone": "",
            "repeatPhone": "",
            "otherPhone": "",
            "email": "",
            "repeatEmail": "",
            "acceptDigital": True,
            "otherAddress": False,
            "accountOwnerName": "",
            "hasOtherOwners": False,
            "bankName": "",
            "branchName": "",
            "accountNumber": "",
            "rehab": {
                "shikumReason": "",
                "shikumWishes": "",
                "financeRight": "no",
                "financeRightFrom": [],
                "explainOther": "",
            },
            "otherDocuments": [],
        }
