"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { BACKEND_BASE_URL } from '@/variables'

export function EndOfCallTransition() {
  const router = useRouter()
  const { language } = useLanguage()
  const isRTL = language === "he"
  
  const processingMessagesHE = [
    "שומרת פרטי השיחה בשרת...",
    "מנתחת את השיחה...",
    "מצליבה נתונים עם ספר הליקויים...",
    "מחשבת גובה פיצוי...",
  ]

  const processingMessagesEN = [
    "Saving call details to server...",
    "Analyzing the call...",
    "Cross-referencing with disability registry...",
    "Calculating compensation amount...",
  ]

  const processingMessages = isRTL ? processingMessagesHE : processingMessagesEN
  
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [shouldNavigate, setShouldNavigate] = useState(false)
  
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle navigation in a separate effect to avoid conflicts
  useEffect(() => {
    if (shouldNavigate) {
      navigationTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          router.push(isComplete ? "/value-reveal" : "/ai-lawyer")
        }
      }, 500)
    }
    
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [shouldNavigate, isComplete, router])

  useEffect(() => {
    // Start processing immediately on mount
    isMountedRef.current = true
    fetchAndProcessCallData()
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current)
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current)
      }
    }
  }, [])

  const fetchAndProcessCallData = async () => {
    try {
      const token = localStorage.getItem("access_token")
      const caseId = localStorage.getItem("case_id")
      const callData = localStorage.getItem("openai_call_data")

      // Check authentication first
      if (!token) {
        console.error("❌ No access token found")
        const errorMsg = isRTL ? "נדרשת התחברות. מפנה לדף הבית..." : "Authentication required. Redirecting to home..."
        if (isMountedRef.current) {
          setError(errorMsg)
          setTimeout(() => {
            router.push("/")
          }, 1500)
        }
        return
      }

      if (!callData) {
        console.error("❌ Missing call data from OpenAI session")
        const errorMsg = isRTL ? "לא נמצא מידע על השיחה. נא להתחיל מחדש." : "Call data not found. Please start over."
        if (isMountedRef.current) {
          setError(errorMsg)
          setTimeout(() => {
            router.push("/ai-lawyer")
          }, 1500)
        }
        return
      }

      if (!caseId) {
        console.error("❌ Missing case_id in localStorage")
        const errorMsg = isRTL ? "לא נמצא מזהה תיק. נא להתחיל מחדש." : "Case ID not found. Please start over."
        if (isMountedRef.current) {
          setError(errorMsg)
          setTimeout(() => {
            router.push("/ai-lawyer")
          }, 1500)
        }
        return
      }

      console.log("🔄 Sending call data for analysis, case_id:", caseId)

      // Show processing messages with intervals
      messageIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setProcessingMessageIndex((prev) => {
            if (prev < processingMessages.length - 1) {
              return prev + 1
            }
            return prev
          })
        }
      }, 1500)

      // Parse call data
      const parsedCallData = JSON.parse(callData)
      
      // Send call data to backend for analysis
      console.log("📤 Posting call details to backend...")
      
      const response = await fetch(
        `${BACKEND_BASE_URL}/cases/${caseId}/call-details`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transcript: parsedCallData.transcript,
            duration: parsedCallData.duration,
            timestamp: parsedCallData.ended_at,
            call_id: `openai-${Date.now()}` // Generate unique ID for OpenAI calls
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ Failed to submit call data:", response.status, errorData)
        throw new Error(errorData.detail || `Failed to process call: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("✅ Call analysis complete:", result)

      if (result.status === "ok" && result.analysis) {
        console.log("📝 Call analyzed successfully!")
        
        const callSummary = result.analysis
        
        // Save to localStorage for the next page
        localStorage.setItem("call_summary", JSON.stringify(callSummary))
        localStorage.removeItem("openai_call_data") // Clean up

        // Clear interval
        if (messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current)
          messageIntervalRef.current = null
        }
        
        // Wait then mark as complete
        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (isMountedRef.current) {
          setIsComplete(true)
          setShouldNavigate(true)
        }
      } else {
        throw new Error("Analysis incomplete or missing from response")
      }

    } catch (err: any) {
      console.error("❌ Error processing call data:", err)
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current)
        messageIntervalRef.current = null
      }
      if (isMountedRef.current) {
        const errorMsg = err.message || (isRTL ? "אירעה שגיאה בעיבוד נתוני השיחה" : "An error occurred while processing call data")
        setError(errorMsg)
        setShouldNavigate(true)
      }
    }
  }

  // Render based on state - no AnimatePresence
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" dir={isRTL ? "rtl" : "ltr"}>
      {!isComplete ? (
        // Processing State
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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

          {/* Processing Message */}
          <motion.div
            key={`msg-${processingMessageIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-8 text-xl font-medium text-white text-center max-w-md"
          >
            {processingMessages[processingMessageIndex]}
          </motion.div>

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
      ) : (
        // Complete State
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center"
          >
            <div className="text-4xl">✓</div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="mt-6 text-xl font-medium text-green-400"
          >
            {isRTL ? "ניתוח השיחה הושלם" : "Call analysis complete"}
          </motion.p>
        </motion.div>
      )}
    </div>
  )
}
