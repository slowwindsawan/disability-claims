"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type CallState = "active" | "processing"

const processingMessages = ["מנתחת את השיחה...", "מצליבה נתונים עם ספר הליקויים...", "מחשבת גובה פיצוי..."]

export function EndOfCallTransition() {
  const router = useRouter()
  const [callState, setCallState] = useState<CallState>("active")
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0)

  useEffect(() => {
    if (callState === "processing") {
      const interval = setInterval(() => {
        setProcessingMessageIndex((prev) => {
          if (prev < processingMessages.length - 1) {
            return prev + 1
          }
          return prev
        })
      }, 1000)

      const timeout = setTimeout(() => {
        router.push("/value-reveal")
      }, 3000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [callState, router])

  const handleHangup = () => {
    setCallState("processing")
  }

  return (
    <div className="relative h-screen w-full overflow-hidden" dir="rtl">
      <AnimatePresence mode="wait">
        {/* State 1: Active Call */}
        {callState === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-slate-950"
          >
            {/* Background - Blurred Video Overlay */}
            <div className="absolute inset-0">
              <img
                src="/professional-female-lawyer.png"
                alt="עורכת דין"
                className="h-full w-full object-cover opacity-30 blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
            </div>

            {/* Center - Glowing Voice Orb */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
              <div className="relative">
                {/* Outer Pulse Rings */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)",
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
                    background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)",
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

                {/* Main Voice Orb */}
                <motion.div
                  className="relative flex h-48 w-48 items-center justify-center rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)",
                    backdropFilter: "blur(40px)",
                    border: "2px solid rgba(34, 197, 94, 0.4)",
                    boxShadow: "0 0 60px rgba(34, 197, 94, 0.3)",
                  }}
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  {/* Inner Orb */}
                  <motion.div
                    className="h-32 w-32 rounded-full"
                    style={{
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    }}
                    animate={{
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                {/* Voice State Text */}
                <motion.p
                  className="mt-6 text-center text-lg font-medium text-green-500"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  מקשיבה לך...
                </motion.p>
              </div>
            </div>

            {/* Bottom - Hangup Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2"
            >
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
          </motion.div>
        )}

        {/* State 2: Processing */}
        {callState === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black"
          >
            {/* Spinner */}
            <motion.div
              className="mb-8 h-16 w-16 rounded-full border-4 border-blue-600/20 border-t-blue-600"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />

            {/* Processing Messages */}
            <AnimatePresence mode="wait">
              <motion.p
                key={processingMessageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-xl font-medium text-white"
              >
                {processingMessages[processingMessageIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
