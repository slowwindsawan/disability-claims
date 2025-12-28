"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Phone, Shield, MicOff, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ClaimMaximizationModal } from "@/components/claim-maximization-modal"
import { useLanguage } from "@/lib/language-context"
import Vapi from "@vapi-ai/web"

type VoiceState = "idle" | "listening" | "speaking"
type ClaimType = "general" | "work-injury" | "unknown"

interface FloatingTag {
  id: number
  text: string
  timestamp: number
}

export function AILawyerInterface() {
  const router = useRouter()
  const { language } = useLanguage()
  const isRTL = language === "he"
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [floatingTags, setFloatingTags] = useState<FloatingTag[]>([])
  const [isMicActive, setIsMicActive] = useState(false)
  const [claimType, setClaimType] = useState<ClaimType>("unknown")
  const [showMaximizationModal, setShowMaximizationModal] = useState(false)
  const [eligibleBenefits, setEligibleBenefits] = useState({
    mobility: false,
    specialServices: false,
  })

  // VAPI Integration States
  const [isCallActive, setIsCallActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [transcript, setTranscript] = useState<string[]>([])
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const [estimatedClaimValue, setEstimatedClaimValue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const vapiRef = useRef<Vapi | null>(null)
  const callRef = useRef<any>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Initialize Vapi client
  useEffect(() => {
    // Clean up any existing instance first
    if (vapiRef.current) {
      try {
        vapiRef.current.stop()
      } catch (e) {
        console.warn("Error stopping existing VAPI instance:", e)
      }
      vapiRef.current = null
    }

    try {
      // Replace with your actual Vapi API key from dashboard.vapi.ai
      const vapi = new Vapi("ec4039c4-44ec-4972-b685-9b38ef710b4a")
      vapiRef.current = vapi

      // Event listeners
      vapi.on("call-start", () => {
        console.log("✅ Call started - WebSocket connected")
        setIsCallActive(true)
        setIsConnecting(false)
        setVoiceState("listening")
        setError(null)
      })

      vapi.on("call-end", () => {
        console.log("❌ Call ended - WebSocket disconnected")
        setIsCallActive(false)
        setIsConnecting(false)
        setVoiceState("idle")
        setIsMicActive(false)
        
        // Extract insights from call for routing logic
        if (callRef.current?.id) {
          console.log("Call completed, ID:", callRef.current?.id)
          // Save call ID and navigate to processing
          localStorage.setItem("vapi_call_id", callRef.current.id)
          console.log("💾 Saved VAPI call ID to localStorage:", callRef.current.id)
        }
        
        // Navigate to end-of-call processing after a brief delay to allow state updates
        setTimeout(() => {
          router.push("/end-of-call")
        }, 500)
      })

      vapi.on("speech-start", () => {
        console.log("🗣️ AI Speech started")
        setVoiceState("speaking")
      })

      vapi.on("speech-end", () => {
        console.log("🤐 AI Speech ended")
        setVoiceState("listening")
      })

      vapi.on("volume-level", (level: number) => {
        const volumePercent = level * 100
        setVolumeLevel(volumePercent)
      })

      vapi.on("message", (message: any) => {
        console.log("Message received:", message)

        // Handle transcript messages - only show final transcripts
        if (message.type === "transcript") {
          if (message.transcriptType === "final") {
            const speaker = message.role === "user" ? "אתה" : "עו״ד שרה לוי"
            const text = message.transcript
            if (text) {
              setTranscript((prev) => [...prev, `${speaker}: ${text}`])
              
              // Analyze transcript for keywords to determine claim type
              const keywords = ["עבודה", "עבודתי", "מעסיק", "תאונה", "במקום העבודה"]
              if (keywords.some(keyword => text.includes(keyword))) {
                setClaimType("work-injury")
              }
              
              // Check for eligibility benefits mentioned
              if (text.includes("רגל") || text.includes("הליכה") || text.includes("ניידות")) {
                setEligibleBenefits(prev => ({ ...prev, mobility: true }))
              }
              if (text.includes("עזרה") || text.includes("טיפול") || text.includes("תלות")) {
                setEligibleBenefits(prev => ({ ...prev, specialServices: true }))
              }
            }
          }
        } else if (message.type === "function-call") {
          console.log("Function called:", message.functionCall)
        }
      })

      vapi.on("error", (error: any) => {
        console.error("Vapi error:", error)

        let errorMessage = "אירעה שגיאה במהלך השיחה"

        if (error?.type === "daily-error" || error?.type === "daily-call-join-error") {
          const errMsg = String(error?.error?.message || error?.error?.msg || "")
          if (errMsg.includes("room was deleted") || errMsg.includes("room")) {
            errorMessage = "שגיאת חיבור לשיחה. נסה שוב בעוד כמה רגעים."
          }
        } else if (error?.type === "start-method-error") {
          errorMessage = "נכשל בהפעלת השיחה. נסה שוב."
        }

        setError(errorMessage)
        setIsConnecting(false)
        setIsCallActive(false)
        setVoiceState("idle")
      })
    } catch (err) {
      console.error("Failed to initialize VAPI:", err)
      setError("נכשל בטעינת מערכת השיחה. רענן את הדף.")
    }

    return () => {
      // Cleanup on unmount
      if (vapiRef.current) {
        try {
          vapiRef.current.stop()
        } catch (e) {
          console.warn("Cleanup error:", e)
        }
        vapiRef.current = null
      }
    }
  }, [])

  // Check microphone permission
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        })
        setHasMicPermission(result.state === "granted")

        result.onchange = () => {
          setHasMicPermission(result.state === "granted")
        }
      } catch (error) {
        // Fallback: try to access microphone directly
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((track) => track.stop())
          setHasMicPermission(true)
        } catch (err) {
          setHasMicPermission(false)
        }
      }
    }

    checkMicPermission()
    const interval = setInterval(checkMicPermission, 5000)

    return () => clearInterval(interval)
  }, [])

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [transcript])

  // Floating tags effect
  useEffect(() => {
    const tagTexts = ["אבחנה זוהתה", "סעיף 37", "תביעה רפואית", "זכאות מלאה"]
    let tagId = 0

    const interval = setInterval(() => {
      if (Math.random() > 0.7 && isCallActive) {
        const newTag: FloatingTag = {
          id: tagId++,
          text: tagTexts[Math.floor(Math.random() * tagTexts.length)],
          timestamp: Date.now(),
        }
        setFloatingTags((prev) => [...prev.slice(-2), newTag])
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [isCallActive])

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setHasMicPermission(true)
    } catch (error) {
      console.error("Microphone permission denied:", error)
      setError("נדרשת גישה למיקרופון כדי להתחיל שיחה.")
      setHasMicPermission(false)
    }
  }

  const startCall = async () => {
    if (!vapiRef.current) {
      setError("מערכת השיחה לא מוכנה. רענן את הדף.")
      return
    }

    if (hasMicPermission === false) {
      await requestMicPermission()
      return
    }

    setTranscript([])
    setIsConnecting(true)
    setProcessingStatus("מתחבר לעורך דין AI...")
    setError(null)

    try {
      callRef.current = await vapiRef.current.start({
        firstMessageMode: "assistant-speaks-first-with-model-generated-message",
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `אתה עורכת דין בכירה בשם "שרה לוי" המתמחה בתביעות נכות לביטוח לאומי.
תפקידך לערוך ראיון משפטי מקצועי עם התובע כדי לאסוף את כל המידע הדרוש לבנייתתביעה חזקה.

הנחיות:
- דבר עברית בלבד
- היה מקצועי, אמפטי ותומך
- שאל שאלה אחת בכל פעם
- התמקד באיסוף פרטים ספציפיים: תאריך תחילת הפגיעה, אבחנות רפואיות, השפעה תפקודית, מסמכים רפואיים
- זהה אם מדובר בפגיעה בעבודה או מחלה כללית
- חפש מצבים רפואיים נוספים שיכולים להגדיל את אחוז הנכות
- בדוק זכאות לשיקום תעסוקתי ושירותים מיוחדים

מטרות המרביות:
1. רטרואקטיביות - דחף את תאריך תחילת התביעה אחורה עד 12 חודשים
2. אחוז נכות - צבור מספר מצבים רפואיים כדי לעבור 20% נכות משוקללת
3. פגיעה ביכולת השתכרות - הוכח אובדן תפקודי של 50%-100%

התחל בברכה קצרה והצג את עצמך, ולאחר מכן התחל בראיון.`,
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: "paula",
        },
        analysisPlan: {
          structuredDataPlan: {
            enabled: true,
            schema: {
              type: "object",
              properties: {
                case_summary: {
                  type: "string",
                  description: "סיכום מקצועי של מצב התובע",
                },
                estimated_claim_amount: {
                  type: "string",
                  description: "הערכה של סכום התביעה",
                },
                documents_requested_list: {
                  type: "array",
                  description: "רשימת מסמכים נדרשים",
                  items: { type: "string" },
                },
                key_legal_points: {
                  type: "array",
                  description: "נקודות משפטיות מרכזיות",
                  items: { type: "string" },
                },
                claim_type: {
                  type: "string",
                  description: "סוג התביעה",
                  enum: ["work-injury", "general", "unknown"],
                },
              },
              required: ["case_summary", "key_legal_points"],
            },
            timeoutSeconds: 60,
          },
        },
      })

      setIsMicActive(true)
    } catch (error: any) {
      console.error("Failed to start call:", error)
      setError("נכשל בהפעלת השיחה. נסה שוב.")
      setIsConnecting(false)
    }
  }

  const endCall = () => {
    // Save call ID to localStorage BEFORE clearing the ref
    const vapiCallId = callRef.current?.id || ""
    if (vapiCallId) {
      localStorage.setItem("vapi_call_id", vapiCallId)
      console.log("💾 Saved VAPI call ID to localStorage:", vapiCallId)
    } else {
      console.warn("⚠️ No VAPI call ID available to save")
    }
    
    if (vapiRef.current && isCallActive) {
      try {
        vapiRef.current.stop()
      } catch (e) {
        console.warn("Error ending call:", e)
      }
      setIsCallActive(false)
      setIsMicActive(false)
      setVoiceState("idle")
    }
    
    callRef.current = null
  }

  const toggleMute = () => {
    if (vapiRef.current && isCallActive) {
      try {
        vapiRef.current.setMuted(!isMuted)
        setIsMuted(!isMuted)
      } catch (e) {
        console.warn("Error toggling mute:", e)
      }
    }
  }

  const toggleMic = () => {
    if (isCallActive) {
      toggleMute()
    } else {
      startCall()
    }
  }

  const handleHangup = () => {
    if (isCallActive) {
      endCall()
    }
    
    // Always navigate to end-of-call for processing
    router.push("/end-of-call")
  }

  const handleSaveAndExit = () => {
    if (isCallActive) {
      endCall()
    }
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

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-24 left-1/2 z-30 -translate-x-1/2 w-96"
          >
            <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl border border-red-400">
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs underline hover:no-underline"
              >
                סגור
              </button>
            </div>
          </motion.div>
        )}

        {/* Connecting Status */}
        {isConnecting && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-24 left-1/2 z-30 -translate-x-1/2"
          >
            <div className="bg-blue-500/90 backdrop-blur-md text-white px-6 py-3 rounded-xl shadow-2xl">
              <p className="text-sm font-medium">{processingStatus}</p>
            </div>
          </motion.div>
        )}

        {/* Volume Indicator - Only show during active call */}
        {isCallActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-32 left-1/2 z-20 -translate-x-1/2 w-64"
          >
            <div className="bg-slate-900/60 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-700/50">
              <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                <Volume2 className="h-4 w-4" />
                <span className="font-medium">{Math.round(volumeLevel)}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-150 rounded-full"
                  style={{ width: `${volumeLevel}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Transcript Display - Show during active call if there's content */}
        {isCallActive && transcript.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-8 top-32 bottom-32 z-20 w-96"
          >
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 h-full flex flex-col">
              <div className="px-4 py-3 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-white">תמלול שיחה</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript.map((line, index) => {
                  const isUser = line.startsWith("אתה:")
                  const message = line.replace(/^(אתה:|עו״ד שרה לוי:)\s*/, "")
                  return (
                    <div
                      key={index}
                      className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 ${
                          isUser
                            ? "bg-blue-600/80 text-white"
                            : "bg-slate-700/80 text-slate-100"
                        }`}
                      >
                        <p className="text-xs">{message}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </motion.div>
        )}

        <div className="absolute left-8 top-24 z-20 space-y-3">
          {floatingTags.map((tag) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, x: -50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
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
              {voiceState === "idle" && (hasMicPermission === false ? "נדרשת גישה למיקרופון" : "לחץ על המיקרופון להתחלה")}
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-8"
        >
          {isCallActive && (
            <Button
              size="lg"
              onClick={toggleMute}
              className="h-20 w-20 rounded-full border-2 p-0 shadow-2xl transition-all duration-300"
              style={{
                background: isMuted ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(30, 41, 59, 0.8)",
                borderColor: isMuted ? "#ef4444" : "rgba(71, 85, 105, 0.5)",
                backdropFilter: "blur(20px)",
                boxShadow: isMuted ? "0 0 40px rgba(239, 68, 68, 0.4)" : "0 10px 30px rgba(0, 0, 0, 0.3)",
              }}
            >
              {isMuted ? <MicOff className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
            </Button>
          )}

          {!isCallActive && (
            <Button
              size="lg"
              onClick={toggleMic}
              disabled={isConnecting || hasMicPermission === false}
              className="h-20 w-20 rounded-full border-2 p-0 shadow-2xl transition-all duration-300"
              style={{
                background: isConnecting ? "rgba(100, 116, 139, 0.8)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                borderColor: isConnecting ? "rgba(100, 116, 139, 0.5)" : "#22c55e",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 40px rgba(34, 197, 94, 0.4)",
                opacity: hasMicPermission === false ? 0.5 : 1,
              }}
            >
              <Mic className="h-8 w-8 text-white" />
            </Button>
          )}

          <Button
            size="lg"
            variant="destructive"
            onClick={isCallActive ? endCall : handleHangup}
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
