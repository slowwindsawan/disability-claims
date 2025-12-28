"use client"

import { motion } from "framer-motion"
import {
  Upload,
  CheckCircle2,
  Lock,
  Calendar,
  FileText,
  ShoppingCart,
  CreditCard,
  Wallet,
  AlertCircle,
  Home,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DocumentSection {
  id: string
  title: string
  value: string
  description: string
  icon: any
  documents: {
    name: string
    uploaded: boolean
    file?: File
    tooltip?: string
  }[]
  additionalInput?: {
    label: string
    placeholder: string
    value: string
  }
}

export default function RehabClaimsPage() {
  const router = useRouter()
  const [totalEstimate, setTotalEstimate] = useState(0)
  const [distanceFromUniversity, setDistanceFromUniversity] = useState<string>("")
  const [sections, setSections] = useState<DocumentSection[]>([
    {
      id: "subsistence",
      title: "דמי שיקום חודשיים",
      value: "~₪2,800 / חודש",
      description: "דמי מחיה למי שלומד באופן קבוע",
      icon: Wallet,
      documents: [
        { name: "מערכת שעות שבועית", uploaded: false, tooltip: "חובה מעל 20 שעות שבועיות" },
        { name: "אישור לימודים בתוקף", uploaded: false },
      ],
    },
    {
      id: "tuition",
      title: "החזר שכר לימוד",
      value: "עד 100% מימון",
      description: "החזר מלא של שכר הלימוד ששולם",
      icon: Calendar,
      documents: [{ name: "קבלה / שובר תשלום", uploaded: false }],
      additionalInput: {
        label: "סכום ששולם בפועל",
        placeholder: "הכנס סכום בשקלים",
        value: "",
      },
    },
    {
      id: "equipment",
      title: "הוצאות נלוות וציוד",
      value: "החזר לפי קבלות",
      description: "ציוד, נסיעות, וחומרי לימוד",
      icon: ShoppingCart,
      documents: [
        { name: "קבלת רכישת מחשב", uploaded: false },
        { name: "קבלות ציוד משרדי", uploaded: false },
        { name: "חופשי חודשי / דלק", uploaded: false },
      ],
    },
  ])

  const handleFileUpload = (sectionId: string, docName: string, file: File) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId) {
          const updatedDocs = section.documents.map((doc) =>
            doc.name === docName ? { ...doc, uploaded: true, file } : doc,
          )

          const allUploaded = updatedDocs.every((doc) => doc.uploaded)

          if (allUploaded) {
            if (sectionId === "subsistence") {
              setTotalEstimate((prev) => prev + 2800)
            } else if (sectionId === "tuition") {
              const amount = Number.parseFloat(section.additionalInput?.value || "0")
              setTotalEstimate((prev) => prev + (amount || 15000))
            } else if (sectionId === "equipment") {
              setTotalEstimate((prev) => prev + 4500)
            }
          }

          return { ...section, documents: updatedDocs }
        }
        return section
      }),
    )
  }

  const handleInputChange = (sectionId: string, value: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId && section.additionalInput
          ? { ...section, additionalInput: { ...section.additionalInput, value } }
          : section,
      ),
    )
  }

  const allSectionsComplete = sections.every((section) => section.documents.every((doc) => doc.uploaded))

  const handleSubmit = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">מקסום כספי השיקום</h1>
              <p className="text-slate-600 text-sm mt-1">העלה את המסמכים הבאים כדי שנזכה את חשבונך בתשלומים</p>
            </div>
            {/* Live Counter */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-l from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg"
            >
              <div className="text-sm text-green-100">סך החזרים צפוי</div>
              <motion.div
                key={totalEstimate}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold"
              >
                ₪{totalEstimate.toLocaleString()}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Alert className="mb-6 border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 font-bold">חשוב</AlertTitle>
          <AlertDescription className="text-amber-800">
            המסך הזה רלוונטי רק אחרי קבלת אישור דמי השיקום מביטוח לאומי. אם עדיין לא קיבלת אישור, המתן להודעה.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {sections.map((section, idx) => {
            const Icon = section.icon
            const allDocsUploaded = section.documents.every((doc) => doc.uploaded)

            return (
              <motion.div
                key={section.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className={`p-6 transition-all ${
                    allDocsUploaded
                      ? "border-2 border-green-500 bg-green-50/50 shadow-lg"
                      : "border border-slate-200 bg-white"
                  }`}
                >
                  {/* Section Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          allDocsUploaded ? "bg-green-500" : "bg-gradient-to-br from-blue-500 to-blue-600"
                        }`}
                      >
                        {allDocsUploaded ? (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        ) : (
                          <Icon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{section.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                      </div>
                    </div>
                    {/* Value Badge */}
                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold text-lg">
                      {section.value}
                    </div>
                  </div>

                  {/* Additional Input */}
                  {section.additionalInput && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {section.additionalInput.label}
                      </label>
                      <Input
                        type="number"
                        placeholder={section.additionalInput.placeholder}
                        value={section.additionalInput.value}
                        onChange={(e) => handleInputChange(section.id, e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  )}

                  {/* Documents Upload */}
                  <div className="space-y-3">
                    {section.documents.map((doc) => (
                      <div
                        key={doc.name}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                          doc.uploaded ? "bg-green-50 border-green-300" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {doc.uploaded ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-slate-400" />
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{doc.name}</div>
                            {doc.tooltip && <div className="text-xs text-slate-500 mt-1">{doc.tooltip}</div>}
                            {doc.uploaded && doc.file && (
                              <div className="text-xs text-green-600 mt-1">הועלה: {doc.file.name}</div>
                            )}
                          </div>
                        </div>
                        {!doc.uploaded && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleFileUpload(section.id, doc.name, file)
                                }
                              }}
                            />
                            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                              <Upload className="w-4 h-4" />
                              העלה
                            </Button>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )
          })}

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="p-6 border border-slate-200 bg-white">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">חוזה שכירות (אם רלוונטי)</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    אם אתה גר 40 ק״מ ומעלה ממקום הלימודים, תהיה זכאי להחזר דמי שכירות
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">מרחק מהאוניברסיטה</label>
                  <Select value={distanceFromUniversity} onValueChange={setDistanceFromUniversity}>
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="בחר מרחק" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less">פחות מ-40 ק״מ</SelectItem>
                      <SelectItem value="more">40 ק״מ ומעלה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {distanceFromUniversity === "more" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-4"
                  >
                    <div className="p-4 rounded-lg border bg-slate-50 border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <div className="font-semibold text-slate-900">חוזה שכירות</div>
                            <div className="text-xs text-slate-500 mt-1">PDF או תמונה של חוזה החתום</div>
                          </div>
                        </div>
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" accept=".pdf,.jpg,.png" />
                          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                            <Upload className="w-4 h-4" />
                            העלה
                          </Button>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border bg-slate-50 border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <div className="font-semibold text-slate-900">הוכחת תשלום (צ׳קים/העברה בנקאית)</div>
                            <div className="text-xs text-slate-500 mt-1">ניתן להעלות מספר קבצים</div>
                          </div>
                        </div>
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" accept=".pdf,.jpg,.png" multiple />
                          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                            <Upload className="w-4 h-4" />
                            העלה
                          </Button>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 sticky bottom-0 bg-white border-t border-slate-200 p-6 rounded-t-xl shadow-lg"
        >
          <div className="max-w-6xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={!allSectionsComplete}
              className="w-full h-14 text-lg font-bold bg-gradient-to-l from-blue-600 to-slate-900 hover:from-blue-700 hover:to-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-5 h-5 ml-2" />
              שלח דרישת תשלום
            </Button>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-600">
              <Lock className="w-4 h-4" />
              <span>הכסף יועבר לחשבונך תוך 45 יום מאישור המוסד</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
