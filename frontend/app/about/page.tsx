"use client"

import Link from "next/link"
import { Shield, Target, Users, Zap, Award, TrendingUp } from "lucide-react"
import LegalTechFooter from "@/components/legaltech-footer"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-50 to-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            <span>מובילים בטכנולוגיה משפטית בישראל</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">אודות ZeroTouch</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            אנחנו משנים את הדרך שבה אזרחים ישראלים מממשים את זכויותיהם הרפואיות - בעזרת בינה מלאכותית, אוטומציה חכמה,
            וחוויית משתמש יוצאת דופן.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-6">
              <Target className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">המשימה שלנו</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              להפוך את תהליך מימוש הזכויות מביטוח לאומי לפשוט, שקוף ומהיר - ללא עורכי דין יקרים, ללא בירוקרטיה מיותרת,
              וללא תהליכים מסורבלים.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              אנחנו מאמינים שכל אזרח ישראלי זכאי לממש את זכויותיו הרפואיות בצורה מכובדת, מהירה ואפקטיבית.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
            <div className="space-y-6">
              {[
                { icon: Users, label: "12,000+ לקוחות מרוצים", color: "text-blue-600" },
                { icon: TrendingUp, label: "₪42,500 פיצוי ממוצע", color: "text-green-600" },
                { icon: Zap, label: "3 דקות זמן בדיקה", color: "text-purple-600" },
                { icon: Award, label: "94% שיעור הצלחה", color: "text-orange-600" },
              ].map((stat, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-white flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-lg font-semibold text-slate-900">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">הסיפור שלנו</h2>
          <div className="prose prose-lg max-w-none text-slate-700 space-y-4">
            <p className="leading-relaxed">
              ZeroTouch נוסדה בשנת 2023 על ידי צוות של יזמים, מפתחים, ויועצים משפטיים שחוו בעצמם את המורכבות והתסכול
              בתהליך הגשת תביעות לביטוח לאומי.
            </p>
            <p className="leading-relaxed">
              הבנו שהבעיה אינה במערכת הביטוח הלאומי עצמה, אלא בחוסר הנגישות והמידע. אנשים לא יודעים לאילו זכויות הם
              זכאים, לא מבינים את התהליך, ולא יודעים איך למלא נכון את הטפסים.
            </p>
            <p className="leading-relaxed">
              לכן פיתחנו מערכת ששואלת את השאלות הנכונות, מזהה אוטומטית את הזכויות הרלוונטיות, ממלאת את הטפסים בצורה
              מדויקת, ומכינה את המשתמש לכל שלב בתהליך.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">הערכים שלנו</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "שקיפות מלאה",
              desc: "אין עמלות נסתרות. אין הפתעות. כל המחירים ברורים מראש.",
              icon: Shield,
            },
            {
              title: "טכנולוגיה מתקדמת",
              desc: "אנחנו משקיעים באלגוריתמי AI מתקדמים כדי להעניק לך את השירות הטוב ביותר.",
              icon: Zap,
            },
            {
              title: "מיקוד בלקוח",
              desc: "כל החלטה שלנו מתבצעת מתוך שאלה: מה הכי טוב למשתמש?",
              icon: Target,
            },
          ].map((value, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <value.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{value.title}</h3>
              <p className="text-slate-600 leading-relaxed">{value.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">מוכנים להתחיל?</h2>
          <p className="text-xl text-blue-100 mb-8">בדוק את הזכאות שלך עכשיו - זה לוקח רק 3 דקות</p>
          <Link
            href="/"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-blue-50 transition-colors"
          >
            בדוק זכאות חינם
          </Link>
        </div>
      </div>

      <LegalTechFooter />
    </div>
  )
}
