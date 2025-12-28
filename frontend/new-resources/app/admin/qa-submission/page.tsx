"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Edit2,
  Save,
  ExternalLink,
  Send,
  Rocket,
  Clock,
  User,
  CreditCard,
  Activity,
  Sparkles,
} from "lucide-react"

export default function QASubmissionConsole() {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [validationChecks, setValidationChecks] = useState({
    personal: false,
    medical: false,
    bank: false,
  })

  const [activeTab, setActiveTab] = useState("medical")

  // Sample data that would be injected by Chrome extension
  const [payloadData, setPayloadData] = useState({
    personal: {
      fullName: "ישראל ישראלי",
      idNumber: "987654321",
      birthDate: "15/03/1985",
      address: "רחוב הרצל 45, תל אביב",
      phone: "052-1234567",
      email: "israel@example.com",
    },
    medical: {
      diagnosis: "דיסקוס מותני L4-L5",
      diagnosisDate: "12/08/2023",
      treatingPhysician: 'ד"ר שרה כהן',
      hospitalizations: "שיבא, 15-20/09/2023",
      limitationsAtWork: "כן - לא יכול להרים משקל",
      percentageExpected: "37%",
    },
    bank: {
      bankName: "בנק לאומי",
      branch: "902",
      accountNumber: "1234567",
    },
  })

  // Validation issues
  const [issues] = useState([{ type: "warning", text: "התאריך באבחנה לא תואם למסמך הרפואי (הפרש של יומיים)" }])

  const allChecked = validationChecks.personal && validationChecks.medical && validationChecks.bank
  const isReady = allChecked && issues.length === 0

  const handleEdit = (section: string, field: string) => {
    setEditingField(`${section}.${field}`)
  }

  const handleSave = () => {
    setEditingField(null)
  }

  const handleLaunchExtension = () => {
    alert("פתיחת פורטל המוסד לביטוח לאומי והפעלת תוסף Chrome...")
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors" dir="rtl">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        {/* Client Info - Right */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">ישראל ישראלי</span>
          </div>
          <div className="text-sm text-slate-500">
            ת.ז: <span className="font-mono">987654321</span>
          </div>
        </div>

        {/* Status Badge - Center */}
        <div>
          {isReady ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-lg px-4 py-2">
              <CheckCircle2 className="w-5 h-5 ml-2" />
              מוכן להגשה
            </Badge>
          ) : (
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-lg px-4 py-2">
              <AlertCircle className="w-5 h-5 ml-2" />
              חסרים פרטים
            </Badge>
          )}
        </div>

        {/* Actions - Left */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            disabled={!isReady}
            onClick={handleLaunchExtension}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
          >
            <Rocket className="w-5 h-5 ml-2" />
            פתח פורטל והפעל תוסף 🚀
          </Button>
        </div>
      </div>

      {/* Validation Alert System */}
      <div className="px-6 py-4">
        <AnimatePresence mode="wait">
          {issues.length === 0 && allChecked ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3"
            >
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <span className="text-green-500 font-medium">כל המסמכים והנתונים תקינים. ניתן להגיש.</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2"
            >
              {issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-500">{issue.text}</span>
                </div>
              ))}
              {!allChecked && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-500">יש לאשר את כל הסעיפים לפני ההגשה</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Work Area - Split View */}
      <div className="px-6 pb-6 grid grid-cols-2 gap-6 h-[calc(100vh-250px)]">
        {/* Left Side - Source Documents */}
        <Card className="bg-white border-slate-200 p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            מסמכי המקור
          </h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {["medical", "id", "bank"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab === "medical" && "סיכום רפואי"}
                {tab === "id" && "תעודת זהות"}
                {tab === "bank" && "אישור בנק"}
              </button>
            ))}
          </div>

          {/* Document Preview */}
          <div className="flex-1 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-600">
                תצוגה מקדימה של:{" "}
                {activeTab === "medical" ? "סיכום רפואי" : activeTab === "id" ? "תעודת זהות" : "אישור בנק"}
              </p>
              <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                <ExternalLink className="w-4 h-4 ml-2" />
                פתח במסך מלא
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Side - Payload Data */}
        <Card className="bg-white border-slate-200 p-6 flex flex-col overflow-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            נתונים להזרקה (Payload)
          </h2>

          <div className="space-y-6">
            {/* Personal Section */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  פרטים אישיים
                </h3>
                <Checkbox
                  checked={validationChecks.personal}
                  onCheckedChange={(checked) =>
                    setValidationChecks({ ...validationChecks, personal: checked as boolean })
                  }
                  id="check-personal"
                />
                <label htmlFor="check-personal" className="text-sm text-slate-500 mr-2 cursor-pointer">
                  נבדק
                </label>
              </div>

              <div className="space-y-3">
                {Object.entries(payloadData.personal).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-32 flex-shrink-0">
                      {key === "fullName" && "שם מלא"}
                      {key === "idNumber" && "ת.ז"}
                      {key === "birthDate" && "תאריך לידה"}
                      {key === "address" && "כתובת"}
                      {key === "phone" && "טלפון"}
                      {key === "email" && "אימייל"}
                    </span>
                    {editingField === `personal.${key}` ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={value}
                          onChange={(e) =>
                            setPayloadData({
                              ...payloadData,
                              personal: { ...payloadData.personal, [key]: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSave}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{value}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit("personal", key)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Medical Section */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  פרטים רפואיים
                </h3>
                <Checkbox
                  checked={validationChecks.medical}
                  onCheckedChange={(checked) =>
                    setValidationChecks({ ...validationChecks, medical: checked as boolean })
                  }
                  id="check-medical"
                />
                <label htmlFor="check-medical" className="text-sm text-slate-500 mr-2 cursor-pointer">
                  נבדק
                </label>
              </div>

              <div className="space-y-3">
                {Object.entries(payloadData.medical).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-32 flex-shrink-0">
                      {key === "diagnosis" && "אבחנה"}
                      {key === "diagnosisDate" && "תאריך אבחנה"}
                      {key === "treatingPhysician" && "רופא מטפל"}
                      {key === "hospitalizations" && "אשפוזים"}
                      {key === "limitationsAtWork" && "הגבלות בעבודה"}
                      {key === "percentageExpected" && "אחוז צפוי"}
                    </span>
                    {editingField === `medical.${key}` ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={value}
                          onChange={(e) =>
                            setPayloadData({
                              ...payloadData,
                              medical: { ...payloadData.medical, [key]: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSave}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{value}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit("medical", key)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Section */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  פרטי בנק
                </h3>
                <Checkbox
                  checked={validationChecks.bank}
                  onCheckedChange={(checked) => setValidationChecks({ ...validationChecks, bank: checked as boolean })}
                  id="check-bank"
                />
                <label htmlFor="check-bank" className="text-sm text-slate-500 mr-2 cursor-pointer">
                  נבדק
                </label>
              </div>

              <div className="space-y-3">
                {Object.entries(payloadData.bank).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-32 flex-shrink-0">
                      {key === "bankName" && "בנק"}
                      {key === "branch" && "סניף"}
                      {key === "accountNumber" && "מספר חשבון"}
                    </span>
                    {editingField === `bank.${key}` ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={value}
                          onChange={(e) =>
                            setPayloadData({
                              ...payloadData,
                              bank: { ...payloadData.bank, [key]: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSave}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{value}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit("bank", key)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>עדכון אחרון על ידי AI: לפני 2 דקות</span>
        </div>

        <Button variant="outline" className="gap-2 bg-transparent">
          <Send className="w-4 h-4" />
          בקש מסמכים נוספים מהלקוח (WhatsApp)
        </Button>
      </div>
    </div>
  )
}
