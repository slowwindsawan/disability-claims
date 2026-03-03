/**
 * Background Script - Handles file fetching from URLs to avoid CORS restrictions
 * This script runs in the extension's background context with elevated permissions
 *
 * Note: load config.js here so BACKEND_BASE_URL and demo URLs exist in the
 * service worker scope. Without this import the fetch calls would throw
 * ReferenceError and nothing would reach the backend.
 */

// Load shared configuration (injects BACKEND_BASE_URL into this scope)
try {
  importScripts('config.js');
} catch (err) {
  console.error('[BACKGROUND.JS] Failed to import config.js:', err);
}

console.log('[BACKGROUND.JS] Service worker loaded');
console.log('[BACKGROUND.JS] Backend URL:', typeof BACKEND_BASE_URL !== 'undefined' ? BACKEND_BASE_URL : 'NOT LOADED');

// Store the payload from the frontend
let storedPayload = null;
// Store the Phase 2 payload for T270 form auto-fill
let storedPhase2Payload = null;

// Daily letters sync constants
const DAILY_ALARM_NAME = 'BTL_LETTERS_DAILY';
const STORAGE_KEYS = {
  caseContext: 'btl_case_context',
  lastLettersSync: 'btl_letters_last_sync'
};
const BTL_LOGIN_URL = 'https://ps.btl.gov.il/#/login?ReturnUrl=%2FMy%2FMichtavim%2FAll';

// ─── FILE ANALYSIS LIMIT ────────────────────────────────────────────────────
// Maximum number of new letters to download and analyze per sync.
// Set to 1 to process only the most recent unseen letter each time.
// Increase (e.g. 5) to process more in one go, or set to null for no cap.
const MAX_LETTERS_PER_SYNC = 100;
const pendingLetterMeta = {};

// Basic promise wrappers for chrome.storage
const storage = {
  async get(key) {
    if (!chrome.storage?.local) return null;
    return new Promise((resolve) => chrome.storage.local.get(key, (res) => resolve(res[key])));
  },
  async set(key, value) {
    if (!chrome.storage?.local) return;
    return new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
  }
};

function bufferToBase64(buffer) {
  try {
    let bytes;
    if (buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(buffer);
    } else if (ArrayBuffer.isView(buffer)) {
      bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else if (buffer && typeof buffer === 'object' && Array.isArray(buffer.data)) {
      bytes = new Uint8Array(buffer.data);
    } else {
      return '';
    }

    if (!bytes || !bytes.length) return '';

    const chunkSize = 0x8000; // 32KB chunks to avoid call stack / string limits
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...sub);
    }

    return btoa(binary);
  } catch (err) {
    console.error('[BACKGROUND.JS] bufferToBase64 failed', err);
    return '';
  }
}

// === ONE-SHOT PDF VERIFICATION LOG ===
function verifyPDF(request) {
  let bytes;

  if (request.arrayBuffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(request.arrayBuffer);
    console.log("[VERIFY] Using request.arrayBuffer");
  } else if (Array.isArray(request.data)) {
    bytes = new Uint8Array(request.data);
    console.log("[VERIFY] Using request.data array");
  } else {
    console.error("[VERIFY] ❌ No PDF bytes found at all");
    return;
  }

  console.log("[VERIFY] Byte length:", bytes.length);

  const hex = Array.from(bytes.slice(0, 16))
    .map(b => b.toString(16).padStart(2, "0"))
    .join(" ");
  console.log("[VERIFY] First 16 bytes (hex):", hex);

  try {
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    console.log("[VERIFY] Header:", header); // should be "%PDF-"
  } catch (e) {
    console.warn("[VERIFY] Could not decode header", e);
  }

  // Base64 roundtrip check
  const b64 = bufferToBase64(bytes);
  console.log("[VERIFY] Base64 length:", b64.length);

  try {
    const bin = atob(b64);
    const rt = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) rt[i] = bin.charCodeAt(i);

    const rtHex = Array.from(rt.slice(0, 16))
      .map(b => b.toString(16).padStart(2, "0"))
      .join(" ");
    const rtHeader = new TextDecoder().decode(rt.slice(0, 5));

    console.log("[VERIFY] Roundtrip first 16 bytes (hex):", rtHex);
    console.log("[VERIFY] Roundtrip header:", rtHeader); // should be "%PDF-"
  } catch (e) {
    console.error("[VERIFY] Base64 roundtrip failed", e);
  }

  // Visual test (copy this into new tab)
  console.log("[VERIFY] Open to test PDF:", "data:application/pdf;base64," + b64);
}

