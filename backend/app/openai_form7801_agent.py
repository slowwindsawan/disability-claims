from agents import FileSearchTool, RunContextWrapper, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace
from pydantic import BaseModel
from openai.types.shared.reasoning import Reasoning
import json
import logging
from typing import Dict, Any, List
from pathlib import Path

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# BTL Guidelines Helper
# ------------------------------------------------------------------

def load_btl_guidelines() -> List[Dict[str, Any]]:
    """Load BTL guidelines from btl.json"""
    btl_path = Path(__file__).parent / "btl.json"
    try:
        with open(btl_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load BTL guidelines: {e}")
        return []

def get_btl_content_by_topics(topic_ids: List[str]) -> str:
    """Extract BTL content for specified topic IDs"""
    if not topic_ids:
        return ""
    
    btl_data = load_btl_guidelines()
    relevant_content = []
    
    for topic in btl_data:
        if topic.get("topic_id") in topic_ids:
            # Create a copy of the topic without topic_id, topic_name, and btl_section
            topic_content = {k: v for k, v in topic.items() if k not in ['topic_id', 'topic_name', 'btl_section']}
            
            # Convert to formatted JSON string
            content = f"\n### BTL Guideline: {topic.get('topic_name', '')} (Section {topic.get('btl_section', '')})\n"
            content += json.dumps(topic_content, indent=2, ensure_ascii=False)
            content += "\n"
            
            relevant_content.append(content)
    
    if relevant_content:
        return "\n\n=== RELEVANT BTL GUIDELINES ===\n" + "".join(relevant_content)
    return ""

def extract_related_topics_from_call_details(call_details: Dict[str, Any]) -> List[str]:
    """Extract related_topics array from call_details.analysis.structuredData.
    If the array is empty, return all topic IDs from btl.json.
    """
    try:
        topics = call_details.get("analysis", {}).get("structuredData", {}).get("related_topics", [])
        logger.info(f"[FORM7801] 🔍 Extracted topics from call_details: {topics}")
        
        # If topics array is empty, return ALL topic IDs from btl.json
        if not topics:
            logger.info("[FORM7801] 📚 related_topics is empty - loading ALL topics from btl.json")
            all_guidelines = load_btl_guidelines()
            all_topic_ids = [topic.get('topic_id') for topic in all_guidelines if topic.get('topic_id')]
            logger.info(f"[FORM7801] 📚 Returning all {len(all_topic_ids)} topics: {all_topic_ids}")
            return all_topic_ids
        
        return topics
    except Exception as e:
        logger.warning(f"[FORM7801] Failed to extract related_topics from call_details: {e}")
        return []

# Tool definitions
file_search = FileSearchTool(
  vector_store_ids=[
    "vs_693be980a7348191b8c7cf9ecb62c3b3"
  ]
)


class FinalDoumentsAnalysisSchema__PersonalInfo(BaseModel):
  id_number: str
  full_name: str
  date_of_birth: str
  gender: str
  marital_status: str
  number_of_children: float
  address: str
  city: str
  postal_code: str
  phone: str
  email: str
  section_confirmed: bool


class FinalDoumentsAnalysisSchema__EmploymentRecordsItem(BaseModel):
  employer_name: str
  start_date: str
  end_date: str
  monthly_salary_gross: float
  position_title: str
  employment_type: str


class FinalDoumentsAnalysisSchema__EmploymentHistory(BaseModel):
  employment_records: list[FinalDoumentsAnalysisSchema__EmploymentRecordsItem]
  total_employment_months: float
  section_confirmed: bool


class FinalDoumentsAnalysisSchema__DisabilityTypes(BaseModel):
  chronic_pain: bool
  limited_mobility: bool
  fibromyalgia: bool
  anxiety: bool
  depression: bool
  back_problems: bool
  joint_problems: bool
  neurological_disorder: bool
  mental_disorder: bool
  hearing_impairment: bool
  vision_impairment: bool
  heart_disease: bool
  respiratory_disease: bool
  kidney_disease: bool
  diabetes: bool
  cancer: bool
  other: bool


class FinalDoumentsAnalysisSchema__TreatingPhysiciansItem(BaseModel):
  physician_id: str
  name: str
  specialty: str
  clinic_name: str
  clinic_type: str
  phone: str
  last_visit_date: str


class FinalDoumentsAnalysisSchema__HospitalizationsItem(BaseModel):
  hospitalization_id: str
  hospital_name: str
  department: str
  admission_date: str
  discharge_date: str
  reason_for_admission: str
  length_of_stay_days: float


class FinalDoumentsAnalysisSchema__DisabilityInfo(BaseModel):
  disability_types: FinalDoumentsAnalysisSchema__DisabilityTypes
  disability_start_date: str
  primary_disability_description: str
  treating_physicians: list[FinalDoumentsAnalysisSchema__TreatingPhysiciansItem]
  hospitalizations: list[FinalDoumentsAnalysisSchema__HospitalizationsItem]
  section_confirmed: bool


class FinalDoumentsAnalysisSchema__BankDetails(BaseModel):
  bank_name: str
  branch_number: str
  account_number: str
  account_holder_name: str
  account_type: str
  section_confirmed: bool


class FinalDoumentsAnalysisSchema__MedicalWaiver(BaseModel):
  waiver_accepted: bool
  waiver_date: str
  waiver_version: str
  section_confirmed: bool


class FinalDoumentsAnalysisSchema__Metadata(BaseModel):
  all_sections_confirmed: bool
  completion_percentage: float
  created_at: str
  updated_at: str
  submitted_at: str
  case_id: str
  user_id: str
  language: str
  document_extraction_confidence: float


class FinalDoumentsAnalysisSchema__Form7801(BaseModel):
  form_version: str
  submission_date: str
  form_status: str
  personal_info: FinalDoumentsAnalysisSchema__PersonalInfo
  employment_history: FinalDoumentsAnalysisSchema__EmploymentHistory
  disability_info: FinalDoumentsAnalysisSchema__DisabilityInfo
  bank_details: FinalDoumentsAnalysisSchema__BankDetails
  medical_waiver: FinalDoumentsAnalysisSchema__MedicalWaiver
  metadata: FinalDoumentsAnalysisSchema__Metadata


class FinalDoumentsAnalysisSchema__PreparationDataItem(BaseModel):
  title: str
  detail: str
  should_say: bool


class FinalDoumentsAnalysisSchema(BaseModel):
  form_7801: FinalDoumentsAnalysisSchema__Form7801
  summary: str
  strategy: str
  claim_rate: float
  recommendations: list[str]
  preparation_data: list[FinalDoumentsAnalysisSchema__PreparationDataItem]


class FinalDoumentsAnalysisContext:
  def __init__(self, workflow_input_as_text: str):
    self.workflow_input_as_text = workflow_input_as_text


def final_douments_analysis_instructions(run_context: RunContextWrapper[FinalDoumentsAnalysisContext], _agent: Agent[FinalDoumentsAnalysisContext]):
  workflow_input_as_text = run_context.context.workflow_input_as_text
  return f"""You are given a user's medical records. You have analyze them based on the BTL guidelines given and then output the response.

Records:  {workflow_input_as_text}"""

final_douments_analysis = Agent(
  name="Final douments analysis",
  instructions=final_douments_analysis_instructions,
  model="gpt-5-nano",
  # tools=[
  #   file_search
  # ],
  output_type=FinalDoumentsAnalysisSchema,
  model_settings=ModelSettings(
    # store=True,
    reasoning=Reasoning(
      effort="low",
      summary="auto"
    )
  )
)


class WorkflowInput(BaseModel):
  input_as_text: str


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput):
  with trace("Final documents analysis"):
    state = {

    }
    workflow = workflow_input.model_dump()
    conversation_history: list[TResponseInputItem] = [
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": workflow["input_as_text"]
          }
        ]
      }
    ]
    final_douments_analysis_result_temp = await Runner.run(
      final_douments_analysis,
      input=[
        *conversation_history
      ],
      run_config=RunConfig(trace_metadata={
        "__trace_source__": "agent-builder",
        "workflow_id": "wf_694f828cd7e881908daf2e2ad567cae707aca03f25cee1ba"
      }),
      context=FinalDoumentsAnalysisContext(workflow_input_as_text=workflow["input_as_text"])
    )

    conversation_history.extend([item.to_input_item() for item in final_douments_analysis_result_temp.new_items])

    final_douments_analysis_result = {
      "output_text": final_douments_analysis_result_temp.final_output.json(),
      "output_parsed": final_douments_analysis_result_temp.final_output.model_dump()
    }
    return final_douments_analysis_result


