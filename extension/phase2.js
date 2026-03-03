// PHASE2 + STEP2 — Auto-fill across navigation + double-injection guard
console.log("[PHASE2+STEP2.JS] Script loaded at:", window.location.href);

(function () {
  // --- Guard against double injection ---
  if (window.__BTL_LOADED__) {
    console.log("[BTL] Script already loaded — skipping duplicate injection.");
    return;
  }
  window.__BTL_LOADED__ = true;

  // --- Shared helpers (single copy) ---
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitForSelector(selector, timeout = 30000) {
    console.log(`[WAIT] Waiting for selector: '${selector}' (timeout ${timeout}ms)`);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          console.log(`[WAIT] ✓ Found selector: `, selector, el);
          return el;
        }
      } catch (err) {
        console.warn(`[WAIT] selector query error for '${selector}':`, err);
      }
      await sleep(250);
    }
    const errMsg = `Timeout waiting for selector: '${selector}'`;
    console.warn(`[WAIT] ✗ ${errMsg}`);
    throw new Error(errMsg);
  }

  function humanClick(el) {
    if (!el) {
      console.warn("[CLICK] ✗ Element is null/undefined in humanClick");
      return;
    }
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_) { }
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, rect.left + rect.width / 2);
    const y = Math.max(0, rect.top + rect.height / 2);

    ["mousemove", "mouseover", "mousedown", "mouseup", "click"].forEach((type) => {
      try {
        const evt = new MouseEvent(type, {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        });
        el.dispatchEvent(evt);
      } catch (err) {
        console.warn(`[CLICK] event dispatch '${type}' failed:`, err);
      }
    });
  }

  async function humanType(input, value, delayMin = 60, delayMax = 140) {
    if (!input) {
      console.warn("[TYPE] ✗ input element is null for value:", value);
      return;
    }
    try {
      // Scroll into view
      try {
        input.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        await sleep(200);
      } catch (_) { }

      // Focus input with delay
      input.focus?.();
      await sleep(50);

      // Clear existing value
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(80);

      // Type character by character
      const s = String(value ?? "");
      for (const ch of s) {
        input.value = input.value + ch;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(delayMin + Math.random() * (delayMax - delayMin));
      }

      // Trigger change event
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(150);

      // Trigger blur to finalize and trigger validation
      input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      await sleep(100);
    } catch (err) {
      console.warn("[TYPE] ✗ error typing value:", value, err);
    }
  }

  async function searchSelectAndEnter(containerSelector, text) {
    const selector = `${containerSelector} input`;
    console.log(`[SEARCH] Trying searchSelectAndEnter for '${text}' with container '${containerSelector}'`);
    const input = await waitForSelector(selector);
    await humanType(input, text);
    await sleep(400 + Math.random() * 400);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    console.log(`[SEARCH] Pressed Enter for '${text}' in '${containerSelector}'`);
    await sleep(300);
  }

  /* ============================================================================
   * Progress update helper — relays step messages to the opener/parent window
   * (the frontend rehab-form-270 page shows them in the filling modal)
   * ============================================================================
   */
  function sendProgressUpdate(stage, message) {
    const msg = {
      type: "BTL_EXTENSION_FILLING_STATUS",
      stage,
      message,
      requiresManualAction: false,
      isComplete: false,
      success: false
    };
    try {
      if (window.opener && !window.opener.closed) window.opener.postMessage(msg, "*");
      if (window.parent && window.parent !== window) window.parent.postMessage(msg, "*");
    } catch (_) {}
  }

  /* ============================================================================
   * PHASE 2 automation (waits for specific controls and clicks them)
   * — sets sessionStorage flag so next page will auto-run fillStep2
   * ============================================================================
   */
  async function waitForPageReady() {
    console.log("[PHASE2] Waiting for page ready. Current readyState:", document.readyState);
    if (document.readyState === "complete") {
      console.log("[PHASE2] Page already loaded");
      return;
    }
    await new Promise((resolve) => {
      const onLoad = () => {
        console.log("[PHASE2] Load event fired");
        window.removeEventListener("load", onLoad);
        resolve();
      };
      window.addEventListener("load", onLoad, { once: true });
    });
  }

  async function runPhase2Automation() {
    // Guard against concurrent/duplicate invocations
    if (window.__BTL_PHASE2_RUNNING__) {
      console.warn("[PHASE2] Already running — ignoring duplicate trigger.");
      return { success: false, error: "Already running" };
    }
    window.__BTL_PHASE2_RUNNING__ = true;
    console.log("[PHASE2] ✓ Automation STARTED on", window.location.href);

    try {
      await waitForPageReady();
      console.log("[PHASE2] Page is ready, waiting for elements...");

      // Notify frontend we are waiting — Cloudflare may show a challenge first
      sendProgressUpdate("waiting_for_form", "ממתין לטעינת הטופס — אם מוצגת בדיקת אבטחה, יש להשלים אותה כדי להמשיך...");

      let checkboxFound = false;
      try {
        // Extended to 2 minutes: user may need to solve a Cloudflare challenge manually
        const checkbox = await waitForSelector('input[data-testid="mdiniyutPratiut"]', 120000);
        sendProgressUpdate("phase2_privacy", "מאשר תנאי פרטיות...");
        console.log("[PHASE2] Waiting 800-1500ms before clicking checkbox...");
        await sleep(800 + Math.random() * 700);
        humanClick(checkbox);
        checkboxFound = true;
        console.log("[PHASE2] ✓ Checkbox clicked: data-testid='mdiniyutPratiut'");
      } catch (err) {
        console.error("[PHASE2] ✗ Checkbox step failed:", err.message || err);
      }

      // Only set sessionStorage flag if we actually found and clicked the checkbox.
      // If Cloudflare was shown the checkbox won't be found, so we don't set the flag
      // — the background will re-trigger RUN_PHASE2_AUTOMATION after the redirect.
      if (checkboxFound) {
        try {
          sessionStorage.setItem("btl_auto_fill_after_phase2", "1");
          console.log("[PHASE2] sessionStorage flag set: btl_auto_fill_after_phase2=1");
        } catch (e) {
          console.warn("[PHASE2] Could not set sessionStorage flag:", e);
        }

        try {
          sendProgressUpdate("phase2_enter", "נכנס לטופס...");
          console.log("[PHASE2] Waiting 1000-2000ms before looking for enter button...");
          await sleep(1000 + Math.random() * 1000);
          const enterBtn = await waitForSelector('button[data-testid="enter-service-button"]', 15000);
          humanClick(enterBtn);
          console.log("[PHASE2] ✓ Enter service button clicked: data-testid='enter-service-button'");
        } catch (err) {
          console.error("[PHASE2] ✗ Enter-button step failed:", err.message || err);
        }
      } else {
        console.warn("[PHASE2] Checkbox not found (Cloudflare?) — NOT setting sessionStorage flag. Waiting for page reload after challenge...");
      }

      console.log("[PHASE2] ✓✓✓ AUTOMATION COMPLETE");
      return { success: checkboxFound };
    } catch (error) {
      console.error("[PHASE2] ✗ Automation error:", error);
      return { success: false, error: String(error) };
    } finally {
      window.__BTL_PHASE2_RUNNING__ = false;
    }
  }

  // Expose Phase2
  if (typeof window !== "undefined") {
    window.runPhase2Automation = runPhase2Automation;
    console.log("[PHASE2] Exposed window.runPhase2Automation for manual calls");
  }

  if (typeof chrome !== "undefined" && chrome.runtime) {
    console.log("[PHASE2] Setting up message listener for RUN_PHASE2_AUTOMATION and RUN_PHASE2_STEP2...");
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("[PHASE2] Message received:", request);
      if (!request) return;

      if (request.action === "RUN_PHASE2_AUTOMATION") {
        console.log("[PHASE2] ✓ RUN_PHASE2_AUTOMATION action received, executing...");
        runPhase2Automation()
          .then((res) => {
            console.log("[PHASE2] ✓ Sending success response");
            sendResponse(res || { success: true });
          })
          .catch((err) => {
            console.error("[PHASE2] ✗ Sending error response:", err);
            sendResponse({ success: false, error: String(err) });
          });

        return true; // keep port open for async response
      }

      if (request.action === "RUN_PHASE2_STEP2" && request.payload) {
        console.log("[PHASE2] ✓ RUN_PHASE2_STEP2 action received with payload, calling fillStep2...");
        fillStep2(request.payload)
          .then((res) => {
            console.log("[PHASE2] ✓ fillStep2 completed, sending response:", res);
            sendResponse(res || { success: true });
          })
          .catch((err) => {
            console.error("[PHASE2] ✗ fillStep2 error:", err);
            sendResponse({ success: false, error: String(err) });
          });

        return true; // keep port open for async response
      }

      console.log("[PHASE2] Unrecognized action or no payload, ignoring:", request.action);
    });
    console.log("[PHASE2] ✓ Message listener registered for both actions");

    // Auto-trigger if we detect we're on T270 page and came from popup
    const isT270Form = window.location.href.includes('t270@btl.gov.il');
    const autoTriggerParam = new URLSearchParams(window.location.search).get('phase2Auto');
    if (isT270Form && autoTriggerParam === 'true') {
      console.log("[PHASE2] Auto-trigger detected (phase2Auto=true), running automation...");
      setTimeout(() => runPhase2Automation(), 1000);
    }
  }

  /* ============================================================================
   * STEP 2 FORM FILLER (payload-driven) with enhanced logging
   * (unchanged core, but we will auto-call it on page load when flag present)
   * ============================================================================
   */
  /**
   * startSubmissionMonitor(payload)
   *
   * Watches for the form-submission success screen to appear in the DOM.
   * Target DOM (appears as an in-page React state change, NOT a URL reload):
   *
   *   <div id="SubmitMessage">
   *     <div role="alert">
   *       <p data-testid="submitSuccess">הטופס נשלח בהצלחה</p>
   *       <p>מספר בקשה: 231206</p>
   *     </div>
   *   </div>
   *
   * When detected:
   *   1. Extracts the application number and other submission info as JSON.
   *   2. Sends via chrome.runtime.sendMessage({ action: 'SAVE_7801_SUBMISSION' })
   *      (same path used by content.js → background.js → backend).
   *   3. Sends window.opener/parent.postMessage with BTL_EXTENSION_FILLING_STATUS.
   *   4. Closes this tab after 5 seconds.
   */
  // Shared console style tokens for the submission monitor
  const _SM = {
    info:    "color:#00bcd4;font-size:14px;font-weight:bold;",
    success: "color:#00e676;font-size:15px;font-weight:bold;",
    warn:    "color:#ffab40;font-size:14px;font-weight:bold;",
    error:   "color:#ff5252;font-size:14px;font-weight:bold;",
    close:   "color:#ce93d8;font-size:14px;font-weight:bold;",
    data:    "color:#80cbc4;font-size:13px;font-weight:bold;"
  };

  function startSubmissionMonitor(payload) {
    console.log("%c[SUBMIT-MONITOR] 🔍 Starting submission success observer", _SM.info);

    let handled = false;

    function handleSuccess() {
      if (handled) return;
      handled = true;

      // --- 1. Extract application number ---
      let applicationNumber = null;
      let successMessage = null;

      // Primary: look inside #SubmitMessage
      const submitMessage = document.getElementById("SubmitMessage");
      if (submitMessage) {
        submitMessage.querySelectorAll("p").forEach((p) => {
          const text = (p.textContent || "").trim();
          const match = text.match(/מספר בקשה[:\s]*(\d+)/);
          if (match) applicationNumber = match[1];
          if (p.dataset && p.dataset.testid === "submitSuccess") successMessage = text;
        });
      }

      // Fallback: scan entire document for the number pattern
      if (!applicationNumber) {
        document.querySelectorAll("p").forEach((p) => {
          const m = (p.textContent || "").match(/מספר בקשה[:\s]*(\d+)/);
          if (m) applicationNumber = m[1];
        });
      }

      if (!successMessage) {
        const el = document.querySelector('[data-testid="submitSuccess"]');
        if (el) successMessage = (el.textContent || "").trim();
      }

      // --- 2. Build the submission result JSON ---
      const submissionData = {
        user_id:            (payload && payload.user_id)  || null,
        case_id:            (payload && payload.case_id)  || null,
        application_number: applicationNumber             || "unknown",
        page_content:       (submitMessage ? submitMessage.innerText : document.body.innerText).substring(0, 2000),
        submitted_at:       new Date().toISOString(),
        page_url:           window.location.href,
        success_message:    successMessage || "הטופס נשלח בהצלחה"
      };

      console.log("%c[SUBMIT-MONITOR] ✅ Submission detected! Data:", _SM.success, submissionData);
      console.log(
        "%c  ┌─ application_number : %s\n  ├─ submitted_at       : %s\n  ├─ user_id            : %s\n  ├─ case_id            : %s\n  └─ page_url           : %s",
        _SM.data,
        submissionData.application_number,
        submissionData.submitted_at,
        submissionData.user_id,
        submissionData.case_id,
        submissionData.page_url
      );

      // --- 3a. Send to backend via background.js (same as content.js) ---
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage(
          { action: "SAVE_270_SUBMISSION", data: submissionData },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log("%c[SUBMIT-MONITOR] ✗ sendMessage error: " + chrome.runtime.lastError.message, _SM.error);
              return;
            }
            if (response && response.success) {
              console.log("%c[SUBMIT-MONITOR] ✓ Backend save confirmed ✔", _SM.success);
            } else if (response && response.requiresManual) {
              console.log(
                "%c[SUBMIT-MONITOR] ⚠ Backend save failed after retries — manual update needed. Application number: " + applicationNumber,
                _SM.warn
              );
            }
          }
        );
      }

      // --- 3b. Notify opener/parent window (same shape as sendStatusUpdate in content.js) ---
      const statusPayload = {
        type:               "BTL_EXTENSION_FILLING_STATUS",
        stage:              "submission_complete",
        message:            `הטופס נשלח בהצלחה! מספר בקשה: ${applicationNumber || "לא ידוע"}.`,
        applicationNumber:  applicationNumber || "unknown",
        submittedAt:        submissionData.submitted_at,
        requiresManualAction: false,
        isComplete:         true,
        success:            true
      };

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(statusPayload, "*");
        console.log("%c[SUBMIT-MONITOR] ✓ postMessage → opener", _SM.success);
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(statusPayload, "*");
        console.log("%c[SUBMIT-MONITOR] ✓ postMessage → parent", _SM.success);
      }

      // --- 4. Close this tab after 5 seconds ---
      console.log("%c[SUBMIT-MONITOR] ⏱ Tab will close in 5 seconds...", _SM.close);
      setTimeout(() => {
        console.log("%c[SUBMIT-MONITOR] 🔒 Closing tab now.", _SM.close);
        window.close();
      }, 5000);
    }

    // --- MutationObserver: detects React in-page DOM injection ---
    const observer = new MutationObserver(() => {
      const el = document.getElementById("SubmitMessage")
               || document.querySelector('[data-testid="submitSuccess"]');
      if (el) {
        observer.disconnect();
        clearInterval(urlPoller);
        console.log("%c[SUBMIT-MONITOR] ✓ MutationObserver fired — success DOM detected", _SM.success);
        handleSuccess();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // --- URL poller: fallback for gbxid=success (mirrors content.js) ---
    const urlPoller = setInterval(() => {
      if (window.location.href.includes("gbxid=success")) {
        clearInterval(urlPoller);
        observer.disconnect();
        console.log("%c[SUBMIT-MONITOR] ✓ URL poller fired — gbxid=success detected", _SM.success);
        handleSuccess();
      }
    }, 1500);

    // Auto-stop monitoring after 30 minutes to avoid leaking
    setTimeout(() => {
      if (!handled) {
        observer.disconnect();
        clearInterval(urlPoller);
        console.log("%c[SUBMIT-MONITOR] ⏰ Monitor timed out after 30 minutes", _SM.warn);
      }
    }, 30 * 60 * 1000);
  }

  async function fillStep2(payload) {
    const actions = []; // collect per-field action logs
    const report = { success: true, actions };

    function logAction(field, selector, ok, message, value = undefined) {
      const entry = { field, selector, ok, message };
      if (value !== undefined) entry.value = value;
      actions.push(entry);
      (ok ? console.log : console.warn)(`[STEP2][${ok ? "OK" : "FAIL"}] ${field} — ${message}`, value !== undefined ? value : "");
    }

    try {
      console.log("[STEP2] Automation started", payload);

      // Start watching for the form submission success screen immediately.
      // The observer stays active throughout the entire automation and fires
      // whenever #SubmitMessage or [data-testid="submitSuccess"] appears.
      startSubmissionMonitor(payload);

      sendProgressUpdate("filling_start", "מתחיל למלא את הטופס...");

      // statusMap
      const statusMap = {
        GeneralDisabled: 'input[data-testid="GeneralDisabled"]',
        WorkInjury: 'input[data-testid="WorkInjury"]',
        ZionPrisoner: 'input[data-testid="ZionPrisoner"]',
        Volunteer: 'input[data-testid="Volunteer"]',
        HandicappedPartner: 'input[data-testid="HandicappedPartner"]',
        ParentAChildDied: 'input[data-testid="ParentAChildDied"]',
        Widower: 'input[data-testid="Widower"]',
        HostilitiesVictim: 'input[data-testid="HostilitiesVictim"]',
      };

      for (const key of Object.keys(statusMap)) {
        try {
          if (!payload || !payload.statuses || !(key in payload.statuses)) {
            logAction(key, statusMap[key], true, "Skipped (not provided in payload)");
            continue;
          }
          const shouldCheck = Boolean(payload.statuses[key]);
          const sel = statusMap[key];
          try {
            const el = await waitForSelector(sel, 7000);
            console.log(`[STEP2-ELEMENT] ${key} - Raw element:`, el);
            console.log(`[STEP2-ELEMENT] ${key} - type: ${el.type}, checked: ${el.checked}, value: ${el.value}`);
            const before = !!el.checked;
            if (before !== shouldCheck) {
              humanClick(el);
              await sleep(220 + Math.random() * 250);
              const after = !!el.checked;
              console.log(`[STEP2-ELEMENT] ${key} - After click: checked ${before} -> ${after}`);
              logAction(key, sel, true, `Toggled checkbox from ${before} -> ${after}`, shouldCheck);
            } else {
              console.log(`[STEP2-ELEMENT] ${key} - Already checked as desired`);
              logAction(key, sel, true, `Already in desired state (${before})`, shouldCheck);
            }
          } catch (err) {
            logAction(key, sel, false, `Selector not found or error: ${err.message || err}`);
          }
        } catch (err) {
          logAction(key, statusMap[key], false, `Unhandled error: ${err.message || err}`);
        }
      }

      // filedGeneralDisabilityClaim (radio) — only if GeneralDisabled is false
      try {
        if (!payload.statuses || payload.statuses.GeneralDisabled) {
          logAction('filedGeneralDisabilityClaim', 'radio#id-30', true, "Skipped due to GeneralDisabled === true");
        } else if (!payload.filedGeneralDisabilityClaim) {
          logAction('filedGeneralDisabilityClaim', 'radio#id-30', true, "Skipped (not provided)");
        } else {
          if (payload.filedGeneralDisabilityClaim === "yes") {
            const sel = '#id-30-0-mobxReactForm_1';
            try {
              const yes = await waitForSelector(sel, 7000);
              console.log(`[STEP2-ELEMENT] filedGeneralDisabilityClaim (yes) - Raw element:`, yes);
              console.log(`[STEP2-ELEMENT] filedGeneralDisabilityClaim (yes) - checked before: ${yes.checked}`);
              humanClick(yes);
              await sleep(150 + Math.random() * 200);
              console.log(`[STEP2-ELEMENT] filedGeneralDisabilityClaim (yes) - checked after: ${yes.checked}`);
              logAction('filedGeneralDisabilityClaim', sel, true, "Selected 'yes'", "yes");
            } catch (err) {
              logAction('filedGeneralDisabilityClaim', sel, false, `Could not select 'yes': ${err.message || err}`);
            }
          } else {
            const sel = '#id-30-0-mobxReactForm_2';
            try {
              const no = await waitForSelector(sel, 7000);
              console.log(`[STEP2-ELEMENT] filedGeneralDisabilityClaim (no) - Raw element:`, no);
              console.log(`[STEP2-ELEMENT] filedGeneralDisabilityClaim (no) - checked before: ${no.checked}`);
              humanClick(no);
              await sleep(150 + Math.random() * 200);
              console.log(`[STEP2-ELEMENT] filedGeneralDisabilityClaim (no) - checked after: ${no.checked}`);
              logAction('filedGeneralDisabilityClaim', sel, true, "Selected 'no'", "no");
            } catch (err) {
              logAction('filedGeneralDisabilityClaim', sel, false, `Could not select 'no': ${err.message || err}`);
            }
          }
        }
      } catch (err) {
        logAction('filedGeneralDisabilityClaim', 'radio#id-30', false, `Unhandled error: ${err.message || err}`);
      }

      // Helper to set text inputs with logging
      async function setTextField(fieldName, selector, value) {
        if (value == null || value === "") {
          logAction(fieldName, selector, true, "Skipped (no value provided)");
          return;
        }
        try {
          const el = await waitForSelector(selector, 8000);
          console.log(`[STEP2-ELEMENT] ${fieldName} - Raw element:`, el);
          console.log(`[STEP2-ELEMENT] ${fieldName} - Element visible:`, el.offsetParent !== null);
          console.log(`[STEP2-ELEMENT] ${fieldName} - Before: value="${el.value}", type="${el.type}"`);
          console.log(`[STEP2-ELEMENT] ${fieldName} - Setting value to: "${value}"`);

          // Use humanType for proper human-like input
          await humanType(el, value);

          // Wait a bit after humanType completes
          await sleep(200);

          console.log(`[STEP2-ELEMENT] ${fieldName} - After: value="${el.value}"`);
          console.log(`[STEP2-ELEMENT] ${fieldName} - Value validation: expected="${value}", actual="${el.value}", match=${el.value === value}`);

          logAction(fieldName, selector, true, "Value typed", value);
        } catch (err) {
          console.error(`[STEP2-ELEMENT] ${fieldName} - Error:`, err);
          logAction(fieldName, selector, false, `Failed to set value: ${err.message || err}`, value);
        }
      }

      // Normalize text for comparisons in searchable dropdowns
      function normalizeText(str) {
        return String(str || "").replace(/\s+/g, " ").trim().toLowerCase();
      }

      // Wait for visible rc-select options to appear
      async function getVisibleRcOptions(timeout = 7000) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
          const dropdowns = Array.from(document.querySelectorAll(".rc-select-dropdown"));
          const options = dropdowns.flatMap((dd) =>
            Array.from(dd.querySelectorAll(".rc-select-item-option"))
          );

          const visibleOptions = options.filter((opt) => opt.offsetParent !== null);
          if (visibleOptions.length > 0) {
            return visibleOptions;
          }

          await sleep(200);
        }
        return [];
      }

      // Wait for branch dropdown to be ready after bank selection
      async function waitForBranchDropdownReady(timeout = 10000) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
          const dropdown = document.querySelector('div[data-testid="Localbankname"]');
          if (dropdown) {
            const testCode = dropdown.getAttribute("data-testcode");
            if (testCode && testCode !== "" && testCode !== "-1") {
              return true;
            }
          }

          const options = await getVisibleRcOptions(200);
          if (options.length > 0) {
            return true;
          }

          await sleep(200);
        }
        return false;
      }

      // Other documents helpers (mirrors content.js behavior)
      function getFilenameFromUrl(url, fallback = "document") {
        try {
          const parsed = new URL(url);
          const parts = parsed.pathname.split("/").filter(Boolean);
          if (parts.length) {
            const last = parts[parts.length - 1];
            return decodeURIComponent(last || fallback);
          }
          return fallback;
        } catch (_) {
          return fallback;
        }
      }

      function sanitizeFilename(name, fallback = "document") {
        const cleaned = String(name || "")
          .replace(/[\\/:*?"<>|]/g, "_")
          .trim();
        return cleaned || fallback;
      }

      function ensurePdfName(name, fallback = "document") {
        const base = sanitizeFilename(name, fallback);
        return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
      }

      function showSignatureAlert(stepType) {
        let message = "";
        if (stepType === '1st') {
          message = 'אנא חתום על המסמך וזה אחרי לחץ על כפתור "הבא"\n\nPlease sign the document and then click the "Next" button';
        } else if (stepType === '2nd') {
          message = 'אנא חתום על המסמך וזה אחרי לחץ על כפתור "שליחה"\n\nPlease sign the document and then click the "Send" button';
        }

        if (!message) return;

        console.log("[SIGNATURE] Showing signature alert", { stepType });
        setTimeout(() => {
          try {
            window.alert(message);
          } catch (err) {
            console.warn("[SIGNATURE] Alert failed", err);
          }
        }, 50);
      }

      async function fetchFileFromUrl(url, preferredName = null) {
        const filename = preferredName || getFilenameFromUrl(url, "document");

        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) {
          throw new Error("chrome.runtime.sendMessage unavailable for file fetch");
        }

        const fileData = await new Promise((resolve, reject) => {
          console.log("[OTHER-DOCS] Fetching file via background", { url, filename });
          chrome.runtime.sendMessage(
            { action: "fetchFile", url, filename },
            (response) => {
              if (chrome.runtime.lastError) {
                console.warn("[OTHER-DOCS] fetchFile lastError", chrome.runtime.lastError);
                return reject(new Error(chrome.runtime.lastError.message));
              }
              if (!response || !response.success || !response.file) {
                console.warn("[OTHER-DOCS] fetchFile bad response", response);
                return reject(new Error(response?.error || "Failed to fetch file"));
              }
              resolve(response.file);
            }
          );
        });

        const uint8Array = new Uint8Array(fileData.data);
        const rawName = fileData.name || filename || "document";
        const safeName = ensurePdfName(rawName, "document");

        let mimeType = fileData.type || "";
        if (!mimeType || mimeType === "application/octet-stream") {
          const lowerUrl = (url || "").toLowerCase();
          if (lowerUrl.endsWith(".pdf") || safeName.toLowerCase().endsWith(".pdf")) {
            mimeType = "application/pdf";
          }
        }
        if (!mimeType) {
          mimeType = "application/pdf"; // default to PDF for other-docs inputs
        }

        const blob = new Blob([uint8Array], { type: mimeType });
        return new File([blob], safeName, { type: mimeType });
      }

      async function uploadOtherDocuments(documents = []) {
        if (!Array.isArray(documents) || documents.length === 0) {
          logAction("otherDocuments", "[data-testid=\"otherattach\"]", true, "Skipped (no documents provided)");
          return;
        }

        console.log("[OTHER-DOCS] Starting uploadOtherDocuments", { count: documents.length, docs: documents });

        const normalized = documents.map((doc, idx) => {
          const rawName = doc?.name
            ? String(doc.name)
            : getFilenameFromUrl(doc?.fileUrl || doc?.url || "", `document-${idx + 1}`);
          const safeName = ensurePdfName(rawName, `document-${idx + 1}`);
          return {
            name: safeName,
            fileUrl: doc?.fileUrl || doc?.url || null,
          };
        });

        const waitForCondition = async (predicate, timeout = 5000, interval = 120) => {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            if (predicate()) return true;
            await sleep(interval);
          }
          return false;
        };

        await waitForSelector('[data-testid^="item-repeatedFields-other-"]', 12000)
          .catch(() => waitForSelector('[data-testid="repeatedFields-addButton-other"]', 12000));

        const getSections = () => Array.from(document.querySelectorAll('[data-testid^="item-repeatedFields-other-"]'));
        const getAddButton = () => document.querySelector('[data-testid="repeatedFields-addButton-other"]');

        // Ensure enough sections exist by clicking the add button
        let sections = getSections();
        console.log("[OTHER-DOCS] Sections detected before add", { count: sections.length });
        while (sections.length < normalized.length) {
          const btn = getAddButton();
          if (!btn) {
            throw new Error("Add button not found for other documents");
          }
          humanClick(btn);
          await sleep(250);
          sections = getSections();
          console.log("[OTHER-DOCS] Clicked add, sections now", { count: sections.length });
        }

        for (let i = 0; i < normalized.length; i++) {
          const entry = normalized[i];
          const section = sections[i];
          const sectionId = section?.getAttribute?.("data-testid") || "other-section";

          console.log("[OTHER-DOCS] Processing section", { index: i, sectionId, entry });

          try {
            if (!section) {
              throw new Error("Section not found");
            }

            const fileInput = section.querySelector('input[type="file"][data-testid="otherattach"], input[type="file"][data-testid="OtherAttach"], input[type="file"][data-testid="Otherattach"]');
            if (!fileInput) throw new Error("File input not found");

            const label = section.querySelector(`label[for="${fileInput.id}"]`) || section.querySelector("label");
            if (label) {
              humanClick(label);
              await sleep(60);
            }

            let fileToUpload = null;
            if (entry.fileUrl) {
              try {
                fileToUpload = await fetchFileFromUrl(entry.fileUrl, entry.name);
                console.log("[OTHER-DOCS] Fetched file", { index: i, name: fileToUpload.name, size: fileToUpload.size, type: fileToUpload.type });
              } catch (fetchErr) {
                console.warn("[OTHER-DOCS] Fetch failed", { index: i, error: fetchErr?.message || fetchErr });
              }
            } else {
              console.warn("[OTHER-DOCS] No fileUrl provided", { index: i, entry });
            }

            if (!fileToUpload) {
              throw new Error("File unavailable (missing fileUrl or fetch failed)");
            }

            const dt = new DataTransfer();
            dt.items.add(fileToUpload);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            fileInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

            console.log("[OTHER-DOCS] Dispatched file change", { index: i, filesLen: fileInput.files?.length });

            const fileReady = await waitForCondition(
              () => fileInput.files && fileInput.files.length > 0,
              8000,
              120
            );
            if (!fileReady) {
              throw new Error("File did not attach in time");
            }

            console.log("[OTHER-DOCS] File attached", { index: i, filesLen: fileInput.files.length, name: fileInput.files[0]?.name });

            await waitForCondition(() => {
              const nameEl = section.querySelector('[data-testid="fileName"], ._fileName_1ycd2_205');
              const sizeEl = section.querySelector('[data-testid="fileSize"]');
              return (
                (nameEl && nameEl.textContent.trim().length > 0) ||
                (sizeEl && sizeEl.textContent.trim().length > 0) ||
                (fileInput.files && fileInput.files.length > 0)
              );
            }, 4000, 120);

            console.log("[OTHER-DOCS] UI reflects file", { index: i, sectionId });

            // After upload is confirmed in the UI, wait for the i-th visible document-name
            // input to appear. The name input may live OUTSIDE the section container in
            // terms of DOM ancestry, so we search the whole document and pick by index.
            try {
              console.log("[OTHER-DOCS] Waiting for name input[" + i + "] to appear after upload");
              const deadline = Date.now() + 10000;
              let nameInput = null;
              while (Date.now() < deadline) {
                // Collect ALL visible OtherAttachName inputs in document order
                const allNameInputs = Array.from(
                  document.querySelectorAll(
                    '[data-testid="OtherAttachName"], [data-testid="otherattachname"], [data-testid="Otherattachname"]'
                  )
                ).filter((el) => el.offsetParent !== null);

                // Pick the i-th one (sections are processed one at a time, so index matches)
                if (allNameInputs[i]) {
                  nameInput = allNameInputs[i];
                  break;
                }
                await sleep(200);
              }
              if (nameInput) {
                nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
                await sleep(300);
                await humanType(nameInput, entry.name);
                console.log("[OTHER-DOCS] Typed name into input[" + i + "] after upload", { value: entry.name });
              } else {
                console.warn("[OTHER-DOCS] Name input[" + i + "] did not appear after upload, skipping");
              }
            } catch (nameErr) {
              console.warn("[OTHER-DOCS] Failed to type name after upload", { index: i, error: nameErr?.message || nameErr });
            }

            logAction(`otherDocuments[${i}]`, sectionId, true, `Uploaded ${fileToUpload.name}`, entry.fileUrl || "no-file-url");
          } catch (err) {
            logAction(`otherDocuments[${i}]`, sectionId, false, `Failed to upload: ${err.message || err}`);
            console.warn("[OTHER-DOCS] Upload failed", { index: i, error: err });
          }

          await sleep(150);
        }

        console.log("[OTHER-DOCS] Completed uploadOtherDocuments");
      }

      // Select option from searchable rc-select dropdown by typing and clicking option
      async function selectFromSearchableDropdown(fieldName, containerSelector, value, opts = {}) {
        const {
          fallbackToFirst = false,
          blurAfter = true,
          postSelectWaitMs = 400,
          afterSelect = null,
        } = opts;

        if (value == null || value === "") {
          logAction(fieldName, containerSelector, true, "Skipped (not provided)");
          return;
        }

        try {
          const container = await waitForSelector(containerSelector, 8000);
          const input = container.querySelector("input");
          if (!input) {
            throw new Error("search input not found");
          }

          humanClick(input);
          await sleep(120);
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await sleep(120);
          await humanType(input, value);
          await sleep(350);

          const options = await getVisibleRcOptions();
          if (options.length === 0) {
            throw new Error("no dropdown options visible after typing");
          }

          const target = normalizeText(value);
          let chosen = options.find((opt) => normalizeText(opt.textContent) === target);
          if (!chosen) {
            chosen = options.find((opt) => {
              const txt = normalizeText(opt.textContent);
              return txt.includes(target) || target.includes(txt);
            });
          }

          if (!chosen && fallbackToFirst) {
            chosen = options[0];
          }

          if (!chosen) {
            throw new Error(`option not found for value: ${value}`);
          }

          humanClick(chosen);
          if (blurAfter) {
            try { document.body?.click(); } catch (_) { }
          }
          await sleep(postSelectWaitMs);

          if (typeof afterSelect === "function") {
            try { await afterSelect(); } catch (afterErr) { console.warn("[STEP2] afterSelect error", afterErr); }
          }

          logAction(fieldName, containerSelector, true, "Selected option", chosen.textContent?.trim() || value);
        } catch (err) {
          logAction(fieldName, containerSelector, false, `Failed to select option: ${err.message || err}`, value);
        }
      }

      // Rehab section helper (runs only if payload.rehab exists)
      async function fillRehabSection(rehabPayload) {
        if (!rehabPayload) {
          return { success: true, skipped: true };
        }

        console.log("[REHAB] Starting rehab section automation", rehabPayload);

        // 1) Reason textarea
        if (typeof rehabPayload.shikumReason === "string") {
          const reasonEl = await waitForSelector('textarea[data-testid="ShikumReason"]', 15000);
          await humanType(reasonEl, rehabPayload.shikumReason);
          console.log("[REHAB] ✓ Filled ShikumReason");
        }

        // 2) Wishes textarea
        if (typeof rehabPayload.shikumWishes === "string") {
          const wishesEl = await waitForSelector('textarea[data-testid="ShikumWishes"]', 15000);
          await humanType(wishesEl, rehabPayload.shikumWishes);
          console.log("[REHAB] ✓ Filled ShikumWishes");
        }

        // 3) financeRight radio (data-testid FinanceRight values: 1 yes, 2 no, 3 unknown)
        if (rehabPayload.financeRight) {
          let valueAttr;
          if (rehabPayload.financeRight === "yes") {
            valueAttr = "1";
          } else if (rehabPayload.financeRight === "no") {
            valueAttr = "2";
          } else if (rehabPayload.financeRight === "unknown") {
            valueAttr = "3";
          } else {
            throw new Error("Invalid financeRight value");
          }

          const radioEl = await waitForSelector(`input[data-testid="FinanceRight"][value="${valueAttr}"]`, 12000);
          humanClick(radioEl);
          await sleep(180 + Math.random() * 120);
          console.log("[REHAB] ✓ Selected financeRight =", rehabPayload.financeRight);
        }

        // 4) financeRightFrom checkboxes (only if yes)
        if (rehabPayload.financeRight === "yes") {
          await waitForSelector('div[data-testid="financeRightFrom_GroupName"]', 12000);
          if (Array.isArray(rehabPayload.financeRightFrom)) {
            for (const val of rehabPayload.financeRightFrom) {
              const selector = `input[data-testid="FinanceRightFrom"][value="${val}"]`;
              const cb = await waitForSelector(selector, 8000);
              if (!cb.checked) {
                humanClick(cb);
                await sleep(160 + Math.random() * 160);
              }
              console.log("[REHAB] ✓ Selected FinanceRightFrom", val);
            }
          }

          const hasOther = Array.isArray(rehabPayload.financeRightFrom) && rehabPayload.financeRightFrom.includes(5);
          if (hasOther) {
            if (typeof rehabPayload.explainOther !== "string") {
              throw new Error("financeRightFrom includes 5 but explainOther missing");
            }
            // There may be multiple ExplainOther inputs (e.g., id-34 or id-37). Pick the visible one.
            const explainInputs = Array.from(document.querySelectorAll('input[data-testid="ExplainOther"]'));
            const explainEl = explainInputs.find((el) => el.offsetParent !== null) || explainInputs[0];
            if (!explainEl) {
              throw new Error("ExplainOther input not found");
            }
            await humanType(explainEl, rehabPayload.explainOther);
            console.log("[REHAB] ✓ Filled ExplainOther");
          }
        }

        console.log("[REHAB] ✓✓✓ Rehab section automation COMPLETE");
        return { success: true };
      }

      // Helper: click the rehab confirmation checkbox reliably
      async function clickConfirmRehabilitationPayments(timeout = 15000) {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        async function waitForSelector(selector, timeoutMs) {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const el = document.querySelector(selector);
            if (el) return el;
            await sleep(250);
          }
          throw new Error("Timeout waiting for " + selector);
        }

        function isVisible(el) {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
          const rects = el.getClientRects();
          return rects && rects.length > 0;
        }

        function safeClickCheckbox(inputEl) {
          if (!inputEl) return false;

          // Try label[for=id]
          if (inputEl.id) {
            const label = document.querySelector(`label[for="${inputEl.id}"]`);
            if (label && isVisible(label)) {
              label.scrollIntoView({ behavior: "smooth", block: "center" });
              label.click();
              return true;
            }
          }

          // Try closest label
          const closestLabel = inputEl.closest("label");
          if (closestLabel && isVisible(closestLabel)) {
            closestLabel.scrollIntoView({ behavior: "smooth", block: "center" });
            closestLabel.click();
            return true;
          }

          // Try parent wrappers
          let p = inputEl.parentElement;
          for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
            if (isVisible(p)) {
              p.scrollIntoView({ behavior: "smooth", block: "center" });
              p.click();
              return true;
            }
          }

          // Fallback: dispatch mouse events on the input itself
          inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
          ["mousemove", "mousedown", "mouseup", "click"].forEach(type => {
            inputEl.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        }

        try {
          console.log("[CONFIRM] Waiting for confirmRehabilitationPayments checkbox...");
          const checkbox = await waitForSelector('input[data-testid="confirmRehabilitationPayments"]', timeout);

          console.log("[CONFIRM] Found checkbox. Current checked:", checkbox.checked);

          if (!checkbox.checked) {
            safeClickCheckbox(checkbox);
            await sleep(200);
          }

          console.log("[CONFIRM] After click, checked:", checkbox.checked);

          if (!checkbox.checked) {
            console.warn("[CONFIRM] ⚠ Checkbox still not checked. UI may be blocking interaction.");
            return { success: false, message: "Checkbox not checked after click" };
          }

          console.log("[CONFIRM] ✅ confirmRehabilitationPayments checked successfully");
          return { success: true };
        } catch (err) {
          console.error("[CONFIRM] ❌ Failed to click confirmRehabilitationPayments:", err);
          return { success: false, error: String(err) };
        }
      }

      // Robustly find the "לשלב הבא" button by container, data-testid, aria-label, or visible text; ensure enabled
      async function findNextButton(timeout = 10000) {
        const deadline = Date.now() + timeout;
        const selectors = [
          'div.jss383 button[data-testid="nextButton"]',
          'button[data-testid="nextButton"]',
          'button[aria-label]',
        ];

        while (Date.now() < deadline) {
          for (const sel of selectors) {
            const candidates = Array.from(document.querySelectorAll(sel));
            for (const btn of candidates) {
              const text = (btn.textContent || "").trim();
              const aria = btn.getAttribute("aria-label") || "";
              const matchesText = text.includes("לשלב הבא") || aria.includes("לשלב הבא");
              const visible = btn.offsetParent !== null;
              const disabled = btn.disabled || btn.getAttribute("aria-disabled") === "true";
              if (matchesText && visible && !disabled) {
                return btn;
              }
            }
          }
          await sleep(200);
        }
        throw new Error('"לשלב הבא" button not found, visible, and enabled');
      }

      // 3) personal details
      sendProgressUpdate("filling_personal", "ממלא פרטים אישיים...");
      await setTextField('firstName', 'input[data-testid="Fname"]', payload.firstName);
      await setTextField('lastName', 'input[data-testid="Lname"]', payload.lastName);
      await setTextField('idNumber', 'input[data-testid="Inidnum"]', payload.idNumber);

      // gender radios
      try {
        if (payload.gender === "male") {
          const sel = '#id-14-0-mobxReactForm_1';
          try {
            const male = await waitForSelector(sel, 5000);
            console.log(`[STEP2-ELEMENT] gender (male) - Raw element:`, male);
            console.log(`[STEP2-ELEMENT] gender (male) - checked before: ${male.checked}`);
            humanClick(male);
            await sleep(100);
            console.log(`[STEP2-ELEMENT] gender (male) - checked after: ${male.checked}`);
            logAction('gender', sel, true, "Selected male", "male");
          } catch (err) {
            logAction('gender', sel, false, `Failed to select male: ${err.message || err}`);
          }
        } else if (payload.gender === "female") {
          const sel = '#id-14-0-mobxReactForm_2';
          try {
            const female = await waitForSelector(sel, 5000);
            console.log(`[STEP2-ELEMENT] gender (female) - Raw element:`, female);
            console.log(`[STEP2-ELEMENT] gender (female) - checked before: ${female.checked}`);
            humanClick(female);
            await sleep(100);
            console.log(`[STEP2-ELEMENT] gender (female) - checked after: ${female.checked}`);
            logAction('gender', sel, true, "Selected female", "female");
          } catch (err) {
            logAction('gender', sel, false, `Failed to select female: ${err.message || err}`);
          }
        } else {
          logAction('gender', 'radio#id-14', true, "Skipped (not provided or unknown)");
        }
      } catch (err) {
        logAction('gender', 'radio#id-14', false, `Unhandled gender error: ${err.message || err}`);
      }

      await sleep(180 + Math.random() * 200);

      await setTextField('birthDate', 'input[data-testid="birthDay"]', payload.birthDate);

      // phones
      await setTextField('phone', 'input[data-testid="phoneNumber"]', payload.phone);
      await setTextField('repeatPhone', 'input[data-testid="RepeatMobile"]', payload.repeatPhone);
      await setTextField('otherPhone', 'input[data-testid="OtherphoneNumber"]', payload.otherPhone);

      // email
      await setTextField('email', 'input[data-testid="email"]', payload.email);
      await setTextField('repeatEmail', 'input[data-testid="RepeatEmail"]', payload.repeatEmail);

      // consent checkboxes
      try {
        if (typeof payload.acceptDigital === "boolean") {
          const sel = 'input[data-testid="AcceptDigInfo"]';
          try {
            const el = await waitForSelector(sel, 6000);
            console.log(`[STEP2-ELEMENT] acceptDigital - Raw element:`, el);
            console.log(`[STEP2-ELEMENT] acceptDigital - checked before: ${el.checked}, desired: ${payload.acceptDigital}`);
            const before = !!el.checked;
            if (before !== payload.acceptDigital) {
              humanClick(el);
              await sleep(200);
              console.log(`[STEP2-ELEMENT] acceptDigital - checked after: ${el.checked}`);
            }
            logAction('acceptDigital', sel, true, `Set to ${payload.acceptDigital}`, payload.acceptDigital);
          } catch (err) {
            logAction('acceptDigital', sel, false, `Failed to set: ${err.message || err}`);
          }
        } else {
          logAction('acceptDigital', 'input[data-testid="AcceptDigInfo"]', true, "Skipped (not boolean)");
        }
      } catch (err) {
        logAction('acceptDigital', 'input[data-testid="AcceptDigInfo"]', false, `Unhandled error: ${err.message || err}`);
      }

      try {
        if (typeof payload.otherAddress === "boolean") {
          const sel = 'input[data-testid="OtherAddressCB"]';
          try {
            const el = await waitForSelector(sel, 6000);
            console.log(`[STEP2-ELEMENT] otherAddress - Raw element:`, el);
            console.log(`[STEP2-ELEMENT] otherAddress - checked before: ${el.checked}, desired: ${payload.otherAddress}`);
            const before = !!el.checked;
            if (before !== payload.otherAddress) {
              humanClick(el);
              await sleep(200);
              console.log(`[STEP2-ELEMENT] otherAddress - checked after: ${el.checked}`);
            }
            logAction('otherAddress', sel, true, `Set to ${payload.otherAddress}`, payload.otherAddress);
          } catch (err) {
            logAction('otherAddress', sel, false, `Failed to set: ${err.message || err}`);
          }
        } else {
          logAction('otherAddress', 'input[data-testid="OtherAddressCB"]', true, "Skipped (not boolean)");
        }
      } catch (err) {
        logAction('otherAddress', 'input[data-testid="OtherAddressCB"]', false, `Unhandled error: ${err.message || err}`);
      }

      // Bank details
      sendProgressUpdate("filling_bank", "ממלא פרטי בנק...");
      await setTextField('accountOwnerName', 'input[data-testid="Acowner1"]', payload.accountOwnerName);

      try {
        if (typeof payload.hasOtherOwners === "boolean") {
          const sel = 'input[data-testid="IsAcowner2"]';
          try {
            const el = await waitForSelector(sel, 6000);
            console.log(`[STEP2-ELEMENT] hasOtherOwners - Raw element:`, el);
            console.log(`[STEP2-ELEMENT] hasOtherOwners - checked before: ${el.checked}, desired: ${payload.hasOtherOwners}`);
            const before = !!el.checked;
            if (before !== payload.hasOtherOwners) {
              humanClick(el);
              await sleep(200);
              console.log(`[STEP2-ELEMENT] hasOtherOwners - checked after: ${el.checked}`);
            }
            logAction('hasOtherOwners', sel, true, `Set to ${payload.hasOtherOwners}`, payload.hasOtherOwners);
          } catch (err) {
            logAction('hasOtherOwners', sel, false, `Failed to set: ${err.message || err}`);
          }
        } else {
          logAction('hasOtherOwners', 'input[data-testid="IsAcowner2"]', true, "Skipped (not boolean)");
        }
      } catch (err) {
        logAction('hasOtherOwners', 'input[data-testid="IsAcowner2"]', false, `Unhandled error: ${err.message || err}`);
      }

      await selectFromSearchableDropdown(
        "bankName",
        'div[data-testid="Bankname"]',
        payload.bankName,
        {
          blurAfter: true,
          postSelectWaitMs: 500,
          afterSelect: async () => {
            const ready = await waitForBranchDropdownReady();
            if (!ready) {
              console.warn("[STEP2] Branch dropdown did not signal ready after bank selection");
            }
          },
        }
      );

      await selectFromSearchableDropdown(
        "branchName",
        'div[data-testid="Localbankname"]',
        payload.branchName,
        {
          fallbackToFirst: true,
          blurAfter: true,
          postSelectWaitMs: 400,
        }
      );

      await setTextField('accountNumber', 'input[data-testid="acountnumber"]', payload.accountNumber);

      sendProgressUpdate("filling_next", "עובר לשלב הבא...");

      // Click next step button "לשלב הבא"
      try {
        const nextBtn = await findNextButton(10000);
        console.warn("[STEP2] Found next button:", nextBtn);
        await sleep(200 + Math.random() * 200);
        nextBtn.click();
        logAction('nextButton', 'div.jss383 button[data-testid="nextButton"]', true, 'Clicked "לשלב הבא"');
      } catch (err) {
        logAction('nextButton', 'button[data-testid="nextButton"]', false, `Failed to click next: ${err.message || err}`);
      }

      // Rehab section (post-next page, optional)
      if (payload && payload.rehab) {
        try {
          console.log("[STEP2] Waiting for rehab section to load...");
          await sleep(1200);
          await fillRehabSection(payload.rehab);

          // Click next on rehab page if available
          try {
            // Prefer the last visible next button to avoid earlier steps
            const nextButtons = Array.from(document.querySelectorAll('button[data-testid="nextButton"], button[aria-label]')).filter((btn) => {
              const text = (btn.textContent || "").includes("לשלב הבא") || (btn.getAttribute("aria-label") || "").includes("לשלב הבא");
              return text && btn.offsetParent !== null && !btn.disabled && btn.getAttribute("aria-disabled") !== "true";
            });
            const rehabNextBtn = nextButtons.length ? nextButtons[nextButtons.length - 1] : await findNextButton(15000);

            await sleep(350 + Math.random() * 220);
            humanClick(rehabNextBtn);
            try { rehabNextBtn.click(); } catch (_) { }
            logAction('rehabNextButton', 'button[data-testid="nextButton"]', true, 'Clicked next after rehab');
          } catch (rehabNextErr) {
            logAction('rehabNextButton', 'button[data-testid="nextButton"]', false, `Rehab next click failed: ${rehabNextErr.message || rehabNextErr}`);
          }
        } catch (rehabErr) {
          console.error("[STEP2] Rehab section error:", rehabErr);
          logAction('rehabSection', 'rehab', false, `Rehab fill failed: ${rehabErr.message || rehabErr}`);
        }
      }

      // Wait 2s, confirm checkbox, then click next on rehab page if available
      await sleep(2000);
      try {
        const confirmRes = await clickConfirmRehabilitationPayments();
        if (!confirmRes.success) {
          throw new Error(confirmRes.error || confirmRes.message || "checkbox not checked");
        }
        logAction('confirmRehabPayments', 'input[data-testid="confirmRehabilitationPayments"]', true, 'Checked rehab confirmation');
      } catch (confirmErr) {
        logAction('confirmRehabPayments', 'input[data-testid="confirmRehabilitationPayments"]', false, `Confirm checkbox failed: ${confirmErr.message || confirmErr}`);
      }

      // Click next step button "לשלב הבא"
      try {
        const nextBtn = await findNextButton(10000);
        console.warn("[STEP2] Found next button:", nextBtn);
        await sleep(200 + Math.random() * 200);
        nextBtn.click();
        logAction('nextButton', 'div.jss383 button[data-testid="nextButton"]', true, 'Clicked "לשלב הבא"');
      } catch (err) {
        logAction('nextButton', 'button[data-testid="nextButton"]', false, `Failed to click next: ${err.message || err}`);
      }

      await setFinalDeclarations({
        agreeDeclaration: true,
        refuseDigitalIncome: true
      });

      // Other documents upload (optional, payload.otherDocuments with fileUrl list)
      sendProgressUpdate("filling_documents", "מעלה מסמכים...");
      try {
        await uploadOtherDocuments(payload.otherDocuments);
      } catch (err) {
        logAction('otherDocuments', '[data-testid="repeatedFields-addButton-other"]', false, `Upload failed: ${err.message || err}`);
      }

      // Small pause to ensure UI finishes processing uploads
      await sleep(800);

      console.log("[STEP2] Automation completed. Actions report:", actions);
      return { success: true, actions };
    } catch (err) {
      console.error("[STEP2] Automation failed:", err);
      return { success: false, error: String(err), actions };
    }
  }

  // Example payload (for manual testing)
  const step2ExamplePayload = {
    statuses: {
      GeneralDisabled: false,
      WorkInjury: false,
      ZionPrisoner: false,
      Volunteer: false,
      HandicappedPartner: false,
      ParentAChildDied: false,
      Widower: false,
      HostilitiesVictim: false,
    },
    filedGeneralDisabilityClaim: "no",
    firstName: "דוד",
    lastName: "לוי",
    idNumber: "450188354",
    gender: "male",
    birthDate: "01/01/1980",
    phone: "0501234567",
    repeatPhone: "0501234567",
    otherPhone: "",
    email: "test@example.com",
    repeatEmail: "test@example.com",
    acceptDigital: true,
    otherAddress: false,
    accountOwnerName: "דוד לוי",
    hasOtherOwners: false,
    bankName: "קומרציאל ג'ורדן בנק",
    branchName: "1  -  קומרציאל ג'ורדן בנק",
    accountNumber: "12345678",
    otherDocuments: [
      {
        name: "צילום תעודה",
        fileType: "pdf",
        fileUrl: `${BACKEND_BASE_URL}/dummy2.pdf`
      },
      {
        name: "דו\"ח רפואי",
        fileType: "pdf",
        fileUrl: `${BACKEND_BASE_URL}/dummy2.pdf`
      }
    ],
    rehab: {
      shikumReason: "פגיעה ארוכת טווח שמגבילה את עבודתי. צריך הכשרה מחדש.",
      shikumWishes: "מבקש מסלול בוקר וכיתה נגישת כיסא גלגלים.",
      financeRight: "yes", // "yes" | "no" | "unknown"
      financeRightFrom: [1, 5], // 1-5 as per spec; includes 5=Other
      explainOther: "סיוע מעמותה מקומית"
    },
  };

  // Export to window for external callers (keep same names your other tooling expects)
  window.fillStep2 = fillStep2;
  window.step2ExamplePayload = step2ExamplePayload;

  console.log("[STEP2] Exposed window.fillStep2 and example payload.");

  async function setFinalDeclarations(options = { agreeDeclaration: true, refuseDigitalIncome: false }, timeout = 15000) {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function waitForSelector(selector, timeoutMs) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const el = document.querySelector(selector);
        if (el) return el;
        await sleep(250);
      }
      throw new Error("Timeout waiting for " + selector);
    }

    function isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const rects = el.getClientRects();
      return rects && rects.length > 0;
    }

    function safeToggleCheckbox(inputEl, desired) {
      if (!inputEl) return false;

      if (!!inputEl.checked === desired) {
        return true; // already in desired state
      }

      // Prefer clicking the label
      if (inputEl.id) {
        const label = document.querySelector(`label[for="${inputEl.id}"]`);
        if (label && isVisible(label)) {
          label.scrollIntoView({ behavior: "smooth", block: "center" });
          label.click();
          return true;
        }
      }

      // Fallback: click closest label
      const closestLabel = inputEl.closest("label");
      if (closestLabel && isVisible(closestLabel)) {
        closestLabel.scrollIntoView({ behavior: "smooth", block: "center" });
        closestLabel.click();
        return true;
      }

      // Fallback: click parent wrappers
      let p = inputEl.parentElement;
      for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
        if (isVisible(p)) {
          p.scrollIntoView({ behavior: "smooth", block: "center" });
          p.click();
          return true;
        }
      }

      // Last resort: dispatch mouse events on input
      inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
      ["mousemove", "mousedown", "mouseup", "click"].forEach(type => {
        inputEl.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      });
      return true;
    }

    try {
      console.log("[FINAL] Setting final declarations:", options);

      // 1) Required declaration checkbox (Decheck)
      const agreeEl = await waitForSelector('input[data-testid="Decheck"]', timeout);
      console.log("[FINAL] Decheck before:", agreeEl.checked);

      safeToggleCheckbox(agreeEl, !!options.agreeDeclaration);
      await sleep(200);

      console.log("[FINAL] Decheck after:", agreeEl.checked);
      if (!!agreeEl.checked !== !!options.agreeDeclaration) {
        throw new Error("Failed to set Decheck to " + options.agreeDeclaration);
      }

      // 2) Optional refusal checkbox (Tofes100Disclaimer)
      const refuseEl = await waitForSelector('input[data-testid="Tofes100Disclaimer"]', timeout);
      console.log("[FINAL] Tofes100Disclaimer before:", refuseEl.checked);

      safeToggleCheckbox(refuseEl, !!options.refuseDigitalIncome);
      await sleep(200);

      console.log("[FINAL] Tofes100Disclaimer after:", refuseEl.checked);
      if (!!refuseEl.checked !== !!options.refuseDigitalIncome) {
        throw new Error("Failed to set Tofes100Disclaimer to " + options.refuseDigitalIncome);
      }

      console.log("[FINAL] ✅ Final declarations set successfully");
      return { success: true };
    } catch (err) {
      console.error("[FINAL] ❌ Failed to set final declarations:", err);
      return { success: false, error: String(err) };
    }
  }

  /* ============================================================================
   * Auto-run fillStep2 after navigation if sessionStorage flag was set earlier
   * ============================================================================
   */
  async function tryAutoFillOnLoad(retries = 40, intervalMs = 500) {
    try {
      const flag = sessionStorage.getItem("btl_auto_fill_after_phase2");
      if (!flag) return;
      console.log("[AUTO] Detected btl_auto_fill_after_phase2 flag — will attempt auto-fill.");

      // Wait for page to finish loading (use load event or readyState)
      if (document.readyState !== "complete") {
        await new Promise((resolve) => {
          const onLoad = () => {
            window.removeEventListener("load", onLoad);
            resolve();
          };
          window.addEventListener("load", onLoad, { once: true });
          // also fall back to DOMContentLoaded if load too slow
          setTimeout(resolve, 3000);
        });
      }

      // Wait for actual form elements to appear (Cloudflare challenge may delay this).
      // We poll for any [data-testid] element for up to 2 minutes.
      sendProgressUpdate("waiting_form_page", "ממתין לטעינת הטופס — אם מוצגת בדיקת אבטחה, יש להשלים אותה כדי להמשיך...");
      try {
        await waitForSelector('[data-testid]', 120000);
        console.log("[AUTO] Form page elements detected — proceeding with auto-fill");
      } catch (cfErr) {
        console.warn("[AUTO] Timed out waiting for form elements (Cloudflare?). Attempting fillStep2 anyway.", cfErr);
      }
      for (let i = 0; i < retries; i++) {
        // prefer the exposed fillStep2, otherwise wait for the function to be injected by extension
        if (typeof window.fillStep2 === "function") {
          try {
            console.log(`[AUTO] Calling window.fillStep2() (attempt ${i + 1}/${retries})`);
            // Retrieve the stored payload from background.js
            const payload = await new Promise((resolve) => {
              if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: "REQUEST_PHASE2_PAYLOAD" }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.warn("[AUTO] REQUEST_PHASE2_PAYLOAD error:", chrome.runtime.lastError.message);
                    resolve(null);
                  } else {
                    resolve(response?.payload ?? null);
                  }
                });
              } else {
                resolve(null);
              }
            });
            if (!payload) {
              console.warn("[AUTO] No payload found (REQUEST_PHASE2_PAYLOAD returned null) — aborting auto-fill.");
              sessionStorage.removeItem("btl_auto_fill_after_phase2");
              return;
            }
            console.log(
              "%c[AUTO] ✅ Payload received — keys: " + Object.keys(payload).join(", "),
              "color:#00e676;font-size:13px;font-weight:bold;"
            );
            console.log("%c[AUTO] Full payload:", "color:#80cbc4;font-weight:bold;", JSON.parse(JSON.stringify(payload)));
            // clear the flag immediately to avoid double runs
            sessionStorage.removeItem("btl_auto_fill_after_phase2");
            const res = await window.fillStep2(payload);
            console.log("[AUTO] fillStep2 result:", res);
            return;
          } catch (e) {
            console.warn("[AUTO] fillStep2 threw, retrying:", e);
          }
        }

        // Wait a bit and try again
        await sleep(intervalMs);
      }

      console.warn("[AUTO] Timed out waiting for window.fillStep2 to become available. Clearing flag.");
      sessionStorage.removeItem("btl_auto_fill_after_phase2");
    } catch (e) {
      console.warn("[AUTO] Auto-fill attempt failed:", e);
      try { sessionStorage.removeItem("btl_auto_fill_after_phase2"); } catch (_) { }
    }
  }

  // Run auto-fill checker on load/injection
  tryAutoFillOnLoad().catch((e) => console.warn("[AUTO] tryAutoFillOnLoad error:", e));
})();
