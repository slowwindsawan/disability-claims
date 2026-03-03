// popup.js
// Configuration is loaded from config.js (loaded by popup.html before this script)

// Example payload (same as T7801_DATA in content.js)
const EXAMPLE_PAYLOAD = {
  gender: "1",
  dob: "01/01/1990",
  submitFor: "1",
  firstName: "דוד",
  lastName: "כהן",
  idNumber: "450188354",
  maritalStatus: "גרוש/גרושה ללא ילדים",
  hasSiyua: "2",
  siyuaBody: ["עורך דין", "אחר"],
  siyuaBodyName: "משרד עורך דין כהן",
  phoneNumber: "0501234567",
  repeatMobile: "0501234567",
  otherPhoneNumber: "0501234568",
  email: "test@example.com",
  repeatEmail: "test@example.com",
  smsConfirm: "1",
  differentAddress: false,
  street: "הרצל",
  houseNumber: "123",
  city: "תל אביב-יפו",
  zipCode: "1234567",
  apartment: "5",
  entrance: "א",
  militaryStatusOnDisabilityDate: "שירות סדיר",
  rankOnDisabilityDate: "רב-סרן",
  militaryOnset: "1",
  militaryMedicalRecord: "2",
  otherReports: "1",
  armyFileUrl: DEMO_PDF_URL,
  hasOtherService: "2",
  hasOtherBenefits: "2",
  declarationAgree: true,
  rightsAgree: true,
  signatureFileUrl: DEMO_IMAGE_URL,
  attachments: [
    { name: 'passport-page', fileType: 'image', fileUrl: DEMO_IMAGE_URL },
    { name: 'medical-report', fileType: 'image', fileUrl: DEMO_IMAGE_URL },
    { name: 'consent-form', fileType: 'pdf', fileUrl: DEMO_PDF_URL }
  ]
};

// Example Phase 2 (Step2) payload; replace with real data when available
const PHASE2_STEP2_PAYLOAD = {
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
  idNumber: "123456780",
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
  bankName: "בנק לאומי",
  branchName: "חיפה 123",
  accountNumber: "12345678",
};

