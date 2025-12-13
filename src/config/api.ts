/**
 * API Configuration
 * Centralized configuration for backend API URLs
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
// export const API_BASE_URL = import.meta.env.VITE_API_BASE || 'https://b5e95c8ecce4.ngrok-free.app';

/**
 * Helper function to build API URLs
 */
export const getApiUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
