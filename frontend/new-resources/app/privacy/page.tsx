"use client"

import { Shield, Lock, Eye, Database } from "lucide-react"
import LegalTechFooter from "@/components/legaltech-footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-slate-50 to-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">מדיניות פרטיות</h1>
          <p className="text-lg text-slate-600">עדכון אחרון: ינואר 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Intro */}
        <section>
          <p className="text-lg text-slate-700 leading-relaxed">
            ב-ZeroTouch אנו רואים חשיבות עליונה בהגנה על פרטיותך. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על
            המידע האישי שלך.
          </p>
        </section>

        {/* What We Collect */}
        <section className="bg-slate-50 rounded-xl p-8 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">מידע שאנו אוספים</h2>
          </div>
          <ul className="space-y-3 text-slate-700">
            <li>
              <strong>פרטים אישיים:</strong> שם, תעודת זהות, כתובת, טלפון, אימייל
            </li>
            <li>
              <strong>מידע רפואי:</strong> אבחנות, תיעוד רפואי, היסטוריה רפואית
            </li>
            <li>
              <strong>מידע פיננסי:</strong> פרטי חשבון בנק, תלושי שכר
            </li>
            <li>
              <strong>מידע טכני:</strong> IP, סוג דפדפן, מכשיר
            </li>
          </ul>
        </section>

        {/* How We Use */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">שימוש במידע</h2>
          </div>
          <p className="text-slate-700 leading-relaxed mb-4">אנו משתמשים במידע שלך אך ורק למטרות הבאות:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>הכנת והגשת תביעות למוסד לביטוח לאומי</li>
            <li>מתן שירות לקוחות ותמיכה טכנית</li>
            <li>שיפור השירות והמערכת</li>
            <li>עמידה בדרישות חוק</li>
          </ul>
        </section>

        {/* Security */}
        <section className="bg-blue-50 rounded-xl p-8 border border-blue-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">אבטחת מידע</h2>
          </div>
          <p className="text-slate-700 leading-relaxed mb-4">אנו נוקטים באמצעי אבטחה מתקדמים להגנה על המידע שלך:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>הצפנת SSL/TLS לכל תעבורת הנתונים</li>
            <li>הצפנת מסדי נתונים בהתאם לתקן ISO 27001</li>
            <li>גיבויים תקופתיים ואבטחת מידע פיזית</li>
            <li>הגבלת גישה למידע לעובדים מורשים בלבד</li>
          </ul>
        </section>

        {/* Sharing */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">שיתוף מידע</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            אנו <strong>לא משתפים</strong> את המידע האישי שלך עם צדדים שלישיים, למעט:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>מוסד לביטוח לאומי (לצורך הגשת התביעה)</li>
            <li>עורכי דין שותפים (במקרה של תאונת עבודה, עם הסכמתך)</li>
            <li>ספקי שירות טכניים (אחסון, תשלומים) הכפופים להסכמי סודיות</li>
            <li>רשויות אכיפת החוק (במקרים הנדרשים על פי חוק)</li>
          </ul>
        </section>

        {/* Your Rights */}
        <section className="bg-slate-50 rounded-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">הזכויות שלך</h2>
          <p className="text-slate-700 leading-relaxed mb-3">בהתאם לחוק הגנת הפרטיות, זכותך:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>לעיין במידע שנאסף עליך</li>
            <li>לבקש תיקון מידע שגוי</li>
            <li>לבקש מחיקת מידע (בכפוף לחוק)</li>
            <li>למשוך הסכמה לשימוש במידע</li>
          </ul>
          <p className="text-slate-700 leading-relaxed mt-4">
            לממש זכויות אלה, צור קשר: <strong>privacy@zerotouch.co.il</strong>
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Cookies</h2>
          <p className="text-slate-700 leading-relaxed">
            האתר משתמש ב-Cookies לשיפור חוויית המשתמש, ניתוח תעבורה ושמירת העדפות. ניתן לנהל את העדפות ה-Cookies דרך
            הגדרות הדפדפן שלך.
          </p>
        </section>

        {/* Contact */}
        <section className="border-t pt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">יצירת קשר</h2>
          <p className="text-slate-700 leading-relaxed">
            לשאלות או בקשות בנוגע למדיניות הפרטיות:
            <br />
            <strong>אימייל:</strong> privacy@zerotouch.co.il
            <br />
            <strong>טלפון:</strong> 03-1234567
            <br />
            <strong>דואר:</strong> רחוב תובל 4, תל אביב
          </p>
        </section>
      </div>

      <LegalTechFooter />
    </div>
  )
}
