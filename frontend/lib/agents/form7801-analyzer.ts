import { fileSearchTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

// Tool definitions
const fileSearch = fileSearchTool([
  "vs_693be980a7348191b8c7cf9ecb62c3b3"
])

const FinalDocumentsAnalysisSchema = z.object({
  form_7801: z.object({
    form_version: z.string(),
    submission_date: z.string(),
    form_status: z.enum(["draft", "submitted", "approved", "rejected"]),
    personal_info: z.object({
      id_number: z.string(),
      full_name: z.string(),
      date_of_birth: z.string(),
      gender: z.enum(["זכר", "נקבה", "אחר"]),
      marital_status: z.enum(["single", "married", "divorced", "widowed"]),
      number_of_children: z.number(),
      address: z.string(),
      city: z.string(),
      postal_code: z.string(),
      phone: z.string(),
      email: z.string(),
      section_confirmed: z.boolean()
    }),
    employment_history: z.object({
      employment_records: z.array(z.object({
        employer_name: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        monthly_salary_gross: z.number(),
        position_title: z.string(),
        employment_type: z.enum(["full_time", "part_time", "self_employed", "other"])
      })),
      total_employment_months: z.number(),
      section_confirmed: z.boolean()
    }),
    disability_info: z.object({
      disability_types: z.object({
        chronic_pain: z.boolean(),
        limited_mobility: z.boolean(),
        fibromyalgia: z.boolean(),
        anxiety: z.boolean(),
        depression: z.boolean(),
        back_problems: z.boolean(),
        joint_problems: z.boolean(),
        neurological_disorder: z.boolean(),
        mental_disorder: z.boolean(),
        hearing_impairment: z.boolean(),
        vision_impairment: z.boolean(),
        heart_disease: z.boolean(),
        respiratory_disease: z.boolean(),
        kidney_disease: z.boolean(),
        diabetes: z.boolean(),
        cancer: z.boolean(),
        other: z.boolean()
      }),
      disability_start_date: z.string(),
      primary_disability_description: z.string(),
      treating_physicians: z.array(z.object({
        physician_id: z.string(),
        name: z.string(),
        specialty: z.string(),
        clinic_name: z.string(),
        clinic_type: z.enum(["private", "public", "hmo"]),
        phone: z.string(),
        last_visit_date: z.string()
      })),
      hospitalizations: z.array(z.object({
        hospitalization_id: z.string(),
        hospital_name: z.string(),
        department: z.string(),
        admission_date: z.string(),
        discharge_date: z.string(),
        reason_for_admission: z.string(),
        length_of_stay_days: z.number()
      })),
      section_confirmed: z.boolean()
    }),
    bank_details: z.object({
      bank_name: z.string(),
      branch_number: z.string(),
      account_number: z.string(),
      account_holder_name: z.string(),
      account_type: z.enum(["checking", "savings", "other"]),
      section_confirmed: z.boolean()
    }),
    medical_waiver: z.object({
      waiver_accepted: z.boolean(),
      waiver_date: z.string(),
      waiver_version: z.string(),
      section_confirmed: z.boolean()
    }),
    metadata: z.object({
      all_sections_confirmed: z.boolean(),
      completion_percentage: z.number(),
      created_at: z.string(),
      updated_at: z.string(),
      submitted_at: z.string(),
      case_id: z.string(),
      user_id: z.string(),
      language: z.enum(["hebrew", "english"]),
      document_extraction_confidence: z.number()
    })
  }),
  summary: z.string(),
  strategy: z.string()
});

const finalDocumentsAnalysis = new Agent({
  name: "Final documents analysis",
  instructions: "You are given a user's form 7801 data and medical records. Analyze them based on the BTL (מנהלת הביטוח הלאומי) guidelines and provide a comprehensive analysis of the disability claim eligibility. Output the response in the specified JSON format.",
  model: "gpt-4o-mini",
  tools: [
    fileSearch
  ],
  outputType: FinalDocumentsAnalysisSchema,
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

type WorkflowInput = { input_as_text: string };

// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Final documents analysis", async () => {
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "form-7801-analyzer",
        workflow_id: "wf_form7801_analysis"
      }
    });
    
    const finalDocumentsAnalysisResultTemp = await runner.run(
      finalDocumentsAnalysis,
      [
        ...conversationHistory
      ]
    );
    
    conversationHistory.push(...finalDocumentsAnalysisResultTemp.newItems.map((item) => item.rawItem));

    if (!finalDocumentsAnalysisResultTemp.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    const finalDocumentsAnalysisResult = {
      output_text: JSON.stringify(finalDocumentsAnalysisResultTemp.finalOutput),
      output_parsed: finalDocumentsAnalysisResultTemp.finalOutput
    };

    return finalDocumentsAnalysisResult;
  });
}