# ------------------------------------------------------------------
# Form 7801 Payload Schema (Based on Israeli Bituach Leumi Form)
# ------------------------------------------------------------------

class Form7801DiseaseItem(BaseModel):
    disease: str
    date: str
    hospitalized: bool
    uploadHospitalFile: bool
    hospitalFileUrl: str = ""
    sawSpecialist: bool
    uploadSpecialistFile: bool
    specialistFileUrl: str = ""
    otherDescription: str = ""


class Form7801OtherDocument(BaseModel):
    name: str
    fileType: str
    fileUrl: str


class Form7801PayloadSchema(BaseModel):
    gender: str
    dob: str
    submitFor: str = "1"
    firstName: str
    lastName: str
    idNumber: str
    maritalStatus: str
    hasSiyua: str = "2"
    siyuaBody: list[str] = []
    siyuaBodyName: str = ""
    phoneNumber: str
    repeatMobile: str
    otherPhoneNumber: str = ""
    email: str
    repeatEmail: str
    smsConfirm: str = "1"
    differentAddress: bool = False
    otherCity: str = ""
    otherStreet: str = ""
    otherHome: str = ""
    otherApartment: str = ""
    mailBox: str = ""
    accountOwnerName: str
    accountOwnerIdNum: str
    isOwner2: bool = False
    bankName: str
    localBankName: str
    accountNumber: str
    kindComplaint: str
    notWorkingReason: str = ""
    workingAs: str = ""
    gotSickPayYN: str = "1"
    otherIncome: str = "1"
    diseases: list[Form7801DiseaseItem]
    medicalTests: list[str]
    accident: bool = False
    accidentDate: str = ""
    armyInjury: bool = False
    uploadArmyFile: bool = False
    armyFileUrl: str = ""
    statement: bool = True
    healthFund: str
    healthDetails: str = ""
    declaration: bool = True
    signatureType: str = "חתימה סרוקה"
    uploadSignatureFile: bool = True
    signatureFileUrl: str = ""
    signatureFileType: str = "image"
    finalDeclaration: bool = True
    videoMedicalCommittee: bool = True
    refuseEmployerContact: bool = False
    otherDocuments: list[Form7801OtherDocument]
    informationTransfer: bool = True
    secondSignatureType: str = "חתימה סרוקה"
    uploadSecondSignature: bool = True


