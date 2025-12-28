"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, AlertCircle } from "lucide-react"

interface Question {
  id: string
  question: string
  type: "yes-no" | "radio" | "date" | "text"
  options?: string[]
  required: boolean
  helpText?: string
  stopIfNo?: boolean
  conditionalParent?: string
  conditionalValue?: string
}

const questions: Question[] = [
  {
    id: "work_related",
    question: "האם הפגיעה או המחלה קשורות לעבודה?",
    type: "yes-no",
    required: true,
    helpText: "שאלה קריטית - קובעת אם התביעה נכנסת במסגרת הזכאות",
    stopIfNo: true,
  },
  {
    id: "injury_date",
    question: "מתי התרחשה הפגיעה או אובחנה המחלה?",
    type: "date",
    required: true,
    helpText: "תאריך זה קובע את תאריך תחילת הזכאות",
  },
  {
    id: "medical_treatment",
    question: "מה המצב הרפואי הנוכחי שלך?",
    type: "radio",
    options: ["מאושפז/ת כרגע", "מטופל/ת אמבולטורית", "לא בטיפול כרגע"],
    required: true,
    helpText: "משפיע על מועדי תוקף ובדיקות רטרוספקטיביות",
  },
  {
    id: "unable_to_work",
    question: "האם אינך יכול/ה לעבוד בגלל המצב?",
    type: "radio",
    options: ["כן, לא יכול/ה לעבוד כלל", "לא, עדיין עובד/ת", "חלקית - עובד/ת במשרה מופחתת"],
    required: true,
    helpText: "משפיע על זכאות לאובדן השתכרות ומעמד 100% זמני",
  },
  {
    id: "has_medical_reports",
    question: "האם יש ברשותך דוחות רפואיים?",
    type: "yes-no",
    required: true,
    helpText: "הוועדה יכולה להחליט על בסיס מסמכים בלבד",
  },
  {
    id: "can_attend_appointment",
    question: "האם תוכל/י להגיע לפגישה רפואית?",
    type: "radio",
    options: ["כן, יכול/ה להגיע", "לא, לא יכול/ה להגיע", "רק בבית"],
    required: true,
    helpText: "הוועדה יכולה לבדוק במקום מגורים במידת הצורך",
  },
  {
    id: "previous_disability_rating",
    question: "האם יש לך דירוג נכות קיים?",
    type: "yes-no",
    required: true,
    helpText: "משפיע על חישובים מצטברים וכללי הערכה מחדש",
  },
  {
    id: "previous_rating_details",
    question: "פרט/י על דירוג הנכות הקודם",
    type: "text",
    required: false,
    helpText: "אחוז נכות, תאריך הדירוג, סוג הפגיעה",
    conditionalParent: "previous_disability_rating",
    conditionalValue: "Yes",
  },
  {
    id: "has_income",
    question: "האם יש לך הכנסה כרגע?",
    type: "yes-no",
    required: true,
    helpText: "רלוונטי למעמד 100% זמני וחישוב גמלאות",
  },
  {
    id: "income_amount",
    question: "מה גובה ההכנסה החודשית (₪)?",
    type: "text",
    required: false,
    helpText: "מסייע לחישוב גמלאות פוטנציאליות",
    conditionalParent: "has_income",
    conditionalValue: "Yes",
  },
  {
    id: "has_lawyer",
    question: "האם יש לך ייצוג משפטי?",
    type: "yes-no",
    required: false,
    helpText: "משפיע על ניתוב תקשורת והכנה לדיון",
  },
  {
    id: "lawyer_contact",
    question: "פרטי יצירת קשר של הייצוג המשפטי",
    type: "text",
    required: false,
    helpText: "שם, מס׳ טלפון, אימייל",
    conditionalParent: "has_lawyer",
    conditionalValue: "Yes",
  },
  {
    id: "condition_worsened",
    question: "האם המצב הרפואי החמיר?",
    type: "radio",
    options: ["כן, החמיר", "לא, נשאר דומה", "לא היה דירוג קודם"],
    required: true,
    helpText: "מפעיל בקשה להערכה מחדש",
  },
  {
    id: "other_injuries",
    question: "האם יש פגיעות נוספות באותו איבר/מערכת?",
    type: "yes-no",
    required: false,
    helpText: "משפיע על חישוב נכות משולבת/מצטברת",
  },
  {
    id: "other_injury_details",
    question: "פרט/י על הפגיעות הנוספות",
    type: "text",
    required: false,
    helpText: "תאר/י איזה איבר, מהות הפגיעה, מתי אירעה",
    conditionalParent: "other_injuries",
    conditionalValue: "Yes",
  },
]