function isTodayIso(iso) {
  if (!iso) return false;
  try {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  } catch (err) {
    console.warn('[BACKGROUND.JS] isTodayIso error', err);
    return false;
  }
}

async function saveCaseContext(payload) {
  if (!payload) return;
  const ctx = {
    user_id: payload.user_id || payload.userId || null,
    case_id: payload.case_id || payload.caseId || null,
    lab_limit: payload.lab_limit ? parseInt(payload.lab_limit, 10) : null,
    updated_at: new Date().toISOString()
  };
  await storage.set(STORAGE_KEYS.caseContext, ctx);
  console.log('[BACKGROUND.JS] Case context stored for daily sync:', ctx);
}

async function getCaseContext() {
  const ctx = await storage.get(STORAGE_KEYS.caseContext);
  if (ctx && ctx.case_id) return ctx;

  // Dev fallback: allow DEFAULT_CASE_ID from config.js to keep uploads working
  try {
    if (typeof DEFAULT_CASE_ID !== 'undefined' && DEFAULT_CASE_ID) {
      const fallback = { user_id: null, case_id: DEFAULT_CASE_ID, updated_at: new Date().toISOString() };
      console.warn('[BACKGROUND.JS] Using DEFAULT_CASE_ID fallback from config.js');
      return fallback;
    }
  } catch (err) {
    console.warn('[BACKGROUND.JS] DEFAULT_CASE_ID check failed', err);
  }

  return ctx || null;
}

async function setLastLettersSync(dateIso) {
  if (!dateIso) return;
  await storage.set(STORAGE_KEYS.lastLettersSync, dateIso);
}

async function getLastLettersSync() {
  return await storage.get(STORAGE_KEYS.lastLettersSync);
}

function scheduleDailyLettersPrompt() {
  if (!chrome.alarms) return;
  chrome.alarms.create(DAILY_ALARM_NAME, { delayInMinutes: 1, periodInMinutes: 24 * 60 });
  console.log('[BACKGROUND.JS] Daily letters alarm scheduled');
}

async function handleDailyAlarm() {
  if (!chrome.notifications) return;
  const ctx = await getCaseContext();
  if (!ctx || !ctx.case_id) {
    console.warn('[BACKGROUND.JS] No case context available for daily letters sync');
    return;
  }

  const last = await getLastLettersSync();
  if (isTodayIso(last)) {
    console.log('[BACKGROUND.JS] Letters already synced today, skipping prompt');
    return;
  }

  // Store the notification ID so the top-level listeners can match it even after SW restart
  const notifId = `letters-sync-${Date.now()}`;
  await storage.set('btl_pending_notif_id', notifId);

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: 'demo.jpeg',
    title: 'Check new BTL letters',
    message: 'Run daily sync to capture new letters and dates?',
    requireInteraction: true,
    buttons: [
      { title: 'Run update now' },
      { title: 'Skip today' }
    ],
    priority: 2
  });
  console.log('[BACKGROUND.JS] Daily letters notification shown:', notifId);
}

// ── Top-level notification listeners ──────────────────────────────────────────
// MUST be at top level so they survive service-worker restarts.
// When the SW sleeps and wakes on a notification click these are re-registered.
if (chrome.notifications) {
  chrome.notifications.onButtonClicked.addListener((id, btnIdx) => {
    if (!id.startsWith('letters-sync-')) return;
    console.log('[BACKGROUND.JS] Notification button clicked:', id, 'btn:', btnIdx);
    if (btnIdx === 0) {
      startLettersSyncFlow('notification').catch((err) => console.error('[BACKGROUND.JS] Letters sync start failed', err));
    } else if (btnIdx === 1) {
      setLastLettersSync(new Date().toISOString());
      console.log('[BACKGROUND.JS] User skipped daily sync');
    }
    chrome.notifications.clear(id);
    storage.set('btl_pending_notif_id', null);
  });

  chrome.notifications.onClicked.addListener((id) => {
    if (!id.startsWith('letters-sync-')) return;
    console.log('[BACKGROUND.JS] Notification body clicked:', id);
    startLettersSyncFlow('notification').catch((err) => console.error('[BACKGROUND.JS] Letters sync start failed', err));
    chrome.notifications.clear(id);
    storage.set('btl_pending_notif_id', null);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleDailyLettersPrompt();
});

if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === DAILY_ALARM_NAME) {
      handleDailyAlarm();
    }
  });
}

