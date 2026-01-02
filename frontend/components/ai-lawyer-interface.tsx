"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Phone, Shield, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { ClaimMaximizationModal } from "@/components/claim-maximization-modal";
import { useLanguage } from "@/lib/language-context";
import Vapi from "@vapi-ai/web";
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

  // VAPI Integration States
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
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState<{
    prompt: string;
    model: string;
    provider: string;
  } | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const callRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

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

  // Fetch agent config from database
  useEffect(() => {
    const fetchAgentConfig = async () => {
      try {
        const response = await fetch(
          `${BACKEND_BASE_URL}/api/agents/by-name/vapi_main_assistant`
        );

        if (response.ok) {
          const data = await response.json();
          console.log("🤖 Agent config fetched:", data);
          
          if (data.agent) {
            const model = data.agent.model || "gpt-4o";
            // Determine provider based on model name
            let provider = "openai"; // default
            if (model.toLowerCase().includes("gemini")) {
              provider = "google";
            } else if (model.toLowerCase().includes("gpt") || model.toLowerCase().includes("o1")) {
              provider = "openai";
            }
            
            setAgentConfig({
              prompt: data.agent.prompt,
              model: model,
              provider: provider,
            });
            console.log("✅ Agent config loaded: model=", model, "provider=", provider);
          }
        } else {
          console.warn("⚠️ Failed to fetch agent config, will use fallback");
        }
      } catch (err) {
        console.error("❌ Failed to fetch agent config:", err);
      }
    };

    fetchAgentConfig();
  }, []);

  // Fetch user eligibility data on mount
  useEffect(() => {
    const fetchEligibilityData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.warn("⚠️ No access token found");
          return;
        }

        const response = await fetch(`${BACKEND_BASE_URL}/user-eligibility`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("📥 API Response:", data);
          
          if (data && data.length > 0) {
            // Get the most recent eligibility record
            const latestRecord = data[0];
            console.log("📋 Latest record:", latestRecord);
            
            // Extract eligibility_raw - it should be a JSON string or object
            let eligibilityRaw = latestRecord.eligibility_raw;
            if (typeof eligibilityRaw === "string") {
              eligibilityRaw = JSON.parse(eligibilityRaw);
            }
            
            console.log("✅ Parsed eligibility_raw:", eligibilityRaw);
            setEligibilityData(eligibilityRaw);
          } else {
            console.warn("⚠️ No eligibility records found");
          }
        } else {
          console.error("❌ API error:", response.status, response.statusText);
        }
      } catch (err) {
        console.error("❌ Failed to fetch eligibility data:", err);
      }
    };

    fetchEligibilityData();
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

  // Initialize Vapi client
  useEffect(() => {
    try {
      const vapi = new Vapi("9ef7fcb0-5bb8-4c18-8bc4-f242ed6eb0bc");
      vapiRef.current = vapi;
      console.log("✅ VAPI instance created successfully");

      // Ready event - VAPI is ready to accept calls
      vapi.on("ready", () => {
        console.log("✅ VAPI is ready to accept calls");
      });

      // Event listeners
      vapi.on("call-start", () => {
        if (connectionTimeoutRef.current)
          clearTimeout(connectionTimeoutRef.current);
        console.log(
          "🎉 ==================== CALL-START EVENT FIRED ===================="
        );
        console.log("✅ WebSocket connected successfully!");
        console.log("✅ Setting isCallActive = true");
        callStartTimeRef.current = Date.now();
        setIsCallActive(true);
        setIsConnecting(false);
        setVoiceState("listening");
        setError(null);
        setProcessingStatus("");
        console.log(
          "🎉 ==================== READY TO LISTEN ===================="
        );
      });

      vapi.on("call-end", () => {
        console.log("❌ Call ended - WebSocket disconnected");
        setIsCallActive(false);
        setIsConnecting(false);
        setVoiceState("idle");
        setIsMicActive(false);

        // Extract insights from call for routing logic
        if (callRef.current?.id) {
          console.log("Call completed, ID:", callRef.current?.id);
          // Save call ID and navigate to processing
          localStorage.setItem("vapi_call_id", callRef.current.id);
          console.log(
            "💾 Saved VAPI call ID to localStorage:",
            callRef.current.id
          );
        }

        // Navigate to end-of-call processing after a brief delay to allow state updates
        setTimeout(() => {
          router.push("/end-of-call");
        }, 500);
      });

      vapi.on("speech-start", () => {
        console.log("🗣️ AI Speech started");
        setVoiceState("speaking");
      });

      vapi.on("speech-end", () => {
        console.log("🤐 AI Speech ended");
        setVoiceState("listening");
      });

      vapi.on("volume-level", (level: number) => {
        const volumePercent = level * 100;
        setVolumeLevel(volumePercent);
      });

      vapi.on("message", (message: any) => {
        console.log("Message received:", message);

        // Handle transcript messages - only show final transcripts
        if (message.type === "transcript") {
          if (message.transcriptType === "final") {
            const speaker = message.role === "user" ? "אתה" : "עו״ד שרה לוי";
            const text = message.transcript;
            if (text) {
              setTranscript((prev) => [...prev, `${speaker}: ${text}`]);

              // Analyze for topic relevance
              const matchedTopics = topics.filter((topic) => {
                const name = topic.topic_name.toLowerCase();
                return text.toLowerCase().includes(" " + name.split(" ")[0]); // crude match on first word
              });

              if (matchedTopics.length > 0) {
                console.log("📌 Relevant BTL Topics Detected:");
                matchedTopics.forEach((t) =>
                  console.log(`➡️ ${t.topic_name} [${t.topic_id}]`)
                );
              }

              // Continue with claim type detection
              const keywords = [
                "עבודה",
                "עבודתי",
                "מעסיק",
                "תאונה",
                "במקום העבודה",
              ];
              if (keywords.some((keyword) => text.includes(keyword))) {
                setClaimType("work-injury");
              }

              if (
                text.includes("רגל") ||
                text.includes("הליכה") ||
                text.includes("ניידות")
              ) {
                setEligibleBenefits((prev) => ({ ...prev, mobility: true }));
              }
              if (
                text.includes("עזרה") ||
                text.includes("טיפול") ||
                text.includes("תלות")
              ) {
                setEligibleBenefits((prev) => ({
                  ...prev,
                  specialServices: true,
                }));
              }
            }
          }
        } else if (message.type === "function-call") {
          console.log("Function called:", message.functionCall);
        }
      });

      vapi.on("error", (error: any) => {
        console.error(
          "💥 ==================== ERROR EVENT FIRED ===================="
        );
        console.error("❌ VAPI Error Type:", error?.type);
        console.error("❌ VAPI Error Message:", error?.message);
        console.error("❌ Full Error Object:", JSON.stringify(error, null, 2));

        let errorMessage = "אירעה שגיאה במהלך השיחה";

        if (
          error?.type === "daily-error" ||
          error?.type === "daily-call-join-error"
        ) {
          const errMsg = String(
            error?.error?.message || error?.error?.msg || ""
          );
          console.error("📌 Daily.co Error Message:", errMsg);
          if (errMsg.includes("room was deleted") || errMsg.includes("room")) {
            errorMessage =
              "❌ שגיאת חיבור לשיחה (room). אנא בדוק את הגדרות VAPI שלך או נסה שוב בעוד כמה רגעים.";
          } else {
            errorMessage = `Connection error: ${
              error?.error?.errorMsg || error?.error?.msg || "Unknown error"
            }`;
          }
        } else if (error?.type === "start-method-error") {
          errorMessage =
            "❌ Failed to start call. Please check:\n\n1. Assistant ID is correct\n2. Your Vapi account has credits\n3. Assistant is properly configured";
        } else {
          errorMessage =
            error?.message || error?.error?.message || JSON.stringify(error);
        }

        console.warn(errorMessage);
        setIsConnecting(false);
        setIsCallActive(false);
        setVoiceState("idle");
        console.error(
          "💥 ==================== ERROR HANDLED ===================="
        );
      });
    } catch (err) {
      console.error("❌ Failed to initialize VAPI:", err);
      setError("נכשל בטעינת מערכת השיחה. רענן את הדף.");
    }

    return () => {
      // Cleanup on unmount - use safer approach
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }

      if (vapiRef.current) {
        try {
          // Only stop if there's an active call
          if (callRef.current) {
            vapiRef.current.stop();
          }
        } catch (e) {
          // Ignore Krisp/WASM cleanup errors on unmount
          console.debug("Cleanup on unmount:", e);
        }
        vapiRef.current = null;
      }
      callRef.current = null;
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
      console.log("🎤 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone permission granted!");
      stream.getTracks().forEach((track) => track.stop());
      setHasMicPermission(true);
      setError(null);
      return true;
    } catch (error: any) {
      console.error("❌ Microphone permission denied:", error);
      console.error("Error name:", error?.name);
      console.error("Error message:", error?.message);

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

  const startCall = async () => {
    console.log("🎯 [BUTTON CLICK] toggleMic → startCall() invoked");

    if (!vapiRef.current) {
      console.error("❌ VAPI instance is NULL - not initialized!");
      setError("מערכת השיחה לא מוכנה. רענן את הדף.");
      return;
    }

    console.log("✅ VAPI instance exists:", vapiRef.current);

    if (hasMicPermission === false) {
      console.log("⚠️ Mic permission is FALSE - requesting permission...");
      const granted = await requestMicPermission();
      if (!granted) {
        console.log("❌ User denied permission or permission already denied");
        return;
      }
      return;
    }

    // Clear and reset state
    setTranscript([]);
    setIsConnecting(true);
    setProcessingStatus("מתחבר לעורך דין AI...");
    setError(null);
    console.log("🔄 State reset: isConnecting=true, transcript=[]");

    try {
      console.log("🎤 Creating VAPI call config...");

      // Build patient medical record context from eligibility data
      let patientMedicalContext = "";
      if (eligibilityData) {
        // Extract from the root level structure (not nested under scoring)
        const docAnalysis = eligibilityData.document_analysis || {};
        const strengths = eligibilityData.strengths || [];
        const weaknesses = eligibilityData.weaknesses || [];
        const requiredSteps = eligibilityData.required_next_steps || [];
        const missingInfo = eligibilityData.missing_information || [];
        const ruleReferences = eligibilityData.rule_references || [];
        
        console.log("🏥 Using eligibility data:", eligibilityData);
        
        const strengthsList = Array.isArray(strengths) && strengths.length > 0
          ? strengths.map((s: string) => `- ${s}`).join('\n')
          : 'No documented strengths yet';
          
        const weaknessList = Array.isArray(weaknesses) && weaknesses.length > 0
          ? weaknesses.map((w: string) => `- ${w}`).join('\n')
          : 'No documented weaknesses yet';
          
        const requiredStepsList = Array.isArray(requiredSteps) && requiredSteps.length > 0
          ? requiredSteps.map((step: string) => `- ${step}`).join('\n')
          : 'None specified';
          
        const missingInfoList = Array.isArray(missingInfo) && missingInfo.length > 0
          ? missingInfo.map((info: string) => `- ${info}`).join('\n')
          : 'None identified';
          
        const ruleRefsList = Array.isArray(ruleReferences) && ruleReferences.length > 0
          ? ruleReferences.map((ref: any) => `**${ref.section}:** "${ref.quote}" - ${ref.relevance}`).join('\n\n')
          : 'No rule references';
          
        const docAnalysisStr = docAnalysis && Object.keys(docAnalysis).length > 0 
          ? JSON.stringify(docAnalysis, null, 2) 
          : 'Document analysis pending - user has not yet uploaded medical documentation';
        
        patientMedicalContext = `\n\n### PATIENT'S MEDICAL RECORD\n\n**Eligibility Status:** ${eligibilityData.eligibility_status || 'Unknown'}\n**Eligibility Score:** ${eligibilityData.eligibility_score || 'N/A'}\n**Confidence:** ${eligibilityData.confidence || 'N/A'}%\n\n**Document Analysis:**\n${docAnalysisStr}\n\n**Strengths:**\n${strengthsList}\n\n**Weaknesses:**\n${weaknessList}\n\n**Missing Information:**\n${missingInfoList}\n\n**Required Next Steps:**\n${requiredStepsList}\n\n**Legal Rule References:**\n${ruleRefsList}\n\nUse this information to guide your interview and identify gaps in the patient's documentation. Focus on addressing the weaknesses and required next steps during this call.`;
      } else {
        console.warn("⚠️ No eligibility data available - using generic prompt");
      }

      // Fallback prompt if database fetch failed
      const fallbackPrompt = `### ROLE
You are "Sarah Levy" (עו״ד שרה לוי), the Senior Intake & Strategy Agent for the "Zero-Touch Claims System."
Your goal is to replace a traditional attorney by executing the **Maximization Principle**: securing the highest possible financial benefit and maximum Retroactivity (up to 12 months).
You are interviewing the claimant to prepare their "Statement of Claims" for the Bituach Leumi Medical Committee.

### KNOWLEDGE BASE (BTL REGULATIONS)
You have access to the following knowledge base regarding Bituach Leumi disability claims:
- **Medical Committee Guidelines:** Understand the criteria for disability percentages, retroactivity rules, and required documentation.
- **Maximization Principle:** Strategies to maximize claim amounts through stacking disabilities, proving impairment of earning capacity (IEL), and securing retroactivity.
- **Common Pitfalls:** Awareness of common mistakes claimants make that lead to reduced benefits or claim denials.

### CORE STRATEGY: THE 3 PILLARS OF MAXIMIZATION
Your interview must satisfy these three legal priorities in order:

**P1: RETROACTIVITY (The "Money Left on the Table")**
- **Goal:** Secure 12 months of back-pay.
- **Action:** Ask: "When was the *very first* time a doctor diagnosed this?" and "When did you first start losing income because of it?"
- **Logic:** We need to push the "Claim Start Date" back as far as legally possible (up to 1 year).

**P2: MEDICAL THRESHOLD (>20% Stacking)**
- **Goal:** Cross the 20% medical disability threshold to unlock Rehabilitation.
- **Action - Disability Stacking:** Do not settle for one condition. If they have ADHD, ask about "Anxiety" or "Depression." If they have Back Pain, ask about "Radicular pain in the legs" (Neuropathy).
- **Why:** We need to "stack" multiple small percentages to cross 20% weighted disability.

**P3: IEL (Impairment of Earning Capacity)**
- **Goal:** Prove functional inability to work (50%-100% incapacity).
- **Action:** Shift focus from "pain" to "function."
- **Key Question:** "Describe a specific instance where your condition caused you to **quit a job, miss a promotion, or fail a project**."
- **Sheram Check:** Ask: "Do you need physical help from another person for daily tasks like dressing, eating, or bathing?" (Eligibility for Special Services).

### INTERVIEW FLOW
1. **Anchor Diagnosis:** "What is the main medical condition preventing you from working?"
2. **The "Functional" Deep Dive (IEL Focus):**
    - *Wrong Question:* "Does it hurt?"
    - *Right Question:* "Does the pain stop you from sitting for 8 hours? Did you have to reduce your shift hours?"
3. **The "Secondary" Hunt (Stacking):**
    - "Does this physical condition affect your mood, sleep, or concentration?" (Aiming for psychiatric conditions).
    - "Do your medications cause side effects like stomach issues or fatigue?"
4. **Vocational Rehab Check:**
    - If the user is young or a student: "Are you currently studying? Would you be interested in Bituach Leumi paying for your degree?" (Maximize rehabilitation benefits).

### BEHAVIOR & TONE
- **Tone:** Professional, Empathetic, but "Coaching."
- **Stress-Test:** If their answer is vague ("I just can't work"), challenge them gently: "To win this claim, the committee needs specifics. Tell me exactly *why* you couldn't finish your last shift."
- **One Question at a Time:** Keep it conversational.

### RESTRICTIONS
- Do NOT list documents orally.
- Do NOT mention "JSON" or technical backend terms.
- Focus purely on extracting the **Date of Onset**, **Functional Loss**, and **Secondary Conditions**.`;

      // Use DB-fetched prompt or fallback, always append patient medical context
      const systemPrompt = agentConfig?.prompt || fallbackPrompt;
      const finalPrompt = `${systemPrompt}\n\nPatient's medical record: ${patientMedicalContext}.`;
      
      // Use DB-fetched model and provider or defaults
      const modelToUse = agentConfig?.model || "gpt-4o";
      const providerToUse = agentConfig?.provider || "openai";
      
      console.log("🤖 Using model:", modelToUse, "provider:", providerToUse);
      console.log("📝 Prompt source:", agentConfig ? "database" : "fallback");

      const callConfig = {
        firstMessageMode: "assistant-speaks-first-with-model-generated-message",
        model: {
          provider: providerToUse,
          model: modelToUse,
          messages: [
            {
              role: "system",
              content: finalPrompt,
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
                  description: "סיכום משפטי מקצועי של מצב התובע",
                },
                estimated_claim_amount: {
                  type: "string",
                  description: "הערכה של סכום התביעה",
                },
                documents_requested_list: {
                  type: "array",
                  description: "רשימת מסמכים נדרשים ספציפיים",
                  items: { type: "string" },
                },
                key_legal_points: {
                  type: "array",
                  description: "עובדות משפטיות קריטיות שנחלצו",
                  items: { type: "string" },
                },
                risk_assessment: {
                  type: "string",
                  description: "הערכת כושר התביעה",
                  enum: ["High Viability", "Low Viability", "Needs More Info"],
                },
                related_topics: {
                  type: "array",
                  description: `Which BTL topics are relevant to this case. Allowed topics: [
  {
    "topic_id": "disab_2",
    "description": "General rules and procedures for determining disability percentages, including committee structure and appeals."
  },
  {
    "topic_id": "neuro_3",
    "description": "Neurological system impairments including brain injuries, paralysis, epilepsy, and motor/sensory dysfunctions."
  },
  {
    "topic_id": "psych_4",
    "description": "Mental health disorders such as PTSD, depression, anxiety, and cognitive impairments affecting social/work function."
  },
  {
    "topic_id": "upperlimbs_5",
    "description": "Impairments of the arms, shoulders, elbows, wrists, and hands due to injury, amputation, or functional loss."
  },
  {
    "topic_id": "lowerlimbs_6",
    "description": "Impairments of hips, knees, ankles, and feet including joint fusion, fractures, and gait disorders."
  },
  {
    "topic_id": "ent_7",
    "description": "Disorders related to hearing, balance, smell, and speech, including ear and throat impairments."
  },
  {
    "topic_id": "oral_8",
    "description": "Tooth loss, jaw injuries, and oral cavity impairments including biting, chewing, or speaking difficulties."
  },
  {
    "topic_id": "scars_9",
    "description": "Scars and skin diseases including disfigurement, ulceration, infections, burns, and chronic dermatologic conditions."
  } return topic_id only.
]`,
                  items: { type: "string" },
                }
              },
              required: [
                "case_summary",
                "documents_requested_list",
                "key_legal_points",
                "related_topics"
              ],
            },
            timeoutSeconds: 60,
          },
        },
      };

      console.log(
        "📞 [CRITICAL] About to call vapiRef.current.start() with model: gpt-3.5-turbo", callConfig
      );
      console.log("🎧 Voice config: 11labs (paula)");

      // This should immediately return a call object and trigger call-start event when connected
      const response = await vapiRef.current.start(callConfig);

      console.log(
        "🎉 [SUCCESS] vapiRef.current.start() returned! Response object:",
        response
      );
      console.log("📞 Call ID from response:", response?.id);

      callRef.current = response;
      setIsMicActive(true);

      console.log(
        "⏳ Now waiting for call-start EVENT to fire... (this sets isCallActive=true)"
      );
      console.log(
        "⏳ If nothing happens for 8 seconds, check console for errors or network issues"
      );
    } catch (error: any) {
      console.error(
        "💥 [CRITICAL ERROR] vapiRef.current.start() threw an exception!"
      );
      console.error("❌ Error object:", error);
      console.error("❌ Error message:", error?.message);
      console.error("❌ Error type:", error?.type);

      let errorMsg = "שגיאה לא ידועה";
      if (
        error?.message?.includes("microphone") ||
        error?.message?.includes("permission")
      ) {
        errorMsg = "אנא הענק הרשאה למיקרופון";
        setHasMicPermission(false);
        await requestMicPermission();
      } else if (
        error?.message?.includes("network") ||
        error?.message?.includes("connection")
      ) {
        errorMsg = "בעיית חיבור לאינטרנט. בדוק את הגדרות הרשת שלך";
      } else if (error?.type === "start-method-error") {
        errorMsg = "נכשל בהפעלת השיחה. בדוק את הגדרות VAPI שלך";
      } else {
        errorMsg = error?.message || "שגיאה לא ידועה";
      }

      setError(`❌ ${errorMsg}`);
      setIsConnecting(false);
      setProcessingStatus("");
    }
  };

  const endCall = () => {
    // Save call ID to localStorage BEFORE clearing the ref
    const vapiCallId = callRef.current?.id || "";
    if (vapiCallId) {
      localStorage.setItem("vapi_call_id", vapiCallId);
      console.log("💾 Saved VAPI call ID to localStorage:", vapiCallId);
    } else {
      console.warn("⚠️ No VAPI call ID available to save");
    }

    if (vapiRef.current && isCallActive) {
      try {
        vapiRef.current.stop();
      } catch (e) {
        // Ignore Krisp/WASM cleanup errors
        console.debug("Call end cleanup:", e);
      }
      setIsCallActive(false);
      setIsMicActive(false);
      setVoiceState("idle");
    }

    callRef.current = null;
  };

  const toggleMute = () => {
    if (vapiRef.current && isCallActive) {
      try {
        vapiRef.current.setMuted(!isMuted);
        setIsMuted(!isMuted);
      } catch (e) {
        console.warn("Error toggling mute:", e);
      }
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
    if (isCallActive) {
      endCall();
    }

    // Always navigate to end-of-call for processing
    router.push("/end-of-call");
  };

  const handleSaveAndExit = () => {
    if (isCallActive) {
      endCall();
    }
    router.push("/incomplete-intake");
  };

  return (
    <>
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
