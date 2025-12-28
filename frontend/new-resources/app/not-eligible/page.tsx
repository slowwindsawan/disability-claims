"use client"

import { motion } from "framer-motion"
import { XCircle, Home, MessageCircle, FileText, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { useUserContext } from "@/lib/user-context"

export default function NotEligiblePage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { intakeData } = useUserContext()
  const isRTL = language === "he"

  const reasons = intakeData.ineligibilityReasons || [
    t("not_eligible.reason_functional"),
    t("not_eligible.reason_documentation"),
    t("not_eligible.reason_period"),
  ]

  const nextSteps = [
    {
      icon: FileText,
      title: t("not_eligible.step_medical_title"),
      description: t("not_eligible.step_medical_desc"),
    },
    {
      icon: MessageCircle,
      title: t("not_eligible.step_documents_title"),
      description: t("not_eligible.step_documents_desc"),
    },
    {
      icon: Phone,
      title: t("not_eligible.step_contact_title"),
      description: t("not_eligible.step_contact_desc"),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-200">
            <XCircle className="h-12 w-12 text-slate-600" />
          </div>

          <h1 className="mb-4 text-3xl font-bold text-slate-900">{t("not_eligible.title")}</h1>

          <p className="mb-8 text-lg leading-relaxed text-slate-700">{t("not_eligible.message")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="mb-8 border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">{t("not_eligible.reasons_title")}</h2>
            <ul className="space-y-3">
              {reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-1 text-slate-400">×</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="mb-8 border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-xl font-semibold text-slate-900">{t("not_eligible.what_you_can_do")}</h2>
            <div className="space-y-6">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <step.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-900">{step.title}</h3>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Button
            size="lg"
            onClick={() => window.open("https://wa.me/972501234567", "_blank")}
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
          >
            <MessageCircle className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
            {t("not_eligible.contact_support")}
          </Button>

          <Button size="lg" variant="outline" onClick={() => router.push("/")} className="flex-1">
            <Home className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
            {t("not_eligible.return_home")}
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 text-center text-sm text-slate-500"
        >
          {t("not_eligible.footer_note")}
        </motion.p>
      </div>
    </div>
  )
}
