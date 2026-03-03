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
const BACKEND_BASE_URL = "https://api.adhdeal.com";
// const BACKEND_BASE_URL = 'https://claire-camp-nicholas-gently.trycloudflare.com';

// Optional: set a default case id for dev/testing so captured PDFs upload even
// when the web app hasn't sent context yet. Leave empty in production.
const DEFAULT_CASE_ID = '';

// Demo file URLs (served by backend)
const DEMO_PDF_URL = `${BACKEND_BASE_URL}/demo.pdf`;
const DEMO_IMAGE_URL = `${BACKEND_BASE_URL}/demo.jpeg`;

// Export for use in content.js, background.js, popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BACKEND_BASE_URL,
    DEFAULT_CASE_ID,
    DEMO_PDF_URL,
    DEMO_IMAGE_URL
  };
}
