/**
 * Case status constants — single source of truth for all status strings
 * used by the backend and frontend.
 */

export const CASE_STATUS = {
  // Initial / document gathering
  NEW: 'new',
  SUBMISSION_PENDING: 'Submission Pending',
  STRATEGY_GENERATED: 'strategy_generated',

  // BTL decision outcomes
  CLAIM_APPROVED: 'claim_approved',
  CLAIM_REJECTED: 'claim_rejected',
  WAITING_FOR_DOCS: 'waiting_for_docs',

  // Rehabilitation flow
  REHAB_APPROVED: 'rehab_approved',
  REHAB_PAYMENT_UPDATE: 'rehab_payment_update',
  REHAB_PAYMENT_PENDING: 'rehab_payment_pending',
  REHAB_AGREEMENT_SIGNED: 'rehab_agreement_signed',

  // Form actions
  FORM_PENDING: 'form_pending',
  FORM_270_SUBMITTED: 'form_270_submitted',

  // Other
  APPOINTMENT_SCHEDULED: 'appointment_scheduled',
  APPEAL_PENDING: 'appeal_pending',
  INFORMATIONAL: 'informational',
} as const

export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS]

/** True if the status represents a terminal BTL approval/rejection. */
export function isDecisionStatus(status: string): boolean {
  const statuses: string[] = [
    CASE_STATUS.CLAIM_APPROVED,
    CASE_STATUS.CLAIM_REJECTED,
    CASE_STATUS.REHAB_APPROVED,
    CASE_STATUS.REHAB_PAYMENT_UPDATE,
  ]
  return statuses.includes(status)
}

/** True if the status belongs to the rehabilitation sub-flow. */
export function isRehabStatus(status: string): boolean {
  const statuses: string[] = [
    CASE_STATUS.REHAB_APPROVED,
    CASE_STATUS.REHAB_PAYMENT_UPDATE,
    CASE_STATUS.REHAB_PAYMENT_PENDING,
    CASE_STATUS.REHAB_AGREEMENT_SIGNED,
    CASE_STATUS.FORM_270_SUBMITTED,
  ]
  return statuses.includes(status)
}
