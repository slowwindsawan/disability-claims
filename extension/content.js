/**
 * ============================================================================
 * CONFIGURATION: Flow Definitions, URLs, Test Data, and Steps
 * ============================================================================
 * Add new flows, modify existing ones, or add conditional logic here.
 * Each flow contains URL, test data, and an ordered list of steps to execute.
 */

// Verify content script is loaded
console.log("[CONTENT.JS] Script loaded at:", window.location.href);

// If on localhost, set up postMessage relay to extension and exit
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log("[CONTENT.JS] On localhost - setting up postMessage relay");
  
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;
    
    // Check for our unique action
    if (event.data && event.data.type === 'BTL_EXTENSION_STORE_PAYLOAD') {
      console.log('[CONTENT.JS] ✓ Received BTL_EXTENSION_STORE_PAYLOAD from frontend');
      console.log('[CONTENT.JS] Payload:', event.data.payload);
      
      // Check if chrome.runtime is available
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        console.log('[CONTENT.JS] Chrome runtime available, relaying to background script...');
        
        // Forward to background script
        chrome.runtime.sendMessage({
          action: 'STORE_PAYLOAD',
          payload: event.data.payload,
          source: 'frontend'
        }, (response) => {
          console.log('[CONTENT.JS] Background response:', response);
          
          // Send confirmation back to page
          window.postMessage({
            type: 'BTL_EXTENSION_PAYLOAD_STORED',
            success: response?.success || false,
            message: response?.message || 'Payload stored successfully'
          }, '*');
        });
      } else {
        console.error('[CONTENT.JS] ❌ Chrome runtime not available - extension may not be loaded');
        
        // Send error back to page
        window.postMessage({
          type: 'BTL_EXTENSION_PAYLOAD_STORED',
          success: false,
          message: 'Extension not loaded or chrome.runtime unavailable'
        }, '*');
      }
    }
  });
  
  console.log('[CONTENT.JS] ✓ postMessage relay ready on localhost');
  console.log('[CONTENT.JS] Stopping here - localhost mode, only relay active');
  
  // Exit by throwing to stop further execution (only on localhost)
  throw new Error('Localhost relay mode - stopping execution');
}

// Only run form filling on govforms.gov.il
if (!window.location.hostname.includes('govforms.gov.il')) {
  console.log("[CONTENT.JS] Not on govforms.gov.il, exiting");
  throw new Error('Not on target domain');
}

console.log("[CONTENT.JS] ✅ On govforms.gov.il - initializing form filler...");

/**
 * Send status updates back to the opener/parent window (frontend)
 * @param {string} stage - Current stage of filling
 * @param {string} message - Hebrew message to display to user
 * @param {boolean} requiresManualAction - Whether user needs to intervene
 * @param {boolean} isComplete - Whether the process is complete
 * @param {boolean} success - Whether it completed successfully
 */
function sendStatusUpdate(stage, message, requiresManualAction = false, isComplete = false, success = false) {
  try {
    // Try to send to opener window (if opened by another window)
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'BTL_EXTENSION_FILLING_STATUS',
        stage,
        message,
        requiresManualAction,
        isComplete,
        success
      }, '*');
      console.log(`[CONTENT.JS] Status update sent to opener: ${stage} - ${message}`);
    }
    
    // Also try parent (in case it's an iframe)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'BTL_EXTENSION_FILLING_STATUS',
        stage,
        message,
        requiresManualAction,
        isComplete,
        success
      }, '*');
      console.log(`[CONTENT.JS] Status update sent to parent: ${stage} - ${message}`);
    }
  } catch (error) {
    console.warn('[CONTENT.JS] Could not send status update:', error);
  }
}

/**
 * Wait for success page and extract application number
 * Polls for 30 seconds looking for success URL and application number
 */
async function waitForSuccessPage() {
  console.log('[CONTENT.JS] Starting to wait for success page...');
  const maxAttempts = 30; // 30 seconds
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`[CONTENT.JS] Checking for success page (attempt ${i + 1}/${maxAttempts})...`);
    
    // Check if URL contains success indicator
    if (window.location.href.includes('gbxid=success')) {
      console.log('[CONTENT.JS] ✓ Success URL detected:', window.location.href);
      
      // Try to find application number in page content
      const paragraphs = document.querySelectorAll('p, div, span');
      for (let element of paragraphs) {
        const text = element.textContent || '';
        const match = text.match(/מספר בקשה:\s*(\d+)/);
        
        if (match) {
          const applicationNumber = match[1];
          console.log('[CONTENT.JS] ✓ Application number found:', applicationNumber);
          
          // Capture full page content
          const pageContent = document.documentElement.outerHTML;
          const submitted_at = new Date().toISOString();
          
          return {
            applicationNumber,
            pageContent,
            submitted_at
          };
        }
      }
      
      console.log('[CONTENT.JS] Success URL found but no application number yet, continuing...');
    }
    
    // Wait 1 second before next attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Timeout - no success page detected
  throw new Error('Success page not detected within 30 seconds');
}

/**
 * Handle success page detection and data submission
 * Called by background monitor when success page is detected
 */
async function handleSuccessPageDetection(payload) {
  console.log('[CONTENT.JS] Handling success page detection...');
  sendStatusUpdate(
    'success_detected', 
    'עמוד הצלחה זוהה! מחלץ מידע מהטופס...', 
    false, 
    false, 
    false
  );
  
  try {
    const result = await waitForSuccessPage();
    console.log('[CONTENT.JS] Success page detected:', result);
    
    sendStatusUpdate(
      'saving', 
      `שומר נתונים במערכת (מספר בקשה: ${result.applicationNumber})...`, 
      false, 
      false, 
      false
    );
    
    // Send to background.js for backend save
    chrome.runtime.sendMessage({
      action: 'SAVE_7801_SUBMISSION',
      data: {
        user_id: payload.user_id,
        case_id: payload.case_id,
        application_number: result.applicationNumber,
        page_content: result.pageContent,
        submitted_at: result.submitted_at
      }
    }, (response) => {
      if (response && response.success) {
        sendStatusUpdate(
          'submission_complete', 
          `הטופס נשלח בהצלחה! מספר בקשה: ${result.applicationNumber}. מעביר לעמוד המתנה...`, 
          false, 
          true, 
          true
        );
      } else if (response && response.requiresManual) {
        alert('השמירה האוטומטית נכשלה אחרי 5 ניסיונות.\n\nמספר בקשה: ' + result.applicationNumber + '\n\nאנא שמור מספר זה ועדכן את המערכת ידנית בעמוד המתנה.');
        sendStatusUpdate(
          'manual_required', 
          `נדרשת פעולה ידנית. מספר בקשה: ${result.applicationNumber}. שמור מספר זה ועדכן במערכת.`, 
          true, 
          true, 
          false
        );
      }
    });
  } catch (error) {
    console.error('[CONTENT.JS] Success detection failed:', error);
    alert('לא ניתן לאמת שליחת הטופס תוך 30 שניות.\n\nאם הטופס נשלח בהצלחה, אנא:\n1. שמור את מספר הבקשה מהעמוד\n2. עדכן את המערכת ידנית בעמוד המתנה\n3. העלה צילום מסך של עמוד האישור');
    sendStatusUpdate(
      'submission_failed', 
      'כשל באימות שליחה. אם הטופס נשלח, עדכן את מספר הבקשה ידנית.', 
      true, 
      true, 
      false
    );
  }
}

/**
 * Start background monitoring for success page
 * Continuously watches URL changes to detect success page
 * Only activates on government form URLs (not on localhost)
 */
let successMonitorActive = false;
let successMonitorPayload = null;

function startSuccessPageMonitoring(payload) {
  // Only monitor on government form URLs, not on localhost
  const isGovFormUrl = window.location.href.includes('govforms.gov.il');
  
  if (!isGovFormUrl) {
    console.log('[CONTENT.JS] Success monitor: Not on government form URL, skipping');
    return;
  }
  
  if (successMonitorActive) {
    console.log('[CONTENT.JS] Success monitor already active');
    return;
  }
  
  successMonitorActive = true;
  successMonitorPayload = payload;
  console.log('[CONTENT.JS] 🔍 Starting success page monitoring...');
  
  // Notify user that monitoring is active
  sendStatusUpdate(
    'monitoring_active',
    'המערכת ממתינה לאישור השליחה. אם לחצת על שליחה ידנית, המערכת תזהה את ההצלחה אוטומטית.',
    false,
    false,
    false
  );
  
  // Check URL every 2 seconds
  const monitorInterval = setInterval(() => {
    if (window.location.href.includes('gbxid=success')) {
      console.log('[CONTENT.JS] ✓ Success page detected by monitor!');
      clearInterval(monitorInterval);
      successMonitorActive = false;
      handleSuccessPageDetection(successMonitorPayload);
    }
  }, 2000);
  
  // Stop monitoring after 5 minutes (300 seconds)
  setTimeout(() => {
    if (successMonitorActive) {
      console.log('[CONTENT.JS] Success monitor timeout after 5 minutes');
      clearInterval(monitorInterval);
      successMonitorActive = false;
    }
  }, 300000);
}

// Test data for the 7801 form (no longer auto-used, only via popup button)
const T7801_DATA = {
  gender: "1", // "1" -> זכר, "2" -> נקבה
  dob: "01/01/1990", // DD/MM/YYYY
  submitFor: "1", // "1" -> עבורי (for myself), "2" -> עבור מישהו אחר (for someone else), but 1 is static for now
  firstName: "דוד", // Hebrew letters required
  lastName: "כהן", // Hebrew letters required
  idNumber: "450188354",
  maritalStatus: "גרוש/גרושה ללא ילדים", // Marital status (dropdown) - available options [אלמן/אלמנה, גרוש/גרושה ללא ילדים, גרוש/גרושה עם ילדים, עגון/עגונה, פרוד/פרודה, רווק/רווקה]
  hasSiyua: "2", // "1" -> כן (yes), "2" -> לא (no), mandatory/static is 2 for now
  siyuaBody: ["עורך דין", "אחר"], // Can be string or array of Hebrew labels: בית חולים, יד מכוונת, חברת מימוש זכויות, עורך דין, אחר
  siyuaBodyName: "משרד עורך דין כהן", // Name of the helping body/representative
  phoneNumber: "0501234567", // Mobile phone, this is the compulsory format
  repeatMobile: "0501234567", // Verify mobile phone
  otherPhoneNumber: "0501234568", // Additional phone (optional)
  email: "test@example.com", // Email address
  repeatEmail: "test@example.com", // Verify email
  smsConfirm: "1", // "1" -> כן (yes), "0" -> לא (no), mandatory/static is 1 for now
  differentAddress: true, // true if mailing address is different
  // Mailing address (only if differentAddress is true), always false
  otherCity: "אעצם (שבט)", // City name
  otherStreet: "אעצם (שבט)", // Street name
  otherHome: "123", // House number
  otherApartment: "5", // Apartment number (optional)
  mailBox: "12345", // PO Box (optional)
  // Bank account details
  accountOwnerName: "דוד כהן", // Full name of account holder
  accountOwnerIdNum: "450188354", // ID number of account holder
  isOwner2: false, // Additional account owners
  bankName: "קומרציאל ג'ורדן בנק", // Bank name - full Hebrew name, Alowed names: ["אגוד","אוצר החייל","אלאורדון ואלכווית","אלאסכאן אלאורדוני","אלאסלאמי אלערבי","אלבנק אלערבי","אלדאולי אלפלסטיני","אלראיסי ללתנמיה","אל-אתיחאד ללדיכאר","אלעקרי אלמצרי אלערבי","בנק אלאהלי אלאורדוני","בנק אלקהירה- עמאן","בנק דקסיה ישראל בע\"מ","בנק ישראל","Citibank","דיסקונט","הדואר","הבינלאומי הראשון","הפועלים","HSBC Bank plc","HSBC בנק מזרח תיכון","חסך","יהב","ירושלים","יובנק","לאומי","מ.ס.ב","מרכנתיל דיסקונט","מסד","מזרחי טפחות","SBI State Bank of India","Standard Chartered","פאג\"י","פועלים שוקי הון","קומרציאל ג'ורדן בנק","קונטיננטל לישראל","ש.ב.א","וואן זירו הבנק הדיגיטלי בע\"מ"]

  localBankName: "1  -  קומרציאל ג'ורדן בנק", // Branch name - exact text with branch number. Each local branch name is unique per bank (see banks.json for full list) based on bankName and their respective branches.
  accountNumber: "123456", // Account number
  // Employment data (last 15 months)
  kindComplaint: "1", // Work status: "1" -> לא עבדתי כלל, "2" -> עבדתי והפסקתי לעבוד, "3" -> אני עובד, here but only לא עבדתי כלל and עבדתי והפסקתי לעבוד are allowed, means only 1 and 2.
  notWorkingReason: "מחלה שמנעה ממני לעבוד", // Reason for not working (only if kindComplaint is "1" or "2")
  workingAs: "1", // Working as: "1" -> שכיר, "2" -> עצמאי, "3" -> עצמאי ושכיר (only if kindComplaint is "3")
  gotSickPayYN: "1", // Sick pay: "1" -> לא (No), "2" -> כן מהמעסיק (Yes, from employer). Note: Only values 1 and 2 are allowed. it means "In the last 15 months, I have received sick pay for periods when I did not work, or any payment from an insurance company due to illness"
  otherIncome: "1", // Other income: "1" -> לא, "2" -> כן. but only 1 is allowed.
  // Disease/Illness data (פרטי המחלה/ליקוי)


  // Allowed disease values: "אחר", "בעיה נפשית (מקבל טיפול)", "הפרעות בבלוטת התריס", "יתר לחץ דם", "ליקוי שכלי", "ליקוי שמיעה", "ליקויי ראיה ומחלת עיניים", "מחלה אורטופדית (גפיים עליונות ותחתונות, גב, צוואר, דלקת פרקים)", "מחלות בתחום נוירולוגי (כולל אלצהיימר, פרקינסון, אפילפסיה ואירוע מוחי)"
  diseases: [
    {
      disease: "בעיה נפשית (מקבל טיפול)",
      date: "01/01/2023", // DD/MM/YYYY
      hospitalized: true, // Was hospitalized, only check if the user was ever hospitalized for this disease
      uploadHospitalFile: true, // Upload hospital document, only if hospitalized = true
      hospitalFileUrl: "http://localhost:8000/demo.pdf", // URL to hospital file (PDF)
      sawSpecialist: true, // Saw specialist doctor, only check if user saw a specialist for this disease
      uploadSpecialistFile: true, // Upload specialist document, only if sawSpecialist = true
      specialistFileUrl: "http://localhost:8000/demo.jpeg", // URL to specialist file (image)
      otherDescription: "פירוט נוסף על המחלה" // Additional description only if disease is "אחר"
    },
    {
      disease: "יתר לחץ דם",
      date: "15/06/2023",
      hospitalized: false,
      uploadHospitalFile: false,
      sawSpecialist: true,
      uploadSpecialistFile: true,
      specialistFileUrl: "http://localhost:8000/demo.jpeg",
      otherDescription: "טיפול תרופתי קבוע"
    }
  ],// Array of disease objects. Each must have: disease (string), date, hospitalized, uploadHospitalFile, hospitalFileUrl (if uploading), sawSpecialist, uploadSpecialistFile, specialistFileUrl (if uploading), otherDescription
  
  
  // Medical Tests Selection (בדיקות רפואיות)
  // Allowed values: "אנדוסקופיה", "CT (טומוגרפיה ממוחשבת)", "MRI (תהודה מגנטית)", "EMG", "אק"ג", "אקו לב", "בדיקת דם", "בדיקת שתן", "ביופסיה", "צילום רנטגן", "קטטר", "אחר"
  medicalTests: [
    "אנדוסקופיה",
    "CT (טומוגרפיה ממוחשבת)",
    "MRI (תהודה מגנטית)",
    "EMG"
  ], // Array of medical test names to select from multi-dropdown. Only use values from the allowed list above.
  // Accident and Consent Section (תאונה והסכמה)
  // accident: boolean - Was the disability/illness caused by an accident? true = כן (Yes), false = לא (No)
  // accidentDate: string (DD/MM/YYYY) - Date of the accident (required if accident = true)
  // armyInjury: boolean - Is this related to army/military service injury? true = כן (Yes), false = לא (No)
  // uploadArmyFile: boolean - Upload army injury document? true = upload, false = don't upload (only if armyInjury = true)
  // armyFileUrl: string (URL) - URL to army injury document file (PDF or image) (only if uploadArmyFile = true)
  // statement: boolean - Agree to consent/statement checkbox? true = agree, false = don't agree
  accident: true, // Was it caused by an accident? true = כן, false = לא
  accidentDate: "15/03/2023", // Date of accident (DD/MM/YYYY) - required
  armyInjury: true, // Related to army injury? true = כן, false = לא, if the user contacted the Ministry of Defense due to an injury during military service.


  uploadArmyFile: true, // Upload army injury file? true = yes, false = no
  armyFileUrl: "http://localhost:8000/demo.pdf", // URL to army injury document (PDF or image), Medical Committee Report, Ministry of Defense document, etc.
  statement: true, // Agree to consent statement? true = agree, false = don't agree
  // Health Fund and Signature Section (קופת חולים וחתימה)
  // healthFund: string - Health fund name. Allowed values: "כללית", "לאומית", "מאוחדת", "מכבי", "אחר"
  // healthDetails: string - Additional health fund details (פרט)
  // declaration: boolean - Agree to declaration checkbox? true = agree, false = don't agree
  // signatureType: string - Always "חתימה סרוקה" (scanned signature)
  // uploadSignatureFile: boolean - Upload signature file? true = yes, false = no
  // signatureFileUrl: string (URL) - URL to signature file (PDF or image)
  // signatureFileType: string - File type for signature: "pdf" or "image" (default: "image")
  healthFund: "כללית", // Health fund name - must be one of: "כללית", "לאומית", "מאוחדת", "מכבי", "אחר"
  healthDetails: "פרטים נוספים על קופת החולים", // Additional details about health fund
  declaration: true, // Agree to declaration? true = agree, false = don't agree
  signatureType: "חתימה סרוקה", // Signature type - always "חתימה סרוקה" (scanned signature)
  uploadSignatureFile: true, // Upload signature file? true = yes, false = no
  signatureFileUrl: "http://localhost:8000/demo.jpeg", // URL to signature file (PDF or image)
  signatureFileType: "image", // File type: "pdf" or "image"
  // Final Declarations Section (הצהרות סופיות)
  // finalDeclaration: boolean - Agree to final declaration (all statements above)? true = agree, false = don't agree (REQUIRED)
  // videoMedicalCommittee: boolean - Agree to medical committee via video chat? true = agree, false = don't agree (OPTIONAL)
  // refuseEmployerContact: boolean - Refuse to let Bituach Leumi contact employer for income verification? true = refuse, false = allow (OPTIONAL)
  finalDeclaration: true, // Agree to final declaration? true = agree, false = don't agree (REQUIRED - data-testid="Decheck")
  videoMedicalCommittee: true, // Agree to medical committee via video chat? true = agree, false = don't agree (OPTIONAL - data-testid="SubmitionVideoChat")
  refuseEmployerContact: true, // Refuse employer contact for income verification? true = refuse, false = allow (OPTIONAL - data-testid="Tofes100Disclaimer")
  // Other Documents Section (מסמכים אחרים)
  // otherDocuments: array of objects - Each object contains: name (string), fileType ('image' or 'pdf'), fileUrl (URL)
  otherDocuments: [
    { name: 'passport-page', fileType: 'image', fileUrl: 'http://localhost:8000/demo.jpeg' },
    { name: 'medical-report', fileType: 'image', fileUrl: 'http://localhost:8000/demo.jpeg' },
    { name: 'consent-form', fileType: 'pdf', fileUrl: 'http://localhost:8000/demo.pdf' }
  ], // Array of additional documents to upload. Each must have: name (string), fileType ('image' or 'pdf'), fileUrl (URL), Documents and certificates that support the claim.
  
  // Information Transfer Permission Checkbox (הסכמה להעברת מידע)
  // informationTransfer: boolean - Give permission to share information with authorities? true = agree, false = don't agree
  informationTransfer: true, // Agree to information transfer? true = agree, false = don't agree (data-testid="InformationTransfer")
  // Second Signature Section (חתימה סופית)
  // secondSignatureType: string - Always "חתימה סרוקה" (Scanned signature)
  // uploadSecondSignature: boolean - Upload second signature file? true = yes (manual upload by user)
  secondSignatureType: "חתימה סרוקה", // Second signature type - always "חתימה סרוקה" (Scanned signature)
  uploadSecondSignature: true // Upload second signature file? true = yes (manual upload by user)
};

