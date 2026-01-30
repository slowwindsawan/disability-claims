/**
 * Background Script - Handles file fetching from URLs to avoid CORS restrictions
 * This script runs in the extension's background context with elevated permissions
 * 
 * Configuration is loaded from config.js (imported in manifest as service worker dependency)
 */

console.log('[BACKGROUND.JS] Service worker loaded');
console.log('[BACKGROUND.JS] Backend URL:', typeof BACKEND_BASE_URL !== 'undefined' ? BACKEND_BASE_URL : 'NOT LOADED');

// Store the payload from the frontend
let storedPayload = null;

/**
 * Store payload from frontend for use in content script
 */
function storePayload(payload) {
  console.log('%c[BACKGROUND.JS] ✓✓✓ STORING PAYLOAD FROM FRONTEND', 'color: lime; font-weight: bold; font-size: 14px;');
  console.log('[BACKGROUND.JS] Payload keys:', Object.keys(payload).join(', '));
  console.log('[BACKGROUND.JS] Payload sample:', JSON.stringify({
    firstName: payload.firstName,
    lastName: payload.lastName,
    idNumber: payload.idNumber,
    email: payload.email,
    phoneNumber: payload.phoneNumber
  }, null, 2));
  storedPayload = payload;
  console.log('[BACKGROUND.JS] Payload stored successfully. Current storedPayload is:', storedPayload ? 'SET' : 'NULL');
}

/**
 * Fetch file from URL and convert to File object
 * @param {string} url - URL to fetch the file from
 * @param {string} filename - Name for the file
 * @returns {Promise<Object>} - Object containing file data
 */
