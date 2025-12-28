"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import {
  Clock,
  FileText,
  Scale,
  Shield,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  Calendar,
  MapPin,
  Video,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { useUserContext } from "@/lib/user-context"

export default function WaitingForResponsePage() {
  const { t } = useLanguage()
  const { intakeData } = useUserContext()

  const [committeeScheduled, setCommitteeScheduled] = useState(false)
  const [committeeInfo, setCommitteeInfo] = useState<{
    date: string
    time: string
    location: "zoom" | "physical"
    address?: string
    zoomLink?: string
  } | null>(null)

  useEffect(() => {
    // Simulate receiving committee date after 5 seconds (in production, this would come from backend)
    const timer = setTimeout(() => {
      setCommitteeScheduled(true)
      setCommitteeInfo({
        date: "2025-02-15",
        time: "10:00",
        location: "physical",
        address: "משרדי הביטוח הלאומי, שד' ירושלים 97, תל אביב",
      })
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const formattedCommitteeDate = committeeInfo?.date
    ? new Date(committeeInfo.date).toLocaleDateString("he-IL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">ZeroTouch Claims</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center"
          >
            <Clock className="w-12 h-12 text-white" />
          </motion.div>

          <h1 className="text-4xl font-bold text-slate-900 mb-4">התביעה הוגשה בהצלחה!</h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {committeeScheduled
              ? "נקבע תאריך לוועדה רפואית - ראה פרטים למטה."
              : "התיק שלך נמצא בבדיקה. צפי לקביעת תאריך וועדה תוך 3-6 שבועות."}
          </p>
        </motion.div>

        {committeeScheduled && committeeInfo && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-l from-purple-600 to-purple-700 text-white shadow-2xl border-purple-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-purple-400/10 animate-pulse" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    נקבע תאריך לוועדה רפואית!
                  </h3>
                  <div className="space-y-2 text-purple-100 text-lg mb-4">
                    <p className="leading-relaxed">
                      הוועדה הרפואית תתקיים ב<strong className="text-white mx-1">{formattedCommitteeDate}</strong>
                      בשעה <strong className="text-white">{committeeInfo.time}</strong>
                    </p>
                    {committeeInfo.location === "physical" && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-purple-200 flex-shrink-0 mt-1" />
                        <p className="text-purple-100">
                          <strong className="text-white">מיקום:</strong> {committeeInfo.address}
                        </p>
                      </div>
                    )}
                    {committeeInfo.location === "zoom" && (
                      <div className="flex items-start gap-2">
                        <Video className="w-5 h-5 text-purple-200 flex-shrink-0 mt-1" />
                        <p className="text-purple-100">
                          <strong className="text-white">פגישת זום</strong> - הלינק יישלח אליך ביום הפגישה
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/committee-prep" className="flex-1">
                      <Button
                        size="lg"
                        className="w-full bg-white text-purple-700 hover:bg-purple-50 font-bold shadow-lg"
                      >
                        <Lightbulb className="w-5 h-5 ml-2" />
                        התחל הכנה לוועדה עכשיו
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 border-white text-white hover:bg-white/10 bg-transparent"
                      onClick={() => {
                        alert("הוסף ליומן - תכונה בפיתוח")
                      }}
                    >
                      <Calendar className="w-5 h-5 ml-2" />
                      הוסף ליומן
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Status Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="p-8 bg-white shadow-lg mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">מספר תיק: #ZTC-2024-7891</h2>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-slate-600">
                    סטטוס: {committeeScheduled ? "ממתין לוועדה רפואית" : "בבדיקה ראשונית - ממתין לקביעת תאריך"}
                  </span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-500 mb-1">תאריך הגשה</p>
                <p className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString("he-IL")}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-1">פיצוי צפוי</p>
                  <p className="text-2xl font-bold text-slate-900">₪42,500</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-1">זמן המתנה משוער</p>
                  <p className="text-2xl font-bold text-slate-900">{committeeScheduled ? "תאריך נקבע" : "21-42 יום"}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-1">מסמכים שהוגשו</p>
                  <p className="text-2xl font-bold text-slate-900">12</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {!committeeScheduled && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <Card className="p-8 bg-gradient-to-l from-slate-700 to-slate-800 text-white shadow-lg mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">ממתינים לקביעת תאריך וועדה רפואית</h3>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    הביטוח הלאומי בוחן את המסמכים שהגשת ויקבע תאריך לוועדה רפואית.
                  </p>
                  <p className="text-slate-300 leading-relaxed mb-6">
                    בדרך כלל לוקח 21-42 ימים עד לקביעת תאריך. נעדכן אותך מיד כשיהיה עדכון.
                  </p>
                  <p className="text-slate-400 text-sm">בינתיים, תוכל להתכונן מראש באמצעות הסימולטור שלנו</p>
                </div>
                <div className="hidden sm:block">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Clock className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="p-8 bg-white shadow-lg mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">שלבי הטיפול בתיק</h3>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-0.5 h-full bg-green-500 mt-2" />
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-slate-900 mb-1">איסוף מסמכים</h4>
                  <p className="text-slate-600 text-sm">כל המסמכים נאספו ועברו בדיקת תקינות</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-0.5 h-full bg-green-500 mt-2" />
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-slate-900 mb-1">הגשת תביעה</h4>
                  <p className="text-slate-600 text-sm">התביעה הוגשה רשמית למוסד לביטוח לאומי</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                  <div className="w-0.5 h-full bg-slate-300 mt-2" />
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-slate-900 mb-1">בדיקת התביעה</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">הביטוח הלאומי בוחן את המסמכים ומקבל החלטה</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-slate-500" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-600 mb-1">קבלת תשובה</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">נודיע לך מיד כשנקבל החלטה סופית</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* What Happens Next */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="p-8 bg-gradient-to-l from-slate-800 to-slate-900 text-white shadow-lg mb-8">
            <h3 className="text-2xl font-bold mb-6">מה קורה עכשיו?</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-bold mb-1">בדיקת מסמכים</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    המוסד לביטוח לאומי בוחן את המסמכים הרפואיים ומאמת את הפרטים
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-bold mb-1">וועדה רפואית</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    הוועדה הרפואית בוחנת את המצב הרפואי וקובעת את אחוזי הנכות
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-bold mb-1">החלטה סופית</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    תקבל החלטה סופית והודעה על הזכאות והפיצוי המאושר
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-semibold">
              חזרה לדשבורד
            </Button>
          </Link>
          <Link href="/claim-approved" className="flex-1">
            <Button variant="outline" className="w-full h-14 text-lg font-semibold bg-transparent">
              צפה בדוגמא: תביעה אושרה
            </Button>
          </Link>
        </div>

        {/* Security Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="text-sm">כל המידע מוצפן ומאובטח ברמת בנק</span>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