// Ensure alarm exists even after service worker restarts
scheduleDailyLettersPrompt();

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
  saveCaseContext(payload).catch((err) => console.warn('[BACKGROUND.JS] Failed to persist case context', err));
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

async function fetchExistingLetters(caseId) {
  if (!caseId) return { letters: {} };
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/cases/${caseId}/letters`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[BACKGROUND.JS] Failed to fetch existing letters', err);
    return { letters: {} };
  }
}

function sendLettersSyncMessage(tabId, payload, attempt = 1, maxAttempts = 25) {
  if (!tabId) return;
  console.log(`[BACKGROUND.JS] Sending SYNC_LETTERS attempt ${attempt}/${maxAttempts}`);
  chrome.tabs.sendMessage(tabId, payload, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      if (attempt >= maxAttempts) {
        console.error('[BACKGROUND.JS] SYNC_LETTERS failed after retries', chrome.runtime.lastError || response);
        return;
      }
      setTimeout(() => sendLettersSyncMessage(tabId, payload, attempt + 1, maxAttempts), 600);
      return;
    }
    console.log('[BACKGROUND.JS] SYNC_LETTERS command accepted');
  });
}

function sendRunCheckStatus(tabId, attempt = 1, maxAttempts = 25) {
  if (!tabId) return;
  console.log(`[BACKGROUND.JS] Sending RUN_CHECK_STATUS attempt ${attempt}/${maxAttempts}`);
  chrome.tabs.sendMessage(tabId, { action: 'RUN_CHECK_STATUS' }, (response) => {
    if (chrome.runtime.lastError || !response || response.success === false) {
      if (attempt >= maxAttempts) {
        console.error('[BACKGROUND.JS] RUN_CHECK_STATUS failed after retries', chrome.runtime.lastError || response);
        return;
      }
      setTimeout(() => sendRunCheckStatus(tabId, attempt + 1, maxAttempts), 600);
      return;
    }
    console.log('[BACKGROUND.JS] RUN_CHECK_STATUS accepted');
  });
}

async function openOrFocusLettersTab(ctx, existingLetters, trigger) {
  // Write the sync request to storage BEFORE opening the tab.
  // The content script reads this on load and self-starts — no race with message passing.
  await storage.set('btl_pending_sync', {
    caseId: ctx.case_id,
    existingLetters: existingLetters || {},
    syncedAt: new Date().toISOString(),
    trigger,
    limit: ctx.lab_limit || MAX_LETTERS_PER_SYNC,
    requestedAt: Date.now()
  });
  console.log('[BACKGROUND.JS] Wrote btl_pending_sync to storage, opening tab...');

  chrome.tabs.query({ url: 'https://ps.btl.gov.il/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true, url: BTL_LOGIN_URL });
    } else {
      chrome.tabs.create({ url: BTL_LOGIN_URL, active: true });
    }
  });
}

function openOrFocusCheckStatus(trigger = 'manual') {
  chrome.tabs.query({ url: 'https://ps.btl.gov.il/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true, url: BTL_LOGIN_URL });
    } else {
      chrome.tabs.create({ url: BTL_LOGIN_URL, active: true });
    }
  });
}

async function startLettersSyncFlow(trigger = 'manual') {
  const ctx = await getCaseContext();
  if (!ctx || !ctx.case_id) {
    console.warn('[BACKGROUND.JS] No case context available for letters sync');
    return;
  }
  const existing = await fetchExistingLetters(ctx.case_id);
  await openOrFocusLettersTab(ctx, existing.letters || {}, trigger);
}

async function startCheckStatusFlow(trigger = 'manual') {
  const ctx = await getCaseContext();
  console.log('[BACKGROUND.JS] Starting check-status flow', { trigger, hasCaseContext: !!ctx?.case_id });
  openOrFocusCheckStatus(trigger);
}

/* ============================================================================
 * T270 tab watcher — triggers phase2 automation when govforms tab is ready
 * ============================================================================
 */
// Track tabs where automation was already sent (reset when tab navigates away or closes)
const phase2TriggeredTabs = new Set();
// Track tabs that completed landing automation and should receive step2 payload on next load
const phase2AwaitingStep2Tabs = new Set();

chrome.tabs.onRemoved.addListener((tabId) => {
  phase2TriggeredTabs.delete(tabId);
  phase2AwaitingStep2Tabs.delete(tabId);
});

function sendPhase2AutomationWithRetry(tabId, attempt = 1, maxAttempts = 20) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { action: 'RUN_PHASE2_AUTOMATION' }, (response) => {
    if (chrome.runtime.lastError) {
      if (attempt < maxAttempts) {
        console.warn(`[BACKGROUND.JS] RUN_PHASE2_AUTOMATION attempt ${attempt} failed, retrying...`, chrome.runtime.lastError.message);
        setTimeout(() => sendPhase2AutomationWithRetry(tabId, attempt + 1, maxAttempts), 600);
      } else {
        console.error('[BACKGROUND.JS] RUN_PHASE2_AUTOMATION failed after all retries for tab', tabId);
      }
      return;
    }
    console.log('[BACKGROUND.JS] ✓ RUN_PHASE2_AUTOMATION sent successfully to tab', tabId, response);
  });
}

function sendPhase2Step2WithRetry(tabId, payload, attempt = 1, maxAttempts = 20) {
  if (!tabId || !payload) return;
  chrome.tabs.sendMessage(tabId, { action: 'RUN_PHASE2_STEP2', payload }, (response) => {
    if (chrome.runtime.lastError) {
      if (attempt < maxAttempts) {
        console.warn(`[BACKGROUND.JS] RUN_PHASE2_STEP2 attempt ${attempt} failed, retrying...`, chrome.runtime.lastError.message);
        setTimeout(() => sendPhase2Step2WithRetry(tabId, payload, attempt + 1, maxAttempts), 600);
      } else {
        console.error('[BACKGROUND.JS] RUN_PHASE2_STEP2 failed after all retries for tab', tabId);
      }
      return;
    }
    console.log('[BACKGROUND.JS] ✓ RUN_PHASE2_STEP2 sent successfully to tab', tabId, response);
    // Payload delivered — clear it so it isn't re-sent
    storedPhase2Payload = null;
    chrome.storage.local.remove('btl_phase2_payload');
    phase2AwaitingStep2Tabs.delete(tabId);
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !tab.url.includes('govforms.gov.il')) return;

  // Treat only the true entry page as "landing": base URL or gbxid=0
  // Form pages (e.g., gbxid=1) must fall through to the Step2 injection branch.
  // Landing page = T270 URL with no gbxid param OR gbxid=0.
  // Pages with gbxid >= 1 are form pages → Step 2 injection.
  let gbxid = null;
  try { gbxid = new URL(tab.url).searchParams.get('gbxid'); } catch (_) {}
  const isT270 = /T270@btl\.gov\.il/i.test(tab.url);
  const isLandingPage = isT270 && (!gbxid || gbxid === '0');

  if (isLandingPage) {
    // ── Landing page: trigger RUN_PHASE2_AUTOMATION ──────────────────────────
    // Reset guard on every landing load (handles Cloudflare → redirect)
    phase2TriggeredTabs.delete(tabId);

    const doTrigger = (payload) => {
      if (!payload) {
        console.log('[BACKGROUND.JS] T270 landing page ready but no phase2 payload — skipping.');
        return;
      }
      if (phase2TriggeredTabs.has(tabId)) {
        console.log('[BACKGROUND.JS] Already triggered for tab', tabId, '— skipping duplicate.');
        return;
      }
      phase2TriggeredTabs.add(tabId);
      // Mark BEFORE sending — even if RUN_PHASE2_AUTOMATION fails (Cloudflare etc.),
      // we still want to inject the payload when the form page eventually loads.
      phase2AwaitingStep2Tabs.add(tabId);
      // Do NOT clear the payload here — keep it for RUN_PHASE2_STEP2 delivery after navigation
      console.log('[BACKGROUND.JS] ✓ T270 landing ready — triggering RUN_PHASE2_AUTOMATION on tab', tabId);
      setTimeout(() => sendPhase2AutomationWithRetry(tabId), 1500);
    };

    if (storedPhase2Payload) {
      doTrigger(storedPhase2Payload);
    } else {
      chrome.storage.local.get('btl_phase2_payload', (res) => {
        doTrigger(res.btl_phase2_payload || null);
      });
    }

  } else if (phase2AwaitingStep2Tabs.has(tabId)) {
    // ── Form page (post-landing navigation): inject payload directly ──────────
    // Mirror exactly what the popup button does with sendStep2Payload after 4s.
    // This is the reliable path — doesn't depend on sessionStorage or tryAutoFillOnLoad.
    console.log('[BACKGROUND.JS] govforms form page loaded on tab', tabId, '— injecting RUN_PHASE2_STEP2 payload');

    const doStep2 = (payload) => {
      if (!payload) {
        console.warn('[BACKGROUND.JS] Phase2 step2: tab was awaiting payload but none found — skipping.');
        phase2AwaitingStep2Tabs.delete(tabId);
        return;
      }
      // Remove immediately so further onUpdated events for this tab don't re-trigger.
      phase2AwaitingStep2Tabs.delete(tabId);
      // Clear stored payload now so it isn't sent again if something else fires.
      storedPhase2Payload = null;
      chrome.storage.local.remove('btl_phase2_payload');
      console.log('[BACKGROUND.JS] ✓ Sending RUN_PHASE2_STEP2 to tab', tabId, 'keys:', Object.keys(payload).join(', '));
      // Short delay so the page/content-script finishes loading
      setTimeout(() => sendPhase2Step2WithRetry(tabId, payload), 1500);
    };

    if (storedPhase2Payload) {
      doStep2(storedPhase2Payload);
    } else {
      chrome.storage.local.get('btl_phase2_payload', (res) => {
        doStep2(res.btl_phase2_payload || null);
      });
    }
  }
});

console.log('[BACKGROUND.JS] T270 tab watcher registered.');

async function persistLettersResult(result, markDone = true) {
  if (!result || !result.caseId) throw new Error('Missing caseId in result');
  const payload = {
    records: result.records || [],
    synced_at: result.syncedAt || new Date().toISOString(),
    source: result.trigger || 'extension'
  };

  const res = await fetch(`${BACKEND_BASE_URL}/api/cases/${result.caseId}/letters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.detail || `HTTP ${res.status}`);
  }

  // Only mark today as done when automation actually ran (not on partial/failed attempts)
  if (markDone) {
    await setLastLettersSync(payload.synced_at);
    console.log('[BACKGROUND.JS] Daily sync marked complete for today');
  } else {
    console.warn('[BACKGROUND.JS] Automation did not confirm completion — NOT marking today as synced');
  }
  return json;
}

