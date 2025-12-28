"use client"

import Link from "next/link"
import { FileText } from "lucide-react"
import LegalTechFooter from "@/components/legaltech-footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="bg-gradient-to-b from-slate-50 to-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">תקנון ותנאי שימוש</h1>
          <p className="text-lg text-slate-600">עדכון אחרון: ינואר 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 prose prose-lg prose-slate max-w-none">
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. כללי</h2>
          <p className="text-slate-700 leading-relaxed">
            ברוכים הבאים ל-ZeroTouch. השימוש באתר זה ובשירותים הכרוכים בו כפוף לתנאי שימוש אלה. המשך השימוש באתר מהווה
            הסכמה מלאה לתנאים אלה.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. הגדרות</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>
              <strong>החברה:</strong> ZeroTouch Ltd., ח.פ. 516123456
            </li>
            <li>
              <strong>השירות:</strong> מערכת טכנולוגית למיצוי זכויות רפואיות
            </li>
            <li>
              <strong>המשתמש:</strong> כל אדם המשתמש באתר או ברוכש את השירות
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">3. תיאור השירות</h2>
          <p className="text-slate-700 leading-relaxed">
            ZeroTouch מספקת מערכת טכנולוגית לניהול מידע והגשת תביעות למוסד לביטוח לאומי.{" "}
            <strong>השירות אינו מהווה ייעוץ משפטי</strong> ואינו מחליף עורך דין. כל המידע המוצג באתר הוא למטרות מידע
            כללי בלבד.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-6">
            <p className="text-sm text-amber-900 font-medium">
              לידיעתך: הפנייה למוסד לביטוח לאומי ולגופים המוסמכים יכולה להיעשות על ידך באופן עצמאי וללא תשלום. השירות
              בחברה כרוך בתשלום כמפורט בהסכם ההתקשרות.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">4. תשלום ומחירים</h2>
          <p className="text-slate-700 leading-relaxed mb-3">דמי הטיפול הם כדלקמן:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li>פתיחת תיק מנהלי - מימוש זכויות: 800 ש"ח</li>
            <li>תוספת תביעת ניידות: 150 ש"ח</li>
            <li>תוספת שירותים מיוחדים: 150 ש"ח</li>
          </ul>
          <p className="text-slate-700 leading-relaxed mt-3">
            המחירים כוללים מע"מ. התשלום מתבצע באמצעות כרטיס אשראי או העברה בנקאית.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">5. פרטיות והגנת מידע</h2>
          <p className="text-slate-700 leading-relaxed">
            אנו מתחייבים לשמור על פרטיות המידע שלך. כל המידע מאוחסן בהצפנה מלאה ולא יועבר לצדדים שלישיים ללא הסכמתך
            המפורשת, למעט במקרים הנדרשים על פי חוק או לצורך מתן השירות.
          </p>
          <p className="text-slate-700 leading-relaxed mt-3">
            למידע נוסף, ראה את{" "}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
              מדיניות הפרטיות
            </Link>{" "}
            שלנו.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">6. ביטול והחזרים</h2>
          <p className="text-slate-700 leading-relaxed">
            ניתן לבטל את השירות תוך 14 יום מרגע התשלום וקבלת החזר מלא, בתנאי שלא הוגשה תביעה בפועל למוסד לביטוח לאומי.
            למידע נוסף, ראה{" "}
            <Link href="/refunds" className="text-blue-600 hover:text-blue-700 underline">
              מדיניות ביטולים
            </Link>
            .
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">7. הגבלת אחריות</h2>
          <p className="text-slate-700 leading-relaxed">
            החברה לא תישא באחריות לכל נזק ישיר, עקיף, מקרי או תוצאתי הנובע משימוש או אי-יכולת להשתמש בשירות. המערכת
            מספקת סיוע טכנולוגי בלבד ואינה אחראית לתוצאות התביעה הסופיות במוסד לביטוח לאומי.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">8. שינויים בתקנון</h2>
          <p className="text-slate-700 leading-relaxed">
            אנו שומרים לעצמנו את הזכות לעדכן תקנון זה מעת לעת. שינויים יפורסמו באתר ויכנסו לתוקף מיד עם פרסומם.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">9. יצירת קשר</h2>
          <p className="text-slate-700 leading-relaxed">
            לשאלות או הבהרות בנוגע לתקנון זה, ניתן ליצור קשר:
            <br />
            <strong>אימייל:</strong> legal@zerotouch.co.il
            <br />
            <strong>טלפון:</strong> 03-1234567
          </p>
        </section>
      </div>

      <LegalTechFooter />
    </div>
  )
}
