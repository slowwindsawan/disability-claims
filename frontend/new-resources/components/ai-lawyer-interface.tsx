"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Phone, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ClaimMaximizationModal } from "@/components/claim-maximization-modal"
import { useLanguage } from "@/lib/language-context"
import { useUserContext } from "@/lib/user-context"

type VoiceState = "idle" | "listening" | "speaking"
type ClaimType = "general" | "work-injury" | "unknown"

interface FloatingTag {
  id: number
  text: string
  timestamp: number
}

export function AILawyerInterface() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const isRTL = language === "he"
  const { updateIntakeData } = useUserContext()

  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [floatingTags, setFloatingTags] = useState<FloatingTag[]>([])
  const [isMicActive, setIsMicActive] = useState(false)
  const [claimType, setClaimType] = useState<ClaimType>("unknown")
  const [conversationStage, setConversationStage] = useState(0)
  const [showMaximizationModal, setShowMaximizationModal] = useState(false)
  const [eligibleBenefits, setEligibleBenefits] = useState({
    mobility: false,
    specialServices: false,
  })

  useEffect(() => {
    const keywords = ["עבודה", "עבודתי", "מעסיק", "תאונה ב", "בזמן העבודה", "במקום העבודה"]

    const conversationInterval = setInterval(() => {
      setConversationStage((prev) => {
        const next = prev + 1

        if (next === 3 && Math.random() > 0.5) {
          setClaimType("work-injury")
        }

        if (next === 5) {
          const hasLegIssues = Math.random() > 0.5
          const hasDependency = Math.random() > 0.6

          setEligibleBenefits({
            mobility: hasLegIssues,
            specialServices: hasDependency,
          })
        }

        return next
      })
    }, 5000)

    return () => clearInterval(conversationInterval)
  }, [])

  useEffect(() => {
    const tagTexts = ["אבחנה זוהתה", "סעיף 37", "תביעה רפואית", "זכאות מלאה"]
    let tagId = 0

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newTag: FloatingTag = {
          id: tagId++,
          text: tagTexts[Math.floor(Math.random() * tagTexts.length)],
          timestamp: Date.now(),
        }
        setFloatingTags((prev) => [...prev.slice(-2), newTag])
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const toggleMic = () => {
    setIsMicActive(!isMicActive)
    setVoiceState(isMicActive ? "idle" : "listening")
  }

  const checkEligibility = (): boolean => {
    const randomCheck = Math.random()

    if (randomCheck > 0.8) {
      updateIntakeData({
        isEligible: false,
        ineligibilityReasons: [
          t("not_eligible.reason_functional"),
          t("not_eligible.reason_documentation"),
          t("not_eligible.reason_period"),
        ],
      })
      return false
    }

    updateIntakeData({
      isEligible: true,
    })
    return true
  }

  const handleHangup = () => {
    const isEligible = checkEligibility()

    if (!isEligible) {
      router.push("/not-eligible")
      return
    }

    if (claimType === "work-injury") {
      router.push("/work-injury-calculator")
    } else if (eligibleBenefits.mobility || eligibleBenefits.specialServices) {
      setShowMaximizationModal(true)
    } else {
      router.push("/end-of-call")
    }
  }

  const handleSaveAndExit = () => {
    router.push("/incomplete-intake")
  }

  return (
    <>
      <div className="relative h-screen w-full overflow-hidden bg-slate-950" dir={isRTL ? "rtl" : "ltr"}>
        <div className="absolute inset-0">
          <img
            src="/professional-female-lawyer.png"
            alt="עורכת דין"
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
        </div>

        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center justify-between px-8 py-6"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 backdrop-blur-sm ring-2 ring-blue-600/30">
              <span className="text-lg font-semibold text-blue-400">של</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">עו״ד שרה לוי</h2>
              <p className="text-sm text-slate-400">ייעוץ משפטי AI</p>
            </div>
          </div>

          <Badge className="gap-2 border-green-500/30 bg-green-950/50 px-4 py-2 text-green-400 backdrop-blur-md">
            <Shield className="h-4 w-4" />
            <span>מוצפן מקצה לקצה</span>
          </Badge>
        </motion.header>

        <div className="absolute left-8 top-24 z-20 space-y-3">
          <AnimatePresence mode="popLayout">
            {floatingTags.map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, x: -50, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="rounded-xl border border-blue-500/30 bg-slate-900/60 px-4 py-3 shadow-2xl backdrop-blur-xl"
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <p className="text-sm font-medium text-blue-300">{tag.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative">
            {voiceState !== "idle" && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      voiceState === "listening"
                        ? "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%)",
                  }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      voiceState === "listening"
                        ? "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)",
                  }}
                  animate={{
                    scale: [1, 1.6, 1],
                    opacity: [0.4, 0, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                />
              </>
            )}

            <motion.div
              className="relative flex h-48 w-48 items-center justify-center rounded-full"
              style={{
                background:
                  voiceState === "listening"
                    ? "radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)"
                    : voiceState === "speaking"
                      ? "radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(37, 99, 235, 0.1) 100%)"
                      : "radial-gradient(circle, rgba(71, 85, 105, 0.3) 0%, rgba(71, 85, 105, 0.1) 100%)",
                backdropFilter: "blur(40px)",
                border: "2px solid",
                borderColor:
                  voiceState === "listening"
                    ? "rgba(34, 197, 94, 0.4)"
                    : voiceState === "speaking"
                      ? "rgba(37, 99, 235, 0.4)"
                      : "rgba(71, 85, 105, 0.4)",
                boxShadow:
                  voiceState === "listening"
                    ? "0 0 60px rgba(34, 197, 94, 0.3)"
                    : voiceState === "speaking"
                      ? "0 0 60px rgba(37, 99, 235, 0.3)"
                      : "0 0 30px rgba(71, 85, 105, 0.2)",
              }}
              animate={{
                scale: voiceState !== "idle" ? [1, 1.05, 1] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: voiceState !== "idle" ? Number.POSITIVE_INFINITY : 0,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="h-32 w-32 rounded-full"
                style={{
                  background:
                    voiceState === "listening"
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : voiceState === "speaking"
                        ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                        : "linear-gradient(135deg, #475569, #334155)",
                }}
                animate={{
                  opacity: voiceState !== "idle" ? [0.8, 1, 0.8] : 0.6,
                }}
                transition={{
                  duration: 1,
                  repeat: voiceState !== "idle" ? Number.POSITIVE_INFINITY : 0,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            <motion.p
              className="mt-6 text-center text-lg font-medium"
              style={{
                color: voiceState === "listening" ? "#22c55e" : voiceState === "speaking" ? "#2563eb" : "#94a3b8",
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 1.5,
                repeat: voiceState !== "idle" ? Number.POSITIVE_INFINITY : 0,
                ease: "easeInOut",
              }}
            >
              {voiceState === "listening" && "מקשיב..."}
              {voiceState === "speaking" && "מדבר..."}
              {voiceState === "idle" && "לחץ על המיקרופון להתחלה"}
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-8"
        >
          <Button
            size="lg"
            onClick={toggleMic}
            className="h-20 w-20 rounded-full border-2 p-0 shadow-2xl transition-all duration-300"
            style={{
              background: isMicActive ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(30, 41, 59, 0.8)",
              borderColor: isMicActive ? "#22c55e" : "rgba(71, 85, 105, 0.5)",
              backdropFilter: "blur(20px)",
              boxShadow: isMicActive ? "0 0 40px rgba(34, 197, 94, 0.4)" : "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            <Mic className="h-8 w-8 text-white" />
          </Button>

          <Button
            size="lg"
            variant="destructive"
            onClick={handleHangup}
            className="h-20 w-20 rounded-full border-2 border-red-500/50 bg-gradient-to-br from-red-600 to-red-700 p-0 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:from-red-700 hover:to-red-800"
            style={{
              boxShadow: "0 10px 30px rgba(220, 38, 38, 0.3)",
            }}
          >
            <Phone className="h-8 w-8 text-white" />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-12 left-12 z-10"
        >
          <Button
            variant="outline"
            onClick={handleSaveAndExit}
            className="border-slate-600/50 bg-slate-900/40 text-slate-300 backdrop-blur-md hover:bg-slate-800/60"
          >
            שמור וצא
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-t border-slate-700/50 py-3 px-6"
        >
          <p className="text-center text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300">הבהרה:</span> ZeroTouch הינה מערכת טכנולוגית לניהול מידע
            ואינה מספקת ייעוץ משפטי. השירות מהווה כלי עזר להגשת תביעות באופן עצמאי. המידע שניתן באמצעות המערכת אינו
            מהווה תחליף לייעוץ משפטי מקצועי מעורך דין מוסמך.
          </p>
        </motion.div>
      </div>

      <ClaimMaximizationModal
        isOpen={showMaximizationModal}
        onClose={() => setShowMaximizationModal(false)}
        eligibleBenefits={eligibleBenefits}
      />
    </>
  )
}
