"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Shield, Check, CheckCircle, Users, TrendingUp, Clock, Award, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import WhatsAppSupportWidget from "@/components/whatsapp-support-widget"
import LegalTechFooter from "@/components/legaltech-footer"
import { useLanguage } from "@/lib/language-context"
import { useUserContext } from "@/lib/user-context"

export default function Home() {
  const [showQuiz, setShowQuiz] = useState(false)
  const [otpState, setOtpState] = useState<"phone" | "code" | "success" | "wizard">("phone")
  const [phone, setPhone] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", ""])
  const [wizardStep, setWizardStep] = useState(1)
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const router = useRouter()
  const { language, t } = useLanguage()
  const { intakeData, updateIntakeData } = useUserContext()
  const isRTL = language === "he"

  const questions = [t("questionnaire.question1"), t("questionnaire.question2"), t("questionnaire.question3")]

  const handleStartQuiz = () => {
    setShowQuiz(true)
    setOtpState("phone")
  }

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length >= 9) {
      setOtpState("code")
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...otpCode]
      newCode[index] = value
      setOtpCode(newCode)

      if (value && index < 3) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }

      if (newCode.every((digit) => digit !== "") && newCode.join("").length === 4) {
        setTimeout(() => {
          setOtpState("success")
          setTimeout(() => {
            if (isReturningUser) {
              router.push("/dashboard")
            } else {
              setOtpState("wizard")
            }
          }, 1500)
        }, 300)
      }
    }
  }

  const handleAnswer = (answer: boolean) => {
    setAnswers([...answers, answer])
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setTimeout(() => {
        router.push("/medical-documents")
      }, 500)
    }
  }

  const handleWizardNext = () => {
    if (wizardStep < 6) {
      setWizardStep(wizardStep + 1)
    } else {
      router.push("/medical-documents")
    }
  }

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1)
    }
  }

  const canProceed = () => {
    switch (wizardStep) {
      case 1:
        return intakeData.userStatus !== null
      case 2:
        return intakeData.claimReason !== null
      case 3:
        return intakeData.isWorkRelated !== null
      case 4:
        return intakeData.incomeBracket !== null
      case 5:
        return intakeData.functionalImpacts.length > 0
      case 6:
        return intakeData.documentsReady !== null
      default:
        return false
    }
  }

  const toggleFunctionalImpact = (impact: string) => {
    const current = intakeData.functionalImpacts
    const updated = current.includes(impact) ? current.filter((i) => i !== impact) : [...current, impact]
    updateIntakeData({ functionalImpacts: updated })
  }

  const progress = ((wizardStep - 1) / 6) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {!showQuiz ? (
        <>
          {/* Hero Section */}
          <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1
                className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight"
                style={{ direction: isRTL ? "rtl" : "ltr" }}
              >
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                {t("hero.subtitle")}
              </p>
              <Button onClick={handleStartQuiz} size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                {t("hero.cta")}
              </Button>

              <p
                className="text-xs text-slate-500 mt-6 max-w-2xl mx-auto leading-relaxed"
                style={{ direction: isRTL ? "rtl" : "ltr" }}
              >
                {t("hero.legal_notice")}
              </p>
            </motion.div>
          </section>

          {/* How It Works Section */}
          <section className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className={`text-center mb-16 text-${isRTL ? "right" : "left"} md:text-center`}
              >
                <h2 className="text-4xl font-bold text-slate-900 mb-4" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("how_it_works.title")}
                </h2>
                <p className="text-xl text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("how_it_works.subtitle")}
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: CheckCircle,
                    title: t("how_it_works.check_eligibility"),
                    description: t("how_it_works.check_eligibility_description"),
                    step: "01",
                  },
                  {
                    icon: Users,
                    title: t("how_it_works.ai_legal_consultant"),
                    description: t("how_it_works.ai_legal_consultant_description"),
                    step: "02",
                  },
                  {
                    icon: TrendingUp,
                    title: t("how_it_works.compensation"),
                    description: t("how_it_works.compensation_description"),
                    step: "03",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="relative mb-6">
                      <div className="absolute -top-4 -right-4 text-6xl font-bold text-blue-50">{item.step}</div>
                      <div className="relative bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                        <item.icon className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {item.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Statistics Section */}
          <section className="py-32 bg-white">
            <div className="max-w-5xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className={`text-center mb-16 text-${isRTL ? "right" : "left"} md:text-center`}
              >
                <h2
                  className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
                  style={{ direction: isRTL ? "rtl" : "ltr" }}
                >
                  {t("stats.title")}
                </h2>
                <p className="text-xl text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("stats.subtitle")}
                </p>
              </motion.div>

              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { value: "12,000+", label: t("stats.happy_clients"), icon: Users, color: "text-blue-600" },
                  {
                    value: "₪42,500",
                    label: t("stats.average_compensation"),
                    icon: TrendingUp,
                    color: "text-green-600",
                  },
                  {
                    value: "3 " + t("stats.time_unit"),
                    label: t("stats.check_time"),
                    icon: Clock,
                    color: "text-purple-600",
                  },
                  { value: "94%", label: t("stats.success_rate"), icon: Award, color: "text-orange-600" },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4`}>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                    <div className={`text-3xl md:text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                    <div className="text-sm text-slate-600">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-slate-900 mb-4" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("benefits.title")}
                </h2>
                <p className="text-xl text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("benefits.subtitle")}
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: Clock,
                    title: t("benefits.speed"),
                    description: t("benefits.speed_description"),
                    color: "text-blue-600",
                  },
                  {
                    icon: DollarSign,
                    title: t("benefits.cost"),
                    description: t("benefits.cost_description"),
                    color: "text-green-600",
                  },
                  {
                    icon: Shield,
                    title: t("benefits.availability"),
                    description: t("benefits.availability_description"),
                    color: "text-purple-600",
                  },
                  {
                    icon: CheckCircle,
                    title: t("benefits.transparency"),
                    description: t("benefits.transparency_description"),
                    color: "text-orange-600",
                  },
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-slate-50 p-6 rounded-xl hover:shadow-lg transition-shadow"
                  >
                    <benefit.icon className={`w-12 h-12 ${benefit.color} mb-4`} />
                    <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 text-sm" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {benefit.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-24 bg-gradient-to-br from-blue-600 to-blue-700">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2
                  className="text-4xl md:text-5xl font-bold text-white mb-6"
                  style={{ direction: isRTL ? "rtl" : "ltr" }}
                >
                  {t("cta.title")}
                </h2>
                <p className="text-xl text-blue-100 mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("cta.subtitle")}
                </p>
                <Button
                  onClick={handleStartQuiz}
                  size="lg"
                  className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-100"
                >
                  {t("cta.button")}
                </Button>
              </motion.div>
            </div>
          </section>

          <LegalTechFooter />
        </>
      ) : (
        <main className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="w-full max-w-md p-8 md:p-12 shadow-2xl bg-white rounded-2xl">
            <AnimatePresence mode="wait">
              {otpState === "phone" && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("otp.phone.title")}
                  </h2>
                  <p className="text-slate-600 text-sm mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("otp.phone.subtitle")}
                  </p>

                  <form onSubmit={handlePhoneSubmit} className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Input
                        type="tel"
                        placeholder="50-123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 text-right text-lg py-6"
                        maxLength={10}
                      />
                      <div className="bg-slate-100 px-4 py-3 rounded-lg text-slate-600 font-medium">972+</div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
                      disabled={phone.length < 9}
                    >
                      {t("otp.phone.send_code")}
                    </Button>
                  </form>

                  <div className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-600">
                    <Shield className="w-4 h-4" />
                    <span>{t("otp.phone.secure_connection")}</span>
                  </div>
                </motion.div>
              )}

              {otpState === "code" && (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("otp.code.title")}
                  </h2>
                  <p className="text-slate-600 text-sm mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("otp.code.subtitle")}
                    <span className="font-medium text-slate-900 mx-1">972-{phone}</span>
                  </p>

                  <div className="flex justify-center gap-3 mb-8">
                    {otpCode.map((digit, index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        className="w-14 h-14 text-center text-2xl font-bold"
                      />
                    ))}
                  </div>

                  <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                    {t("otp.code.resend_code")}
                  </Button>
                </motion.div>
              )}

              {otpState === "success" && (
                <motion.div
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-10 h-10 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("otp.success.title")}
                  </h2>
                  <p className="text-slate-600 text-sm mt-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("otp.success.subtitle")}
                  </p>
                </motion.div>
              )}

              {otpState === "wizard" && (
                <motion.div
                  key="wizard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Progress Bar */}
                  <div className="mb-8">
                    <div className="flex justify-between mb-2 text-sm text-slate-600">
                      <span>
                        {t("wizard.progress").replace("{current}", String(wizardStep)).replace("{total}", "6")}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Wizard Steps */}
                  {wizardStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h2
                        className="text-2xl font-bold text-slate-900 mb-2"
                        style={{ direction: isRTL ? "rtl" : "ltr" }}
                      >
                        {t("wizard.step1.title")}
                      </h2>
                      <p className="text-slate-600 text-sm mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                        {t("wizard.step1.subtitle")}
                      </p>
                      <div className="space-y-3">
                        {["employee", "student", "soldier_active", "soldier_reserve", "pensioner"].map((status) => (
                          <button
                            key={status}
                            onClick={() => updateIntakeData({ userStatus: status })}
                            className={`w-full p-4 rounded-xl border-2 transition-all ${
                              intakeData.userStatus === status
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300 bg-transparent"
                            }`}
                          >
                            <div className="text-slate-900 font-medium">
                              {t(
                                `wizard.step1.${status as "employee" | "student" | "soldier_active" | "soldier_reserve" | "pensioner"}`,
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h2
                        className="text-2xl font-bold text-slate-900 mb-2"
                        style={{ direction: isRTL ? "rtl" : "ltr" }}
                      >
                        {t("wizard.step2.title")}
                      </h2>
                      <p className="text-slate-600 text-sm mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                        {t("wizard.step2.subtitle")}
                      </p>
                      <div className="space-y-3">
                        {["accident", "illness", "adhd", "service_injury", "hostile_action"].map((reason) => (
                          <button
                            key={reason}
                            onClick={() => updateIntakeData({ claimReason: reason })}
                            className={`w-full p-4 rounded-xl border-2 transition-all ${
                              intakeData.claimReason === reason
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300 bg-transparent"
                            }`}
                          >
                            <div className="text-slate-900 font-medium">
                              {t(
                                `wizard.step2.${reason as "accident" | "illness" | "adhd" | "service_injury" | "hostile_action"}`,
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h2
                        className="text-2xl font-bold text-slate-900 mb-2"
                        style={{ direction: isRTL ? "rtl" : "ltr" }}
                      >
                        {t("wizard.step3.title")}
                      </h2>
                      <p className="text-slate-600 text-sm mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                        {t("wizard.step3.subtitle")}
                      </p>
                      <div className="space-y-3">
                        <button
                          onClick={() => updateIntakeData({ isWorkRelated: true })}
                          className={`w-full p-4 rounded-xl border-2 transition-all ${
                            intakeData.isWorkRelated === true
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 bg-transparent"
                          }`}
                        >
                          <div className="text-slate-900 font-medium">{t("wizard.step3.yes")}</div>
                        </button>
                        <button
                          onClick={() => updateIntakeData({ isWorkRelated: false })}
                          className={`w-full p-4 rounded-xl border-2 transition-all ${
                            intakeData.isWorkRelated === false
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 bg-transparent"
                          }`}
                        >
                          <div className="text-slate-900 font-medium">{t("wizard.step3.no")}</div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h2
                        className="text-2xl font-bold text-slate-900 mb-2"
                        style={{ direction: isRTL ? "rtl" : "ltr" }}
                      >
                        {t("wizard.step4.title")}
                      </h2>
                      <p className="text-slate-600 text-sm mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                        {t("wizard.step4.subtitle")}
                      </p>
                      <div className="space-y-3">
                        <button
                          onClick={() => updateIntakeData({ incomeBracket: "low" })}
                          className={`w-full p-4 rounded-xl border-2 transition-all ${
                            intakeData.incomeBracket === "low"
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 bg-transparent"
                          }`}
                        >
                          <div className="text-slate-900 font-medium">{t("wizard.step4.low")}</div>
                        </button>
                        <button
                          onClick={() => updateIntakeData({ incomeBracket: "high" })}
                          className={`w-full p-4 rounded-xl border-2 transition-all ${
                            intakeData.incomeBracket === "high"
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 bg-transparent"
                          }`}
                        >
                          <div className="text-slate-900 font-medium">{t("wizard.step4.high")}</div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 5 && (
                    <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h2
                        className="text-2xl font-bold text-slate-900 mb-2"
                        style={{ direction: isRTL ? "rtl" : "ltr" }}
                      >
                        {t("wizard.step5.title")}
                      </h2>
                      <p className="text-slate-600 text-sm mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                        {t("wizard.step5.subtitle")}
                      </p>
                      <div className="space-y-3">
                        {[
                          "concentration",
                          "memory",
                          "organization",
                          "social",
                          "mobility",
                          "sheram",
                          "vision",
                          "hearing",
                          "mental",
                          "chronic_pain",
                        ].map((impact) => (
                          <button
                            key={impact}
                            onClick={() => toggleFunctionalImpact(impact)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                              intakeData.functionalImpacts.includes(impact)
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300 bg-transparent"
                            }`}
                          >
                            <div className="text-slate-900 font-medium">
                              {t(
                                `wizard.step5.${impact as "concentration" | "memory" | "organization" | "social" | "mobility" | "sheram" | "vision" | "hearing" | "mental" | "chronic_pain"}`,
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      {intakeData.functionalImpacts.length === 0 && (
                        <p className="text-sm text-amber-600 mt-4">{t("wizard.step5.none_selected")}</p>
                      )}
                    </motion.div>
                  )}

                  {wizardStep === 6 && (
                    <motion.div key="step6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h2
                        className="text-2xl font-bold text-slate-900 mb-2"
                        style={{ direction: isRTL ? "rtl" : "ltr" }}
                      >
                        {t("wizard.step6.title")}
                      </h2>
                      <p className="text-slate-600 text-sm mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                        {t("wizard.step6.subtitle")}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => updateIntakeData({ documentsReady: true })}
                          className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                            intakeData.documentsReady === true
                              ? "border-green-500 bg-green-50"
                              : "border-slate-200 hover:border-slate-300 bg-transparent"
                          }`}
                        >
                          <div className="text-4xl mb-3">✅</div>
                          <div className="font-medium text-slate-900 text-lg">{t("wizard.step6.yes")}</div>
                        </button>
                        <button
                          onClick={() => updateIntakeData({ documentsReady: false })}
                          className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                            intakeData.documentsReady === false
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 bg-transparent"
                          }`}
                        >
                          <div className="text-4xl mb-3">📋</div>
                          <div className="font-medium text-slate-900 text-lg">{t("wizard.step6.no")}</div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-4 pt-4">
                    {wizardStep > 1 && (
                      <Button onClick={handleWizardBack} variant="outline" size="lg" className="flex-1 bg-transparent">
                        {t("wizard.back")}
                      </Button>
                    )}
                    <Button
                      onClick={handleWizardNext}
                      disabled={!canProceed()}
                      size="lg"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {wizardStep === 6 ? t("wizard.complete") : t("wizard.next")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      )}
      <WhatsAppSupportWidget />
    </div>
  )
}
