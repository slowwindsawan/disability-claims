export type RawStep = string | null | undefined

const STEP_MAP: Record<string, string> = {
  // common backend variants -> frontend OnboardingStep keys
  'voice_agent': 'voice',
  'voice-agent': 'voice',
  'voiceAgent': 'voice',
  'voice': 'voice',
  'payment': 'payment',
  'payments': 'payment',
  'analysis': 'analysis',
  'core_analysis': 'analysis',
  'eligibility': 'eligibility',
  'eligibility_done': 'eligibility',
  'upload': 'upload',
  'documents': 'upload',
  'questionnaire': 'questionnaire',
  'landing': 'landing',
  'signup': 'signup',
  'verify-email': 'verify-email',
  'verify_email': 'verify-email',
  'post-payment': 'post-payment',
  'submission': 'submission',
  'success': 'success'
}

export function normalizeOnboardingStep(raw: RawStep) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  const key = s.replace(/\s+/g, '_')
  if (STEP_MAP[key]) return STEP_MAP[key]
  // try lower-case kebab
  const kebab = s.replace(/\s+/g, '-').toLowerCase()
  if (STEP_MAP[kebab]) return STEP_MAP[kebab]
  // try simple lower-case
  const lower = s.toLowerCase()
  if (STEP_MAP[lower]) return STEP_MAP[lower]
  // fallback: return cleaned lower-case if it matches one of allowed keys
  const allowed = new Set(Object.values(STEP_MAP))
  if (allowed.has(lower)) return lower
  return null
}

export default { normalizeOnboardingStep }
