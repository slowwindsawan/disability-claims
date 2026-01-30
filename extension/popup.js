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

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('startBtn');
  const status = document.getElementById('status');

  const targetUrl = 'https://govforms.gov.il/mw/forms/T7801@btl.gov.il';

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
});

