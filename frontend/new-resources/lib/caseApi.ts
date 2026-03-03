/**
 * Client-side helpers for case-related API calls.
 * All paths are relative and rely on Next.js rewrites → backend.
 */

/**
 * Fetch the current case data (first case for the authenticated user).
 * Returns null on error.
 */
export async function fetchUserCase(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch('/api/user/cases')
    if (!res.ok) return null
    const data = await res.json()
    const cases = data.cases || data
    const list = Array.isArray(cases) ? cases : []
    return list[0] ?? null
  } catch {
    return null
  }
}

/** Update the case status and optionally patch metadata. */
export async function updateCaseStatus(
  caseId: string,
  status: string,
  metadataPatch?: Record<string, any>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, metadata_patch: metadataPatch }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Submit a signed rehab agreement. */
export async function submitRehabAgreement(
  caseId: string,
  payload: { signature_data_url?: string; attendance_data?: any; signed_at?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/cases/${caseId}/rehab-agreement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Submit Form 270 data. */
export async function submitForm270(
  caseId: string,
  formData: Record<string, any>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/cases/${caseId}/form-270`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Start the appeal process: resets docs to missing and sets stage=appeal_pending. */
export async function requestAppealLetter(
  caseId: string,
  payload: { rejection_reason?: string; appeal_notes?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/cases/${caseId}/appeal-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Upload a single document file for a case (e.g. during appeal resubmission). */
export async function uploadAppealDocument(
  caseId: string,
  file: File,
  documentName: string
): Promise<{ ok: boolean; data?: any }> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('document_name', documentName)
    form.append('document_type', 'general')
    form.append('confirmed', 'true')
    const res = await fetch(`/cases/${caseId}/documents`, { method: 'POST', body: form })
    const data = res.ok ? await res.json().catch(() => ({})) : {}
    return { ok: res.ok, data }
  } catch {
    return { ok: false }
  }
}

export interface BtlLetterEntry {
  letter_date: string | null
  action_type: string
  title_he: string
  summary: string
  key_data: Record<string, any>
  download_url: string | null
  ts: string
}

/**
 * Derives the sorted-ascending letters list from the case object.
 * Merges `metadata.btl_timeline` events with their corresponding PDF download URLs
 * from `cases.letters.dates[date].items[0].download_url`.
 */
export function deriveCaseLetters(caseObj: Record<string, any>): BtlLetterEntry[] {
  const timeline: any[] = (caseObj?.metadata?.btl_timeline) || []
  const lettersState: Record<string, any> = (caseObj?.letters?.dates) || {}

  const entries: BtlLetterEntry[] = timeline.map((ev: any) => {
    const dateKey = (ev.letter_date || '').slice(0, 10)
    const dateEntry = lettersState[dateKey] || {}
    const items: any[] = dateEntry.items || []
    const download_url = items[0]?.download_url ?? null
    return {
      letter_date: ev.letter_date || null,
      action_type: ev.action_type || 'informational',
      title_he: ev.title_he || 'עדכון מביטוח לאומי',
      summary: ev.summary || '',
      key_data: ev.key_data || {},
      download_url,
      ts: ev.ts || '',
    }
  })

  // Sort ascending by letter_date (oldest first)
  return entries.sort((a, b) => {
    const da = a.letter_date || a.ts || ''
    const db = b.letter_date || b.ts || ''
    return da < db ? -1 : da > db ? 1 : 0
  })
}

/** Mark rehab payment email as sent by the user. */
export async function markRehabPaymentSent(caseId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/cases/${caseId}/rehab-payment-sent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    return res.ok
  } catch {
    return false
  }
}
