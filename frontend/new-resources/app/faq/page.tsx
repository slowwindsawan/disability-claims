"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Shield, MessageCircle, FileText, Phone } from "lucide-react"
import LegalTechFooter from "@/components/legaltech-footer"

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      category: "כללי",
      icon: Shield,
      questions: [
        {
          q: "מה זה ZeroTouch ואיך זה עובד?",
          a: "ZeroTouch היא מערכת טכנולוגית המסייעת לך להגיש תביעות לביטוח לאומי באופן מקוון. המערכת משתמשת בבינה מלאכותית כדי לנתח את המקרה שלך, לזהות את הזכויות הרלוונטיות, ולהכין את המסמכים הנדרשים.",
        },
        {
          q: "האם אני צריך להיפגש עם עורך דין?",
          a: "לא. השיחה עם עורכת הדין AI היא וירטואלית. במקרים מסוימים של תאונת עבודה, אנחנו מעבירים את המידע לעורך דין שותף שיכול ליצור איתך קשר.",
        },
        {
          q: "כמה זמן לוקח התהליך?",
          a: "בדיקת הזכאות הראשונית אורכת כ-3 דקות. הכנת התיק המלא יכולה לקחת 24-48 שעות, תלוי בזמינות המסמכים שלך.",
        },
      ],
    },
    {
      category: "תשלום וביטול",
      icon: FileText,
      questions: [
        {
          q: "כמה עולה השירות?",
          a: 'דמי הטיפול הבסיסיים לפתיחת תיק מנהלי הם 800 ש"ח. תוספות אופציונליות כמו תביעת ניידות או שירותים מיוחדים עולות 150 ש"ח כל אחת.',
        },
        {
          q: "האם אני יכול לבטל את השירות?",
          a: "כן. ניתן לבטל את השירות תוך 14 יום מרגע התשלום וקבלת החזר מלא, בתנאי שלא הוגשה תביעה בפועל למוסד לביטוח לאומי.",
        },
        {
          q: "האם יש תשלום מוסף אם אני מקבל אישור?",
          a: "לא. דמי הטיפול הם חד-פעמיים. אנחנו לא גובים אחוז מהפיצוי שלך.",
        },
      ],
    },
    {
      category: "תהליך ומסמכים",
      icon: MessageCircle,
      questions: [
        {
          q: "אילו מסמכים אני צריך?",
          a: "המסמכים המרכזיים: תעודת זהות, סיכום רפואי עדכני, תלושי שכר, ותיעוד רפואי נוסף רלוונטי. המערכת תזהה אוטומטית אילו מסמכים נדרשים בהתאם למקרה שלך.",
        },
        {
          q: "מה אם אין לי את כל המסמכים?",
          a: "אפשר להתחיל את התהליך גם ללא כל המסמכים. המערכת תסמן מה חסר ותאפשר לך להעלות מסמכים גם בשלב מאוחר יותר.",
        },
        {
          q: "האם אתם שומרים את המסמכים שלי?",
          a: "כל המידע מאוחסן בהצפנה מלאה ומוגן לפי תקני ISO 27001. המסמכים נשמרים רק לצורך הטיפול בתיק שלך.",
        },
      ],
    },
    {
      category: "תוצאות וערעור",
      icon: Phone,
      questions: [
        {
          q: "מה קורה אחרי שאני מגיש את התביעה?",
          a: "המוסד לביטוח לאומי בוחן את התביעה ומזמן אותך לוועדה רפואית. אנחנו מכינים אותך לוועדה עם סימולטור ייחודי. לאחר מכן מגיעה החלטה תוך 60-90 יום.",
        },
        {
          q: "מה אם התביעה נדחית?",
          a: "אם התביעה נדחתה, המערכת מנתחת את סיבת הדחייה ומציעה לך להגיש ערעור. אנחנו עוזרים לך להכין מכתב ערעור ומסמכים נוספים.",
        },
        {
          q: "מה הסיכוי שלי לקבל אישור?",
          a: "שיעור ההצלחה תלוי במקרה הספציפי שלך. המערכת מציגה הערכה בהתאם לנתונים שמסרת ולתיעוד הרפואי.",
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">שאלות ותשובות</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            כאן תמצא תשובות לשאלות הנפוצות ביותר על השירות שלנו, התהליך, ותנאי השימוש
          </p>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {faqs.map((category, catIndex) => (
            <div key={catIndex} className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{category.category}</h2>
              </div>

              {category.questions.map((item, qIndex) => {
                const globalIndex = catIndex * 100 + qIndex
                const isOpen = openIndex === globalIndex

                return (
                  <div key={qIndex} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-lg font-semibold text-slate-900 text-right">{item.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && <div className="px-6 pb-4 text-slate-600 leading-relaxed">{item.a}</div>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 bg-blue-50 rounded-xl p-8 text-center border border-blue-100">
          <h3 className="text-2xl font-bold text-slate-900 mb-3">לא מצאת תשובה?</h3>
          <p className="text-slate-600 mb-6">צוות התמיכה שלנו זמין לעזור לך בכל שאלה</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>פתח צ'אט עם התמיכה</span>
          </Link>
        </div>
      </div>

      <LegalTechFooter />
    </div>
  )
}
