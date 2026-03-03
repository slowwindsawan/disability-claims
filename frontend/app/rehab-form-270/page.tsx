"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CheckCircle2, FileText, Shield, ArrowLeft, Loader2, XCircle, Lock, AlertCircle } from "lucide-react"
import { BACKEND_BASE_URL } from "@/variables"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Statuses {
  GeneralDisabled: boolean
  WorkInjury: boolean
  ZionPrisoner: boolean
  Volunteer: boolean
  HandicappedPartner: boolean
  ParentAChildDied: boolean
  Widower: boolean
  HostilitiesVictim: boolean
}

interface RehabSection {
  shikumReason: string
  shikumWishes: string
  financeRight: "yes" | "no" | "unknown"
  financeRightFrom: number[]
  explainOther: string
}

interface OtherDocument {
  name: string
  fileType: string
  fileUrl: string
  enabled: boolean
}

interface FormState {
  statuses: Statuses
  filedGeneralDisabilityClaim: "yes" | "no"
  firstName: string
  lastName: string
  idNumber: string
  gender: "male" | "female"
  birthDate: string
  phone: string
  repeatPhone: string
  otherPhone: string
  email: string
  repeatEmail: string
  acceptDigital: boolean
  otherAddress: boolean
  accountOwnerName: string
  hasOtherOwners: boolean
  bankName: string
  branchName: string
  accountNumber: string
  rehab: RehabSection
}

