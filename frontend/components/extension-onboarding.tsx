"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Download, Mail, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"

export default function ExtensionOnboarding() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const dir = language === "he" ? "rtl" : "ltr"

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleInstall = () => {
    window.open("https://chrome.google.com/webstore", "_blank")
    setTimeout(() => router.push("/dashboard"), 2000)
  }

  const handleSendEmail = () => {
    setEmailSent(true)
    setTimeout(() => router.push("/dashboard"), 2000)
  }

  const handleSkip = () => {
    router.push("/dashboard")
  }

  const benefits = [
    { key: "auto_sync", icon: CheckCircle2 },
    { key: "track_payments", icon: CheckCircle2 },
    { key: "no_faxes", icon: CheckCircle2 },
  ]

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4"
      dir={dir}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 md:p-12 shadow-2xl border-2 border-blue-100">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-6"
          >
            {t("extension.onboarding.headline")}
          </motion.h1>

          {/* Value Propositions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 mb-8"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.key}
                initial={{ opacity: 0, x: dir === "rtl" ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3 bg-green-50 p-4 rounded-xl border border-green-200"
              >
                <benefit.icon className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-lg font-medium text-slate-800">{t(`extension.onboarding.${benefit.key}`)}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Conditional Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            {isMobile ? (
              <>
                <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-xl mb-4">
                  <p className="text-center text-slate-700 font-medium mb-4">
                    {t("extension.onboarding.mobile_warning")}
                  </p>
                </div>

                {emailSent ? (
                  <div className="bg-green-50 border-2 border-green-200 p-6 rounded-xl text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-green-800 font-semibold">{t("extension.onboarding.email_sent")}</p>
                  </div>
                ) : (
                  <Button
                    onClick={handleSendEmail}
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
                  >
                    <Mail className={dir === "rtl" ? "w-5 h-5 mr-2" : "w-5 h-5 ml-2"} />
                    {t("extension.onboarding.send_email")}
                  </Button>
                )}

                <Button onClick={handleSkip} variant="outline" size="lg" className="w-full text-lg py-6 bg-transparent">
                  {t("extension.onboarding.continue_without")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                >
                  <Download className={dir === "rtl" ? "w-5 h-5 mr-2" : "w-5 h-5 ml-2"} />
                  {t("extension.onboarding.install_button")}
                </Button>

                <Button onClick={handleSkip} variant="outline" size="lg" className="w-full text-lg py-6 bg-transparent">
                  {t("extension.onboarding.skip_button")}
                </Button>
              </>
            )}
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}
