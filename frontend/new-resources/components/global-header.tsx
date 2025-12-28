"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Shield, Languages, Zap } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { LoginModal } from "@/components/login-modal"

export function GlobalHeader() {
  const { language, setLanguage, t } = useLanguage()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const isRTL = language === "he"

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowLoginModal(true)} className="flex items-center gap-2">
              <span className="hidden sm:inline">{t("header.personal_area")}</span>
              <Shield className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "he" ? "en" : "he")}
              className="flex items-center gap-2"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{language === "he" ? "EN" : "עב"}</span>
            </Button>
          </div>

          <Link href="/" className="flex items-center gap-2">
            {isRTL ? (
              <>
                <div className="text-2xl font-bold text-blue-600">ZeroTouch</div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-blue-600">ZeroTouch</div>
              </>
            )}
          </Link>
        </div>
      </motion.header>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}
