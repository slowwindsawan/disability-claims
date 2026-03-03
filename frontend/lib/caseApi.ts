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

/** Request an appeal letter (marks case as appeal_pending). */
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

/** Upload a single document file for a case (e.g. during appeal resubmission). */
export async function uploadAppealDocument(
  caseId: string,
  file: File,
  documentName: string
): Promise<{ ok: boolean; data?: any }> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_name', documentName)
    const res = await fetch(`/api/cases/${caseId}/documents`, {
      method: 'POST',
      body: fd,
    })
    const data = res.ok ? await res.json().catch(() => null) : null
    return { ok: res.ok, data }
  } catch {
    return { ok: false }
  }
}

/** Shape of a single BTL letter entry derived from case data. */
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
 * Merge btl_timeline entries with their corresponding PDF download URLs.
 * Returns letters sorted ascending by date (oldest → newest).
 */
export function deriveCaseLetters(caseObj: Record<string, any>): BtlLetterEntry[] {
  const timeline: any[] = (caseObj?.metadata?.btl_timeline ?? []) as any[]
  const lettersBlob: Record<string, any> = caseObj?.letters ?? {}
  const dateItems: Record<string, any[]> = lettersBlob?.dates ?? {}

  const entries: BtlLetterEntry[] = timeline.map((entry: any) => {
    const dateKey: string = (entry.letter_date || '').slice(0, 10)
    const items: any[] = dateKey ? (dateItems[dateKey]?.items ?? []) : []
    const downloadUrl: string | null = items[0]?.download_url ?? null

    return {
      letter_date: entry.letter_date ?? null,
      action_type: entry.action_type ?? 'informational',
      title_he: entry.title_he ?? entry.action_type ?? '',
      summary: entry.summary ?? '',
      key_data: entry.key_data ?? {},
      download_url: downloadUrl,
      ts: entry.ts ?? entry.letter_date ?? '',
    }
  })

  // Sort ascending (oldest first)
  return entries.sort((a, b) => {
    const da = a.letter_date ?? a.ts ?? ''
    const db = b.letter_date ?? b.ts ?? ''
    return da < db ? -1 : da > db ? 1 : 0
  })
}
