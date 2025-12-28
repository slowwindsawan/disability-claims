"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { BACKEND_BASE_URL } from '@/variables'

type CallState = "processing" | "complete"

const processingMessages = [
  "מנתחת את השיחה...",
  "מצליבה נתונים עם ספר הליקויים...",
  "מחשבת גובה פיצוי...",
]

export function EndOfCallTransition() {
  const router = useRouter()
  const [callState, setCallState] = useState<CallState>("processing")
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Start processing immediately on mount
    fetchAndAnalyzeCase()
  }, [])

  const fetchAndAnalyzeCase = async () => {
    try {
      const caseId = localStorage.getItem("case_id")
      const token = localStorage.getItem("access_token")

      if (!caseId || !token) {
        console.error("❌ Missing case_id or access_token")
        setError("לא נמצא ID תיק. נא להתחיל מחדש.")
        setTimeout(() => router.push("/ai-lawyer"), 2000)
        return
      }

      console.log("🔄 Analyzing case:", caseId)

      // Show processing messages with intervals
      const messageInterval = setInterval(() => {
        setProcessingMessageIndex((prev) => {
          if (prev < processingMessages.length - 1) {
            return prev + 1
          }
          return prev
        })
      }, 1500)

      // 1. CALL THE AGENT ENDPOINT TO ANALYZE THE CASE
      console.log("🤖 Triggering agent analysis...")
      const analyzeResponse = await fetch(
        `${BACKEND_BASE_URL}/cases/${caseId}/analyze`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!analyzeResponse.ok) {
        clearInterval(messageInterval)
        throw new Error(`Analysis failed: ${analyzeResponse.statusText}`)
      }

      const analysisResult = await analyzeResponse.json()
      console.log("✅ Agent analysis complete:", analysisResult)

      // 2. NOW FETCH THE UPDATED CASE WITH THE call_summary
      console.log("📦 Fetching updated case data...")
      const caseResponse = await fetch(
        `${BACKEND_BASE_URL}/cases/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!caseResponse.ok) {
        clearInterval(messageInterval)
        throw new Error(`Failed to fetch case data: ${caseResponse.statusText}`)
      }

      const caseData = await caseResponse.json()
      console.log("📦 Case data received:", caseData)

      // Extract call_summary from the response
      const callSummary = caseData.case?.call_summary

      if (!callSummary) {
        console.warn("⚠️ No call summary found after analysis")
        clearInterval(messageInterval)
        setError("ניתוח נכשל. אנא נסה שוב.")
        setTimeout(() => router.push("/ai-lawyer"), 2000)
        return
      }

      console.log("✅ Call summary extracted successfully")

      // Try to parse if it's a JSON string
      let parsedSummary = callSummary
      if (typeof callSummary === 'string') {
        try {
          parsedSummary = JSON.parse(callSummary)
          console.log("✅ Parsed JSON call summary")
        } catch (e) {
          console.log("ℹ️  Call summary is not JSON, using as string")
        }
      }

      // Store the processed data for value-reveal page
      localStorage.setItem("call_summary", JSON.stringify(parsedSummary))

      // Wait for all messages to complete, then transition
      await new Promise((resolve) => setTimeout(resolve, 4500))

      clearInterval(messageInterval)
      setCallState("complete")

      // Navigate to value-reveal with the call data
      router.push("/value-reveal")
    } catch (err: any) {
      console.error("❌ Error processing case:", err)
      setError(err.message || "אירעה שגיאה בעיבוד נתוני התיק")

      setTimeout(() => {
        router.push("/ai-lawyer")
      }, 3000)
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" dir="rtl">
      <AnimatePresence mode="wait">
        {/* Processing State */}
        {callState === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
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
                className="text-xl font-medium text-white text-center max-w-md"
              >
                {processingMessages[processingMessageIndex]}
              </motion.p>
            </AnimatePresence>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 px-6 py-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-center text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Progress Indicator */}
            <div className="mt-12 flex gap-2">
              {processingMessages.map((_, index) => (
                <motion.div
                  key={index}
                  className="h-2 w-2 rounded-full"
                  animate={{
                    backgroundColor:
                      index <= processingMessageIndex
                        ? "#2563eb"
                        : "rgba(100, 116, 139, 0.3)",
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