// Flow configurations - define your automation flows here
const FLOW_CONFIGS = {
  T7801: {
    id: "T7801",
    name: "BTL Form 7801 - Disability Benefits",
    url: "https://govforms.gov.il/mw/forms/T7801@btl.gov.il",
    testData: null, // Will be set dynamically
    steps: [
      {
        id: "check_privacy",
        type: "checkbox",
        label: "Privacy Policy Checkbox",
        elementText: "קראתי ואני מסכים למדיניות הפרטיות של הביטוח הלאומי",
        required: true,
        description: "Check the privacy policy agreement"
      },
      {
        id: "select_gender",
        type: "radio",
        label: "Gender Selection",
        elementText: "מין התובע כפי שמופיע בתעודת הזהות",
        dataKey: "gender",
        required: true,
        description: "Select gender (1=זכר, 2=נקבה)"
      },
      {
        id: "enter_dob",
        type: "text_input",
        label: "Date of Birth",
        elementText: "תאריך הלידה של התובע",
        dataKey: "dob",
        required: true,
        description: "Enter date of birth in DD/MM/YYYY format",
        simulateTyping: true,
        typingDelay: 70
      },
      {
        id: "click_enter_service",
        type: "button",
        label: "Enter Service Button",
        elementText: "כניסה לשירות",
        selector: '[data-testid="enter-service-button"]',
        required: true,
        description: "Click the 'Enter Service' button to proceed"
      },
      {
        id: "click_next_step",
        type: "button",
        label: "Next Step Button",
        elementText: "לשלב הבא",
        required: true,
        description: "Click the 'Next Step' button to continue"
      },
      {
        id: "select_submit_for",
        type: "radio",
        label: "Submit For Selection",
        elementText: "אני מגיש את התביעה",
        dataKey: "submitFor",
        required: true,
        description: "Select who is submitting: 1=עבורי (for myself), 2=עבור מישהו אחר (for someone else)"
      },
      {
        id: "enter_first_name",
        type: "text_input",
        label: "First Name",
        elementText: "שם פרטי",
        dataKey: "firstName",
        required: true,
        description: "Enter first name",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_last_name",
        type: "text_input",
        label: "Last Name",
        elementText: "שם משפחה",
        dataKey: "lastName",
        required: true,
        description: "Enter last name",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_id_number",
        type: "text_input",
        label: "ID Number",
        elementText: "מספר זהות",
        dataKey: "idNumber",
        required: true,
        description: "Enter ID number (9 digits including check digit)",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "select_marital_status",
        type: "select",
        label: "Marital Status",
        elementText: "מצב משפחתי",
        dataKey: "maritalStatus",
        required: true,
        description: "Select marital status from dropdown"
      },
      {
        id: "select_has_siyua",
        type: "radio",
        label: "Has Assistance in Filing",
        elementText: "אני מקבל סיוע בהגשת התביעה",
        dataKey: "hasSiyua",
        required: true,
        description: "Select if receiving assistance in filing: 1=כן (yes), 2=לא (no)"
      },
      {
        id: "select_siyua_body",
        type: "checkbox_multi",
        label: "Assistance Body Type",
        elementText: "הגוף המסייע/מייצג",
        dataKey: "siyuaBody",
        required: false,
        conditional: "select_has_siyua",
        conditionalValue: "1",
        description: "Select type of assisting body (only if hasSiyua is 1)"
      },
      {
        id: "enter_siyua_body_name",
        type: "text_input",
        label: "Assistance Body Name",
        elementText: "שם הגוף המסייע/המייצג",
        dataKey: "siyuaBodyName",
        required: false,
        conditional: "select_has_siyua",
        conditionalValue: "1",
        description: "Enter name of assisting body (only if hasSiyua is 1)",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_phone_number",
        type: "text_input",
        label: "Mobile Phone",
        elementText: "טלפון נייד",
        dataKey: "phoneNumber",
        required: true,
        description: "Enter mobile phone number",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_repeat_mobile",
        type: "text_input",
        label: "Verify Mobile Phone",
        elementText: "אימות טלפון נייד",
        dataKey: "repeatMobile",
        required: false,
        description: "Verify mobile phone number",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_other_phone",
        type: "text_input",
        label: "Additional Phone",
        elementText: "מספר טלפון נוסף",
        dataKey: "otherPhoneNumber",
        required: false,
        description: "Enter additional phone number (optional)",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_email",
        type: "text_input",
        label: "Email",
        elementText: "דואר אלקטרוני",
        dataKey: "email",
        required: true,
        description: "Enter email address",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_repeat_email",
        type: "text_input",
        label: "Verify Email",
        elementText: "אימות דואר אלקטרוני",
        dataKey: "repeatEmail",
        required: true,
        description: "Verify email address",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "select_sms_confirm",
        type: "radio",
        label: "SMS Consent",
        elementText: "אני מסכים לקבל הודעות הכוללות מידע אישי בערוצים דיגיטליים",
        dataKey: "smsConfirm",
        required: true,
        description: "Select if you agree to receive digital messages: 1=כן (yes), 0=לא (no)"
      },
      {
        id: "check_different_address",
        type: "checkbox",
        label: "Different Mailing Address",
        elementText: "המען למכתבים שונה מהכתובת במשרד הפנים",
        dataKey: "differentAddress",
        required: false,
        description: "Check if mailing address is different from ID address (only check if differentAddress is true)"
      },
      {
        id: "select_other_city",
        type: "select",
        label: "Mailing City",
        elementText: "יישוב",
        dataKey: "otherCity",
        required: false,
        conditional: "check_different_address",
        conditionalValue: true,
        description: "Select city for mailing address (only if differentAddress is checked)"
      },
      {
        id: "select_other_street",
        type: "select",
        label: "Mailing Street",
        elementText: "רחוב",
        dataKey: "otherStreet",
        required: false,
        conditional: "check_different_address",
        conditionalValue: true,
        description: "Select street for mailing address (only if differentAddress is checked)"
      },
      {
        id: "enter_other_home",
        type: "text_input",
        label: "House Number",
        elementText: "מספר בית",
        dataKey: "otherHome",
        required: false,
        conditional: "check_different_address",
        conditionalValue: true,
        description: "Enter house number (only if differentAddress is checked)",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_other_apartment",
        type: "text_input",
        label: "Apartment Number",
        elementText: "מספר דירה",
        dataKey: "otherApartment",
        required: false,
        conditional: "check_different_address",
        conditionalValue: true,
        description: "Enter apartment number (optional, only if differentAddress is checked)",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_mail_box",
        type: "text_input",
        label: "PO Box",
        elementText: "תא דואר",
        dataKey: "mailBox",
        required: false,
        conditional: "check_different_address",
        conditionalValue: true,
        description: "Enter PO box (optional, only if differentAddress is checked)",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_account_owner_name",
        type: "text_input",
        label: "Account Holder Name",
        elementText: "שם מלא של בעל החשבון",
        dataKey: "accountOwnerName",
        required: true,
        description: "Enter full name of account holder",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "enter_account_owner_id",
        type: "text_input",
        label: "Account Holder ID",
        elementText: "מספר זהות בעל חשבון",
        dataKey: "accountOwnerIdNum",
        required: true,
        description: "Enter ID number of account holder",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "select_bank_name",
        type: "select",
        label: "Bank Name",
        elementText: "בנק",
        dataKey: "bankName",
        required: true,
        description: "Select bank name"
      },
      {
        id: "select_local_bank",
        type: "select",
        label: "Bank Branch",
        elementText: "סניף",
        dataKey: "localBankName",
        required: true,
        description: "Select bank branch"
      },
      {
        id: "enter_account_number",
        type: "text_input",
        label: "Account Number",
        elementText: "מספר חשבון",
        dataKey: "accountNumber",
        required: true,
        description: "Enter bank account number",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "check_is_owner2",
        type: "checkbox",
        label: "Additional Account Owners",
        elementText: "בעלים נוספים בחשבון",
        dataKey: "isOwner2",
        required: false,
        description: "Check if there are additional account owners"
      },
      {
        id: "click_next_step_2",
        type: "button",
        label: "Next Step Button 2",
        elementText: "לשלב הבא",
        selector: '[data-testid="nextButton"]',
        required: true,
        description: "Click the 'Next Step' button to continue to employment section"
      },
      {
        id: "select_work_status",
        type: "radio",
        label: "Work Status in Last 15 Months",
        elementText: "פרטים על עבודה ב-15 החודשים האחרונים",
        dataKey: "kindComplaint",
        required: true,
        description: "Select work status: 1=לא עבדתי כלל, 2=עבדתי והפסקתי, 3=אני עובד"
      },
      {
        id: "enter_not_working_reason",
        type: "text_input",
        label: "Reason for Not Working",
        elementText: "פרט את הסיבה:",
        dataKey: "notWorkingReason",
        required: false,
        conditional: "select_work_status",
        conditionalCheck: (value) => value === "1" || value === "2",
        description: "Enter reason for not working (only if kindComplaint is 1 or 2)",
        simulateTyping: true,
        typingDelay: 50
      },
      {
        id: "select_working_as",
        type: "radio",
        label: "Working As",
        elementText: "אני עובד כ:",
        dataKey: "workingAs",
        required: false,
        conditional: "select_work_status",
        conditionalValue: "3",
        description: "Select employment type: 1=שכיר, 2=עצמאי, 3=עצמאי ושכיר (only if kindComplaint is 3)"
      },
      {
        id: "select_sick_pay",
        type: "radio",
        label: "Received Sick Pay",
        elementText: "ב-15 החודשים האחרונים קיבלתי דמי מחלה",
        dataKey: "gotSickPayYN",
        required: true,
        description: "Select sick pay status: 1=לא (No), 2=כן מהמעסיק (Yes, from employer). Only these two options are allowed.",
        allowedValues: ["1", "2"]  // Only these two options can be clicked
      },
      {
        id: "select_other_income",
        type: "radio",
        label: "Other Income",
        elementText: "ב-15 החודשים האחרונים הייתה לי הכנסה שלא מעבודה",
        dataKey: "otherIncome",
        required: true,
        description: "Select other income status: 1=לא, 2=כן"
      },
      {
        id: "click_next_step_3",
        type: "button",
        label: "Next Step Button 3",
        elementText: "לשלב הבא",
        selector: '[data-testid="nextButton"]',
        required: true,
        description: "Click the 'Next Step' button to continue to next section"
      },
      {
        id: "select_diseases",
        type: "disease_select",
        label: "Disease/Illness Selection",
        elementText: "בחר את המחלה או התסמינים מהם אתה סובל:",
        dataKey: "diseases",
        required: true,
        description: "Select diseases from dropdown. Allowed values: אחר, בעיה נפשית (מקבל טיפול), הפרעות בבלוטת התריס, יתר לחץ דם, ליקוי שכלי, ליקוי שמיעה, ליקויי ראיה ומחלת עיניים, מחלה אורטופדית (גפיים עליונות ותחתונות, גב, צוואר, דלקת פרקים), מחלות בתחום נוירולוגי (כולל אלצהיימר, פרקינסון, אפילפסיה ואירוע מוחי)",
        allowedValues: [
          "אחר",
          "בעיה נפשית (מקבל טיפול)",
          "הפרעות בבלוטת התריס",
          "יתר לחץ דם",
          "ליקוי שכלי",
          "ליקוי שמיעה",
          "ליקויי ראיה ומחלת עיניים",
          "מחלה אורטופדית (גפיים עליונות ותחתונות, גב, צוואר, דלקת פרקים)",
          "מחלות בתחום נוירולוגי (כולל אלצהיימר, פרקינסון, אפילפסיה ואירוע מוחי)",
          "מחלות דרכי עיכול (כולל קיבה ומעיים)",
          "מחלת כבד (כולל צהבת)",
          "מחלת כליות (כולל דיאליזה)",
          "מחלת לב",
          "מחלת עור",
          "מחלת ריאות (כולל אסטמה)",
          "נפגע/ת תקיפה מינית",
          "סכרת",
          "סרטן"
        ]
      },
      {
        id: "select_medical_tests",
        type: "rc_multi_dropdown",
        label: "Medical Tests Selection",
        elementText: "בדיקות רפואיות",
        dataKey: "medicalTests",
        testId: "test",
        required: true,
        description: "Select medical tests from multi-dropdown. Allowed values: אנדוסקופיה, CT (טומוגרפיה ממוחשבת), MRI (תהודה מגנטית), EMG, אק\"ג, אקו לב, בדיקת דם, בדיקת שתן, ביופסיה, צילום רנטגן, קטטר, אחר",
        allowedValues: [
          "אנדוסקופיה",
          "CT (טומוגרפיה ממוחשבת)",
          "MRI (תהודה מגנטית)",
          "EMG",
          "אק\"ג",
          "אקו לב",
          "בדיקת דם",
          "בדיקת שתן",
          "ביופסיה",
          "צילום רנטגן",
          "קטטר",
          "אחר"
        ]
      },
      {
        id: "fill_accident_consent",
        type: "accident_consent",
        label: "Accident and Consent Section",
        elementText: "תאונה והסכמה",
        dataKey: null, // Function takes whole payload, not a nested object
        required: true,
        description: "Fill accident details, army injury information, and consent checkbox. Fields: accident (boolean), accidentDate (DD/MM/YYYY), armyInjury (boolean), uploadArmyFile (boolean), armyFileUrl (URL), statement (boolean)"
      },
      {
        id: "click_next_step_3",
        type: "button",
        label: "Next Step Button 3",
        elementText: "לשלב הבא",
        selector: '[data-testid="nextButton"]',
        required: true,
        description: "Click the 'Next Step' button to continue to next section"
      },
      {
        id: "health_fund_signature",
        type: "health_fund_signature",
        label: "Health Fund and Signature Section",
        elementText: "קופת חולים וחתימה",
        dataKey: null, // Function takes whole payload, not a nested object
        required: true,
        description: "Fill health fund details and upload scanned signature. Fields: healthFund (string - allowed: 'כללית', 'לאומית', 'מאוחדת', 'מכבי', 'אחר'), healthDetails (string), declaration (boolean), signatureType (string), uploadSignatureFile (boolean), signatureFileUrl (URL), signatureFileType ('pdf' or 'image')"
      },
      {
        id: "click_next_step_4",
        type: "button",
        label: "Next Step Button 4",
        elementText: "לשלב הבא",
        selector: '[data-testid="nextButton"]',
        required: true,
        description: "Click the 'Next Step' button to continue to next section"
      },
      {
        id: "final_declarations",
        type: "final_declarations",
        label: "Final Declarations Section",
        elementText: "הצהרות סופיות",
        dataKey: null, // Function takes whole payload, not a nested object
        required: true,
        description: "Check final declaration checkboxes. Fields: finalDeclaration (boolean - REQUIRED), videoMedicalCommittee (boolean - OPTIONAL), refuseEmployerContact (boolean - OPTIONAL)"
      },
      {
        id: "other_documents",
        type: "other_documents",
        label: "Other Documents Section",
        elementText: "מסמכים אחרים",
        dataKey: "otherDocuments",
        required: true,
        description: "Upload other documents (passport, medical reports, consent forms, etc.). Expects array of objects with: name (string), fileType ('image' or 'pdf'), fileUrl (URL)"
      },
      {
        id: "information_transfer",
        type: "checkbox",
        label: "Information Transfer Permission",
        elementText: "אני נותן בזה רשות לביטוח הלאומי",
        selector: '[data-testid="InformationTransfer"]',
        dataKey: "informationTransfer",
        required: false,
        description: "Check to give permission to share information with authorities for benefits eligibility"
      },
      {
        id: "second_signature",
        type: "second_signature",
        label: "Second Signature Section",
        elementText: "חתימה סופית",
        dataKey: null, // Function takes whole payload, not a nested object
        required: true,
        description: "Select scanned signature and upload signature file (manual upload by user). Fields: secondSignatureType (string), uploadSecondSignature (boolean)"
      },
      {
        id: "click_final_submit",
        type: "button",
        label: "Final Submit Button",
        elementText: "שליחה",
        selector: '[data-testid="submitButton"]',
        required: true,
        description: "Click the submit button (note: user may click manually, success monitoring runs in background)"
      }
    ]
  }
  // Add more flows here as needed: T7801, T7802, etc.
};

/**
 * ============================================================================
 * HELPER FUNCTIONS: Logging, Text Finding, Clicking, Typing, etc.
 * ============================================================================
 */

function createLogger(contextName) {
  return {
    log: (msg, data) => {
      const prefix = `[${contextName}]`;
      if (data !== undefined) {
        console.log(prefix, msg, data);
      } else {
        console.log(prefix, msg);
      }
    },
    warn: (msg, data) => {
      const prefix = `[${contextName}]`;
      if (data !== undefined) {
        console.warn(prefix, msg, data);
      } else {
        console.warn(prefix, msg);
      }
    },
    error: (msg, data) => {
      const prefix = `[${contextName}]`;
      if (data !== undefined) {
        console.error(prefix, msg, data);
      } else {
        console.error(prefix, msg);
      }
    }
  };
}

