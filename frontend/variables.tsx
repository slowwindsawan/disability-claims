/**
 * Centralized Backend Configuration
 * 
 * This file exports the base URL for the backend API.
 * All components should import this value instead of hardcoding localhost:8000
 * 
 * Usage:
 * import { BACKEND_BASE_URL } from '@/variables'
 * 
 * const apiUrl = `${BACKEND_BASE_URL}/admin/profile`
 */

export const BACKEND_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  process.env.NEXT_PUBLIC_API_BASE || 
  process.env.NEXT_PUBLIC_BACKEND_URL || 
  process.env.REACT_APP_BACKEND_URL || 
  'http://localhost:8000'
