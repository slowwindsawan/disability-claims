// MASTER question catalog — canonical checklist used by the onboarding, voice engine and server-side document analysis.
// Each question includes: id, section, text, type, required, docRequirement (none/optional/required), tags
export const QUESTION_CATALOG: Record<string, any> = {
  // Section A — Identity / Administrative
  A1_full_name: { id: 'A1_full_name', section: 'A', text: 'Full legal name (as on official ID)', type: 'text', required: true, docRequirement: 'none', tags: ['identity'] },
  A1_id_number: { id: 'A1_id_number', section: 'A', text: 'National ID / Passport number', type: 'text', required: true, docRequirement: 'none', tags: ['identity'] },
  A1_dob: { id: 'A1_dob', section: 'A', text: 'Date of birth', type: 'date', required: true, docRequirement: 'none', tags: ['identity'] },
  A1_address: { id: 'A1_address', section: 'A', text: 'Home address', type: 'text', required: false, docRequirement: 'none', tags: ['identity'] },
  A1_signature: { id: 'A1_signature', section: 'A', text: 'Digital signature (draw or upload an image/PDF of your signature)', type: 'file', accept: ['image/*','application/pdf'], required: false, docRequirement: 'document-optional', tags: ['identity','signature'] },
  A1_self_photo: { id: 'A1_self_photo', section: 'A', text: 'Latest personal photo (selfie) for identity verification', type: 'file', accept: ['image/*'], required: false, docRequirement: 'document-optional', tags: ['identity','photo'] },
  A2_employment_status: { id: 'A2_employment_status', section: 'A', text: 'Employment status at time of incident (employee / self-employed / volunteer / student / unemployed)', type: 'radio', options: ['employee','self-employed','volunteer','student','unemployed','other'], required: true, docRequirement: 'none', tags: ['eligibility'] },
  A3_employer_name: { id: 'A3_employer_name', section: 'A', text: 'Employer name (if applicable)', type: 'text', required: false, docRequirement: 'none', tags: ['employment'] },
  A4_representation: { id: 'A4_representation', section: 'A', text: 'Are you represented by an attorney or agent?', type: 'yes-no', required: false, docRequirement: 'none', tags: ['eligibility'] },

  // Section B — Incident / Circumstances
  B1_date_of_injury: { id: 'B1_date_of_injury', section: 'B', text: 'Date of injury or onset', type: 'date', required: true, docRequirement: 'none', tags: ['circumstances'] },
  B1_location: { id: 'B1_location', section: 'B', text: 'Location of incident (address, site, workplace)', type: 'text', required: false, docRequirement: 'none', tags: ['circumstances'] },
  B2_description: { id: 'B2_description', section: 'B', text: 'Describe events leading to the injury/condition (sudden, gradual, exposure, repetitive)', type: 'textarea', required: true, docRequirement: 'none', tags: ['circumstances'] },
  B3_mechanism: { id: 'B3_mechanism', section: 'B', text: 'Mechanism or cause of injury (fall, impact, overexertion, chemical, noise, infection, other)', type: 'radio', options: ['fall','impact','overexertion','chemical','noise','infection','other'], required: true, docRequirement: 'none', tags: ['circumstances'] },
  B4_reported_to_employer: { id: 'B4_reported_to_employer', section: 'B', text: 'Was the incident reported to employer or supervisor? Provide date/details if yes.', type: 'text', required: false, docRequirement: 'none', tags: ['circumstances'] },
  B5_witnesses: { id: 'B5_witnesses', section: 'B', text: 'Were there any witnesses? Provide names/contact if known.', type: 'text', required: false, docRequirement: 'none', tags: ['circumstances'] },

  // Section C — Documents / Proof
  C1_medical_records: { id: 'C1_medical_records', section: 'C', text: 'Do you have medical records (hospital/clinic notes, discharge summaries)?', type: 'yes-no', required: true, docRequirement: 'document-optional', tags: ['documents','medical'] },
  C2_employer_confirmation: { id: 'C2_employer_confirmation', section: 'C', text: 'Employer confirmation / incident report (if available)', type: 'file', required: false, docRequirement: 'document-optional', tags: ['documents','employment'] },
  C3_pay_slips: { id: 'C3_pay_slips', section: 'C', text: 'Recent pay slips or income proof', type: 'file', required: false, docRequirement: 'document-optional', tags: ['documents','income'] },
  C4_police_report: { id: 'C4_police_report', section: 'C', text: 'Police report (if incident involved police)', type: 'file', required: false, docRequirement: 'document-optional', tags: ['documents'] },
  C5_other_documents: { id: 'C5_other_documents', section: 'C', text: 'Any other supporting documents (photos, screenshots, correspondence)', type: 'file', required: false, docRequirement: 'document-optional', tags: ['documents'] },

  // Section D — Committee / Appointment readiness
  D1_attendance: { id: 'D1_attendance', section: 'D', text: 'Are you able to attend an in-person committee appointment?', type: 'yes-no', required: true, docRequirement: 'none', tags: ['committee'] },
  D2_mobility_needs: { id: 'D2_mobility_needs', section: 'D', text: 'Do you need transport assistance or home visit (accessibility needs)?', type: 'yes-no', required: false, docRequirement: 'none', tags: ['committee'] },
  D3_language_needs: { id: 'D3_language_needs', section: 'D', text: 'Do you require an interpreter or language assistance?', type: 'yes-no', required: false, docRequirement: 'none', tags: ['committee'] },

  // Section E — Impairments & Functional Limitations
  E1_affected_body_parts: { id: 'E1_affected_body_parts', section: 'E', text: 'Which body parts/organs are affected?', type: 'text', required: true, docRequirement: 'none', tags: ['medical'] },
  E2_diagnosis: { id: 'E2_diagnosis', section: 'E', text: 'Primary diagnosis (if known)', type: 'text', required: false, docRequirement: 'document-optional', tags: ['medical'] },
  E3_functional_limitations: { id: 'E3_functional_limitations', section: 'E', text: 'Describe functional limitations (mobility, lifting, walking, daily activities)', type: 'textarea', required: true, docRequirement: 'none', tags: ['medical'] },
  E4_pain_level: { id: 'E4_pain_level', section: 'E', text: 'Current pain severity (0-10)', type: 'number', required: false, docRequirement: 'none', tags: ['medical'] },

  // Section F — Medical History & Treatment
  F1_prior_conditions: { id: 'F1_prior_conditions', section: 'F', text: 'Do you have prior medical conditions relevant to this claim?', type: 'yes-no', required: false, docRequirement: 'none', tags: ['medical','history'] },
  F2_current_treatment: { id: 'F2_current_treatment', section: 'F', text: 'Are you currently undergoing treatment (physio, surgery, medication)? Provide details.', type: 'textarea', required: false, docRequirement: 'document-optional', tags: ['medical','treatment'] },
  F3_medication_list: { id: 'F3_medication_list', section: 'F', text: 'List current medications', type: 'text', required: false, docRequirement: 'none', tags: ['medical'] },

  // Section G — Work & Earnings
  G1_occupation: { id: 'G1_occupation', section: 'G', text: 'What was your occupation / role at the time of incident?', type: 'text', required: false, docRequirement: 'none', tags: ['employment'] },
  G2_ability_to_work: { id: 'G2_ability_to_work', section: 'G', text: 'Are you currently able to work? If partially, describe limitations.', type: 'textarea', required: false, docRequirement: 'none', tags: ['employment'] },
  G3_income_loss: { id: 'G3_income_loss', section: 'G', text: 'Have you experienced income loss due to the condition? Estimate monthly loss.', type: 'text', required: false, docRequirement: 'document-optional', tags: ['income'] },

  // Section H — Witnesses / Third Parties
  H1_witness_statements: { id: 'H1_witness_statements', section: 'H', text: 'Do you have witness statements or contact details?', type: 'text', required: false, docRequirement: 'document-optional', tags: ['witnesses'] },

  // Section I — Previous Claims / Benefits
  I1_previous_claims: { id: 'I1_previous_claims', section: 'I', text: 'Have you filed previous claims or received related benefits?', type: 'yes-no', required: false, docRequirement: 'none', tags: ['history'] },
  I2_related_benefits: { id: 'I2_related_benefits', section: 'I', text: 'List any related benefits or awards (dates and amounts if known)', type: 'text', required: false, docRequirement: 'none', tags: ['history'] },
}

export const START_SEQUENCE: string[] = [
  'A1_full_name', 'A1_id_number', 'A1_dob', 'A2_employment_status',
  'B1_date_of_injury', 'B2_description', 'B3_mechanism', 'E1_affected_body_parts', 'E3_functional_limitations'
]

export default { QUESTION_CATALOG, START_SEQUENCE }
