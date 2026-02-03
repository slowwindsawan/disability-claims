"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Edit2,
  CreditCard,
  Briefcase,
  User,
  Heart,
  Scale,
  FileCheck,
  FileText,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import * as legacyApi from "@/lib/api"
import { useState, useEffect } from "react"
import Link from "next/link"
import banksData from "@/lib/banks.json"
import { BACKEND_BASE_URL } from "@/variables"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Israeli mobile phone number validation - only accepts 05XXXXXXXX format
const validateIsraeliPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  // Remove common formatting characters (spaces, hyphens, parentheses)
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Must be exactly 10 digits starting with 05
  // Format: 05X where X is 0-9, followed by 7 more digits
  return /^05[0-9]\d{7}$/.test(cleaned);
};

const formatIsraeliPhone = (phone: string): string => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Only format if it matches the pattern
  if (/^05[0-9]\d{7}$/.test(cleaned)) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`;
  }
  
  return phone;
};

interface SectionState {
  isExpanded: boolean
  isEditing: boolean
  isConfirmed: boolean
}

interface Form7801Analysis {
  form_7801: any
  summary: string
  strategy: string
}

export default function LegalReviewPage() {
  // Validation constants matching T7801 payload requirements
  const MARITAL_STATUS_OPTIONS = [
    "אלמן/אלמנה",
    "גרוש/גרושה ללא ילדים",
    "גרוש/גרושה עם ילדים",
    "עגון/עגונה",
    "פרוד/פרודה",
    "רווק/רווקה"
  ]
  
  const DISEASE_OPTIONS = [
    "אחר",
    "בעיה נפשית (מקבל טיפול)",
    "הפרעות בבלוטת התריס",
    "יתר לחץ דם",
    "ליקוי שכלי",
    "ליקוי שמיעה",
    "ליקויי ראיה ומחלת עיניים",
    "מחלה אורטופדית (גפיים עליונות ותחתונות, גב, צוואר, דלקת פרקים)",
    "מחלות בתחום נוירולוגי (כולל אלצהיימר, פרקינסון, אפילפסיה ואירוע מוחי)"
  ]
  
  const MEDICAL_TESTS_OPTIONS = [
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
  
  const HEALTH_FUND_OPTIONS = ["כללית", "לאומית", "מאוחדת", "מכבי", "אחר"]
  
  // Validation helpers
  const validatePhoneNumber = (phone: string) => phone && phone.trim().length > 0
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const validateIdNumber = (id: string) => /^\d{9}$/.test(id)
  const validateDate = (date: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(date)
  
  // Helper to format phone number by removing +972 country code and limiting to 10 digits
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return ''
    // Remove all non-digit characters except the leading +
    let cleaned = phone.replace(/[^\d+]/g, '')
    // Remove leading +972 and replace with 0
    if (cleaned.startsWith('+972')) {
      cleaned = '0' + cleaned.slice(4)
    }
    // Remove leading + if any
    cleaned = cleaned.replace(/^\+/, '')
    // Extract only digits for length check
    const digitsOnly = cleaned.replace(/\D/g, '')
    // If more than 10 digits, keep only the last 10
    if (digitsOnly.length > 10) {
      return digitsOnly.slice(-10)
    }
    return cleaned
  }
  
  // Helper to ensure date format is always DD/MM/YYYY
  const formatDateToDDMMYYYY = (date: string | undefined): string => {
    if (!date) return ''
    date = date.trim()
    
    // Already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      return date
    }
    
    // MM/DD/YYYY format - convert to DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
      const parts = date.split('/')
      const mm = parseInt(parts[0])
      const dd = parseInt(parts[1])
      const yyyy = parts[2]
      
      // If first part > 12, assume it's already DD/MM
      if (mm > 12) return date
      
      // If second part > 12, definitely DD/MM format
      if (dd > 12) return date
      
      // Otherwise swap and convert
      return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`
    }
    
    // YYYY-MM-DD format (ISO) - convert to DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [yyyy, mm, dd] = date.split('-')
      return `${dd}/${mm}/${yyyy}`
    }
    
    console.warn(`[DATE] Unrecognized date format: ${date}`)
    return date
  }
  
  // Helper to get empty field styling
  const getEmptyFieldClass = (value: string | null | undefined) => {
    if (!value || value === '') {
      return 'border-red-500 bg-red-50'
    }
    return ''
  }

  // Handle file upload for hospital, specialist, and army documents
  const handleFileUpload = async (file: File, fileType: 'hospital' | 'specialist' | 'army', diseaseIndex?: number) => {
    // Get case ID - from state or directly from localStorage/URL as fallback
    let caseIdForUpload = caseId
    if (!caseIdForUpload) {
      caseIdForUpload = localStorage.getItem('current_case_id')
      if (!caseIdForUpload) {
        const urlParams = new URLSearchParams(window.location.search)
        caseIdForUpload = urlParams.get('case_id')
      }
    }

    console.log('[UPLOAD] Starting upload:', { fileType, diseaseIndex, fileName: file.name, caseId: caseIdForUpload })
    
    if (!caseIdForUpload) {
      console.error('[UPLOAD] No case ID available')
      toast({
        title: "שגיאה",
        description: "לא נמצא מזהה תיק",
        variant: "destructive",
      })
      return
    }

    try {
      const uploadKey = fileType === 'hospital' || fileType === 'specialist' 
        ? `${fileType}_${diseaseIndex}` 
        : fileType
      setUploadingFile(uploadKey)
      console.log('[UPLOAD] Upload key:', uploadKey)

      // Determine document type and name based on file type
      let documentType = 'general'
      let documentName = ''
      
      if (fileType === 'hospital') {
        documentType = 'hospital'
        documentName = `אישור אשפוז - ${formData.diseases[diseaseIndex!]?.disease || 'מחלה'}`
      } else if (fileType === 'specialist') {
        documentType = 'specialist'
        documentName = `אישור מומחה - ${formData.diseases[diseaseIndex!]?.disease || 'מחלה'}`
      } else if (fileType === 'army') {
        documentType = 'army'
        documentName = 'אישור פציעה בצבא'
      }

      console.log('[UPLOAD] Document info:', { documentType, documentName })

      // Upload file using existing API
      console.log('[UPLOAD] Calling apiUploadCaseDocument...')
      const result = await legacyApi.apiUploadCaseDocument(
        caseIdForUpload,
        file,
        documentType,
        undefined, // no document_id from backend
        documentName,
        true // Case already confirmed during validation phase, skip confirmation gate
      )
      console.log('[UPLOAD] Upload result:', result)

      // Extract the file URL from storage or metadata
      // The backend returns the storage_url in the upload result
      const fileUrl = result?.storage_url || result?.public_url || result?.url || ''
      console.log('[UPLOAD] File URL:', fileUrl)
      
      if (!fileUrl) {
        throw new Error('לא התקבל כתובת URL לקובץ')
      }

      // Update formData with the file URL
      let updatedFormData = { ...formData }
      
      if (fileType === 'hospital' && diseaseIndex !== undefined) {
        const newDiseases = [...formData.diseases]
        newDiseases[diseaseIndex].hospitalFileUrl = fileUrl
        newDiseases[diseaseIndex].uploadHospitalFile = true
        updatedFormData = { ...formData, diseases: newDiseases }
        setFormData(updatedFormData)
        console.log('[UPLOAD] Updated hospital file for disease', diseaseIndex)
      } else if (fileType === 'specialist' && diseaseIndex !== undefined) {
        const newDiseases = [...formData.diseases]
        newDiseases[diseaseIndex].specialistFileUrl = fileUrl
        newDiseases[diseaseIndex].uploadSpecialistFile = true
        updatedFormData = { ...formData, diseases: newDiseases }
        setFormData(updatedFormData)
        console.log('[UPLOAD] Updated specialist file for disease', diseaseIndex)
      } else if (fileType === 'army') {
        updatedFormData = { ...formData, armyFileUrl: fileUrl, uploadArmyFile: true }
        setFormData(updatedFormData)
        console.log('[UPLOAD] Updated army file')
      }

      // Persist updated form data to backend's 7801_form column
      console.log('[UPLOAD] Saving updated form data to backend...')
      await saveCaseFormData(caseIdForUpload, updatedFormData)
      console.log('[UPLOAD] ✅ Form data saved')

      toast({
        title: "הקובץ הועלה בהצלחה",
        description: "המסמך עובד וסוכם על ידי המערכת",
      })

      console.log('[UPLOAD] ✅ Upload complete')

    } catch (error: any) {
      console.error('[UPLOAD] ❌ Upload error:', error)
      toast({
        title: "שגיאה בהעלאת קובץ",
        description: error?.message || "אירעה שגיאה בהעלאת הקובץ",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(null)
    }
  }

  // Save form data to backend's 7801_form column
  const saveCaseFormData = async (caseIdToSave: string, dataToSave: any) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${BACKEND_BASE_URL}/cases/${caseIdToSave}/form-data`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          form_7801: dataToSave
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('[SAVE] Form data saved:', result)
      return result
    } catch (error: any) {
      console.error('[SAVE] Failed to save form data:', error)
      // Don't throw - upload was successful, saving is just a sync issue
      console.warn('[SAVE] ⚠️ Upload succeeded but saving to DB failed. User can retry save manually.')
    }
  }
  
  const [sections, setSections] = useState<Record<string, SectionState>>({
    personal: { isExpanded: true, isEditing: false, isConfirmed: true },
    employment: { isExpanded: true, isEditing: false, isConfirmed: true },
    disability: { isExpanded: true, isEditing: false, isConfirmed: true },
    accident: { isExpanded: false, isEditing: false, isConfirmed: true },
    healthfund: { isExpanded: false, isEditing: false, isConfirmed: true },
    waiver: { isExpanded: false, isEditing: false, isConfirmed: true },
  })

  const [form7801Analysis, setForm7801Analysis] = useState<Form7801Analysis | null>(null)
  const [selectedBankBranches, setSelectedBankBranches] = useState<string[]>([])
  const [uploadingFile, setUploadingFile] = useState<string | null>(null) // Track which file is being uploaded
  const [phoneErrors, setPhoneErrors] = useState<Record<string, string>>({}) // Track phone validation errors
  const { toast } = useToast()
  const [caseId, setCaseId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Personal Info - Maps to T7801_DATA
    gender: "1", // "1" = זכר, "2" = נקבה
    dob: "", // DD/MM/YYYY format
    submitFor: "1", // "1" = עבורי (for myself), "2" = עבור מישהו אחר - static
    firstName: "",
    lastName: "",
    idNumber: "",
    maritalStatus: "", // Dropdown: אלמן/אלמנה, גרוש/גרושה ללא ילדים, etc.
    hasSiyua: "2", // "1" = כן (yes), "2" = לא (no) - static/mandatory
    siyuaBody: [] as string[], // Array of helpers: בית חולים, יד מכוונת, חברת מימוש זכויות, עורך דין, אחר (only if hasSiyua="1")
    siyuaBodyName: "", // Name of helping body/representative (only if hasSiyua="1")
    phoneNumber: "", // 10 digits: 05XXXXXXXX
    otherPhoneNumber: "", // Additional phone (optional)
    email: "",
    smsConfirm: "1", // "1" = כן (yes), "0" = לא (no) - static/mandatory
    differentAddress: false,
    // Mailing address (if differentAddress = true)
    otherCity: "",
    otherStreet: "",
    otherHome: "",
    otherApartment: "", // Apartment number (optional)
    mailBox: "", // PO Box (optional)
    
    // Bank Details - Prefilled from DB (Read-only)
    accountOwnerName: "", // Full name of account holder
    accountOwnerIdNum: "", // ID number of account holder (usually same as idNumber)
    isOwner2: false, // Additional account owners
    bankName: "", // Bank name - full Hebrew name
    localBankName: "", // Branch name - exact text with branch number
    accountNumber: "", // Account number
    bankOwnershipConfirmed: false,
    
    // Employment - Last 15 months
    kindComplaint: "", // "1" = לא עבדתי כלל, "2" = עבדתי והפסקתי לעבוד
    notWorkingReason: "", // Required if kindComplaint is "1" or "2"
    workingAs: "1", // "1" = שכיר, "2" = עצמאי, "3" = עצמאי ושכיר
    gotSickPayYN: "1", // "1" = לא, "2" = כן מהמעסיק
    otherIncome: "1", // "1" = לא - static
    
    // Disease/Illness
    diseases: [
      {
        disease: "", // From DISEASE_OPTIONS
        date: "", // DD/MM/YYYY
        hospitalized: false, // Was hospitalized for this disease
        uploadHospitalFile: false, // Upload hospital document (only if hospitalized=true)
        hospitalFileUrl: "", // URL to hospital file (PDF)
        sawSpecialist: false, // Saw specialist doctor for this disease
        uploadSpecialistFile: false, // Upload specialist document (only if sawSpecialist=true)
        specialistFileUrl: "", // URL to specialist file (image)
        otherDescription: "" // Additional description (only if disease="אחר")
      }
    ],
    
    // Medical Tests
    medicalTests: [] as string[], // Array of selected test names
    
    // Accident and Consent
    accident: false, // Was disability/illness caused by accident? true=כן, false=לא
    accidentDate: "", // Date of accident DD/MM/YYYY (required if accident=true)
    armyInjury: false, // Related to army/military service injury? true=כן, false=לא
    uploadArmyFile: false, // Upload army injury document? (only if armyInjury=true)
    armyFileUrl: "", // URL to army injury document (PDF or image)
    statement: false, // Agree to consent/statement checkbox
    
    // Health Fund and Signature
    healthFund: "", // Health fund name: כללית, לאומית, מאוחדת, מכבי, אחר
    healthDetails: "", // Additional health fund details (פרט)
    declaration: false, // Agree to declaration checkbox
    signatureType: "חתימה סרוקה", // Signature type - always "חתימה סרוקה"
    uploadSignatureFile: false, // Upload signature file? true=yes, false=no
    signatureFileUrl: "", // URL to signature file (PDF or image)
    signatureFileType: "image", // File type: "pdf" or "image"
    
    // Final Declarations
    finalDeclaration: false, // Agree to final declaration (REQUIRED - data-testid="Decheck")
    videoMedicalCommittee: false, // Agree to medical committee via video chat (OPTIONAL - data-testid="SubmitionVideoChat")
    refuseEmployerContact: false, // Refuse employer contact for income verification (OPTIONAL - data-testid="Tofes100Disclaimer")
    
    // Other Documents - Array of additional documents to upload
    otherDocuments: [] as Array<{name: string, fileType: 'image' | 'pdf', fileUrl: string}>,
    
    // Information Transfer Permission
    informationTransfer: false, // Give permission to share information with authorities (data-testid="InformationTransfer")
    
    // Second Signature
    secondSignatureType: "חתימה סרוקה", // Second signature type - always "חתימה סרוקה"
    uploadSecondSignature: false, // Upload second signature file? true=yes (manual upload by user)
    secondSignatureFileUrl: "", // URL to second signature file
    
      // Medical Confidentiality Waiver
    waiverAccepted: false,
    waiverDate: new Date().toISOString().split("T")[0],
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  // Extension status modal state
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [extensionStatus, setExtensionStatus] = useState<{
    stage: string
    message: string
    isError: boolean
    requiresManualAction: boolean
    isComplete: boolean
    success: boolean
  }>({
    stage: 'initializing',
    message: 'מכין את הנתונים...',
    isError: false,
    requiresManualAction: false,
    isComplete: false,
    success: false
  })
  
  // Check if form is valid (without setting state - for render-time checks)
  const isFormValid = () => {
    if (!formData.firstName.trim()) return false
    if (!formData.lastName.trim()) return false
    if (!validateIdNumber(formData.idNumber)) return false
    if (!validateDate(formData.dob)) return false
    if (!formData.maritalStatus) return false
    if (!validatePhoneNumber(formData.phoneNumber)) return false
    if (!validateEmail(formData.email)) return false
    if (!formData.bankName) return false
    if (!formData.localBankName) return false
    if (!formData.accountNumber) return false
    if (formData.kindComplaint === "2" && !formData.notWorkingReason.trim()) return false
    if (formData.diseases.length === 0 || !formData.diseases[0].disease) return false
    if (formData.accident && !validateDate(formData.accidentDate)) return false
    if (formData.accident && !formData.statement) return false
    if (!formData.healthFund) return false
    if (!formData.declaration) return false
    // Signature is optional - do not validate
    if (!formData.finalDeclaration) return false
    if (!formData.informationTransfer) return false
    if (!formData.waiverAccepted) return false
    return true
  }
  
  // Validation function (sets state - only call on submit)
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    // Personal Info Validation
    if (!formData.gender) errors.gender = "מין חובה"
    if (!formData.firstName.trim()) errors.firstName = "שם פרטי חובה"
    if (!formData.lastName.trim()) errors.lastName = "שם משפחה חובה"
    if (!validateIdNumber(formData.idNumber)) errors.idNumber = "מספר זהות לא תקין (9 ספרות)"
    if (!validateDate(formData.dob)) errors.dob = "תאריך לידה חובה (DD/MM/YYYY)"
    if (!formData.maritalStatus) errors.maritalStatus = "מצב משפחתי חובה"
    if (!validatePhoneNumber(formData.phoneNumber)) errors.phoneNumber = "מספר טלפון חובה"
    if (!formData.email.trim()) errors.email = "כתובת אימייל חובה"
    else if (!validateEmail(formData.email)) errors.email = "כתובת אימייל לא תקינה"
    
    // Bank Details - loaded from user_profile.payments, no form validation needed
    // If missing, user will see warning to fill payment details
    
    // Employment Validation
    if (!formData.kindComplaint) errors.kindComplaint = "סוג תלונה חובה"
    // Validate kindComplaint is only "1" or "2" (not "3" - אני עובד)
    if (formData.kindComplaint && !['1', '2'].includes(formData.kindComplaint)) {
      errors.kindComplaint = "סוג תלונה לא חוקי"
    }
    // notWorkingReason is required if kindComplaint is "1" or "2"
    if (formData.kindComplaint && ['1', '2'].includes(formData.kindComplaint) && !formData.notWorkingReason.trim()) {
      errors.notWorkingReason = "נדרש לציין סיבה"
    }
    // otherIncome is static - always "1", ensure it's set correctly
    formData.otherIncome = "1"
    // Validate gotSickPayYN is required and only "1" or "2"
    if (!formData.gotSickPayYN) {
      errors.gotSickPayYN = "חובה לציין אם קיבלת שכר מחלה"
    } else if (!['1', '2'].includes(formData.gotSickPayYN)) {
      errors.gotSickPayYN = "ערך לא חוקי לשכר מחלה"
    }
    
    // Diseases Validation
    if (formData.diseases.length === 0 || !formData.diseases[0].disease) {
      errors.diseases = "חובה לציין לפחות מחלה אחת"
    }
    formData.diseases.forEach((disease, idx) => {
      // Validate disease value is from allowed list
      if (disease.disease && !DISEASE_OPTIONS.includes(disease.disease)) {
        errors[`disease_${idx}_disease`] = "מחלה שנבחרה לא חוקית"
      }
      if (disease.disease && !validateDate(disease.date)) {
        errors[`disease_${idx}_date`] = "תאריך מחלה לא תקין"
      }
      // If disease is "אחר", otherDescription is required
      if (disease.disease === "אחר" && !disease.otherDescription.trim()) {
        errors[`disease_${idx}_other`] = "חובה לתאר את המחלה כאשר בוחרים 'אחר'"
      }
      if (disease.hospitalized && !disease.hospitalFileUrl) {
        errors[`disease_${idx}_hospital`] = "חובה לצרף קובץ אישפוז"
      }
      if (disease.sawSpecialist && !disease.specialistFileUrl) {
        errors[`disease_${idx}_specialist`] = "חובה לצרף קובץ מומחה"
      }
    })
    
    // Accident Validation - accident field is optional (user can leave as false)
    // But if they select true, then accidentDate and statement are required
    if (formData.accident && !validateDate(formData.accidentDate)) {
      errors.accidentDate = "תאריך תאונה לא תקין"
    }
    if (formData.accident && !formData.statement) {
      errors.statement = "חובה לאשר הצהרת תאונה"
    }
    
    // Army Injury Validation - armyInjury field is optional (user can leave as false)
    // But if they select true, then armyFileUrl is required
    if (formData.armyInjury && !formData.armyFileUrl) {
      errors.armyFileUrl = "חובה לצרף קובץ אישור צבאי"
    }
    
    // Health Fund Validation
    if (!formData.healthFund) errors.healthFund = "חובה לבחור קופת חולים"
    // Validate healthFund is only one of the allowed values
    if (formData.healthFund && !['כללית', 'לאומית', 'מאוחדת', 'מכבי', 'אחר'].includes(formData.healthFund)) {
      errors.healthFund = "קופת חולים שנבחרה לא חוקית"
    }
    if (!formData.declaration) errors.declaration = "חובה לאשר הצהרת קופת חולים"
    // Signature is optional - do not validate
    
    // Final Declarations Validation
    // finalDeclaration: REQUIRED
    // videoMedicalCommittee: OPTIONAL
    // refuseEmployerContact: OPTIONAL
    if (!formData.finalDeclaration) errors.finalDeclaration = "חובה לאשר הצהרה סופית"
    if (!formData.informationTransfer) errors.informationTransfer = "חובה לאשר העברת מידע"
    
    // Log field names with errors
    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation Errors - Field Names:', Object.keys(errors))
      console.log('❌ Validation Errors - Full Details:', errors)
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const toggleSection = (section: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: { ...prev[section], isExpanded: !prev[section].isExpanded },
    }))
  }

  const toggleEdit = (section: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: { ...prev[section], isEditing: !prev[section].isEditing },
    }))
  }

  const confirmSection = (section: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: { ...prev[section], isConfirmed: true, isEditing: false },
    }))
  }

  const allConfirmed = Object.values(sections).every((s) => s.isConfirmed)

  // Check which sections have validation errors
  const getSectionValidationStatus = () => {
    const status = {
      personal: true,
      employment: true,
      disability: true,
      accident: true,
      healthfund: true,
      waiver: true
    }

    // Personal Info
    if (!formData.gender || !formData.firstName.trim() || !formData.lastName.trim() || 
        !validateIdNumber(formData.idNumber) || !validateDate(formData.dob) ||
        !formData.maritalStatus || !validatePhoneNumber(formData.phoneNumber) ||
        !formData.email.trim() || !validateEmail(formData.email)) {
      status.personal = false
    }

    // Employment
    if (formData.kindComplaint === "2" && !formData.notWorkingReason.trim()) {
      status.employment = false
    }

    // Disability
    if (formData.diseases.length === 0 || !formData.diseases[0].disease) {
      status.disability = false
    }

    // Accident
    if (formData.accident && (!validateDate(formData.accidentDate) || !formData.statement)) {
      status.accident = false
    }

    // Health Fund
    if (!formData.healthFund || !formData.declaration) {
      status.healthfund = false
    }

    // Waiver
    if (!formData.finalDeclaration || !formData.informationTransfer || !formData.waiverAccepted) {
      status.waiver = false
    }

    return status
  }

  const sectionValidation = getSectionValidationStatus()

  // Fetch case data from database and populate form
  useEffect(() => {
    const fetchAndPopulateForm = async () => {
      try {
        console.log('[LEGAL-REVIEW] Starting form population...')
        
        // Get case ID from localStorage or URL parameter
        let currentCaseId = localStorage.getItem('current_case_id')
        console.log('[LEGAL-REVIEW] Case ID from localStorage:', currentCaseId)
        
        // If not in localStorage, try to get from URL parameter ?case_id=...
        if (!currentCaseId) {
          const urlParams = new URLSearchParams(window.location.search)
          currentCaseId = urlParams.get('case_id')
          console.log('[LEGAL-REVIEW] Case ID from URL parameter:', currentCaseId)
        }
        
        if (!currentCaseId) {
          console.error('[LEGAL-REVIEW] ❌ No case ID in localStorage or URL parameter (?case_id=...)')
          return
        }

        // Set caseId in state
        setCaseId(currentCaseId)

        const token = localStorage.getItem('access_token')
        console.log('[LEGAL-REVIEW] Token exists:', !!token)
        console.log('[LEGAL-REVIEW] Backend URL:', BACKEND_BASE_URL)
        console.log('[LEGAL-REVIEW] Fetching from:', `${BACKEND_BASE_URL}/cases/${currentCaseId}`)

        // Fetch case data
        const response = await fetch(`${BACKEND_BASE_URL}/cases/${currentCaseId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('[LEGAL-REVIEW] Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const responseData = await response.json()
        console.log('[LEGAL-REVIEW] ✅ Response received:', responseData)

        // Backend returns {status: 'ok', case: {...}}
        const caseData = responseData.case
        if (!caseData) {
          console.error('[LEGAL-REVIEW] ❌ No case in response data')
          return
        }

        console.log('[LEGAL-REVIEW] ✅ Case data:', caseData)
        console.log('[LEGAL-REVIEW] 🏦 User Profile:', caseData.user_profile)
        console.log('[LEGAL-REVIEW] 💳 Payments data:', caseData.user_profile?.payments)

        const form7801 = caseData['7801_form']
        console.log('[LEGAL-REVIEW] 7801_form structure:', form7801)

        if (!form7801) {
          console.warn('[LEGAL-REVIEW] ⚠️ No 7801_form in case data, using defaults')
          return
        }

        console.log('[LEGAL-REVIEW] ✅ Form7801 data ready, updating state...')
        console.log('[LEGAL-REVIEW] Email from DB:', form7801.email)
        console.log('[LEGAL-REVIEW] First name from DB:', form7801.firstName)
        console.log('[LEGAL-REVIEW] Last name from DB:', form7801.lastName)
        console.log('[LEGAL-REVIEW] ID Card data:', caseData.id_card)

        // Extract name from id_card if available, otherwise use form7801
        let firstName = form7801.firstName || ''
        let lastName = form7801.lastName || ''
        let idNumber = form7801.idNumber || ''
        let dob = form7801.dob || ''

        if (caseData.id_card?.full_name) {
          // Split full_name into firstName and lastName
          const fullNameParts = caseData.id_card.full_name.trim().split(/\s+/)
          if (fullNameParts.length >= 2) {
            // Assuming format is "lastName firstName" in Hebrew
            lastName = fullNameParts[0]
            firstName = fullNameParts.slice(1).join(' ')
          } else if (fullNameParts.length === 1) {
            firstName = fullNameParts[0]
          }
          console.log('[LEGAL-REVIEW] ✅ Using name from id_card:', { firstName, lastName })
        }

        // Use id_card data as priority for these fields
        if (caseData.id_card?.id_number) {
          idNumber = caseData.id_card.id_number
        }
        if (caseData.id_card?.dob) {
          dob = caseData.id_card.dob
        }

        // Update form state with all values from database
        const newFormData = {
          // Personal Info
          firstName: firstName,
          lastName: lastName,
          idNumber: idNumber,
          dob: formatDateToDDMMYYYY(dob),
          gender: form7801.gender || '',
          email: form7801.email || '',
          // Priority: 1. Authenticated phone from user_profile, 2. Case phone, 3. Previous form data
          // Format phone by removing +972 country code
          phoneNumber: formatPhoneNumber(caseData.user_profile?.phone || caseData.phone || form7801.phoneNumber || ''),
          otherPhoneNumber: formatPhoneNumber(form7801.otherPhoneNumber || ''),
          maritalStatus: form7801.maritalStatus || '',
          submitFor: form7801.submitFor || '',
          
          // Address
          differentAddress: form7801.differentAddress === true || form7801.differentAddress === 'true',
          otherCity: form7801.otherCity || '',
          otherStreet: form7801.otherStreet || '',
          otherHome: form7801.otherHome || '',
          otherApartment: form7801.otherApartment || '',
          mailBox: form7801.mailBox || '',
          
          // Helper/Siyua
          hasSiyua: form7801.hasSiyua || '',
          siyuaBody: Array.isArray(form7801.siyuaBody) ? form7801.siyuaBody : [],
          siyuaBodyName: form7801.siyuaBodyName || '',
          smsConfirm: form7801.smsConfirm || '',
          
          // Bank Details - Load from user_profile.payments if available
          bankName: caseData.user_profile?.payments?.bankName || form7801.bankName || '',
          localBankName: caseData.user_profile?.payments?.branchNumber || form7801.localBankName || '',
          accountNumber: caseData.user_profile?.payments?.accountNumber || form7801.accountNumber || '',
          accountOwnerName: form7801.accountOwnerName || '',
          accountOwnerIdNum: form7801.accountOwnerIdNum || '',
          isOwner2: form7801.isOwner2 === true || form7801.isOwner2 === 'true',
          bankOwnershipConfirmed: false,
          
          // Employment
          kindComplaint: form7801.kindComplaint || '',
          notWorkingReason: form7801.notWorkingReason || '',
          workingAs: form7801.workingAs || '',
          gotSickPayYN: form7801.gotSickPayYN || '',
          otherIncome: "1", // Always "1" - static field, no other income
          
          // Diseases - IMPORTANT: preserve array structure
          diseases: Array.isArray(form7801.diseases) && form7801.diseases.length > 0 
            ? form7801.diseases.map((d: any) => ({
                disease: d.disease || '',
                date: formatDateToDDMMYYYY(d.date) || '',
                hospitalized: d.hospitalized === true || d.hospitalized === 'true',
                uploadHospitalFile: d.uploadHospitalFile === true || d.uploadHospitalFile === 'true',
                hospitalFileUrl: d.hospitalFileUrl || '',
                sawSpecialist: d.sawSpecialist === true || d.sawSpecialist === 'true',
                uploadSpecialistFile: d.uploadSpecialistFile === true || d.uploadSpecialistFile === 'true',
                specialistFileUrl: d.specialistFileUrl || '',
                otherDescription: d.otherDescription || ''
              }))
            : [{
                disease: '',
                date: '',
                hospitalized: false,
                uploadHospitalFile: false,
                hospitalFileUrl: '',
                sawSpecialist: false,
                uploadSpecialistFile: false,
                specialistFileUrl: '',
                otherDescription: ''
              }],
          
          // Medical Tests
          medicalTests: Array.isArray(form7801.medicalTests) ? form7801.medicalTests : [],
          
          // Accident & Army
          accident: form7801.accident === true || form7801.accident === 'true',
          accidentDate: formatDateToDDMMYYYY(form7801.accidentDate) || '',
          armyInjury: form7801.armyInjury === true || form7801.armyInjury === 'true',
          uploadArmyFile: form7801.uploadArmyFile === true || form7801.uploadArmyFile === 'true',
          armyFileUrl: form7801.armyFileUrl || '',
          statement: form7801.statement === true || form7801.statement === 'true',
          
          // Health Fund & Signatures
          healthFund: form7801.healthFund || '',
          healthDetails: form7801.healthDetails || '',
          declaration: form7801.declaration === true || form7801.declaration === 'true',
          signatureType: form7801.signatureType || 'חתימה סרוקה',
          uploadSignatureFile: form7801.uploadSignatureFile === true || form7801.uploadSignatureFile === 'true',
          signatureFileUrl: form7801.signatureFileUrl || '',
          signatureFileType: form7801.signatureFileType || 'image',
          
          // Final Declarations
          finalDeclaration: form7801.finalDeclaration === true || form7801.finalDeclaration === 'true',
          videoMedicalCommittee: form7801.videoMedicalCommittee === true || form7801.videoMedicalCommittee === 'true',
          refuseEmployerContact: form7801.refuseEmployerContact === true || form7801.refuseEmployerContact === 'true',
          informationTransfer: form7801.informationTransfer === true || form7801.informationTransfer === 'true',
          
          // Second Signature
          secondSignatureType: form7801.secondSignatureType || 'חתימה סרוקה',
          uploadSecondSignature: form7801.uploadSecondSignature === true || form7801.uploadSecondSignature === 'true',
          secondSignatureFileUrl: form7801.secondSignatureFileUrl || '',
          
          // Other Documents
          otherDocuments: Array.isArray(form7801.otherDocuments) ? form7801.otherDocuments : [],
          
          // Waiver
          waiverAccepted: form7801.waiverAccepted === true || form7801.waiverAccepted === 'true',
          waiverDate: form7801.waiverDate || new Date().toISOString().split("T")[0],
        }

        console.log('[LEGAL-REVIEW] 📝 New form data prepared:', newFormData)
        console.log('[LEGAL-REVIEW] Email value being set:', newFormData.email)
        
        // Update form data directly
        setFormData(newFormData)

        // Log bank details loaded
        console.log('[LEGAL-REVIEW] 🏦 Bank Details Loaded:')
        console.log('  - bankName:', newFormData.bankName)
        console.log('  - localBankName:', newFormData.localBankName)
        console.log('  - accountNumber:', newFormData.accountNumber)

        // Set bank branches if bankName exists
        if (newFormData.bankName) {
          const bank = banksData.find(b => b.bank === newFormData.bankName)
          console.log('[LEGAL-REVIEW] Bank found:', bank)
          if (bank?.localBank) {
            setSelectedBankBranches(bank.localBank)
          }
        }

        console.log('[LEGAL-REVIEW] ✅ Form populated successfully with all DB values')
      } catch (error) {
        console.error('[LEGAL-REVIEW] ❌ Error fetching form data:', error)
      }
    }

    // Run on component mount
    fetchAndPopulateForm()
  }, [])

  // OLD: Load prefill data from session storage - REMOVED, using direct fetch instead

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">סקירת טופס 7801</h1>
                <p className="text-sm text-slate-600">בקשה לקצבת נכות כללית - ביטוח לאומי</p>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                חזרה לדשבורד
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* AI Extraction Summary */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <Card className="p-6 bg-gradient-to-l from-purple-600 to-blue-600 text-white shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">חילוץ נתונים אוטומטי הושלם</h2>
                <p className="text-purple-100">
                  סרקנו את המסמכים שלך וחילצנו את כל הנתונים הנדרשים לטופס 7801. נא לאמת את המידע.
                </p>
              </div>
            </div>
            {/* <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-sm text-purple-100 mb-1">מסמכים שנסרקו</p>
                <p className="text-3xl font-bold">5</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-sm text-purple-100 mb-1">שדות שחולצו</p>
                <p className="text-3xl font-bold">32</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-sm text-purple-100 mb-1">דיוק AI</p>
                <p className="text-3xl font-bold">96%</p>
              </div>
            </div> */}
          </Card>
        </motion.div>

        {/* Section 1: Personal Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Card className={`overflow-hidden ${sections.personal.isConfirmed ? "border-2 border-green-500" : ""}`}>
            <button
              onClick={() => toggleSection("personal")}
              className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sections.personal.isConfirmed ? "bg-green-500" : "bg-blue-100"
                  }`}
                >
                  {sections.personal.isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <User className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    חלק 1: פרטי התובע
                    {!sectionValidation.personal && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">שדות חסרים</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-600">מידע אישי ופרטי קשר</p>
                </div>
              </div>
              {sections.personal.isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {sections.personal.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          מספר תעודת זהות
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          value={formData.idNumber}
                          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                          className={`${!sections.personal.isEditing ? "bg-slate-100" : ""} ${getEmptyFieldClass(formData.idNumber)} ${validationErrors.idNumber ? "border-red-500" : ""}`}
                        />
                        {validationErrors.idNumber && <p className="text-xs text-red-600 mt-1">{validationErrors.idNumber}</p>}
                      </div>
                      <div className={`p-3 rounded ${validationErrors.gender ? 'border-2 border-red-500 bg-red-50' : (formData.gender ? '' : 'border-2 border-red-500 bg-red-50')}`}>
                        <label className="text-sm font-medium text-slate-700 mb-2">מין</label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="1" checked={formData.gender === "1"} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} />
                            <span className="text-sm">זכר</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="2" checked={formData.gender === "2"} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} />
                            <span className="text-sm">נקבה</span>
                          </label>
                        </div>
                        {validationErrors.gender && <p className="text-xs text-red-600 mt-2">{validationErrors.gender}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          שם פרטי
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          value={formData.firstName}
                          disabled
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className={`bg-slate-100 cursor-not-allowed ${getEmptyFieldClass(formData.firstName)} ${validationErrors.firstName ? "border-red-500" : ""}`}
                        />
                        {validationErrors.firstName && <p className="text-xs text-red-600 mt-1">{validationErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          שם משפחה
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          value={formData.lastName}
                          disabled
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className={`bg-slate-100 cursor-not-allowed ${getEmptyFieldClass(formData.lastName)} ${validationErrors.lastName ? "border-red-500" : ""}`}
                        />
                        {validationErrors.lastName && <p className="text-xs text-red-600 mt-1">{validationErrors.lastName}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          תאריך לידה (DD/MM/YYYY)
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          value={formData.dob}
                          disabled
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          placeholder="01/01/1980"
                          className={`bg-slate-100 cursor-not-allowed ${getEmptyFieldClass(formData.dob)} ${validationErrors.dob ? "border-red-500" : ""}`}
                        />
                        {validationErrors.dob && <p className="text-xs text-red-600 mt-1">{validationErrors.dob}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">מצב משפחתי</label>
                        <div className={validationErrors.maritalStatus ? 'rounded border border-red-500 bg-red-50 p-3' : ''}>
                          <Select value={formData.maritalStatus} onValueChange={(val) => {
                            setFormData({ ...formData, maritalStatus: val })
                            // Clear the validation error for this field
                            setValidationErrors((prev) => {
                              const updated = { ...prev }
                              delete updated.maritalStatus
                              return updated
                            })
                          }}>
                            <SelectTrigger className={`${validationErrors.maritalStatus ? "border-red-500" : ""}`}>
                              <SelectValue placeholder="בחר מצב משפחתי" />
                            </SelectTrigger>
                            <SelectContent>
                              {MARITAL_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {validationErrors.maritalStatus && <p className="text-xs text-red-600 mt-1">{validationErrors.maritalStatus}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">מספר טלפון נייד</label>
                        <Input
                          value={formData.phoneNumber}
                          onChange={(e) => {
                            // Get current digits count before formatting
                            const currentDigits = formData.phoneNumber.replace(/\D/g, '').length
                            const newInputDigits = e.target.value.replace(/\D/g, '').length
                            
                            // If already at 10 digits and trying to add more, ignore the change
                            if (currentDigits >= 10 && newInputDigits > currentDigits) {
                              return
                            }
                            
                            // Auto-format by removing +972 country code and limiting to 10 digits
                            let formatted = formatPhoneNumber(e.target.value)
                            // Extract only digits to count them
                            const digitsOnly = formatted.replace(/\D/g, '')
                            // Limit to maximum 10 digits - truncate if pasted a longer number
                            if (digitsOnly.length > 10) {
                              formatted = digitsOnly.slice(-10)
                            }
                            setFormData({ ...formData, phoneNumber: formatted })
                            // Validate on change - just check if not empty
                            if (formatted && !validatePhoneNumber(formatted)) {
                              setPhoneErrors((prev) => ({
                                ...prev,
                                phoneNumber: "מספר טלפון חובה"
                              }))
                            } else {
                              setPhoneErrors((prev) => {
                                const updated = { ...prev }
                                delete updated.phoneNumber
                                return updated
                              })
                            }
                            // Clear validation error when user changes phone number
                            setValidationErrors((prev) => {
                              const updated = { ...prev }
                              delete updated.phoneNumber
                              return updated
                            })
                          }}
                          onBlur={(e) => {
                            // Auto-format on blur
                            const formatted = formatPhoneNumber(e.target.value)
                            // Extract only digits
                            const digitsOnly = formatted.replace(/\D/g, '')
                            // Keep only last 10 digits if more were provided
                            const truncated = digitsOnly.length > 10 ? digitsOnly.slice(-10) : formatted
                            if (truncated !== e.target.value) {
                              setFormData({ ...formData, phoneNumber: truncated })
                            }
                          }}
                          placeholder="050-1234567"
                          className={`${!sections.personal.isEditing ? "bg-slate-100" : ""} ${phoneErrors.phoneNumber ? "border-red-500" : ""} ${validationErrors.phoneNumber ? "border-red-500" : ""}`}
                        />
                        {phoneErrors.phoneNumber && <p className="text-xs text-red-600 mt-1">{phoneErrors.phoneNumber}</p>}
                        {validationErrors.phoneNumber && <p className="text-xs text-red-600 mt-1">{validationErrors.phoneNumber}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">כתובת דוא״ל <span className="text-red-500">*</span></label>
                        <Input
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@example.com"
                          className={`${!sections.personal.isEditing ? "bg-slate-100" : ""} ${validationErrors.email ? "border-red-500" : ""}`}
                        />
                        {validationErrors.email && <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>}
                      </div>

                      {/* Bank Details - Read-only from user_profile.payments */}
                      <div className={`p-4 rounded-lg ${formData.bankName && formData.accountNumber ? 'bg-green-50 border border-green-300' : 'bg-amber-50 border-2 border-amber-400'}`}>
                        <label className="text-sm font-bold text-slate-900 mb-3 block">פרטי בנק</label>
                        
                        {formData.bankName && formData.accountNumber ? (
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-slate-600">שם הבנק</p>
                              <p className="text-sm font-semibold text-slate-900">{formData.bankName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">סניף בנק</p>
                              <p className="text-sm font-semibold text-slate-900">{formData.localBankName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">מספר חשבון</p>
                              <p className="text-sm font-semibold text-slate-900">{formData.accountNumber}</p>
                            </div>
                            <p className="text-xs text-green-700 mt-3">✅ פרטי התשלום מעודכנים במערכת</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-amber-900 font-medium">⚠️ פרטי בנק חסרים במערכת</p>
                            <p className="text-sm text-amber-800">לפני שתוכל להגיש את הטופס, עליך למלא את פרטי התשלום שלך.</p>
                            <a
                              href="https://app.adhdeal.com/payment-details"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium"
                            >
                              → עבור לעדכון פרטי בנק
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Hidden: כתובת דוא״ל שונה מכתובת המגורים - Not needed */}
                      {/* Commenting out the different address checkbox and conditional address fields */}
                    </div>

                    <div className="flex items-center gap-3">
                      {!sections.personal.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("personal")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.personal.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("personal")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר שהפרטים נכונים
                          </Button>
                        </>
                      )}
                      {sections.personal.isConfirmed && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">פרטים אושרו</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Section 2: Employment History (15 months) */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <Card className={`overflow-hidden ${sections.employment.isConfirmed ? "border-2 border-green-500" : ""}`}>
            <button
              onClick={() => toggleSection("employment")}
              className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sections.employment.isConfirmed ? "bg-green-500" : "bg-blue-100"
                  }`}
                >
                  {sections.employment.isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    חלק 2: פרטים על עבודה
                    {!sectionValidation.employment && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">שדות חסרים</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-600">15 החודשים שקדמו להגשת התביעה</p>
                </div>
              </div>
              {sections.employment.isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {sections.employment.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
                      <div className={`p-3 rounded ${formData.kindComplaint ? '' : 'border-2 border-red-500 bg-red-50'}`}>
                        <label className="text-sm font-medium text-slate-700 mb-3 block">סוג התלונה / בקשה</label>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="kindComplaint"
                              value="1"
                              checked={formData.kindComplaint === "1"}
                              onChange={(e) => setFormData({ ...formData, kindComplaint: e.target.value })}
                            />
                            <span className="text-sm">לא עבדתי כלל</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="kindComplaint"
                              value="2"
                              checked={formData.kindComplaint === "2"}
                              onChange={(e) => setFormData({ ...formData, kindComplaint: e.target.value })}
                            />
                            <span className="text-sm">עבדתי והפסקתי לעבוד</span>
                          </label>
                        </div>
                        {validationErrors.kindComplaint && <p className="text-xs text-red-600 mt-2">{validationErrors.kindComplaint}</p>}
                      </div>

                      {formData.kindComplaint && ['1', '2'].includes(formData.kindComplaint) && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <label className="text-sm font-medium text-slate-700 mb-2 block">
                            {formData.kindComplaint === "1" ? "סיבת אי-העסקה" : "סיבת הפסקת העבודה"}
                          </label>
                          <Textarea
                            value={formData.notWorkingReason}
                            onChange={(e) => setFormData({ ...formData, notWorkingReason: e.target.value })}
                            placeholder={formData.kindComplaint === "1" ? "נא לתאר מדוע לא עבדת" : "נא לתאר סיבת הפסקת העבודה"}
                            className={`${!sections.employment.isEditing ? "bg-slate-100" : ""} ${getEmptyFieldClass(formData.notWorkingReason)} ${validationErrors.notWorkingReason ? "border-red-500" : ""}`}
                          />
                          {validationErrors.notWorkingReason && <p className="text-xs text-red-600 mt-1">{validationErrors.notWorkingReason}</p>}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4">
                        {/* workingAs field hidden - not needed since kindComplaint is never "3" */}

                        <div className={`p-3 rounded ${validationErrors.gotSickPayYN ? 'border-2 border-red-500 bg-red-50' : (formData.gotSickPayYN ? '' : 'border-2 border-red-500 bg-red-50')}`}>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">קיבלת שכר מחלה ב-15 חודשים האחרונים</label>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="gotSickPayYN"
                                value="1"
                                checked={formData.gotSickPayYN === "1"}
                                onChange={(e) => setFormData({ ...formData, gotSickPayYN: e.target.value })}
                              />
                              <span className="text-sm">לא</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="gotSickPayYN"
                                value="2"
                                checked={formData.gotSickPayYN === "2"}
                                onChange={(e) => setFormData({ ...formData, gotSickPayYN: e.target.value })}
                              />
                              <span className="text-sm">כן מהמעסיק</span>
                            </label>
                          </div>
                          {validationErrors.gotSickPayYN && <p className="text-xs text-red-600 mt-2">{validationErrors.gotSickPayYN}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!sections.employment.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("employment")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.employment.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("employment")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר שהפרטים נכונים
                          </Button>
                        </>
                      )}
                      {sections.employment.isConfirmed && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">פרטים אושרו</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Section 3: Disability Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <Card className={`overflow-hidden ${sections.disability.isConfirmed ? "border-2 border-green-500" : ""}`}>
            <button
              onClick={() => toggleSection("disability")}
              className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sections.disability.isConfirmed ? "bg-green-500" : "bg-blue-100"
                  }`}
                >
                  {sections.disability.isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <Heart className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900">חלק 3: פרטים על הנכות</h3>
                  <p className="text-sm text-slate-600">מצב רפואי, רופאים מטפלים ואשפוזים</p>
                </div>
              </div>
              {sections.disability.isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {sections.disability.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    {/* Diseases/Illnesses */}
                    <div className="mb-6">
                      <h4 className="font-bold text-slate-900 mb-3">מחלות / ליקויים</h4>
                      <p className="text-sm text-slate-600 mb-4">נא לציין את כל המחלות או הליקויים הרלוונטיים לתביעה</p>
                      
                      {formData.diseases.map((disease, idx) => (
                        <div key={idx} className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2">סוג המחלה</label>
                              <div className={!disease.disease ? 'border border-red-500 bg-red-50 rounded' : ''}>
                                <Select value={disease.disease} onValueChange={(val) => {
                                  const newDiseases = [...formData.diseases]
                                  newDiseases[idx].disease = val
                                  setFormData({ ...formData, diseases: newDiseases })
                                }}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="בחר מחלה" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DISEASE_OPTIONS.map((d) => (
                                      <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {validationErrors[`disease_${idx}`] && <p className="text-xs text-red-600 mt-1">{validationErrors[`disease_${idx}`]}</p>}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2">תאריך (DD/MM/YYYY)</label>
                              <Input
                                value={disease.date}
                                onChange={(e) => {
                                  const newDiseases = [...formData.diseases]
                                  newDiseases[idx].date = e.target.value
                                  setFormData({ ...formData, diseases: newDiseases })
                                }}
                                placeholder="01/01/2020"
                                className={getEmptyFieldClass(disease.date)}
                              />
                              {validationErrors[`disease_${idx}_date`] && <p className="text-xs text-red-600 mt-1">{validationErrors[`disease_${idx}_date`]}</p>}
                            </div>
                          </div>
                          
                          <label className="flex items-center gap-2 p-2 bg-slate-50 rounded mb-2">
                            <Checkbox
                              checked={disease.hospitalized}
                              onCheckedChange={(checked) => {
                                const newDiseases = [...formData.diseases]
                                newDiseases[idx].hospitalized = checked as boolean
                                setFormData({ ...formData, diseases: newDiseases })
                              }}
                            />
                            <span className="text-sm">אושפזתי בגלל מחלה זו</span>
                          </label>

                          {disease.hospitalized && (
                            <div className="mb-2">
                              <label className="text-sm font-medium text-slate-700 mb-1">קובץ אישור אשפוז</label>
                              {disease.hospitalFileUrl ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                                  <a
                                    href={disease.hospitalFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-sm truncate flex-1"
                                  >
                                    📄 {disease.hospitalFileUrl.split('/').pop()}
                                  </a>
                                  <button
                                    onClick={() => window.open(disease.hospitalFileUrl, '_blank')}
                                    className="ml-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                  >
                                    פתח
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <Input 
                                    type="file" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleFileUpload(file, 'hospital', idx)
                                    }}
                                    disabled={uploadingFile === `hospital_${idx}`}
                                  />
                                  {uploadingFile === `hospital_${idx}` && (
                                    <p className="text-xs text-blue-600 mt-1">מעלה קובץ...</p>
                                  )}
                                </div>
                              )}
                              {validationErrors[`disease_${idx}_hospital`] && <p className="text-xs text-red-600 mt-1">{validationErrors[`disease_${idx}_hospital`]}</p>}
                            </div>
                          )}

                          <label className="flex items-center gap-2 p-2 bg-slate-50 rounded mb-2">
                            <Checkbox
                              checked={disease.sawSpecialist}
                              onCheckedChange={(checked) => {
                                const newDiseases = [...formData.diseases]
                                newDiseases[idx].sawSpecialist = checked as boolean
                                setFormData({ ...formData, diseases: newDiseases })
                              }}
                            />
                            <span className="text-sm">פניתי למומחה בתחום</span>
                          </label>

                          {disease.sawSpecialist && (
                            <div className="mb-2">
                              <label className="text-sm font-medium text-slate-700 mb-1">קובץ אישור מומחה</label>
                              {disease.specialistFileUrl ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                                  <a
                                    href={disease.specialistFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-sm truncate flex-1"
                                  >
                                    📄 {disease.specialistFileUrl.split('/').pop()}
                                  </a>
                                  <button
                                    onClick={() => window.open(disease.specialistFileUrl, '_blank')}
                                    className="ml-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                  >
                                    פתח
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <Input 
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleFileUpload(file, 'specialist', idx)
                                    }}
                                    disabled={uploadingFile === `specialist_${idx}`}
                                  />
                                  {uploadingFile === `specialist_${idx}` && (
                                    <p className="text-xs text-blue-600 mt-1">מעלה קובץ...</p>
                                  )}
                                </div>
                              )}
                              {validationErrors[`disease_${idx}_specialist`] && <p className="text-xs text-red-600 mt-1">{validationErrors[`disease_${idx}_specialist`]}</p>}
                            </div>
                          )}

                          <div>
                            <label className={`text-sm font-medium text-slate-700 mb-1 block ${disease.disease === "אחר" ? "font-bold text-red-600" : ""}`}>
                              {disease.disease === "אחר" ? "תיאור המחלה (חובה)" : "הערות נוספות"}
                            </label>
                            <Textarea
                              value={disease.otherDescription}
                              onChange={(e) => {
                                const newDiseases = [...formData.diseases]
                                newDiseases[idx].otherDescription = e.target.value
                                setFormData({ ...formData, diseases: newDiseases })
                              }}
                              placeholder={disease.disease === "אחר" ? "נא לתאר את המחלה בפירוט" : "אם ישנן הערות נוספות על המחלה"}
                              rows={2}
                              className={disease.disease === "אחר" && !disease.otherDescription.trim() ? "border-red-500 bg-red-50" : ""}
                            />
                            {validationErrors[`disease_${idx}_other`] && <p className="text-xs text-red-600 mt-1">{validationErrors[`disease_${idx}_other`]}</p>}
                          </div>
                        </div>
                      ))}
                      {validationErrors.diseases && <p className="text-sm text-red-600 mb-4">{validationErrors.diseases}</p>}
                    </div>

                    {/* Medical Tests */}
                    <div className="mb-6">
                      <h4 className="font-bold text-slate-900 mb-3">בדיקות רפואיות שערכתי</h4>
                      <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-lg border border-slate-200">
                        {MEDICAL_TESTS_OPTIONS.map((test) => (
                          <label key={test} className="flex items-center gap-2">
                            <Checkbox
                              checked={formData.medicalTests.includes(test)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, medicalTests: [...formData.medicalTests, test] })
                                } else {
                                  setFormData({ ...formData, medicalTests: formData.medicalTests.filter(t => t !== test) })
                                }
                              }}
                            />
                            <span className="text-sm">{test}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!sections.disability.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("disability")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.disability.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("disability")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר שהפרטים נכונים
                          </Button>
                        </>
                      )}
                      {sections.disability.isConfirmed && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">פרטים אושרו</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Section 4: Accident Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          <Card className={`overflow-hidden ${sections.accident?.isConfirmed ? "border-2 border-green-500" : ""}`}>
            <button
              onClick={() => toggleSection("accident")}
              className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sections.accident?.isConfirmed ? "bg-green-500" : "bg-blue-100"
                  }`}
                >
                  {sections.accident?.isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <Heart className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    חלק 4: תאונה / פציעה בעבודה
                    {!sectionValidation.accident && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">שדות חסרים</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-600">אם רלוונטי לתביעה</p>
                </div>
              </div>
              {sections.accident?.isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {sections.accident?.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded mb-4">
                      <Checkbox
                        checked={formData.accident}
                        onCheckedChange={(checked) => setFormData({ ...formData, accident: checked as boolean })}
                      />
                      <span className="text-sm font-medium">הייתה תאונה / פציעה בעבודה</span>
                    </label>

                    {formData.accident && (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-2">תאריך התאונה (DD/MM/YYYY)</label>
                            <Input
                              value={formData.accidentDate}
                              onChange={(e) => setFormData({ ...formData, accidentDate: e.target.value })}
                              placeholder="01/01/2020"
                              className={getEmptyFieldClass(formData.accidentDate)}
                            />
                            {validationErrors.accidentDate && <p className="text-xs text-red-600 mt-1">{validationErrors.accidentDate}</p>}
                          </div>
                          <div>
                            <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded">
                              <Checkbox
                                checked={formData.armyInjury}
                                onCheckedChange={(checked) => setFormData({ ...formData, armyInjury: checked as boolean })}
                              />
                              <span className="text-sm">פציעה בעת שירות צבאי</span>
                            </label>
                          </div>
                        </div>

                        {formData.armyInjury && (
                          <div className="mb-4">
                            <label className="text-sm font-medium text-slate-700 mb-2">קובץ אישור צבאי</label>
                            {formData.armyFileUrl ? (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                                <a
                                  href={formData.armyFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-sm truncate flex-1"
                                >
                                  📄 {formData.armyFileUrl.split('/').pop()}
                                </a>
                                <button
                                  onClick={() => window.open(formData.armyFileUrl, '_blank')}
                                  className="ml-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                >
                                  פתח
                                </button>
                              </div>
                            ) : (
                              <div>
                                <Input 
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileUpload(file, 'army')
                                  }}
                                  disabled={uploadingFile === 'army'}
                                />
                                {uploadingFile === 'army' && (
                                  <p className="text-xs text-blue-600 mt-1">מעלה קובץ...</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Auto-confirm statement - hidden from user */}
                        {(() => {
                          // Auto-set statement to true when accident section is viewed
                          if (formData.accident && !formData.statement) {
                            setFormData({ ...formData, statement: true })
                          }
                          return null
                        })()}
                      </>
                    )}

                    <div className="flex items-center gap-3">
                      {!sections.accident?.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("accident")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.accident?.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("accident")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            disabled={!formData.accident}
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר שהפרטים נכונים
                          </Button>
                        </>
                      )}
                      {sections.accident?.isConfirmed && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">פרטים אושרו</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Section 5: Health Fund & Signature */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-4"
        >
          <Card className={`overflow-hidden ${sections.healthfund?.isConfirmed ? "border-2 border-green-500" : ""}`}>
            <button
              onClick={() => toggleSection("healthfund")}
              className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sections.healthfund?.isConfirmed ? "bg-green-500" : "bg-blue-100"
                  }`}
                >
                  {sections.healthfund?.isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <Heart className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    חלק 5: קופת חולים וחתימה
                    {!sectionValidation.healthfund && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">שדות חסרים</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-600">בחירת קופת החולים וחתימה על המסמכים</p>
                </div>
              </div>
              {sections.healthfund?.isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {sections.healthfund?.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">קופת חולים</label>
                        <div className={!formData.healthFund ? 'rounded border border-red-500 bg-red-50' : ''}>
                          <Select value={formData.healthFund} onValueChange={(val) => setFormData({ ...formData, healthFund: val })}>
                            <SelectTrigger className={`${validationErrors.healthFund ? "border-red-500" : ""}`}>
                              <SelectValue placeholder="בחר קופת חולים" />
                            </SelectTrigger>
                            <SelectContent>
                              {HEALTH_FUND_OPTIONS.map((hf) => (
                                <SelectItem key={hf} value={hf}>{hf}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {validationErrors.healthFund && <p className="text-xs text-red-600 mt-1">{validationErrors.healthFund}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">פרטים נוספים (אופציונלי)</label>
                        <Input
                          value={formData.healthDetails}
                          onChange={(e) => setFormData({ ...formData, healthDetails: e.target.value })}
                          placeholder="מספר חבר, ממלא מקום וכו'"
                        />
                      </div>
                    </div>

                    {/* Auto-confirm declaration - hidden from user */}
                    {(() => {
                      // Auto-set declaration to true
                      if (!formData.declaration) {
                        setFormData({ ...formData, declaration: true })
                      }
                      return null
                    })()} 

                    {/* Signature input is hidden and non-mandatory */}

                    <div className="flex items-center gap-3">
                      {!sections.healthfund?.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("healthfund")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.healthfund?.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("healthfund")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            disabled={!formData.healthFund || !formData.declaration}
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר שהפרטים נכונים
                          </Button>
                        </>
                      )}
                      {sections.healthfund?.isConfirmed && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">פרטים אושרו</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Section 6: Medical Confidentiality Waiver */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card className={`overflow-hidden ${sections.waiver.isConfirmed ? "border-2 border-green-500" : ""}`}>
            <button
              onClick={() => toggleSection("waiver")}
              className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sections.waiver.isConfirmed ? "bg-green-500" : "bg-blue-100"
                  }`}
                >
                  {sections.waiver.isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <FileText className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    חלק 6: כתב ויתור על סודיות רפואית
                    {!sectionValidation.waiver && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">שדות חסרים</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-600">נדרש לצורך קבלת מסמכים רפואיים</p>
                </div>
              </div>
              {sections.waiver.isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {sections.waiver.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="mb-6 p-4 bg-white border-2 border-slate-300 rounded-lg">
                      <h4 className="font-bold text-slate-900 mb-3">כתב ויתור על סודיות רפואית</h4>
                      <p className="text-sm text-slate-700 leading-relaxed mb-4">
                        אני מאשר/ת למוסד לביטוח לאומי לפנות לכל גוף רפואי, קופת חולים, בית חולים, מרפאה, רופא מומחה, או
                        כל גורם רפואי אחר, לקבל מידע רפואי הנוגע למצבי הרפואי, אבחנות, טיפולים, תרופות, וכל מידע רלוונטי
                        אחר לצורך בדיקת זכאותי לקצבת נכות כללית.
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed mb-4">
                        הנני מוותר/ת על הסודיות הרפואית לצורך זה בלבד, ומאשר/ת כי המידע ישמש את המוסד לביטוח לאומי אך
                        ורק לצורך בחינת תביעתי.
                      </p>
                      {/* Auto-confirm waiverAccepted - hidden from user */}
                      {(() => {
                        if (!formData.waiverAccepted) {
                          setFormData({ ...formData, waiverAccepted: true })
                        }
                        return null
                      })()}
                    </div>

                      {/* Auto-confirm finalDeclaration - hidden from user */}
                      {(() => {
                        if (!formData.finalDeclaration) {
                          setFormData({ ...formData, finalDeclaration: true })
                        }
                        return null
                      })()}

                    {/* Other Documents Section (Optional) */}
                    <div className="mb-6">
                      <h4 className="font-bold text-slate-900 mb-3">מסמכים נוספים (אופציונלי)</h4>
                      <p className="text-sm text-slate-600 mb-4">העלה מסמכים נוספים התומכים בתביעה שלך</p>
                      
                      {formData.otherDocuments.map((doc, idx) => (
                        <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">{doc.fileType === 'pdf' ? '📄' : '🖼️'}</span>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm truncate"
                            >
                              {doc.name}
                            </a>
                          </div>
                          <button
                            onClick={() => {
                              const updated = formData.otherDocuments.filter((_, i) => i !== idx)
                              setFormData({ ...formData, otherDocuments: updated })
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            ✕ הסר
                          </button>
                        </div>
                      ))}

                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file && caseId) {
                            try {
                              setUploadingFile('other_doc')
                              const documentType = 'other'
                              const documentName = file.name
                              
                              const result = await legacyApi.apiUploadCaseDocument(
                                caseId,
                                file,
                                documentType,
                                undefined,
                                documentName,
                                true // Case already confirmed during validation phase
                              )
                              
                              const fileUrl = result?.storage_url || result?.public_url || result?.url
                              const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
                              
                              const newDoc = {
                                name: file.name,
                                fileType: fileType as 'pdf' | 'image',
                                fileUrl: fileUrl
                              }
                              
                              const updatedDocs = [...formData.otherDocuments, newDoc]
                              setFormData({ ...formData, otherDocuments: updatedDocs })
                              
                              // Save to backend
                              await saveCaseFormData(caseId, { ...formData, otherDocuments: updatedDocs })
                              
                              toast({
                                title: "המסמך הועלה בהצלחה",
                                description: "המסמך נוסף לרשימת המסמכים הנוספים",
                              })
                              
                              e.target.value = ''
                            } catch (error) {
                              console.error('[UPLOAD] Error uploading other document:', error)
                              toast({
                                title: "שגיאה בהעלאת מסמך",
                                description: "לא הצלחנו להעלות את המסמך. נסה שוב.",
                                variant: "destructive"
                              })
                            } finally {
                              setUploadingFile(null)
                            }
                          }
                        }}
                        disabled={uploadingFile === 'other_doc'}
                        className="cursor-pointer"
                      />
                      {uploadingFile === 'other_doc' && <p className="text-sm text-slate-600 mt-2">מעלה מסמך...</p>}
                    </div>

                    {/* Auto-confirm informationTransfer - hidden from user */}
                    {(() => {
                      if (!formData.informationTransfer) {
                        setFormData({ ...formData, informationTransfer: true })
                      }
                      return null
                    })()}

                    <div className="flex items-center gap-3">
                      {!sections.waiver.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("waiver")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.waiver.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("waiver")}
                            disabled={!formData.waiverAccepted || !formData.finalDeclaration || !formData.informationTransfer}
                            className="bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-300"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר את כל ההצהרות
                          </Button>
                        </>
                      )}
                      {sections.waiver.isConfirmed && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">כתב ויתור אושר</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Final Submit Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="sticky bottom-0 bg-white border-t-2 border-slate-200 p-6 shadow-2xl rounded-t-xl"
        >
          <div className="max-w-2xl mx-auto">
            {allConfirmed ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <h3 className="text-2xl font-bold text-slate-900">כל הפרטים אושרו!</h3>
                </div>
                <p className="text-slate-600 mb-6">הטופס מוכן להגשה למוסד לביטוח לאומי</p>
                {Object.keys(validationErrors).length > 0 && (
                  <p className="text-red-600 text-sm mb-4 text-center">⚠️ יש {Object.keys(validationErrors).length} שדות שחייבים להיות מלאים - בדוק את השדות המסומנים בהדגשה אדומה</p>
                )}
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6 disabled:bg-slate-400"
                  disabled={!allConfirmed}
                  onClick={() => {
                    // Validate form before submission
                    if (!validateForm()) {
                      toast({
                        title: "שגיאה בטופס",
                        description: "אנא מלא את כל השדות החובה",
                        variant: "destructive"
                      })
                      // Scroll to first section with errors
                      setTimeout(() => {
                        const firstErrorElement = document.querySelector('[class*="border-red-500"]')
                        if (firstErrorElement) {
                          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }, 100)
                      return
                    }

                    // Build T7801_DATA payload - Complete structure matching extension
                    const payload = {
                        // Personal Information
                        gender: formData.gender,
                        dob: formatDateToDDMMYYYY(formData.dob), // Ensure DD/MM/YYYY format
                        submitFor: "1", // Always "1" (for myself)
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        idNumber: formData.idNumber,
                        maritalStatus: formData.maritalStatus,
                        hasSiyua: "2", // Always "2" (no helper/representative)
                        siyuaBody: [], // Always empty since hasSiyua is "2"
                        siyuaBodyName: "", // Always empty since hasSiyua is "2"
                        phoneNumber: formData.phoneNumber,
                        repeatMobile: formData.phoneNumber, // Always same as phoneNumber
                        otherPhoneNumber: formData.otherPhoneNumber,
                        email: formData.email,
                        repeatEmail: formData.email, // Always same as email
                        smsConfirm: formData.smsConfirm,
                        differentAddress: formData.differentAddress,
                        // Mailing address (only if differentAddress = true)
                        ...(formData.differentAddress && {
                          otherCity: formData.otherCity,
                          otherStreet: formData.otherStreet,
                          otherHome: formData.otherHome,
                          otherApartment: formData.otherApartment,
                          mailBox: formData.mailBox
                        }),
                        // Bank account details
                        accountOwnerName: `${formData.firstName} ${formData.lastName}`, // Full name (first + last)
                        accountOwnerIdNum: formData.accountOwnerIdNum || formData.idNumber,
                        isOwner2: formData.isOwner2,
                        bankName: formData.bankName,
                        localBankName: formData.localBankName,
                        accountNumber: formData.accountNumber,
                        // Employment data (last 15 months)
                        kindComplaint: formData.kindComplaint,
                        notWorkingReason: formData.notWorkingReason,
                        workingAs: formData.workingAs,
                        gotSickPayYN: formData.gotSickPayYN,
                        otherIncome: formData.otherIncome,
                        // Disease/Illness data with upload flags
                        diseases: formData.diseases.map(d => ({
                          disease: d.disease,
                          date: formatDateToDDMMYYYY(d.date), // Ensure DD/MM/YYYY format
                          hospitalized: d.hospitalized,
                          uploadHospitalFile: d.hospitalized && !!d.hospitalFileUrl,
                          hospitalFileUrl: d.hospitalFileUrl,
                          sawSpecialist: d.sawSpecialist,
                          uploadSpecialistFile: d.sawSpecialist && !!d.specialistFileUrl,
                          specialistFileUrl: d.specialistFileUrl,
                          otherDescription: d.otherDescription
                        })),
                        // Medical Tests Selection
                        medicalTests: formData.medicalTests,
                        // Accident and Consent Section
                        accident: formData.accident,
                        ...(formData.accident && {
                          accidentDate: formatDateToDDMMYYYY(formData.accidentDate) // Ensure DD/MM/YYYY format
                        }),
                        armyInjury: formData.armyInjury,
                        uploadArmyFile: formData.armyInjury && !!formData.armyFileUrl,
                        armyFileUrl: formData.armyFileUrl,
                        statement: formData.statement,
                        // Health Fund and Signature Section
                        healthFund: formData.healthFund,
                        healthDetails: formData.healthDetails,
                        declaration: formData.declaration,
                        signatureType: formData.signatureType,
                        uploadSignatureFile: !!formData.signatureFileUrl,
                        signatureFileUrl: formData.signatureFileUrl,
                        signatureFileType: formData.signatureFileType,
                        // Final Declarations Section
                        finalDeclaration: formData.finalDeclaration,
                        videoMedicalCommittee: formData.videoMedicalCommittee,
                        refuseEmployerContact: formData.refuseEmployerContact,
                        // Other Documents Section
                        otherDocuments: formData.otherDocuments,
                        // Information Transfer Permission
                        informationTransfer: formData.informationTransfer,
                        // Second Signature Section
                        secondSignatureType: formData.secondSignatureType,
                        uploadSecondSignature: !!formData.secondSignatureFileUrl,
                        secondSignatureFileUrl: formData.secondSignatureFileUrl
                      }
                      console.log("T7801_DATA Payload (Complete):", payload)
                      console.log("📅 Dates in payload (DD/MM/YYYY format):")
                      console.log(`  - DOB: ${payload.dob}`)
                      console.log(`  - Accident Date: ${payload.accident ? payload.accidentDate : 'N/A'}`)
                      payload.diseases.forEach((d, idx) => {
                        console.log(`  - Disease ${idx + 1} Date: ${d.date}`)
                      })
                      
                      // Show status modal immediately
                      setShowStatusModal(true)
                      setExtensionStatus({
                        stage: 'storing',
                        message: 'שומר את הנתונים לתוסף...',
                        isError: false,
                        requiresManualAction: false,
                        isComplete: false,
                        success: false
                      })
                      
                      // Send to extension via postMessage (no extension ID needed!)
                      console.log('📤 Sending payload to extension via postMessage...')
                      
                      // Listen for status updates from extension
                      const statusUpdateHandler = (event: MessageEvent) => {
                        console.log('[LEGAL-REVIEW] Message event received:', event)
                        console.log('[LEGAL-REVIEW] Event data:', event.data)
                        console.log('[LEGAL-REVIEW] Event origin:', event.origin)
                        
                        // Ignore messages we sent ourselves
                        if (event.data && event.data.type === 'BTL_EXTENSION_STORE_PAYLOAD') {
                          console.log('⚠️ Ignoring our own sent message')
                          return
                        }
                        
                        // Payload stored confirmation
                        if (event.data && event.data.type === 'BTL_EXTENSION_PAYLOAD_STORED') {
                          console.log('✓ Extension confirmed payload stored:', event.data)
                          
                          if (event.data.success) {
                            setExtensionStatus({
                              stage: 'opening_form',
                              message: 'פותח את טופס הביטוח הלאומי...',
                              isError: false,
                              requiresManualAction: false,
                              isComplete: false,
                              success: false
                            })
                            
                            // Open the government form in new tab
                            const formUrl = 'https://govforms.gov.il/mw/forms/T7801@btl.gov.il'
                            window.open(formUrl, '_blank')
                            
                            setExtensionStatus({
                              stage: 'filling_form',
                              message: 'ממלא את הטופס אוטומטית... אנא אל תסגור את הטאב',
                              isError: false,
                              requiresManualAction: false,
                              isComplete: false,
                              success: false
                            })
                          } else {
                            setExtensionStatus({
                              stage: 'error',
                              message: 'שגיאה: לא הצליח לשמור נתונים בתוסף. ודא שהתוסף מותקן ופעיל.',
                              isError: true,
                              requiresManualAction: false,
                              isComplete: true,
                              success: false
                            })
                          }
                        }
                        
                        // Form filling status updates
                        if (event.data && event.data.type === 'BTL_EXTENSION_FILLING_STATUS') {
                          const { stage, message, requiresManualAction, isComplete, success } = event.data
                          
                          console.log('[LEGAL-REVIEW] Status update received:', { stage, message, isComplete, success })
                          
                          setExtensionStatus({
                            stage: stage || 'filling_form',
                            message: message || 'ממשיך למלא את הטופס...',
                            isError: !success && isComplete,
                            requiresManualAction: requiresManualAction || false,
                            isComplete: isComplete || false,
                            success: success || false
                          })
                          
                          // If complete and successful, navigate to waiting page
                          if (isComplete && success) {
                            console.log('[LEGAL-REVIEW] Form submission complete! Redirecting in 2 seconds...')
                            setTimeout(() => {
                              window.removeEventListener('message', statusUpdateHandler)
                              const currentCaseId = caseId || localStorage.getItem('current_case_id')
                              window.location.href = `/waiting-for-response${currentCaseId ? '?caseId=' + currentCaseId : ''}`
                            }, 2000)
                          }
                        }
                      }
                      
                      window.addEventListener('message', statusUpdateHandler)
                      
                      // Get user_id and case_id for extension payload
                      const userId = localStorage.getItem('user_id')
                      const currentCaseId = caseId || localStorage.getItem('current_case_id')
                      
                      // Send payload via postMessage with user_id and case_id
                      window.postMessage({
                        type: 'BTL_EXTENSION_STORE_PAYLOAD',
                        payload: {
                          ...payload,
                          user_id: userId,
                          case_id: currentCaseId
                        }
                      }, '*')
                      
                      // Timeout if no initial payload confirmation after 10 seconds
                      const payloadTimeoutId = setTimeout(() => {
                        if (extensionStatus.stage === 'opening_form' || extensionStatus.stage === undefined) {
                          console.warn('[LEGAL-REVIEW] No payload confirmation from extension after 10 seconds')
                          setExtensionStatus({
                            stage: 'timeout',
                            message: 'לא התקבלה תגובה מהתוסף. ודא שהתוסף מותקן ופעיל ולאחר מכן נסה שנית.',
                            isError: true,
                            requiresManualAction: false,
                            isComplete: true,
                            success: false
                          })
                          window.removeEventListener('message', statusUpdateHandler)
                        }
                      }, 10000)
                      
                      // Store timeout ID so we can clear it on success
                      window.addEventListener('message', (event) => {
                        if (event.data?.type === 'BTL_EXTENSION_PAYLOAD_STORED' && event.data?.success) {
                          clearTimeout(payloadTimeoutId)
                        }
                      })
                  }}
                >
                  <FileCheck className="w-6 h-6 ml-2" />
                  הגש טופס 7801 לביטוח לאומי
                </Button>
                <p className="text-xs text-slate-500 mt-3">הטופס יישלח באופן מאובטח למערכת הביטוח הלאומי</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Scale className="w-6 h-6 text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-700">נא לאשר את כל הסעקשנים</h3>
                </div>
                <p className="text-sm text-slate-600">
                  אושרו {Object.values(sections).filter((s) => s.isConfirmed).length} מתוך{" "}
                  {Object.keys(sections).length} סעקשנים
                </p>
                <div className="mt-4 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-500"
                    style={{
                      width: `${(Object.values(sections).filter((s) => s.isConfirmed).length / Object.keys(sections).length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Extension Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" dir="rtl">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              {/* Status Icon */}
              <div className="mb-4">
                {extensionStatus.isComplete && extensionStatus.success && (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                )}
                {extensionStatus.isError && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">⚠️</span>
                  </div>
                )}
                {!extensionStatus.isComplete && !extensionStatus.isError && (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Status Title */}
              <h3 className={`text-xl font-bold mb-3 ${
                extensionStatus.isError ? 'text-red-600' : 
                extensionStatus.success ? 'text-green-600' : 
                'text-blue-600'
              }`}>
                {extensionStatus.isError ? 'שגיאה בתהליך' : 
                 extensionStatus.success ? 'הושלם בהצלחה!' : 
                 extensionStatus.stage === 'monitoring_active' ? 'מוכן לשליחה' :
                 extensionStatus.stage === 'success_detected' ? 'זוהה אישור!' :
                 extensionStatus.stage === 'saving' ? 'שומר נתונים...' :
                 'ממלא טופס...'}
              </h3>

              {/* Status Message */}
              <p className="text-slate-700 mb-4 text-sm leading-relaxed">
                {extensionStatus.message}
              </p>
              
              {/* Contextual guidance based on stage */}
              {!extensionStatus.isComplete && !extensionStatus.isError && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4 text-right">
                  {extensionStatus.stage === 'monitoring_active' && (
                    <div>
                      <p className="text-blue-900 text-xs font-medium mb-2">💡 הנחיות:</p>
                      <ul className="text-blue-800 text-xs space-y-1">
                        <li>• אתה יכול ללחוץ על כפתור "שליחה" בטופס באופן ידני</li>
                        <li>• המערכת תזהה אוטומטית את הצלחת השליחה</li>
                        <li>• אל תסגור את הטאב של הטופס</li>
                      </ul>
                    </div>
                  )}
                  {(extensionStatus.stage === 'filling_form' || extensionStatus.stage === 'flow_started') && (
                    <div>
                      <p className="text-blue-900 text-xs font-medium mb-2">⏳ בתהליך מילוי:</p>
                      <ul className="text-blue-800 text-xs space-y-1">
                        <li>• התהליך עשוי לקחת 2-3 דקות</li>
                        <li>• אל תסגור את הטאב או החלון</li>
                        <li>• אל תבצע פעולות בטופס ידנית</li>
                      </ul>
                    </div>
                  )}
                  {extensionStatus.stage === 'filling_field' && (
                    <div>
                      <p className="text-blue-900 text-xs font-medium">
                        🔄 {extensionStatus.message}
                      </p>
                    </div>
                  )}
                  {extensionStatus.stage === 'field_completed' && (
                    <div>
                      <p className="text-green-700 text-xs font-medium">
                        {extensionStatus.message}
                      </p>
                    </div>
                  )}
                  {extensionStatus.stage === 'field_failed' && (
                    <div>
                      <p className="text-red-700 text-xs font-medium">
                        {extensionStatus.message}
                      </p>
                    </div>
                  )}
                  {extensionStatus.stage === 'success_detected' && (
                    <div>
                      <p className="text-green-700 text-xs font-medium">
                        ✅ עמוד האישור זוהה! מעבד את הנתונים...
                      </p>
                    </div>
                  )}
                  {extensionStatus.stage === 'saving' && (
                    <div>
                      <p className="text-blue-900 text-xs font-medium">
                        💾 שומר את פרטי הבקשה במערכת (עד 5 ניסיונות)...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Action Required Alert */}
              {extensionStatus.requiresManualAction && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 mb-4">
                  <p className="text-amber-900 font-medium text-sm">
                    🖐️ נדרשת התערבות ידנית
                  </p>
                  <p className="text-amber-800 text-xs mt-1">
                    עבור לטאב של הטופס והשלם את השדות המסומנים
                  </p>
                </div>
              )}

              {/* Warning - Don't Close Tab */}
              {!extensionStatus.isComplete && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4">
                  <p className="text-blue-900 text-xs font-medium">
                    ⚠️ אל תסגור את הטאב של הטופס עד לסיום התהליך
                  </p>
                </div>
              )}

              {/* Progress Stage Indicator */}
              {!extensionStatus.isComplete && (
                <div className="text-xs text-slate-500 mb-4">
                  שלב נוכחי: {extensionStatus.stage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                {extensionStatus.isError && (
                  <Button
                    onClick={() => setShowStatusModal(false)}
                    variant="outline"
                    size="sm"
                  >
                    סגור ותקן את הטופס
                  </Button>
                )}
                {extensionStatus.isComplete && extensionStatus.success && (
                  <Button
                    onClick={() => window.location.href = "/waiting-for-response"}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    המשך לעמוד המתנה →
                  </Button>
                )}
              </div>

              {/* Error Solution */}
              {extensionStatus.isError && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-right">
                  <p className="text-xs font-medium text-slate-700 mb-2">💡 פתרונות אפשריים:</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• ודא שהתוסף מותקן ופעיל בדפדפן</li>
                    <li>• רענן את הדף ונסה שוב</li>
                    <li>• בדוק שכל השדות החובה מלאים נכון</li>
                    <li>• ודא שהתאריכים בפורמט DD/MM/YYYY</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
