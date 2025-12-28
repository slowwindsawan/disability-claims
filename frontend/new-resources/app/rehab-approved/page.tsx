"use client"

import { motion } from "framer-motion"
import { CheckCircle, Sparkles, FileCheck, Calendar, TrendingUp, ChevronLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function RehabApprovedPage() {
  const router = useRouter()

  const benefits = [
    {
      icon: FileCheck,
      title: "מימון שכר לימוד",
      description: "מימון מלא או חלקי בהתאם למוסד הלימוד והתכנית",
    },
    {
      icon: TrendingUp,
      title: "דמי מחיה חודשיים",
      description: "תמיכה כלכלית חודשית לכיסוי הוצאות מחיה",
    },
    {
      icon: Calendar,
      title: "החזר הוצאות נסיעות",
      description: "החזר הוצאות נסיעה למקום הלימודים",
    },
  ]

  const steps = [
    {
      number: 1,
      title: "חתימה על נהלים",
      description: "חתום על התחייבות לעמידה בנהלי השיקום",
    },
    {
      number: 2,
      title: "דיווח נוכחות",
      description: "דווח נוכחות חודשית במקום הלימודים",
    },
    {
      number: 3,
      title: "העלאת מסמכים",
      description: "העלה קבלות ואישורים למקסום זכויות",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">מזל טוב!</h1>
              <p className="text-slate-600 mt-1">אושר דמי השיקום המקצועי</p>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Success Message */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="p-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-3">ביטוח לאומי אישר את בקשתך לשיקום מקצועי</h2>
                <p className="text-green-50 text-lg leading-relaxed">
                  עכשיו תוכל להתחיל לקבל תשלומים ותמיכה במסגרת תכנית השיקום. ברכותינו על ההצלחה!
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Benefits Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">במסגרת השיקום תוכל להיות זכאי ל:</h3>
            <p className="text-sm text-slate-600 mb-6">הזכויות הספציפיות ייקבעו בהתאם למצבך האישי ולתכנית השיקום</p>

            <div className="space-y-4">
              {benefits.map((benefit, idx) => {
                const Icon = benefit.icon
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{benefit.title}</h4>
                      <p className="text-sm text-slate-600">{benefit.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Disclaimer */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>שים לב:</strong> הסכומים המדויקים ייקבעו על ידי ביטוח לאומי לפי סוג הלימודים, מוסד הלימוד, ומצבך
                האישי. אין מדובר בהתחייבות לסכומים קונקרטיים.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">השלבים הבאים להתחלת קבלת תשלומים:</h3>

            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 mb-1">{step.title}</h4>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* CTA Button */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <Button
            onClick={() => router.push("/rehab-agreement")}
            className="w-full h-16 text-lg font-bold bg-gradient-to-l from-blue-600 to-slate-900 hover:from-blue-700 hover:to-slate-950 shadow-lg"
          >
            המשך לחתימה על נהלים
            <ChevronLeft className="w-5 h-5 mr-2" />
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
