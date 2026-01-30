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
  Loader,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect } from "react"
import Link from "next/link"

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
  const [sections, setSections] = useState<Record<string, SectionState>>({
    personal: { isExpanded: true, isEditing: false, isConfirmed: false },
    employment: { isExpanded: true, isEditing: false, isConfirmed: false },
    disability: { isExpanded: true, isEditing: false, isConfirmed: false },
    bank: { isExpanded: true, isEditing: false, isConfirmed: false },
    waiver: { isExpanded: true, isEditing: false, isConfirmed: false },
  })

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [form7801Analysis, setForm7801Analysis] = useState<Form7801Analysis | null>(null)
  const [phoneErrors, setPhoneErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Personal Info - Section 1
    idNumber: "123456789",
    fullName: "יוחאי כהן",
    dob: "1985-03-15",
    gender: "זכר",
    maritalStatus: "נשוי",
    numberOfChildren: "2",
    address: "רחוב הרצל 25, תל אביב",
    city: "תל אביב",
    postalCode: "6407801",
    phone: "050-1234567",
    email: "yochai.cohen@email.com",

    // Employment - Section 2 (Last 15 months)
    employment: [
      {
        employer: 'חברת "נווט" בע״מ',
        startDate: "2023-01-01",
        endDate: "2024-06-01",
        monthlySalary: "12,000",
        position: "נהג משאית",
      },
      { employer: "", startDate: "", endDate: "", monthlySalary: "", position: "" },
      { employer: "", startDate: "", endDate: "", monthlySalary: "", position: "" },
    ],

    // Disability Info - Section 3
    disabilityTypes: {
      chronicPain: true,
      limitedMobility: true,
      fibromyalgia: true,
      anxiety: false,
      depression: false,
      backProblems: false,
      jointProblems: false,
      neurologicalDisorder: false,
      mentalDisorder: false,
      hearingImpairment: false,
      visionImpairment: false,
      heartDisease: false,
      respiratoryDisease: false,
      kidneyDisease: false,
      diabetes: false,
      cancer: false,
      other: false,
    },
    disabilityStartDate: "2023-11-15",
    mainDisabilityDescription: "פיברומיאלגיה וכאבים כרוניים מפושטים",

    // Treating Physicians
    physicians: [
      { name: "ד״ר שרה לוי", specialty: "ראומטולוגיה", clinic: "מכבי - סניף תל אביב", phone: "03-1234567" },
      { name: "ד״ר דוד כהן", specialty: "כאב", clinic: "שיבא - מרפאת כאב", phone: "03-7654321" },
    ],

    // Hospitalizations
    hospitalizations: [
      {
        hospital: "שיבא תל השומר",
        department: "מחלקה פנימית",
        admissionDate: "2023-12-10",
        dischargeDate: "2023-12-15",
        reason: "בירור כאבים כרוניים",
      },
    ],

    // Bank Details - Section 4
    bankName: "בנק לאומי",
    branchNumber: "892",
    accountNumber: "456789",

    // Medical Confidentiality Waiver - Section 5
    waiverAccepted: false,
    waiverDate: new Date().toISOString().split("T")[0],
  })

  // Load prefill data from session storage (from dashboard Form 7801 analysis)
  useEffect(() => {
    try {
      const prefillDataStr = sessionStorage.getItem("form7801_prefill_data")
      if (prefillDataStr) {
        const prefillData = JSON.parse(prefillDataStr)
        
        // Extract data from the analysis
        if (prefillData.form_7801) {
          const form7801 = prefillData.form_7801
          
          // Prefill personal info
          if (form7801.personal_info) {
            setFormData(prev => ({
              ...prev,
              idNumber: form7801.personal_info.id_number || prev.idNumber,
              fullName: form7801.personal_info.full_name || prev.fullName,
              dob: form7801.personal_info.date_of_birth || prev.dob,
              gender: form7801.personal_info.gender || prev.gender,
              maritalStatus: form7801.personal_info.marital_status || prev.maritalStatus,
              numberOfChildren: String(form7801.personal_info.number_of_children) || prev.numberOfChildren,
              address: form7801.personal_info.address || prev.address,
              city: form7801.personal_info.city || prev.city,
              postalCode: form7801.personal_info.postal_code || prev.postalCode,
              phone: form7801.personal_info.phone || prev.phone,
              email: form7801.personal_info.email || prev.email,
            }))
          }
          
          // Prefill disability info
          if (form7801.disability_info) {
            const disabilityInfo = form7801.disability_info
            setFormData(prev => ({
              ...prev,
              disabilityTypes: disabilityInfo.disability_types || prev.disabilityTypes,
              disabilityStartDate: disabilityInfo.disability_start_date || prev.disabilityStartDate,
              mainDisabilityDescription: disabilityInfo.primary_disability_description || prev.mainDisabilityDescription,
            }))
          }
          
          // Prefill bank details
          if (form7801.bank_details) {
            setFormData(prev => ({
              ...prev,
              bankName: form7801.bank_details.bank_name || prev.bankName,
              branchNumber: form7801.bank_details.branch_number || prev.branchNumber,
              accountNumber: form7801.bank_details.account_number || prev.accountNumber,
            }))
          }
        }
        
        // Store the full analysis for reference
        setForm7801Analysis(prefillData)
        
        // Clear the session storage to prevent reusing stale data
        sessionStorage.removeItem("form7801_prefill_data")
      }
    } catch (error) {
      console.error("Failed to load prefill data:", error)
    }
  }, [])

  useEffect(() => {
    // Fetch case data with final_document_analysis and user profile
    const fetchDataFromDB = async () => {
      try {
        // Fetch user cases
        const casesResponse = await fetch("/api/user/cases", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem('access_token') || ''}`,
          },
        })
        
        if (!casesResponse.ok) {
          console.error("Failed to fetch cases")
          return
        }
        
        const casesData = await casesResponse.json()
        const cases = casesData?.cases || []
        
        if (cases.length === 0) {
          console.warn("No cases found")
          return
        }
        
        const currentCase = cases[0]
        
        // Extract final_document_analysis
        if (currentCase.final_document_analysis) {
          const analysis = currentCase.final_document_analysis
          
          // Prefill from analysis
          if (analysis.form_7801?.personal_info) {
            const personalInfo = analysis.form_7801.personal_info
            setFormData(prev => ({
              ...prev,
              idNumber: personalInfo.id_number || prev.idNumber,
              fullName: personalInfo.full_name || prev.fullName,
              dob: personalInfo.date_of_birth || prev.dob,
              gender: personalInfo.gender || prev.gender,
              maritalStatus: personalInfo.marital_status || prev.maritalStatus,
              numberOfChildren: String(personalInfo.number_of_children || 0) || prev.numberOfChildren,
              address: personalInfo.address || prev.address,
              city: personalInfo.city || prev.city,
              postalCode: personalInfo.postal_code || prev.postalCode,
              phone: personalInfo.phone || prev.phone,
              email: personalInfo.email || prev.email,
            }))
          }
          
          if (analysis.form_7801?.disability_info) {
            const disabilityInfo = analysis.form_7801.disability_info
            setFormData(prev => ({
              ...prev,
              disabilityTypes: disabilityInfo.disability_types || prev.disabilityTypes,
              disabilityStartDate: disabilityInfo.disability_start_date || prev.disabilityStartDate,
              mainDisabilityDescription: disabilityInfo.primary_disability_description || prev.mainDisabilityDescription,
            }))
          }
          
          if (analysis.form_7801?.bank_details) {
            const bankDetails = analysis.form_7801.bank_details
            setFormData(prev => ({
              ...prev,
              bankName: bankDetails.bank_name || prev.bankName,
              branchNumber: bankDetails.branch_number || prev.branchNumber,
              accountNumber: bankDetails.account_number || prev.accountNumber,
            }))
          }
          
          setForm7801Analysis(analysis)
        }
        
        // Fetch user profile for additional details
        const profileResponse = await fetch("/api/user/profile", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem('access_token') || ''}`,
          },
        })
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          const profile = profileData?.profile || profileData?.data || profileData
          
          // Prefill personal info from profile if not already filled
          setFormData(prev => ({
            ...prev,
            fullName: prev.fullName || profile?.full_name || prev.fullName,
            email: prev.email || profile?.email || prev.email,
            phone: prev.phone || profile?.phone || prev.phone,
            idNumber: prev.idNumber || profile?.identity_code || prev.idNumber,
          }))
          
          // Prefill bank details from payments if available
          if (profile?.payments && typeof profile.payments === 'object') {
            const payments = profile.payments
            setFormData(prev => ({
              ...prev,
              bankName: prev.bankName || payments.bank_name || prev.bankName,
              branchNumber: prev.branchNumber || payments.branch_number || prev.branchNumber,
              accountNumber: prev.accountNumber || payments.account_number || prev.accountNumber,
            }))
          }
          
          // Prefill contact details if available
          if (profile?.contact_details && typeof profile.contact_details === 'object') {
            const contact = profile.contact_details
            setFormData(prev => ({
              ...prev,
              address: prev.address || contact.address || prev.address,
              city: prev.city || contact.city || prev.city,
              postalCode: prev.postalCode || contact.postal_code || prev.postalCode,
              phone: prev.phone || contact.phone || prev.phone,
            }))
          }
        }
      } catch (error) {
        console.error("Failed to fetch data from DB:", error)
      }
    }
    
    // Only fetch if we don't have analysis from sessionStorage
    if (!form7801Analysis) {
      fetchDataFromDB()
    }
  }, [])

  const handleAIAnalysis = async () => {
    console.log("🔵 Button clicked - Starting AI analysis...")
    setIsAnalyzing(true)
    try {
      console.log("📤 Sending request to /api/analyze-form-7801")
      const response = await fetch("/api/analyze-form-7801", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: formData,
          sections: sections,
        }),
      })

      console.log("📨 Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ API Error:", errorData)
        throw new Error(errorData.details || "Failed to analyze form")
      }

      const result = await response.json()
      console.log("✅ Analysis completed:", result)
      setForm7801Analysis(result)
      setAnalysisComplete(true)
    } catch (error) {
      console.error("❌ Error analyzing form:", error)
      alert(`אירעה שגיאה בעת ניתוח הטופס: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmitForm = async () => {
    if (!form7801Analysis) return

    try {
      const response = await fetch("/api/submit-form-7801", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis: form7801Analysis,
          formData: formData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit form")
      }

      // Redirect to waiting page
      window.location.href = "/waiting-for-response"
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("אירעה שגיאה בעת הגשת הטופס. אנא נסה שוב.")
    }
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

  return (
    <div className="min-h-screen bg-slate-50">
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
                  <h3 className="text-lg font-bold text-slate-900">חלק 1: פרטי התובע</h3>
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
                          <Sparkles className="w-3 h-3 text-purple-500" title="נשלף אוטומטית" />
                        </label>
                        <Input
                          value={formData.idNumber}
                          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          שם מלא (פרטי + משפחה)
                          <Sparkles className="w-3 h-3 text-purple-500" title="נשלף אוטומטית" />
                        </label>
                        <Input
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          תאריך לידה
                          <Sparkles className="w-3 h-3 text-purple-500" title="נשלף אוטומטית" />
                        </label>
                        <Input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">מין</label>
                        <Input
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">מצב משפחתי</label>
                        <Input
                          value={formData.maritalStatus}
                          onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">מספר ילדים</label>
                        <Input
                          value={formData.numberOfChildren}
                          onChange={(e) => setFormData({ ...formData, numberOfChildren: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          כתובת מגורים מלאה
                          <Sparkles className="w-3 h-3 text-purple-500" title="נשלף אוטומטית" />
                        </label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">עיר</label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">מיקוד</label>
                        <Input
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">מספר טלפון נייד</label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => {
                            const newPhone = e.target.value;
                            setFormData({ ...formData, phone: newPhone });
                            // Validate as user types
                            if (newPhone && !validateIsraeliPhone(newPhone)) {
                              setPhoneErrors(prev => ({ ...prev, phone: 'טלפון נייד ישראלי בפורמט 05XXXXXXXX בלבד (10 ספרות)' }));
                            } else {
                              setPhoneErrors(prev => ({ ...prev, phone: '' }));
                            }
                          }}
                          onBlur={(e) => {
                            // Auto-format on blur if valid
                            if (validateIsraeliPhone(e.target.value)) {
                              const formatted = formatIsraeliPhone(e.target.value);
                              setFormData({ ...formData, phone: formatted });
                            }
                          }}
                          disabled={!sections.personal.isEditing}
                          className={`${!sections.personal.isEditing ? "bg-slate-100" : ""} ${phoneErrors.phone ? "border-red-500" : ""}`}
                          placeholder="050-1234567"
                        />
                        {phoneErrors.phone && (
                          <p className="text-sm text-red-600 mt-1">{phoneErrors.phone}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2">דוא״ל</label>
                        <Input
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          disabled={!sections.personal.isEditing}
                          className={!sections.personal.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
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
                  <h3 className="text-lg font-bold text-slate-900">חלק 2: פרטים על עבודה</h3>
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
                    <div className="mb-4 p-3 bg-blue-50 border-r-4 border-blue-500 rounded text-sm text-slate-700">
                      נא למלא פרטים על כל מקומות העבודה בהם עבדת ב-15 החודשים שקדמו להגשת הבקשה
                    </div>

                    {formData.employment.map((emp, index) => (
                      <div key={index} className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-3">מעסיק {index + 1}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                              שם המעסיק / מקום העבודה
                              {index === 0 && <Sparkles className="w-3 h-3 text-purple-500" title="נשלף אוטומטית" />}
                            </label>
                            <Input
                              value={emp.employer}
                              disabled={!sections.employment.isEditing}
                              className={!sections.employment.isEditing ? "bg-slate-100" : ""}
                              placeholder="שם החברה / העסק"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-2">תאריך תחילת עבודה</label>
                            <Input
                              type="date"
                              value={emp.startDate}
                              disabled={!sections.employment.isEditing}
                              className={!sections.employment.isEditing ? "bg-slate-100" : ""}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-2">תאריך סיום עבודה</label>
                            <Input
                              type="date"
                              value={emp.endDate}
                              disabled={!sections.employment.isEditing}
                              className={!sections.employment.isEditing ? "bg-slate-100" : ""}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-2">שכר חודשי ברוטו (₪)</label>
                            <Input
                              value={emp.monthlySalary}
                              disabled={!sections.employment.isEditing}
                              className={!sections.employment.isEditing ? "bg-slate-100" : ""}
                              placeholder="10,000"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-2">תפקיד / מקצוע</label>
                            <Input
                              value={emp.position}
                              disabled={!sections.employment.isEditing}
                              className={!sections.employment.isEditing ? "bg-slate-100" : ""}
                              placeholder="נהג, מנהל, וכו׳"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

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
                    {/* Disability Types Checklist */}
                    <div className="mb-6">
                      <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        סוג הליקוי / המחלה (סמן את כל הרלוונטיים)
                        <Sparkles className="w-4 h-4 text-purple-500" title="זוהה אוטומטית" />
                      </h4>
                      <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-lg border border-slate-200">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.chronicPain}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, chronicPain: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">כאבים כרוניים</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.limitedMobility}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, limitedMobility: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">הגבלה בתנועה</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.fibromyalgia}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, fibromyalgia: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">פיברומיאלגיה</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.anxiety}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, anxiety: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">חרדה</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.depression}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, depression: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">דיכאון</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.backProblems}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, backProblems: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">בעיות גב</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.jointProblems}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, jointProblems: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">בעיות מפרקים</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.neurologicalDisorder}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: {
                                  ...formData.disabilityTypes,
                                  neurologicalDisorder: checked as boolean,
                                },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">הפרעה נוירולוגית</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.mentalDisorder}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, mentalDisorder: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">הפרעה נפשית</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.hearingImpairment}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, hearingImpairment: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">ליקוי שמיעה</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.visionImpairment}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, visionImpairment: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">ליקוי ראייה</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.heartDisease}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, heartDisease: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">מחלת לב</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.respiratoryDisease}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: {
                                  ...formData.disabilityTypes,
                                  respiratoryDisease: checked as boolean,
                                },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">מחלת נשימה</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.kidneyDisease}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, kidneyDisease: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">מחלת כליות</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.diabetes}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, diabetes: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">סוכרת</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.disabilityTypes.cancer}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                disabilityTypes: { ...formData.disabilityTypes, cancer: checked as boolean },
                              })
                            }
                            disabled={!sections.disability.isEditing}
                          />
                          <span className="text-sm text-slate-700">מחלת סרטן</span>
                        </label>
                      </div>
                    </div>

                    {/* Disability Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          תאריך תחילת הליקוי
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          type="date"
                          value={formData.disabilityStartDate}
                          onChange={(e) => setFormData({ ...formData, disabilityStartDate: e.target.value })}
                          disabled={!sections.disability.isEditing}
                          className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          תיאור הליקוי העיקרי
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Textarea
                          value={formData.mainDisabilityDescription}
                          onChange={(e) => setFormData({ ...formData, mainDisabilityDescription: e.target.value })}
                          disabled={!sections.disability.isEditing}
                          className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Treating Physicians */}
                    <div className="mb-6">
                      <h4 className="font-bold text-slate-900 mb-3">רופאים מטפלים</h4>
                      {formData.physicians.map((physician, index) => (
                        <div key={index} className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                          <h5 className="font-semibold text-slate-800 mb-2">רופא {index + 1}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                שם הרופא
                                {index === 0 && <Sparkles className="w-3 h-3 text-purple-500" />}
                              </label>
                              <Input
                                value={physician.name}
                                onChange={(e) => {
                                  const newPhysicians = [...formData.physicians]
                                  newPhysicians[index] = { ...newPhysicians[index], name: e.target.value }
                                  setFormData({ ...formData, physicians: newPhysicians })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1">התמחות</label>
                              <Input
                                value={physician.specialty}
                                onChange={(e) => {
                                  const newPhysicians = [...formData.physicians]
                                  newPhysicians[index] = { ...newPhysicians[index], specialty: e.target.value }
                                  setFormData({ ...formData, physicians: newPhysicians })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1">מרפאה / בית חולים</label>
                              <Input
                                value={physician.clinic}
                                onChange={(e) => {
                                  const newPhysicians = [...formData.physicians]
                                  newPhysicians[index] = { ...newPhysicians[index], clinic: e.target.value }
                                  setFormData({ ...formData, physicians: newPhysicians })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1">טלפון</label>
                              <Input
                                value={physician.phone}
                                onChange={(e) => {
                                  const newPhysicians = [...formData.physicians]
                                  const newPhone = e.target.value;
                                  newPhysicians[index] = { ...newPhysicians[index], phone: newPhone }
                                  setFormData({ ...formData, physicians: newPhysicians })
                                  // Validate
                                  const phoneKey = `physician_${index}`;
                                  if (newPhone && !validateIsraeliPhone(newPhone)) {
                                    setPhoneErrors(prev => ({ ...prev, [phoneKey]: 'טלפון ישראלי לא תקין' }));
                                  } else {
                                    setPhoneErrors(prev => ({ ...prev, [phoneKey]: '' }));
                                  }
                                }}
                                onBlur={(e) => {
                                  if (validateIsraeliPhone(e.target.value)) {
                                    const newPhysicians = [...formData.physicians];
                                    newPhysicians[index] = { ...newPhysicians[index], phone: formatIsraeliPhone(e.target.value) };
                                    setFormData({ ...formData, physicians: newPhysicians });
                                  }
                                }}
                                disabled={!sections.disability.isEditing}
                                className={`${!sections.disability.isEditing ? "bg-slate-100" : ""} ${phoneErrors[`physician_${index}`] ? "border-red-500" : ""}`}
                                placeholder="050-1234567"
                              />
                              {phoneErrors[`physician_${index}`] && (
                                <p className="text-sm text-red-600 mt-1">{phoneErrors[`physician_${index}`]}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hospitalizations */}
                    <div className="mb-6">
                      <h4 className="font-bold text-slate-900 mb-3">אשפוזים רלוונטיים</h4>
                      {formData.hospitalizations.map((hosp, index) => (
                        <div key={index} className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                          <h5 className="font-semibold text-slate-800 mb-2">אשפוז {index + 1}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                בית חולים
                                <Sparkles className="w-3 h-3 text-purple-500" />
                              </label>
                              <Input
                                value={hosp.hospital}
                                onChange={(e) => {
                                  const newHospitalizations = [...formData.hospitalizations]
                                  newHospitalizations[index] = {
                                    ...newHospitalizations[index],
                                    hospital: e.target.value,
                                  }
                                  setFormData({ ...formData, hospitalizations: newHospitalizations })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1">מחלקה</label>
                              <Input
                                value={hosp.department}
                                onChange={(e) => {
                                  const newHospitalizations = [...formData.hospitalizations]
                                  newHospitalizations[index] = {
                                    ...newHospitalizations[index],
                                    department: e.target.value,
                                  }
                                  setFormData({ ...formData, hospitalizations: newHospitalizations })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1">תאריך כניסה</label>
                              <Input
                                type="date"
                                value={hosp.admissionDate}
                                onChange={(e) => {
                                  const newHospitalizations = [...formData.hospitalizations]
                                  newHospitalizations[index] = {
                                    ...newHospitalizations[index],
                                    admissionDate: e.target.value,
                                  }
                                  setFormData({ ...formData, hospitalizations: newHospitalizations })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-1">תאריך שחרור</label>
                              <Input
                                type="date"
                                value={hosp.dischargeDate}
                                onChange={(e) => {
                                  const newHospitalizations = [...formData.hospitalizations]
                                  newHospitalizations[index] = {
                                    ...newHospitalizations[index],
                                    dischargeDate: e.target.value,
                                  }
                                  setFormData({ ...formData, hospitalizations: newHospitalizations })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-sm font-medium text-slate-700 mb-1">סיבת האשפוז</label>
                              <Input
                                value={hosp.reason}
                                onChange={(e) => {
                                  const newHospitalizations = [...formData.hospitalizations]
                                  newHospitalizations[index] = { ...newHospitalizations[index], reason: e.target.value }
                                  setFormData({ ...formData, hospitalizations: newHospitalizations })
                                }}
                                disabled={!sections.disability.isEditing}
                                className={!sections.disability.isEditing ? "bg-slate-100" : ""}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
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

        {/* Section 4: Bank Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          <Card className={`overflow-hidden ${sections.bank.isConfirmed ? "border-2 border-green-500" : ""}`}>
            <button
              onClick={() => toggleSection("bank")}
              className="w-full p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sections.bank.isConfirmed ? "bg-green-500" : "bg-blue-100"
                  }`}
                >
                  {sections.bank.isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900">חלק 4: פרטי חשבון בנק</h3>
                  <p className="text-sm text-slate-600">לצורך העברת תשלומי הקצבה</p>
                </div>
              </div>
              {sections.bank.isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {sections.bank.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="mb-4 p-3 bg-amber-50 border-r-4 border-amber-500 rounded text-sm text-slate-700">
                      חשוב: פרטי חשבון הבנק נדרשים לצורך העברת תשלומי הקצבה במידה והתביעה תאושר
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          שם הבנק
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          disabled={!sections.bank.isEditing}
                          className={!sections.bank.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          מספר סניף
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          value={formData.branchNumber}
                          onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })}
                          disabled={!sections.bank.isEditing}
                          className={!sections.bank.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          מספר חשבון
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        </label>
                        <Input
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                          disabled={!sections.bank.isEditing}
                          className={!sections.bank.isEditing ? "bg-slate-100" : ""}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                      {!sections.bank.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("bank")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.bank.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("bank")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר שהפרטים נכונים
                          </Button>
                        </>
                      )}
                      {sections.bank.isConfirmed && (
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

        {/* Section 5: Medical Confidentiality Waiver */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
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
                  <h3 className="text-lg font-bold text-slate-900">חלק 5: כתב ויתור על סודיות רפואית</h3>
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
                      <label className="flex items-start gap-3 p-3 bg-amber-50 border-2 border-amber-500 rounded cursor-pointer">
                        <Checkbox
                          checked={formData.waiverAccepted}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, waiverAccepted: checked as boolean })
                          }
                          className="mt-1"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block mb-1">
                            אני מאשר/ת את כתב הוויתור על סודיות רפואית
                          </span>
                          <span className="text-sm text-slate-600">
                            אישור זה נדרש על פי חוק לצורך קבלת מסמכים רפואיים מגופים רפואיים
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      {!sections.waiver.isConfirmed && (
                        <>
                          <Button onClick={() => toggleEdit("waiver")} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4 ml-2" />
                            {sections.waiver.isEditing ? "סיים עריכה" : "ערוך"}
                          </Button>
                          <Button
                            onClick={() => confirmSection("waiver")}
                            disabled={!formData.waiverAccepted}
                            className="bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-300"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                            אני מאשר את כתב הוויתור
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
            {isAnalyzing && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-12 h-12">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">ניתוח הטופס מתבצע</h3>
                <p className="text-slate-600">
                  המערכת מנתחת את הטופס על פי ההנחיות של מנהלת הביטוח הלאומי. זה עלול לקחת כמה רגעים...
                </p>
                <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-full animate-pulse" />
                </div>
              </div>
            )}

            {analysisComplete && form7801Analysis && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <h3 className="text-2xl font-bold text-slate-900">ניתוח הושלם בהצלחה!</h3>
                </div>
                <p className="text-slate-600 mb-6">הטופס אומת על פי כללי מנהלת הביטוח הלאומי</p>
                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 mb-3"
                  onClick={handleSubmitForm}
                >
                  <FileCheck className="w-6 h-6 ml-2" />
                  הגש טופס 7801 לביטוח לאומי
                </Button>
                <p className="text-xs text-slate-500">הטופס יישלח באופן מאובטח למערכת הביטוח הלאומי</p>
              </div>
            )}

            {!isAnalyzing && !analysisComplete && allConfirmed && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <h3 className="text-2xl font-bold text-slate-900">כל הפרטים אושרו!</h3>
                </div>
                <p className="text-slate-600 mb-6">הטופס מוכן לניתוח AI</p>
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                >
                  <Sparkles className="w-6 h-6 ml-2" />
                  התחל ניתוח AI
                </Button>
                <p className="text-xs text-slate-500 mt-3">
                  המערכת תנתח את הטופס בעזרת בינה מלאכותית לפי הנחיות מנהלת הביטוח הלאומי
                </p>
              </div>
            )}

            {!allConfirmed && !isAnalyzing && !analysisComplete && (
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
    </div>
  )
}
