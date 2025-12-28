// API Migration Helper
// This file shows all the API routes that need to be migrated to direct backend calls

export const API_ROUTE_MAPPINGS = {
  // Admin Routes
  '/api/admin/cases': '/admin/cases',
  '/api/admin/cases/work-disability': '/admin/cases/work-disability',
  '/api/admin/cases/filter': '/admin/cases/filter',
  '/api/admin/claims-table': '/admin/claims-table',
  '/api/admin/analytics': '/admin/analytics',
  '/api/admin/filters': '/admin/filters',
  
  // Document Analysis Routes
  '/api/analyze-documents': '/analyze-documents',
  '/api/analyze-documents-form7801': '/analyze-documents-form7801',
  '/api/analyze-form-7801': '/analyze-form-7801',
  '/api/submit-form-7801': '/submit-form-7801',
  
  // User Routes
  '/api/user/cases': '/user/cases',
  '/api/user/profile': '/user/profile',
}

// Helper function for API calls with automatic backend URL
import { BACKEND_BASE_URL } from '@/variables'

interface ApiFetchOptions extends RequestInit {
  token?: string
}

/**
 * Helper function to make API calls to the backend
 * Automatically prepends BACKEND_BASE_URL and adds authorization header if token is provided
 * 
 * @param endpoint - The API endpoint (e.g., '/admin/cases' or '/api/admin/cases')
 * @param options - Fetch options including optional token for authorization
 * @returns Promise with the fetch response
 * 
 * @example
 * // With token from localStorage
 * const token = localStorage.getItem('access_token')
 * const response = await apiFetch('/admin/cases', { token })
 * 
 * // With custom options
 * const response = await apiFetch('/admin/cases', {
 *   token,
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * })
 */
export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  const { token, headers = {}, ...fetchOptions } = options
  
  // Remove /api prefix if present (for backward compatibility)
  const cleanEndpoint = endpoint.replace(/^\/api/, '')
  
  // Build URL
  const url = `${BACKEND_BASE_URL}${cleanEndpoint}`
  
  // Build headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }
  
  // Add authorization header if token is provided
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }
  
  // Make the request
  return fetch(url, {
    ...fetchOptions,
    headers: requestHeaders,
  })
}

/**
 * Helper to get token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * Convenience wrapper for authenticated API calls
 * Automatically gets token from localStorage
 * 
 * @example
 * const response = await authFetch('/admin/cases')
 * const data = await response.json()
 */
export async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken()
  return apiFetch(endpoint, { ...options, token: token || undefined })
}
