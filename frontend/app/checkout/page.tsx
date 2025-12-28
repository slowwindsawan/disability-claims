"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BACKEND_BASE_URL } from '@/variables'
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
import { DocumentSigningIframe } from "@/components/document-signing-iframe"
import { useLanguage } from "@/lib/language-context"
import { useSearchParams } from "next/navigation"

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const isRTL = language === "he"
  
  const caseId = searchParams.get('case_id')
  const [caseData, setCaseData] = useState<any>(null)
  const [loadingCase, setLoadingCase] = useState(true)
  
  // Redirect to dashboard if no case_id provided
  useEffect(() => {
    if (!caseId) {
      router.push('/dashboard')
      return
    }
    
    // Fetch case data
    const fetchCase = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const apiBase = BACKEND_BASE_URL
        const response = await fetch(`${apiBase}/cases/${caseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setCaseData(data)
        } else {
          console.error('Failed to fetch case')
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error fetching case:', error)
        router.push('/dashboard')
      } finally {
        setLoadingCase(false)
      }
    }
    
    fetchCase()
  }, [caseId, router])
  
  const [step, setStep] = useState<"payment" | "signature">("payment")
  const [paymentComplete, setPaymentComplete] = useState(false)

  const [selectedBundles, setSelectedBundles] = useState({
    mobility: true, // Set from session/URL params in real app
    specialServices: false, // Set from session/URL params in real app
  })

  const [agreements, setAgreements] = useState({
    powerOfAttorney: false,
    medicalRecords: false,
    terms: false,
    confidentialityWaiver: false,
  })
  const [signedDocuments, setSignedDocuments] = useState({
    powerOfAttorney: false,
    medicalRecords: false,
    terms: false,
    confidentialityWaiver: false,
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
    agreements.powerOfAttorney

  const anyDocumentSigned =
    signedDocuments.powerOfAttorney

  const handleFinalSubmit = () => {
    if (anyDocumentSigned) {
      router.push("/payment-confirmation")
    }
  }

  if (loadingCase) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{isRTL ? "טוען..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4" dir={isRTL ? "rtl" : "ltr"}>
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
            key="payment-step"
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
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" className="text-right pr-12" dir="ltr" />
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
                  <Input id="email" type="email" placeholder="example@email.com" className="text-right" dir="ltr" />
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
                  asChild
                >
                  <button className="flex items-center justify-center gap-2 w-full">
                    {paymentComplete ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{isRTL ? "התשלום אושר" : "Payment Confirmed"}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        <span>{isRTL ? "בצע תשלום מאובטח" : "Make Secure Payment"}</span>
                      </>
                    )}
                  </button>
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="signature-step"
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
                      {isRTL
                        ? `קוד אישור: ${caseId}`
                        : `Confirmation Code: ${caseId}`}
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
                {/* Power of Attorney - Only Document to Sign */}
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
                      <DocumentSigningIframe
                        documentType="powerOfAttorney"
                        disabled={!agreements.powerOfAttorney}
                        caseId={caseId || undefined}
                        onSigningComplete={(docId) =>
                          setSignedDocuments((prev) => ({
                            ...prev,
                            powerOfAttorney: true,
                          }))
                        }
                      />
                      {signedDocuments.powerOfAttorney && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isRTL ? "המסמך נחתם" : "Document Signed"}</span>
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
                disabled={!anyDocumentSigned}
                className="w-full mt-8 bg-gradient-to-l from-slate-900 via-blue-900 to-slate-900 hover:from-slate-800 hover:via-blue-800 hover:to-slate-800 text-white py-6 text-lg font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!anyDocumentSigned
                  ? isRTL
                    ? "יש לחתום על לפחות מסמך אחד"
                    : "Sign at least one document"
                  : isRTL
                    ? "המשך"
                    : "Continue"}
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

import { Suspense } from 'react'

export default function Checkout() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
