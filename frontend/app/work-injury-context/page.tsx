"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calculator, TrendingUp, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function WorkInjuryContextPage() {
  const router = useRouter()
  const [selectedClaim, setSelectedClaim] = useState<"work" | "general">("work")

  const comparisonData = {
    work: {
      title: "תביעת תאונת עבודה",
      monthlyPayment: "₪5,800",
      retroactive: "₪68,500",
      totalFirst3Years: "₪277,300",
      benefits: [
        "פיצוי חד פעמי גבוה יותר",
        "קצבה חודשית מוגדלת",
        "כיסוי מלא לטיפולים רפואיים",
        "שיקום תעסוקתי מלא",
        "פיצוי נוסף מהמעסיק",
      ],
      color: "emerald",
    },
    general: {
      title: "תביעת נכות כללית",
      monthlyPayment: "₪4,200",
      retroactive: "₪42,500",
      totalFirst3Years: "₪193,700",
      benefits: [
        "פיצוי רטרואקטיבי סטנדרטי",
        "קצבה חודשית בסיסית",
        "כיסוי חלקי לטיפולים",
        "שיקום מוגבל",
        "אין פיצוי נוסף",
      ],
      color: "blue",
    },
  }

  const difference = 277300 - 193700

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">מחשבון השוואת תביעות</h1>
                <p className="text-sm text-slate-600">הבנת ההבדל בין סוגי התביעות</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Alert Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border-2 border-orange-200 bg-orange-50 p-6"
        >
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-orange-600" />
            <div>
              <h3 className="mb-2 text-lg font-semibold text-orange-900">זיהינו שהמצב הרפואי קשור לעבודה</h3>
              <p className="text-orange-800">
                על פי המידע שמסרת, נראה שהמצב הרפואי נגרם כתוצאה מאירוע או חשיפה בעבודה. במקרה כזה, יש לך זכאות לתביעת
                תאונת עבודה שמעניקה פיצוי גבוה משמעותית.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Comparison Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex justify-center"
        >
          <div className="inline-flex rounded-xl bg-white p-1 shadow-md">
            <button
              onClick={() => setSelectedClaim("work")}
              className={`rounded-lg px-8 py-3 text-sm font-medium transition-all ${
                selectedClaim === "work" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              תביעת תאונת עבודה
            </button>
            <button
              onClick={() => setSelectedClaim("general")}
              className={`rounded-lg px-8 py-3 text-sm font-medium transition-all ${
                selectedClaim === "general" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              תביעת נכות כללית
            </button>
          </div>
        </motion.div>

        {/* Main Comparison Cards */}
        <div className="mb-8 grid gap-8 md:grid-cols-2">
          {/* Work Injury Card */}
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card
              className={`border-2 transition-all ${
                selectedClaim === "work"
                  ? "border-emerald-500 shadow-2xl shadow-emerald-500/20"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <CardHeader className="bg-gradient-to-br from-emerald-50 to-emerald-100">
                <div className="mb-2 flex items-center justify-between">
                  <CardTitle className="text-2xl text-emerald-900">{comparisonData.work.title}</CardTitle>
                  {selectedClaim === "work" && <CheckCircle className="h-6 w-6 text-emerald-600" />}
                </div>
                <CardDescription className="text-emerald-700">הפיצוי המקסימלי שמגיע לך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Monthly Payment */}
                <div>
                  <p className="mb-1 text-sm text-slate-600">קצבה חודשית</p>
                  <p className="text-3xl font-bold text-emerald-600">{comparisonData.work.monthlyPayment}</p>
                </div>

                {/* Retroactive */}
                <div>
                  <p className="mb-1 text-sm text-slate-600">פיצוי רטרואקטיבי</p>
                  <p className="text-2xl font-bold text-slate-900">{comparisonData.work.retroactive}</p>
                </div>

                {/* Total 3 Years */}
                <div className="rounded-lg bg-emerald-50 p-4">
                  <p className="mb-1 text-sm text-emerald-700">סך הכל 3 שנים ראשונות</p>
                  <p className="text-3xl font-bold text-emerald-900">{comparisonData.work.totalFirst3Years}</p>
                </div>

                {/* Benefits List */}
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  {comparisonData.work.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                      <p className="text-sm text-slate-700">{benefit}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* General Disability Card */}
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card
              className={`border-2 transition-all ${
                selectedClaim === "general"
                  ? "border-blue-500 shadow-2xl shadow-blue-500/20"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="mb-2 flex items-center justify-between">
                  <CardTitle className="text-2xl text-blue-900">{comparisonData.general.title}</CardTitle>
                  {selectedClaim === "general" && <CheckCircle className="h-6 w-6 text-blue-600" />}
                </div>
                <CardDescription className="text-blue-700">פיצוי סטנדרטי</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Monthly Payment */}
                <div>
                  <p className="mb-1 text-sm text-slate-600">קצבה חודשית</p>
                  <p className="text-3xl font-bold text-blue-600">{comparisonData.general.monthlyPayment}</p>
                </div>

                {/* Retroactive */}
                <div>
                  <p className="mb-1 text-sm text-slate-600">פיצוי רטרואקטיבי</p>
                  <p className="text-2xl font-bold text-slate-900">{comparisonData.general.retroactive}</p>
                </div>

                {/* Total 3 Years */}
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="mb-1 text-sm text-blue-700">סך הכל 3 שנים ראשונות</p>
                  <p className="text-3xl font-bold text-blue-900">{comparisonData.general.totalFirst3Years}</p>
                </div>

                {/* Benefits List */}
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  {comparisonData.general.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-slate-300" />
                      <p className="text-sm text-slate-700">{benefit}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Difference Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-center text-white shadow-2xl"
        >
          <TrendingUp className="mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-2xl font-bold">ההבדל בסך הכל</h3>
          <p className="mb-4 text-5xl font-bold">₪{difference.toLocaleString()}</p>
          <p className="text-lg text-emerald-100">יותר ב-3 השנים הראשונות עם תביעת תאונת עבודה</p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Button
            size="lg"
            onClick={() => router.push("/value-reveal")}
            className="flex-1 gap-2 bg-emerald-600 py-6 text-lg hover:bg-emerald-700"
          >
            המשך עם תביעת תאונת עבודה
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/value-reveal")}
            className="gap-2 border-2 py-6 text-lg"
          >
            <ArrowRight className="h-5 w-5" />
            חזור לשיחה
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