class Form7801Context:
    def __init__(self, input_data_as_text: str):
        self.input_data_as_text = input_data_as_text


def form7801_payload_instructions(run_context: RunContextWrapper[Form7801Context], _agent: Agent[Form7801Context]):
    input_data = run_context.context.input_data_as_text
    
    return f"""You are a Form 7801 payload generation agent for the Israeli Bituach Leumi disability benefits claim system.

Your task is to analyze the provided data and construct a complete Form 7801 payload structure.

DATA PROVIDED:
{input_data}

INSTRUCTIONS:
1. Map user_profile fields to personal information:
   - email: from user_profile.email
   - phone: from user_profile.phone
   - full_name: from user_profile.full_name (split into firstName and lastName if needed)
   - Additional details (dob, gender, idNumber, address, city) should come from:
     a) eligibility_raw JSONB (contains questionnaire answers)
     b) contact_details JSONB in user_profile
     c) call_details or call_summary
     d) If not found, leave as empty string

2. Extract marital status and employment data from:
   - eligibility_raw (questionnaire answers)
   - call_details (from voice interview)
   - call_summary (summary of call)

3. Map documents from case_documents to appropriate fields:
   - Hospital reports → hospitalFileUrl in diseases array
   - Specialist reports → specialistFileUrl in diseases array
   - Signature files → signatureFileUrl
   - Army injury docs → armyFileUrl (if applicable)
   - Other documents → otherDocuments array

4. Extract disease/disability information from:
   - call_details and call_summary (from voice interview)
   - eligibility_raw (from questionnaire)
   - Identify disability types from case summary
   - Extract disability start date if available
   - Identify hospitalizations if mentioned
   - Identify specialist visits if mentioned

5. Bank account information (search in eligibility_raw or call_summary if available)

6. Health fund information:
   - From eligibility_raw or call_summary
   - Default to empty if not found

7. Medical tests performed:
   - From documents metadata
   - From call_summary
   - From eligibility_raw

8. For missing information, leave fields empty (empty strings "" for text, false for booleans, empty arrays [])

FIELD CONSTRAINTS:
- gender: "1" (זכר/male) or "2" (נקבה/female), or "" if unknown
- dob: DD/MM/YYYY format, or "" if not available
- idNumber: 9-digit Israeli ID, or "" if not available
- phoneNumber: Israeli mobile format (05XXXXXXXX), or "" if not available
- firstName & lastName: Split from full_name or from questionnaire answers
- maritalStatus: One of ["אלמן/אלמנה", "גרוש/גרושה ללא ילדים", "גרוש/גרושה עם ילדים", "עגון/עגונה", "פרוד/פרודה", "רווק/רווקה"] or ""
- kindComplaint: "1" (לא עבדתי כלל), "2" (עבדתי והפסקתי לעבוד), or ""
- diseases: Array of disease objects with allowed disease values (empty not allowed), if no diseases, consider אחר. allowed diseases: ["אחר","בעיה נפשית (מקבל טיפול)","הפרעות בבלוטת התריס","יתר לחץ דם","ליקוי שכלי","ליקוי שמיעה","ליקויי ראיה ומחלת עיניים","מחלה אורטופדית (גפיים עליונות ותחתונות, גב, צוואר, דלקת פרקים)","מחלות בתחום נוירולוגי (כולל אלצהיימר, פרקינסון, אפילפסיה ואירוע מוחי)"]
- medicalTests: Array from allowed medical test names or empty array
- healthFund: One of ["כללית", "לאומית", "מאוחדת", "מכבי", "אחר"] or ""
- File URLs: Use full Supabase Storage URLs from documents data

IMPORTANT:
- Use Hebrew text for all Hebrew fields
- Match document types to correct payload fields based on file_name and metadata
- If data is missing, use empty values (don't make up data)
- Ensure all dates are in DD/MM/YYYY format
- Ensure phone numbers are in Israeli format or empty
- Extract data intelligently from questionnaire answers in eligibility_raw
- The user_profile available fields are: email, phone, full_name, contact_details (JSONB)

Return a valid Form 7801 payload JSON structure."""


