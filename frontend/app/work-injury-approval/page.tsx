"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Shield, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"

export default function WorkInjuryApprovalPage() {
  const router = useRouter()
  const [consentChecked, setConsentChecked] = useState(false)
  const [consent2Checked, setConsent2Checked] = useState(false)
  const [consent3Checked, setConsent3Checked] = useState(false)

  const estimatedValue = "67,500" // Dynamic value from calculator
  const caseNumber = "8821"

  const handleApprove = () => {
    router.push("/work-injury-success")
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>חזרה</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <span className="text-xl font-bold text-slate-900">ZeroTouch</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Status Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">תיק תאונת עבודה #{caseNumber}</h2>
                <p className="mt-1 text-sm text-slate-600">נוצר היום</p>
              </div>
              <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                ממתין לאישור לקוח
              </div>
            </div>
          </div>
        </motion.div>

        {/* Package Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="text-xl font-bold text-slate-900">החבילה שהכנו עבורך</h3>
            </div>

            {/* Calculated Value */}
            <div className="mb-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center">
              <p className="mb-2 text-sm font-medium text-slate-600">שווי מוערך</p>
              <p className="text-5xl font-bold text-blue-600">₪{estimatedValue}</p>
              <p className="mt-2 text-sm text-slate-500">פיצוי פוטנציאלי מהמוסד לביטוח לאומי</p>
            </div>

            {/* Documents Status */}
            <div className="space-y-3">
              <h4 className="mb-4 font-semibold text-slate-900">סטטוס מסמכים:</h4>

              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">רפואי: התקבל</p>
                  <p className="text-sm text-slate-600">סיכום רפואי ומסמכים נוספים</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-slate-500" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">שכר: חסר - יושלם טלפונית</p>
                  <p className="text-sm text-slate-600">תלושי שכר יוזנו במהלך שיחת המומחה</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transfer Block */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-sm">
            {/* Visual Transfer Arrow */}
            <div className="mb-8 flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
                  <span className="text-2xl font-bold text-white">Z</span>
                </div>
                <p className="text-sm font-medium text-slate-700">ZeroTouch Cloud</p>
              </div>

              <ArrowRight className="h-8 w-8 animate-pulse text-blue-600" />

              <div className="text-center">
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <p className="text-sm font-medium text-slate-700">עורך דין מומחה</p>
              </div>
            </div>

            {/* Legal Consent Checkbox */}
            <div className="rounded-xl border-2 border-slate-200 bg-white p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    id="consent1"
                    checked={consentChecked}
                    onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="consent1" className="flex-1 cursor-pointer text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">הסכמה למדיניות פרטיות והעברת מידע:</span> אני מאשר/ת
                    כי קראתי את מדיניות הפרטיות ומסכים/ה להעברת המידע שמסרתי לגורמים המקצועיים העוסקים בטיפול בתיק,
                    לרבות עורכי דין, יועצים רפואיים או חברות ביטוח הרלוונטיות לתביעה.
                  </label>
                </div>

                <div className="flex items-start gap-4">
                  <Checkbox
                    id="consent2"
                    checked={consent2Checked}
                    onCheckedChange={(checked) => setConsent2Checked(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="consent2" className="flex-1 cursor-pointer text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">הסכמה לקבלת פנייה שיווקית (חוק הספאם):</span> אני
                    מאשר/ת לקבל פניות שיווקיות, עדכונים ומידע בנוגע לשירותים נוספים או הצעות שונות שעשויות להיות
                    רלוונטיות עבורי (ניתן לבטל בכל עת).
                  </label>
                </div>

                <div className="flex items-start gap-4">
                  <Checkbox
                    id="consent3"
                    checked={consent3Checked}
                    onCheckedChange={(checked) => setConsent3Checked(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="consent3" className="flex-1 cursor-pointer text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">הבהרה - אין יחסי עורך דין-לקוח:</span> ידוע לי
                    שהשירות הטכנולוגי של ZeroTouch הינו כלי עזר טכנולוגי בלבד ואינו מהווה ייעוץ משפטי. לא נוצרים יחסי
                    עורך דין-לקוח בין ZeroTouch לביני. במידה והתיק יועבר לעורך דין חיצוני, יחסים כאלה ייווצרו ישירות מול
                    המשרד המקצועי המטפל.
                  </label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Primary Action Button */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={handleApprove}
            size="lg"
            disabled={!consentChecked || !consent2Checked || !consent3Checked}
            className="group relative h-16 w-full overflow-hidden text-lg font-bold shadow-xl transition-all hover:shadow-2xl disabled:opacity-50"
          >
            {/* Pulsing background effect */}
            <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 opacity-0 group-hover:opacity-20"></span>
            <span className="relative flex items-center justify-center gap-2">אשר העברה וקבל שיחת מומחה 👨‍⚖️</span>
          </Button>

          {(!consentChecked || !consent2Checked || !consent3Checked) && (
            <p className="mt-3 text-center text-sm text-slate-500">נא לאשר את כל התנאים כדי להמשיך</p>
          )}
        </motion.div>

        {/* Trust Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
            <Shield className="h-4 w-4" />
            <span>כל הנתונים מוצפנים ומאובטחים לפי תקני ISO 27001</span>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
