/**
 * Case Status Constants - Frontend
 * Must match backend constants exactly
 */

export const CASE_STATUS = {
  INITIAL_QUESTIONNAIRE: "Initial questionnaire",
  DOCUMENT_SUBMISSION: "Document submission",
  SUBMISSION_PENDING: "Submission pending",
  SUBMITTED: "Submitted",
} as const;

export type CaseStatusType = typeof CASE_STATUS[keyof typeof CASE_STATUS];

export const CASE_STATUS_LIST: CaseStatusType[] = [
  CASE_STATUS.INITIAL_QUESTIONNAIRE,
  CASE_STATUS.DOCUMENT_SUBMISSION,
  CASE_STATUS.SUBMISSION_PENDING,
  CASE_STATUS.SUBMITTED,
];

export const STATUS_COLORS: Record<CaseStatusType, string> = {
  [CASE_STATUS.INITIAL_QUESTIONNAIRE]: "bg-blue-100 text-blue-700",
  [CASE_STATUS.DOCUMENT_SUBMISSION]: "bg-amber-100 text-amber-700",
  [CASE_STATUS.SUBMISSION_PENDING]: "bg-purple-100 text-purple-700",
  [CASE_STATUS.SUBMITTED]: "bg-emerald-100 text-emerald-700",
};

export const STATUS_LABELS: Record<CaseStatusType, string> = {
  [CASE_STATUS.INITIAL_QUESTIONNAIRE]: "שאלון התחלתי",
  [CASE_STATUS.DOCUMENT_SUBMISSION]: "הגשת מסמכים",
  [CASE_STATUS.SUBMISSION_PENDING]: "בהמתנה להגשה",
  [CASE_STATUS.SUBMITTED]: "הוגש",
};

export const STATUS_PROGRESS: Record<CaseStatusType, number> = {
  [CASE_STATUS.INITIAL_QUESTIONNAIRE]: 25,
  [CASE_STATUS.DOCUMENT_SUBMISSION]: 50,
  [CASE_STATUS.SUBMISSION_PENDING]: 75,
  [CASE_STATUS.SUBMITTED]: 100,
};

export interface CaseData {
  id: string;
  user_id: string;
  title?: string;
  description?: string;
  status?: CaseStatusType;
  created_at?: string;
  updated_at?: string;
  user_email?: string;
  user_name?: string;
  user_phone?: string;
  user_photo_url?: string;
  ai_score?: number;
  eligibility_status?: string;
  estimated_claim_amount?: number;
  recent_activity?: string;
  boldsign_document_id?: string;
  signature_status?: string;
  signature_completed_at?: string;
  call_details?: Record<string, any>;
  call_summary?: {
    products?: string[];
    call_summary?: string;
    case_summary?: string;
    degree_funding?: number;
    living_expenses?: number;
    risk_assessment?: string;
    key_legal_points?: string[];
    monthly_allowance?: number;
    income_tax_exemption?: boolean;
    estimated_claim_amount?: number;
    documents_requested_list?: Array<{
      name: string;
      required: boolean;
      where_get: string;
      why_required: string;
    }>;
  };
  document_summaries?: Record<string, any>;
  followups?: Record<string, any>;
}

export function getStatusBadgeClass(status?: string): string {
  return STATUS_COLORS[status as CaseStatusType] || "bg-slate-100 text-slate-700";
}

export function getStatusLabel(status?: string): string {
  return STATUS_LABELS[status as CaseStatusType] || "לא ידוע";
}

export function getStatusProgress(status?: string): number {
  return STATUS_PROGRESS[status as CaseStatusType] || 0;
}

export function getProductsList(callSummary?: any): string[] {
  if (!callSummary || typeof callSummary === "string") {
    try {
      callSummary = typeof callSummary === "string" ? JSON.parse(callSummary) : callSummary;
    } catch {
      return [];
    }
  }
  return callSummary?.products || [];
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("he-IL");
  } catch {
    return "N/A";
  }
}

export function getDocumentCount(documentSummaries?: Record<string, any>): number {
  if (!documentSummaries || typeof documentSummaries === "string") {
    return 0;
  }
  return Object.keys(documentSummaries).length;
}

export function getRequestedDocuments(callSummary?: any): Array<{
  name: string;
  required: boolean;
}> {
  if (!callSummary || typeof callSummary === "string") {
    try {
      callSummary = typeof callSummary === "string" ? JSON.parse(callSummary) : callSummary;
    } catch {
      return [];
    }
  }
  return callSummary?.documents_requested_list || [];
}