async function fetchFileFromUrl(url, filename) {
  try {
    console.log('[BACKGROUND.JS] Fetching file:', { url, filename });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get the blob
    const blob = await response.blob();
    console.log('[BACKGROUND.JS] Blob fetched:', { size: blob.size, type: blob.type });
    
    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Determine MIME type
    let mimeType = blob.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Guess from URL or filename
      if (url.toLowerCase().endsWith('.pdf') || filename.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (url.toLowerCase().match(/\.(jpg|jpeg)$/i) || filename.toLowerCase().match(/\.(jpg|jpeg)$/i)) {
        mimeType = 'image/jpeg';
      } else if (url.toLowerCase().endsWith('.png') || filename.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      } else if (url.toLowerCase().match(/\.(tif|tiff)$/i) || filename.toLowerCase().match(/\.(tif|tiff)$/i)) {
        mimeType = 'image/tiff';
      } else if (url.toLowerCase().endsWith('.gif') || filename.toLowerCase().endsWith('.gif')) {
        mimeType = 'image/gif';
      }
    }
    
    console.log('[BACKGROUND.JS] File prepared:', { 
      filename, 
      mimeType, 
      size: uint8Array.length 
    });
    
    // Return serializable file data
    return {
      success: true,
      file: {
        name: filename,
        type: mimeType,
        data: Array.from(uint8Array), // Convert to regular array for serialization
        size: uint8Array.length
      }
    };
  } catch (error) {
    console.error('[BACKGROUND.JS] Error fetching file:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Message listener - handles requests from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[BACKGROUND.JS] Message received:', request);
  
  // Handle payload storage from popup/frontend
  if (request.action === 'STORE_PAYLOAD') {
    const source = request.source || 'unknown';
    console.log(`[BACKGROUND.JS] ✓ Received STORE_PAYLOAD from ${source}`);
    console.log('[BACKGROUND.JS] Payload object:', request.payload ? 'EXISTS' : 'MISSING');
    if (request.payload) {
      console.log('[BACKGROUND.JS] Payload keys:', Object.keys(request.payload).slice(0, 5).join(', ') + '...');
    }
    storePayload(request.payload);
    console.log('[BACKGROUND.JS] After storePayload, storedPayload is now:', storedPayload ? 'SET' : 'NULL');
    
    sendResponse({ success: true, message: 'Payload stored', stored: true });
    return true;
  }
  
  // Handle legacy frontend submission
  if (request.action === 'SUBMIT_T7801_FORM') {
    console.log('[BACKGROUND.JS] Received T7801 form payload from frontend (legacy)');
    storePayload(request.payload);
    sendResponse({ success: true, message: 'Payload stored' });
    return true;
  }
  
  // Content script loaded - send payload if available
  if (request.action === 'CONTENT_SCRIPT_READY') {
    console.log('[BACKGROUND.JS] Content script ready, checking for payload');
    console.log('[BACKGROUND.JS] Current storedPayload status:', storedPayload ? 'EXISTS' : 'NULL');
    
    if (storedPayload && sender.tab) {
      console.log('%c[BACKGROUND.JS] ✓✓✓ SENDING PAYLOAD TO CONTENT SCRIPT', 'color: lime; font-weight: bold; font-size: 14px;');
      console.log('[BACKGROUND.JS] Payload keys:', Object.keys(storedPayload).length);
      
      const payloadCopy = JSON.parse(JSON.stringify(storedPayload));
      
      // Add small delay to ensure content script message listener is fully registered
      setTimeout(() => {
        // Send to content script with error handling
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'START_FLOW_WITH_PAYLOAD',
          payload: payloadCopy,
          source: 'frontend'  // Changed from 'background-script' to 'frontend' for proper logging
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[BACKGROUND.JS] Error sending to content script:', chrome.runtime.lastError.message);
          } else {
            console.log('[BACKGROUND.JS] Content script received payload:', response);
            // Clear after confirmed delivery
            storedPayload = null;
          }
        });
      }, 300);  // 300ms delay to ensure listener is ready
      
      // Also clear after 10 seconds as fallback (increased from 5)
      setTimeout(() => {
        if (storedPayload) {
          console.log('[BACKGROUND.JS] Timeout - clearing stored payload');
          storedPayload = null;
        }
      }, 10000);
      
      sendResponse({ success: true, message: 'Payload will be sent to content script' });
    } else {
      console.log('[BACKGROUND.JS] No payload to send');
      if (!sender.tab) {
        console.warn('[BACKGROUND.JS] Warning: No sender tab available');
      }
      sendResponse({ success: true, message: 'No payload available' });
    }
    return true;
  }
  
  // Handle explicit payload request from content script (after listener is ready)
  if (request.action === 'REQUEST_PAYLOAD') {
    console.log('[BACKGROUND.JS] Content script requesting payload');
    console.log('[BACKGROUND.JS] Current storedPayload status:', storedPayload ? 'EXISTS' : 'NULL');
    
    if (storedPayload && sender.tab) {
      console.log('%c[BACKGROUND.JS] ✓✓✓ RESPONDING TO PAYLOAD REQUEST', 'color: lime; font-weight: bold; font-size: 14px;');
      console.log('[BACKGROUND.JS] Payload keys:', Object.keys(storedPayload).length);
      
      const payloadCopy = JSON.parse(JSON.stringify(storedPayload));
      
      // Send to content script with error handling
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'START_FLOW_WITH_PAYLOAD',
        payload: payloadCopy,
        source: 'frontend'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[BACKGROUND.JS] Error sending to content script:', chrome.runtime.lastError.message);
        } else {
          console.log('[BACKGROUND.JS] Content script received payload:', response);
          // Clear after confirmed delivery
          storedPayload = null;
        }
      });
      
      sendResponse({ success: true, message: 'Payload sent', hasPayload: true });
    } else {
      console.log('[BACKGROUND.JS] No payload available for request');
      sendResponse({ success: true, message: 'No payload available', hasPayload: false });
    }
    return true;
  }
  
  if (request.action === 'fetchFile') {
    // Handle async operation
    fetchFileFromUrl(request.url, request.filename)
      .then(result => {
        console.log('[BACKGROUND.JS] Sending response:', { 
          success: result.success, 
          hasFile: !!result.file 
        });
        sendResponse(result);
      })
      .catch(error => {
        console.error('[BACKGROUND.JS] Error in fetchFile:', error);
        sendResponse({ 
          success: false, 
          error: String(error) 
        });
      });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
  
  // Handle 7801 submission save with retry logic
  if (request.action === 'SAVE_7801_SUBMISSION') {
    console.log('[BACKGROUND.JS] Received SAVE_7801_SUBMISSION request');
    console.log('[BACKGROUND.JS] Data:', request.data);
    
    saveWithRetry(request.data, 5)
      .then(result => {
        console.log('[BACKGROUND.JS] Save result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[BACKGROUND.JS] Save error:', error);
        sendResponse({ success: false, requiresManual: true });
      });
    
    return true; // Keep channel open for async response
  }
  
  return false;
});

/**
 * Save 7801 submission with retry logic
 * Attempts to save to backend with exponential backoff
 * @param {Object} data - Submission data (user_id, case_id, application_number, page_content, submitted_at)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @returns {Promise<Object>} - {success: boolean, requiresManual: boolean}
 */
async function saveWithRetry(data, maxRetries = 5) {
  const delays = [0, 1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[BACKGROUND.JS] Save attempt ${attempt + 1}/${maxRetries}`);
      
      // Wait before retry (except first attempt)
      if (delays[attempt] > 0) {
        console.log(`[BACKGROUND.JS] Waiting ${delays[attempt]}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
      
      // Make the request
      const response = await fetch(`${BACKEND_BASE_URL}/api/cases/7801-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[BACKGROUND.JS] ✓ Save successful:', result);
        return { success: true, requiresManual: false };
      } else {
        console.warn(`[BACKGROUND.JS] Server returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[BACKGROUND.JS] Attempt ${attempt + 1} failed:`, error);
    }
  }
  
  // All retries failed
  console.error('[BACKGROUND.JS] ✗ All save attempts failed');
  return { success: false, requiresManual: true };
}

console.log('[BACKGROUND.JS] Message listener registered');
