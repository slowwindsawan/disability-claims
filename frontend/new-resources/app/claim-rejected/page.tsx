"use client"

import { motion } from "framer-motion"
import { FileText, AlertCircle, CheckCircle2, TrendingUp, Shield, ChevronLeft, Upload, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useState } from "react"

export default function ClaimRejectedPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File | null>>({
    additionalMRI: null,
    specialistOpinion: null,
    witnessStatement: null,
  })

  const requiredDocs = [
    {
      id: "additionalMRI",
      name: "MRI נוסף של הגב התחתון",
      description: "נדרש MRI עדכני מהחודשים האחרונים המראה את מצב הפציעה",
      uploaded: !!uploadedDocs.additionalMRI,
    },
    {
      id: "specialistOpinion",
      name: " חוות דעת רופא מומחה אורתופד",
      description: "חוות דעת מומחה מנוסח המאשר קשר סיבתי בין התאונה לכאב",
      uploaded: !!uploadedDocs.specialistOpinion,
    },
    {
      id: "witnessStatement",
      name: "תצהיר עד (אופציונלי)",
      description: "תצהיר של עד שראה את התאונה או השפעתה על חייך",
      uploaded: !!uploadedDocs.witnessStatement,
      optional: true,
    },
  ]

  const allRequiredUploaded = requiredDocs.filter((doc) => !doc.optional).every((doc) => doc.uploaded)

  const handleFileUpload = (docId: string, file: File) => {
    setUploadedDocs((prev) => ({ ...prev, [docId]: file }))
  }

  const handleRemoveFile = (docId: string) => {
    setUploadedDocs((prev) => ({ ...prev, [docId]: null }))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ChevronLeft className="w-5 h-5 rotate-180" />
            <span className="text-sm font-medium">חזרה לדשבורד</span>
          </Link>
          <h2 className="text-lg font-bold text-slate-900">סטטוס תביעה</h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              <Card className="p-6 bg-white shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <FileText className="w-12 h-12 text-slate-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-slate-900">התקבל עדכון מביטוח לאומי</h1>
                      <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm font-medium rounded-full">
                        נדרש ערעור
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      התביעה נדחתה בשלב זה. זהו הליך שכיח (כ-40% מהמקרים), ואנחנו ערוכים לערעור.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* AI Analysis Section */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className="p-6 bg-white shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-4">ניתוח סיבת הדחייה</h2>
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-slate-700 leading-relaxed">הוועדה טוענת לחוסר במסמך רפואי (MRI).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-slate-700 leading-relaxed">לא הוכח קשר סיבתי מלא בין התאונה לכאב.</p>
                  </div>
                </div>
                <div className="bg-emerald-50 border-r-4 border-emerald-500 p-4 rounded">
                  <p className="text-emerald-800 font-semibold">
                    סיכויי הצלחה בערעור: <span className="text-2xl">גבוהים</span>
                  </p>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
              <Card className="p-6 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900">מסמכים נדרשים לערעור</h2>
                  <Badge
                    className={allRequiredUploaded ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}
                  >
                    {uploadedDocs && Object.values(uploadedDocs).filter(Boolean).length}/
                    {requiredDocs.filter((doc) => !doc.optional).length} הועלו
                  </Badge>
                </div>
                <p className="text-slate-600 mb-6 text-sm">
                  על מנת להגיש ערעור חזק, נדרשים המסמכים הבאים שיתמכו בטענות שלנו:
                </p>

                <div className="space-y-4">
                  {requiredDocs.map((doc) => (
                    <Card key={doc.id} className="p-4 bg-slate-50 border border-slate-200">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{doc.name}</h3>
                            {doc.optional && (
                              <Badge variant="outline" className="text-xs">
                                אופציונלי
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{doc.description}</p>

                          {doc.uploaded ? (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-sm font-medium">
                                  {uploadedDocs[doc.id as keyof typeof uploadedDocs]?.name}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveFile(doc.id)}
                                className="h-8"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                id={doc.id}
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileUpload(doc.id, file)
                                }}
                              />
                              <label htmlFor={doc.id}>
                                <Button size="sm" variant="outline" className="cursor-pointer bg-transparent" asChild>
                                  <span>
                                    <Upload className="w-4 h-4 ml-2" />
                                    העלה מסמך
                                  </span>
                                </Button>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Action Section */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="p-6 bg-white shadow-sm border-t-4 border-blue-600">
                <h3 className="text-lg font-bold text-slate-900 mb-4">הצעד הבא</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  המערכת שלנו יכולה לייצר מכתב ערעור מקצועי באופן אוטומטי, המבוסס על הסיבות שזוהו והתקדימים המשפטיים
                  הרלוונטיים.
                </p>
                {!allRequiredUploaded && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">יש להעלות את כל המסמכים הנדרשים לפני הכנת מכתב הערעור</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 font-semibold"
                    disabled={!allRequiredUploaded}
                  >
                    <FileText className="w-5 h-5 ml-2" />
                    הכן מכתב ערעור אוטומטי
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 font-semibold bg-transparent">
                    קרא את המכתב המקורי
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Timeline Sidebar */}
          <div className="lg:col-span-1">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <Card className="p-6 bg-white shadow-sm sticky top-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">מסלול התביעה</h3>
                <div className="space-y-6">
                  {/* Step 1 - Completed */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-0.5 h-12 bg-slate-200 mt-2" />
                    </div>
                    <div className="pb-4">
                      <h4 className="font-semibold text-slate-900 mb-1">הגשת תביעה</h4>
                      <p className="text-sm text-slate-500">התיק הוגש בהצלחה</p>
                      <p className="text-xs text-slate-400 mt-1">הושלם ב-15/01/2025</p>
                    </div>
                  </div>

                  {/* Step 2 - Rejected */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-0.5 h-12 bg-slate-200 mt-2" />
                    </div>
                    <div className="pb-4">
                      <h4 className="font-semibold text-slate-900 mb-1">החלטה הועדה</h4>
                      <p className="text-sm text-orange-600 font-medium">נדחה</p>
                      <p className="text-xs text-slate-400 mt-1">10/03/2025</p>
                    </div>
                  </div>

                  {/* Step 3 - Active */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-1">הגשת ערעור</h4>
                      <p className="text-sm text-slate-500">שלב פעיל</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>45 יום להגשת ערעור</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
