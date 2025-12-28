"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Upload, FileText, Shield, CheckCircle2, Stethoscope, ClipboardList, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function MedicalDocumentsPage() {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => file.name)
      setUploadedFiles([...uploadedFiles, ...newFiles])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).map((file) => file.name)
      setUploadedFiles([...uploadedFiles, ...newFiles])
    }
  }

  const handleContinue = () => {
    router.push("/ai-lawyer")
  }

  const handleWhatsAppUpload = () => {
    const phoneNumber = "972501234567"
    const message = encodeURIComponent("היי, אני רוצה להעלות מסמכים רפואיים לתיק שלי 📄")
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  const recommendedDocuments = [
    {
      icon: Stethoscope,
      title: "אבחנות רפואיות",
      description: "סיכומי ביקור, מכתבי שחרור",
    },
    {
      icon: FileText,
      title: "תיעוד רפואי",
      description: "תוצאות בדיקות, מרשמים",
    },
    {
      icon: ClipboardList,
      title: "מסמכים נוספים",
      description: "אישורים ממקום העבודה, תלושים",
    },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">ZeroTouch Claims</h1>
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-5xl"
        >
          <div className="text-center mb-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
            >
              יש לך מסמכים רפואיים? העלה אותם עכשיו
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl mb-8"
            >
              <p className="text-xl md:text-2xl text-slate-700 font-medium leading-relaxed">
                ככל שיש לנו יותר מידע רפואי -{" "}
                <span className="text-blue-600 font-bold">הפיצוי שלך יכול להיות גבוה יותר</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-8 rounded-2xl mx-auto max-w-3xl mb-10"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-6">למה כדאי להעלות עכשיו?</h3>
              <div className="grid md:grid-cols-3 gap-6 text-right">
                <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-blue-100">
                  <div className="text-3xl mb-2">💰</div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">פיצוי גבוה יותר</p>
                  <p className="text-xs text-slate-600">ה-AI מנתח ומוצא כל זכות נוספת</p>
                </div>
                <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-blue-100">
                  <div className="text-3xl mb-2">⚡</div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">שיחה קצרה יותר</p>
                  <p className="text-xs text-slate-600">אנחנו כבר מכירים את המצב שלך</p>
                </div>
                <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-blue-100">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">דיוק מקסימלי</p>
                  <p className="text-xs text-slate-600">אין סיכון לשכוח פרטים חשובים</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-6 font-medium">
                אין מסמכים כרגע? <span className="text-blue-700">אפשר להתקדם בלי - זה לא חובה</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 p-8 rounded-2xl mx-auto max-w-3xl mb-10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">מה קורה אחרי זה?</h3>
              </div>

              <div className="bg-white/80 backdrop-blur p-6 rounded-xl border border-purple-100 mb-4">
                <p className="text-base text-slate-800 leading-relaxed mb-4">
                  <span className="font-bold text-purple-700">שיחה אישית עם עורכת הדין הדיגיטלית שלנו</span> - היא תשאל
                  אותך כמה שאלות ממוקדות על המצב הרפואי, התסמינים, והמגבלות שלך.
                </p>

                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">למה צריך את השיחה?</p>
                      <p className="text-sm text-slate-600">
                        כדי להבין את המצב המלא שלך ולזהות <span className="font-semibold">כל זכות</span> שמגיעה לך
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">כמה זמן זה לוקח?</p>
                      <p className="text-sm text-slate-600">
                        בין <span className="font-semibold">3-7 דקות</span> בממוצע - תלוי במורכבות המצב
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">איך להתכונן?</p>
                      <p className="text-sm text-slate-600">
                        פשוט ענה בכנות על השאלות - <span className="font-semibold">אין תשובות נכונות או לא נכונות</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center text-sm text-purple-700 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>זה רגע חשוב - כאן ה-AI מחשב את הפיצוי המדויק שמגיע לך</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-3 gap-6 mb-10"
          >
            {recommendedDocuments.map((doc, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card className="p-6 bg-white shadow-md hover:shadow-lg transition-shadow h-full border border-slate-200">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-50 rounded-full mb-4">
                      <doc.icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg text-foreground mb-2">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8 grid md:grid-cols-2 gap-6"
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 md:p-12 transition-all h-full ${
                  isDragging
                    ? "border-blue-600 bg-blue-50"
                    : "border-blue-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50"
                }`}
              >
                <div className="text-center">
                  <motion.div
                    animate={{ y: isDragging ? -10 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex justify-center mb-4"
                  >
                    <div className="p-4 bg-blue-100 rounded-full">
                      <Upload className="w-12 h-12 text-blue-600" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground mb-2">העלאה מהמחשב</h3>
                  <p className="text-base text-muted-foreground mb-4">גרור קבצים לכאן או לחץ לבחירה מהמחשב</p>
                  <p className="text-sm text-slate-500">PDF, JPG, PNG עד 10MB</p>
                </div>
              </div>
            </label>
            <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} />

            <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-8 md:p-12 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <pattern id="whatsapp-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1" fill="currentColor" className="text-green-600" />
                  </pattern>
                  <rect width="100" height="100" fill="url(#whatsapp-pattern)" />
                </svg>
              </div>

              <div className="text-center relative z-10">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">המסמכים בנייד? אין בעיה.</h3>
                  <p className="text-sm text-slate-600">שלח מסמכים ישירות מהטלפון דרך WhatsApp</p>
                </div>

                {isMobile ? (
                  <Button
                    onClick={handleWhatsAppUpload}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                  >
                    <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    פתח את הוואטסאפ ושלח מסמכים
                  </Button>
                ) : (
                  <>
                    <div className="bg-white p-4 rounded-xl inline-block shadow-md mb-4">
                      <div className="w-40 h-40 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-32 h-32 bg-white rounded grid grid-cols-3 gap-1 p-2">
                            {[...Array(9)].map((_, i) => (
                              <div key={i} className="bg-slate-800 rounded-sm" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-right">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </span>
                        <p className="text-sm text-slate-700">סרוק את הקוד עם הנייד</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          2
                        </span>
                        <p className="text-sm text-slate-700">הקוד יפתח לך צ'אט עם הבוט שלנו בוואטסאפ</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          3
                        </span>
                        <p className="text-sm text-slate-700">שלח את התמונות שם - והן יופיעו כאן במסך מיד!</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {uploadedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-8 space-y-3 bg-green-50 p-6 rounded-xl border border-green-200"
            >
              <h4 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                קבצים שהועלו ({uploadedFiles.length})
              </h4>
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white border border-green-300 rounded-lg"
                >
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-foreground flex-1">{file}</span>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="space-y-4">
            {uploadedFiles.length > 0 && (
              <Button
                size="lg"
                onClick={handleContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-7 text-lg font-bold shadow-lg"
              >
                המשך לשיחה עם {uploadedFiles.length} מסמכים
              </Button>
            )}

            <Button
              onClick={handleContinue}
              variant="outline"
              size="lg"
              className="w-full border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50 text-slate-700 hover:text-blue-700 py-7 text-lg font-semibold bg-transparent"
            >
              המשך לשיחה בלי העלאה
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-2 mt-8 text-slate-600"
          >
            <Lock className="w-4 h-4 text-slate-500" />
            <span className="text-sm">הקבצים מאובטחים ברמת בנק</span>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