async function invokeFlow(flowConfig) {
  const flowLogger = createLogger(`FLOW[${flowConfig.id}]`);
  flowLogger.log("Starting flow execution", { flowName: flowConfig.name, url: flowConfig.url });
  
  // Send initial status update
  sendStatusUpdate(
    'flow_started',
    'מתחיל את תהליך מילוי הטופס...',
    false,
    false,
    false
  );

  // This function runs inside the page (injected via chrome.scripting.executeScript)
  function inPageMain(flowDef, payload) {
    const pageLogger = createLogger(`PAGE[${flowDef.id}]`);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    pageLogger.log("Injected script started", { flowId: flowDef.id, testData: payload });

    /**
     * TEXT & ELEMENT FINDING
     */
    function normalizeText(s = "") {
      return s
        .replace(/\s+/g, " ")
        .replace(/[^\w\u0590-\u05FF\s]/g, "")
        .trim()
        .toLowerCase();
    }

    function findElementContainingText(text, root = document) {
      if (!text) {
        pageLogger.warn("findElementContainingText: text is empty");
        return null;
      }
      const target = normalizeText(text);
      if (!target) {
        pageLogger.warn("findElementContainingText: normalized text is empty", { originalText: text });
        return null;
      }

      const candidates = root.querySelectorAll(
        "label, div, span, p, h1, h2, h3, h4, a, td, li"
      );

      for (const el of candidates) {
        const txt = normalizeText(el.textContent || "");
        if (!txt) continue;
        if (txt.includes(target) || target.includes(txt)) {
          pageLogger.log("✓ Found element", { searchText: text, elementTagName: el.tagName });
          return el;
        }
      }

      pageLogger.warn("✗ Element not found", { searchText: text, candidatesChecked: candidates.length });
      return null;
    }

    async function waitForText(text, timeoutMs = 30000, pollMs = 300) {
      pageLogger.log("Waiting for element with text", { text, timeoutMs });
      const deadline = Date.now() + timeoutMs;
      let pollCount = 0;

      while (Date.now() < deadline) {
        const el = findElementContainingText(text, document);
        if (el) {
          pageLogger.log("✓ Element found after polls", { text, pollCount, elapsedMs: Date.now() - (deadline - timeoutMs) });
          return el;
        }
        pollCount++;
        await sleep(pollMs);
      }

      pageLogger.error("✗ Timeout waiting for element", { text, totalPolls: pollCount, timeoutMs });
      throw new Error(`Timeout waiting for text "${text}" after ${pollCount} polls`);
    }

    async function waitForSelector(selector, timeoutMs = 30000, pollMs = 250) {
      pageLogger.log("Waiting for selector", { selector, timeoutMs });
      const deadline = Date.now() + timeoutMs;
      let pollCount = 0;

      while (Date.now() < deadline) {
        const el = document.querySelector(selector);
        if (el) {
          pageLogger.log("✓ Selector found", { selector, pollCount });
          return el;
        }
        pollCount++;
        await sleep(pollMs);
      }

      pageLogger.error("✗ Timeout waiting for selector", { selector, totalPolls: pollCount });
      throw new Error(`Timeout waiting for selector "${selector}"`);
    }

    /**
     * ELEMENT INTERACTION
     */
    function dispatchPointer(el, actionName = "click") {
      try {
        el.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
        el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
        el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        pageLogger.log(`✓ Pointer events dispatched (${actionName})`, { elementTagName: el.tagName });
        return true;
      } catch (e) {
        try {
          el.click && el.click();
          pageLogger.log(`✓ Fallback click succeeded (${actionName})`);
          return true;
        } catch (err) {
          pageLogger.warn(`✗ dispatchPointer failed (${actionName})`, { error: String(err) });
          return false;
        }
      }
    }

    function safeClick(el, actionName = "action") {
      if (!el) {
        pageLogger.warn(`✗ safeClick: element is null (${actionName})`);
        return false;
      }
      try {
        el.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
        pageLogger.log(`✓ Scrolled element into view (${actionName})`);
      } catch (e) {
        pageLogger.warn(`Could not scroll into view (${actionName})`);
      }
      try {
        el.focus && el.focus();
      } catch (e) {
        // ignore
      }
      return dispatchPointer(el, actionName);
    }

    async function simulateTyping(input, value, delay = 80, stepId = "typing") {
      if (!input) {
        pageLogger.error(`✗ simulateTyping: input is null`, { stepId, value });
        return false;
      }
      try {
        input.focus && input.focus();
        pageLogger.log(`Starting to type value (${stepId})`, { value, typingDelay: delay });

        if (typeof input.value !== "undefined") {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        for (const ch of String(value)) {
          input.value = input.value + ch;
          const ev = new InputEvent("input", {
            bubbles: true,
            cancelable: false,
            data: ch,
            inputType: "insertText",
          });
          input.dispatchEvent(ev);
          await sleep(delay);
        }

        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.blur && input.blur();
        pageLogger.log(`✓ Successfully typed value (${stepId})`, { value });
        return true;
      } catch (e) {
        pageLogger.error(`✗ simulateTyping error (${stepId})`, { value, error: String(e) });
        return false;
      }
    }

    /**
     * STEP EXECUTORS: Specialized handlers for different step types
     */
    async function executeCheckboxStep(step) {
      pageLogger.log(`[STEP: ${step.id}] Starting checkbox execution`, { label: step.label, required: step.required });

      // Try selector first if available
      let checkbox = null;
      if (step.selector) {
        checkbox = document.querySelector(step.selector);
        if (checkbox) {
          pageLogger.log(`[STEP: ${step.id}] Found checkbox by selector`, { selector: step.selector });
          
          // Check if already checked
          const isChecked = checkbox.checked || checkbox.getAttribute("aria-checked") === "true";
          if (isChecked) {
            pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox already checked, skipping`);
            return { success: true, stepId: step.id, reason: "already_checked" };
          }

          // Try clicking associated label
          const id = checkbox.id;
          if (id) {
            const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
            if (label) {
              pageLogger.log(`[STEP: ${step.id}] Clicking associated label`);
              safeClick(label, `${step.id}_label`);
              await sleep(250);
              if (checkbox.checked || checkbox.getAttribute("aria-checked") === "true") {
                pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox successfully checked via label`);
                return { success: true, stepId: step.id, reason: "clicked_label" };
              }
            }
          }

          // Try clicking checkbox itself
          if (safeClick(checkbox, `${step.id}_input`)) {
            await sleep(250);
            if (checkbox.checked || checkbox.getAttribute("aria-checked") === "true") {
              pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox successfully checked via input`);
              return { success: true, stepId: step.id, reason: "clicked_input" };
            }
          }

          // Try clicking parent span wrapper
          const parentSpan = checkbox.closest('span');
          if (parentSpan && safeClick(parentSpan, `${step.id}_span`)) {
            await sleep(250);
            if (checkbox.checked || checkbox.getAttribute("aria-checked") === "true") {
              pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox successfully checked via span wrapper`);
              return { success: true, stepId: step.id, reason: "clicked_span" };
            }
          }

          pageLogger.warn(`[STEP: ${step.id}] ✗ Could not check checkbox despite finding it by selector`);
          return { success: false, stepId: step.id, reason: "click_failed_selector" };
        }
      }

      // Fallback to text search
      const container = await (async () => {
        try {
          return await waitForText(step.elementText, 30000);
        } catch (e) {
          pageLogger.warn(`[STEP: ${step.id}] Failed to find element container`, { error: String(e) });
          return null;
        }
      })();

      if (!container) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Container element not found`, { searchText: step.elementText });
        return { success: false, stepId: step.id, reason: "container_not_found" };
      }

      pageLogger.log(`[STEP: ${step.id}] Found container`, { elementTagName: container.tagName });

      // Try to find checkbox
      checkbox =
        container.querySelector('input[type="checkbox"]') ||
        container.querySelector('input[role="checkbox"]') ||
        null;

      if (!checkbox) {
        const parent = container.closest("div, form, label, section") || document;
        checkbox = parent.querySelector && parent.querySelector('input[type="checkbox"]');
        if (checkbox) {
          pageLogger.log(`[STEP: ${step.id}] Found checkbox in parent element`);
        }
      } else {
        pageLogger.log(`[STEP: ${step.id}] Found checkbox in container`);
      }

      if (checkbox) {
        // Check if already checked
        const isChecked = checkbox.checked || checkbox.getAttribute("aria-checked") === "true";
        if (isChecked) {
          pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox already checked, skipping`);
          return { success: true, stepId: step.id, reason: "already_checked" };
        }

        pageLogger.log(`[STEP: ${step.id}] Checkbox found, attempting to click`);

        // Try clicking associated label
        const id = checkbox.id;
        if (id) {
          const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (label) {
            pageLogger.log(`[STEP: ${step.id}] Clicking associated label`);
            safeClick(label, `${step.id}_label`);
            await sleep(250);
            if (checkbox.checked || checkbox.getAttribute("aria-checked") === "true") {
              pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox successfully checked via label`);
              return { success: true, stepId: step.id, reason: "clicked_label" };
            }
          }
        }

        // Try clicking checkbox itself
        if (safeClick(checkbox, `${step.id}_input`)) {
          await sleep(250);
          if (checkbox.checked || checkbox.getAttribute("aria-checked") === "true") {
            pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox successfully checked via input`);
            return { success: true, stepId: step.id, reason: "clicked_input" };
          }
        }

        // Try clicking container
        if (safeClick(container, `${step.id}_container`)) {
          await sleep(250);
          if (checkbox.checked || checkbox.getAttribute("aria-checked") === "true") {
            pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox successfully checked via container`);
            return { success: true, stepId: step.id, reason: "clicked_container" };
          }
        }

        pageLogger.warn(`[STEP: ${step.id}] ✗ Could not check checkbox despite finding it`);
        return { success: false, stepId: step.id, reason: "click_failed" };
      }

      // No checkbox found, try clicking container directly
      pageLogger.log(`[STEP: ${step.id}] No checkbox input found, trying to click container`);
      if (safeClick(container, `${step.id}_container_direct`)) {
        await sleep(250);
        pageLogger.log(`[STEP: ${step.id}] ✓ Container clicked (may be a toggle)`);
        return { success: true, stepId: step.id, reason: "clicked_container_direct" };
      }

      pageLogger.error(`[STEP: ${step.id}] ✗ No clickable element found`);
      return { success: false, stepId: step.id, reason: "nothing_clickable" };
    }

    async function executeRadioStep(step, dataValue) {
      pageLogger.log(`[STEP: ${step.id}] Starting radio selection`, { label: step.label, value: dataValue, elementText: step.elementText });

      // For "select_has_siyua" step, we need to find the specific section first
      let sectionContainer = null;
      if (step.id === "select_has_siyua") {
        // Find the "סיוע בהגשת התביעה" section heading
        const headingText = "סיוע בהגשת התביעה";
        const allHeadings = Array.from(document.querySelectorAll('[role="heading"], h1, h2, h3, h4, h5, h6'));
        const sectionHeading = allHeadings.find(h => normalizeText(h.textContent).includes(normalizeText(headingText)));

        if (sectionHeading) {
          pageLogger.log(`[STEP: ${step.id}] Found section heading for ${headingText}`);
          // Get the closest container (jss39) which wraps this section
          sectionContainer = sectionHeading.closest('[class*="jss39"]') || sectionHeading.closest('div.jss40').closest('div');
          if (sectionContainer) {
            pageLogger.log(`[STEP: ${step.id}] Found section container`);
          }
        }
      }

      const container = await (async () => {
        try {
          // If we have a section container, search within it; otherwise search globally
          const searchRoot = sectionContainer || document;

          // For section container, manually search within it
          if (sectionContainer) {
            const deadline = Date.now() + 30000;
            let pollCount = 0;
            while (Date.now() < deadline) {
              const candidates = Array.from(sectionContainer.querySelectorAll("label, div, span, p"));
              for (const el of candidates) {
                if (normalizeText((el.textContent || "")).includes(normalizeText(step.elementText))) {
                  return el;
                }
              }
              pollCount++;
              await sleep(300);
            }
            return null;
          }

          return await waitForText(step.elementText, 30000);
        } catch (e) {
          pageLogger.warn(`[STEP: ${step.id}] Failed to find element container`, { error: String(e) });
          return null;
        }
      })();

      if (!container) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Container not found`, { searchText: step.elementText });
        return { success: false, stepId: step.id, reason: "container_not_found" };
      }

      pageLogger.log(`[STEP: ${step.id}] Found container, searching for radio inputs`);

      // First, try to find radios directly by data-testid if we have a dataKey mapping
      const dataTestIdMap = {
        "gotSickPayYN": "gotsickpayYN",
        "otherIncome": "oincome",
        "kindComplaint": "kindComplaint",
        "workingAs": "workingAs"
      };

      let radios = [];
      const mappedTestId = step.dataKey ? dataTestIdMap[step.dataKey] : null;

      if (mappedTestId) {
        radios = Array.from(document.querySelectorAll(`input[type="radio"][data-testid="${mappedTestId}"]`));
        if (radios.length > 0) {
          pageLogger.log(`[STEP: ${step.id}] Found ${radios.length} radio inputs by data-testid`, { dataTestId: mappedTestId, radiosInfo: radios.map(r => ({ value: r.value, id: r.id })) });
        } else {
          pageLogger.log(`[STEP: ${step.id}] No radios found by data-testid, falling back to container search`);
        }
      }

      // Fallback: search by container if not found by data-testid
      if (radios.length === 0) {
        const parent = sectionContainer || container.closest("div[role='radiogroup'], div, section, form") || document;
        radios = parent.querySelectorAll ? Array.from(parent.querySelectorAll('input[type="radio"]')) : [];
        pageLogger.log(`[STEP: ${step.id}] Found ${radios.length} radio inputs by container search`, { radiosInfo: radios.map(r => ({ value: r.value, id: r.id, dataTestId: r.getAttribute('data-testid') })) });
      }

      // If this step has allowedValues, hide/disable non-allowed options
      if (step.allowedValues && Array.isArray(step.allowedValues)) {
        radios.forEach(radio => {
          if (!step.allowedValues.includes(String(radio.value))) {
            const label = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
            if (label) {
              label.style.display = "none";
              pageLogger.log(`[STEP: ${step.id}] Hidden disallowed radio option with value ${radio.value}`);
            }
            radio.style.display = "none";
            radio.disabled = true;
          }
        });
      }

      // Filter radios to only those within the same name group (same form) - only if we found by container, not by data-testid
      let relevantRadios = radios;
      if (!mappedTestId || radios.length === 0) {
        const radioName = radios.length > 0 ? radios[0].name : null;
        relevantRadios = radioName ? radios.filter(r => r.name === radioName) : radios;
        pageLogger.log(`[STEP: ${step.id}] Filtered to ${relevantRadios.length} radios in same group`, { name: radioName });
      } else {
        pageLogger.log(`[STEP: ${step.id}] Using ${relevantRadios.length} radios found by data-testid (no filtering needed)`);
      }

      // Try matching by value attribute
      let targetRadio = null;
      for (const radio of relevantRadios) {
        if (String(radio.value) === String(dataValue)) {
          targetRadio = radio;
          pageLogger.log(`[STEP: ${step.id}] Found radio with matching value`, { value: dataValue, radioId: radio.id, name: radio.name });
          break;
        }
      }

      if (!targetRadio) {
        pageLogger.error(`[STEP: ${step.id}] ✗ No radio found with value ${dataValue}`, { availableValues: relevantRadios.map(r => r.value) });
        return { success: false, stepId: step.id, reason: "no_matching_value", value: dataValue };
      }

      // Try multiple click methods
      pageLogger.log(`[STEP: ${step.id}] Attempting to click radio button, value: ${dataValue}`);

      // Method 1: Try clicking associated label directly with .click()
      const id = targetRadio.id;
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label) {
          pageLogger.log(`[STEP: ${step.id}] Found associated label, attempting click`);
          try {
            // Scroll into view
            label.scrollIntoView({ block: "center", inline: "center" });
            await sleep(200);

            // Use multiple click methods in sequence
            pageLogger.log(`[STEP: ${step.id}] Dispatching pointer and mouse events to label`);
            label.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, cancelable: true }));
            label.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            label.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
            label.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            label.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
            label.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));

            // Try native click() if available
            if (typeof label.click === 'function') {
              pageLogger.log(`[STEP: ${step.id}] Calling native label.click()`);
              label.click();
            }

            await sleep(300);

            if (targetRadio.checked) {
              pageLogger.log(`[STEP: ${step.id}] ✓ Radio selected via label click`, { value: dataValue });
              return { success: true, stepId: step.id, reason: "clicked_label", value: dataValue };
            } else {
              pageLogger.log(`[STEP: ${step.id}] Label clicked but radio not checked, trying other methods`);
            }
          } catch (e) {
            pageLogger.warn(`[STEP: ${step.id}] Label click failed:`, String(e));
          }
        }
      }

      // Method 2: Try clicking the parent container of the label to trigger the radio
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label) {
          pageLogger.log(`[STEP: ${step.id}] Attempting to click label parent container`);
          try {
            const labelParent = label.parentElement;
            if (labelParent) {
              labelParent.scrollIntoView({ block: "center", inline: "center" });
              await sleep(200);
              labelParent.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
              if (typeof labelParent.click === 'function') {
                labelParent.click();
              }
              await sleep(300);

              if (targetRadio.checked) {
                pageLogger.log(`[STEP: ${step.id}] ✓ Radio selected via label parent click`, { value: dataValue });
                return { success: true, stepId: step.id, reason: "clicked_label_parent", value: dataValue };
              }
            }
          } catch (e) {
            pageLogger.warn(`[STEP: ${step.id}] Label parent click failed:`, String(e));
          }
        }
      }

      // Method 3: Try clicking radio itself directly
      pageLogger.log(`[STEP: ${step.id}] Attempting direct radio click`);
      try {
        targetRadio.scrollIntoView({ block: "center", inline: "center" });
        await sleep(200);

        targetRadio.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, cancelable: true }));
        targetRadio.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
        targetRadio.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        targetRadio.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        targetRadio.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
        targetRadio.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));

        if (typeof targetRadio.click === 'function') {
          pageLogger.log(`[STEP: ${step.id}] Calling native targetRadio.click()`);
          targetRadio.click();
        }

        await sleep(300);

        if (targetRadio.checked) {
          pageLogger.log(`[STEP: ${step.id}] ✓ Radio selected via direct click`, { value: dataValue });
          return { success: true, stepId: step.id, reason: "clicked_radio", value: dataValue };
        } else {
          pageLogger.log(`[STEP: ${step.id}] Radio click dispatched but not checked`);
        }
      } catch (e) {
        pageLogger.warn(`[STEP: ${step.id}] Direct radio click failed:`, String(e));
      }

      // Method 4: Try changing the checked property directly
      pageLogger.log(`[STEP: ${step.id}] Attempting direct property assignment`);
      try {
        targetRadio.checked = true;
        targetRadio.dispatchEvent(new Event("change", { bubbles: true }));
        targetRadio.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(300);

        if (targetRadio.checked) {
          pageLogger.log(`[STEP: ${step.id}] ✓ Radio selected via property assignment`, { value: dataValue });
          return { success: true, stepId: step.id, reason: "property_assignment", value: dataValue };
        }
      } catch (e) {
        pageLogger.warn(`[STEP: ${step.id}] Property assignment failed:`, String(e));
      }

      pageLogger.error(`[STEP: ${step.id}] ✗ Could not select radio button with value ${dataValue}`);
      return { success: false, stepId: step.id, reason: "click_failed", value: dataValue };
    }

    async function executeTextInputStep(step, dataValue) {
      pageLogger.log(`[STEP: ${step.id}] Starting text input`, { label: step.label, stepId: step.id, elementText: step.elementText, value: dataValue });

      let input = null;

      // Map by step ID first (most reliable)
      const stepIdMap = {
        "enter_first_name": "Fname",
        "enter_last_name": "Lname",
        "enter_id_number": "Inidnum",
        "enter_dob": "Birthday2",
        "enter_siyua_body_name": "NameSiyua",
        "enter_phone_number": "phoneNumber",
        "enter_repeat_mobile": "RepeatMobile",
        "enter_other_phone": "OtherphoneNumber",
        "enter_email": "email",
        "enter_repeat_email": "RepeatEmail",
        "enter_other_home": "Otherhome",
        "enter_other_apartment": "OtherAppartment",
        "enter_mail_box": "MailBox",
        "enter_account_owner_name": "Acowner1",
        "enter_account_owner_id": "Acowner1idnum",
        "enter_account_number": "acountnumber",
        "enter_not_working_reason": "Notworking"
      };

      const dataTestIdByStepId = stepIdMap[step.id];
      if (dataTestIdByStepId) {
        input = document.querySelector(`input[data-testid="${dataTestIdByStepId}"]`);
        if (input) {
          pageLogger.log(`[STEP: ${step.id}] Found input by step ID mapping`, { stepId: step.id, dataTestId: dataTestIdByStepId });
        }
      }

      // Fallback: Map by element text
      if (!input) {
        const dataTestIdMap = {
          "שם פרטי": "Fname",
          "שם משפחה": "Lname",
          "מספר זהות": "Inidnum",
          "מספר זהות (כולל ספרת ביקורת)": "Inidnum",
          "תאריך הלידה של התובע": "Birthday2",
          "שם הגוף המסייע/המייצג": "NameSiyua",
          "טלפון נייד": "phoneNumber",
          "אימות טלפון נייד": "RepeatMobile",
          "מספר טלפון נוסף": "OtherphoneNumber",
          "דואר אלקטרוני": "email",
          "אימות דואר אלקטרוני": "RepeatEmail",
          "מספר בית": "Otherhome",
          "מספר דירה": "OtherAppartment",
          "תא דואר": "MailBox",
          "שם מלא של בעל החשבון": "Acowner1",
          "מספר זהות בעל חשבון": "Acowner1idnum",
          "מספר חשבון": "acountnumber",
          "פרט את הסיבה:": "Notworking"
        };

        const dataTestId = dataTestIdMap[step.elementText];
        if (dataTestId) {
          input = document.querySelector(`input[data-testid="${dataTestId}"]`);
          if (input) {
            pageLogger.log(`[STEP: ${step.id}] Found input by element text mapping`, { elementText: step.elementText, dataTestId });
          }
        }
      }

      // Fallback: try hardcoded selectors for date fields
      if (!input && step.id === "enter_dob") {
        input = document.querySelector('input[data-testid="Birthday2"]') ||
          document.querySelector('input[placeholder*="DD/MM"]') ||
          document.querySelector('input[placeholder*="DD/MM/YYYY"]') ||
          null;
      }

      if (!input) {
        pageLogger.log(`[STEP: ${step.id}] Input not found by selector, searching by label text`);
        const inputLabel = await (async () => {
          try {
            return await waitForText(step.elementText, 20000);
          } catch (e) {
            pageLogger.warn(`[STEP: ${step.id}] Failed to find label`, { error: String(e) });
            return null;
          }
        })();

        if (inputLabel) {
          const parent = inputLabel.closest("div, section, form, label") || document;
          input = parent.querySelector && parent.querySelector('input[type="text"], input[type="tel"], input[type="date"], input:not([type])');
          if (input) {
            pageLogger.log(`[STEP: ${step.id}] Found input in parent element`);
          }
        }
      }

      if (!input) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Input element not found`, { searchText: step.elementText, stepId: step.id, value: dataValue });
        return { success: false, stepId: step.id, reason: "input_not_found", value: dataValue };
      }

      pageLogger.log(`[STEP: ${step.id}] Input element found, preparing to enter value`, { dataTestId: input.getAttribute('data-testid'), currentValue: input.value, newValue: dataValue });

      // Clear any existing value first
      try {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(100);
      } catch (e) {
        pageLogger.warn(`[STEP: ${step.id}] Could not clear input`);
      }

      // For DOB field, always simulate typing after clicking first
      if (step.id === "enter_dob") {
        pageLogger.log(`[STEP: ${step.id}] DOB field detected - will click first then simulate typing`);
        try {
          input.click && input.click();
          // Step 1: Scroll into view
          input.scrollIntoView({ block: "center", inline: "center" });
          await sleep(200);

          // Step 2: Click the input to activate it (like a human would)
          pageLogger.log(`[STEP: ${step.id}] Clicking input to activate it`);
          input.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
          input.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
          input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          input.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
          input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          input.click && input.click();
          await sleep(300);

          // Step 3: Focus the input
          input.focus();
          await sleep(200);
          pageLogger.log(`[STEP: ${step.id}] Input activated and focused, starting simulated typing`);

          // Step 4: Simulate typing
          const typed = await simulateTyping(input, dataValue, step.typingDelay || 50, step.id);
          if (typed) {
            pageLogger.log(`[STEP: ${step.id}] ✓ Value successfully typed via simulation`);
            await sleep(300);

            // Step 5: Trigger blur to finalize input
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
            await sleep(200);
            pageLogger.log(`[STEP: ${step.id}] Blurred input to finalize entry`);

            return { success: true, stepId: step.id, reason: "typed_simulated", value: dataValue };
          } else {
            pageLogger.warn(`[STEP: ${step.id}] Simulated typing failed, trying direct assignment as fallback`);
            input.value = dataValue;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
            return { success: true, stepId: step.id, reason: "direct_assignment_fallback", value: dataValue };
          }
        } catch (e) {
          pageLogger.error(`[STEP: ${step.id}] ✗ Error handling DOB field`, { error: String(e) });
          return { success: false, stepId: step.id, reason: "dob_error", value: dataValue };
        }
      }

      // For other fields, use standard typing if configured
      if (step.simulateTyping) {
        const typed = await simulateTyping(input, dataValue, step.typingDelay || 70, step.id);
        if (typed) {
          pageLogger.log(`[STEP: ${step.id}] ✓ Value successfully typed`);
          return { success: true, stepId: step.id, reason: "typed", value: dataValue };
        } else {
          pageLogger.warn(`[STEP: ${step.id}] Typing failed, trying direct value assignment`);
        }
      }

      // Fallback: direct assignment
      try {
        input.value = dataValue;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        pageLogger.log(`[STEP: ${step.id}] ✓ Value set via direct assignment`);
        return { success: true, stepId: step.id, reason: "direct_assignment", value: dataValue };
      } catch (e) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Direct assignment failed`, { error: String(e) });
        return { success: false, stepId: step.id, reason: "assignment_failed", value: dataValue };
      }
    }

    async function executeButtonStep(step) {
      pageLogger.log(`[STEP: ${step.id}] Starting button click`, { label: step.label });

      // Find the main container first
      const mainContainer = document.querySelector('div[role="main"].jss3');
      const searchRoot = mainContainer || document;

      if (mainContainer) {
        pageLogger.log(`[STEP: ${step.id}] Found main container, searching within it`);
      }

      // Try selector first if available
      let button = null;
      if (step.selector) {
        button = searchRoot.querySelector(step.selector);
        if (button) {
          pageLogger.log(`[STEP: ${step.id}] Found button by selector`, { selector: step.selector });
        }
      }

      // Fallback to text search
      if (!button && step.elementText) {
        // First try to find all buttons in the search root that contain the text
        const allButtons = Array.from(searchRoot.querySelectorAll('button'));
        const targetText = normalizeText(step.elementText);

        for (const btn of allButtons) {
          const btnText = normalizeText(btn.textContent || "");
          if (btnText.includes(targetText) || targetText.includes(btnText)) {
            button = btn;
            pageLogger.log(`[STEP: ${step.id}] Found button by text search`, { text: step.elementText, buttonTag: 'BUTTON' });
            break;
          }
        }

        // If not found by button search, fall back to finding any element with text, then find button ancestor
        if (!button) {
          const container = findElementContainingText(step.elementText, searchRoot);
          if (container) {
            pageLogger.log(`[STEP: ${step.id}] Found container by text search`, { text: step.elementText, containerTag: container.tagName });

            // If the container itself is a button, use it
            if (container.tagName === 'BUTTON') {
              button = container;
              pageLogger.log(`[STEP: ${step.id}] Container is the button element`);
            } else {
              // Search for a button element within the container
              button = container.querySelector('button');
              if (button) {
                pageLogger.log(`[STEP: ${step.id}] Found button element within container`);
              } else {
                // Search up the DOM tree for a button ancestor
                let current = container;
                while (current && current !== searchRoot && current !== document.body) {
                  if (current.tagName === 'BUTTON') {
                    button = current;
                    pageLogger.log(`[STEP: ${step.id}] Found button ancestor`);
                    break;
                  }
                  current = current.parentElement;
                }
              }
            }
          }
        }

        if (!button) {
          pageLogger.error(`[STEP: ${step.id}] ✗ Button not found`, { selector: step.selector, text: step.elementText });
          return { success: false, stepId: step.id, reason: "button_not_found" };
        }
      }

      if (!button) {
        pageLogger.error(`[STEP: ${step.id}] ✗ No button found`);
        return { success: false, stepId: step.id, reason: "button_not_found" };
      }

      pageLogger.log(`[STEP: ${step.id}] Button found, preparing to click`, { buttonElement: button.outerHTML.substring(0, 150) });

      // For buttons that might be disabled (like enter_service), add retry logic
      const needsRetry = step.id === "click_enter_service";
      const maxRetries = needsRetry ? 15 : 1;
      const retryDelay = needsRetry ? 1000 : 500;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        pageLogger.log(`[STEP: ${step.id}] Click attempt ${attempt}/${maxRetries}`);

        // Ensure button is clickable
        try {
          button.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
          if (attempt === 1) {
            pageLogger.log(`[STEP: ${step.id}] Scrolled button into view`);
          }
        } catch (e) {
          pageLogger.warn(`[STEP: ${step.id}] Could not scroll button into view`);
        }

        // Try multiple click methods to ensure it registers
        let clickSucceeded = false;

        // Method 1: Dispatch pointer events
        try {
          button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, cancelable: true }));
          button.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, cancelable: true }));
          button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
          button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
          button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
          button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          pageLogger.log(`[STEP: ${step.id}] Dispatched pointer and mouse events (attempt ${attempt})`);
          clickSucceeded = true;
        } catch (e) {
          pageLogger.warn(`[STEP: ${step.id}] Pointer events failed (attempt ${attempt}):`, String(e));
        }

        // Method 2: Try native click
        if (!clickSucceeded) {
          try {
            if (button.click && typeof button.click === 'function') {
              button.click();
              pageLogger.log(`[STEP: ${step.id}] Called native click() method (attempt ${attempt})`);
              clickSucceeded = true;
            }
          } catch (e) {
            pageLogger.warn(`[STEP: ${step.id}] Native click() failed (attempt ${attempt}):`, String(e));
          }
        }

        if (clickSucceeded) {
          await sleep(retryDelay); // Wait for page to process

          // For enter_service button, check if we've navigated to a new step by looking for key elements
          if (needsRetry) {
            const newStepIndicators = [
              'שם הגוף המסייע', // סיוע בהגשת התביעה heading
              'פרטי התובע',     // claimant details
              'אני מגיש את התביעה' // submit for
            ];

            const pageChanged = newStepIndicators.some(text => {
              return document.body.textContent.includes(text);
            });

            if (pageChanged) {
              pageLogger.log(`[STEP: ${step.id}] ✓ Button clicked and page navigated successfully (attempt ${attempt})`);
              return { success: true, stepId: step.id, reason: "clicked_with_navigation" };
            } else {
              pageLogger.log(`[STEP: ${step.id}] Page did not change, retrying... (attempt ${attempt}/${maxRetries})`);
              if (attempt < maxRetries) {
                await sleep(retryDelay);
                continue;
              }
            }
          }

          pageLogger.log(`[STEP: ${step.id}] ✓ Button clicked successfully`);
          return { success: true, stepId: step.id, reason: "clicked" };
        }

        // If click failed, retry if needed
        if (attempt < maxRetries && needsRetry) {
          pageLogger.log(`[STEP: ${step.id}] Click attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
          await sleep(retryDelay);
        }
      }

      pageLogger.error(`[STEP: ${step.id}] ✗ Failed to click button after ${maxRetries} attempts`);
      return { success: false, stepId: step.id, reason: "click_failed" };
    }

    async function executeSelectStep(step, dataValue) {
      pageLogger.log(`[STEP: ${step.id}] Starting select/dropdown interaction`, { label: step.label, value: dataValue });

      let selectComponent = null;

      // Map friendly names to data-testid attributes
      const dataTestIdMap = {
        "מצב משפחתי": "Marital_Status",
        "יישוב": "Othercity",
        "רחוב": "Otherstreet",
        "בנק": "Bankname",
        "סניף": "Localbankname"
      };

      const dataTestId = dataTestIdMap[step.elementText];
      if (dataTestId) {
        selectComponent = document.querySelector(`[data-testid="${dataTestId}"]`);
        if (selectComponent) {
          pageLogger.log(`[STEP: ${step.id}] Found select by data-testid`, { dataTestId });
        }
      }

      // Fallback: Find the select/dropdown by label text
      if (!selectComponent) {
        const labelElement = findElementContainingText(step.elementText, document);
        if (!labelElement) {
          pageLogger.error(`[STEP: ${step.id}] ✗ Label for select not found`, { searchText: step.elementText });
          return { success: false, stepId: step.id, reason: "label_not_found" };
        }

        pageLogger.log(`[STEP: ${step.id}] Found label element`);

        // Find the select component (RC-Select or native select)
        selectComponent = labelElement.closest("[role='combobox']") ||
          labelElement.closest(".rc-select") ||
          labelElement.querySelector(".rc-select") ||
          null;

        if (!selectComponent) {
          const parent = labelElement.closest("div[class*='jss']") || labelElement.parentElement;
          if (parent) {
            selectComponent = parent.querySelector(".rc-select") ||
              parent.querySelector("select") ||
              parent.querySelector("[role='combobox']");
          }
        }
      }

      if (!selectComponent) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Select component not found`);
        return { success: false, stepId: step.id, reason: "select_not_found" };
      }

      pageLogger.log(`[STEP: ${step.id}] Found select component`);

      // Find the input element within the select for typing (searchable dropdowns)
      const inputElement = selectComponent.querySelector('input[type="search"].rc-select-selection-search-input') ||
        selectComponent.querySelector('input[role="combobox"]');

      if (inputElement) {
        pageLogger.log(`[STEP: ${step.id}] Found input element - will type value for searchable dropdown`);
      }

      // For bank, branch, marital status, city, and street dropdowns, type the value into the input field
      if ((step.id === "select_bank_name" || step.id === "select_local_bank" || step.id === "select_marital_status" || step.id === "select_other_city" || step.id === "select_other_street") && inputElement) {
        pageLogger.log(`[STEP: ${step.id}] Searchable dropdown - typing value into input`);
        console.warn(`[STEP: ${step.id}] Typing value: ${dataValue}`, inputElement);

        try {
          // Use mousedown for bank/branch/city/street, click for marital status
          if (step.id === "select_bank_name" || step.id === "select_local_bank" || step.id === "select_other_city" || step.id === "select_other_street") {
            inputElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            pageLogger.log(`[STEP: ${step.id}] Sent mousedown event to input`);
          } else {
            inputElement.click();
            pageLogger.log(`[STEP: ${step.id}] Clicked input`);
          }
          await sleep(300);

          // Clear any existing value
          inputElement.value = "";
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(200);

          // Type the value character by character
          const valueToType = String(dataValue);
          for (let i = 0; i < valueToType.length; i++) {
            inputElement.value = valueToType.substring(0, i + 1);
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
            await sleep(50); // Small delay between characters
          }

          pageLogger.log(`[STEP: ${step.id}] Typed value: ${dataValue}`);
          await sleep(500); // Wait for dropdown to filter/update

          // Find and click the matching option using rc-select-item-option-content
          const optionElements = Array.from(document.querySelectorAll('.rc-select-item-option-content'));
          pageLogger.log(`[STEP: ${step.id}] Found ${optionElements.length} option content elements`);

          let selectedOption = null;

          // Try to find exact or partial match
          for (const optionContent of optionElements) {
            const optionText = optionContent.textContent || "";
            if (optionText.includes(dataValue) || normalizeText(optionText) === normalizeText(String(dataValue))) {
              selectedOption = optionContent.parentElement; // Get the rc-select-item-option parent
              pageLogger.log(`[STEP: ${step.id}] Found matching option:`, optionText);
              break;
            }
          }

          // For branch dropdown, if no match found, select the first option as fallback
          if (!selectedOption && step.id === "select_local_bank" && optionElements.length > 0) {
            selectedOption = optionElements[0].parentElement;
            const firstOptionText = optionElements[0].textContent || "";
            pageLogger.log(`[STEP: ${step.id}] No exact match found, selecting first option as fallback:`, firstOptionText);
          }

          if (selectedOption) {
            selectedOption.click();
            await sleep(500);
            pageLogger.log(`[STEP: ${step.id}] ✓ Option selected successfully after typing`);

            // Special handling for bank selection - forcefully remove focus to load branch dropdown
            // Special handling for city selection - forcefully remove focus to load street dropdown
            if (step.id === "select_bank_name" || step.id === "select_other_city") {
              const dependentDropdownLabel = step.id === "select_bank_name" ? "בנק" : "יישוב";
              const dependentDropdownTestId = step.id === "select_bank_name" ? "Localbankname" : "Otherstreet";
              const dependentDropdownName = step.id === "select_bank_name" ? "branch" : "street";
              
              pageLogger.log(`[STEP: ${step.id}] ${step.id === "select_bank_name" ? "Bank" : "City"} selected - forcefully removing focus to trigger ${dependentDropdownName} dropdown load`);

              // Method 1: Click on a neutral area (document body) to close dropdown and remove focus
              try {
                const neutralArea = document.querySelector('body') || document.documentElement;
                if (neutralArea) {
                  const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                  });
                  neutralArea.dispatchEvent(clickEvent);
                  pageLogger.log(`[STEP: ${step.id}] Clicked body to close dropdown`);
                  await sleep(300);
                }
              } catch (e) {
                pageLogger.warn(`[STEP: ${step.id}] Body click failed`);
              }

              // Method 2: Send Escape key to close dropdown
              try {
                inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
                pageLogger.log(`[STEP: ${step.id}] Sent Escape key to close dropdown`);
                await sleep(300);
              } catch (e) {
                pageLogger.warn(`[STEP: ${step.id}] Escape key failed`);
              }

              // Method 3: Click on the label to transfer focus
              const label = findElementContainingText(dependentDropdownLabel, document);
              if (label) {
                label.click();
                pageLogger.log(`[STEP: ${step.id}] Clicked ${step.id === "select_bank_name" ? "bank" : "city"} label to transfer focus`);
                await sleep(500);
              }

              pageLogger.log(`[STEP: ${step.id}] Focus removal complete - polling for ${dependentDropdownName} dropdown to populate (max 10s)`);

              const pollDeadline = Date.now() + 10000; // 10 seconds max
              let dependentReady = false;

              while (Date.now() < pollDeadline) {
                await sleep(500);

                // Check if dependent dropdown has data-testcode populated (indicates it's ready)
                const dependentDropdown = document.querySelector(`[data-testid="${dependentDropdownTestId}"]`);
                if (dependentDropdown) {
                  const testCode = dependentDropdown.getAttribute('data-testcode');
                  if (testCode && testCode !== "" && testCode !== "-1") {
                    pageLogger.log(`[STEP: ${step.id}] ${dependentDropdownName.charAt(0).toUpperCase() + dependentDropdownName.slice(1)} dropdown populated with testcode: ${testCode}`);
                    dependentReady = true;
                    break;
                  }
                }
              }

              if (dependentReady) {
                pageLogger.log(`[STEP: ${step.id}] ${dependentDropdownName.charAt(0).toUpperCase() + dependentDropdownName.slice(1)} dropdown ready for selection`);
              } else {
                pageLogger.warn(`[STEP: ${step.id}] ${dependentDropdownName.charAt(0).toUpperCase() + dependentDropdownName.slice(1)} dropdown may not be fully populated after 10s`);
              }
            }

            return { success: true, stepId: step.id, reason: "option_selected_by_typing", value: dataValue };
          } else {
            pageLogger.error(`[STEP: ${step.id}] ✗ No matching option found after typing`);
            return { success: false, stepId: step.id, reason: "option_not_found_after_typing" };
          }
        } catch (e) {
          pageLogger.error(`[STEP: ${step.id}] ✗ Error during typing:`, String(e));
          return { success: false, stepId: step.id, reason: "typing_failed", error: String(e) };
        }
      }

      // Special handling for dependent dropdowns - wait for them to be populated after their parent selection
      // Branch dropdown (סניף) - wait for it to be populated after bank selection
      // City dropdown (יישוב) - wait for it to be populated after checking different address
      // Street dropdown (רחוב) - wait for it to be populated after city selection
      if (step.id === "select_local_bank" || step.id === "select_other_city" || step.id === "select_other_street") {
        const dropdownName = step.id === "select_local_bank" ? "Branch" : (step.id === "select_other_city" ? "City" : "Street");
        pageLogger.log(`[STEP: ${step.id}] ${dropdownName} dropdown detected - waiting up to 10 seconds for options to populate`);

        // Wait and poll for options to appear in the dropdown
        const maxWaitTime = 10000; // 10 seconds max as requested
        const pollInterval = 500; // Check every 500ms
        const deadline = Date.now() + maxWaitTime;
        let optionsFound = false;

        while (Date.now() < deadline) {
          // Try to open the dropdown
          try {
            selectComponent.click && selectComponent.click();
            await sleep(500);
          } catch (e) {
            pageLogger.warn(`[STEP: ${step.id}] Could not click select:`, String(e));
          }

          // Check if dropdown has options
          const dropdownMenu = document.querySelector(".rc-virtual-list-holder") ||
            document.querySelector("[role='listbox']") ||
            document.querySelector(".rc-select-dropdown");

          if (dropdownMenu) {
            const options = Array.from(dropdownMenu.querySelectorAll("[role='option'], .rc-select-item-option, li"));
            if (options.length > 0) {
              pageLogger.log(`[STEP: ${step.id}] ✓ ${dropdownName} dropdown populated with ${options.length} options`);
              optionsFound = true;
              break;
            } else {
              pageLogger.log(`[STEP: ${step.id}] ${dropdownName} dropdown not yet populated, waiting...`);
              // Close dropdown and try again
              try {
                document.body.click();
                await sleep(pollInterval);
              } catch (e) { }
            }
          } else {
            await sleep(pollInterval);
          }
        }

        if (!optionsFound) {
          pageLogger.error(`[STEP: ${step.id}] ✗ ${dropdownName} dropdown did not populate after ${maxWaitTime}ms`);
          return { success: false, stepId: step.id, reason: `${dropdownName.toLowerCase()}_dropdown_not_populated` };
        }
      } else {
        // Normal dropdown - click to open with retry logic
        let dropdownOpened = false;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            pageLogger.log(`[STEP: ${step.id}] Attempt ${attempt} to open dropdown`);
            selectComponent.click && selectComponent.click();
            await sleep(500);

            // Check if dropdown appeared
            const checkMenu = document.querySelector(".rc-virtual-list-holder") ||
              document.querySelector("[role='listbox']") ||
              document.querySelector(".rc-select-dropdown");

            if (checkMenu) {
              dropdownOpened = true;
              pageLogger.log(`[STEP: ${step.id}] Dropdown opened successfully on attempt ${attempt}`);
              break;
            }
          } catch (e) {
            pageLogger.warn(`[STEP: ${step.id}] Attempt ${attempt} failed:`, String(e));
          }

          if (attempt < maxRetries) {
            await sleep(300);
          }
        }

        if (!dropdownOpened) {
          pageLogger.error(`[STEP: ${step.id}] ✗ Failed to open dropdown after ${maxRetries} attempts`);
        }
      }

      // Wait for dropdown menu to appear
      await sleep(500);

      // Find and click the option with matching value or text
      const dropdownMenu = document.querySelector(".rc-virtual-list-holder") ||
        document.querySelector("[role='listbox']") ||
        document.querySelector(".rc-select-dropdown");

      if (!dropdownMenu) {
        pageLogger.warn(`[STEP: ${step.id}] Dropdown menu not found after clicking`);
        return { success: false, stepId: step.id, reason: "dropdown_not_opened" };
      }

      pageLogger.log(`[STEP: ${step.id}] Dropdown menu found, searching for option with value: ${dataValue}`);

      // Search for the option
      const allOptions = Array.from(dropdownMenu.querySelectorAll("[role='option'], .rc-select-item-option, li"));
      let selectedOption = null;

      // First try to match by value/data attribute
      for (const option of allOptions) {
        if (option.getAttribute("data-value") === String(dataValue) ||
          option.getAttribute("value") === String(dataValue)) {
          selectedOption = option;
          pageLogger.log(`[STEP: ${step.id}] Found option by data-value attribute`);
          break;
        }
      }

      // If not found, try to match by text content (exact match first)
      if (!selectedOption) {
        const targetText = normalizeText(String(dataValue));
        for (const option of allOptions) {
          const optionText = normalizeText(option.textContent || "");
          // Try exact match first
          if (optionText === targetText) {
            selectedOption = option;
            pageLogger.log(`[STEP: ${step.id}] Found option by exact text match`);
            break;
          }
        }
      }

      // If still not found, try partial match (contains)
      if (!selectedOption) {
        const targetText = normalizeText(String(dataValue));
        for (const option of allOptions) {
          const optionText = normalizeText(option.textContent || "");
          if (optionText.includes(targetText) || targetText.includes(optionText)) {
            selectedOption = option;
            pageLogger.log(`[STEP: ${step.id}] Found option by partial text match`, { optionText, targetText });
            break;
          }
        }
      }

      if (!selectedOption) {
        // Log all available options for debugging
        const availableOptions = allOptions.map(opt => ({
          value: opt.getAttribute("data-value") || opt.getAttribute("value"),
          text: opt.textContent?.trim()
        }));
        pageLogger.error(`[STEP: ${step.id}] ✗ Option with value "${dataValue}" not found`, {
          availableCount: allOptions.length,
          searchedValue: dataValue,
          availableOptions: availableOptions.slice(0, 10) // Show first 10 options
        });
        return { success: false, stepId: step.id, reason: "option_not_found", value: dataValue };
      }

      pageLogger.log(`[STEP: ${step.id}] Clicking selected option`);

      try {
        selectedOption.click && selectedOption.click();
        await sleep(300);
        pageLogger.log(`[STEP: ${step.id}] ✓ Option selected successfully`);

        // Special handling for bank selection - wait for branch dropdown to be populated
        if (step.id === "select_bank_name") {
          pageLogger.log(`[STEP: ${step.id}] Bank selected - waiting for branch dropdown to populate with bank-specific branches`);
          await sleep(3000); // Initial wait
          pageLogger.log(`[STEP: ${step.id}] Wait completed, branch dropdown should now be ready with updated options`);
        }

        return { success: true, stepId: step.id, reason: "option_selected", value: dataValue };
      } catch (e) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Failed to click option`, { error: String(e) });
        return { success: false, stepId: step.id, reason: "click_failed", value: dataValue };
      }
    }

    async function executeCheckboxMultiStep(step, dataValue) {
      pageLogger.log(`[STEP: ${step.id}] Starting checkbox multi-select`, { label: step.label, value: dataValue });

      // Support both array of labels/values and single value
      const valuesToCheck = Array.isArray(dataValue) ? dataValue : [dataValue];
      pageLogger.log(`[STEP: ${step.id}] Values to check:`, valuesToCheck);

      // Find all checkboxes with data-testid matching the group
      let allCheckboxes = Array.from(document.querySelectorAll(`input[type="checkbox"][data-testid="${step.id.replace('select_', '')}"]`));

      // If no checkboxes found by step ID, try the hardcoded data-testid "SiyuaBody"
      if (allCheckboxes.length === 0) {
        allCheckboxes = Array.from(document.querySelectorAll(`input[type="checkbox"][data-testid="SiyuaBody"]`));
      }

      if (allCheckboxes.length === 0) {
        pageLogger.error(`[STEP: ${step.id}] ✗ No checkboxes found for group`);
        return { success: false, stepId: step.id, reason: "checkboxes_not_found" };
      }

      pageLogger.log(`[STEP: ${step.id}] Found ${allCheckboxes.length} checkboxes in group`, {
        values: allCheckboxes.map(c => c.value),
        labels: allCheckboxes.map(c => {
          const label = document.querySelector(`label[for="${CSS.escape(c.id)}"]`);
          return label ? (label.textContent || "").trim() : "N/A";
        })
      });

      const results = [];

      for (const valueToCheck of valuesToCheck) {
        pageLogger.log(`[STEP: ${step.id}] Processing value/label: "${valueToCheck}"`);

        // Try to find checkbox by value attribute first
        let targetCheckbox = null;
        for (const checkbox of allCheckboxes) {
          if (checkbox.getAttribute("value") === String(valueToCheck)) {
            targetCheckbox = checkbox;
            pageLogger.log(`[STEP: ${step.id}] ✓ Found checkbox by value attribute: ${valueToCheck}`);
            break;
          }
        }

        // If not found by value, try to find by label text (Hebrew labels)
        if (!targetCheckbox) {
          pageLogger.log(`[STEP: ${step.id}] Value not found by attribute, searching by label text: "${valueToCheck}"`);
          for (const checkbox of allCheckboxes) {
            const checkboxId = checkbox.id;
            if (checkboxId) {
              const label = document.querySelector(`label[for="${CSS.escape(checkboxId)}"]`);
              if (label) {
                const labelText = (label.textContent || "").trim();
                pageLogger.log(`[STEP: ${step.id}] Comparing label text: "${labelText}" with "${valueToCheck}"`);
                if (labelText === valueToCheck || labelText.includes(valueToCheck) || valueToCheck.includes(labelText)) {
                  targetCheckbox = checkbox;
                  pageLogger.log(`[STEP: ${step.id}] ✓ Found checkbox by label text match: "${labelText}"`);
                  break;
                }
              }
            }
          }
        }

        if (!targetCheckbox) {
          pageLogger.warn(`[STEP: ${step.id}] ✗ Checkbox with value/label "${valueToCheck}" not found`, {
            availableValues: allCheckboxes.map(c => c.value),
            availableLabels: allCheckboxes.map(c => {
              const label = document.querySelector(`label[for="${CSS.escape(c.id)}"]`);
              return label ? (label.textContent || "").trim() : "N/A";
            })
          });
          results.push({ value: valueToCheck, success: false, reason: "checkbox_not_found" });
          continue;
        }

        pageLogger.log(`[STEP: ${step.id}] Found target checkbox, attempting to check: ${valueToCheck}`);

        try {
          // Method 1: Click the SVG icon inside the span (the custom checkbox visual)
          const spanWrapper = targetCheckbox.parentElement;
          if (spanWrapper && spanWrapper.tagName === 'SPAN') {
            const svg = spanWrapper.querySelector('svg');
            if (svg) {
              pageLogger.log(`[STEP: ${step.id}] Method 1: Clicking SVG icon for "${valueToCheck}"`);
              safeClick(svg, `${step.id}_svg_${valueToCheck}`);
              await sleep(300);
              if (targetCheckbox.checked) {
                pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox checked via SVG icon for: ${valueToCheck}`);
                results.push({ value: valueToCheck, success: true, reason: "checked_via_svg" });
                continue;
              }
            }

            // Method 2: Click the span wrapper itself
            pageLogger.log(`[STEP: ${step.id}] Method 2: Clicking span wrapper for "${valueToCheck}"`);
            safeClick(spanWrapper, `${step.id}_span_${valueToCheck}`);
            await sleep(300);
            if (targetCheckbox.checked) {
              pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox checked via span wrapper for: ${valueToCheck}`);
              results.push({ value: valueToCheck, success: true, reason: "checked_via_span" });
              continue;
            }
          }

          // Method 3: Try clicking the associated label
          const id = targetCheckbox.id;
          let labelFound = false;
          if (id) {
            const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
            if (label) {
              pageLogger.log(`[STEP: ${step.id}] Method 3: Clicking label for "${valueToCheck}"`);
              safeClick(label, `${step.id}_label_${valueToCheck}`);
              await sleep(300);
              if (targetCheckbox.checked) {
                pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox checked via label for: ${valueToCheck}`);
                results.push({ value: valueToCheck, success: true, reason: "checked_via_label" });
                continue;
              }
              labelFound = true;
            }
          }

          // Method 4: Try using keyboard (Space key) after focusing on label if label was found
          if (labelFound && id) {
            pageLogger.log(`[STEP: ${step.id}] Method 4: Pressing Space key on focused label for "${valueToCheck}"`);
            const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
            if (label) {
              label.focus();
              await sleep(200);
              label.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true }));
              label.dispatchEvent(new KeyboardEvent("keypress", { key: " ", code: "Space", bubbles: true, cancelable: true }));
              label.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true, cancelable: true }));
              await sleep(300);
              if (targetCheckbox.checked) {
                pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox checked via Space key on label for: ${valueToCheck}`);
                results.push({ value: valueToCheck, success: true, reason: "checked_via_space_key" });
                continue;
              }
            }
          }

          // Method 5: Try clicking the checkbox itself with keyboard Space
          pageLogger.log(`[STEP: ${step.id}] Method 5: Pressing Space key on checkbox input for "${valueToCheck}"`);
          targetCheckbox.scrollIntoView({ block: "center", inline: "center" });
          targetCheckbox.focus();
          await sleep(200);

          targetCheckbox.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true }));
          targetCheckbox.dispatchEvent(new KeyboardEvent("keypress", { key: " ", code: "Space", bubbles: true, cancelable: true }));
          targetCheckbox.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true, cancelable: true }));

          await sleep(300);
          if (targetCheckbox.checked) {
            pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox checked via Space key on input for: ${valueToCheck}`);
            results.push({ value: valueToCheck, success: true, reason: "checked_via_space_key_input" });
            continue;
          }

          // Method 6: Try direct property assignment and force React update
          pageLogger.log(`[STEP: ${step.id}] Method 6: Direct property assignment for "${valueToCheck}"`);
          targetCheckbox.checked = true;
          targetCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          targetCheckbox.dispatchEvent(new Event("input", { bubbles: true }));
          targetCheckbox.dispatchEvent(new Event("click", { bubbles: true }));
          await sleep(300);

          if (targetCheckbox.checked) {
            pageLogger.log(`[STEP: ${step.id}] ✓ Checkbox checked via property assignment for: ${valueToCheck}`);
            results.push({ value: valueToCheck, success: true, reason: "checked_via_property" });
            continue;
          }

          pageLogger.warn(`[STEP: ${step.id}] No method succeeded for: ${valueToCheck}`);
          results.push({ value: valueToCheck, success: false, reason: "no_method_succeeded" });
        } catch (e) {
          pageLogger.error(`[STEP: ${step.id}] ✗ Exception while checking "${valueToCheck}"`, { error: String(e) });
          results.push({ value: valueToCheck, success: false, reason: "exception", error: String(e) });
        }
      }

      // Check if any checkboxes were successfully checked
      const successfulResults = results.filter(r => r.success);
      if (successfulResults.length > 0) {
        pageLogger.log(`[STEP: ${step.id}] ✓ Successfully checked ${successfulResults.length}/${valuesToCheck.length} checkboxes`, { results });
        return { success: true, stepId: step.id, reason: "multi_checked", checkedCount: successfulResults.length, values: valuesToCheck };
      } else {
        pageLogger.error(`[STEP: ${step.id}] ✗ Failed to check any checkboxes`, { results });
        return { success: false, stepId: step.id, reason: "no_checkboxes_checked", values: valuesToCheck };
      }
    }

    // ============================================================================
    // DISEASE/ILLNESS SELECTION HANDLER - START
    // ============================================================================

    /**
     * Helper: Fetch file from URL via background script (avoids CORS)
     */
    async function fetchFileFromUrl(url, filename) {
      pageLogger.log(`Fetching file from URL via background script`, { url, filename });

      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { action: 'fetchFile', url: url, filename: filename },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else if (response && response.error) {
                reject(new Error(response.error));
              } else if (!response || !response.success) {
                reject(new Error('Invalid response from background script'));
              } else {
                resolve(response);
              }
            }
          );
        });

        if (response.success && response.file) {
          pageLogger.log(`✓ File fetched successfully`, {
            filename: response.file.name,
            type: response.file.type,
            size: response.file.size
          });

          // Reconstruct File from serialized data
          // Convert array back to Uint8Array then to Blob then to File
          const uint8Array = new Uint8Array(response.file.data);
          const blob = new Blob([uint8Array], { type: response.file.type });
          const file = new File([blob], response.file.name, {
            type: response.file.type,
            lastModified: Date.now()
          });

          pageLogger.log(`✓ File object created`, {
            name: file.name,
            type: file.type,
            size: file.size
          });

          return file;
        } else {
          throw new Error('No file data received from background script');
        }
      } catch (error) {
        pageLogger.error(`✗ Failed to fetch file`, { url, error: String(error) });
        return null;
      }
    }

    /**
     * fillDiseaseSections - Working implementation from user
     * DO NOT MODIFY CORE LOGIC
     */
    async function fillDiseaseSections(payload) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      const nativeInputValueSetter =
        Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        ).set;

      const getSections = () =>
        Array.from(document.querySelectorAll('[data-testid^="item-repeatedFields-illnessTable-"]'));

      const addButton = () =>
        document.querySelector('[data-testid="repeatedFields-addButton-illnessTable"]');

      const mouse = (type, el) =>
        el && el.dispatchEvent(new MouseEvent(type, { bubbles: true }));

      const clickHuman = (el) => {
        mouse('mousemove', el);
        mouse('mousedown', el);
        mouse('mouseup', el);
        mouse('click', el);
      };

      const setNativeValueReactSafe = (el, val) => {
        if (!el) return;

        // Focus first (marks field as touched)
        el.focus();
        el.dispatchEvent(new Event('focus', { bubbles: true }));

        // Set value
        nativeInputValueSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        // Blur (this is what clears the error)
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        el.blur();
      };


      const setFileInput = (input, file) => {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      /* Ensure sections */
      while (getSections().length < payload.length) {
        clickHuman(addButton());
        await sleep(300);
      }

      const sections = getSections();

      for (let i = 0; i < payload.length; i++) {
        const data = payload[i];
        const section = sections[i];

        const input = section.querySelector('input.rc-select-selection-search-input');
        if (!input) continue;

        mouse('mousedown', input);
        input.focus();
        mouse('mouseup', input);
        mouse('click', input);

        await sleep(120);
        setNativeValueReactSafe(input, '');
        await sleep(80);
        
        console.log(`[fillDiseaseSections] Disease ${i + 1}: Typing disease name:`, data.disease);
        setNativeValueReactSafe(input, data.disease);
        await sleep(500); // Increased wait time for dropdown to populate

        // Find the matching option by text content
        const allOptions = document.querySelectorAll('.rc-select-item-option');
        console.log(`[fillDiseaseSections] Disease ${i + 1}: Found ${allOptions.length} options in dropdown`);
        
        let matchingOption = null;
        const availableOptions = [];
        
        for (const option of allOptions) {
          const optionText = option.textContent.trim();
          availableOptions.push(optionText);
          
          if (optionText === data.disease) {
            matchingOption = option;
            console.log(`[fillDiseaseSections] Disease ${i + 1}: ✓ Found exact match for "${data.disease}"`);
            break;
          }
        }
        
        console.log(`[fillDiseaseSections] Disease ${i + 1}: Available options:`, availableOptions);
        
        if (matchingOption) {
          console.log(`[fillDiseaseSections] Disease ${i + 1}: ✓ Clicking matching option: "${data.disease}"`);
          clickHuman(matchingOption);
        } else {
          console.warn(`[fillDiseaseSections] Disease ${i + 1}: ✗ No exact match found for "${data.disease}"`);
          console.warn(`[fillDiseaseSections] Disease ${i + 1}: Available options were:`, availableOptions);
          // Fallback: click first option if no match found
          const firstOption = document.querySelector('.rc-select-item-option');
          if (firstOption) {
            console.warn(`[fillDiseaseSections] Disease ${i + 1}: Clicking first option as fallback: "${firstOption.textContent.trim()}"`);
            clickHuman(firstOption);
          }
        }

        await sleep(300);

        if (data.date) {
          const dateInput = section.querySelector('[data-testid="illnessDate"]');
          if (dateInput) {
            console.warn('Setting date:--------------------------', dateInput);
            dateInput.focus()
            dateInput.dispatchEvent(
              new MouseEvent('mousedown', { bubbles: true })
            )
            setNativeValueReactSafe(dateInput, data.date);
          }
        }

        if (data.hospitalized === true) {
          const yesRadio = section.querySelector('input[type="radio"][value="1"]');
          if (yesRadio) clickHuman(yesRadio);

          if (data.uploadHospitalFile && data.hospitalFile) {
            const fileInput = section.querySelector('[data-testid="hospitalattach"]');
            if (fileInput) {
              setFileInput(fileInput, data.hospitalFile);
            }
          }
        }

        if (data.sawSpecialist === true) {
          const checkbox = section.querySelector('[data-testid="illnessrofe"]');
          if (checkbox && !checkbox.checked) clickHuman(checkbox);

          if (data.uploadSpecialistFile && data.specialistFile) {
            const fileInput = section.querySelector('[data-testid="rofeattach"]');
            if (fileInput) {
              setFileInput(fileInput, data.specialistFile);
            }
          }
        }

        if (data.otherDescription) {
          const otherInput = section.querySelector('[data-testid="Other2disc"]');
          if (otherInput) {
            setNativeValueReactSafe(otherInput, data.otherDescription);
          }
        }

        await sleep(300);
      }

      return true;
    }

    /**
     * executeDiseaseSelectStep - Wrapper that fetches files and calls fillDiseaseSections
     */
    async function executeDiseaseSelectStep(step, dataValue) {
      pageLogger.log(`[STEP: ${step.id}] Starting disease selection with file upload support`, { label: step.label });

      // Ensure dataValue is an array
      const diseasePayload = Array.isArray(dataValue) ? dataValue : [dataValue];
      pageLogger.log(`[STEP: ${step.id}] Processing ${diseasePayload.length} disease(s)`);

      try {
        // PHASE 1: Fetch all files from URLs (via background script)
        pageLogger.log(`[STEP: ${step.id}] Phase 1: Fetching files from URLs`);

        // Helper to extract filename from URL
        const getFilenameFromUrl = (url) => {
          try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            return filename || 'file';
          } catch (e) {
            return 'file';
          }
        };

        for (let i = 0; i < diseasePayload.length; i++) {
          const diseaseData = diseasePayload[i];

          // Fetch hospital file if needed
          if (diseaseData.uploadHospitalFile && diseaseData.hospitalFileUrl) {
            const originalFilename = getFilenameFromUrl(diseaseData.hospitalFileUrl);
            pageLogger.log(`[STEP: ${step.id}] Fetching hospital file for disease ${i + 1}`, { url: diseaseData.hospitalFileUrl, filename: originalFilename });
            const hospitalFile = await fetchFileFromUrl(diseaseData.hospitalFileUrl, originalFilename);
            if (hospitalFile) {
              diseaseData.hospitalFile = hospitalFile;
              pageLogger.log(`[STEP: ${step.id}] ✓ Hospital file ready for disease ${i + 1}`, { filename: hospitalFile.name });
            } else {
              pageLogger.warn(`[STEP: ${step.id}] ✗ Failed to fetch hospital file for disease ${i + 1}`);
            }
          }

          // Fetch specialist file if needed
          if (diseaseData.uploadSpecialistFile && diseaseData.specialistFileUrl) {
            const originalFilename = getFilenameFromUrl(diseaseData.specialistFileUrl);
            pageLogger.log(`[STEP: ${step.id}] Fetching specialist file for disease ${i + 1}`, { url: diseaseData.specialistFileUrl, filename: originalFilename });
            const specialistFile = await fetchFileFromUrl(diseaseData.specialistFileUrl, originalFilename);
            if (specialistFile) {
              diseaseData.specialistFile = specialistFile;
              pageLogger.log(`[STEP: ${step.id}] ✓ Specialist file ready for disease ${i + 1}`, { filename: specialistFile.name });
            } else {
              pageLogger.warn(`[STEP: ${step.id}] ✗ Failed to fetch specialist file for disease ${i + 1}`);
            }
          }
        }

        // PHASE 2: Call fillDiseaseSections with prepared payload
        pageLogger.log(`[STEP: ${step.id}] Phase 2: Calling fillDiseaseSections`);
        const result = await fillDiseaseSections(diseasePayload);

        if (result) {
          pageLogger.log(`[STEP: ${step.id}] ✓ Successfully completed disease selection`);
          return { success: true, stepId: step.id, reason: "diseases_filled", count: diseasePayload.length };
        } else {
          pageLogger.error(`[STEP: ${step.id}] ✗ fillDiseaseSections returned false`);
          return { success: false, stepId: step.id, reason: "fill_failed" };
        }
      } catch (error) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Exception during disease selection`, { error: String(error) });
        return { success: false, stepId: step.id, reason: "exception", error: String(error) };
      }
    }
    // ============================================================================
    // DISEASE/ILLNESS SELECTION HANDLER - END
    // ============================================================================

    // ============================================================================
    // RC MULTI-DROPDOWN SELECTION HANDLER - START
    // ============================================================================

    /**
     * selectRcMultiDropdownOptions - Selects multiple options from rc-select multi-dropdown
     * @param {Array<string>} optionsToSelect - Array of option texts to select
     * @param {Object} config - Configuration object with testId and waitForDropdownMs
     * @returns {Promise<Object>} - Result object with selected items
     */
    async function selectRcMultiDropdownOptions(optionsToSelect, config = {}) {
      const { testId = 'test', waitForDropdownMs = 3000 } = config;
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      pageLogger.log(`[selectRcMultiDropdownOptions] Starting selection`, {
        optionsToSelect,
        testId,
        waitForDropdownMs
      });

      const results = {
        attempted: [],
        selected: [],
        notFound: [],
        errors: []
      };

      try {
        // Find the rc-select container by data-testid
        const selectContainer = document.querySelector(`[data-testid="${testId}"]`);
        if (!selectContainer) {
          pageLogger.error(`[selectRcMultiDropdownOptions] ✗ Select container not found`, { testId });
          return { success: false, reason: 'container_not_found', ...results };
        }

        pageLogger.log(`[selectRcMultiDropdownOptions] ✓ Found select container`);

        // Find the input element within the select container
        const inputElement = selectContainer.querySelector('input.rc-select-selection-search-input');
        if (!inputElement) {
          pageLogger.error(`[selectRcMultiDropdownOptions] ✗ Input element not found`);
          return { success: false, reason: 'input_not_found', ...results };
        }

        inputElement.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true })
        )

        pageLogger.log(`[selectRcMultiDropdownOptions] ✓ Found input element`);

        // Focus and click the input to open dropdown
        inputElement.scrollIntoView({ block: 'center', inline: 'center' });
        await sleep(200);

        inputElement.focus();
        await sleep(100);

        inputElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        await sleep(100);
        inputElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        await sleep(100);
        inputElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        pageLogger.log(`[selectRcMultiDropdownOptions] Opened dropdown, waiting ${waitForDropdownMs}ms for options to load`);
        await sleep(waitForDropdownMs);

        // Find dropdown menu (may be in portal/body)
        let dropdownMenu = document.querySelector('.rc-select-dropdown:not(.rc-select-dropdown-hidden)');
        if (!dropdownMenu) {
          // Try alternative selector
          dropdownMenu = document.querySelector('.rc-select-dropdown[style*="opacity"]');
        }

        if (!dropdownMenu) {
          pageLogger.error(`[selectRcMultiDropdownOptions] ✗ Dropdown menu not visible`);
          return { success: false, reason: 'dropdown_not_visible', ...results };
        }

        pageLogger.log(`[selectRcMultiDropdownOptions] ✓ Found dropdown menu`);

        // Get all available options
        const allOptions = Array.from(dropdownMenu.querySelectorAll('.rc-select-item-option'));
        pageLogger.log(`[selectRcMultiDropdownOptions] Found ${allOptions.length} options in dropdown`, {
          optionTexts: allOptions.map(o => o.textContent.trim()).slice(0, 5)
        });

        if (allOptions.length === 0) {
          pageLogger.error(`[selectRcMultiDropdownOptions] ✗ No options found in dropdown`);
          return { success: false, reason: 'no_options', ...results };
        }

        // Select each option
        for (const optionText of optionsToSelect) {
          results.attempted.push(optionText);
          pageLogger.log(`[selectRcMultiDropdownOptions] Looking for option: "${optionText}"`);

          // Find matching option by exact text match
          const matchedOption = allOptions.find(opt => {
            const text = (opt.textContent || '').trim();
            return text === optionText;
          });

          if (matchedOption) {
            // Check if already selected
            const isSelected = matchedOption.classList.contains('rc-select-item-option-selected') ||
              matchedOption.getAttribute('aria-selected') === 'true';

            if (isSelected) {
              pageLogger.log(`[selectRcMultiDropdownOptions] ⊙ Already selected: "${optionText}"`);
              results.selected.push(optionText);
              continue;
            }

            // Click to select
            try {
              matchedOption.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              await sleep(100);

              matchedOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
              await sleep(50);
              matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              await sleep(50);
              matchedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              await sleep(50);
              matchedOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              await sleep(300);

              pageLogger.log(`[selectRcMultiDropdownOptions] ✓ Clicked option: "${optionText}"`);
              results.selected.push(optionText);
            } catch (e) {
              pageLogger.error(`[selectRcMultiDropdownOptions] ✗ Error clicking option: "${optionText}"`, { error: String(e) });
              results.errors.push({ option: optionText, error: String(e) });
            }
          } else {
            pageLogger.warn(`[selectRcMultiDropdownOptions] ✗ Option not found in list: "${optionText}"`);
            pageLogger.log(`[selectRcMultiDropdownOptions] Available options:`, allOptions.map(o => o.textContent.trim()));
            results.notFound.push(optionText);
          }
        }

        // Close dropdown by clicking outside or pressing Escape
        await sleep(200);
        document.body.click();
        await sleep(300);

        pageLogger.log(`[selectRcMultiDropdownOptions] Summary:`, {
          attempted: results.attempted.length,
          selected: results.selected.length,
          notFound: results.notFound.length,
          errors: results.errors.length
        });

        const success = results.selected.length > 0 && results.errors.length === 0;
        return {
          success,
          ...results
        };
      } catch (error) {
        pageLogger.error(`[selectRcMultiDropdownOptions] ✗ Exception:`, { error: String(error), stack: error.stack });
        return {
          success: false,
          reason: 'exception',
          error: String(error),
          ...results
        };
      }
    }

    /**
     * executeRcMultiDropdownStep - Step handler for rc multi-dropdown selection
     */
    async function executeRcMultiDropdownStep(step, dataValue) {
      pageLogger.log(`[STEP: ${step.id}] Starting rc multi-dropdown selection`, { label: step.label });

      // Ensure dataValue is an array
      const optionsToSelect = Array.isArray(dataValue) ? dataValue : [dataValue];
      pageLogger.log(`[STEP: ${step.id}] Options to select:`, optionsToSelect);

      try {
        const result = await selectRcMultiDropdownOptions(optionsToSelect, {
          testId: step.testId || 'test',
          waitForDropdownMs: step.waitForDropdownMs || 3000
        });

        if (result.success) {
          pageLogger.log(`[STEP: ${step.id}] ✓ Successfully selected ${result.selected.length} options`);
          if (result.notFound.length > 0) {
            pageLogger.warn(`[STEP: ${step.id}] Some options not found:`, result.notFound);
          }
          return {
            success: true,
            stepId: step.id,
            reason: "options_selected",
            selected: result.selected,
            notFound: result.notFound
          };
        } else {
          pageLogger.error(`[STEP: ${step.id}] ✗ Failed to select options`, result);
          return {
            success: false,
            stepId: step.id,
            reason: result.reason || "selection_failed",
            ...result
          };
        }
      } catch (error) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Exception:`, { error: String(error) });
        return { success: false, stepId: step.id, reason: "exception", error: String(error) };
      }
    }
    // ============================================================================
    // RC MULTI-DROPDOWN SELECTION HANDLER - END
    // ============================================================================

    // ============================================================================
    // ACCIDENT AND CONSENT SECTION HANDLER - START
    // ============================================================================
    
    /**
     * fillAccidentAndConsentSection - Fills accident details, army injury, and consent
     * @param {Object} payload - Accident and consent data
     * @returns {Promise<boolean>} - Success status
     */
    async function fillAccidentAndConsentSection(payload) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      const nativeInputValueSetter =
        Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        ).set;

      const mouse = (type, el) =>
        el && el.dispatchEvent(new MouseEvent(type, { bubbles: true }));

      const clickHuman = (el) => {
        mouse('mousemove', el);
        mouse('mousedown', el);
        mouse('mouseup', el);
        mouse('click', el);
      };

      const setNativeValueReactSafe = (el, val) => {
        if (!el) return;
        el.focus();
        el.dispatchEvent(new Event('focus', { bubbles: true }));
        nativeInputValueSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        el.blur();
      };

      const setFileInput = (input, file) => {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      pageLogger.log('[fillAccidentAndConsentSection] Starting', payload);

      /* ===========================
         1. Accident radio group
         (Yes / No)
      =========================== */

      if (typeof payload.accident === 'boolean') {
        const value = payload.accident ? '2' : '1'; // 2 = כן (Yes), 1 = לא (No)
        const radio = document.querySelector(
          `[data-testid="Accident"][value="${value}"]`
        );
        if (radio) {
          pageLogger.log(`[fillAccidentAndConsentSection] Setting accident radio to: ${payload.accident ? 'Yes' : 'No'}`);
          clickHuman(radio);
        } else {
          pageLogger.warn(`[fillAccidentAndConsentSection] Accident radio not found for value: ${value}`);
        }
      }

      /* ===========================
         2. Accident date (required)
      =========================== */

      if (payload.accidentDate) {
        const dateInput = document.querySelector('[data-testid="Accidentdate"]');
        if (dateInput) {
          pageLogger.log(`[fillAccidentAndConsentSection] Setting accident date: ${payload.accidentDate}`);
          setNativeValueReactSafe(dateInput, payload.accidentDate);
        } else {
          pageLogger.warn(`[fillAccidentAndConsentSection] Accident date input not found`);
        }
      }

      /* ===========================
         3. Army injury radio group
      =========================== */

      if (typeof payload.armyInjury === 'boolean') {
        const value = payload.armyInjury ? '2' : '1'; // 2 = כן (Yes), 1 = לא (No)
        const radio = document.querySelector(
          `[data-testid="Army_injury"][value="${value}"]`
        );
        if (radio) {
          pageLogger.log(`[fillAccidentAndConsentSection] Setting army injury radio to: ${payload.armyInjury ? 'Yes' : 'No'}`);
          clickHuman(radio);
        } else {
          pageLogger.warn(`[fillAccidentAndConsentSection] Army injury radio not found for value: ${value}`);
        }
      }

      await sleep(200);

      /* ===========================
         4. Army injury file upload
      =========================== */

      if (payload.uploadArmyFile === true && payload.armyFile) {
        const fileInput = document.querySelector(
          '[data-testid="Army_injuryattach"]'
        );
        if (fileInput) {
          pageLogger.log(`[fillAccidentAndConsentSection] Uploading army injury file:`, { name: payload.armyFile.name, size: payload.armyFile.size });
          setFileInput(fileInput, payload.armyFile);
        } else {
          pageLogger.warn(`[fillAccidentAndConsentSection] Army injury file input not found`);
        }
      }

      /* ===========================
         5. Consent checkbox
      =========================== */

      if (payload.statement === true) {
        const checkbox = document.querySelector('[data-testid="Statement"]');
        if (checkbox && !checkbox.checked) {
          pageLogger.log(`[fillAccidentAndConsentSection] Checking consent/statement checkbox`);
          clickHuman(checkbox);
        } else if (!checkbox) {
          pageLogger.warn(`[fillAccidentAndConsentSection] Consent checkbox not found`);
        } else {
          pageLogger.log(`[fillAccidentAndConsentSection] Consent checkbox already checked`);
        }
      }

      pageLogger.log('[fillAccidentAndConsentSection] ✓ Completed');
      return true;
    }

    /**
     * executeAccidentConsentStep - Step handler for accident and consent section
     */
    async function executeAccidentConsentStep(step, dataValue) {
      pageLogger.log(`[STEP: ${step.id}] Starting accident and consent section`, { label: step.label });

      try {
        // Build payload from test data
        const payload = {
          accident: dataValue.accident,
          accidentDate: dataValue.accidentDate,
          armyInjury: dataValue.armyInjury,
          uploadArmyFile: dataValue.uploadArmyFile,
          statement: dataValue.statement
        };

        // Fetch army file if needed
        if (dataValue.uploadArmyFile && dataValue.armyFileUrl) {
          pageLogger.log(`[STEP: ${step.id}] Fetching army injury file from URL`, { url: dataValue.armyFileUrl });
          const armyFile = await fetchFileFromUrl(dataValue.armyFileUrl, getFilenameFromUrl(dataValue.armyFileUrl));
          if (armyFile) {
            payload.armyFile = armyFile;
            pageLogger.log(`[STEP: ${step.id}] ✓ Army file ready`, { filename: armyFile.name });
          } else {
            pageLogger.warn(`[STEP: ${step.id}] ✗ Failed to fetch army file`);
          }
        }

        // Call fillAccidentAndConsentSection
        const result = await fillAccidentAndConsentSection(payload);

        if (result) {
          pageLogger.log(`[STEP: ${step.id}] ✓ Successfully filled accident and consent section`);
          return { success: true, stepId: step.id, reason: "section_filled" };
        } else {
          pageLogger.error(`[STEP: ${step.id}] ✗ fillAccidentAndConsentSection returned false`);
          return { success: false, stepId: step.id, reason: "fill_failed" };
        }
      } catch (error) {
        pageLogger.error(`[STEP: ${step.id}] ✗ Exception:`, { error: String(error) });
        return { success: false, stepId: step.id, reason: "exception", error: String(error) };
      }
    }

    // Helper function to extract filename from URL (if not already defined)
    function getFilenameFromUrl(url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        return filename || 'file';
      } catch (e) {
        return 'file';
      }
    }
    
    // ============================================================================
    // ACCIDENT AND CONSENT SECTION HANDLER - END
    // ============================================================================

    // ============================================================================
    // SECOND SIGNATURE SECTION HANDLER - START
    // ============================================================================

    /**
     * Fill second signature section (manual upload by user)
     * Selects "Scanned signature" radio and waits for user to upload
     * @param {Object} payload - Complete payload object
     * @returns {Promise<boolean>} - Returns true on success
     */
    async function fillSecondSignatureSection(payload) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      const click = el => {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      };

      /* ===========================
         1. Select "Scanned signature" radio (value="2")
      =========================== */

      const scannedRadio = Array.from(
        document.querySelectorAll('input[type="radio"][value="2"]')
      ).find(r => {
        const label = document.querySelector(`label[for="${r.id}"]`);
        return label?.textContent?.includes('Scanned signature') || label?.textContent?.includes('חתימה סרוקה');
      });

      if (!scannedRadio) {
        throw new Error('Second scanned signature radio not found');
      }

      click(scannedRadio);
      await sleep(300);

      /* ===========================
         2. Manual upload by user
      =========================== */

      // Ask user to upload the file manually
      alert('נא להעלות את חתימתך הסרוקה עתה (חתימה שנייה).\n\nPlease upload your scanned signature now (second signature).\n\nלחץ אישור כדי להמשיך / Click OK to continue');

      // Wait for upload to complete automatically
      const waitForUploadComplete = async () => {
        const maxWaitTime = 300000; // 5 minutes
        const startTime = Date.now();
        let uploadStarted = false;

        while (Date.now() - startTime < maxWaitTime) {
          await sleep(500);

          const iconsWrapper = document.querySelector('div._newestWrapperIcons_1ycd2_297');
          const spinner = iconsWrapper?.querySelector('.MuiCircularProgress-root, [data-testid="loading-indicator"]');
          
          // Step 1: Wait for upload to start (iconsWrapper appears with spinner)
          if (!uploadStarted && iconsWrapper && spinner) {
            uploadStarted = true;
            console.log('[SIGNATURE] Upload started, spinner detected');
            continue;
          }
          
          // Step 2: After upload started, wait for it to complete
          if (uploadStarted && iconsWrapper && !spinner) {
            const fileNameEl = document.querySelector('span[data-testid="fileName"]');
            const fileSizeEl = document.querySelector('span[data-testid="fileSize"]');
            const viewIcon = iconsWrapper.querySelector('[data-testid^="viewFile"]');
            const deleteIcon = iconsWrapper.querySelector('[data-testid^="deleteFile"]');
            
            if (fileNameEl && fileSizeEl && viewIcon && deleteIcon) {
              const fileName = fileNameEl.textContent.trim();
              const fileSize = fileSizeEl.textContent.trim();
              
              // Complete: fileName exists, fileSize has content (KB/MB), view/delete icons present, no spinner
              if (fileName.length > 0 && fileSize.length > 0 && (fileSize.includes('KB') || fileSize.includes('MB'))) {
                console.log('[SIGNATURE] Upload complete:', fileName, fileSize);
                alert('✅ העלאת הטופס הושלמה!\n\n✅ Form uploaded!\n\nהטופס שלך הוגש בהצלחה / Your form has been submitted successfully');
                return true;
              }
            }
          }
        }

        throw new Error('Timeout waiting for second signature upload');
      };

      await waitForUploadComplete();

      return true;
    }

    /**
     * Execute second signature section step
     * No file fetching needed - user uploads manually
     * @param {Object} step - Step configuration object
     * @param {Object} payload - Complete payload object
     * @returns {Promise<Object>} - Result object with success status
     */
    async function executeSecondSignatureStep(step, payload) {
      pageLogger.log(`[${step.id}] Executing second signature section`);

      try {
        // Call fill function (no file parameter - user uploads manually)
        await fillSecondSignatureSection(payload);

        pageLogger.log(`[${step.id}] Second signature section filled successfully`);
        return { success: true, stepId: step.id, reason: "second_signature_filled" };

      } catch (error) {
        pageLogger.error(`[${step.id}] Failed to fill second signature section`, { error: String(error) });
        return { success: false, stepId: step.id, reason: "second_signature_error", error: String(error) };
      }
    }

    // ============================================================================
    // SECOND SIGNATURE SECTION HANDLER - END
    // ============================================================================

    // ============================================================================
    // OTHER DOCUMENTS SECTION HANDLER - START
    // ============================================================================

    /**
     * Fill other documents section - User's working function
     * Uploads additional documents (passport, medical reports, consent forms, etc.)
     * @param {Array} entries - Array of document objects with name, fileType, and optional file property
     * @returns {Promise<Object>} - Returns result object with requested and results arrays
     */
    async function fillOtherDocumentsSections(entries = []) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      // normalize entries: { name: string, fileType: 'image'|'pdf', file?: File }
      const normalized = Array.isArray(entries) && entries.length > 0
        ? entries.map(e => ({ 
            name: (e && e.name) ? String(e.name) : 'doc', 
            fileType: (e && e.fileType) === 'pdf' ? 'pdf' : 'image',
            file: e && e.file ? e.file : null // Real File object if provided
          }))
        : [
            { name: 'doc-1', fileType: 'image', file: null },
            { name: 'doc-2', fileType: 'image', file: null },
            { name: 'doc-3', fileType: 'pdf', file: null }
          ];

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

      const clickHuman = el => {
        if (!el) return;
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      };

      const setNativeValueReactSafe = (el, val) => {
        if (!el) return;
        el.focus();
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      };

      const waitFor = (predicate, timeout = 6000, interval = 100) =>
        new Promise((res, rej) => {
          const start = Date.now();
          const id = setInterval(() => {
            try {
              if (predicate()) {
                clearInterval(id);
                return res(true);
              }
              if (Date.now() - start > timeout) {
                clearInterval(id);
                return rej(new Error('waitFor timeout'));
              }
            } catch (e) {
              // swallow
            }
          }, interval);
        });

      // helpers
      const getSections = () => Array.from(document.querySelectorAll('[data-testid^="item-repeatedFields-other-"]'));
      const addButton = () => document.querySelector('[data-testid="repeatedFields-addButton-other"]');

      // create dummy file in-page (used if no real file provided)
      const createDummyFile = (baseName = 'file', type = 'image') => {
        if (type === 'pdf') {
          const pdfContent = '%PDF-1.4\n%Dummy\n';
          return new File([new Blob([pdfContent], { type: 'application/pdf' })], `${baseName}.pdf`, { type: 'application/pdf' });
        }
        // small jpeg header/trailer
        const jpegBytes = new Uint8Array([0xff,0xd8,0xff,0xd9]);
        return new File([new Blob([jpegBytes], { type: 'image/jpeg' })], `${baseName}.jpg`, { type: 'image/jpeg' });
      };

      // ensure enough sections
      let sections = getSections();
      while (sections.length < normalized.length) {
        const btn = addButton();
        if (!btn) throw new Error('Add button not found');
        clickHuman(btn);
        await sleep(250);
        sections = getSections();
      }

      // operate on the first N sections (they are ordered in DOM)
      const results = [];
      for (let i = 0; i < normalized.length; i++) {
        const entry = normalized[i];
        const section = sections[i];
        if (!section) {
          results.push({ index: i, name: entry.name, ok: false, error: 'section not found' });
          continue;
        }

        try {
          // name input
          const nameInput = section.querySelector('[data-testid="otherattachname"]');
          if (!nameInput) throw new Error('name input not found in section');

          setNativeValueReactSafe(nameInput, entry.name);
          await sleep(80);

          // file input and bound label
          const fileInput = section.querySelector('input[type="file"][data-testid="otherattach"]');
          if (!fileInput) throw new Error('file input not found in section');

          const fileLabel = section.querySelector(`label[for="${fileInput.id}"]`) || section.querySelector('label');
          if (!fileLabel) throw new Error('file label not found for input');

          // click label to arm the control (some custom components require it)
          clickHuman(fileLabel);
          await sleep(40);

          // Use real file if provided, otherwise create dummy file
          const safeFile = entry.file || createDummyFile(entry.name.replace(/\s+/g, '_'), entry.fileType === 'pdf' ? 'pdf' : 'image');

          const dt = new DataTransfer();
          dt.items.add(safeFile);
          fileInput.files = dt.files;

          // dispatch events
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));

          // wait until the input actually contains the file (React may update)
          await waitFor(() => fileInput.files && fileInput.files.length > 0, 5000, 100);

          // optional: wait until the UI shows file name/size inside this section
          // prefer localized selector inside section for safety
          await waitFor(() => {
            const nameEl = section.querySelector('[data-testid="fileName"]');
            const sizeEl = section.querySelector('[data-testid="fileSize"]');
            // either fileName text exists or fileInput.files is set (we already checked files)
            return (nameEl && nameEl.textContent.trim().length > 0) || (sizeEl && sizeEl.textContent.trim().length > 0) || (fileInput.files && fileInput.files.length > 0);
          }, 4000, 100);

          results.push({ index: i, name: entry.name, ok: true, fileName: safeFile.name, fileSize: safeFile.size });
        } catch (err) {
          results.push({ index: i, name: entry.name, ok: false, error: String(err) });
        }

        // small gap between sections
        await sleep(120);
      }

      return { requested: normalized, results };
    }

    /**
     * Execute other documents section step
     * Fetches document files from URLs and uploads them
     * @param {Object} step - Step configuration object
     * @param {Array} documents - Array of document objects with fileUrl
     * @returns {Promise<Object>} - Result object with success status
     */
    async function executeOtherDocumentsStep(step, documents) {
      pageLogger.log(`[${step.id}] Executing other documents section`, {
        documentCount: documents?.length || 0
      });

      try {
        if (!documents || !Array.isArray(documents) || documents.length === 0) {
          pageLogger.log(`[${step.id}] No documents to upload, skipping`);
          return { success: true, stepId: step.id, reason: "no_documents_to_upload", skipped: true };
        }

        // Fetch all document files from URLs
        const documentsWithFiles = [];
        
        for (const doc of documents) {
          if (doc.fileUrl) {
            pageLogger.log(`[${step.id}] Fetching document file from URL`, { 
              name: doc.name, 
              url: doc.fileUrl 
            });

            const filename = getFilenameFromUrl(doc.fileUrl);

            const fileData = await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage(
                { action: 'fetchFile', url: doc.fileUrl, filename: filename },
                (response) => {
                  if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                  }
                  if (!response || !response.success) {
                    return reject(new Error(response?.error || 'Failed to fetch document file'));
                  }
                  resolve(response.file);
                }
              );
            });

            // Convert the serialized file data back to File object
            const uint8Array = new Uint8Array(fileData.data);
            const blob = new Blob([uint8Array], { type: fileData.type });
            const file = new File([blob], fileData.name, { type: fileData.type });

            pageLogger.log(`[${step.id}] Document file fetched successfully`, {
              name: fileData.name,
              size: fileData.size,
              type: fileData.type
            });

            documentsWithFiles.push({
              name: doc.name,
              fileType: doc.fileType,
              file: file
            });
          } else {
            // No fileUrl - use dummy file
            documentsWithFiles.push({
              name: doc.name,
              fileType: doc.fileType,
              file: null // Will create dummy in fillOtherDocumentsSections
            });
          }
        }

        // Call user's working function
        await fillOtherDocumentsSections(documentsWithFiles);

        pageLogger.log(`[${step.id}] Other documents section filled successfully`);
        return { success: true, stepId: step.id, reason: "other_documents_uploaded" };

      } catch (error) {
        pageLogger.error(`[${step.id}] Failed to fill other documents section`, { error: String(error) });
        return { success: false, stepId: step.id, reason: "other_documents_error", error: String(error) };
      }
    }

    // ============================================================================
    // OTHER DOCUMENTS SECTION HANDLER - END
    // ============================================================================

    // ============================================================================
    // FINAL DECLARATIONS SECTION HANDLER - START
    // ============================================================================

    /**
     * Fill final declarations section
     * Checks three checkboxes: final declaration (required), video medical committee (optional), refuse employer contact (optional)
     * @param {Object} payload - Complete payload object with declaration fields
     * @returns {Promise<boolean>} - Returns true on success
     */
    async function fillFinalDeclarationsSection(payload) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      const clickHuman = (el) => {
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      };

      /* ===========================
         1. Final Declaration (REQUIRED)
      =========================== */

      if (payload.finalDeclaration) {
        const finalDecl = document.querySelector('[data-testid="Decheck"]');
        if (finalDecl && !finalDecl.checked) {
          clickHuman(finalDecl);
          await sleep(200);
        }
      }

      /* ===========================
         2. Video Medical Committee (OPTIONAL)
      =========================== */

      if (payload.videoMedicalCommittee) {
        const videoCommittee = document.querySelector('[data-testid="SubmitionVideoChat"]');
        if (videoCommittee && !videoCommittee.checked) {
          clickHuman(videoCommittee);
          await sleep(200);
        }
      }

      /* ===========================
         3. Refuse Employer Contact (OPTIONAL)
      =========================== */

      if (payload.refuseEmployerContact) {
        const refuseEmployer = document.querySelector('[data-testid="Tofes100Disclaimer"]');
        if (refuseEmployer && !refuseEmployer.checked) {
          clickHuman(refuseEmployer);
          await sleep(200);
        }
      }

      return true;
    }

    /**
     * Execute final declarations section step
     * @param {Object} step - Step configuration object
     * @param {Object} payload - Complete payload object
     * @returns {Promise<Object>} - Result object with success status
     */
    async function executeFinalDeclarationsStep(step, payload) {
      pageLogger.log(`[${step.id}] Executing final declarations section`, {
        finalDeclaration: payload.finalDeclaration,
        videoMedicalCommittee: payload.videoMedicalCommittee,
        refuseEmployerContact: payload.refuseEmployerContact
      });

      try {
        // Call fill function
        await fillFinalDeclarationsSection(payload);

        pageLogger.log(`[${step.id}] Final declarations section filled successfully`);
        return { success: true, stepId: step.id, reason: "final_declarations_filled" };

      } catch (error) {
        pageLogger.error(`[${step.id}] Failed to fill final declarations section`, { error: String(error) });
        return { success: false, stepId: step.id, reason: "final_declarations_error", error: String(error) };
      }
    }

    // ============================================================================
    // FINAL DECLARATIONS SECTION HANDLER - END
    // ============================================================================

    // ============================================================================
    // HEALTH FUND AND SIGNATURE SECTION HANDLER - START
    // ============================================================================

    /**
     * Fill health fund and signature section
     * User's working function - handles health fund selection, details, declaration, and signature upload
     * @param {Object} payload - Complete payload object with health fund and signature fields
     * @param {File} signatureFile - File object for signature (if uploadSignatureFile is true)
     * @returns {Promise<boolean>} - Returns true on success
     */
    async function fillHealthFundAndSignatureSection(payload, signatureFile = null) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      /* ===========================
         Utilities
      =========================== */

      const nativeInputValueSetter =
        Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        ).set;

      const click = el => {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      };

      const setValue = (el, val) => {
        el.focus();
        nativeInputValueSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      };

      const waitFor = (fn, timeout = 7000, step = 100) =>
        new Promise((res, rej) => {
          const start = Date.now();
          const i = setInterval(() => {
            try {
              if (fn()) {
                clearInterval(i);
                res(true);
              } else if (Date.now() - start > timeout) {
                clearInterval(i);
                rej(new Error('waitFor timeout'));
              }
            } catch {}
          }, step);
        });

      /* ===========================
         1. קופת חולים
      =========================== */

      const ALLOWED_FUNDS = ['כללית', 'לאומית', 'מאוחדת', 'מכבי', 'אחר'];

      if (payload.healthFund && ALLOWED_FUNDS.includes(payload.healthFund)) {
        const root = document.querySelector('[data-testid="sugKupa"]');
        const input = root?.querySelector('input');

        if (input) {
          click(input);
          await sleep(150);
          setValue(input, payload.healthFund);
          await sleep(250);

          const opt = Array.from(document.querySelectorAll('.rc-select-item-option'))
            .find(o =>
              o.querySelector('.rc-select-item-option-content')
                ?.textContent.trim() === payload.healthFund
            );

          if (opt) click(opt);
        }
      }

      /* ===========================
         2. פרט
      =========================== */

      if (payload.healthDetails) {
        const details = document.querySelector('[data-testid="healthDetails"]');
        if (details) setValue(details, payload.healthDetails);
      }

      /* ===========================
         3. Declaration
      =========================== */

      const decl = document.querySelector('[data-testid="Declares"]');
      if (decl && !decl.checked) click(decl);

      /* ===========================
         4. Select "חתימה סרוקה"
      =========================== */

      const scannedRadio = Array.from(
        document.querySelectorAll('input[type="radio"]')
      ).find(r =>
        r.nextElementSibling?.textContent?.includes('חתימה סרוקה')
      );

      if (!scannedRadio) {
        throw new Error('Scanned signature radio not found');
      }

      click(scannedRadio);

      await sleep(300);

      /* ===========================
         5. Manual upload by user
      =========================== */

      // Ask user to upload the file manually
      alert('נא להעלות את חתימתך הסרוקה כעת.\n\nPlease upload your scanned signature now.\n\nלחץ אישור כדי להמשיך / Click OK to continue');

      // Wait for upload to complete
      const waitForUploadComplete = async () => {
        const maxWaitTime = 300000; // 5 minutes
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
          await sleep(1000);

          // Check if upload is complete by looking for the two action icons (view and delete)
          const iconsWrapper = document.querySelector('._newestWrapperIcons_1ycd2_297');
          
          if (iconsWrapper) {
            // Check if loading spinner is gone and two icons exist
            const loadingSpinner = iconsWrapper.querySelector('.MuiCircularProgress-root');
            const viewIcon = iconsWrapper.querySelector('[data-testid="viewFile_undefined"]');
            const deleteIcon = iconsWrapper.querySelector('[data-testid="deleteFile_undefined"]');

            if (!loadingSpinner && viewIcon && deleteIcon) {
              // Upload complete - ask for confirmation
              const confirmed = confirm('העלאת הקובץ הושלמה.\n\nFile upload completed.\n\nהאם הקובץ נכון או שברצונך לשנות אותו?\nIs the file correct or do you want to change it?\n\nלחץ אישור אם הקובץ נכון / Click OK if file is correct\nלחץ ביטול כדי לשנות / Click Cancel to change');

              if (confirmed) {
                return true;
              } else {
                // User wants to change - wait for new upload
                alert('נא להעלות קובץ חדש.\n\nPlease upload a new file.\n\nלחץ אישור כדי להמשיך / Click OK to continue');
                await sleep(2000); // Wait a bit before checking again
                continue;
              }
            }
          }
        }

        throw new Error('Timeout waiting for signature upload');
      };

      await waitForUploadComplete();

      return true;
    }

    /**
     * Execute health fund and signature section step
     * No file fetching needed - user uploads manually
     * @param {Object} step - Step configuration object
     * @param {Object} payload - Complete payload object
     * @returns {Promise<Object>} - Result object with success status
     */
    async function executeHealthFundSignatureStep(step, payload) {
      pageLogger.log(`[${step.id}] Executing health fund and signature section`, {
        healthFund: payload.healthFund
      });

      try {
        // Call user's working function (no file parameter needed - user uploads manually)
        await fillHealthFundAndSignatureSection(payload, null);

        pageLogger.log(`[${step.id}] Health fund and signature section filled successfully`);
        return { success: true, stepId: step.id, reason: "health_fund_signature_filled" };

      } catch (error) {
        pageLogger.error(`[${step.id}] Failed to fill health fund and signature section`, { error: String(error) });
        return { success: false, stepId: step.id, reason: "health_fund_signature_error", error: String(error) };
      }
    }

    // ============================================================================
    // HEALTH FUND AND SIGNATURE SECTION HANDLER - END
    // ============================================================================

    /**
     * MAIN AUTOMATION FLOW
     */
    return (async () => {
      const results = {
        flowId: flowDef.id,
        startTime: Date.now(),
        steps: [],
        status: "running"
      };

      try {
        pageLogger.log("=== STARTING AUTOMATION ===", { flowId: flowDef.id, stepCount: flowDef.steps.length });

        for (const step of flowDef.steps) {
          pageLogger.log(`\n--- STEP [${step.id}] ---`, { type: step.type, label: step.label });
          
          // Calculate progress
          const stepIndex = flowDef.steps.indexOf(step);
          const totalSteps = flowDef.steps.length;
          const progressPercent = Math.round((stepIndex / totalSteps) * 100);
          
          // Send field progress update
          sendStatusUpdate(
            'filling_field',
            `ממלא שדה: ${step.label} (${stepIndex + 1}/${totalSteps}) - ${progressPercent}%`,
            false,
            false,
            false
          );

          // Check if step is conditional
          if (step.conditional) {
            const conditionalStepId = step.conditional;
            const conditionalValue = step.conditionalValue;
            const conditionalCheck = step.conditionalCheck;
            const conditionalResult = results.steps.find(r => r.stepId === conditionalStepId);

            if (!conditionalResult || !conditionalResult.success) {
              pageLogger.log(`[STEP: ${step.id}] Skipping conditional step - prerequisite not met`, { prerequisite: conditionalStepId });
              results.steps.push({ success: true, stepId: step.id, reason: "skipped_conditional", skipped: true });
              continue;
            }

            // Get the value from the conditional step
            const conditionalStepDef = flowDef.steps.find(s => s.id === conditionalStepId);
            const payloadValue = payload[conditionalStepDef?.dataKey];

            // Check if the conditional value matches (use conditionalCheck function if provided)
            let conditionMet = false;
            if (typeof conditionalCheck === 'function') {
              conditionMet = conditionalCheck(payloadValue);
              pageLogger.log(`[STEP: ${step.id}] Checking condition with custom function`, { payloadValue, conditionMet });
            } else if (conditionalValue !== undefined) {
              conditionMet = String(payloadValue) === String(conditionalValue);
              pageLogger.log(`[STEP: ${step.id}] Checking condition with value match`, { expectedValue: conditionalValue, actualValue: payloadValue, conditionMet });
            }

            if (!conditionMet) {
              pageLogger.log(`[STEP: ${step.id}] Skipping conditional step - condition not matched`, { prerequisite: conditionalStepId, payloadValue });
              results.steps.push({ success: true, stepId: step.id, reason: "skipped_condition_not_met", skipped: true });
              continue;
            }

            // Wait for conditional elements to appear on the page
            pageLogger.log(`[STEP: ${step.id}] Condition matched, waiting for conditional elements to render`);
            try {
              await waitForText(step.elementText, 10000, 300);
              pageLogger.log(`[STEP: ${step.id}] Conditional elements found on page`);
            } catch (e) {
              pageLogger.warn(`[STEP: ${step.id}] Conditional elements not found after waiting`, { error: String(e) });
              // Don't fail - just try to execute anyway
            }
          }

          let stepResult;

          if (step.type === "checkbox") {
            // For checkboxes with dataKey, only check if the payload value is true/truthy
            if (step.dataKey) {
              const dataValue = payload[step.dataKey];
              if (dataValue && dataValue !== "false" && dataValue !== "0" && dataValue !== 0) {
                stepResult = await executeCheckboxStep(step);
              } else {
                pageLogger.log(`[STEP: ${step.id}] Skipping checkbox - dataKey value is false/falsy`, { dataKey: step.dataKey, value: dataValue });
                stepResult = { success: true, stepId: step.id, reason: "skipped_checkbox_false", skipped: true };
              }
            } else {
              // No dataKey, always execute
              stepResult = await executeCheckboxStep(step);
            }
          } else if (step.type === "radio") {
            const dataValue = payload[step.dataKey];
            stepResult = await executeRadioStep(step, dataValue);
          } else if (step.type === "text_input") {
            const dataValue = payload[step.dataKey];
            stepResult = await executeTextInputStep(step, dataValue);
          } else if (step.type === "button") {
            stepResult = await executeButtonStep(step);
          } else if (step.type === "select") {
            const dataValue = payload[step.dataKey];
            stepResult = await executeSelectStep(step, dataValue);
          } else if (step.type === "checkbox_multi") {
            const dataValue = payload[step.dataKey];
            stepResult = await executeCheckboxMultiStep(step, dataValue);
          } else if (step.type === "disease_select") {
            const dataValue = payload[step.dataKey];
            stepResult = await executeDiseaseSelectStep(step, dataValue);
          } else if (step.type === "rc_multi_dropdown") {
            const dataValue = payload[step.dataKey];
            stepResult = await executeRcMultiDropdownStep(step, dataValue);
          } else if (step.type === "accident_consent") {
            stepResult = await executeAccidentConsentStep(step, payload);
          } else if (step.type === "health_fund_signature") {
            stepResult = await executeHealthFundSignatureStep(step, payload);
          } else if (step.type === "final_declarations") {
            stepResult = await executeFinalDeclarationsStep(step, payload);
          } else if (step.type === "other_documents") {
            const dataValue = payload[step.dataKey];
            stepResult = await executeOtherDocumentsStep(step, dataValue);
          } else if (step.type === "second_signature") {
            stepResult = await executeSecondSignatureStep(step, payload);
          } else {
            pageLogger.warn(`[STEP: ${step.id}] Unknown step type`, { type: step.type });
            stepResult = { success: false, stepId: step.id, reason: "unknown_type" };
          }

          // Log and store result
          if (stepResult.success) {
            pageLogger.log(`✓ [STEP: ${step.id}] Success`, { reason: stepResult.reason });
            
            // Send completion update
            if (!stepResult.skipped) {
              const stepIndex = flowDef.steps.indexOf(step);
              const totalSteps = flowDef.steps.length;
              const progressPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);
              
              sendStatusUpdate(
                'field_completed',
                `✓ ${step.label} הושלם בהצלחה (${stepIndex + 1}/${totalSteps}) - ${progressPercent}%`,
                false,
                false,
                false
              );
            }
          } else {
            pageLogger.error(`✗ [STEP: ${step.id}] Failed`, { reason: stepResult.reason });
            
            // Send failure notification
            sendStatusUpdate(
              'field_failed',
              `✗ כשל בשדה: ${step.label} - ${stepResult.reason}`,
              true,
              false,
              false
            );
          }

          results.steps.push(stepResult);

          // Brief pause between steps
          await sleep(500);
        }

        results.status = "completed";
        results.endTime = Date.now();
        results.duration = results.endTime - results.startTime;

        pageLogger.log("=== AUTOMATION COMPLETED ===", results);
        return results;
      } catch (err) {
        pageLogger.error("=== AUTOMATION ERROR ===", { error: String(err) });
        results.status = "error";
        results.error = String(err);
        results.endTime = Date.now();
        results.duration = results.endTime - results.startTime;
        return results;
      }
    })();
  } // end inPageMain

  // Check if we're in a content script or background script
  const isContentScript = typeof document !== "undefined" && document.documentElement;

  if (isContentScript) {
    // We're already in the page context (content script), execute directly
    flowLogger.log("Executing directly in content script context");
    return inPageMain(flowConfig, flowConfig.testData);
  }

  // We're in a background/popup context, need to inject via chrome.scripting
  if (typeof chrome !== "undefined" && chrome.scripting && chrome.tabs) {
    try {
      flowLogger.log("Opening new tab with chrome.tabs.create");
      const createdTab = await new Promise((resolve, reject) => {
        try {
          chrome.tabs.create({ url: flowConfig.url, active: true }, (tab) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(tab);
          });
        } catch (e) {
          reject(e);
        }
      });

      const tabId = createdTab && createdTab.id;
      if (!tabId) throw new Error("Failed to create tab.");
      flowLogger.log("Tab created successfully", { tabId });

      // Wait for tab to load
      await new Promise((resolve) => {
        const max = Date.now() + 30000;
        const check = () => {
          chrome.tabs.get(tabId, (t) => {
            if (!t) return resolve();
            if (t.status === "complete" || Date.now() > max) {
              flowLogger.log("Tab loading complete or timeout reached", { status: t && t.status });
              return resolve();
            }
            setTimeout(check, 300);
          });
        };
        check();
      });

      flowLogger.log("Injecting automation script into tab", { tabId });
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: inPageMain,
        args: [flowConfig, flowConfig.testData],
        world: "MAIN"
      });

      flowLogger.log("Script injection completed", { results });
      return results;
    } catch (err) {
      flowLogger.warn("Chrome scripting failed, attempting fallback", { error: String(err) });
      try {
        flowLogger.log("Attempting fallback with window.open");
        const win = window.open(flowConfig.url, "_blank");
        if (!win) throw new Error("Popup blocked or window.open failed.");
        return { status: "fallback_opened" };
      } catch (fallbackErr) {
        flowLogger.error("All approaches failed", { error: String(fallbackErr) });
        return { status: "failed", message: String(fallbackErr) };
      }
    }
  }

  flowLogger.error("Chrome API not available and not in content script context");
  return { status: "failed", message: "Chrome API not available" };
}