form7801_payload_agent = Agent(
    name="Form 7801 Payload Generator",
    instructions=form7801_payload_instructions,
    model="gpt-4o",
    output_type=Form7801PayloadSchema
)


async def generate_form7801_payload(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Form 7801 payload from gathered database data.
    
    Args:
        input_data: Dictionary containing:
            - case_id: Case ID
            - documents: List of documents with file_url, metadata, file_name
            - eligibility_raw: Eligibility data from user_eligibility table
            - user_profile: User profile data (email, phone, id_card, etc.)
            - call_details: Call details JSONB data
            - call_summary: Call summary JSONB data
    
    Returns:
        Form 7801 payload dictionary
    """
    try:
        # Convert input_data to formatted text for agent
        input_text = f"""
=== CASE ID ===
{input_data.get('case_id', 'N/A')}

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
        
        logger.info("[FORM7801] Preparing to call Form 7801 payload generation agent...")
        logger.info(f"[FORM7801] Input data keys: {list(input_data.keys())}")
        logger.info(f"[FORM7801] Documents count: {len(input_data.get('documents', []))}")
        
        # Create conversation history
        conversation_history: list[TResponseInputItem] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": input_text
                    }
                ]
            }
        ]
        
        # Run agent
        with trace("Form 7801 Payload Generation"):
            result = await Runner.run(
                form7801_payload_agent,
                input=conversation_history,
                run_config=RunConfig(trace_metadata={
                    "__trace_source__": "form7801-generator",
                    "case_id": input_data.get('case_id')
                }),
                context=Form7801Context(input_data_as_text=input_text)
            )
        
        logger.info("[FORM7801] ✅ Agent completed successfully")
        
        # Extract payload
        payload = result.final_output.model_dump()
        
        logger.info(f"[FORM7801] Generated payload with {len(payload.get('diseases', []))} diseases")
        logger.info(f"[FORM7801] Generated payload with {len(payload.get('otherDocuments', []))} other documents")
        
        return payload
        
    except Exception as e:
        logger.exception(f"[FORM7801] ❌ Error generating Form 7801 payload: {e}")
        
        # Return minimal valid payload structure
        return {
            "gender": "",
            "dob": "",
            "submitFor": "1",
            "firstName": "",
            "lastName": "",
            "idNumber": "",
            "maritalStatus": "",
            "hasSiyua": "2",
            "siyuaBody": [],
            "siyuaBodyName": "",
            "phoneNumber": "",
            "repeatMobile": "",
            "otherPhoneNumber": "",
            "email": "",
            "repeatEmail": "",
            "smsConfirm": "1",
            "differentAddress": False,
            "otherCity": "",
            "otherStreet": "",
            "otherHome": "",
            "otherApartment": "",
            "mailBox": "",
            "accountOwnerName": "",
            "accountOwnerIdNum": "",
            "isOwner2": False,
            "bankName": "",
            "localBankName": "",
            "accountNumber": "",
            "kindComplaint": "",
            "notWorkingReason": "",
            "workingAs": "",
            "gotSickPayYN": "1",
            "otherIncome": "1",
            "diseases": [],
            "medicalTests": [],
            "accident": False,
            "accidentDate": "",
            "armyInjury": False,
            "uploadArmyFile": False,
            "armyFileUrl": "",
            "statement": True,
            "healthFund": "",
            "healthDetails": "",
            "declaration": True,
            "signatureType": "חתימה סרוקה",
            "uploadSignatureFile": True,
            "signatureFileUrl": "",
            "signatureFileType": "image",
            "finalDeclaration": True,
            "videoMedicalCommittee": True,
            "refuseEmployerContact": False,
            "otherDocuments": [],
            "informationTransfer": True,
            "secondSignatureType": "חתימה סרוקה",
            "uploadSecondSignature": True
        }