type SubmitStatus = "idle" | "storing" | "filling" | "success" | "error"

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RehabForm270Page() {
  const router = useRouter()
  const { language } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"
  const isRTL = language === "he"

  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [caseObj, setCaseObj] = useState<any>(null)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [fillingMsg, setFillingMsg] = useState("")
  const [otherDocuments, setOtherDocuments] = useState<OtherDocument[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [bankMissing, setBankMissing] = useState(false)
  const extTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState<FormState>({
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
    firstName: "",
    lastName: "",
    idNumber: "",
    gender: "male",
    birthDate: "",
    phone: "",
    repeatPhone: "",
    otherPhone: "",
    email: "",
    repeatEmail: "",
    acceptDigital: true,
    otherAddress: false,
    accountOwnerName: "",
    hasOtherOwners: false,
    bankName: "",
    branchName: "",
    accountNumber: "",
    rehab: {
      shikumReason: "",
      shikumWishes: "",
      financeRight: "no",
      financeRightFrom: [],
      explainOther: "",
    },
  })

  // ── Load & pre-fill ──────────────────────────────────────────────────────

  useEffect(() => {
    const prefillFrom270 = (d: Record<string, any>, firstName: string, lastName: string) => {
      // d has the same field names as FormState since 207_form is produced by our agent
      const rawGender = d.gender || ""
      const gender: "male" | "female" =
        rawGender === "male" || rawGender === "1" ? "male" :
        rawGender === "female" || rawGender === "2" ? "female" : "male"

      const rawBirth = d.birthDate || ""
      const birthDate = rawBirth
        ? rawBirth.includes("/") ? rawBirth : rawBirth.split("-").reverse().join("/")
        : ""

      setForm((prev) => ({
        ...prev,
        statuses:      d.statuses      || prev.statuses,
        filedGeneralDisabilityClaim: d.filedGeneralDisabilityClaim || prev.filedGeneralDisabilityClaim,
        firstName:     d.firstName     || firstName || prev.firstName,
        lastName:      d.lastName      || lastName  || prev.lastName,
        idNumber:      d.idNumber      || prev.idNumber,
        gender,
        birthDate:     birthDate       || prev.birthDate,
        phone:         d.phone         || prev.phone,
        repeatPhone:   d.repeatPhone   || d.phone   || prev.phone,
        otherPhone:    d.otherPhone    || prev.otherPhone,
        email:         d.email         || prev.email,
        repeatEmail:   d.repeatEmail   || d.email   || prev.email,
        acceptDigital: d.acceptDigital !== undefined ? d.acceptDigital : prev.acceptDigital,
        otherAddress:  d.otherAddress  !== undefined ? d.otherAddress  : prev.otherAddress,
        accountOwnerName: d.accountOwnerName || (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}`.trim() : prev.accountOwnerName),
        hasOtherOwners: d.hasOtherOwners !== undefined ? d.hasOtherOwners : prev.hasOtherOwners,
        bankName:      d.bankName      || prev.bankName,
        branchName:    d.branchName    || prev.branchName,
        accountNumber: d.accountNumber || prev.accountNumber,
        rehab: {
          shikumReason:    d.rehab?.shikumReason    || prev.rehab.shikumReason,
          shikumWishes:    d.rehab?.shikumWishes    || prev.rehab.shikumWishes,
          financeRight:    d.rehab?.financeRight    || prev.rehab.financeRight,
          financeRightFrom: d.rehab?.financeRightFrom || prev.rehab.financeRightFrom,
          explainOther:    d.rehab?.explainOther    || prev.rehab.explainOther,
        },
      }))
      if (d.otherDocuments && Array.isArray(d.otherDocuments)) {
        setOtherDocuments(d.otherDocuments.map((doc: any) => ({ ...doc, enabled: true })))
      }
    }

    const triggerAnalysis = async (caseId: string, token: string): Promise<void> => {
      try {
        setAnalyzing(true)
        const res = await fetch(`${BACKEND_BASE_URL}/cases/${caseId}/analyze-documents-form270`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          console.error("[rehab-form-270] analyze-documents-form270 failed", res.status)
        }
      } catch (err) {
        console.error("[rehab-form-270] Error triggering 270 analysis", err)
      } finally {
        setAnalyzing(false)
      }
    }

    const loadCaseData = async () => {
      try {
        const caseId = localStorage.getItem("case_id")
        const token = localStorage.getItem("access_token")
        if (!caseId || !token) { setLoading(false); return }

        const res = await fetch(`${BACKEND_BASE_URL}/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { setLoading(false); return }

        const json = await res.json()
        const c = json?.case || json
        if (!c?.id) { setLoading(false); return }
        setCaseObj(c)

        const form270 = c["207_form"] as Record<string, any> | null | undefined

        const checkBankFallback = async (formHasBankName: boolean, firstName: string, lastName: string) => {
          if (formHasBankName) return
          try {
            const profileRes = await fetch(`${BACKEND_BASE_URL}/user/profile`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (profileRes.ok) {
              const pd = await profileRes.json()
              const p = pd?.profile || pd?.data || pd
              const payments = p?.payments || {}
              const pBankName = payments?.bankName || payments?.bank_name || ""
              const pBranchName = payments?.branchNumber || payments?.branch_number || ""
              const pAccountNumber = payments?.accountNumber || payments?.account_number || ""
              if (pBankName) {
                setForm(prev => ({
                  ...prev,
                  bankName: pBankName,
                  branchName: pBranchName,
                  accountNumber: pAccountNumber,
                  accountOwnerName: prev.accountOwnerName || `${firstName} ${lastName}`.trim(),
                }))
              } else {
                setBankMissing(true)
              }
            } else {
              setBankMissing(true)
            }
          } catch {
            setBankMissing(true)
          }
        }

        if (!form270) {
          // 207_form not yet generated — trigger analysis, then reload
          setLoading(false)
          await triggerAnalysis(caseId, token)
          // Re-fetch after analysis
          const res2 = await fetch(`${BACKEND_BASE_URL}/cases/${caseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res2.ok) {
            const json2 = await res2.json()
            const c2 = json2?.case || json2
            if (c2?.id) {
              setCaseObj(c2)
              const d2 = (c2["207_form"] || {}) as Record<string, any>
              prefillFrom270(d2, "", "")
              await checkBankFallback(!!d2.bankName, d2.firstName || "", d2.lastName || "")
            }
          }
          return
        }

        // 207_form found — prefill immediately
        const firstName = form270.firstName || ""
        const lastName  = form270.lastName  || ""
        prefillFrom270(form270, firstName, lastName)
        await checkBankFallback(!!form270.bankName, firstName, lastName)
      } catch (err) {
        console.error("[rehab-form-270] failed to load case data", err)
      } finally {
        setLoading(false)
      }
    }
    loadCaseData()
  }, [])

  // ── Extension message listener ───────────────────────────────────────────

  const handleExtensionMessage = useCallback(
    (event: MessageEvent) => {
      if (event.source !== window) return

      if (event.data?.type === "BTL_EXTENSION_PHASE2_PAYLOAD_STORED") {
        if (extTimeoutRef.current) { clearTimeout(extTimeoutRef.current); extTimeoutRef.current = null }
        if (!event.data.success) {
          setSubmitStatus("error")
          setErrorMsg(isRTL
            ? "לא ניתן לתקשר עם התוסף. ודא שהתוסף מותקן ומופעל, רענן את הדף ונסה שנית."
            : "The extension did not respond. Make sure it is installed and enabled, then reload the page and try again.")
          return
        }
        setSubmitStatus("filling")
        window.open("https://govforms.gov.il/mw/forms/T270@btl.gov.il", "_blank")
      }

      if (event.data?.type === "BTL_EXTENSION_FILLING_STATUS") {
        const { isComplete, success, message } = event.data
        if (!isComplete) {
          // Live progress update — show message in filling modal
          if (message) setFillingMsg(message)
          setSubmitStatus("filling")
          return
        }
        if (success) {
          setSubmitStatus("success")
          setTimeout(() => router.push("/dashboard"), 2000)
        } else {
          setSubmitStatus("error")
          setErrorMsg(isRTL ? "נראה שמילוי הטופס לא הושלם. ניתן לנסות שוב." : "Form filling did not complete. You can try again.")
        }
      }
    },
    [router, isRTL]
  )

  useEffect(() => {
    window.addEventListener("message", handleExtensionMessage)
    return () => window.removeEventListener("message", handleExtensionMessage)
  }, [handleExtensionMessage])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const setField = (field: keyof FormState, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const setStatus = (key: keyof Statuses, value: boolean) =>
    setForm((prev) => ({ ...prev, statuses: { ...prev.statuses, [key]: value } }))

  const setRehab = (key: keyof RehabSection, value: any) =>
    setForm((prev) => ({ ...prev, rehab: { ...prev.rehab, [key]: value } }))

  const toggleFinanceRightFrom = (n: number) => {
    const cur = form.rehab.financeRightFrom
    setRehab("financeRightFrom", cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n])
  }

  // ── Validation ───────────────────────────────────────────────────────────────────

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    const r = (k: string, msg: string) => { e[k] = msg }
    const req = (v: string) => !v.trim()

    if (!Object.values(form.statuses).some(Boolean))
      r("statuses", isRTL ? "יש לסמן לפחות סוג נכות אחד" : "At least one status checkbox must be selected")
    if (req(form.firstName))  r("firstName",  isRTL ? "שם פרטי הוא שדה חובה" : "First name is required")
    if (req(form.lastName))   r("lastName",   isRTL ? "שם משפחה הוא שדה חובה" : "Last name is required")
    if (req(form.idNumber) || !/^\d{9}$/.test(form.idNumber.trim()))
      r("idNumber", isRTL ? "מספר זהות חייב להכיל 9 ספרות" : "ID number must be exactly 9 digits")
    if (req(form.birthDate) || !/^\d{2}\/\d{2}\/\d{4}$/.test(form.birthDate.trim()))
      r("birthDate", isRTL ? "תאריך לידה חייב להיות בפורמט DD/MM/YYYY" : "Birth date must be in DD/MM/YYYY format")
    if (req(form.phone) || !/^0\d{8,9}$/.test(form.phone.trim()))
      r("phone", isRTL ? "מספר טלפון לא תקין (לדוגמה: 0501234567)" : "Invalid phone number (e.g. 0501234567)")
    if (req(form.email) || !form.email.includes("@"))
      r("email", isRTL ? 'דוא"ל תקין הוא שדה חובה' : "Valid email is required")
    if (form.repeatEmail.trim() !== form.email.trim())
      r("repeatEmail", isRTL ? 'כתובות הדו"ל אינן זהות' : "Email addresses do not match")
    if (req(form.accountOwnerName)) r("accountOwnerName", isRTL ? "שם בעל החשבון הוא שדה חובה" : "Account owner name is required")
    if (req(form.bankName))         r("bankName",         isRTL ? "שם הבנק הוא שדה חובה" : "Bank name is required")
    if (req(form.branchName))       r("branchName",       isRTL ? "שם/מספר סניף הוא שדה חובה" : "Branch name/number is required")
    if (req(form.accountNumber))    r("accountNumber",    isRTL ? "מספר חשבון הוא שדה חובה" : "Account number is required")
    if (req(form.rehab.shikumReason))
      r("shikumReason", isRTL ? "סיבת הפנייה לשיקום היא שדה חובה" : "Reason for rehabilitation is required")
    if (form.rehab.financeRight === "yes" && form.rehab.financeRightFrom.length === 0)
      r("financeRightFrom", isRTL ? "נא בחר לפחות מקור מימון אחד" : "Select at least one funding source")
    if (form.rehab.financeRightFrom.includes(5) && req(form.rehab.explainOther))
      r("explainOther", isRTL ? "פרט את מקור המימון האחר" : "Please describe the other funding source")
    return e
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      // Scroll to the first error field
      const firstKey = Object.keys(errors)[0]
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setValidationErrors({})
    if (!caseObj?.id) {
      setErrorMsg(isRTL ? "לא נמצא תיק משתמש" : "No user case found")
      setSubmitStatus("error")
      return
    }
    const payload = {
      ...form,
      otherDocuments: otherDocuments
        .filter((d) => d.enabled)
        .map(({ enabled, ...rest }) => rest),
      user_id: caseObj.user_id || caseObj.id,
      case_id: caseObj.id,
    }
    setSubmitStatus("storing")
    // Start timeout — if extension never responds within 12s, surface error
    extTimeoutRef.current = setTimeout(() => {
      setSubmitStatus("error")
      setErrorMsg(isRTL
        ? "התוסף לא הגיב. ודא שהתוסף מותקן ומופעל בדפדפן, רענן את הדף ונסה שנית."
        : "The extension did not respond. Make sure it is installed and enabled in your browser, reload the page, and try again.")
    }, 12000)
    window.postMessage({ type: "BTL_EXTENSION_STORE_PHASE2_PAYLOAD", payload }, "*")
  }

  const canSubmit = submitStatus !== "storing" && submitStatus !== "filling"

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading || analyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white" dir={dir}>
        <div className="flex flex-col items-center gap-5 text-center max-w-sm px-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          </div>
          {analyzing ? (
            <>
              <h2 className="text-xl font-bold text-slate-800">
                {isRTL ? "מנתח את הנתונים שלך" : "Analyzing your data"}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {isRTL
                  ? "אנו מכינים את הטופס עבורך על בסיס הפרטים שנמסרו. הדבר עשוי לקחת כ־30 שניות."
                  : "We are preparing the form based on your information. This may take about 30 seconds."}
              </p>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">{isRTL ? "טוען נתונים..." : "Loading data..."}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir={dir}>

      {/* ── Status Modal ── */}
      {submitStatus !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            {(submitStatus === "storing" || submitStatus === "filling") && (
              <>
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-800">
                  {submitStatus === "storing"
                    ? (isRTL ? "שומר נתונים בתוסף..." : "Saving data to extension...")
                    : (fillingMsg || (isRTL ? "ממלא טופס 270 בביטוח לאומי..." : "Filling form 270 on National Insurance..."))}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {isRTL ? "אנא המתן — אין לסגור חלון זה" : "Please wait — do not close this window"}
                </p>
              </>
            )}
            {submitStatus === "success" && (
              <>
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-bold text-green-700">
                  {isRTL ? "טופס 270 הוגש בהצלחה!" : "Form 270 submitted successfully!"}
                </p>
                <p className="text-sm text-slate-500 mt-2">{isRTL ? "מעביר לדשבורד..." : "Redirecting to dashboard..."}</p>
              </>
            )}
            {submitStatus === "error" && (
              <>
                <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-bold text-red-700 mb-1">{isRTL ? "שגיאה" : "Error"}</p>
                <p className="text-sm text-slate-600 mb-4">{errorMsg || (isRTL ? "אירעה שגיאה. אנא נסה שוב." : "An error occurred. Please try again.")}</p>
                <Button onClick={() => { setSubmitStatus("idle"); setErrorMsg("") }} variant="outline">
                  {isRTL ? "סגור" : "Close"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            {isRTL ? "חזרה" : "Back"}
          </button>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {isRTL ? "טופס 270 – שיקום מקצועי" : "Form 270 – Professional Rehabilitation"}
              </h1>
              <p className="text-sm text-slate-500">
                {isRTL ? "ביטוח לאומי – מינהל שיקום" : "National Insurance – Rehabilitation Administration"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Form ── */}
      <div className="max-w-4xl mx-auto px-6 py-8 pb-16 space-y-6">

        {/* ─ Section 1: Personal Details ─ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRTL ? "פרטים אישיים" : "Personal Details"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isRTL ? "הפרטים אוכלסו אוטומטית על ידי ניתוח AI" : "Pre-filled automatically by AI analysis"}
              </p>
            </div>
          </div>

          {/* Statuses */}
          <div id="field-statuses">
            <Label className="text-base font-semibold mb-2 block">
              {isRTL ? "סוג הנכות / הזכאות" : "Disability / Eligibility Type"}
            </Label>
            {validationErrors.statuses && (
              <p className="text-red-500 text-xs mb-2">{validationErrors.statuses}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["GeneralDisabled",    isRTL ? "נכות כללית"          : "General Disability"],
                  ["WorkInjury",         isRTL ? "נפגע עבודה"          : "Work Injury"],
                  ["ZionPrisoner",       isRTL ? "אסיר ציון"           : "Zion Prisoner"],
                  ["Volunteer",          isRTL ? "מתנדב"               : "Volunteer"],
                  ["HandicappedPartner", isRTL ? "בן/בת זוג של נכה"    : "Disabled Person's Spouse"],
                  ["ParentAChildDied",   isRTL ? "הורה שילד נפטר"      : "Parent of Deceased Child"],
                  ["Widower",            isRTL ? "אלמן/ה"              : "Widower/Widow"],
                  ["HostilitiesVictim",  isRTL ? "נפגע פעולות איבה"    : "Hostilities Victim"],
                ] as [keyof Statuses, string][]
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={form.statuses[key]}
                    onCheckedChange={(v) => setStatus(key, !!v)}
                  />
                  <Label htmlFor={key} className="cursor-pointer font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Filed claim */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              {isRTL ? "האם הגשת תביעה לנכות כללית בעבר?" : "Have you previously filed a general disability claim?"}
            </Label>
            <RadioGroup
              value={form.filedGeneralDisabilityClaim}
              onValueChange={(v) => setField("filedGeneralDisabilityClaim", v as "yes" | "no")}
            >
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="filed-yes" />
                  <Label htmlFor="filed-yes">{isRTL ? "כן" : "Yes"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="filed-no" />
                  <Label htmlFor="filed-no">{isRTL ? "לא" : "No"}</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Name + ID + DOB */}
          <div className="grid md:grid-cols-2 gap-4">
            <div id="field-firstName">
              <Label>{isRTL ? "שם פרטי" : "First Name"}</Label>
              <Input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} className={`bg-green-50 mt-1 ${validationErrors.firstName ? "border-red-500" : ""}`} />
              {validationErrors.firstName && <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>}
            </div>
            <div id="field-lastName">
              <Label>{isRTL ? "שם משפחה" : "Last Name"}</Label>
              <Input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} className={`bg-green-50 mt-1 ${validationErrors.lastName ? "border-red-500" : ""}`} />
              {validationErrors.lastName && <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>}
            </div>
            <div id="field-idNumber">
              <Label>{isRTL ? "מספר זהות" : "ID Number"}</Label>
              <Input value={form.idNumber} onChange={(e) => setField("idNumber", e.target.value)} className={`bg-green-50 mt-1 ${validationErrors.idNumber ? "border-red-500" : ""}`} />
              {validationErrors.idNumber && <p className="text-red-500 text-xs mt-1">{validationErrors.idNumber}</p>}
            </div>
            <div id="field-birthDate">
              <Label>{isRTL ? "תאריך לידה (DD/MM/YYYY)" : "Date of Birth (DD/MM/YYYY)"}</Label>
              <Input value={form.birthDate} onChange={(e) => setField("birthDate", e.target.value)} placeholder="01/01/1985" className={`bg-green-50 mt-1 ${validationErrors.birthDate ? "border-red-500" : ""}`} />
              {validationErrors.birthDate && <p className="text-red-500 text-xs mt-1">{validationErrors.birthDate}</p>}
            </div>
          </div>

          {/* Gender */}
          <div>
            <Label className="mb-2 block">{isRTL ? "מין" : "Gender"}</Label>
            <RadioGroup value={form.gender} onValueChange={(v) => setField("gender", v as "male" | "female")}>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">{isRTL ? "זכר" : "Male"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">{isRTL ? "נקבה" : "Female"}</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Contact */}
          <div className="grid md:grid-cols-2 gap-4">
            <div id="field-phone">
              <Label>{isRTL ? "טלפון" : "Phone"}</Label>
              <Input value={form.phone} onChange={(e) => { setField("phone", e.target.value); setField("repeatPhone", e.target.value) }} className={`bg-green-50 mt-1 ${validationErrors.phone ? "border-red-500" : ""}`} />
              {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
            </div>
            <div>
              <Label>{isRTL ? "טלפון נוסף (אופציונלי)" : "Other Phone (optional)"}</Label>
              <Input value={form.otherPhone} onChange={(e) => setField("otherPhone", e.target.value)} className="mt-1" />
            </div>
            <div id="field-email">
              <Label>{isRTL ? "דואר אלקטרוני" : "Email"}</Label>
              <Input value={form.email} onChange={(e) => setField("email", e.target.value)} className={`bg-green-50 mt-1 ${validationErrors.email ? "border-red-500" : ""}`} />
              {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
            </div>
            <div id="field-repeatEmail">
              <Label>{isRTL ? "חזור על הדואר האלקטרוני" : "Repeat Email"}</Label>
              <Input value={form.repeatEmail} onChange={(e) => setField("repeatEmail", e.target.value)} className={`mt-1 ${validationErrors.repeatEmail ? "border-red-500" : ""}`} />
              {validationErrors.repeatEmail && <p className="text-red-500 text-xs mt-1">{validationErrors.repeatEmail}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="acceptDigital"
              checked={form.acceptDigital}
              onCheckedChange={(v) => setField("acceptDigital", !!v)}
            />
            <Label htmlFor="acceptDigital" className="cursor-pointer">
              {isRTL
                ? "אני מסכים לקבל הודעות ומסמכים בפורמט דיגיטלי"
                : "I agree to receive notifications and documents in digital format"}
            </Label>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
            <Shield className="w-4 h-4 shrink-0 text-blue-600" />
            {isRTL
              ? "פרטיך מוצפנים ומאובטחים בהתאם לתקנות הגנת הפרטיות"
              : "Your details are encrypted and secured according to privacy regulations"}
          </div>
        </div>

        {/* ─ Section 2: Bank Details ─ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRTL ? "פרטי בנק" : "Bank Details"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isRTL ? "החשבון ישמש לתשלומי השיקום" : "This account will be used for rehabilitation payments"}
              </p>
            </div>
          </div>

          {bankMissing && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm text-orange-800">
                <p className="font-semibold mb-1">{isRTL ? "פרטי בנק חסרים" : "Bank details missing"}</p>
                <p className="mb-2">{isRTL ? "כדי להמשיך, עליך למלא פרטי בנק בדף הפרטים האישיים." : "To continue, please fill in your bank details in the payment details page."}</p>
                <Link href="/payment-details" className="font-semibold text-orange-700 underline underline-offset-2">
                  {isRTL ? "← עבור לפרטי תשלום" : "Go to Payment Details →"}
                </Link>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div id="field-accountOwnerName">
              <Label>{isRTL ? "שם בעל החשבון" : "Account Owner Name"}</Label>
              <div className={`flex items-center gap-2 mt-1 px-3 py-2 bg-slate-100 border rounded-md text-sm ${validationErrors.accountOwnerName ? "border-red-400 text-red-700" : "border-slate-200 text-slate-700"}`}>
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{form.accountOwnerName || "—"}</span>
              </div>
              {validationErrors.accountOwnerName && <p className="text-red-500 text-xs mt-1">{validationErrors.accountOwnerName}</p>}
            </div>
            <div id="field-bankName">
              <Label>{isRTL ? "שם הבנק" : "Bank Name"}</Label>
              <div className={`flex items-center gap-2 mt-1 px-3 py-2 bg-slate-100 border rounded-md text-sm ${validationErrors.bankName ? "border-red-400 text-red-700" : "border-slate-200 text-slate-700"}`}>
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{form.bankName || (isRTL ? "לא מוגדר" : "Not set")}</span>
              </div>
              {validationErrors.bankName && <p className="text-red-500 text-xs mt-1">{validationErrors.bankName}</p>}
            </div>
            <div id="field-branchName">
              <Label>{isRTL ? "שם / מספר סניף" : "Branch Name / Number"}</Label>
              <div className={`flex items-center gap-2 mt-1 px-3 py-2 bg-slate-100 border rounded-md text-sm ${validationErrors.branchName ? "border-red-400 text-red-700" : "border-slate-200 text-slate-700"}`}>
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{form.branchName || (isRTL ? "לא מוגדר" : "Not set")}</span>
              </div>
              {validationErrors.branchName && <p className="text-red-500 text-xs mt-1">{validationErrors.branchName}</p>}
            </div>
            <div id="field-accountNumber">
              <Label>{isRTL ? "מספר חשבון" : "Account Number"}</Label>
              <div className={`flex items-center gap-2 mt-1 px-3 py-2 bg-slate-100 border rounded-md text-sm ${validationErrors.accountNumber ? "border-red-400 text-red-700" : "border-slate-200 text-slate-700"}`}>
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{form.accountNumber || (isRTL ? "לא מוגדר" : "Not set")}</span>
              </div>
              {validationErrors.accountNumber && <p className="text-red-500 text-xs mt-1">{validationErrors.accountNumber}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="hasOtherOwners"
              checked={form.hasOtherOwners}
              onCheckedChange={(v) => setField("hasOtherOwners", !!v)}
            />
            <Label htmlFor="hasOtherOwners" className="cursor-pointer">
              {isRTL ? "יש בעלים נוספים לחשבון" : "The account has additional owners"}
            </Label>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
            {isRTL
              ? "ביטוח לאומי אינו מעביר תשלומים לחשבון שאינו רשום על שם התובע."
              : "National Insurance does not transfer payments to accounts not registered in the claimant's name."}
          </div>
        </div>

        {/* ─ Section 3: Rehabilitation ─ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRTL ? "שיקום מקצועי – פרטי הפנייה" : "Professional Rehabilitation – Application Details"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isRTL ? "אנא מלא את הפרטים הבאים" : "Please complete the following sections"}
              </p>
            </div>
          </div>

          <div id="field-shikumReason">
            <Label className="font-semibold mb-1.5 block">
              {isRTL ? "סיבות פנייתי לשיקום מקצועי *" : "Reasons for my rehabilitation application *"}
            </Label>
            <Textarea
              value={form.rehab.shikumReason}
              onChange={(e) => setRehab("shikumReason", e.target.value)}
              placeholder={isRTL ? "תאר את הסיבות והמטרות שלך לשיקום מקצועי..." : "Describe your reasons and goals for professional rehabilitation..."}
              className={`min-h-[100px] ${validationErrors.shikumReason ? "border-red-500" : ""}`}
            />
            {validationErrors.shikumReason && <p className="text-red-500 text-xs mt-1">{validationErrors.shikumReason}</p>}
          </div>

          <div>
            <Label className="font-semibold mb-1.5 block">
              {isRTL ? "בקשות / הצעות בקשר לתהליך השיקום" : "Requests / suggestions regarding the rehabilitation process"}
            </Label>
            <Textarea
              value={form.rehab.shikumWishes}
              onChange={(e) => setRehab("shikumWishes", e.target.value)}
              placeholder={isRTL ? "האם יש לך בקשות מיוחדות? (אופציונלי)" : "Do you have special requests? (optional)"}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label className="font-semibold mb-2 block">
              {isRTL ? "זכאות למימון לימודים ממקור אחר?" : "Eligibility for funding from another source?"}
            </Label>
            <RadioGroup
              value={form.rehab.financeRight}
              onValueChange={(v) => setRehab("financeRight", v as "yes" | "no" | "unknown")}
            >
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="fr-yes" />
                  <Label htmlFor="fr-yes">{isRTL ? "כן" : "Yes"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="fr-no" />
                  <Label htmlFor="fr-no">{isRTL ? "לא" : "No"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="unknown" id="fr-unknown" />
                  <Label htmlFor="fr-unknown">{isRTL ? "לא ידוע" : "Unknown"}</Label>
                </div>
              </div>
            </RadioGroup>

            {form.rehab.financeRight === "yes" && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <Label className="font-semibold block" id="field-financeRightFrom">
                  {isRTL ? "בחר את מקורות המימון (ניתן לסמן מספר)" : "Select funding sources (multiple allowed)"}
                </Label>
                {validationErrors.financeRightFrom && (
                  <p className="text-red-500 text-xs">{validationErrors.financeRightFrom}</p>
                )}
                {(
                  [
                    [1, isRTL ? "משרד הביטחון"      : "Ministry of Defense"],
                    [2, isRTL ? "משרד הבריאות"      : "Ministry of Health"],
                    [3, isRTL ? "משרד הרווחה"       : "Ministry of Welfare"],
                    [4, isRTL ? "מינהל הסטודנטים"   : "Student Administration"],
                    [5, isRTL ? "אחר"               : "Other"],
                  ] as [number, string][]
                ).map(([n, label]) => (
                  <div key={n} className="flex items-center gap-2">
                    <Checkbox
                      id={`ff-${n}`}
                      checked={form.rehab.financeRightFrom.includes(n)}
                      onCheckedChange={() => toggleFinanceRightFrom(n)}
                    />
                    <Label htmlFor={`ff-${n}`} className="cursor-pointer font-normal">{label}</Label>
                  </div>
                ))}
                {form.rehab.financeRightFrom.includes(5) && (
                  <div id="field-explainOther">
                    <Label className="mb-1.5 block">{isRTL ? "פרט את המקור האחר" : "Describe the other source"}</Label>
                    <Textarea
                      value={form.rehab.explainOther}
                      onChange={(e) => setRehab("explainOther", e.target.value)}
                      placeholder={isRTL ? "פרט..." : "Describe..."}
                      className={`min-h-[60px] ${validationErrors.explainOther ? "border-red-500" : ""}`}
                    />
                    {validationErrors.explainOther && <p className="text-red-500 text-xs mt-1">{validationErrors.explainOther}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─ Section 4: Documents to Attach ─ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b">
            <FileText className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRTL ? "מסמכים לצירוף" : "Documents to Attach"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isRTL
                  ? "המסמכים שסומנו יצורפו אוטומטית לטופס הממשלתי"
                  : "Checked documents will be automatically attached to the government form"}
              </p>
            </div>
          </div>

          {otherDocuments.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              {isRTL
                ? "לא זוהו מסמכים לצירוף אוטומטי. ניתן לצרף מסמכים ידנית בטופס הממשלתי."
                : "No documents were identified for automatic attachment. You can attach documents manually in the government form."}
            </p>
          ) : (
            <div className="space-y-3">
              {otherDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    doc.enabled ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <Checkbox
                    id={`doc-${idx}`}
                    checked={doc.enabled}
                    onCheckedChange={(v) =>
                      setOtherDocuments((prev) =>
                        prev.map((d, i) => (i === idx ? { ...d, enabled: !!v } : d))
                      )
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`doc-${idx}`} className="cursor-pointer font-medium text-slate-800 truncate block">
                      {doc.name}
                    </Label>
                  </div>
                  <span className="text-xs font-mono uppercase px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded shrink-0">
                    {doc.fileType || "file"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─ Section 5: Declaration ─ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isRTL ? "הצהרה" : "Declaration"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isRTL
                  ? "לאחר לחיצה על 'הגש לביטוח לאומי', התוסף ימלא את הטופס אוטומטית"
                  : "After clicking 'Submit to National Insurance', the extension will fill the form automatically"}
              </p>
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-2 text-slate-700">
            <p className="font-semibold text-slate-900">
              {isRTL ? "אני החתום מטה מצהיר/ה:" : "I, the undersigned, hereby declare:"}
            </p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>{isRTL ? "כל הפרטים שנמסרו על ידי בתביעה זו ובנספחיה הם נכונים ומלאים." : "All details provided in this claim and its appendices are true and complete."}</li>
              <li>{isRTL ? "ידוע לי שמסירת פרטים לא נכונים או העלמת נתונים הן עבירה על החוק." : "I am aware that providing false information or concealing data is a violation of the law."}</li>
              <li>{isRTL ? "אני מתחייב/ת להודיע על כל שינוי בפרטים שמסרתי בתוך 30 יום." : "I commit to report any changes to the information provided within 30 days."}</li>
              <li>{isRTL ? "אני מסכים/ה שהמוסד יפנה לבנק שאת פרטיו ציינתי לצורך אימות בעלותי בחשבון." : "I consent to the Institute contacting the bank I specified to verify my account ownership."}</li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
            {isRTL
              ? "לאחר לחיצה על \"הגש לביטוח לאומי\", התוסף ימלא את טופס T270 הממשלתי אוטומטית."
              : "After clicking \"Submit to National Insurance\", the extension will automatically fill the T270 government form."}
          </div>

          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-sm text-red-800 space-y-1">
              <p className="font-semibold">{isRTL ? "יש לתקן את השדות הבאים לפני הגשה:" : "Please fix the following before submitting:"}</p>
              <ul className="list-disc list-inside space-y-0.5">
                {Object.values(validationErrors).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold rounded-lg"
          >
            {isRTL ? "הגש לביטוח לאומי" : "Submit to National Insurance"}
          </Button>
        </div>
      </div>
    </div>
  )
}
