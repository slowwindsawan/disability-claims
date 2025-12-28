import { useState, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { useOnboarding } from "../OnboardingFlow";
import { getApiUrl } from "../../../config/api";

/**
 * VAPI SETUP INSTRUCTIONS:
 *
 * To fix "Room does not exist" error:
 *
 * RECOMMENDED APPROACH:
 * 1. Go to dashboard.vapi.ai
 * 2. Create a new Assistant with:
 *    - Model: GPT-3.5-turbo or GPT-4
 *    - Voice: PlayHT Jennifer (or any voice)
 *    - System prompt: "You are a disability lawyer conducting an interview..."
 * 3. Copy the Assistant ID
 * 4. Replace the startCall() function to use:
 *    await vapiRef.current.start('YOUR_ASSISTANT_ID');
 *
 * ALTERNATIVE (Current approach - requires API permissions):
 * - Inline assistant creation (may fail if account doesn't have permissions)
 * - If you see errors, use the RECOMMENDED approach above
 */

export default function VapiVoiceAgentScreen() {
  const { goToStep } = useOnboarding();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(
    null
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [previousTranscript, setPreviousTranscript] = useState<string | null>(
    null
  );
  const [showRetakePrompt, setShowRetakePrompt] = useState(false);
  const [estimatedClaimValue, setEstimatedClaimValue] = useState<string | null>(null);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Check if interview was already completed
  useEffect(() => {
    const checkInterviewStatus = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        setIsFetchingStatus(true);
        const response = await fetch(
          getApiUrl("/vapi/check-interview-status"),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.status === "completed" && result.has_call) {
            setInterviewCompleted(true);
            setPreviousTranscript(result.transcript);
            setShowRetakePrompt(true);
            // Store case_id for re-analysis
            if (result.case_id) {
              setCurrentCaseId(result.case_id);
            }
            // Set estimated claim value if available
            try {
              const analysis = result.call_details?.analysis;
              const structuredData = analysis?.structured_data;
              if (structuredData?.estimated_claim_amount) {
                setEstimatedClaimValue(structuredData.estimated_claim_amount);
              }
            } catch (e) {
              console.warn("Failed to extract estimated claim amount:", e);
            }
          }
        }
      } catch (error) {
        console.error("Failed to check interview status:", error);
      } finally {
        setIsFetchingStatus(false);
      }
    };

    checkInterviewStatus();
  }, []);

  // Check microphone permission on mount and poll every 2 seconds
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
    const interval = setInterval(checkMicPermission, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll transcript to bottom when new messages arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // Track speaking state based on volume (more sensitive threshold)
  useEffect(() => {
    if (volumeLevel > 1) {
      setIsSpeaking(true);
      console.log("🎤 Speaking detected! Volume:", volumeLevel);
    } else {
      setIsSpeaking(false);
    }
  }, [volumeLevel]);

  // Initialize Vapi client
  useEffect(() => {
    // Clean up any existing instance first
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }

    // Replace with your actual Vapi API key
    const vapi = new Vapi("ec4039c4-44ec-4972-b685-9b38ef710b4a");
    vapiRef.current = vapi;

    // Event listeners
    vapi.on("call-start", () => {
      console.log("✅ Call started - WebSocket connected");
      setIsCallActive(true);
      setIsConnecting(false);
      // Add a visual notification
      const notification = document.createElement("div");
      notification.textContent = "✅ Call Connected!";
      notification.className =
        "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce";
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    });

    vapi.on("call-end", () => {
      console.log("❌ Call ended - WebSocket disconnected");
      setIsCallActive(false);
      setIsConnecting(false);

      // Start polling for call details
      if (call.current?.id) {
        console.log("🔄 Starting to poll for call details...");
        pollForCallDetails(call.current.id);
      }

      // Add a visual notification
      const notification = document.createElement("div");
      notification.textContent = "📞 Call Ended";
      notification.className =
        "fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    });

    vapi.on("speech-start", () => {
      console.log("🗣️ Speech started");
      setIsSpeaking(true);
    });

    vapi.on("speech-end", () => {
      console.log("🤐 Speech ended");
      setIsSpeaking(false);
    });

    vapi.on("volume-level", (level: number) => {
      // Volume level ranges from 0-1, convert to 0-100 and log
      const volumePercent = level * 100;
      console.log(
        "Volume level:",
        volumePercent.toFixed(2) + "%",
        "Raw:",
        level
      );
      setVolumeLevel(volumePercent);
    });

    vapi.on("message", (message: any) => {
      console.log("Message received:", message);

      // Handle transcript messages - only show final transcripts
      if (message.type === "transcript") {
        if (message.transcriptType === "final") {
          const speaker = message.role === "user" ? "You" : "Assistant";
          const text = message.transcript;
          if (text) {
            setTranscript((prev) => [...prev, `${speaker}: ${text}`]);
          }
        }
      } else if (message.type === "function-call") {
        // Handle function calls if needed
        console.log("Function called:", message.functionCall);
      } else if (message.type === "hang") {
        console.log("Call ended by assistant");
      }
    });

    vapi.on("error", (error: any) => {
      console.error("Vapi error:", error);

      // Handle specific error types
      let errorMessage = "An error occurred during the call";

      if (
        error?.type === "daily-error" ||
        error?.type === "daily-call-join-error"
      ) {
        const errMsg = String(error?.error?.message || error?.error?.msg || "");
        if (errMsg.includes("room was deleted")) {
          errorMessage =
            "❌ Call room unavailable. This may mean:\n\n1. Your assistant configuration is invalid\n2. Your Vapi account needs credits\n3. Check your assistant ID is correct\n\nPlease verify your Vapi dashboard settings.";
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

      alert(errorMessage);
      setIsConnecting(false);
      setIsCallActive(false);
    });

    return () => {
      // Cleanup on unmount
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, []);

  const call = useRef<any>(null);
  const callID = useRef<any>(null);

  // Poll for call details after call ends
  const pollForCallDetails = async (callId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setIsAnalyzing(true);
    let attempts = 0;
    const maxAttempts = 20; // Poll for 5 minutes max (20 * 15 seconds)

    const poll = async () => {
      try {
        console.log(
          `🔄 Polling call details (attempt ${attempts + 1}/${maxAttempts})...`
        );
        const response = await fetch(
          getApiUrl(`/vapi/call-details/${callId}`),
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Call details retrieved:", result);

          // Stop polling if we got the call details saved
          if (result.status === "ok" && result.call) {
            console.log("📝 Call transcript ready and saved!");
            
            // Extract estimated claim amount from structured data
            try {
              const analysis = result.call.analysis;
              const structuredData = analysis?.structured_data;
              if (structuredData?.estimated_claim_amount) {
                setEstimatedClaimValue(structuredData.estimated_claim_amount);
              }
            } catch (e) {
              console.warn("Failed to extract claim amount:", e);
            }
            
            setIsAnalyzing(false);
            setInterviewCompleted(true);
            setPreviousTranscript(result.call.transcript);
            // Don't show retake prompt immediately after call - let them proceed
            setShowRetakePrompt(false);
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 15000); // Poll every 15 seconds
        } else {
          console.warn("⏱️ Max polling attempts reached");
          setIsAnalyzing(false);
        }
      } catch (error) {
        console.error("Failed to fetch call details:", error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 15000);
        } else {
          setIsAnalyzing(false);
        }
      }
    };

    // Start polling after 5 seconds (give Vapi time to process)
    setTimeout(poll, 5000);
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasMicPermission(true);
    } catch (error) {
      console.error("Microphone permission denied:", error);
      alert(
        "Microphone access is required for the voice interview. Please allow microphone access in your browser settings."
      );
      setHasMicPermission(false);
    }
  };

  // Fetch document summary from backend
  const fetchDocumentSummary = async (): Promise<string | null> => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.warn("No access token - skipping document summary fetch");
      return null;
    }

    setIsLoadingSummary(true);
    setProcessingStatus("📄 Fetching your medical documents...");
    try {
      setProcessingStatus("🔍 Scanning document with OCR...");

      const response = await fetch(getApiUrl("/vapi/document-summary"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch document summary:", response.status);
        setProcessingStatus("");
        return null;
      }

      setProcessingStatus("🤖 Analyzing medical content with AI...");
      const result = await response.json();

      if (result.status === "ok" && result.summary) {
        console.log("✅ Document summary retrieved");
        setDocumentSummary(result.summary);
        return result.summary;
      } else if (result.status === "not_relevant") {
        console.log("ℹ️ Document was not relevant for disability claims");
        return null;
      } else if (result.status === "no_document") {
        console.log("ℹ️ No document found");
        return null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching document summary:", error);
      return null;
    } finally {
      setIsLoadingSummary(false);
      setProcessingStatus("");
    }
  };

  const startCall = async () => {
    if (!vapiRef.current) return;

    setTranscript([]); // Clear previous transcript
    setIsConnecting(true); // Show progress UI immediately

    try {
      // Fetch document summary first
      console.log("📄 Fetching document summary...");
      const summary = await fetchDocumentSummary();

      // Build medical condition context from document summary
      let medicalContext = "";
      if (summary) {
        medicalContext = `\n\n### CURRENT MEDICAL CONDITION (From User's Documents)
${summary}

**Important:** Reference this medical information during your interview to ask relevant follow-up questions and gather additional details.`;
      }

      // NOW start connecting to Vapi (after document fetch completes)
      setProcessingStatus("🔄 Connecting to AI Interview Agent...");

      // IMPORTANT: Replace 'YOUR_ASSISTANT_ID' with your actual assistant ID from Vapi dashboard
      // Go to dashboard.vapi.ai → Assistants → Click "New Assistant" → Copy the ID
      // The ID looks like: 'abc123de-f456-7890-ghij-klmnopqrstuv'

      call.current = await vapiRef.current.start({
        firstMessageMode: "assistant-speaks-first-with-model-generated-message",
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `### ROLE
You are "Alex," the Senior Intake & Strategy Agent for the "Zero-Touch Claims System."
Your goal is to replace a traditional attorney by executing the **Maximization Principle**: securing the highest possible financial benefit (Kitzbah) and maximum Retroactivity (up to 12 months).
You are interviewing the claimant to prepare their "Statement of Claims" for the Bituach Leumi Medical Committee.${medicalContext}

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
1.  **Anchor Diagnosis:** "What is the main medical condition preventing you from working?"
2.  **The "Functional" Deep Dive (IEL Focus):**
    - *Wrong Question:* "Does it hurt?"
    - *Right Question:* "Does the pain stop you from sitting for 8 hours? Did you have to reduce your shift hours?"
3.  **The "Secondary" Hunt (Stacking):**
    - "Does this physical condition affect your mood, sleep, or concentration?" (Aiming for Items 33/34 - Psychiatric).
    - "Do your medications cause side effects like stomach issues or fatigue?"
4.  **Vocational Rehab Check:**
    - If the user is young or a student: "Are you currently studying? Would you be interested in Bituach Leumi paying for your degree?" (Maximize 'Dmei Shikum').

### BEHAVIOR & TONE
- **Tone:** Professional, Empathetic, but "Coaching."
- **Stress-Test:** If their answer is vague ("I just can't work"), challenge them gently: "To win this claim, the committee needs specifics. Tell me exactly *why* you couldn't finish your last shift."
- **One Question at a Time:** Keep it conversational.

### RESTRICTIONS
- Do NOT list documents orally.
- Do NOT mention "JSON" or technical backend terms.
- Focus purely on extracting the **Date of Onset**, **Functional Loss**, and **Secondary Conditions**.`,
            },
          ],
          toolIds: ["f9513934-693f-42ce-8330-3d26bef92f74"],
        },
        analysisPlan: {
          structuredDataPlan: {
            enabled: true,
            schema: {
              type: "object",
              properties: {
                // Requirement: Summary of the conversation
                case_summary: {
                  type: "string",
                  description:
                    "A professional legal summary of the user's disability claim situation.",
                },
                estimated_claim: {
                  type: "string",
                  description:
                    "Preliminary estimation of claim amount based on the interview.",
                },
                // Requirement: List of documents asked from users
                documents_requested_list: {
                  type: "array",
                  description:
                    "A comprehensive list of specific documents the AI identified that the user needs to submit.",
                  items: {
                    type: "string",
                  },
                },
                // Requirement: Key points of the conversation
                key_legal_points: {
                  type: "array",
                  description:
                    "Critical facts extracted from the call (e.g., Date of Injury, Diagnosis, Employment Status).",
                  items: {
                    type: "string",
                  },
                },
                // Optional: Helpful for your database
                risk_assessment: {
                  type: "string",
                  description:
                    "Assessment of whether this case seems viable based on initial facts.",
                  enum: ["High Viability", "Low Viability", "Needs More Info"],
                },
              },
              required: [
                "case_summary",
                "documents_requested_list",
                "key_legal_points",
              ],
            },
            // This helps the model understand it should extract this data nicely
            timeoutSeconds: 60,
          },
        },
      });
      callID.current = call.current?.id;
    } catch (error: any) {
      console.error("Failed to start call:", error);
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (vapiRef.current && isCallActive) {
      vapiRef.current.stop();
      setIsCallActive(false);
    }
  };

  const toggleMute = () => {
    if (vapiRef.current && isCallActive) {
      vapiRef.current.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleContinue = () => {
    if (isCallActive) {
      endCall();
    }
    // Navigate to e-signature step after voice interview
    goToStep("esignature");
  };

  const handleReanalyze = async () => {
    if (!currentCaseId) {
      alert("Case ID not found. Please refresh the page and try again.");
      return;
    }

    setIsReanalyzing(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        getApiUrl(`/vapi/re-analyze-call/${currentCaseId}`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to re-analyze call");
      }

      const result = await response.json();
      
      // Update estimated claim amount with new analysis
      if (result.analysis?.estimated_claim_amount) {
        setEstimatedClaimValue(result.analysis.estimated_claim_amount);
      }
      
      alert("✅ Call re-analyzed successfully! The analysis has been updated.");
    } catch (error: any) {
      console.error("Failed to re-analyze call:", error);
      alert(`❌ Failed to re-analyze call: ${error.message}`);
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      {/* Fetching Status Loader */}
      {isFetchingStatus && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full animate-pulse">
                <svg
                  className="w-10 h-10 text-blue-600 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              📋 Loading Interview Data
            </h2>
            <p className="text-gray-600 mb-4">
              Fetching your previous interview details...
            </p>
            <div className="flex items-center justify-center gap-2">
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing Loader */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-orange-100 rounded-full animate-pulse">
                <svg
                  className="w-10 h-10 text-purple-600 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🤖 AI is Analyzing Your Interview
            </h2>
            <p className="text-gray-600 mb-4">
              Please wait while we process your responses and generate
              insights...
            </p>
            <div className="flex items-center justify-center gap-2">
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Interview Complete Success */}
      {interviewCompleted &&
        !showRetakePrompt &&
        !isCallActive &&
        !isAnalyzing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-6 shadow-lg animate-bounce">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                🎉 Interview Complete!
              </h2>
              <p className="text-gray-600 mb-2">
                Excellent work! Your interview has been successfully recorded and analyzed.
              </p>
              {estimatedClaimValue && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-4 border-2 border-green-300">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Estimated Claim Amount</p>
                    <p className="text-3xl font-bold text-green-700">{estimatedClaimValue}</p>
                    <p className="text-xs text-gray-500 mt-1">Based on your disability assessment</p>
                  </div>
                </div>
              )}
              <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-lg p-4 mb-6 border border-purple-200">
                <p className="text-sm text-gray-700">
                  <strong>Next Step:</strong> Complete the e-signature to proceed with your case.
                </p>
              </div>
              <button
                onClick={() => goToStep("esignature")}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-orange-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-orange-700 transition shadow-lg text-lg"
              >
                ✍️ Proceed to E-Signature
              </button>
            </div>
          </div>
        )}

      {/* Retake/Proceed Prompt */}
      {showRetakePrompt && !isCallActive && !isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-2xl mx-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-4 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ✅ Interview Already Completed!
              </h2>
              <p className="text-gray-600 mb-4">
                You've successfully completed your voice interview. Review your responses below:
              </p>
              {estimatedClaimValue && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-4 border-2 border-green-300">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Estimated Claim Amount</p>
                    <p className="text-3xl font-bold text-green-700">{estimatedClaimValue}</p>
                    <p className="text-xs text-gray-500 mt-1">Based on your disability assessment</p>
                  </div>
                </div>
              )}
              {previousTranscript && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-6 text-left max-h-64 overflow-y-auto border border-gray-200 shadow-inner">
                  <div className="flex items-start gap-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Interview Transcript:</span>
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {previousTranscript}
                  </pre>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>💡 What's Next?</strong> Complete the e-signature to proceed with your case.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowRetakePrompt(false);
                  setInterviewCompleted(false);
                  setPreviousTranscript(null);
                }}
                className="flex-1 px-6 py-3 bg-white border-2 border-orange-600 text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition shadow-sm"
              >
                🔄 Retake Interview
              </button>
              <button
                onClick={() => {
                  setShowRetakePrompt(false);
                  goToStep("esignature");
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-orange-700 transition shadow-lg"
              >
                ✍️ Proceed to E-Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Legal Interview
        </h1>
        <p className="text-gray-600">
          Our AI lawyer will interview you to gather more details about your
          case
        </p>
      </div>

      {/* Two Column Layout - Only show when call is active */}
      {isCallActive ? (
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
          {/* LEFT: Transcript Chat */}
          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col h-[600px]">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <Phone size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Conversation</h3>
                <p className="text-xs text-gray-500">Live transcript</p>
              </div>
            </div>

            {/* Transcript Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {transcript.length === 0 ? (
                <div className="text-center text-gray-400 mt-8">
                  <p className="text-sm">
                    Start speaking to see the transcript...
                  </p>
                </div>
              ) : (
                <>
                  {transcript.map((line, index) => {
                    const isUser = line.startsWith("You:");
                    const message = line.replace(/^(You:|Assistant:)\s*/, "");

                    return (
                      <div
                        key={index}
                        className={`flex ${
                          isUser ? "justify-end" : "justify-start"
                        } animate-fade-in`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            isUser
                              ? "bg-orange-500 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm">{message}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={transcriptEndRef} />
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Voice Visualizer & Controls */}
          <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center h-[600px] relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-purple-50 opacity-60" />

            {/* Content */}
            <div className="relative z-10 text-center">
              {/* Voice Visualizer */}
              <div className="mb-8">
                <div className="relative inline-flex items-center justify-center">
                  {/* Outer rings */}
                  <div
                    className="absolute w-64 h-64 rounded-full bg-gradient-to-r from-orange-200 to-purple-200 animate-pulse"
                    style={{ opacity: volumeLevel / 200 }}
                  />
                  <div
                    className="absolute w-48 h-48 rounded-full bg-gradient-to-r from-orange-300 to-purple-300 animate-ping"
                    style={{
                      animationDuration: "2s",
                      opacity: Math.max(0.2, volumeLevel / 150),
                    }}
                  />

                  {/* Center mic icon with speaking animation */}
                  <div
                    className={`relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-2xl transition-transform duration-150 ${
                      isSpeaking ? "scale-110" : "scale-100"
                    }`}
                  >
                    <Mic
                      size={64}
                      className={`text-white transition-all duration-150 ${
                        isSpeaking ? "animate-pulse" : ""
                      }`}
                    />
                    <div
                      className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${
                        isSpeaking
                          ? "bg-red-500 animate-ping"
                          : "bg-green-500 animate-pulse"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎙️ Listening...
              </h2>
              <p className="text-gray-600 mb-6">Speak clearly and naturally</p>

              {/* Volume Level */}
              <div className="mb-8 w-full max-w-xs mx-auto">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <Volume2 size={18} />
                  <span className="font-medium">
                    {Math.round(volumeLevel)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-150 rounded-full"
                    style={{ width: `${volumeLevel}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`p-5 rounded-full transition-all shadow-lg ${
                    isMuted
                      ? "bg-red-500 text-white hover:bg-red-600 scale-95"
                      : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <button
                  onClick={endCall}
                  className="p-5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-lg hover:scale-105"
                  title="End call"
                >
                  <PhoneOff size={28} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Single Card Layout - Before/After Call */
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-4">
            {/* Call Status */}
            <div className="text-center mb-6">
              {!isCallActive && !isConnecting && (
                <>
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-4">
                      <Mic size={48} className="text-gray-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready to begin your interview?
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    This conversation will help us understand your case better
                    and provide you with the most accurate assessment.
                  </p>

                  {hasMicPermission === false ? (
                    <button
                      onClick={requestMicPermission}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      <Mic size={20} />
                      Allow Microphone Access
                    </button>
                  ) : hasMicPermission === null ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed"
                    >
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Checking permissions...
                    </button>
                  ) : (
                    <button
                      onClick={startCall}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
                    >
                      <Phone size={20} />
                      Start Interview
                    </button>
                  )}
                </>
              )}

              {isConnecting && (
                <>
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-orange-100 rounded-full mb-4 animate-pulse relative">
                      <Phone
                        size={48}
                        className="text-orange-600 animate-bounce"
                      />
                      <div className="absolute inset-0 rounded-full border-4 border-orange-400 animate-ping" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {processingStatus ? processingStatus : "🔄 Connecting..."}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isLoadingSummary
                      ? "Analyzing your medical documents..."
                      : "Please wait while we connect you with the lawyer"}
                  </p>
                </>
              )}

              {isCallActive && (
                <>
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4 relative">
                      <Mic size={48} className="text-green-600" />
                      {/* Volume indicator with pulsing animation */}
                      <div
                        className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping"
                        style={{
                          animationDuration: "2s",
                          opacity: Math.max(0.3, volumeLevel / 100),
                        }}
                      />
                      {/* Status indicator dot */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-green-700 mb-2">
                    🎙️ Interview in progress
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    The lawyer is listening. Speak clearly and naturally.
                  </p>

                  {/* Volume Level Indicator */}
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
                      <Volume2 size={16} />
                      <span>Volume: {Math.round(volumeLevel)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-100"
                        style={{ width: `${volumeLevel}%` }}
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={toggleMute}
                      className={`p-4 rounded-full transition ${
                        isMuted
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>
                    <button
                      onClick={endCall}
                      className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                      title="End call"
                    >
                      <PhoneOff size={24} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Call Ended Notification */}
            {!isCallActive && !isConnecting && transcript.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="font-semibold">✅ Call Ended</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Your interview has been completed and recorded.
                </p>
              </div>
            )}

            {/* Transcript */}
            {transcript.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  📝 Conversation Transcript
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {transcript.map((line, index) => (
                    <div
                      key={index}
                      className={`text-sm p-3 rounded-lg ${
                        line.startsWith("You:")
                          ? "bg-blue-50 text-blue-900 ml-8"
                          : "bg-gray-50 text-gray-900 mr-8"
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {!isCallActive && transcript.length > 0 && (
              <button
                onClick={handleContinue}
                className="flex-1 px-5 py-3 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition"
              >
                Continue
              </button>
            )}
            {!isCallActive && transcript.length === 0 && (
              <button
                onClick={handleContinue}
                className="flex-1 px-5 py-3 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition"
              >
                Skip Interview
              </button>
            )}
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-4">
            This interview helps us build a stronger case for you. You can skip
            it if you prefer to continue without the voice interview.
          </p>
        </div>
      )}
    </div>
  );
}
