"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  Lock,
  FileText,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  FileIcon,
  Car,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { SignaturePad } from "@/components/signature-pad"
import { useLanguage } from "@/lib/language-context"

export default function Checkout() {
  const router = useRouter()
  const { language } = useLanguage()
  const isRTL = language === "he"
  const [step, setStep] = useState<"payment" | "signature">("payment")
  const [paymentComplete, setPaymentComplete] = useState(false)

  const [selectedBundles, setSelectedBundles] = useState({
    mobility: true,
    specialServices: false,
  })

  const [agreements, setAgreements] = useState({
    powerOfAttorney: false,
    medicalRecords: false,
    terms: false,
    confidentialityWaiver: false,
  })
  const [signatures, setSignatures] = useState({
    powerOfAttorney: "",
    medicalRecords: "",
    terms: "",
    confidentialityWaiver: "",
  })

  const basePrice = 800
  const mobilityPrice = 150
  const specialServicesPrice = 150

  const totalPrice =
    basePrice +
    (selectedBundles.mobility ? mobilityPrice : 0) +
    (selectedBundles.specialServices ? specialServicesPrice : 0)

  const handlePayment = () => {
    setPaymentComplete(true)
    setTimeout(() => {
      setStep("signature")
    }, 1500)
  }

  const allAgreementsChecked =
    agreements.powerOfAttorney && agreements.medicalRecords && agreements.terms && agreements.confidentialityWaiver

  const allDocumentsSigned =
    signatures.powerOfAttorney && signatures.medicalRecords && signatures.terms && signatures.confidentialityWaiver

  const handleFinalSubmit = () => {
    if (allAgreementsChecked && allDocumentsSigned) {
      router.push("/payment-confirmation")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            {step === "payment"
              ? isRTL
                ? "השלמת תשלום"
                : "Payment Completion"
              : isRTL
                ? "חתימה על מסמכים"
                : "Document Signing"}
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                paymentComplete ? "bg-green-500 text-white" : "bg-blue-600 text-white"
              }`}
            >
              {paymentComplete ? <CheckCircle2 className="w-5 h-5" /> : "1"}
            </div>
            <span className="text-sm font-medium text-slate-700">{isRTL ? "תשלום" : "Payment"}</span>
          </div>

          <div className="w-16 h-1 bg-slate-300">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: step === "signature" ? "100%" : "0%" }}
              transition={{ duration: 0.5 }}
              className="h-full bg-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "signature" ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-600"
              }`}
            >
              2
            </div>
            <span className="text-sm font-medium text-slate-700">{isRTL ? "חתימה" : "Signature"}</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {step === "payment" ? (
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
          >
            <Card className="p-8 bg-white shadow-xl border-slate-200">
              {/* Service Summary - Dynamic Bundle Receipt */}
              <div className="mb-8 pb-8 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">{isRTL ? "סיכום הזמנה" : "Order Summary"}</h2>
                <div className="space-y-4">
                  {/* Base Item - Always visible */}
                  <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {isRTL
                            ? "פתיחת תיק - נכות כללית (מסלול מנהלי)"
                            : "Opening a File - General Health (Administrative Path)"}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {isRTL
                            ? "כולל ייצוג משפטי וליווי עד לקבלת הפיצוי"
                            : "Includes legal representation and guidance until compensation is received"}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 text-lg">₪{basePrice}</span>
                  </div>

                  {/* Mobility Add-on - Conditional */}
                  {selectedBundles.mobility && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-start justify-between p-4 bg-purple-50 rounded-lg border border-purple-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Car className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {isRTL ? "תוספת: עריכת תביעת ניידות" : "Addon: Mobility Claim Editing"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              {isRTL ? "מחיר באנدل מיוחד" : "Special Bundle Price"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-purple-700 text-lg">₪{mobilityPrice}</span>
                    </motion.div>
                  )}

                  {/* Special Services Add-on - Conditional */}
                  {selectedBundles.specialServices && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-start justify-between p-4 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {isRTL ? "תוספת: עריכת תביעת שירותים מיוחדים" : "Addon: Special Services Claim Editing"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              {isRTL ? "מחיר באנدل מיוחד" : "Special Bundle Price"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-orange-700 text-lg">₪{specialServicesPrice}</span>
                    </motion.div>
                  )}

                  {/* Total Calculation Row */}
                  <div className="mt-6 pt-6 border-t-2 border-slate-300">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-slate-900">{isRTL ? "סהכ לתשלום" : "Total to Pay:"}</span>
                      <span className="text-3xl text-blue-600">₪{totalPrice}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="cardNumber" className="text-right block mb-2">
                    {isRTL ? "מספר כרטיס אשראי" : "Credit Card Number"}
                  </Label>
                  <div className="relative">
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" className="text-right pr-12" />
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry" className="text-right block mb-2">
                      {isRTL ? "תוקף" : "Expiry"}
                    </Label>
                    <Input id="expiry" placeholder="MM/YY" className="text-center" />
                  </div>
                  <div>
                    <Label htmlFor="cvv" className="text-right block mb-2">
                      {isRTL ? "CVV" : "CVV"}
                    </Label>
                    <Input id="cvv" placeholder="123" className="text-center" maxLength={3} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="idNumber" className="text-right block mb-2">
                    {isRTL ? "מספר תעודת זהות" : "ID Number"}
                  </Label>
                  <Input id="idNumber" placeholder="123456789" className="text-right" />
                </div>

                <div>
                  <Label htmlFor="email" className="text-right block mb-2">
                    {isRTL ? "כתובת אימייל" : "Email Address"}
                  </Label>
                  <Input id="email" type="email" placeholder="example@email.com" className="text-right" />
                </div>

                {/* Security Notice */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold mb-1">{isRTL ? "תשלום מאובטח" : "Secure Payment"}</p>
                      <p className="text-slate-600">
                        {isRTL
                          ? "הפרטים שלך מוצפנים ומוגנים בתקן אבטחה בנקאי PCI-DSS"
                          : "Your details are encrypted and protected by the PCI-DSS banking security standard"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mandatory Legal Disclaimers - Right above Pay button */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-2">{isRTL ? "לידיעתך:" : "Disclaimer:"}</p>
                      <p className="leading-relaxed">
                        {isRTL
                          ? "הפנייה למוסד לביטוח לאומי ולגופים המוסמכים יכולה להיעשות על ידך באופן עצמאי וללא תשלום. התשלום הינו עבור דמי טיפול ושימוש במערכת."
                          : "Referral to the National Insurance Institute and authorized bodies can be made by you independently without payment. The payment is for treatment fees and system usage."}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={paymentComplete}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold rounded-lg"
                >
                  {paymentComplete ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      {isRTL ? "התשלום אושר" : "Payment Confirmed"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      {isRTL ? "בצע תשלום מאובטח" : "Make Secure Payment"}
                    </span>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Success Message */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      {isRTL ? "התשלום בוצע בהצלחה" : "Payment Successfully Completed"}
                    </p>
                    <p className="text-sm text-green-700">
                      {isRTL ? "קוד אישור: #ZTC-2024-7891" : "Confirmation Code: #ZTC-2024-7891"}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Documents to Sign */}
            <Card className="p-8 bg-white shadow-xl border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">{isRTL ? "מסמכים לחתימה" : "Documents to Sign"}</h2>
              </div>

              <p className="text-slate-600 mb-6 leading-relaxed">
                {isRTL
                  ? "לפתיחת התיק והתחלת הליך התביעה, נדרשת חתימתך על המסמכים הבאים:"
                  : "To open the file and begin the claims process, your signature is required on the following documents:"}
              </p>

              <div className="space-y-6">
                {/* Power of Attorney */}
                <div className="border border-slate-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <Checkbox
                      id="powerOfAttorney"
                      checked={agreements.powerOfAttorney}
                      onCheckedChange={(checked) =>
                        setAgreements((prev) => ({
                          ...prev,
                          powerOfAttorney: checked as boolean,
                        }))
                      }
                      className="mt-1"
                    />
                    <label htmlFor="powerOfAttorney" className="flex-1 cursor-pointer">
                      <p className="font-semibold text-slate-900 mb-1">
                        {isRTL ? "ייפוי כוח לייצוג משפטי" : "Power of Attorney for Legal Representation"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {isRTL
                          ? "מתן הרשאה למערכת ZeroTouch Claims לייצג אותך מול המוסד לביטוח לאומי ולבצע את כל הפעולות המשפטיות הנדרשות בשמך"
                          : "Grant permission to the ZeroTouch Claims system to represent you before the National Insurance Institute and perform all necessary legal actions on your behalf."}
                      </p>
                    </label>
                  </div>
                  {agreements.powerOfAttorney && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <SignaturePad
                        onSave={(signature) => setSignatures((prev) => ({ ...prev, powerOfAttorney: signature }))}
                        onClear={() => setSignatures((prev) => ({ ...prev, powerOfAttorney: "" }))}
                      />
                      {signatures.powerOfAttorney && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isRTL ? "המסמך נחתם" : "Document Signed"}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Medical Records */}
                <div className="border border-slate-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <Checkbox
                      id="medicalRecords"
                      checked={agreements.medicalRecords}
                      onCheckedChange={(checked) =>
                        setAgreements((prev) => ({
                          ...prev,
                          medicalRecords: checked as boolean,
                        }))
                      }
                      className="mt-1"
                    />
                    <label htmlFor="medicalRecords" className="flex-1 cursor-pointer">
                      <p className="font-semibold text-slate-900 mb-1">
                        {isRTL ? "אישור גישה לתיק רפואי" : "Authorization for Access to Medical Records"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {isRTL
                          ? "הסכמה לקבלת מידע רפואי ממסמכיך הרפואיים לצורך הגשת התביעה והוכחת הזכאות"
                          : "Consent to receive medical information from your medical records for the purpose of filing the claim and proving your eligibility."}
                      </p>
                    </label>
                  </div>
                  {agreements.medicalRecords && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <SignaturePad
                        onSave={(signature) => setSignatures((prev) => ({ ...prev, medicalRecords: signature }))}
                        onClear={() => setSignatures((prev) => ({ ...prev, medicalRecords: "" }))}
                      />
                      {signatures.medicalRecords && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isRTL ? "המסמך נחתם" : "Document Signed"}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Terms & Conditions */}
                <div className="border border-slate-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <Checkbox
                      id="terms"
                      checked={agreements.terms}
                      onCheckedChange={(checked) => setAgreements((prev) => ({ ...prev, terms: checked as boolean }))}
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="flex-1 cursor-pointer">
                      <p className="font-semibold text-slate-900 mb-1">
                        {isRTL ? "תנאי שימוש ומדיניות" : "Terms of Use and Policy"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {isRTL
                          ? "אישור קריאה והסכמה לתנאי השימוש, מדיניות הפרטיות ותנאי התשלום של ZeroTouch Claims"
                          : "Confirmation of reading and agreement to the terms of use, privacy policy, and payment terms of ZeroTouch Claims."}
                      </p>
                    </label>
                  </div>
                  {agreements.terms && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <SignaturePad
                        onSave={(signature) => setSignatures((prev) => ({ ...prev, terms: signature }))}
                        onClear={() => setSignatures((prev) => ({ ...prev, terms: "" }))}
                      />
                      {signatures.terms && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isRTL ? "המסמך נחתם" : "Document Signed"}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Confidentiality Waiver */}
                <div className="border-2 border-green-200 bg-green-50 rounded-lg p-5 hover:border-green-300 transition-colors">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-bold text-green-800 bg-green-100 px-3 py-1 rounded-full">
                      {isRTL ? "מסלול ירוק - טיפול מהיר" : "Green Path - Fast Treatment"}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 mb-4">
                    <Checkbox
                      id="confidentialityWaiver"
                      checked={agreements.confidentialityWaiver}
                      onCheckedChange={(checked) =>
                        setAgreements((prev) => ({
                          ...prev,
                          confidentialityWaiver: checked as boolean,
                        }))
                      }
                      className="mt-1"
                    />
                    <label htmlFor="confidentialityWaiver" className="flex-1 cursor-pointer">
                      <p className="font-semibold text-slate-900 mb-2">
                        {isRTL ? "ויתור סודיות רפואית" : "Confidentiality Waiver for Medical Records"}
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {isRTL
                          ? "בחתימתי מטה אני מאשר/ת למוסד לביטוח לאומי לפנות למוסדות רפואיים (בתי חולים, קופות חולים, רופאים מטפלים) לקבלת מידע רפואי הדרוש לבדיקת תביעתי."
                          : "By signing below, I authorize the National Insurance Institute to contact medical institutions (hospitals, health funds, treating physicians) to obtain the necessary medical information for the review of my claim."}
                      </p>
                      <div className="mt-2 text-xs text-green-800 bg-green-100 rounded p-2">
                        <p className="font-semibold mb-1">{isRTL ? "למה זה חשוב?" : "Why is this important?"}</p>
                        <p>
                          {isRTL
                            ? 'ויתור זה מאפשר עיבוד מהיר של התיק ב"מסלול ירוק" ללא עיכובים בירוקרטיים.'
                            : 'This waiver allows for the rapid processing of your file in the "green path" without administrative delays.'}
                        </p>
                      </div>
                    </label>
                  </div>
                  {agreements.confidentialityWaiver && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <SignaturePad
                        onSave={(signature) =>
                          setSignatures((prev) => ({
                            ...prev,
                            confidentialityWaiver: signature,
                          }))
                        }
                        onClear={() =>
                          setSignatures((prev) => ({
                            ...prev,
                            confidentialityWaiver: "",
                          }))
                        }
                      />
                      {signatures.confidentialityWaiver && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isRTL
                              ? "המסמך נחתם - התיק יועבר למסלול ירוק"
                              : "Document Signed - File Will Be Processed in Green Path"}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Legal Notice */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">{isRTL ? "הערה משפטית" : "Legal Notice"}</p>
                    <p className="text-blue-800">
                      {isRTL
                        ? "חתימתך על המסמכים שקולה לחתימה פיזית ומהווה הסכמה משפטית מחייבת. המסמכים יישמרו בצורה מוצפנת ומאובטחת."
                        : "Your signature on the documents is equivalent to a physical signature and constitutes a legally binding agreement. The documents will be stored in an encrypted and secure manner."}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleFinalSubmit}
                disabled={!allAgreementsChecked || !allDocumentsSigned}
                className="w-full mt-8 bg-gradient-to-l from-slate-900 via-blue-900 to-slate-900 hover:from-slate-800 hover:via-blue-800 hover:to-slate-800 text-white py-6 text-lg font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!allDocumentsSigned && allAgreementsChecked
                  ? isRTL
                    ? "יש לחתום על כל המסמכים"
                    : "Sign All Documents"
                  : isRTL
                    ? "חתום והמשך"
                    : "Sign and Continue"}
              </Button>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Footer Security Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-12"
      >
        <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-md">
          <span className="text-sm font-medium text-slate-600">
            {isRTL ? "מאובטח ברמת בנק" : "Secure at Banking Level"}
          </span>
          <ShieldCheck className="w-5 h-5 text-green-600" />
        </div>
      </motion.div>
    </div>
  )
}
