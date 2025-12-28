"use client"

import type React from "react"
import { motion } from "framer-motion"
import { FileText, Calendar, Clock, CheckCircle2, AlertCircle, Upload } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import SignaturePad from "@/components/signature-pad"

interface AttendanceDay {
  day: number
  fromHour: string
  toHour: string
}

export default function RehabAgreementPage() {
  const router = useRouter()
  const [hasRead, setHasRead] = useState(false)
  const [hasAgreed, setHasAgreed] = useState(false)
  const [signatureDate, setSignatureDate] = useState("")
  const [signature, setSignature] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [attendance, setAttendance] = useState<AttendanceDay[]>([])
  const [scheduleFile, setScheduleFile] = useState<File | null>(null)
  const [schedulePreview, setSchedulePreview] = useState<string | null>(null)
  const termsRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScheduleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScheduleFile(file)

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setSchedulePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }

      // In production, this would use OCR or manual input
      simulateAutoFill()
    }
  }

  const simulateAutoFill = () => {
    // Demo: Fill Sunday-Thursday with 08:00-16:00
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const autoFilledDays: AttendanceDay[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day)
      const dayOfWeek = date.getDay() // 0=Sunday, 6=Saturday

      // Fill Sunday (0) to Thursday (4)
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        autoFilledDays.push({
          day,
          fromHour: "08:00",
          toHour: "16:00",
        })
      }
    }

    setAttendance(autoFilledDays)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50
    if (isAtBottom) {
      setHasRead(true)
    }
  }

  const handleAttendanceChange = (day: number, field: "fromHour" | "toHour", value: string) => {
    setAttendance((prev) => {
      const existing = prev.find((a) => a.day === day)
      if (existing) {
        return prev.map((a) => (a.day === day ? { ...a, [field]: value } : a))
      }
      return [...prev, { day, fromHour: field === "fromHour" ? value : "", toHour: field === "toHour" ? value : "" }]
    })
  }

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const canSubmit = hasAgreed && signatureDate && signature && attendance.length > 0

  const handleSubmit = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">נהלים בתקופת השתתפות בתכנית שיקום מקצועי</h1>
              <p className="text-slate-600 text-sm mt-1">יש לקרוא, לחתום, ולדווח נוכחות חודשית</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Step 1: Read Terms */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
                1
              </div>
              <h2 className="text-xl font-bold text-slate-900">קרא את הנהלים בעיון</h2>
              {hasRead && <CheckCircle2 className="w-5 h-5 text-green-600 mr-auto" />}
            </div>

            <div
              ref={termsRef}
              onScroll={handleScroll}
              className="h-96 overflow-y-auto bg-slate-50 rounded-lg p-6 border border-slate-200 text-sm leading-relaxed space-y-4"
            >
              <h3 className="font-bold text-lg text-slate-900 mb-4">נהלים בתקופת השתתפות בתכנית שיקום מקצועי</h3>

              <p className="text-slate-700">
                אנו מברכים אותך עם פנייתך לשיקום מקצועי במסגרת המוסד לביטוח לאומי. לאחר אישור זכאותך לשיקום, תיבנה תכנית
                שיקום, המיועדת לעזור לך להשתלב בעולם העבודה. פקיד השיקום ילווה אותך בכל תהליך השיקום, כדי שתוכל לסיים
                בהצלחה.
              </p>

              <p className="text-slate-700">
                להלן מפורטים נהלים הקשורים להשתתפות באבחון, בלימודים ובקבלת תשלומי השיקום. אתה מתבקש לקרוא את הנהלים
                בעיון, להסכים לפעול לפיהם ולאשר זאת בחתימתך.
              </p>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-bold text-slate-900 mb-2">נהלים:</h4>
                <ul className="list-disc list-inside space-y-2 text-slate-700">
                  <li>אנו מאשרים לימודים או הכשרה במוסדות לימוד ובמקצועות מוסדרים, מוכרים ובפיקוח</li>
                  <li>עליך להמציא את כל המסמכים הרלוונטיים כדי שיהיה אפשר לבחון את פרטי התכנית ולאשרה</li>
                  <li>עליך להשתתף בכל הפעילויות והמטלות הנדרשות במקום האבחון או ההכשרה</li>
                  <li>משנקבע תאריך לביצוע אבחון, עליך להגיע למקום בזמן קבוע</li>
                  <li>עליך לעדכן בכתב או בשיחה את פקיד השיקום לפחות אחת לחודש</li>
                </ul>
              </div>

              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  לידיעתך:
                </h4>
                <ul className="list-disc list-inside space-y-2 text-amber-900">
                  <li>אי עמידה בתנאים מסוימים עלולה להביא להפסקת התכנית</li>
                  <li>קורס חוזר יאושר רק אם נכשלת בקורס זה בשל נסיבות רפואיות מוצדקות</li>
                  <li>כל שינוי בתכנית השיקום שאושרה מחייב אישור מראש והסכמה של פקיד השיקום</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="font-bold text-slate-900 mb-2">תשלומים:</h4>
                <ul className="list-disc list-inside space-y-2 text-slate-700">
                  <li>כל הוצאה או תשלום יתואם מראש עם פקיד השיקום ובאישור מוקדם</li>
                  <li>תשלומי השיקום שאושרו יבוצעו על סמך דיווח נוכחות חודשי מקורי</li>
                  <li>דמי השיקום משולמים רק בעבור ימי נוכחות בפועל (ימים מלאים)</li>
                  <li>בקשות להחזר יש להגיש עד חודשיים מעת התשלום בפועל</li>
                </ul>
              </div>

              <p className="text-slate-700 font-semibold mt-6">
                אנו מאחלים לך הצלחה רבה, ועומדים לרשותך לאורך כל הדרך.
              </p>

              <div className="h-20" />
            </div>

            {!hasRead && (
              <p className="text-sm text-slate-500 mt-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                גלול למטה לקריאת כל הנהלים
              </p>
            )}
          </Card>
        </motion.div>

        {/* Step 2: Sign Agreement */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className={`p-6 ${!hasRead ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center ${
                  hasRead ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </div>
              <h2 className="text-xl font-bold text-slate-900">חתימה ואישור</h2>
              {hasAgreed && signature && <CheckCircle2 className="w-5 h-5 text-green-600 mr-auto" />}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4">
                <Checkbox
                  id="agree"
                  checked={hasAgreed}
                  onCheckedChange={(checked) => setHasAgreed(checked === true)}
                  disabled={!hasRead}
                />
                <label htmlFor="agree" className="text-sm text-slate-900 leading-relaxed cursor-pointer">
                  אני מאשר/ת שקראתי את כל פרטי הנהלים והבנתי אותם ואני מתחייב/ת לעמוד בכל האמור לעיל
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">תאריך</label>
                  <Input
                    type="date"
                    value={signatureDate}
                    onChange={(e) => setSignatureDate(e.target.value)}
                    disabled={!hasAgreed}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">שם מלא</label>
                  <Input placeholder="הכנס שם פרטי ומשפחה" disabled={!hasAgreed} className="w-full" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">חתימה</label>
                <SignaturePad onSignatureChange={setSignature} disabled={!hasAgreed} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Step 3: Monthly Attendance */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className={`p-6 ${!hasAgreed || !signature ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center ${
                  hasAgreed && signature ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                3
              </div>
              <h2 className="text-xl font-bold text-slate-900">דיווח ימי נוכחות בחודש</h2>
            </div>

            <div className="mb-6 bg-blue-50 rounded-lg p-4 border-2 border-dashed border-blue-300">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    העלה מערכת שעות שבועית
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    העלה תמונה או PDF של מערכת השעות שלך, והטבלה תתמלא אוטומטית
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleScheduleUpload}
                    className="hidden"
                    disabled={!hasAgreed || !signature}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!hasAgreed || !signature}
                    variant="outline"
                    className="bg-white"
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    בחר קובץ
                  </Button>

                  {scheduleFile && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{scheduleFile.name}</span>
                    </div>
                  )}
                </div>

                {schedulePreview && (
                  <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-300">
                    <img
                      src={schedulePreview || "/placeholder.svg"}
                      alt="Schedule preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline ml-2" />
                  חודש
                </label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  disabled={!hasAgreed || !signature}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">שנה</label>
                <Input
                  type="number"
                  min="2024"
                  max="2030"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  disabled={!hasAgreed || !signature}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {scheduleFile
                  ? "השעות מולאו אוטומטית מהמערכת. ניתן לערוך ידנית במידת הצורך"
                  : "ציין את התאריך והשעה בה הגעת ועזבת את מקום ההכשרה במדויק"}
              </p>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const existingAttendance = attendance.find((a) => a.day === day)
                  const hasData = existingAttendance?.fromHour && existingAttendance?.toHour

                  return (
                    <div
                      key={day}
                      className={`grid grid-cols-[80px_1fr_1fr] gap-3 items-center p-3 rounded-lg ${
                        hasData ? "bg-green-50 border border-green-200" : "bg-white"
                      }`}
                    >
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {hasData && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        יום {day}
                      </div>
                      <Input
                        type="time"
                        placeholder="משעה"
                        value={existingAttendance?.fromHour || ""}
                        onChange={(e) => handleAttendanceChange(day, "fromHour", e.target.value)}
                        disabled={!hasAgreed || !signature}
                        className="text-sm"
                      />
                      <Input
                        type="time"
                        placeholder="עד שעה"
                        value={existingAttendance?.toHour || ""}
                        onChange={(e) => handleAttendanceChange(day, "toHour", e.target.value)}
                        disabled={!hasAgreed || !signature}
                        className="text-sm"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              * יש לדווח רק על ימים בהם השתתפת בפועל בתכנית. השאר ימים ריקים ללא היעדרות.
            </p>
          </Card>
        </motion.div>

        {/* Submit Button */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-14 text-lg font-bold bg-gradient-to-l from-blue-600 to-slate-900 hover:from-blue-700 hover:to-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            שלח דיווח ואישור
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