interface Props {
  onComplete: (answers: Record<string, string>) => void
  onBack?: () => void
}

export function EligibilityQuestionnaire({ onComplete, onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [ineligible, setIneligible] = useState(false)

  const visibleQuestions = questions.filter((q) => {
    if (!q.conditionalParent) return true
    const parentAnswer = answers[q.conditionalParent]
    return parentAnswer === q.conditionalValue
  })

  const currentQuestion = visibleQuestions[currentIndex]
  const isAnswered = !!answers[currentQuestion?.id]
  const progress = ((currentIndex + 1) / visibleQuestions.length) * 100

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value }
    setAnswers(newAnswers)

    // Check for ineligibility
    if (currentQuestion.stopIfNo && value === "No") {
      setIneligible(true)
      return
    }

    // Auto-advance for yes-no and radio
    if (currentQuestion.type === "yes-no" || currentQuestion.type === "radio") {
      setTimeout(() => handleNext(newAnswers), 300)
    }
  }

  const handleNext = (answersToCheck = answers) => {
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onComplete(answersToCheck)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else if (onBack) {
      onBack()
    }
  }

  if (ineligible) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center space-y-6"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">לא עומד/ת בתנאי הזכאות</h2>
          <p className="text-slate-600 leading-relaxed">
            מצטערים, אך על פי התשובות שהזנת, נראה שהמקרה שלך לא נכנס במסגרת הזכאות לפי חוק הביטוח הלאומי. תביעות
            נכות חייבות להיות קשורות לעבודה או לנסיבות המוכרות על ידי החוק.
          </p>
          <div className="space-y-3">
            <Button onClick={() => window.location.href = "/"} className="w-full" variant="outline">
              חזרה לדף הבית
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-2xl space-y-8">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>
              שאלה {currentIndex + 1} מתוך {visibleQuestions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-orange-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question */}
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">{currentQuestion.question}</h2>
            {currentQuestion.helpText && (
              <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
                💡 {currentQuestion.helpText}
              </p>
            )}
            {!currentQuestion.required && (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                אופציונלי
              </span>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-4">
            {currentQuestion.type === "yes-no" && (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleAnswer("Yes")}
                  variant={answers[currentQuestion.id] === "Yes" ? "default" : "outline"}
                  className={`h-24 text-xl ${
                    answers[currentQuestion.id] === "Yes" ? "bg-orange-600 hover:bg-orange-700" : ""
                  }`}
                >
                  ✅ כן
                </Button>
                <Button
                  onClick={() => handleAnswer("No")}
                  variant={answers[currentQuestion.id] === "No" ? "default" : "outline"}
                  className={`h-24 text-xl ${
                    answers[currentQuestion.id] === "No" ? "bg-orange-600 hover:bg-orange-700" : ""
                  }`}
                >
                  ❌ לא
                </Button>
              </div>
            )}

            {currentQuestion.type === "radio" && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    variant={answers[currentQuestion.id] === option ? "default" : "outline"}
                    className={`w-full h-auto py-6 text-lg text-right justify-start ${
                      answers[currentQuestion.id] === option ? "bg-orange-600 hover:bg-orange-700" : ""
                    }`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {currentQuestion.type === "date" && (
              <Input
                type="date"
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                className="h-16 text-lg"
                max={new Date().toISOString().split("T")[0]}
              />
            )}

            {currentQuestion.type === "text" && (
              <Textarea
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                placeholder="הזן/י את תשובתך כאן..."
                className="min-h-32 text-lg"
              />
            )}
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button onClick={handlePrevious} variant="outline" size="lg" className="gap-2">
            <ChevronLeft className="w-5 h-5" />
            חזור
          </Button>
          <Button
            onClick={() => handleNext()}
            disabled={currentQuestion.required && !isAnswered}
            size="lg"
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {currentIndex === visibleQuestions.length - 1 ? "סיים" : "המשך"}
          </Button>
        </div>
      </div>
    </div>
  )
}
