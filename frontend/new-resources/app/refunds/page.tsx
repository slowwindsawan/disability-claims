"use client"

import { RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react"
import LegalTechFooter from "@/components/legaltech-footer"

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="bg-gradient-to-b from-slate-50 to-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <RotateCcw className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">מדיניות ביטולים והחזרים</h1>
          <p className="text-lg text-slate-600">עדכון אחרון: ינואר 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Main Policy */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">תקופת הביטול</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            אנו מאפשרים ביטול השירות <strong>תוך 14 יום מרגע התשלום</strong> וקבלת החזר כספי מלא, בתנאי שלא בוצעו
            הפעולות הבאות:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <div className="flex items-center gap-3 mb-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <h3 className="font-bold text-slate-900">לא ניתן לבטל אם:</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• הוגשה תביעה למוסד לביטוח לאומי</li>
                <li>• הועבר התיק לעורך דין שותף</li>
                <li>• בוצעה פגישה עם יועץ משפטי</li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-bold text-slate-900">ניתן לבטל כאשר:</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• התיק עדיין בשלב הכנה</li>
                <li>• לא הושלמה העלאת מסמכים</li>
                <li>• לא אושרה סקירת הנתונים</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="bg-slate-50 rounded-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">תהליך הביטול</h2>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "שלח בקשת ביטול",
                desc: "שלח אימייל ל-refunds@zerotouch.co.il עם מספר התיק שלך וסיבת הביטול",
                icon: Clock,
              },
              {
                step: "2",
                title: "אישור הבקשה",
                desc: "נבדוק את הבקשה ונאשר אותה תוך 2 ימי עסקים",
                icon: CheckCircle,
              },
              {
                step: "3",
                title: "החזר כספי",
                desc: "ההחזר יועבר לאמצעי התשלום המקורי תוך 7-14 ימי עסקים",
                icon: RotateCcw,
              },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-blue-600">שלב {item.step}</span>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Partial Refunds */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">החזרים חלקיים</h2>
          <p className="text-slate-700 leading-relaxed mb-4">במקרים מסוימים, ניתן יהיה לקבל החזר חלקי:</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-bold">₪</span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">ביטול בתוך 14 יום אחרי הגשת תביעה</p>
                <p className="text-sm text-slate-600">החזר של 50% מהתשלום המקורי</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-bold">₪</span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">ביטול תוספות (ניידות/שר"מ) בלבד</p>
                <p className="text-sm text-slate-600">החזר מלא של התוספות שלא הוגשו</p>
              </div>
            </div>
          </div>
        </section>

        {/* Exceptions */}
        <section className="bg-amber-50 rounded-xl p-8 border border-amber-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">חריגים</h2>
          <p className="text-slate-700 leading-relaxed">לא ניתן לבטל ולקבל החזר במקרים הבאים:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mt-3">
            <li>לאחר קבלת החלטה מהמוסד לביטוח לאומי</li>
            <li>לאחר תיאום ועדה רפואית</li>
            <li>לאחר 30 יום מרגע התשלום</li>
            <li>במקרים של שימוש לרעה במערכת</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="border-t pt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">שאלות?</h2>
          <p className="text-slate-700 leading-relaxed">
            לשאלות על ביטולים והחזרים:
            <br />
            <strong>אימייל:</strong> refunds@zerotouch.co.il
            <br />
            <strong>טלפון:</strong> 03-1234567
            <br />
            <strong>שעות פעילות:</strong> ימים א'-ה', 09:00-18:00
          </p>
        </section>
      </div>

      <LegalTechFooter />
    </div>
  )
}
