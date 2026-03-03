"use client"

import { motion } from "framer-motion"
import { CheckCircle2, AlertCircle, GraduationCap, FileText, ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { BACKEND_BASE_URL } from "@/variables"

interface Props { initialCaseObj?: any }

export default function ClaimApprovedPage({ initialCaseObj }: Props = {}) {
  const [caseObj, setCaseObj] = useState<any>(initialCaseObj ?? null)

  // Sync when dashboard's currentCase loads/updates
  useEffect(() => {
    if (initialCaseObj) setCaseObj(initialCaseObj)
  }, [initialCaseObj])

  // Standalone fallback for direct route access
  useEffect(() => {
    if (initialCaseObj) return
    const caseId = localStorage.getItem("case_id")
    const token = localStorage.getItem("access_token")
    if (!caseId || !token) return
    fetch(`${BACKEND_BASE_URL}/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setCaseObj(data?.case || data))
      .catch(() => {})
  }, [])

  const action = caseObj?.metadata?.btl_action || {}
  const disabilityPercentage = action.disability_percentage ?? "—"
  const approvedBenefits: string[] = action.approved_benefits || []
  const departmentMessage: string = action.department_message || ""
  const monthlyAmount: number | null = action.monthly_amount ?? null

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50">
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
          <h1 className="text-5xl font-bold text-slate-900 mb-4">מזל טוב!</h1>
          <p className="text-2xl text-slate-700 mb-2">אושרה נכות של {disabilityPercentage}%</p>
          {monthlyAmount !== null && (
            <p className="text-xl font-semibold text-emerald-700 mb-2">
              סכום חודשי: ₪{monthlyAmount.toLocaleString()}
            </p>
          )}
          <p className="text-lg text-slate-600">{departmentMessage || "המוסד לביטוח לאומי אישר שיש לך נכות רפואית"}</p>
          {approvedBenefits.length > 0 && (
            <ul className="mt-3 space-y-1">
              {approvedBenefits.map((b, i) => (
                <li key={i} className="inline-flex items-center gap-1 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full mx-1">
                  <CheckCircle2 className="w-3 h-3" /> {b}
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="p-8 bg-gradient-to-l from-amber-50 to-yellow-50 border-2 border-amber-200 mb-8">
            <div className="flex gap-4 items-start">
              <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">שים לב: זה עדיין לא אומר שתקבל כסף</h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  אישור נכות של {disabilityPercentage}% הוא השלב הראשון. כדי לקבל מימון לימודים ודמי מחיה, צריך גם אישור
                  על שיקום מקצועי.
                </p>
                <p className="text-slate-600 text-sm">שיקום מקצועי = תוכנית המימון של ביטוח לאומי לסטודנטים עם נכות</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <h3 className="text-2xl font-bold text-slate-900 mb-6">מה זה שיקום מקצועי?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Benefit 1 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">מימון שכר לימוד</h4>
                  <p className="text-2xl font-bold text-purple-600 mb-1">✓</p>
                  <p className="text-sm text-slate-600">מימון מלא או חלקי בהתאם לזכאות ולמוסד הלימודים</p>
                </div>
              </div>
            </Card>

            {/* Benefit 2 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">דמי מחיה</h4>
                  <p className="text-2xl font-bold text-blue-600 mb-1">✓</p>
                  <p className="text-sm text-slate-600">תמיכה כלכלית חודשית בהתאם לזכאות</p>
                </div>
              </div>
            </Card>

            {/* Benefit 3 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">הוצאות נסיעות</h4>
                  <p className="text-2xl font-bold text-orange-600 mb-1">✓</p>
                  <p className="text-sm text-slate-600">החזר הוצאות נסיעה בהתאם למדיניות ביטוח לאומי</p>
                </div>
              </div>
            </Card>

            {/* Benefit 4 */}
            <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">תמיכה נוספת</h4>
                  <p className="text-2xl font-bold text-green-600 mb-1">✓</p>
                  <p className="text-sm text-slate-600">ספרים, ציוד לימודים ותמיכות נוספות לפי הצורך</p>
                </div>
              </div>
            </Card>
          </div>
          <Card className="p-4 bg-slate-50 border-slate-200 mb-8">
            <p className="text-sm text-slate-600 text-center">
              הסכומים והזכאויות הסופיות ייקבעו על ידי ביטוח לאומי בהתאם למוסד הלימודים, התוכנית והנסיבות האישיות
            </p>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="p-8 bg-slate-900 text-white shadow-lg mb-8">
            <h3 className="text-2xl font-bold mb-6">השלב הבא: הגשת בקשה לשיקום מקצועי</h3>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-bold mb-1">מילוי טופס 270</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    נעזור לך למלא את הטופס הרשמי להגשת בקשה לשיקום מקצועי
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-bold mb-1">המתנה לאישור</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">ביטוח לאומי יבדוק את הבקשה (2-4 שבועות)</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-bold mb-1">קבלת אישור והתחלת תשלומים</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    לאחר אישור, תתחיל לקבל את המימון והתמיכה הכלכלית
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link href="/rehab-form-270" className="flex-1">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-semibold">
              <GraduationCap className="w-5 h-5 ml-2" />
              המשך להגשת בקשת שיקום
            </Button>
          </Link>
          {/* <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full h-14 text-lg font-semibold bg-transparent">
              <ArrowLeft className="w-5 h-5 ml-2" />
              חזור לדשבורד
            </Button>
          </Link> */}
        </div>

        {/* Trust Footer */}
        {/* <div className="text-center text-sm text-slate-600 bg-slate-100 p-4 rounded-lg">
          מבוסס על סעיפי ליקוי: 37, 32 | אושר ע"י המוסד לביטוח לאומי
        </div> */}
      </main>
    </div>
  )
}
