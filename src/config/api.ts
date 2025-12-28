/**
 * API Configuration
 * Centralized configuration for backend API URLs
 */

// Support both Vite (`import.meta.env.VITE_API_BASE`) and Next/Node (`process.env.NEXT_PUBLIC_API_BASE`).
let _viteBase: string | undefined
try {
  // access in try/catch to avoid runtime ReferenceError in environments without import.meta
  _viteBase = (import.meta as any)?.env?.VITE_API_BASE
} catch (e) {
  _viteBase = undefined
}

export const API_BASE_URL = _viteBase || (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:8000'
// export const API_BASE_URL = import.meta.env.VITE_API_BASE || 'https://b5e95c8ecce4.ngrok-free.app';

/**
 * Helper function to build API URLs
 */
export const getApiUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
