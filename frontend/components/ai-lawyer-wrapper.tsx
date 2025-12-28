"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AILawyerInterface } from "@/components/ai-lawyer-interface"

interface Props {
  onComplete?: () => void
}

export function AILawyerWrapper({ onComplete }: Props) {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Set up global error handler for VAPI-related errors
    const handleError = (error: ErrorEvent) => {
      if (error.message.toLowerCase().includes("vapi") || 
          error.message.toLowerCase().includes("voice") ||
          error.message.toLowerCase().includes("audio")) {
        setHasError(true)
        setErrorMessage(error.message || "שגיאה בטעינת השיחה הקולית")
      }
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  const handleRetry = () => {
    setHasError(false)
    setErrorMessage("")
    setRetryCount(retryCount + 1)
  }

  const handleSkip = () => {
    if (onComplete) {
      onComplete()
    }
  }

  if (hasError) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md bg-white rounded-2xl p-8 text-center space-y-6"
          dir="rtl"
        >
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-orange-600" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              שגיאה בטעינת היועץ המשפטי
            </h2>
            <p className="text-slate-600">
              {errorMessage || "לא הצלחנו לטעון את השיחה הקולית. אנא נסה שוב."}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              נסה שוב
            </Button>
            
            <Button
              onClick={handleSkip}
              variant="outline"
              className="w-full"
              size="lg"
            >
              דלג על שיחה זו
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            אם הבעיה ממשיכה, אפשר להמשיך ללוח הבקרה ולחזור לשיחה מאוחר יותר.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div key={retryCount}>
      <AILawyerInterface />
    </div>
  )
}
