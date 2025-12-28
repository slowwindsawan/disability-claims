from agents import FileSearchTool, RunContextWrapper, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace
from pydantic import BaseModel
from openai.types.shared.reasoning import Reasoning
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

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
  model="gpt-5-mini",
  tools=[
    file_search
  ],
  output_type=FinalDoumentsAnalysisSchema,
  model_settings=ModelSettings(
    store=True,
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
# Public API wrapper for integration with main.py
# ------------------------------------------------------------------

async def analyze_documents_with_openai_agent(
    case_id: str,
    documents_data: list,
    call_summary: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Analyze case documents using the OpenAI Form 7801 agent.
    
    Args:
        case_id: The case ID
        documents_data: List of documents with their summaries from case_documents table
        call_summary: Call summary data from cases.call_summary
    
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
        
        # Combine all context
        full_context = f"""{call_context}

UPLOADED MEDICAL DOCUMENTS:
{concatenated_docs}
"""
        
        logger.info(f"📄 Concatenated {len(document_summaries)} document summaries for case {case_id}")
        logger.info(f"📝 Context length: {len(full_context)} characters")
        
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