/**
 * ============================================================================
 * PUBLIC API: Invoke flows by name or custom invocations
 * ============================================================================
 */

async function invokeFlowByName(flowName, customTestData = null) {
  const flowConfig = FLOW_CONFIGS[flowName];
  if (!flowConfig) {
    console.error(`[API] Flow not found: ${flowName}`);
    return { status: "failed", message: `Flow "${flowName}" not found` };
  }

  const configToUse = { ...flowConfig };
  if (customTestData) {
    configToUse.testData = customTestData;
    // Start success monitoring for T7801 on government form with user_id and case_id
    if (flowName === 'T7801' && customTestData.user_id && customTestData.case_id) {
      startSuccessPageMonitoring(customTestData);
    }
  }

  return invokeFlow(configToUse);
}

// Auto-export for popup/background scripts
console.log("[CONTENT.JS] Setting up message listener and exports");

if (typeof window !== "undefined") {
  console.log("[CONTENT.JS] Window available, setting up globals");
  window.invokeFlowByName = invokeFlowByName;
  window.invokeFlow = invokeFlow;
  window.FLOW_CONFIGS = FLOW_CONFIGS;
}

// Listen for START_FLOW message to trigger with payload
if (typeof chrome !== "undefined" && chrome.runtime) {
  console.log("[CONTENT.JS] Chrome runtime available, adding START_FLOW_WITH_PAYLOAD listener");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[CONTENT.JS] ===== MESSAGE RECEIVED =====', request);
  
  if (request.action === 'START_FLOW_WITH_PAYLOAD') {
    console.log('[CONTENT.JS] ✓ START_FLOW_WITH_PAYLOAD action detected');
    // Determine payload source and styling
    const source = request.source || 'unknown';
    const isCustom = source === 'frontend';
    const isBrowserExt = source === 'extension-popup';
    
    // Color and label based on source
    let sourceLabel = '❓ UNKNOWN SOURCE';
    let sourceColor = '#808080'; // gray
    let sourceBackground = '#f0f0f0';
    let payloadType = 'UNKNOWN';
    
    if (isCustom) {
      sourceLabel = '👤 CUSTOM PAYLOAD (Frontend User)';
      sourceColor = '#0066ff';
      sourceBackground = '#e6f0ff';
      payloadType = 'USER DATA';
    } else if (isBrowserExt) {
      sourceLabel = '🔧 EXTENSION EXAMPLE DATA (Popup)';
      sourceColor = '#ff9900';
      sourceBackground = '#fff4e6';
      payloadType = 'EXAMPLE DATA';
    }
    
    // Print source header
    console.log(
      `%c${'═'.repeat(70)}`,
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 14px;`
    );
    console.log(
      `%c${sourceLabel}`,
      `color: white; background-color: ${sourceColor}; font-weight: bold; font-family: Arial; font-size: 14px; padding: 5px;`
    );
    console.log(
      `%c${'═'.repeat(70)}`,
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 14px;`
    );
    
    if (!request.payload) {
      console.error('[CONTENT.JS] ✗✗✗ No payload provided!');
      sendResponse({ success: false, error: 'No payload provided' });
      return true;
    }
    
    // Print payload type
    console.log(
      `%c📋 PAYLOAD TYPE: ${payloadType}`,
      `color: white; background-color: ${sourceColor}; font-weight: bold; font-family: Arial; font-size: 12px; padding: 3px;`
    );
    
    // Print payload data
    console.log(
      '%c╔════════════════════════════════════════════════════════════════╗',
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 12px;`
    );
    console.log(
      '%c║                    FULL PAYLOAD DETAILS                       ║',
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 12px;`
    );
    console.log(
      '%c╚════════════════════════════════════════════════════════════════╝',
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 12px;`
    );
    
    // Print the actual payload
    console.log(
      '%c' + JSON.stringify(request.payload, null, 2),
      `color: #000000; background-color: ${sourceBackground}; font-size: 12px; font-family: 'Courier New', monospace; padding: 10px; border: 2px solid ${sourceColor};`
    );
    
    // Print end marker
    console.log(
      '%c╔════════════════════════════════════════════════════════════════╗',
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 12px;`
    );
    console.log(
      '%c║                   END OF PAYLOAD DATA                          ║',
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 12px;`
    );
    console.log(
      '%c╚════════════════════════════════════════════════════════════════╝',
      `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 12px;`
    );
    
    // Print summary
    const keyCount = Object.keys(request.payload).length;
    console.log(
      `%c✓ Ready to fill form with ${keyCount} fields from ${sourceLabel.replace(/^[^A-Z]*/g, '')}`,
      `color: white; background-color: #28a745; font-weight: bold; font-family: Arial; font-size: 12px; padding: 5px;`
    );
    console.log(`%c${'═'.repeat(70)}`, `color: ${sourceColor}; font-weight: bold; font-family: monospace; font-size: 14px;`);
    
    // Start the flow with the provided payload
    invokeFlowByName('T7801', request.payload)
      .then((result) => {
        console.log('[CONTENT.JS] ✓✓✓ Flow completed successfully');
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error('[CONTENT.JS] ✗✗✗ Flow failed:', error);
        sendResponse({ success: false, error: String(error) });
      });
    
    return true; // Keep channel open for async response
  } else {
    console.log('[CONTENT.JS] ⚠ Received message with action:', request.action);
    sendResponse({ success: false, error: 'Unknown action' });
    return true;
  }
  });

  console.log("[CONTENT.JS] START_FLOW_WITH_PAYLOAD listener successfully registered");
  
  // After listener is registered, request payload from background script
  console.log("[CONTENT.JS] Requesting payload from background script...");
  chrome.runtime.sendMessage({ action: 'REQUEST_PAYLOAD' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('[CONTENT.JS] Background communication error:', chrome.runtime.lastError.message);
    } else {
      console.log('[CONTENT.JS] Payload request response:', response);
      if (response && response.hasPayload) {
        console.log('[CONTENT.JS] ✓ Payload found and will be sent shortly');
      } else {
        console.log('[CONTENT.JS] ⚠ No payload available in background script');
      }
    }
  });
} else {
  console.error("[CONTENT.JS] Chrome runtime not available");
}

console.log('[CONTENT.JS] ✓ Content script ready. Waiting for payload from background script...');
