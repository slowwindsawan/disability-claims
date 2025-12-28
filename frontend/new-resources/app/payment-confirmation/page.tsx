"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileText, Calendar, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"

export default function PaymentConfirmationPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/dashboard")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="max-w-2xl w-full"
      >
        <Card className="p-12 bg-white/90 backdrop-blur shadow-2xl border-emerald-200">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-slate-900 mb-3">התשלום בוצע בהצלחה!</h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              התיק שלך נפתח והמסמכים נחתמו. אנחנו מתחילים לעבוד על התביעה שלך עכשיו.
            </p>
          </motion.div>

          {/* Confirmation Details */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 mb-8"
          >
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">מספר תיק</p>
                  <p className="text-lg font-bold text-slate-900">#ZTC-2024-7891</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">סכום תשלום</p>
                  <p className="text-lg font-bold text-emerald-600">₪1,999</p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600 mb-1">תאריך פתיחה</p>
                <p className="text-base font-semibold text-slate-900">{new Date().toLocaleDateString("he-IL")}</p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                השלבים הבאים
              </h3>
              <div className="space-y-2 mr-7">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-slate-700">נשלח אליך אישור בדוא"ל תוך 5 דקות</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-slate-700">עורכת הדין AI תתחיל לעבוד על התיק שלך מיד</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-slate-700">תקבל עדכונים בזמן אמת בדשבורד האישי שלך</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Auto-redirect Notice */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <p className="text-sm text-slate-600 mb-4">
              מעביר אותך לדשבורד תוך <span className="font-bold text-blue-600">{countdown}</span> שניות...
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 text-base font-semibold rounded-lg"
            >
              <span>עבור לדשבורד</span>
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
          </motion.div>
        </Card>

        {/* Receipt Download */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2 mx-auto">
            <FileText className="w-4 h-4" />
            הורד קבלה
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
