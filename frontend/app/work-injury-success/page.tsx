"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Home, MessageCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function WorkInjurySuccessPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => setProgress(33), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleWhatsAppConfirmation = () => {
    const message = encodeURIComponent("היי, אשמח לקבל אישור על העברת התיק 👍")
    window.open(`https://wa.me/972501234567?text=${message}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-lg font-bold text-white">Z</span>
            </div>
            <span className="text-xl font-bold text-slate-900">ZeroTouch</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Hero Animation with Green Checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
          className="mb-8 text-center"
        >
          <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
            {/* Animated rings */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.4, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="absolute inset-0 rounded-full bg-green-500"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: [0, 0.6, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
              className="absolute inset-0 rounded-full bg-green-500"
            />

            {/* Main circle */}
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-xl">
              <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-3 text-4xl font-bold text-slate-900"
          >
            התיק הועבר בהצלחה!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-slate-600"
          >
            המסמכים והפרטים שלך הועברו לעורך דין מומחה לבדיקה
          </motion.p>
        </motion.div>

        {/* Timeline - What happens now? */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-8 text-center text-xl font-bold text-slate-900">מה קורה עכשיו?</h2>

            <div className="relative space-y-8">
              {/* Progress Line */}
              <div className="absolute right-6 top-6 h-[calc(100%-3rem)] w-0.5 bg-slate-200">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${progress}%` }}
                  transition={{ duration: 1, delay: 1 }}
                  className="w-full bg-blue-600"
                />
              </div>

              {/* Step 1 - Completed */}
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="mb-1 font-semibold text-slate-900">הקליטה במערכת</h3>
                  <p className="text-sm text-slate-600">התיק נקלט בהצלחה במערכת ZeroTouch ✓</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    בוצע
                  </div>
                </div>
              </div>

              {/* Step 2 - In Progress */}
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Clock className="h-6 w-6" />
                  </motion.div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="mb-1 font-semibold text-slate-900">בדיקת עורך דין</h3>
                  <p className="text-sm text-slate-600">עורך דין מומחה בוחן את התיק ומעריך את הסיכויים</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                    >
                      מתבצע כעת...
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* Step 3 - Upcoming */}
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-400">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="mb-1 font-semibold text-slate-900">שיחת היכרות ותחשיב סופי</h3>
                  <p className="text-sm text-slate-600">שיחה טלפונית קצרה לאישור הפרטים ולמתן תחשיב מדויק</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    ב-24 שעות הקרובות
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="space-y-4"
        >
          <Button
            onClick={() => router.push("/")}
            size="lg"
            className="h-14 w-full text-lg font-semibold shadow-lg hover:shadow-xl"
          >
            <Home className="ml-2 h-5 w-5" />
            חזרה לדף הבית
          </Button>

          <button
            onClick={handleWhatsAppConfirmation}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-6 py-3 text-base font-medium text-green-700 transition-all hover:bg-green-100"
          >
            <MessageCircle className="h-5 w-5" />
            שלח לי אישור לוואטסאפ
          </button>
        </motion.div>

        {/* Support Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 text-center text-sm text-slate-500"
        >
          <p>יש לך שאלה? צוות התמיכה שלנו זמין בכל עת</p>
        </motion.div>
      </main>
    </div>
  )
}
