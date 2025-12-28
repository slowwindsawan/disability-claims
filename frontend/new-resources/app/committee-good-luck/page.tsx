"use client"

import { motion } from "framer-motion"
import { Sparkles, CheckCircle2, ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function CommitteeGoodLuckPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-16">
        {/* Hero Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Main Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-slate-900 mb-4">בהצלחה!</h1>
          <p className="text-2xl text-slate-600 leading-relaxed">אתה מוכן לועדה הרפואית</p>
        </motion.div>

        {/* Key Points to Remember */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="p-8 bg-white shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">נקודות אחרונות לזכור</h2>

            <div className="space-y-4">
              <div className="flex gap-4 p-5 bg-blue-50 rounded-lg border-r-4 border-blue-600">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-slate-900 mb-1">היה טבעי ואותנטי</p>
                  <p className="text-sm text-slate-600">
                    הרופאים רוצים להבין את המצב האמיתי שלך. דבר בכנות על הקשיים היומיומיים
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-blue-50 rounded-lg border-r-4 border-blue-600">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-slate-900 mb-1">הדגש את ההגבלות, לא את היכולות</p>
                  <p className="text-sm text-slate-600">
                    תאר מה אתה לא יכול לעשות בגלל המצב הרפואי, ולא מה אתה עדיין מצליח לעשות
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-blue-50 rounded-lg border-r-4 border-blue-600">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-slate-900 mb-1">תן דוגמאות קונקרטיות</p>
                  <p className="text-sm text-slate-600">
                    במקום "יש לי כאבים", אמור "לא יכול להרים את הילד שלי בגלל הכאב בגב"
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-blue-50 rounded-lg border-r-4 border-blue-600">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-slate-900 mb-1">אל תמזער את המצב</p>
                  <p className="text-sm text-slate-600">
                    הימנע מביטויים כמו "זה בסדר" או "אני מסתדר" - זה עלול ליצור רושם לא נכון
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-blue-50 rounded-lg border-r-4 border-blue-600">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-slate-900 mb-1">זכור את הסעיפים המרכזיים</p>
                  <p className="text-sm text-slate-600">
                    הקרנת כאב לרגל, קושי בהרמת ילדים, שינה לא רציפה - הנקודות שתרגלת בסימולציה
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Encouragement Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mb-8"
        >
          <Card className="p-8 bg-gradient-to-l from-blue-600 to-blue-700 text-white shadow-xl">
            <p className="text-xl leading-relaxed">
              אנחנו איתך בכל שלב. אחרי הועדה, עדכן אותנו בדשבורד ונמשיך לנהל את התיק בשבילך.
            </p>
          </Card>
        </motion.div>

        {/* CTA Button */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-14 text-lg font-bold shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזרה לדשבורד
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
