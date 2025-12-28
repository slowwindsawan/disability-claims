"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lightbulb, Mic, Phone, CheckCircle2, XCircle, AlertTriangle, BookOpen, Shield, Volume2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import useCurrentCase from "@/lib/useCurrentCase"
import WaitingForResponsePage from "@/app/waiting-for-response/page"

type Stage = "briefing" | "simulator" | "feedback"
type VoiceState = "idle" | "listening" | "speaking"

interface FinalDocumentAnalysis {
  summary?: string
  strategy?: string
  claim_rate?: number
  recommendations?: string[]
  preparation_data?: Array<{
    title: string
    detail: string
    should_say: boolean
  }>
  form_7801?: {
    disability_info?: {
      disability_types?: Record<string, boolean>
      primary_disability_description?: string
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export default function CommitteePrepPage() {
  const router = useRouter()
  const { currentCase, loadingCase } = useCurrentCase()
  const [stage, setStage] = useState<Stage>("briefing")
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [isMicActive, setIsMicActive] = useState(false)
  const [showHints, setShowHints] = useState(false)

  // Parse and memoize the final_document_analysis data
  const documentAnalysis = useMemo<FinalDocumentAnalysis | null>(() => {
    if (!currentCase) return null
    
    const analysis = (currentCase as Record<string, unknown>)?.case?.final_document_analysis || (currentCase as Record<string, unknown>)?.final_document_analysis
    if (!analysis) return null

    // Handle both string and object formats
    if (typeof analysis === 'string') {
      try {
        return JSON.parse(analysis)
      } catch (e) {
        console.error('Failed to parse final_document_analysis:', e)
        return null
      }
    }
    
    return analysis as FinalDocumentAnalysis
  }, [currentCase])

  const toggleMic = () => {
    setIsMicActive(!isMicActive)
    setVoiceState(isMicActive ? "idle" : "listening")
  }

  const handleEndSimulation = () => {
    setStage("feedback")
    setIsMicActive(false)
    setVoiceState("idle")
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <AnimatePresence mode="wait">
        {stage === "briefing" && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen"
          >
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
              <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-slate-900">הכנה לועדה רפואית</h1>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
              {/* Hero */}
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-12">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-4">האסטרטגיה המשפטית שלך</h1>
                <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                  לפני שנתרגל, חשוב שתכיר את הנקודות המרכזיות שצריכות להישמע בשיחה עם הועדה הרפואית
                </p>
              </motion.div>

              {/* Key Strategy Card */}
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                {(!currentCase?.case?.final_document_analysis) ? (
                  <WaitingForResponsePage />
                ) : loadingCase ? (
                  <Card className="mb-8">
                    <div className="text-card-foreground flex flex-col gap-6 rounded-xl border p-6 bg-white shadow-md">
                      {/* Summary Section Skeleton */}
                      <div className="flex items-start gap-4 mb-2 p-0 bg-transparent border-0 rounded">
                        <div className="w-6 h-6 bg-slate-200 rounded flex-shrink-0 mt-1" />
                        <div className="flex-1 w-full">
                          <div className="h-5 bg-slate-200 rounded w-32 mb-3" />
                          <div className="space-y-2">
                            <div className="h-4 bg-slate-100 rounded w-full" />
                            <div className="h-4 bg-slate-100 rounded w-full" />
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                          </div>
                        </div>
                      </div>

                      {/* Strategy Section Skeleton */}
                      <div className="border-t pt-6">
                        <div className="h-5 bg-slate-200 rounded w-40 mb-3" />
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-100 rounded w-full" />
                          <div className="h-4 bg-slate-100 rounded w-full" />
                          <div className="h-4 bg-slate-100 rounded w-4/5" />
                        </div>
                      </div>

                      {/* Must Mention Points Skeleton */}
                      <div className="border-t pt-6">
                        <div className="h-6 bg-slate-200 rounded w-44 mb-4" />
                        <div className="space-y-4">
                          {[1, 2, 3].map((idx) => (
                            <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0" />
                              <div className="flex-1 w-full">
                                <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Avoid Mentioning Skeleton */}
                      <div className="border-t pt-6">
                        <div className="h-6 bg-slate-200 rounded w-32 mb-4" />
                        <div className="space-y-4">
                          {[1, 2].map((idx) => (
                            <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="w-6 h-6 bg-slate-200 rounded flex-shrink-0" />
                              <div className="flex-1 w-full">
                                <div className="h-4 bg-slate-200 rounded w-44 mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations Skeleton */}
                      <div className="border-t pt-6">
                        <div className="h-5 bg-slate-200 rounded w-44 mb-3" />
                        <div className="space-y-2">
                          {[1, 2, 3].map((idx) => (
                            <div key={idx} className="flex gap-2">
                              <div className="w-4 h-4 bg-slate-200 rounded-full flex-shrink-0 mt-1" />
                              <div className="flex-1">
                                <div className="h-4 bg-slate-100 rounded w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : documentAnalysis ? (
                  <Card className="mb-8">
                    <div className="text-card-foreground flex flex-col gap-6 rounded-xl border p-6 bg-white shadow-md">
                      {/* Summary Section */}
                      {/* <div className="flex items-start gap-4 mb-2 p-0 bg-transparent border-0 rounded">
                        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 mb-3">תקציר התיק</h3>
                          <p className="text-slate-700 text-base leading-relaxed">
                            {documentAnalysis.summary || "לא קיים תקציר זמין"}
                          </p>
                        </div>
                      </div> */}

                      {/* Strategy Section */}
                      {/* <div className="border-t pt-6">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-amber-600" />
                          האסטרטגיה המשפטית
                        </h3>
                        <p className="text-slate-700 text-base leading-relaxed">
                          {documentAnalysis.strategy || "לא קיימת אסטרטגיה זמינה"}
                        </p>
                      </div> */}

                      {/* Preparation Data - Must Mention Points */}
                      {documentAnalysis.preparation_data && documentAnalysis.preparation_data.length > 0 && (
                        <div className="border-t pt-6">
                          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            נקודות חובה לציון
                          </h3>
                          <div className="space-y-4">
                            {documentAnalysis.preparation_data
                              .filter(item => item.should_say === true)
                              .map((item, idx) => (
                                <div key={idx} className="flex gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 mb-1">{item.title}</p>
                                    <p className="text-sm text-slate-600">{item.detail}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Avoid Mentioning */}
                      {documentAnalysis.preparation_data && documentAnalysis.preparation_data.length > 0 && (
                        <div className="border-t pt-6">
                          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <XCircle className="w-6 h-6 text-red-600" />
                            מה לא להגיד
                          </h3>
                          <div className="space-y-4">
                            {documentAnalysis.preparation_data
                              .filter(item => item.should_say === false)
                              .map((item, idx) => (
                                <div key={idx} className="flex gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                                  <div>
                                    <p className="font-semibold text-slate-900 mb-1">{item.title}</p>
                                    <p className="text-sm text-slate-600">{item.detail}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {/* {documentAnalysis.recommendations && documentAnalysis.recommendations.length > 0 && (
                        <div className="border-t pt-6">
                          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-600" />
                            המלצות חשובות
                          </h3>
                          <ul className="space-y-2">
                            {documentAnalysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex gap-2 text-slate-700">
                                <span className="text-amber-600 font-bold">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )} */}
                    </div>
                  </Card>
                ) : (
                  <Card className="mb-8 p-8 text-center">
                    <p className="text-slate-600">לא קיימים נתוני ניתוח עבור תיק זה עדיין.</p>
                  </Card>
                )}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => router.push("/committee-good-luck")}
                    className="w-full bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-14 text-lg font-bold shadow-lg"
                  >
                    המשך
                  </Button>
                </div>
              </motion.div>
            </main>
          </motion.div>
        )}

        {stage === "simulator" && (
          <motion.div
            key="simulator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-screen w-full overflow-hidden bg-slate-950"
          >
            {/* Background Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800" />

            {/* Header */}
            <motion.header
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex items-center justify-between px-8 py-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 backdrop-blur-sm ring-2 ring-blue-600/30">
                  <span className="text-lg font-semibold text-blue-400">דר</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">ד״ר יוסי כהן</h2>
                  <p className="text-sm text-slate-400">רופא הועדה הרפואית</p>
                </div>
              </div>

              <Badge className="gap-2 border-amber-500/30 bg-amber-950/50 px-4 py-2 text-amber-400 backdrop-blur-md">
                <Volume2 className="h-4 w-4" />
                <span>סימולציה</span>
              </Badge>
            </motion.header>

            {/* Hints Button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => setShowHints(!showHints)}
              className="absolute left-8 top-24 z-20 rounded-xl border border-blue-500/30 bg-slate-900/80 px-4 py-3 backdrop-blur-xl transition-all hover:bg-slate-800/80"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">רמזים</span>
              </div>
            </motion.button>

            {/* Hints Panel */}
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="absolute left-8 top-40 z-20 w-80 space-y-2"
                >
                  <Card className="p-4 bg-slate-900/90 border-blue-500/30 backdrop-blur-xl">
                    <p className="text-xs font-semibold text-blue-400 mb-2">זכור לציין:</p>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {documentAnalysis?.preparation_data?.filter(item => item.should_say)?.map((item, idx) => (
                        <li key={idx}>• {item.title}</li>
                      )) || (
                        <>
                          <li>• הכאב מקרין לרגל שמאל</li>
                          <li>• קושי בהרמת ילדים</li>
                          <li>• שינה לא רציפה</li>
                        </>
                      )}
                    </ul>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Center - Voice Orb */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="relative">
                {/* Outer Pulse Rings */}
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
                  </>
                )}

                {/* Main Voice Orb */}
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

                {/* Voice State Text */}
                <motion.p
                  className="mt-6 text-center text-lg font-medium"
                  style={{
                    color: voiceState === "listening" ? "#22c55e" : voiceState === "speaking" ? "#2563eb" : "#94a3b8",
                  }}
                >
                  {voiceState === "listening" && "מקשיב..."}
                  {voiceState === "speaking" && "הרופא מדבר..."}
                  {voiceState === "idle" && "לחץ על המיקרופון להתחלה"}
                </motion.p>
              </div>
            </div>

            {/* Bottom Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-8"
            >
              {/* Mic Button */}
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

              {/* End Simulation Button */}
              <Button
                size="lg"
                variant="destructive"
                onClick={handleEndSimulation}
                className="h-20 w-20 rounded-full border-2 border-red-500/50 bg-gradient-to-br from-red-600 to-red-700 p-0 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:from-red-700 hover:to-red-800"
              >
                <Phone className="h-8 w-8 text-white" />
              </Button>
            </motion.div>

            {/* Bottom Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-12 right-12 z-10"
            >
              <p className="text-sm text-slate-400">סימולציה: דבר עם רופא הועדה</p>
            </motion.div>
          </motion.div>
        )}

        {stage === "feedback" && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen"
          >
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
              <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-slate-900">משוב וניתוח ביצועים</h1>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
              {/* Score Card */}
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-12">
                <Card className="p-12 bg-gradient-to-l from-slate-800 to-slate-900 text-white shadow-2xl">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="mb-6"
                  >
                    <div className="text-7xl font-bold text-green-400 mb-2">85%</div>
                    <p className="text-xl text-slate-300">רמת מוכנות</p>
                  </motion.div>
                  <p className="text-slate-400 text-lg">ביצוע טוב! עם כמה שיפורים תהיה מוכן تماما</p>
                </Card>
              </motion.div>

              {/* Feedback List */}
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card className="p-8 bg-white shadow-lg mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">ניתוח מפורט</h2>

                  <div className="space-y-4">
                    {/* Positive Feedback */}
                    <div className="flex gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">ציינת יפה את ההקרנה לרגל</p>
                        <p className="text-sm text-slate-600">הסברת בבירור איך הכאב משפיע על תפקוד היום-יומי</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">תיאור מצוין של הקושי בהרמת ילדים</p>
                        <p className="text-sm text-slate-600">דוגמה קונקרטית שעוזרת להבין את חומרת המצב</p>
                      </div>
                    </div>

                    {/* Negative Feedback */}
                    <div className="flex gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">שכחת לספר על כדורי השינה</p>
                        <p className="text-sm text-slate-600">חשוב לציין טיפולים תרופתיים - זה מעיד על חומרת הכאב</p>
                      </div>
                    </div>

                    {/* Warning Feedback */}
                    <div className="flex gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">היית אגרסיבי מדי בתשובה השנייה</p>
                        <p className="text-sm text-slate-600">נסה לשמור על טון רגוע ועובדתי - זה עוזר ליצור אמון</p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">דיברת על פעילות גופנית</p>
                        <p className="text-sm text-slate-600">
                          עדיף להימנע מציון פעילויות שעלולות ליצור רושם שהמצב טוב יותר
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => {
                    setStage("simulator")
                    setShowHints(false)
                  }}
                  variant="outline"
                  className="flex-1 h-14 text-lg font-semibold"
                >
                  תרגל שוב את הנקודות החלשות
                </Button>
                <Button
                  onClick={() => router.push("/waiting-for-response")}
                  className="flex-1 bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-14 text-lg font-semibold"
                >
                  סיימתי את ההכנה
                </Button>
              </div>

              {/* Tip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-6 bg-blue-50 border-r-4 border-blue-600 rounded"
              >
                <div className="flex gap-3">
                  <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">טיפ מקצועי</p>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      ככל שתתרגל יותר, כך תרגיש בטוח יותר בשיחה האמיתית. מומלץ לעבור על הסימולציה לפחות 2-3 פעמים לפני
                      הועדה הרפואית.
                    </p>
                  </div>
                </div>
              </motion.div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
