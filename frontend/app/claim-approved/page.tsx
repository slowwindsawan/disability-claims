"use client"

import { motion } from "framer-motion"
import { CheckCircle2, TrendingUp, Wallet, GraduationCap, Home, Shield, Download, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState } from "react"

export default function ClaimApprovedPage() {
  const [confettiShown] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50" dir="rtl">
      {/* Confetti Effect */}
      {confettiShown && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-emerald-500 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 20,
                opacity: 0,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                ease: "linear",
                delay: Math.random() * 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Success Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full mb-6 shadow-2xl">
            <CheckCircle2 className="w-20 h-20 text-white" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-slate-900 mb-4">מזל טוב! 🎉</h1>
          <p className="text-2xl text-slate-700 mb-2">התביעה שלך אושרה</p>
          <p className="text-lg text-slate-600">המוסד לביטוח לאומי אישר את התביעה במלואה</p>
        </motion.div>

        {/* The Big Number */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="p-12 bg-gradient-to-l from-emerald-600 to-teal-600 text-white shadow-2xl mb-8 text-center">
            <p className="text-lg mb-2 text-emerald-100">החזר רטרואקטיבי מאושר</p>
            <motion.h2
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-7xl font-bold mb-4"
            >
              ₪42,500
            </motion.h2>
            <div className="flex items-center justify-center gap-2 text-emerald-100">
              <Calendar className="w-5 h-5" />
              <span>התשלום יועבר תוך 14 ימי עסקים</span>
            </div>
          </Card>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">החבילה המלאה שלך</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Card 1 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">קצבה חודשית</h4>
                  <p className="text-3xl font-bold text-blue-600 mb-1">₪4,200</p>
                  <p className="text-sm text-slate-600">תשלום קבוע מדי חודש</p>
                </div>
              </div>
            </Card>

            {/* Card 2 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">מימון תואר מלא</h4>
                  <p className="text-3xl font-bold text-purple-600 mb-1">100%</p>
                  <p className="text-sm text-slate-600">שכר לימוד מלא מאושר</p>
                </div>
              </div>
            </Card>

            {/* Card 3 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">דמי מחיה לסטודנט</h4>
                  <p className="text-3xl font-bold text-orange-600 mb-1">₪2,800</p>
                  <p className="text-sm text-slate-600">תוספת חודשית למחיה</p>
                </div>
              </div>
            </Card>

            {/* Card 4 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">פטור ממס הכנסה</h4>
                  <p className="text-3xl font-bold text-green-600 mb-1">✓</p>
                  <p className="text-sm text-slate-600">על כל הקצבאות</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="p-8 bg-slate-900 text-white shadow-lg mb-8">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              השלבים הבאים
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-bold mb-1">הורדת אישור</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">הורד את האישור הרשמי מהמוסד לביטוח לאומי</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-bold mb-1">פרטי חשבון בנק</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">ודא שפרטי חשבון הבנק שלך מעודכנים במערכת</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-bold mb-1">קבלת תשלום</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">התשלום יועבר לחשבון הבנק תוך 14 ימי עסקים</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link href="/rehab-claims" className="flex-1">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-semibold">
              <TrendingUp className="w-5 h-5 ml-2" />
              מקסום כספי שיקום
            </Button>
          </Link>
          <Button variant="outline" className="flex-1 h-14 text-lg font-semibold bg-transparent">
            <Download className="w-5 h-5 ml-2" />
            הורד אישור רשמי
          </Button>
        </div>

        {/* Trust Footer */}
        <div className="text-center text-sm text-slate-600 bg-slate-100 p-4 rounded-lg">
          מבוסס על סעיפי ליקוי: 37, 32 | אושר ע"י המוסד לביטוח לאומי
        </div>
      </main>
    </div>
  )
}
