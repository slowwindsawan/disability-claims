"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Star, FileX, Search, ArrowLeft, Info, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"

export default function WorkInjuryCalculatorPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"
  const [salary, setSalary] = useState<string>("")
  const [dailyValue, setDailyValue] = useState<number>(0)
  const [disabilityGrant, setDisabilityGrant] = useState<number>(0)

  useEffect(() => {
    if (salary && !isNaN(Number(salary))) {
      const salaryNum = Number(salary)
      // Daily value calculation: average monthly salary / 30
      const daily = Math.round(salaryNum / 30)
      setDailyValue(daily)

      // Disability grant estimation (example: 100 days * daily value * disability percentage estimate)
      const grant = Math.round(daily * 100 * 0.5) // 50% disability example
      setDisabilityGrant(grant)
    } else {
      setDailyValue(0)
      setDisabilityGrant(0)
    }
  }, [salary])

  const handleContinue = () => {
    router.push("/work-injury-documents")
  }

  return (
    <div className="min-h-screen bg-white" dir={dir}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>{t("work_injury_calc.back")}</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{t("header.company_name")}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            <Calculator className="h-4 w-4" />
            <span>{t("work_injury_calc.detected")}</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-slate-900 md:text-5xl">{t("work_injury_calc.title")}</h1>
          <p className="text-xl text-slate-600">{t("work_injury_calc.subtitle")}</p>
        </motion.div>

        {/* Calculator Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12 overflow-hidden rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-xl"
        >
          <h2 className="mb-6 text-2xl font-bold text-slate-900">{t("work_injury_calc.calculator_title")}</h2>

          {/* Salary Input */}
          <div className="mb-8">
            <label htmlFor="salary" className="mb-2 block text-sm font-medium text-slate-700">
              {t("work_injury_calc.salary_label")}
            </label>
            <div className="relative">
              <Input
                id="salary"
                type="number"
                placeholder={t("work_injury_calc.salary_placeholder")}
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="h-14 text-lg"
              />
              <span
                className={`absolute top-1/2 -translate-y-1/2 text-lg font-medium text-slate-500 ${dir === "rtl" ? "left-4" : "right-4"}`}
              >
                ₪
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <Info className="h-3 w-3" />
              <span>{t("work_injury_calc.estimate_note")}</span>
            </div>
          </div>

          {/* Results */}
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <p className="mb-2 text-sm font-medium text-slate-600">{t("work_injury_calc.daily_value")}</p>
              <p className="text-3xl font-bold text-blue-600">
                {dailyValue > 0 ? `₪${dailyValue.toLocaleString()}` : "₪0"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("work_injury_calc.calculated_by_salary")}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6"
            >
              <p className="mb-2 text-sm font-medium text-amber-700">{t("work_injury_calc.disability_grant")}</p>
              <p className="text-3xl font-bold text-amber-600">
                {disabilityGrant > 0 ? `₪${disabilityGrant.toLocaleString()}` : "₪0"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("work_injury_calc.estimate_50_percent")}</p>
            </motion.div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">*</span> {t("work_injury_calc.disclaimer")}
            </p>
          </div>
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h3 className="mb-6 text-center text-lg font-semibold text-slate-700">
            {t("work_injury_calc.why_continue")}
          </h3>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Star, title: t("work_injury_calc.vip_treatment"), desc: t("work_injury_calc.vip_description") },
              {
                icon: FileX,
                title: t("work_injury_calc.save_bureaucracy"),
                desc: t("work_injury_calc.save_description"),
              },
              { icon: Search, title: t("work_injury_calc.free_expert"), desc: t("work_injury_calc.free_description") },
            ].map((benefit, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div
                  className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
                    idx === 0 ? "bg-blue-100" : idx === 1 ? "bg-green-100" : "bg-purple-100"
                  }`}
                >
                  <benefit.icon
                    className={`h-8 w-8 ${idx === 0 ? "text-blue-600" : idx === 1 ? "text-green-600" : "text-purple-600"}`}
                  />
                </div>
                <h4 className="mb-2 font-semibold text-slate-900">{benefit.title}</h4>
                <p className="text-sm text-slate-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Button
            onClick={handleContinue}
            size="lg"
            className="h-14 w-full text-lg font-semibold"
            disabled={!salary || Number(salary) <= 0}
          >
            {t("work_injury_calc.continue_button")}
          </Button>
          <p className="mt-3 text-center text-sm text-slate-500">{t("work_injury_calc.secure_note")}</p>
        </motion.div>
      </main>
    </div>
  )
}
