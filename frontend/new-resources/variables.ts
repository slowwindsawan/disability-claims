/**
 * Centralized Backend Configuration
 *
 * All components should import this value instead of hardcoding localhost:8000
 *
 * Usage:
 * import { BACKEND_BASE_URL } from '@/variables'
 *
 * const apiUrl = `${BACKEND_BASE_URL}/cases/${caseId}`
 */

export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
