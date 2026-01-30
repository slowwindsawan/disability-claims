"use client"

import * as React from "react"
import { Send, Mic, MicOff, User, Bot, StopCircle, Loader2, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from "@/lib/language-context"
import { cn } from "@/lib/utils"
import { BACKEND_BASE_URL } from "@/variables"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function AILawyerInterface() {
  const router = useRouter()
  const { language } = useLanguage()
  const isRTL = language === "he"
  
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isRecording, setIsRecording] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isComplete, setIsComplete] = React.useState(false)
  const [confidenceScore, setConfidenceScore] = React.useState<number | null>(null)
  const [caseId, setCaseId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [agentPrompt, setAgentPrompt] = React.useState<string | null>(null)
  const [eligibilityRaw, setEligibilityRaw] = React.useState<any | null>(null)
  const [isFirstMessage, setIsFirstMessage] = React.useState(true)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioChunksRef = React.useRef<Blob[]>([])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // When interview is complete, trigger call analyzer and show popup
  React.useEffect(() => {
    if (isComplete && caseId && !isAnalyzing) {
      console.log("🎯 Interview complete! Starting analysis...")
      triggerCallAnalyzer()
    }
  }, [isComplete, caseId])

  const triggerCallAnalyzer = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    try {
      const token = localStorage.getItem("access_token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      }
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      console.log(`🔍 Calling analyze endpoint for case ${caseId}...`)
      const response = await fetch(`${BACKEND_BASE_URL}/api/interview/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({ case_id: caseId })
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`)
      }

      const result = await response.json()
      console.log("✅ Analysis complete:", result)

      // After analysis is done, navigate
      setTimeout(() => {
        router.push(`/value-reveal?case_id=${caseId}`)
      }, 1000)
    } catch (err) {
      console.error("❌ Error during analysis:", err)
      setAnalysisError(isRTL ? "שגיאה בניתוח. אנא נסה שוב." : "Analysis failed. Please try again.")
      setIsAnalyzing(false)
    }
  }

  const retryAnalysis = () => {
    setAnalysisError(null)
    triggerCallAnalyzer()
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch agent prompt on mount (once per session)
  React.useEffect(() => {
    const fetchAgentPrompt = async () => {
      try {
        // Fetch agent prompt from database
        const promptResponse = await fetch(`${BACKEND_BASE_URL}/api/agents/by-name/interview_voice_agent`)
        if (promptResponse.ok) {
          const promptData = await promptResponse.json()
          if (promptData.agent?.prompt) {
            setAgentPrompt(promptData.agent.prompt)
            console.log("✅ Agent prompt fetched and cached in React state")
          }
        }
      } catch (err) {
        console.warn("Could not fetch agent prompt:", err)
      }
    }

    fetchAgentPrompt()
  }, [])

  // Initialize interview on mount
  React.useEffect(() => {
    const initInterview = async () => {
      const token = localStorage.getItem("access_token")
      const storedCaseId = localStorage.getItem("case_id")
      
      if (!storedCaseId) {
        setError(isRTL ? "לא נמצא מזהה תיק" : "No case ID found")
        return
      }
      
      setCaseId(storedCaseId)
      
      try {
        setIsProcessing(true)
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        }
        
        // Add token if available, but don't require it
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }
        
        const requestBody: any = {
          case_id: storedCaseId,
          message: "__INIT__",
          chat_history: [],
          language: language
        }

        // Include agent prompt if we have it cached
        if (agentPrompt) {
          requestBody.agentPrompt = agentPrompt
          console.log("📤 Sending cached agent prompt with init request")
        }
        
        const response = await fetch(`${BACKEND_BASE_URL}/api/interview/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `HTTP ${response.status}`)
        }

        const data = await response.json()

        // Check if we have existing chat history to restore
        if (data.chat_history && Array.isArray(data.chat_history)) {
          // Restore previous conversation
          const restoredMessages: Message[] = data.chat_history.map((msg: any, idx: number) => ({
            id: idx + 1,
            role: msg.role,
            content: msg.content,
            timestamp: new Date()
          }))
          setMessages(restoredMessages)
          setIsFirstMessage(false)
          console.log(`📜 Restored ${restoredMessages.length} messages from previous session`)
        } else if (data.message) {
          // New conversation - add initial greeting
          const assistantMessage: Message = {
            id: "1",
            role: "assistant",
            content: data.message,
            timestamp: new Date()
          }
          setMessages([assistantMessage])
        }

        // On successful init, capture eligibility data for future messages
        if (data.eligibility_raw) {
          setEligibilityRaw(data.eligibility_raw)
          console.log("✅ Eligibility data cached in React state")
        }
      } catch (err) {
        console.error("Error initializing interview:", err)
        setError(isRTL ? "שגיאה באתחול ראיון: " + (err instanceof Error ? err.message : String(err)) : "Error initializing interview: " + (err instanceof Error ? err.message : String(err)))
      } finally {
        setIsProcessing(false)
      }
    }

    initInterview()
  }, [language, isRTL])

  const sendMessageToBackend = async (userMessage: string) => {
    const token = localStorage.getItem("access_token")
    
    if (!caseId) {
      setError(isRTL ? "מזהה תיק אינו זמין" : "Case ID not available")
      return
    }

    try {
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      }
      
      // Add token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const requestBody: any = {
        case_id: caseId,
        message: userMessage,
        chat_history: chatHistory,
        language: language
      }

      // Include cached agent prompt if available
      if (agentPrompt) {
        requestBody.agentPrompt = agentPrompt
      }

      // Include eligibility data on first message only
      if (isFirstMessage && eligibilityRaw) {
        requestBody.eligibility_raw = eligibilityRaw
        console.log("📤 Sending eligibility data with first message (will not repeat)")
        setIsFirstMessage(false)
      }

      const response = await fetch(`${BACKEND_BASE_URL}/api/interview/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      console.log("\n" + "=".repeat(80))
      console.log("🤖 AI RESPONSE RECEIVED:")
      console.log("=".repeat(80))
      console.log(data.message)
      console.log("=".repeat(80))
      console.log("🔍 Response data:", JSON.stringify(data, null, 2))
      console.log("📌 Done flag:", data.done)
      console.log("=".repeat(80) + "\n")
      
      if (data.done) {
        console.log("✅ INTERVIEW MARKED AS COMPLETE")
        console.log(`📊 Confidence Score: ${data.confidence_score}%`)
      }
      
      const aiResponse: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])
      
      if (data.done) {
        console.log("🎯 Setting isComplete to true and triggering navigation...")
        setIsComplete(true)
        setConfidenceScore(data.confidence_score)
      }
    } catch (err) {
      console.error("Error sending message:", err)
      setError(isRTL ? "שגיאה בשליחת הודעה: " + (err instanceof Error ? err.message : String(err)) : "Error sending message: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isComplete) return

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue("")
    setIsProcessing(true)

    await sendMessageToBackend(newMessage.content)
    setIsProcessing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          
          setIsProcessing(true)
          
          try {
            // Transcribe audio using backend endpoint
            const formData = new FormData()
            formData.append('case_id', caseId!)
            formData.append('audio', audioBlob, 'audio.webm')
            formData.append('language', language === 'he' ? 'he' : 'en')
            
            console.log("🎤 Sending audio for transcription...")
            
            const transcribeResponse = await fetch(`${BACKEND_BASE_URL}/api/interview/transcribe`, {
              method: "POST",
              body: formData
            })
            
            if (!transcribeResponse.ok) {
              const errorData = await transcribeResponse.json().catch(() => ({}))
              throw new Error(errorData.detail || `Transcription failed: ${transcribeResponse.status}`)
            }
            
            const transcribeData = await transcribeResponse.json()
            const transcribedText = transcribeData.text
            
            console.log(`✅ Transcription complete: ${transcribedText}`)
            
            // Add user message
            const newMessage: Message = {
              id: Date.now().toString(),
              role: "user",
              content: transcribedText,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, newMessage])
            
            // Send to interview chat
            await sendMessageToBackend(transcribedText)
          } catch (err) {
            console.error("Error transcribing audio:", err)
            setError(isRTL ? "שגיאה בתמלול קול: " + (err instanceof Error ? err.message : String(err)) : "Error transcribing audio: " + (err instanceof Error ? err.message : String(err)))
          } finally {
            setIsProcessing(false)
          }
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error("Error accessing microphone:", err)
        setError(isRTL ? "שגיאה בגישה למיקרופון" : "Error accessing microphone")
      }
    }
  }

  const handleNextStep = () => {
    router.push("/value-reveal")
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.push("/")}>{isRTL ? "חזור לבית" : "Go Home"}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-[calc(100vh-3.5rem)] w-full bg-background",
      isRTL ? "rtl" : "ltr"
    )} dir={isRTL ? "rtl" : "ltr"}>
      <Card className="flex-1 flex flex-col overflow-hidden border-0 rounded-none shadow-none">
        <CardHeader className="border-b bg-muted/30 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={24} /></AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {isRTL ? "ראיון תביעה ללא מגע" : "Zero Touch Claim Interviewer"}
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {isRTL ? "מחובר - AI Lawyer" : "Online - AI Lawyer"}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-hidden relative">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef} >
            <div className="flex flex-col gap-4 pb-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full items-end gap-2",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary"><Bot size={16} /></AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-muted text-foreground rounded-bl-none border"
                  )}>
                    {message.content}
                    <div className={cn(
                      "text-[10px] opacity-50 mt-1",
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 shrink-0">
                       <AvatarFallback className="bg-muted text-muted-foreground"><User size={16} /></AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}

              {isProcessing && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="flex items-center gap-2 text-muted-foreground text-sm pl-12"
                 >
                   <Loader2 className="h-4 w-4 animate-spin" />
                   {isRTL ? "AI חושב..." : "AI thinking..."}
                 </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Analysis Popup */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              >
                <motion.div 
                  className="bg-card border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <Loader2 size={48} className="text-blue-500 animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">
                        {isRTL ? "🤖 ה-AI מנתח את התיק שלך" : "🤖 AI is analyzing your case"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isRTL 
                          ? "אנחנו מסכמים את כל המידע שיש לנו כדי לתן לך הערכה מדויקת..."
                          : "We're analyzing all the information to give you an accurate assessment..."
                        }
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis Error Popup */}
          <AnimatePresence>
            {analysisError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              >
                <motion.div 
                  className="bg-card border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="text-4xl">⚠️</div>
                    <div>
                      <h3 className="font-bold text-lg mb-2 text-red-600">
                        {isRTL ? "שגיאה בניתוח" : "Analysis Error"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {analysisError}
                      </p>
                    </div>
                    <Button 
                      onClick={retryAnalysis}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {isRTL ? "🔄 נסה שוב" : "🔄 Try Again"}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording Overlay */}
          <AnimatePresence>
            {isRecording && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10"
              >
                <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border shadow-2xl max-w-sm w-full mx-4">
                   <div className="relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <div className="relative bg-red-500 rounded-full p-6 text-white">
                        <Mic size={32} />
                     </div>
                   </div>
                   <div className="text-center">
                     <h3 className="font-semibold text-lg">{isRTL ? "מקליט..." : "Listening..."}</h3>
                     <p className="text-sm text-muted-foreground">{isRTL ? "דבר רגיל, אני מקשיב" : "Speak naturally, I'm listening"}</p>
                   </div>
                   <Button 
                      variant="destructive" 
                      size="lg" 
                      className="w-full gap-2 rounded-full"
                      onClick={toggleRecording}
                   >
                     <StopCircle size={18} />
                     {isRTL ? "סיים הקלטה" : "Stop Recording"}
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="p-4 border-t bg-background">
          {isComplete ? (
            <div className="w-full">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    {isRTL ? "הראיון הושלם בהצלחה!" : "Interview Completed Successfully!"}
                  </h3>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  {isRTL 
                    ? `אספנו מספיק מידע לבנות תביעה חזקה. רמת ביטחון: ${confidenceScore?.toFixed(0)}%`
                    : `We've gathered enough information to build a strong claim. Confidence: ${confidenceScore?.toFixed(0)}%`
                  }
                </p>
              </div>
              <Button 
                onClick={handleNextStep}
                className="w-full h-12 text-base font-semibold gap-2"
                size="lg"
              >
                {isRTL ? "המשך לשלב הבא" : "Continue to Next Step"}
                <ArrowRight size={20} />
              </Button>
            </div>
          ) : (
            <div className="flex w-full gap-2 items-center">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className={cn("h-12 w-12 shrink-0 rounded-full border-2", isRecording && "animate-pulse")}
                onClick={toggleRecording}
                title={isRecording ? "Stop recording" : "Start recording"}
                disabled={isProcessing}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </Button>

              <div className="flex-1 relative">
                <Input
                  className="h-12 rounded-full pl-4 pr-12 bg-muted/50 focus-visible:ring-primary/20 border-muted-foreground/20"
                  placeholder={isRTL ? "הקלד הודעה..." : "Type a message..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isProcessing}
                />
              </div>

              <Button 
                size="icon" 
                className={cn(
                  "h-12 w-12 shrink-0 rounded-full transition-all",
                  inputValue.trim() && !isProcessing ? "bg-primary" : "bg-muted text-muted-foreground/50"
                )} 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
              >
                <Send size={20} className={isRTL ? "ml-1" : "mr-1"} />
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      
      <div className="text-center text-xs text-muted-foreground/60 p-2">
        {isRTL 
          ? "מערכת זו משתמשת בבינה מלאכותית ועשויה לעשות טעויות. נא לוודא את הפרטים החשובים."
          : "This system uses AI and may make mistakes. Please verify important details."
        }
      </div>
    </div>
  )
}
