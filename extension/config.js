/**
 * Extension Configuration
 * 
 * Centralized configuration for the Chrome extension.
 * All hardcoded values should be defined here.
 * 
 * Usage:
 * const { BACKEND_BASE_URL, DEMO_PDF_URL, DEMO_IMAGE_URL } = require('./config');
 */

// Backend API Base URL - Update this single location to change the backend for all extension files
// const BACKEND_BASE_URL = 'http://localhost:8000';
const BACKEND_BASE_URL = 'https://claire-camp-nicholas-gently.trycloudflare.com';

// Demo file URLs (served by backend)
const DEMO_PDF_URL = `${BACKEND_BASE_URL}/demo.pdf`;
const DEMO_IMAGE_URL = `${BACKEND_BASE_URL}/demo.jpeg`;

// Export for use in content.js, background.js, popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BACKEND_BASE_URL,
    DEMO_PDF_URL,
    DEMO_IMAGE_URL
  };
}
