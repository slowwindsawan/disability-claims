"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, Bell, Mail, Phone, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

export default function IncompleteIntakePage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("050-1234567")
  const [subscribed, setSubscribed] = useState(false)

  const handleContinueLater = () => {
    router.push("/dashboard")
  }

  const handleSubscribe = () => {
    setSubscribed(true)
    setTimeout(() => {
      router.push("/")
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Clock className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="mb-4 text-3xl font-bold text-slate-900">התהליך שלך נשמר</h1>
          <p className="mb-8 text-lg text-slate-600">אין צורך לדאגה. כל הפרטים שמסרת נשמרו במערכת באופן מאובטח.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-semibold text-slate-900">המידע שנשמר:</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-slate-700">מספר טלפון: {phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-slate-700">תשובות משאלון ההתחלה</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-slate-700">מסמכים שהועלו (אם יש)</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 rounded-xl bg-blue-50 p-8 border border-blue-100"
        >
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="mb-2 text-xl font-semibold text-slate-900">קבל עדכונים על זכויות חדשות</h2>
              <p className="text-slate-700">
                החוק משתנה, ותקנות חדשות נכנסות לתוקף. נעדכן אותך אם נזהה שאתה זכאי לזכויות נוספות או אם יש שינויים
                רלוונטיים למקרה שלך.
              </p>
            </div>
          </div>

          {!subscribed ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">כתובת אימייל (אופציונלי)</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-right"
                />
              </div>

              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-slate-900">הודעות אימייל</span>
                  <Badge variant="secondary" className="mr-auto">
                    מומלץ
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-slate-900">הודעות SMS</span>
                  <Badge variant="secondary" className="mr-auto">
                    מופעל
                  </Badge>
                </div>
              </div>

              <Button onClick={handleSubscribe} className="w-full" size="lg">
                <Bell className="ml-2 h-5 w-5" />
                הירשם לעדכונים
              </Button>

              <p className="text-center text-xs text-slate-500">ניתן להסיר את ההרשמה בכל עת. לא נשלח ספאם.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-green-50 border border-green-200 p-6 text-center"
            >
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
              <h3 className="mb-2 text-lg font-semibold text-green-900">נרשמת בהצלחה!</h3>
              <p className="text-green-700">נעדכן אותך אם יהיו זכויות חדשות או שינויים רלוונטיים</p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <Button onClick={handleContinueLater} variant="outline" className="w-full bg-transparent" size="lg">
            המשך לדשבורד
            <ArrowRight className="mr-2 h-5 w-5" />
          </Button>

          <p className="text-center text-sm text-slate-500">
            תוכל לחזור ולהשלים את התהליך בכל עת דרך הדשבורד האישי שלך
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 rounded-lg bg-slate-100 p-6 text-center"
        >
          <p className="text-sm text-slate-600">
            המידע שלך מאובטח ומוצפן. אנחנו שומרים על הפרטיות שלך בהתאם לתקנות הגנת הפרטיות.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