function registerLetterMeta(caseId, records) {
  if (!caseId) return;
  pendingLetterMeta[caseId] = {};
  (records || []).forEach((r) => {
    if (typeof r.index === 'number') {
      pendingLetterMeta[caseId][r.index] = r;
    }
  });
  console.log('[BACKGROUND.JS] Registered letter meta for case', caseId, 'count', records?.length || 0);
}

// ─── pageHook — runs in MAIN world (CSP-safe, injected via scripting.executeScript) ───
// This function is serialised and injected into the page context by the INJECT_PAGE_HOOKS handler.
function pageHook() {
  if (window.__BTL_MICHTAVIM_HOOKED__) return;
  window.__BTL_MICHTAVIM_HOOKED__ = true;

  console.log("[BTL-PAGE] Installing SAFE capture hooks (no global blockers)");

  // Helpers
  function isPdfLikeUrl(u) {
    if (!u) return false;
    try { u = String(u).toLowerCase(); } catch { return false; }
    return u.includes("/michtavim/getmichtav") || u.endsWith(".pdf");
  }

  function hexPreview(arrayBuffer, len = 64) {
    try {
      const view = new Uint8Array(arrayBuffer);
      const slice = view.subarray(0, Math.min(len, view.length));
      return Array.from(slice).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch { return ""; }
  }

  function postCaptured(index, meta, arrayBuffer) {
    window.postMessage({ __BTL_PDF_CAPTURED__: true, index, meta, arrayBuffer }, "*");
  }

  // State
  window.__capturedPDFs = window.__capturedPDFs || [];
  let suppressNextOpen = false;

  // Block only window.open when we just captured a PDF
  const realOpen = window.open;
  window.open = function (...args) {
    if (suppressNextOpen) {
      console.log("[BTL-PAGE] ⛔ Blocked window.open() for PDF");
      suppressNextOpen = false;
      return null;
    }
    return realOpen.apply(this, args);
  };

  // ---- XHR hook ----
  (function () {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.___btl_url = String(url || "");
      if (isPdfLikeUrl(this.___btl_url)) {
        console.log("[BTL-PAGE] XHR.open ->", method, this.___btl_url);
      }
      return origOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      const url = this.___btl_url || "";
      if (isPdfLikeUrl(url)) {
        try { this.responseType = "arraybuffer"; } catch { }
        this.addEventListener("load", () => {
          try {
            const buf = this.response;
            if (buf instanceof ArrayBuffer) {
              const blob = new Blob([buf], { type: "application/pdf" });
              const meta = { url, size: blob.size, time: new Date().toISOString(), via: "xhr" };
              const index = window.__capturedPDFs.push(meta) - 1;

              suppressNextOpen = true;

              console.log("[BTL-PAGE] ✅ captured PDF (XHR) meta:", meta);
              console.log("[BTL-PAGE] ✅ Blob:", blob);
              console.log("[BTL-PAGE] ✅ hex preview:", hexPreview(buf, 64));

              postCaptured(index, meta, buf);
            }
          } catch (e) {
            console.error("[BTL-PAGE] XHR capture error", e);
          }
        });
      }
      return origSend.apply(this, args);
    };
  })();

  // ---- fetch hook ----
  (function () {
    if (!window.fetch) return;
    const realFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      const url = (typeof input === "string") ? input : (input && input.url) || "";
      if (isPdfLikeUrl(url)) {
        console.log("[BTL-PAGE] fetch ->", url);
        return realFetch(input, init).then(async (res) => {
          try {
            const clone = res.clone();
            const buf = await clone.arrayBuffer();
            if (buf && buf.byteLength) {
              const blob = new Blob([buf], { type: "application/pdf" });
              const meta = { url, size: blob.size, time: new Date().toISOString(), via: "fetch" };
              const index = window.__capturedPDFs.push(meta) - 1;

              suppressNextOpen = true;

              console.log("[BTL-PAGE] ✅ captured PDF (fetch) meta:", meta);
              console.log("[BTL-PAGE] ✅ Blob:", blob);
              console.log("[BTL-PAGE] ✅ hex preview:", hexPreview(buf, 64));

              postCaptured(index, meta, buf);
            }
          } catch (e) {
            console.error("[BTL-PAGE] fetch capture error", e);
          }
          return res;
        });
      }
      return realFetch(input, init);
    };
  })();

  console.log("[BTL-PAGE] Hooks installed (SAFE mode).");
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
    // If credentials were bundled in the payload, persist them to chrome.storage.local
    if (request.payload?.btl_credentials) {
      storage.set('btl_credentials', request.payload.btl_credentials);
      console.log('[BACKGROUND.JS] btl_credentials saved from STORE_PAYLOAD');
    }
    sendResponse({ success: true, message: 'Payload stored', stored: true });
    return true;
  }

  if (request.action === 'REGISTER_LETTER_FILES') {
    registerLetterMeta(request.caseId, request.records);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'START_LETTERS_SYNC') {
    startLettersSyncFlow('manual-trigger').catch((err) => console.error('[BACKGROUND.JS] START_LETTERS_SYNC failed', err));
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'RUN_CHECK_STATUS') {
    startCheckStatusFlow(request?.trigger || 'manual-trigger').catch((err) => console.error('[BACKGROUND.JS] RUN_CHECK_STATUS failed', err));
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'BTL_PDF_CAPTURED') {
    (async () => {
      try {
        const ctx = await getCaseContext();
        if (!ctx || !ctx.case_id) {
          console.warn('[BACKGROUND.JS] No case context for captured PDF');
          sendResponse({ success: false, error: 'no_case_context' });
          return;
        }

        const arr = request.arrayBuffer || request.data;
        const bufLen = (arr && arr.byteLength) || (arr && arr.length) || (arr && arr.data && arr.data.length) || 0;
        console.log('[BACKGROUND.JS] Captured PDF arrayBuffer info:', { type: arr ? arr.constructor?.name : 'null', byteLength: bufLen, hasDataField: !!request.data });

        const metaMap = pendingLetterMeta[ctx.case_id] || {};
        const letterMeta = metaMap[request.index] || {};
        const fileName = letterMeta?.title ? `${letterMeta.title}.pdf` : `letter_${request.index}.pdf`;
        const bytesArray = Array.isArray(request.data) ? request.data : [];
        console.log('[BACKGROUND.JS] request.data length:', bytesArray.length);

        const base64 = bufferToBase64({ data: bytesArray });
        console.log('[BACKGROUND.JS] base64 length:', base64.length);
        console.log('[BACKGROUND.JS] base64 length:', base64.length);
        const testUrl = "data:application/pdf;base64," + base64;
        console.log("Open this in a new tab to verify PDF:", testUrl);

        // === VERIFY PDF BEFORE SENDING ===
        verifyPDF(request);

        const payload = {
          file_name: fileName,
          file_type: 'application/pdf',
          file_size: request.arrayBuffer?.byteLength || (request.arrayBuffer?.data?.length || 0),
          base64_data: base64,
          user_id: ctx.user_id || null,
          meta: {
            ...letterMeta,
            capture_meta: request.meta
          }
        };

        const res = await fetch(`${BACKEND_BASE_URL}/api/cases/${ctx.case_id}/letters/document`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error('[BACKGROUND.JS] Upload letter failed', res.status, json);
          sendResponse({ success: false, error: json?.detail || res.statusText });
          return;
        }
        if (json.status === 'skipped') {
          console.log('[BACKGROUND.JS] Letter skipped by backend criteria', json.reason);
        } else {
          console.log('[BACKGROUND.JS] Letter uploaded', json.public_url);
        }
        sendResponse({ success: true, result: json });
      } catch (err) {
        console.error('[BACKGROUND.JS] Error handling captured PDF', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true;
  }

  // Return last sync date to the frontend dashboard
  if (request.action === 'GET_SYNC_STATUS') {
    (async () => {
      const lastSync = await getLastLettersSync();
      sendResponse({ success: true, lastSync: lastSync || null });
    })();
    return true;
  }

  // Return stored BTL login credentials to frontend (existence check + values)
  if (request.action === 'GET_CREDENTIALS') {
    (async () => {
      const creds = await storage.get('btl_credentials');
      sendResponse({ success: true, credentials: creds || null });
    })();
    return true;
  }

  // Save BTL login credentials from frontend form
  if (request.action === 'SAVE_CREDENTIALS') {
    (async () => {
      await storage.set('btl_credentials', request.credentials);
      console.log('[BACKGROUND.JS] BTL credentials saved to storage');
      sendResponse({ success: true });
    })();
    return true;
  }

  // Handle letters sync result coming back from content script
  if (request.action === 'LETTERS_SYNC_RESULT') {
    (async () => {
      try {
        const result = request.result || request;
        // Only mark today as synced if automation actually ran through the table.
        // automationRan=true is set by runLettersSync in checkStatus.js.
        // If the flag is missing (old version / partial run), check for defined records array.
        const didRun = result.automationRan === true || Array.isArray(result.records);
        const resp = await persistLettersResult(result, didRun);
        if (sender?.tab?.id && (resp?.added === 0 || resp?.status === 'ok')) {
          chrome.tabs.remove(sender.tab.id);
        }
        sendResponse({ success: true, added: resp?.added || 0, total: resp?.total_items || 0 });
      } catch (err) {
        console.error('[BACKGROUND.JS] Failed to persist letters', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
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

  // Inject pageHook into MAIN world (CSP-safe) for Michtavim PDF capture
  if (request.action === 'INJECT_PAGE_HOOKS') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tabId' });
      return true;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, world: 'MAIN', func: pageHook },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[BACKGROUND.JS] executeScript error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        console.log('[BACKGROUND.JS] pageHook injected into MAIN world for tab', tabId);
        sendResponse({ success: true });
      }
    );
    return true; // async
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

  // Store Phase 2 payload for T270 government form auto-fill
  if (request.action === 'STORE_PHASE2_PAYLOAD') {
    console.log('[BACKGROUND.JS] Received STORE_PHASE2_PAYLOAD request');
    storedPhase2Payload = request.payload;
    // Also persist to storage so the payload survives a service-worker restart
    chrome.storage.local.set({ btl_phase2_payload: request.payload }, () => {
      console.log('[BACKGROUND.JS] Phase 2 payload persisted to storage');
    });
    console.log('[BACKGROUND.JS] Phase 2 payload stored, keys:', Object.keys(request.payload || {}).length);

    // If a T270 landing tab is already open (user clicked the platform button before payload arrived),
    // trigger RUN_PHASE2_AUTOMATION immediately so the new payload is used without requiring a reload.
    try {
      chrome.tabs.query({ url: 'https://govforms.gov.il/mw/forms/*' }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        tabs.forEach((tab) => {
          if (!tab.url) return;
          let _gbxid = null;
          try { _gbxid = new URL(tab.url).searchParams.get('gbxid'); } catch (_) {}
          const isLanding = /T270@btl\.gov\.il/i.test(tab.url) && (!_gbxid || _gbxid === '0');
          if (!isLanding) return;

          // Force a fresh trigger for this tab with the newly stored payload
          phase2TriggeredTabs.delete(tab.id);
          phase2AwaitingStep2Tabs.delete(tab.id);
          phase2AwaitingStep2Tabs.add(tab.id);
          console.log('[BACKGROUND.JS] ✓ Existing T270 tab detected after payload store — triggering RUN_PHASE2_AUTOMATION on tab', tab.id);
          setTimeout(() => sendPhase2AutomationWithRetry(tab.id), 500);
        });
      });
    } catch (err) {
      console.warn('[BACKGROUND.JS] Could not trigger existing T270 tabs after payload store:', err);
    }

    sendResponse({ success: true, message: 'Phase 2 payload stored' });
    return true;
  }

  // Return stored Phase 2 payload to phase2.js content script
  if (request.action === 'REQUEST_PHASE2_PAYLOAD') {
    console.log('[BACKGROUND.JS] Received REQUEST_PHASE2_PAYLOAD request');
    if (storedPhase2Payload) {
      const payload = storedPhase2Payload;
      // DO NOT CLEAR HERE — keep payload until RUN_PHASE2_STEP2 succeeds.
      console.log('[BACKGROUND.JS] Returning Phase 2 payload from memory: EXISTS (payload retained)');
      sendResponse({ success: true, payload });
    } else {
      // Fallback: try chrome.storage (survives service-worker restart)
      chrome.storage.local.get('btl_phase2_payload', (res) => {
        const payload = res.btl_phase2_payload || null;
        // DO NOT CLEAR HERE — keep payload until RUN_PHASE2_STEP2 succeeds.
        console.log('[BACKGROUND.JS] Returning Phase 2 payload from storage:', payload ? 'EXISTS (retained)' : 'NULL');
        // Also mirror into memory so subsequent calls can use it without hitting storage again
        if (payload) storedPhase2Payload = payload;
        sendResponse({ success: true, payload });
      });
    }
    return true;
  }

  // Handle 270 submission save with retry logic
  if (request.action === 'SAVE_270_SUBMISSION') {
    console.log('[BACKGROUND.JS] Received SAVE_270_SUBMISSION request');
    console.log('[BACKGROUND.JS] Data:', request.data);

    save270WithRetry(request.data, 5)
      .then(result => {
        console.log('[BACKGROUND.JS] 270 Save result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[BACKGROUND.JS] 270 Save error:', error);
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

/**
 * Save 270 submission with retry logic
 * Attempts to save to backend with exponential backoff
 * @param {Object} data - Submission data (user_id, case_id, application_number, page_content, submitted_at)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @returns {Promise<Object>} - {success: boolean, requiresManual: boolean}
 */
async function save270WithRetry(data, maxRetries = 5) {
  const delays = [0, 1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[BACKGROUND.JS] 270 Save attempt ${attempt + 1}/${maxRetries}`);

      if (delays[attempt] > 0) {
        console.log(`[BACKGROUND.JS] Waiting ${delays[attempt]}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }

      const response = await fetch(`${BACKEND_BASE_URL}/api/cases/form-270-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[BACKGROUND.JS] ✓ 270 Save successful:', result);
        return { success: true, requiresManual: false };
      } else {
        console.warn(`[BACKGROUND.JS] 270 Server returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[BACKGROUND.JS] 270 Attempt ${attempt + 1} failed:`, error);
    }
  }

  console.error('[BACKGROUND.JS] ✗ All 270 save attempts failed');
  return { success: false, requiresManual: true };
}
