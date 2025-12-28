"use client"

import { motion } from "framer-motion"
import { Clock, FileText, Scale, Shield, TrendingUp, CheckCircle2, Lightbulb, BookOpen } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import useCurrentCase from "@/lib/useCurrentCase"

export default function WaitingForResponsePage({callSummary}: {callSummary?: any}) {
  const { currentCase, formatCaseNumber, loadingCase } = useCurrentCase()

  if (loadingCase) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      {/* <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">ZeroTouch Claims</h1>
          </div>
        </div>
      </header> */}

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
            התיק שלך נמצא כעת בבדיקת המוסד לביטוח לאומי. נעדכן אותך מיד כשנקבל תגובה.
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="p-8 bg-white shadow-lg mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">מספר תיק: {currentCase?.id ? currentCase.id.slice(0, 8).toUpperCase() : 'N/A'}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-slate-600">סטטוס: בבדיקה</span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-500 mb-1">תאריך הגשה</p>
                <p className="text-lg font-bold text-slate-900">{currentCase?.created_at ? new Date(currentCase.created_at).toLocaleDateString("he-IL") : new Date().toLocaleDateString("he-IL")}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-1">פיצוי צפוי</p>
                  <p className="text-2xl font-bold text-slate-900">₪{callSummary?.estimated_claim_amount?.toLocaleString('he-IL') || '0'}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-1">זמן המתנה משוער</p>
                  <p className="text-2xl font-bold text-slate-900">30-45 יום</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-1">מסמכים שהוגשו</p>
                  <p className="text-2xl font-bold text-slate-900">{currentCase?.call_summary?.documents_requested_list?.length || '0'}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Committee Prep Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
          <Card className="p-8 bg-gradient-to-l from-blue-600 to-blue-700 text-white shadow-lg mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">הכן את עצמך לועדה רפואית</h3>
                <p className="text-blue-100 leading-relaxed mb-6">
                  קבל אסטרטגיה משפטית מותאמת אישית ותרגל את השיחה עם הועדה בסימולטור AI
                </p>
                <Link href="/committee-prep">
                  <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold">
                    <Lightbulb className="w-5 h-5 ml-2" />
                    התחל הכנה לועדה
                  </Button>
                </Link>
              </div>
              <div className="hidden sm:block">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Timeline */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="p-8 bg-white shadow-lg mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">שלבי הטיפול בתיק</h3>

            <div className="space-y-6">
              {/* Step 1 - Complete */}
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

              {/* Step 2 - Complete */}
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

              {/* Step 3 - In Progress */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                  <div className="w-0.5 h-full bg-slate-300 mt-2" />
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-slate-900 mb-1">בדיקת התביעה</h4>
                  <p className="text-slate-600 text-sm">הביטוח הלאומי בוחן את המסמכים ומקבל החלטה</p>
                </div>
              </div>

              {/* Step 4 - Pending */}
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
                  <h4 className="font-bold mb-1">ועדה רפואית</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    הועדה הרפואית בוחנת את המצב הרפואי וקובעת את אחוזי הנכות
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
        {/* <div className="flex flex-col sm:flex-row gap-4">
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
        </div> */}

        {/* Security Footer */}
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="text-sm">כל המידע מוצפן ומאובטח ברמת בנק</span>
          </div>
        </motion.div> */}
      </main>
    </div>
  )
}