// Reads btl_credentials from an open frontend tab's localStorage and saves to chrome.storage.local
async function fetchCredsFromFrontendTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, async (allTabs) => {
      const frontendTab = allTabs.find((tab) => {
        if (!tab.url) return false;
        return (
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(tab.url) ||
          tab.url.includes('netlify.app') ||
          tab.url.includes('vercel.app') ||
          tab.url.includes('trycloudflare.com') ||
          tab.url.includes('app.adhdeal.com')
        );
      });

      if (!frontendTab) {
        console.warn('[POPUP] No open frontend tab found to read credentials from');
        return resolve(null);
      }

      console.log('[POPUP] Reading btl_credentials from frontend tab:', frontendTab.url);

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: frontendTab.id },
          func: () => {
            const raw = localStorage.getItem('btl_credentials');
            return raw ? JSON.parse(raw) : null;
          }
        });
        const creds = results?.[0]?.result;
        if (creds) {
          await chrome.storage.local.set({ btl_credentials: creds });
          console.log('[POPUP] btl_credentials synced from frontend localStorage:', JSON.stringify({ id: creds.id, username: creds.username }));
        } else {
          console.warn('[POPUP] btl_credentials not found in frontend localStorage');
        }
        resolve(creds || null);
      } catch (err) {
        console.warn('[POPUP] Failed to read btl_credentials from frontend tab:', err.message);
        resolve(null);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('startBtn');
  const status = document.getElementById('status');
  const phase2Btn = document.getElementById('phase2Btn');
  const phase2Status = document.getElementById('phase2Status');
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  const checkStatusStatus = document.getElementById('checkStatusStatus');

  const targetUrl = 'https://govforms.gov.il/mw/forms/T7801@btl.gov.il';
  const phase2TargetUrl = 'https://govforms.gov.il/mw/forms/t270@btl.gov.il';
  const checkStatusUrl = 'https://ps.btl.gov.il/#/login';

  btn.addEventListener('click', async () => {
    console.log("[POPUP] ===== BUTTON CLICKED =====");
    status.textContent = 'Sending example payload and opening form...';

    try {
      // First, send example payload to background script
      console.log('[POPUP] Storing example payload in background script');
      chrome.runtime.sendMessage({
        action: 'STORE_PAYLOAD',
        payload: EXAMPLE_PAYLOAD,
        source: 'extension-popup'
      }, (storeResponse) => {
        if (chrome.runtime.lastError) {
          console.error('[POPUP] Error storing payload:', chrome.runtime.lastError);
          status.textContent = 'Error: ' + chrome.runtime.lastError.message;
          return;
        }
        
        console.log('[POPUP] Payload stored:', storeResponse);
        
        // Wait a bit, then query for existing tab or create new one
        setTimeout(() => {
          chrome.tabs.query({ url: targetUrl + '*' }, (tabs) => {
            console.log("[POPUP] Query result - tabs found:", tabs?.length);
            
            if (tabs && tabs.length > 0) {
              // Tab already exists - reload it to trigger fresh flow
              const targetTabId = tabs[0].id;
              console.log("[POPUP] Found existing tab:", targetTabId);
              chrome.tabs.reload(targetTabId, {}, () => {
                chrome.tabs.update(targetTabId, { active: true }, () => {
                  console.log("[POPUP] Tab reloaded and activated");
                  status.textContent = 'Form reloaded! Automation starting...';
                });
              });
            } else {
              // Create new tab
              console.log("[POPUP] Creating new tab");
              chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
                console.log("[POPUP] New tab created with ID:", newTab.id);
                status.textContent = 'Form opened! Automation will start automatically...';
              });
            }
          });
        }, 500); // Wait 500ms before opening tab
      });
    } catch (err) {
      console.error('[POPUP] Error:', err);
      status.textContent = 'Error: ' + err.message;
    }
  });

  phase2Btn.addEventListener('click', () => {
    console.log("[POPUP] Phase 2 button clicked");
    phase2Status.textContent = 'Opening Phase 2 page (T270) with auto-trigger...';

    const phase2UrlWithAutoTrigger = phase2TargetUrl + '?phase2Auto=true';

    // Always store the example Step2 payload before opening the tab, so background
    // has it ready for REQUEST_PHASE2_PAYLOAD / direct injection.
    try {
      chrome.runtime.sendMessage({
        action: 'STORE_PHASE2_PAYLOAD',
        payload: PHASE2_STEP2_PAYLOAD,
        source: 'extension-popup'
      }, (resp) => {
        if (chrome.runtime.lastError) {
          console.warn('[POPUP] Failed to store Phase2 payload:', chrome.runtime.lastError.message);
        } else {
          console.log('[POPUP] Phase2 payload stored (popup)', resp);
        }
      });
    } catch (err) {
      console.warn('[POPUP] Error storing Phase2 payload:', err);
    }

    const startRetries = (tabId, attempt = 1, maxAttempts = 20) => {
      if (!tabId) {
        console.error("[POPUP] No tabId to send Phase 2 command to");
        phase2Status.textContent = 'No tab to send Phase 2 command to.';
        return;
      }

      console.log(`[POPUP] Phase 2 sendMessage attempt ${attempt}/${maxAttempts}`);
      chrome.tabs.sendMessage(
        tabId,
        { action: 'RUN_PHASE2_AUTOMATION', source: 'extension-popup' },
        (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            const errMsg = chrome.runtime.lastError?.message || response?.error || 'Phase 2 script not ready yet';
            console.warn(`[POPUP] Phase 2 attempt ${attempt} failed:`, errMsg);

            if (attempt >= maxAttempts) {
              console.error("[POPUP] Phase 2 failed after max retries");
              phase2Status.textContent = 'Phase 2 failed (content script not ready). Check console logs.';
              return;
            }

            setTimeout(() => startRetries(tabId, attempt + 1, maxAttempts), 750);
            return;
          }

          console.log("[POPUP] Phase 2 command accepted by content script");
          phase2Status.textContent = 'Phase 2 automation is running. Watch the page for clicks.';
        }
      );
    };

    const sendStep2Payload = (tabId, attempt = 1, maxAttempts = 20) => {
      if (!tabId) {
        console.error("[POPUP] sendStep2Payload: No tabId provided");
        return;
      }
      console.log(`[POPUP] STEP2-SEND attempt ${attempt}/${maxAttempts} sending RUN_PHASE2_STEP2 to tab ${tabId}`);
      console.log(`[POPUP] STEP2-SEND payload:`, PHASE2_STEP2_PAYLOAD);
      chrome.tabs.sendMessage(
        tabId,
        { action: 'RUN_PHASE2_STEP2', source: 'extension-popup', payload: PHASE2_STEP2_PAYLOAD },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(`[POPUP] STEP2-SEND attempt ${attempt} ERROR:`, chrome.runtime.lastError.message);
            if (attempt < maxAttempts) {
              setTimeout(() => sendStep2Payload(tabId, attempt + 1, maxAttempts), 750);
            } else {
              console.error("[POPUP] STEP2-SEND failed after max retries");
              phase2Status.textContent = 'Phase 2 Step2 failed - max retries. Check console.';
            }
            return;
          }

          if (!response || !response.success) {
            const errMsg = response?.error || 'Unknown error';
            console.warn(`[POPUP] STEP2-SEND attempt ${attempt} FAILED:`, errMsg);

            if (attempt < maxAttempts) {
              setTimeout(() => sendStep2Payload(tabId, attempt + 1, maxAttempts), 750);
            } else {
              console.error("[POPUP] STEP2-SEND failed after max retries");
              phase2Status.textContent = 'Phase 2 Step2 failed - max retries. Check console.';
            }
            return;
          }

          console.log("[POPUP] STEP2-SEND SUCCESS - response:", response);
          phase2Status.textContent = 'Phase 2 Step2 payload sent. Form should be filling. Check console [STEP2-ELEMENT] logs.';
        }
      );
    };

    const openOrFocusTarget = () => {
      console.log("[POPUP] Querying for existing T270 tabs...");
      chrome.tabs.query({ url: phase2TargetUrl + '*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
          console.log("[POPUP] Found existing tab, reloading with auto-trigger...");
          const tab = tabs[0];
          chrome.tabs.update(tab.id, { active: true, url: phase2UrlWithAutoTrigger }, () => {
            phase2Status.textContent = 'Phase 2 page reloaded with auto-trigger. Waiting...';
            setTimeout(() => {
              startRetries(tab.id);
            }, 500);
            // Send Step 2 payload AFTER a longer delay to allow Phase 2 automation to complete
            setTimeout(() => {
              sendStep2Payload(tab.id);
            }, 4000);
          });
        } else {
          console.log("[POPUP] No existing tab found, creating new one with auto-trigger...");
          chrome.tabs.create({ url: phase2UrlWithAutoTrigger, active: true }, (newTab) => {
            phase2Status.textContent = 'Phase 2 page opened with auto-trigger. Waiting...';
            setTimeout(() => {
              startRetries(newTab?.id);
            }, 500);
            // Send Step 2 payload AFTER a longer delay to allow Phase 2 automation to complete
            setTimeout(() => {
              sendStep2Payload(newTab?.id);
            }, 4000);
          });
        }
      });
    };

    openOrFocusTarget();
  });

  // --- Check Updates button ---
  checkStatusBtn.addEventListener('click', async () => {
    console.log("[POPUP] Check Updates button clicked");
    checkStatusStatus.textContent = 'Reading credentials from frontend...';

    // Sync btl_credentials from an open frontend tab into chrome.storage.local
    const creds = await fetchCredsFromFrontendTab();
    if (creds) {
      checkStatusStatus.textContent = 'Credentials loaded. Opening BTL login page...';
    } else {
      checkStatusStatus.textContent = 'No credentials found in frontend — login may fail. Opening BTL login page...';
    }

    const startRetries = (tabId, attempt = 1, maxAttempts = 30) => {
      if (!tabId) {
        console.error("[POPUP] checkStatus: no tabId");
        checkStatusStatus.textContent = 'Error: no tab ID.';
        return;
      }
      console.log(`[POPUP] checkStatus sendMessage attempt ${attempt}/${maxAttempts}`);
      chrome.tabs.sendMessage(
        tabId,
        { action: 'RUN_CHECK_STATUS', source: 'extension-popup' },
        (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            const errMsg = chrome.runtime.lastError?.message || response?.error || 'Content script not ready yet';
            console.warn(`[POPUP] checkStatus attempt ${attempt} failed:`, errMsg);
            if (attempt >= maxAttempts) {
              checkStatusStatus.textContent = 'Check Updates failed. Content script not ready.';
              return;
            }
            setTimeout(() => startRetries(tabId, attempt + 1, maxAttempts), 750);
            return;
          }
          console.log("[POPUP] checkStatus command accepted");
          checkStatusStatus.textContent = 'Login automation running on BTL page...';
        }
      );
    };

    chrome.tabs.query({ url: 'https://ps.btl.gov.il/*' }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        console.log("[POPUP] Found existing BTL tab, navigating to login...");
        chrome.tabs.update(tab.id, { active: true, url: checkStatusUrl }, () => {
          checkStatusStatus.textContent = 'BTL login page loading...';
          setTimeout(() => startRetries(tab.id), 1500);
        });
      } else {
        console.log("[POPUP] Opening new BTL login tab...");
        chrome.tabs.create({ url: checkStatusUrl, active: true }, (newTab) => {
          checkStatusStatus.textContent = 'BTL login page opened. Waiting for form...';
          setTimeout(() => startRetries(newTab.id), 1500);
        });
      }
    });
  });
});

