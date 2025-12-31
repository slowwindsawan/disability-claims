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
      const callId = localStorage.getItem("vapi_call_id")
      const caseId = localStorage.getItem("case_id")

      if (!token || !callId) {
        console.error("❌ Missing access_token or vapi_call_id")
        const errorMsg = isRTL ? "לא נמצא מזהה שיחה. נא להתחיל מחדש." : "Call ID not found. Please start over."
        if (isMountedRef.current) {
          setError(errorMsg)
          setShouldNavigate(true)
        }
        return
      }

      if (!caseId) {
        console.error("❌ Missing case_id in localStorage")
        const errorMsg = isRTL ? "לא נמצא מזהה תיק. נא להתחיל מחדש." : "Case ID not found. Please start over."
        if (isMountedRef.current) {
          setError(errorMsg)
          setShouldNavigate(true)
        }
        return
      }

      console.log("🔄 Starting to poll for call details, call_id:", callId)

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

      // Poll for call details and analysis
      let attempts = 0
      const maxAttempts = 40  // Increased for job queue polling
      let pollSuccess = false
      let currentJobId: string | null = null

      while (attempts < maxAttempts && !pollSuccess && isMountedRef.current) {
        try {
          console.log(`🔄 Polling call details (attempt ${attempts + 1}/${maxAttempts})...`)
          
          const response = await fetch(
            `${BACKEND_BASE_URL}/vapi/call-details/${callId}?case_id=${caseId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          if (response.ok) {
            const result = await response.json()
            console.log("✅ Call details response:", result)

            // Check if analysis is complete (status === 'ok')
            if (result.status === "ok" && result.call && result.analysis) {
              console.log("📝 Call transcript ready and analyzed!")
              
              const callSummary = result.analysis
              
              if (!callSummary) {
                console.error("❌ NO CALL SUMMARY in analysis result!")
                throw new Error("No call summary in analysis result")
              }

              console.log("✅ Call summary extracted successfully")
              localStorage.setItem("call_summary", JSON.stringify(callSummary))
              localStorage.removeItem("vapi_call_id")

              pollSuccess = true
              
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
              return
            }
            
            // Check if analysis is in progress (status === 'analyzing')
            if (result.status === "analyzing" && result.job_id) {
              console.log(`⏳ Analysis in progress, job_id: ${result.job_id}`)
              currentJobId = result.job_id
              
              // Poll the job status endpoint instead
              const jobResponse = await fetch(
                `${BACKEND_BASE_URL}/jobs/${currentJobId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              )
              
              if (jobResponse.ok) {
                const jobStatus = await jobResponse.json()
                console.log(`📊 Job status: ${jobStatus.status}, progress: ${jobStatus.progress}%`)
                
                // Check if job completed
                if (jobStatus.status === "completed" && jobStatus.result) {
                  console.log("✅ Job completed! Using result from job...")
                  
                  // Use the analysis result directly from the job
                  const analysisResult = jobStatus.result.analysis || jobStatus.result
                  
                  if (analysisResult) {
                    console.log("✅ Analysis extracted from job result")
                    localStorage.setItem("call_summary", JSON.stringify(analysisResult))
                    localStorage.removeItem("vapi_call_id")
                    pollSuccess = true
                    
                    if (messageIntervalRef.current) {
                      clearInterval(messageIntervalRef.current)
                      messageIntervalRef.current = null
                    }
                    
                    await new Promise((resolve) => setTimeout(resolve, 2000))
                    
                    if (isMountedRef.current) {
                      setIsComplete(true)
                      setShouldNavigate(true)
                    }
                    return
                  }
                } else if (jobStatus.status === "failed") {
                  console.error("❌ Job failed:", jobStatus.error)
                  throw new Error(jobStatus.error || "Analysis job failed")
                }
                // If still running, continue polling
              }
            }
          }

          attempts++
          if (attempts < maxAttempts && isMountedRef.current) {
            // Shorter poll interval for job queue (3 seconds)
            await new Promise((resolve) => setTimeout(resolve, 3000))
          }
        } catch (err: any) {
          console.error("❌ Error polling call details:", err.message)
          attempts++
          if (attempts < maxAttempts && isMountedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 3000))
          }
        }
      }

      // Polling failed
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current)
        messageIntervalRef.current = null
      }
      
      if (isMountedRef.current) {
        const errorMsg = isRTL ? "לא הצלחנו לקבל את פרטי השיחה. נא לנסות שוב." : "Could not retrieve call details. Please try again."
        setError(errorMsg)
        setShouldNavigate(true)
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
