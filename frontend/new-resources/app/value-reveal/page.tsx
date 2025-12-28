"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Wallet, GraduationCap, Home, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"

export default function ValueRevealPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"

  const benefits = [
    {
      icon: Wallet,
      title: t("value_reveal.monthly_allowance"),
      value: "~₪4,200",
    },
    {
      icon: GraduationCap,
      title: t("value_reveal.degree_funding"),
      value: "",
    },
    {
      icon: Home,
      title: t("value_reveal.student_living"),
      value: t("value_reveal.student_living_amount"),
    },
    {
      icon: Shield,
      title: t("value_reveal.tax_exemption"),
      value: "",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col" dir={dir}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center pt-12 pb-8 px-4"
      >
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg mb-6">
          <span className="text-lg font-semibold text-foreground">{t("value_reveal.analysis_complete")}</span>
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">{t("value_reveal.potential_title")}</p>
      </motion.div>

      {/* Hero Section - Big Number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center py-12 px-4"
      >
        <div className="relative inline-block">
          {/* Glow effect behind the number */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 blur-3xl opacity-30 rounded-full"></div>

          <div className="relative">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-7xl md:text-9xl font-bold bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4"
            >
              ₪42,500
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-xl md:text-2xl font-medium text-slate-700"
            >
              {t("value_reveal.retroactive_payment")}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Benefits Grid - 2x2 Cards */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="max-w-5xl mx-auto px-4 pb-32"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
            >
              <Card className="p-8 bg-white/70 backdrop-blur-sm border-white/50 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                <div className={`flex items-start gap-4 ${dir === "rtl" ? "" : "flex-row-reverse"}`}>
                  <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl">
                    <benefit.icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className={`flex-1 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{benefit.title}</h3>
                    {benefit.value && <p className="text-2xl font-bold text-emerald-600">{benefit.value}</p>}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Sticky Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.3 }}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl"
      >
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Button
            onClick={() => {
              const caseId = localStorage.getItem("case_id")
              if (caseId) {
                router.push(`/checkout?case_id=${caseId}`)
              } else {
                router.push("/checkout")
              }
            }}
            size="lg"
            className="w-full bg-gradient-to-l from-slate-900 via-blue-900 to-slate-900 hover:from-slate-800 hover:via-blue-800 hover:to-slate-800 text-white py-8 text-xl font-bold rounded-xl shadow-2xl transition-all hover:shadow-3xl"
          >
            {t("value_reveal.cta_button")}
          </Button>
          <p className="text-center text-slate-600 text-sm mt-3">{t("value_reveal.cta_subtitle")}</p>
        </div>
      </motion.div>

      {/* Trust Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="fixed bottom-32 left-0 right-0 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-slate-100/80 backdrop-blur-sm rounded-full px-6 py-2">
          <span className="text-sm font-medium text-slate-600">{t("value_reveal.disability_sections")}</span>
          <Shield className="w-4 h-4 text-blue-600" />
        </div>
      </motion.div>
    </div>
  )
}
