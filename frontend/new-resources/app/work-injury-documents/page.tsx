"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, FileText, CreditCard, FileCheck, ArrowLeft, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type DocumentSlot = {
  id: string
  title: string
  description: string
  icon: any
  required: boolean
  file: File | null
}

export default function WorkInjuryDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentSlot[]>([
    {
      id: "medical",
      title: "סיכום רפואי / מכתב שחרור",
      description: "מהרופא המטפל או מהמרפאה",
      icon: FileText,
      required: true,
      file: null,
    },
    {
      id: "payslips",
      title: "3 תלושי שכר אחרונים",
      description: "לצורך חישוב הפיצוי הפוטנציאלי",
      icon: CreditCard,
      required: true,
      file: null,
    },
    {
      id: "form250",
      title: "טופס 250 חתום",
      description: "מהמעסיק (אופציונלי)",
      icon: FileCheck,
      required: false,
      file: null,
    },
  ])

  const [isMobile, setIsMobile] = useState(false)

  useState(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  })

  const handleFileUpload = (id: string, file: File) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, file } : doc)))
  }

  const handleRemoveFile = (id: string) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, file: null } : doc)))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(id, file)
    }
  }

  const allRequiredUploaded = documents.filter((doc) => doc.required).every((doc) => doc.file !== null)

  const handleSubmit = () => {
    router.push("/work-injury-approval")
  }

  const handleSkip = () => {
    router.push("/dashboard")
  }

  const handleWhatsAppUpload = () => {
    const phoneNumber = "972501234567" // Replace with actual bot number
    const message = encodeURIComponent("היי, אני רוצה להעלות מסמכים לתיק תאונת העבודה שלי 📄")
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>חזרה</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <span className="text-xl font-bold text-slate-900">ZeroTouch</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-slate-900">חיזוק התיק לפני העברה למומחה.</h1>
          <p className="text-lg text-slate-600">מסמכים אלו יעזרו לעורך הדין להכין את התביעה מהר יותר.</p>
        </motion.div>

        {/* Upload Grid */}
        <div className="mb-8 space-y-6">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`relative overflow-hidden rounded-xl border-2 ${
                  doc.file ? "border-green-500 bg-green-50" : "border-dashed border-slate-300 bg-white"
                } p-6 transition-all hover:border-blue-400 hover:bg-blue-50/50`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, doc.id)}
              >
                {/* Required Badge */}
                {doc.required && !doc.file && (
                  <div className="absolute left-4 top-4 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    נדרש
                  </div>
                )}

                {/* Uploaded Badge */}
                {doc.file && (
                  <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>הועלה</span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg ${
                      doc.file ? "bg-green-100" : "bg-blue-100"
                    }`}
                  >
                    <doc.icon className={`h-7 w-7 ${doc.file ? "text-green-600" : "text-blue-600"}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold text-slate-900">{doc.title}</h3>
                    <p className="mb-4 text-sm text-slate-600">{doc.description}</p>

                    {doc.file ? (
                      // File Uploaded State
                      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-slate-700">{doc.file.name}</span>
                        </div>
                        <button onClick={() => handleRemoveFile(doc.id)} className="text-slate-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      // Upload Button
                      <label htmlFor={`file-${doc.id}`} className="cursor-pointer">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                          <Upload className="h-4 w-4" />
                          <span>העלה קובץ או גרור לכאן</span>
                        </div>
                        <input
                          id={`file-${doc.id}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(doc.id, file)
                          }}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* WhatsApp Bridge Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-6"
        >
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">המסמכים בנייד?</h3>
            <p className="text-sm text-slate-600 mb-4">שלח אותם ישירות דרך WhatsApp</p>
            <Button onClick={handleWhatsAppUpload} size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {isMobile ? "פתח WhatsApp ושלח מסמכים" : "סרוק QR ושלח מהנייד"}
            </Button>
          </div>
        </motion.div>

        {/* Skip Option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8 text-center"
        >
          <button onClick={handleSkip} className="text-sm font-medium text-slate-600 underline hover:text-slate-900">
            אין לי את המסמכים כרגע? דלג והמשך ללא העלאה.
          </button>
        </motion.div>

        {/* Submit Button */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Button
            onClick={handleSubmit}
            size="lg"
            className="h-14 w-full text-lg font-semibold"
            disabled={!allRequiredUploaded}
          >
            סיים והעבר לבדיקה 📤
          </Button>
          {!allRequiredUploaded && (
            <p className="mt-3 text-center text-sm text-slate-500">יש להעלות את כל המסמכים הנדרשים כדי להמשיך</p>
          )}
        </motion.div>
      </main>
    </div>
  )
}
