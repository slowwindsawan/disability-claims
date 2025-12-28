"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import SignaturePad from "@/components/signature-pad"
import { ArrowRight, CheckCircle2, FileText, Shield, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"

export default function RehabForm270Page() {
  const router = useRouter()
  const { language } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"
  const isRTL = language === "he"

  const [currentStep, setCurrentStep] = useState(1)
  const [signature, setSignature] = useState("")

  // Pre-filled data from system (from 7801 and payment-details)
  const [formData, setFormData] = useState({
    // Personal Details (from 7801)
    firstName: "ישראל",
    lastName: "ישראלי",
    idNumber: "123456789",
    birthDate: "1985-05-15",
    gender: "male",
    phone: "0501234567",
    mobile: "0501234567",
    email: "israel@example.com",

    // Bank Details (from payment-details)
    bankName: "בנק הפועלים",
    branchNumber: "123",
    accountNumber: "456789",
    accountOwnerConfirmation: false,

    // HMO Details (from payment-details)
    hmo: "כללית",
    doctorName: "ד״ר דוד כהן",

    // Address (from payment-details)
    address: "רחוב הרצל 10, תל אביב, 6473819",

    // New fields for form 270
    disabilityType: "general",
    reasonForRehab: "",
    specialRequest: "",
    hasOtherFunding: "no",
    otherFundingSource: "",
    otherFundingDetails: "",
    refuseEmployerContact: false,

    signatureDate: "",
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // Here we would submit the form to the backend
    alert("טופס 270 הוגש בהצלחה לביטוח לאומי!")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir={dir}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 transition ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <ArrowLeft className="w-5 h-5" />
              {isRTL ? "חזרה" : "Back"}
            </button>
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {isRTL ? "טופס 270 - תביעה לשיקום מקצועי" : "Form 270 - Professional Rehabilitation Claim"}
                </h1>
                <p className="text-sm text-slate-600">
                  {isRTL ? "ביטוח לאומי - מינהל הגמלאות" : "National Insurance - Benefits Administration"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className={`flex items-center ${step < 4 ? "flex-1" : ""}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                  currentStep >= step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {currentStep > step ? <CheckCircle2 className="w-6 h-6" /> : step}
              </div>
              {step < 4 && (
                <div className={`h-1 flex-1 mx-2 transition ${currentStep > step ? "bg-blue-600" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-slate-600">
          <span>{isRTL ? "פרטים אישיים" : "Personal Details"}</span>
          <span>{isRTL ? "פרטי בנק" : "Bank Details"}</span>
          <span>{isRTL ? "סיבות פנייה" : "Reason for Application"}</span>
          <span>{isRTL ? "הצהרה וחתימה" : "Declaration & Signature"}</span>
        </div>
      </div>

      {/* Form Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
        className="max-w-4xl mx-auto px-6 pb-12"
      >
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* Step 1: Personal Details (Pre-filled) */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {isRTL ? "פרטי התובע (אוטומטי)" : "Claimant Details (Auto-filled)"}
                  </h2>
                  <p className="text-slate-600 mt-1">
                    {isRTL
                      ? "הפרטים הבאים נלקחו מטופס 7801 שלך"
                      : "The following details were taken from your form 7801"}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>{isRTL ? "שם פרטי" : "First Name"}</Label>
                  <Input value={formData.firstName} disabled className="bg-green-50" />
                </div>
                <div>
                  <Label>{isRTL ? "שם משפחה" : "Last Name"}</Label>
                  <Input value={formData.lastName} disabled className="bg-green-50" />
                </div>
                <div>
                  <Label>{isRTL ? "מספר זהות" : "ID Number"}</Label>
                  <Input value={formData.idNumber} disabled className="bg-green-50" />
                </div>
                <div>
                  <Label>{isRTL ? "תאריך לידה" : "Date of Birth"}</Label>
                  <Input type="date" value={formData.birthDate} disabled className="bg-green-50" />
                </div>
              </div>

              <div>
                <Label>{isRTL ? "מין" : "Gender"}</Label>
                <RadioGroup value={formData.gender} disabled>
                  <div className="flex items-center gap-4">
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

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>{isRTL ? "טלפון נייד" : "Mobile Phone"}</Label>
                  <Input value={formData.mobile} disabled className="bg-green-50" />
                </div>
                <div>
                  <Label>{isRTL ? "דואר אלקטרוני" : "Email"}</Label>
                  <Input value={formData.email} disabled className="bg-green-50" />
                </div>
              </div>

              <div>
                <Label>{isRTL ? "כתובת מגורים" : "Residential Address"}</Label>
                <Input value={formData.address} disabled className="bg-green-50" />
              </div>

              <div>
                <Label>{isRTL ? "סוג התביעה" : "Claim Type"}</Label>
                <RadioGroup
                  value={formData.disabilityType}
                  onValueChange={(val) => handleInputChange("disabilityType", val)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="general" id="general" />
                      <Label htmlFor="general">{isRTL ? "נכות כללית" : "General Disability"}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="work" id="work" />
                      <Label htmlFor="work">{isRTL ? "נפגע עבודה" : "Work Injury"}</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Shield className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-900">
                  {isRTL
                    ? "כל הפרטים שלך מוצפנים ומאובטחים בהתאם לתקנות הגנת הפרטיות"
                    : "All your details are encrypted and secure according to privacy regulations"}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Bank Details (Pre-filled) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {isRTL ? "פרטי בנק (אוטומטי)" : "Bank Details (Auto-filled)"}
                  </h2>
                  <p className="text-slate-600 mt-1">
                    {isRTL
                      ? "חשבון זה ישמש לקבלת תשלומי השיקום"
                      : "This account will be used for receiving rehabilitation payments"}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <Label>{isRTL ? "שם הבנק" : "Bank Name"}</Label>
                  <Input value={formData.bankName} disabled className="bg-green-50" />
                </div>
                <div>
                  <Label>{isRTL ? "מספר סניף" : "Branch Number"}</Label>
                  <Input value={formData.branchNumber} disabled className="bg-green-50" />
                </div>
                <div>
                  <Label>{isRTL ? "מספר חשבון" : "Account Number"}</Label>
                  <Input value={formData.accountNumber} disabled className="bg-green-50" />
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <Checkbox
                  id="bankConfirm"
                  checked={formData.accountOwnerConfirmation}
                  onCheckedChange={(checked) => handleInputChange("accountOwnerConfirmation", checked as boolean)}
                />
                <div>
                  <Label htmlFor="bankConfirm" className="text-amber-900 cursor-pointer">
                    {isRTL
                      ? "אני מצהיר/ה כי חשבון הבנק רשום על שמי (בעלים או שותף בחשבון)"
                      : "I declare that the bank account is registered in my name (owner or account partner)"}
                  </Label>
                  <p className="text-sm text-amber-700 mt-1">
                    {isRTL
                      ? "ביטוח לאומי לא מעביר תשלומים לחשבון שאינו על שם התובע"
                      : "National Insurance does not transfer payments to accounts not in the claimant's name"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                  {isRTL ? "פרטי מטפלים" : "Healthcare Provider Details"}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>{isRTL ? "קופת חולים" : "Health Fund"}</Label>
                    <Input value={formData.hmo} disabled className="bg-green-50" />
                  </div>
                  <div>
                    <Label>{isRTL ? "שם הרופא המטפל" : "Treating Physician"}</Label>
                    <Input value={formData.doctorName} disabled className="bg-green-50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Reason for Application (User Input Required) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {isRTL ? "סיבות הפנייה לשיקום מקצועי" : "Reasons for Professional Rehabilitation Application"}
                  </h2>
                  <p className="text-slate-600 mt-1">
                    {isRTL ? "אנא מלא את הסעיפים הבאים" : "Please complete the following sections"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold">
                  {isRTL ? "1. סיבות פנייתי לשיקום מקצועי" : "1. Reasons for my rehabilitation application"}
                </Label>
                <Textarea
                  value={formData.reasonForRehab}
                  onChange={(e) => handleInputChange("reasonForRehab", e.target.value)}
                  placeholder={
                    isRTL
                      ? "תאר את הסיבות והמטרות שלך לשיקום מקצועי..."
                      : "Describe your reasons and goals for professional rehabilitation..."
                  }
                  className="mt-2 min-h-[100px]"
                />
              </div>

              <div>
                <Label className="text-lg font-semibold">
                  {isRTL
                    ? "2. בקשה/הצעה מיוחדת בקשר לתהליך השיקום"
                    : "2. Special request regarding the rehabilitation process"}
                </Label>
                <Textarea
                  value={formData.specialRequest}
                  onChange={(e) => handleInputChange("specialRequest", e.target.value)}
                  placeholder={
                    isRTL
                      ? "האם יש לך בקשה או הצעה מיוחדת? (לא חובה)"
                      : "Do you have any special requests or suggestions? (optional)"
                  }
                  className="mt-2 min-h-[80px]"
                />
              </div>

              <div>
                <Label className="text-lg font-semibold">
                  {isRTL ? "3. זכאות במימון לימודים מגורם אחר" : "3. Eligibility for funding from another source"}
                </Label>
                <RadioGroup
                  value={formData.hasOtherFunding}
                  onValueChange={(val) => handleInputChange("hasOtherFunding", val)}
                  className="mt-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="no-funding" />
                    <Label htmlFor="no-funding">{isRTL ? "לא" : "No"}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id="yes-funding" />
                    <Label htmlFor="yes-funding">{isRTL ? "כן" : "Yes"}</Label>
                  </div>
                </RadioGroup>

                {formData.hasOtherFunding === "yes" && (
                  <div className="mt-4 space-y-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <Label>{isRTL ? "הגורם המממן" : "Funding Source"}</Label>
                      <div className="space-y-2 mt-2">
                        {[
                          { value: "defense", label: isRTL ? "משרד הביטחון" : "Ministry of Defense" },
                          { value: "health", label: isRTL ? "משרד הבריאות" : "Ministry of Health" },
                          { value: "welfare", label: isRTL ? "משרד הרווחה" : "Ministry of Welfare" },
                          { value: "students", label: isRTL ? "מינהל הסטודנטים" : "Student Administration" },
                          { value: "other", label: isRTL ? "אחר" : "Other" },
                        ].map((option) => (
                          <div key={option.value} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              checked={formData.otherFundingSource === option.value}
                              onClick={() => handleInputChange("otherFundingSource", option.value)}
                            />
                            <Label htmlFor={option.value}>{option.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>{isRTL ? "פרטים על הזכאות" : "Funding Details"}</Label>
                      <Textarea
                        value={formData.otherFundingDetails}
                        onChange={(e) => handleInputChange("otherFundingDetails", e.target.value)}
                        placeholder={isRTL ? "תאר את הזכאות..." : "Describe the funding eligibility..."}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="refuseContact"
                  checked={formData.refuseEmployerContact}
                  onCheckedChange={(checked) => handleInputChange("refuseEmployerContact", checked as boolean)}
                />
                <Label htmlFor="refuseContact" className="text-sm cursor-pointer">
                  {isRTL
                    ? "אני מסרב שהביטוח הלאומי יפנה למעסיקים ולמשלמי הפנסיה שלי לקבלת דיווח באופן דיגיטלי של הכנסותיי. ידוע לי כי בשל סירובי אצטרך להגיש לביטוח לאומי בעצמי אישורים ותלושי שכר לצורך בירור זכאותי."
                    : "I refuse to allow National Insurance to contact my employers and pension payers for digital income reporting. I understand that due to my refusal, I will need to submit confirmations and pay slips to National Insurance myself to verify my eligibility."}
                </Label>
              </div>
            </div>
          )}

          {/* Step 4: Declaration and Signature */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {isRTL ? "הצהרה וחתימה" : "Declaration and Signature"}
                  </h2>
                  <p className="text-slate-600 mt-1">
                    {isRTL ? "קרא בעיון וחתום על ההצהרה" : "Read carefully and sign the declaration"}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4 text-sm">
                <p className="font-semibold text-slate-900">
                  {isRTL ? "אני החתום מטה מצהיר בזאת:" : "I, the undersigned, hereby declare:"}
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li>
                    •{" "}
                    {isRTL
                      ? "כל הפרטים שנמסרו על ידי בתביעה זו ובנספחיה הם נכונים ומלאים."
                      : "All details provided in this claim and its appendices are true and complete."}
                  </li>
                  <li>
                    •{" "}
                    {isRTL
                      ? "ידוע לי שמסירת פרטים לא נכונים או העלמת נתונים הן עבירה על החוק."
                      : "I am aware that providing false information or concealing data is a violation of the law."}
                  </li>
                  <li>
                    •{" "}
                    {isRTL
                      ? "אני מתחייב להודיע על כל שינוי בפרטים שמסרתי בתוך 30 יום."
                      : "I commit to report any changes to the information provided within 30 days."}
                  </li>
                  <li>
                    •{" "}
                    {isRTL
                      ? "אני מסכים כי המוסד יפנה לבנק שאת פרטיו ציינתי לצורך אימות בעלותי בחשבון."
                      : "I consent to the Institute contacting the bank I specified to verify my account ownership."}
                  </li>
                </ul>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-2 block">{isRTL ? "תאריך" : "Date"}</Label>
                <Input
                  type="date"
                  value={formData.signatureDate}
                  onChange={(e) => handleInputChange("signatureDate", e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label className="text-lg font-semibold mb-2 block">{isRTL ? "חתימה" : "Signature"}</Label>
                <SignaturePad onSignatureChange={setSignature} />
              </div>

              {signature && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{isRTL ? "חתימה התקבלה" : "Signature received"}</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className={`flex items-center justify-between mt-8 pt-6 border-t ${isRTL ? "flex-row-reverse" : ""}`}>
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handlePrevStep}>
                {isRTL ? "חזור" : "Previous"}
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                onClick={handleNextStep}
                disabled={currentStep === 2 && !formData.accountOwnerConfirmation}
                className={`${isRTL ? "flex-row-reverse" : ""}`}
              >
                {isRTL ? "המשך" : "Continue"}
                <ArrowRight className={`w-4 h-4 ${isRTL ? "mr-2" : "ml-2"}`} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!signature || !formData.signatureDate || !formData.reasonForRehab}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRTL ? "הגש טופס לביטוח לאומי" : "Submit Form to National Insurance"}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