# ------------------------------------------------------------------
# Public API wrapper for integration with main.py (OLD - keep for backward compatibility)
# ------------------------------------------------------------------

async def analyze_documents_with_openai_agent(
    case_id: str,
    documents_data: list,
    call_summary: Dict[str, Any],
    call_details: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Analyze case documents using the OpenAI Form 7801 agent.
    
    Args:
        case_id: The case ID
        documents_data: List of documents with their summaries from case_documents table
        call_summary: Call summary data from cases.call_summary
        call_details: Optional call details containing related_topics for BTL guidelines
    
    Returns:
        Agent analysis result matching FinalDoumentsAnalysisSchema
    """
    try:
        # Concatenate all document summaries
        document_summaries = []
        for doc in documents_data:
            metadata = doc.get('metadata', {})
            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except:
                    metadata = {}
            
            doc_summary = metadata.get('document_summary', '')
            if doc_summary:
                doc_name = doc.get('file_name', 'Unknown Document')
                key_points = metadata.get('key_points', [])
                is_relevant = metadata.get('is_relevant', False)
                
                doc_section = f"📄 {doc_name} (Relevant: {is_relevant}):\n{doc_summary}"
                if key_points:
                    doc_section += f"\n\nKey Points:\n" + "\n".join([f"- {point}" for point in key_points])
                
                document_summaries.append(doc_section)
        
        concatenated_docs = "\n\n---\n\n".join(document_summaries) if document_summaries else "No documents provided"
        
        # Prepare call summary context
        call_context = f"""
CALL SUMMARY DATA:
- Case Summary: {call_summary.get('case_summary', 'N/A')}
- Estimated Claim Amount: {call_summary.get('estimated_claim_amount', 0)}
- Risk Assessment: {call_summary.get('risk_assessment', 'Needs More Info')}
- Key Legal Points: {json.dumps(call_summary.get('key_legal_points', []), ensure_ascii=False, indent=2)}
- Documents Requested: {len(call_summary.get('documents_requested_list', []))} items
"""
        
        # Extract and include BTL guidelines based on related topics
        btl_guidelines_context = ""
        if call_details:
            logger.info("[FORM7801] 🔍 Extracting related topics from call_details...")
            related_topics = extract_related_topics_from_call_details(call_details)
            logger.info(f"[FORM7801] Related topics extracted: {related_topics}")
            if related_topics:
                logger.info(f"[FORM7801] ✅ Found {len(related_topics)} related BTL topics: {related_topics}")
                btl_guidelines_context = get_btl_content_by_topics(related_topics)
                logger.info(f"[FORM7801] 📚 BTL guidelines context length: {len(btl_guidelines_context)} chars")
            else:
                logger.info("[FORM7801] ⚠️  No related topics found in call_details")
        else:
            logger.info("[FORM7801] ℹ️  No call_details provided - BTL guidelines will not be included")
        
        # Combine all context
        full_context = f"""{call_context}

UPLOADED MEDICAL DOCUMENTS:
{concatenated_docs}
{btl_guidelines_context}
"""
        
        logger.info(f"📄 Concatenated {len(document_summaries)} document summaries for case {case_id}")
        logger.info(f"📝 Context length: {len(full_context)} characters")
        
        # Print the BTL guidelines section if included
        if btl_guidelines_context:
            logger.info(f"[FORM7801] 📚 BTL Guidelines section being sent to agent:")
            logger.info(f"[FORM7801] {'='*60}")
            logger.info(btl_guidelines_context)
            logger.info(f"[FORM7801] {'='*60}")
        else:
            logger.warning(f"[FORM7801] ⚠️  No BTL guidelines context included in prompt")
        
        # Create workflow input
        workflow_input = WorkflowInput(input_as_text=full_context)
        
        logger.info("[AGENT] Running OpenAI Form 7801 agent workflow...")
        result_wrapper = await run_workflow(workflow_input)
        
        logger.info("[AGENT] ✅ Form 7801 agent analysis completed")
        return result_wrapper["output_parsed"]
        
    except Exception as e:
        error_msg = str(e)
        logger.exception(f"[AGENT] ❌ Form 7801 AGENT ERROR: {error_msg}")
        logger.error(f"[AGENT] Exception type: {type(e).__name__}")
        
        # Generate default response based on call summary when agent fails
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        
        return {
            "form_7801": {
                "form_version": "1.0",
                "submission_date": now.split('T')[0],
                "form_status": "draft",
                "personal_info": {
                    "id_number": "",
                    "full_name": "",
                    "date_of_birth": "",
                    "gender": "",
                    "marital_status": "",
                    "number_of_children": 0,
                    "address": "",
                    "city": "",
                    "postal_code": "",
                    "phone": "",
                    "email": "",
                    "section_confirmed": False
                },
                "employment_history": {
                    "employment_records": [],
                    "total_employment_months": 0,
                    "section_confirmed": False
                },
                "disability_info": {
                    "disability_types": {
                        "chronic_pain": False,
                        "limited_mobility": call_summary.get('case_summary', '').lower().find('mobility') >= 0,
                        "fibromyalgia": False,
                        "anxiety": False,
                        "depression": False,
                        "back_problems": False,
                        "joint_problems": False,
                        "neurological_disorder": False,
                        "mental_disorder": False,
                        "hearing_impairment": False,
                        "vision_impairment": False,
                        "heart_disease": False,
                        "respiratory_disease": False,
                        "kidney_disease": False,
                        "diabetes": False,
                        "cancer": False,
                        "other": call_summary.get('case_summary', '') != ''
                    },
                    "disability_start_date": "",
                    "primary_disability_description": call_summary.get('case_summary', 'Pending medical documentation'),
                    "treating_physicians": [],
                    "hospitalizations": [],
                    "section_confirmed": False
                },
                "bank_details": {
                    "bank_name": "",
                    "branch_number": "",
                    "account_number": "",
                    "account_holder_name": "",
                    "account_type": "",
                    "section_confirmed": False
                },
                "medical_waiver": {
                    "waiver_accepted": False,
                    "waiver_date": "",
                    "waiver_version": "1.0",
                    "section_confirmed": False
                },
                "metadata": {
                    "all_sections_confirmed": False,
                    "completion_percentage": 10,
                    "created_at": now,
                    "updated_at": now,
                    "submitted_at": "",
                    "case_id": case_id,
                    "user_id": "",
                    "language": "hebrew",
                    "document_extraction_confidence": 0.0
                }
            },
            "summary": f"Analysis generated with fallback mode. Error: {error_msg[:100]}",
            "strategy": "Awaiting complete medical documentation to proceed with comprehensive claim analysis. Current assessment indicates potential eligibility subject to medical evidence validation.",
            "claim_rate": float(call_summary.get('estimated_claim_amount', 0)) / 100000.0 if call_summary.get('estimated_claim_amount', 0) > 0 else 0.25,
            "recommendations": [
                "Obtain detailed medical evaluation documenting functional limitations",
                "Secure medical evidence establishing disability onset date",
                "Document impact on work capacity and earning ability",
                "Consider additional diagnostic testing if recommended by treating physicians"
            ],
            "preparation_data": [
                {
                    "title": "Describe daily limitations realistically",
                    "detail": "Explain what tasks are hard without exaggerating.",
                    "should_say": True
                },
                {
                    "title": "Focus on facts, not emotions",
                    "detail": "Stick to concrete examples instead of only emotional statements.",
                    "should_say": True
                },
                {
                    "title": "Avoid minimizing symptoms",
                    "detail": "Statements like 'I manage fine' may weaken the claim.",
                    "should_say": False
                }
            ]
        }
