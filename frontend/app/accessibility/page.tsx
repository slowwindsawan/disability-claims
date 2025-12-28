"use client"
import { Shield, Eye, Keyboard, Volume2, MousePointer } from "lucide-react"
import LegalTechFooter from "@/components/legaltech-footer"

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">הצהרת נגישות</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            ZeroTouch מחויבת להנגיש את שירותיה לכלל האוכלוסייה, לרבות אנשים עם מוגבלות
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Commitment */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">המחויבות שלנו</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            אנו עושים מאמץ מתמיד להנגיש את האתר והשירותים שלנו בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות
            נגישות לשירות), התשע"ג-2013, ובהתאם לתקן הישראלי (ת"י 5568) ולתקן הבינלאומי WCAG 2.1 ברמת AA.
          </p>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">תכונות נגישות באתר</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Eye,
                title: "תמיכה בקוראי מסך",
                desc: "האתר תומך בתוכנות קוראי מסך כגון JAWS ו-NVDA",
              },
              {
                icon: Keyboard,
                title: "ניווט במקלדת",
                desc: "ניתן לנווט באתר באמצעות מקלדת בלבד (Tab, Enter, Arrow Keys)",
              },
              {
                icon: Volume2,
                title: "תיאורי טקסט",
                desc: "כל התמונות והאייקונים מלווים בתיאור טקסטואלי",
              },
              {
                icon: MousePointer,
                title: "ניגודיות גבוהה",
                desc: "כל הטקסטים עומדים בדרישות ניגודיות מינימלית",
              },
            ].map((feature, index) => (
              <div key={index} className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Accessibility Coordinator */}
        <section className="bg-blue-50 rounded-xl p-8 border border-blue-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">רכזת נגישות</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            במידה ונתקלת בבעיית נגישות באתר, או שיש לך הצעה לשיפור - נשמח לשמוע ממך.
          </p>
          <div className="space-y-2 text-slate-700">
            <p>
              <strong>שם:</strong> שירה כהן
            </p>
            <p>
              <strong>אימייל:</strong> accessibility@zerotouch.co.il
            </p>
            <p>
              <strong>טלפון:</strong> 03-1234567
            </p>
          </div>
        </section>

        {/* Last Updated */}
        <section className="text-sm text-slate-500 border-t pt-6">
          <p>הצהרה זו עודכנה לאחרונה: ינואר 2025</p>
        </section>
      </div>

      <LegalTechFooter />
    </div>
  )
}
