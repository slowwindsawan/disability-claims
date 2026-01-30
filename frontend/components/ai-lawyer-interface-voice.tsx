"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Phone, Shield, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { ClaimMaximizationModal } from "@/components/claim-maximization-modal";
import { useLanguage } from "@/lib/language-context";
import { BACKEND_BASE_URL } from "@/variables";

type VoiceState = "idle" | "listening" | "speaking";
type ClaimType = "general" | "work-injury" | "unknown";

interface FloatingTag {
  id: number;
  text: string;
  timestamp: number;
}

export function AILawyerInterface() {
  const router = useRouter();
  const { language } = useLanguage();
  const isRTL = language === "he";
  const [mounted, setMounted] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [floatingTags, setFloatingTags] = useState<FloatingTag[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [claimType, setClaimType] = useState<ClaimType>("unknown");
  const [showMaximizationModal, setShowMaximizationModal] = useState(false);
  const [eligibleBenefits, setEligibleBenefits] = useState({
    mobility: false,
    specialServices: false,
  });

  // OpenAI Realtime WebRTC Integration States
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(
    null
  );
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [estimatedClaimValue, setEstimatedClaimValue] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isCallEnding, setIsCallEnding] = useState(false);
  const [agentConfig, setAgentConfig] = useState<{
    prompt: string;
    model: string;
    provider: string;
    voice: {
      provider: string;
      voiceId: string;
      model: string;
    };
  } | null>(null);
  
  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fix hydration by only rendering language-dependent content after client mount
  useEffect(() => {
    // Reset all state on mount - don't persist anything
    setTranscript([]);
    setIsCallActive(false);
    setIsConnecting(false);
    setIsMuted(false);
    setVolumeLevel(0);
    setError(null);
    setProcessingStatus("");
    setVoiceState("idle");
    setIsMicActive(false);
    setMounted(true);
  }, []);

  // Fetch agent config from database with retry logic
  useEffect(() => {
    const fetchAgentConfig = async (retries = 3) => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(
            `${BACKEND_BASE_URL}/api/agents/by-name/interview_voice_agent`,
            { signal: AbortSignal.timeout(10000) } // 10 second timeout
          );

          if (response.ok) {
            const data = await response.json();
            
            if (data.agent) {
              const model = data.agent.model || "gpt-4o";
              // Determine provider based on model name
              let provider = "openai"; // default
              if (model.toLowerCase().includes("gemini")) {
                provider = "google";
              } else if (model.toLowerCase().includes("gpt") || model.toLowerCase().includes("o1")) {
                provider = "openai";
              }
              
              // Parse voice config from meta_data with fallback
              let voiceConfig = {
                provider: "11labs",
                voiceId: "burt",
                model: "eleven_multilingual_v2",
              };
              
              if (data.agent.meta_data) {
                try {
                  const metaData = typeof data.agent.meta_data === "string" 
                    ? JSON.parse(data.agent.meta_data) 
                    : data.agent.meta_data;
                  
                  if (metaData.voice) {
                    voiceConfig = {
                      provider: metaData.voice.provider || voiceConfig.provider,
                      voiceId: metaData.voice.voiceId || voiceConfig.voiceId,
                      model: metaData.voice.model || voiceConfig.model,
                    };
                  }
                } catch (err) {
                  console.warn("⚠️ Failed to parse meta_data, using fallback voice config");
                }
              }
              
              setAgentConfig({
                prompt: data.agent.prompt,
                model: model,
                provider: provider,
                voice: voiceConfig,
              });
              console.log("✅ Agent config loaded successfully");
              return; // Success - exit the retry loop
            }
          } else {
            throw new Error(`HTTP ${response.status}: Failed to fetch agent config`);
          }
        } catch (err) {
          const isLastAttempt = attempt === retries - 1;
          const errorMsg = err instanceof Error ? err.message : String(err);
          
          if (isLastAttempt) {
            console.error(
              `❌ Failed to fetch agent config after ${retries} attempts:`,
              errorMsg
            );
            // Still continue - the app can work with fallback config
          } else {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.warn(
              `⚠️ Attempt ${attempt + 1}/${retries} failed (${errorMsg}). Retrying in ${delay}ms...`
            );
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    };

    fetchAgentConfig();
  }, []);

  const topics = [
    { topic_id: "disab_2", topic_name: "Disability Rating Determination" },
    { topic_id: "neuro_3", topic_name: "Nervous System" },
    {
      topic_id: "psych_4",
      topic_name: "Psychotic and Psychoneurotic Disorders (Mental Health)",
    },
    { topic_id: "upperlimbs_5", topic_name: "Upper Limbs" },
    { topic_id: "lowerlimbs_6", topic_name: "Lower Limbs" },
    { topic_id: "ent_7", topic_name: "Nose, Mouth, Ear and Throat" },
    { topic_id: "oral_8", topic_name: "Oral Cavity, Jaws, and Teeth" },
    {
      topic_id: "scars_9",
      topic_name: "Scars, Skin Diseases, and Skin Impairments",
    },
  ];

  // Initialize audio element
  useEffect(() => {
    audioRef.current = document.getElementById("aiAudio") as HTMLAudioElement;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Check microphone permission
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        setHasMicPermission(result.state === "granted");

        // Listen for permission changes
        result.onchange = () => {
          setHasMicPermission(result.state === "granted");
        };
      } catch (error) {
        // Fallback: try to access microphone directly
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          setHasMicPermission(true);
        } catch (err) {
          setHasMicPermission(false);
        }
      }
    };

    checkMicPermission();
    const interval = setInterval(checkMicPermission, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // Floating tags effect
  useEffect(() => {
    const tagTexts = ["אבחנה זוהתה", "סעיף 37", "תביעה רפואית", "זכאות מלאה"];
    let tagId = 0;

    const interval = setInterval(() => {
      if (Math.random() > 0.7 && isCallActive) {
        const newTag: FloatingTag = {
          id: tagId++,
          text: tagTexts[Math.floor(Math.random() * tagTexts.length)],
          timestamp: Date.now(),
        };
        setFloatingTags((prev) => [...prev.slice(-2), newTag]);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isCallActive]);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasMicPermission(true);
      setError(null);
      return true;
    } catch (error: any) {
      if (error?.name === "NotAllowedError") {
        setError(
          "❌ הרשאת המיקרופון נדחתה. אנא עבור להגדרות ה-browser וחזור על ההרשאה."
        );
      } else if (error?.name === "NotFoundError") {
        setError("❌ לא נמצא מיקרופון במכשיר. בדוק חיבור המיקרופון.");
      } else if (error?.name === "SecurityError") {
        setError("❌ בעיית אבטחה. אנא טען את הדף מחדש.");
      } else {
        setError(`❌ שגיאה בגישה למיקרופון: ${error?.message}`);
      }
      setHasMicPermission(false);
      return false;
    }
  };

  const cleanup = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    
    setIsCallActive(false);
    setIsConnecting(false);
    setVoiceState("idle");
    setIsMicActive(false);
    setProcessingStatus("");
  };

  const startCall = async () => {
    if (hasMicPermission === false) {
      const granted = await requestMicPermission();
      if (!granted) {
        return;
      }
      return;
    }

    // Clear and reset state
    setTranscript([]);
    setIsConnecting(true);
    setProcessingStatus("מתחבר לעורך דין AI...");
    setError(null);

    try {
      // Create RTCPeerConnection FIRST
      pcRef.current = new RTCPeerConnection();

      // Handle incoming AI audio stream
      pcRef.current.ontrack = (event) => {
        console.log("🔊 Received audio track from OpenAI");
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          // Explicitly play the audio (required for some browsers)
          audioRef.current.play().catch(err => {
            console.warn("⚠️ Audio autoplay blocked, trying to enable:", err);
          });
        }
      };

      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Send microphone audio
      micStreamRef.current.getTracks().forEach(track => {
        pcRef.current!.addTrack(track, micStreamRef.current!);
      });

      // Create data channel for events
      dataChannelRef.current = pcRef.current.createDataChannel("oai-events");

      dataChannelRef.current.onopen = () => {
        callStartTimeRef.current = Date.now();
        setIsCallActive(true);
        setIsConnecting(false);
        setVoiceState("listening");
        setIsMicActive(true);
        setProcessingStatus("");
        
        // Ensure audio element is ready to play
        if (audioRef.current) {
          audioRef.current.volume = 1.0;
        }
      };

      dataChannelRef.current.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        // User - Final transcription
        if (msg.type === "conversation.item.input_audio_transcription.completed") {
          const userText = msg.text || msg.transcript;
          if (userText) {
            setTranscript((prev) => [...prev, `אתה: ${userText}`]);
            setVoiceState("listening");
          }
        }

        // AI - Final transcription  
        if (msg.type === "conversation.item.assistant.transcription.completed") {
          const aiText = msg.text || msg.transcript || msg?.part?.transcript;
          if (aiText) {
            setTranscript((prev) => [...prev, `עו״ד שרה לוי: ${aiText}`]);
            setVoiceState("speaking");
          }
        }

        // AI - Output item done (contains transcript in item.content[0].transcript)
        if (msg.type === "response.output_item.done") {
          if (msg.item && msg.item.content && msg.item.content[0]) {
            const aiText = msg.item.content[0].transcript;
            if (aiText) {
              setTranscript((prev) => [...prev, `עו״ד שרה לוי: ${aiText}`]);
              setVoiceState("speaking");
            }
          }
        }

        // Response audio started - AI is speaking
        if (msg.type === "response.audio.delta" || msg.type === "response.audio_transcript.delta") {
          setVoiceState("speaking");
        }

        // Response completed - AI finished speaking
        if (msg.type === "response.audio.done" || msg.type === "response.done") {
          setVoiceState("listening");
        }

        // Input audio started - User is speaking
        if (msg.type === "input_audio_buffer.speech_started") {
          setVoiceState("listening");
        }

        // Error handling
        if (msg.type === "error") {
          console.error("❌ OpenAI Error:", msg.error || msg.message);
          setError(msg.error?.message || msg.message || "Unknown error");
        }
      };

      // Get auth token from localStorage
      const token = localStorage.getItem("access_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // Only add authorization if we have a token
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("📋 Sending auth token to /offer endpoint");
      } else {
        console.log("ℹ️ No auth token available, calling /offer without authentication");
      }

      const tokenRes = await fetch(`${BACKEND_BASE_URL}/offer`, {
        method: "POST",
        headers: headers
      });

      if (!tokenRes.ok) {
        throw new Error(`Failed to get session token: ${tokenRes.statusText}`);
      }

      const { client_secret } = await tokenRes.json();

      // Create offer
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      setProcessingStatus("מתחבר ל-OpenAI...");

      // Send offer to OpenAI
      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${client_secret}`,
            "Content-Type": "application/sdp"
          },
          body: offer.sdp
        }
      );

      if (!sdpRes.ok) {
        throw new Error(`OpenAI connection failed: ${sdpRes.statusText}`);
      }

      const answerSDP = await sdpRes.text();
      await pcRef.current.setRemoteDescription({ type: "answer", sdp: answerSDP });

      setProcessingStatus("מתחבר...");

    } catch (error: any) {
      console.error("❌ Call failed:", error?.message);

      let errorMsg = "שגיאה לא ידועה";
      if (
        error?.message?.includes("microphone") ||
        error?.message?.includes("permission") ||
        error?.name === "NotAllowedError"
      ) {
        errorMsg = "אנא הענק הרשאה למיקרופון";
        setHasMicPermission(false);
        await requestMicPermission();
      } else if (
        error?.message?.includes("network") ||
        error?.message?.includes("connection") ||
        error?.message?.includes("Failed to fetch")
      ) {
        errorMsg = "בעיית חיבור לאינטרנט. בדוק את הגדרות הרשת שלך";
      } else {
        errorMsg = error?.message || "שגיאה לא ידועה";
      }

      setError(`❌ ${errorMsg}`);
      setIsConnecting(false);
      setProcessingStatus("");
      cleanup();
    }
  };

  const endCall = async () => {
    // Save call data before cleanup
    const callData = {
      transcript: transcript,
      duration: callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0,
      ended_at: new Date().toISOString()
    };
    
    // Store in localStorage for the end-of-call page to process
    localStorage.setItem('openai_call_data', JSON.stringify(callData));
    
    setIsCallActive(false);
    cleanup();

    // Navigate immediately to end-of-call processing
    router.push("/end-of-call");
  };

  const toggleMute = () => {
    if (micStreamRef.current && isCallActive) {
      const audioTracks = micStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // Toggle enabled state
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleMic = () => {
    if (isCallActive) {
      toggleMute();
    } else {
      startCall();
    }
  };

  const handleHangup = () => {
    // Always save call data before navigating
    const callData = {
      transcript: transcript,
      duration: callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0,
      ended_at: new Date().toISOString()
    };
    
    // Store in localStorage for the end-of-call page to process
    localStorage.setItem('openai_call_data', JSON.stringify(callData));
    
    if (isCallActive) {
      // Clean up active call resources
      cleanup();
    }
    
    // Navigate immediately to end-of-call for processing
    router.push("/end-of-call");
  };

  const handleSaveAndExit = () => {
    if (isCallActive) {
      cleanup();
    }
    router.push("/incomplete-intake");
  };

  return (
    <>
      {/* Hidden audio element for AI voice output */}
      <audio 
        id="aiAudio" 
        autoPlay 
        playsInline
        style={{ display: 'none' }}
      />
      
      <div
        className="relative h-screen w-full overflow-hidden bg-slate-950"
        dir={mounted && isRTL ? "rtl" : "ltr"}
      >
        <div className="absolute inset-0">
          <img
            src="/professional-female-lawyer.png"
            alt={mounted && isRTL ? "עורכת דין" : "Lawyer"}
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
        </div>

        {mounted && (
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
                <h2 className="text-xl font-semibold text-white">
                  עו״ד שרה לוי
                </h2>
                <p className="text-sm text-slate-400">ייעוץ משפטי AI</p>
              </div>
            </div>

            <Badge className="gap-2 border-green-500/30 bg-green-950/50 px-4 py-2 text-green-400 backdrop-blur-md">
              <Shield className="h-4 w-4" />
              <span>מוצפן מקצה לקצה</span>
            </Badge>
          </motion.header>
        )}

        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-24 left-1/2 z-30 -translate-x-1/2 w-96"
            >
              <div className="bg-blue-500/90 backdrop-blur-md text-white px-6 py-4 rounded-xl shadow-2xl border border-blue-400">
                <p className="text-sm font-medium text-center">{toastMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  const isUser = line.startsWith("אתה:");
                  const message = line.replace(/^(אתה:|עו״ד שרה לוי:)\s*/, "");
                  return (
                    <div
                      key={index}
                      className={`flex ${
                        isUser ? "justify-start" : "justify-end"
                      }`}
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
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </motion.div>
        )}

        {/* End-of-Call Loader Overlay */}
        <AnimatePresence>
          {isCallEnding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl"
            >
              {/* Animated loading spinner */}
              <motion.div
                className="relative w-24 h-24 mb-8"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear"
                }}
              >
                <div className="absolute inset-0 rounded-full border-4 border-slate-700/30" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500" />
              </motion.div>

              {/* Loading text */}
              <motion.div
                className="text-center space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-xl font-semibold text-white">
                  {language === "he" ? "מעבדת את השיחה..." : "Processing your call..."}
                </h3>
                <p className="text-sm text-slate-400">
                  {language === "he" 
                    ? "שומרת נתונים ובודקת זכאות..." 
                    : "Saving data and checking eligibility..."}
                </p>
              </motion.div>

              {/* Progress indicator dots */}
              <motion.div
                className="flex gap-2 mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-500"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                color:
                  voiceState === "listening"
                    ? "#22c55e"
                    : voiceState === "speaking"
                    ? "#2563eb"
                    : "#94a3b8",
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 1.5,
                repeat: voiceState !== "idle" ? Number.POSITIVE_INFINITY : 0,
                ease: "easeInOut",
              }}
            >
              {mounted && (
                <>
                  {voiceState === "listening" && "מקשיב..."}
                  {voiceState === "speaking" && "מדבר..."}
                  {voiceState === "idle" &&
                    (hasMicPermission === false
                      ? "נדרשת גישה למיקרופון"
                      : "לחץ על המיקרופון להתחלה")}
                </>
              )}
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-8"
        >
          {/* Permission button - shown when permission is denied */}
          {hasMicPermission === false && mounted && (
            <Button
              size="lg"
              onClick={requestMicPermission}
              className="h-20 w-20 rounded-full border-2 p-0 shadow-2xl transition-all duration-300 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                borderColor: "#f59e0b",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 40px rgba(245, 158, 11, 0.4)",
              }}
            >
              <Mic className="h-8 w-8 text-white" />
            </Button>
          )}

          {/* Mute button - shown during active call */}
          {isCallActive && (
            <Button
              size="lg"
              onClick={toggleMute}
              className="h-20 w-20 rounded-full border-2 p-0 shadow-2xl transition-all duration-300"
              style={{
                background: isMuted
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "rgba(30, 41, 59, 0.8)",
                borderColor: isMuted ? "#ef4444" : "rgba(71, 85, 105, 0.5)",
                backdropFilter: "blur(20px)",
                boxShadow: isMuted
                  ? "0 0 40px rgba(239, 68, 68, 0.4)"
                  : "0 10px 30px rgba(0, 0, 0, 0.3)",
              }}
            >
              {isMuted ? (
                <MicOff className="h-8 w-8 text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
            </Button>
          )}

          {/* Start mic button - shown when not in call and permission granted */}
          {!isCallActive && hasMicPermission === true && mounted && (
            <Button
              size="lg"
              onClick={startCall}
              className="h-20 w-20 rounded-full border-2 p-0 shadow-2xl transition-all duration-300 cursor-pointer"
              style={{
                background: isConnecting
                  ? "rgba(100, 116, 139, 0.8)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
                borderColor: isConnecting
                  ? "rgba(100, 116, 139, 0.5)"
                  : "#22c55e",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 40px rgba(34, 197, 94, 0.4)",
              }}
            >
              <Mic className="h-8 w-8 text-white" />
            </Button>
          )}

          {/* End call button - only shown when connected to call */}
          {isCallActive && (
            <Button
              size="lg"
              variant="destructive"
              onClick={endCall}
              className="h-20 w-20 rounded-full border-2 border-red-500/50 bg-gradient-to-br from-red-600 to-red-700 p-0 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:from-red-700 hover:to-red-800"
              style={{
                boxShadow: "0 10px 30px rgba(220, 38, 38, 0.3)",
              }}
            >
              <Phone className="h-8 w-8 text-white" />
            </Button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-12 left-12 z-10"
        >
          {mounted && (
            <Button
              variant="outline"
              onClick={handleSaveAndExit}
              className="border-slate-600/50 bg-slate-900/40 text-slate-300 backdrop-blur-md hover:bg-slate-800/60"
            >
              שמור וצא
            </Button>
          )}
        </motion.div>

        {mounted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-t border-slate-700/50 py-3 px-6"
          >
            <p className="text-center text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">הבהרה:</span>{" "}
              ZeroTouch הינה מערכת טכנולוגית לניהול מידע ואינה מספקת ייעוץ
              משפטי. השירות מהווה כלי עזר להגשת תביעות באופן עצמאי. המידע שניתן
              באמצעות המערכת אינו מהווה תחליף לייעוץ משפטי מקצועי מעורך דין
              מוסמך.
            </p>
          </motion.div>
        )}
      </div>

      <ClaimMaximizationModal
        isOpen={showMaximizationModal}
        onClose={() => setShowMaximizationModal(false)}
        eligibleBenefits={eligibleBenefits}
      />
    </>
  );
}
