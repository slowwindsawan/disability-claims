"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  Upload,
  AlertCircle,
  MessageSquare,
  Shield,
  User,
  Scale,
  ChevronLeft,
  Info,
  MapPin,
  Sparkles,
  TrendingUp,
  Gift,
  Car,
  Briefcase,
  Bell,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import ExtensionSyncWidget from "@/components/extension-sync-widget";
import * as legacyApi from "@/lib/api";
import { useNotificationStore } from "@/stores/notificationStore";
import WaitingForResponsePage from "@/app/waiting-for-response/page";
import ClaimApprovedPage from "@/new-resources/app/claim-approved/page";
import ClaimRejectedPage from "@/new-resources/app/claim-rejected/page";
import NotEligiblePage from "@/new-resources/app/not-eligible/page";
import useCurrentCase from "@/lib/useCurrentCase";

interface RequiredDocument {
  id: number;
  backendId?: string; // The actual ID from documents_requested_list
  name: string;
  reason: string | "N/A";
  source: string | "N/A";
  status: "missing" | "uploaded";
  date: string | null;
  required: boolean;
  category: string;
}

const defaultRequiredDocuments: RequiredDocument[] = [];

const mobilityDocuments = [];

const specialServicesDocuments = [];

export default function DashboardPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isRTL = language === "he";
  const { currentCase } = useCurrentCase();

  const [uploadingDoc, setUploadingDoc] = useState<number | null>(null);
  const [ocrAnalyzing, setOcrAnalyzing] = useState(false);
  const [ocrComplete, setOcrComplete] = useState(false);
  const [disabilityPercentage, setDisabilityPercentage] = useState(45);
  const [caseStrength, setCaseStrength] = useState("חזק");
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [paymentDetailsCompleted, setPaymentDetailsCompleted] = useState(false);
  // In a real app, this would come from user session/database

  // In a real app, this would come from user session/database based on claim maximization modal selections
  const [hasMobilityClaim, setHasMobilityClaim] = useState(false);
  const [hasSpecialServicesClaim, setHasSpecialServicesClaim] = useState(false);

  const [hasRejectedDocuments, setHasRejectedDocuments] = useState(true); // In real app, from database
  const rejectedDocumentId = 1; // ID card rejected

  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [hasCompletedPayment, setHasCompletedPayment] = useState(true); // Check if user completed payment/checkout
  const [showNotifications, setShowNotifications] = useState(false);

  // Notification store
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
  } = useNotificationStore();

  // Required documents state - from database
  const [requiredDocuments, setRequiredDocuments] = useState<
    RequiredDocument[]
  >(defaultRequiredDocuments);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [userCase, setUserCase] = useState<any>(null);
  const [finalDocumentAnalysis, setFinalDocumentAnalysis] = useState<any>(null);
  const [callSummary, setCallSummary] = useState<any>(null);

  // File upload ref for triggering file picker
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          router.push("/");
          return;
        }
        // Verify token is still valid and get user data
        const res: any = await legacyApi.apiMe();
        if (res?.anonymous || !res?.user) {
          router.push("/");
          return;
        }

        // Check if user is admin or subadmin - they cannot access user dashboard
        const role = res?.user?.role;
        if (role === "admin" || role === "subadmin") {
          router.push("/admin");
          return;
        }

        setIsAuthenticated(true);
      } catch (e) {
        console.error("Auth check failed:", e);
        router.push("/");
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  // Handle upload button click - trigger file input
  const handleUploadClick = (docId: number) => {
    setSelectedDocId(docId);
    fileInputRef.current?.click();
  };

  // Handle file selection and upload
  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDocId || !userCase?.id) {
      console.error("Missing file, docId, or case");
      return;
    }

    try {
      setUploadingDoc(selectedDocId);
      const caseId = userCase.id;

      // Find the document from the documents list to get the backend ID and name
      const selectedDoc = requiredDocuments.find(
        (doc) => doc.id === selectedDocId
      );
      const documentBackendId = selectedDoc?.backendId;
      const documentName = selectedDoc?.name;

      const result = await legacyApi.apiUploadCaseDocument(
        caseId,
        file,
        "general",
        documentBackendId,
        documentName
      );
      console.log("Document uploaded:", result);

      // After successful upload, re-fetch the case to get updated call_summary
      try {
        const updatedCaseRes: any = await legacyApi.apiGetCase(caseId);
        const updatedCase = updatedCaseRes?.case || updatedCaseRes;
        const updatedCallSummary = updatedCase?.call_summary;

        // Parse call_summary if it's a string
        let parsedCallSummary = updatedCallSummary;
        if (typeof updatedCallSummary === "string") {
          try {
            parsedCallSummary = JSON.parse(updatedCallSummary);
          } catch {
            parsedCallSummary = null;
          }
        }

        // Update the documents list from the refreshed call_summary
        if (parsedCallSummary?.documents_requested_list) {
          const docsKey = parsedCallSummary.documents_requested_list;

          const dbDocs: RequiredDocument[] = docsKey.map(
            (item: any, idx: number) => {
              let name: string;
              let reason: string | "N/A" = "N/A";
              let source: string | "N/A" = "N/A";
              let status: "missing" | "uploaded" = "missing";
              let date: string | null = null;
              let required = true;
              let category = "general";

              if (typeof item === "string") {
                name = item;
              } else if (typeof item === "object" && item !== null) {
                name =
                  item.name || item.title || item.document_name || String(item);
                reason = item.reason || item.why_required || item.why || "N/A";
                source =
                  item.source ||
                  item.where_get ||
                  item.where_to_get ||
                  item.obtain_from ||
                  "N/A";
                // Check both item.status and item.uploaded for upload status
                if (
                  item.status === "uploaded" ||
                  item.status === "received" ||
                  item.uploaded === true
                ) {
                  status = "uploaded";
                } else {
                  status = "missing";
                }
                date =
                  item.date || item.uploaded_at || item.requested_at || null;
                required =
                  typeof item.required === "boolean" ? item.required : true;
                category = item.category || item.type || "general";
              } else {
                name = String(item);
              }

              return {
                id: idx + 1,
                backendId: item.id, // Store the actual backend document ID
                name,
                reason,
                source,
                status,
                date,
                required,
                category,
              } as RequiredDocument;
            }
          );

          setRequiredDocuments(dbDocs);
          setCallSummary(parsedCallSummary);
        } else {
          // Fallback: just mark the specific document as uploaded locally
          setRequiredDocuments((docs) =>
            docs.map((doc) =>
              doc.id === selectedDocId
                ? {
                    ...doc,
                    status: "uploaded",
                    date: new Date().toLocaleDateString("he-IL"),
                  }
                : doc
            )
          );
        }
      } catch (fetchError: any) {
        console.error("Failed to fetch updated case:", fetchError?.message);
        // Fallback: mark the specific document as uploaded
        setRequiredDocuments((docs) =>
          docs.map((doc) =>
            doc.id === selectedDocId
              ? {
                  ...doc,
                  status: "uploaded",
                  date: new Date().toLocaleDateString("he-IL"),
                }
              : doc
          )
        );
      }

      alert("המסמך הועלה בהצלחה");
    } catch (e: any) {
      console.error("Upload failed:", e);
      alert(`שגיאה בהעלאת המסמך: ${e?.message || e}`);
    } finally {
      setUploadingDoc(null);
      setSelectedDocId(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    // Only load profile if authenticated
    if (!isAuthenticated || checkingAuth) return;

    // load user profile and case documents from backend
    const loadProfileAndDocuments = async () => {
      setLoadingProfile(true);
      setLoadingDocuments(true);
      try {
        // Load profile
        const res: any = await legacyApi.apiGetProfile();
        const p = res?.profile || res?.data || res;
        setProfile(p);
        if (
          p?.eligibility_rating !== undefined &&
          p?.eligibility_rating !== null
        ) {
          setDisabilityPercentage(p.eligibility_rating);
        }
        if (p?.eligibility_title) setCaseStrength(p.eligibility_title);

        // Check if payment details are completed by looking at the actual DB columns
        const parseMaybe = (v: any) => {
          if (!v) return null;
          if (typeof v === "string") {
            try {
              return JSON.parse(v);
            } catch {
              return null;
            }
          }
          return v;
        };

        const payments = parseMaybe(p?.payments);
        const contact = parseMaybe(p?.contact_details);

        const hasPayments =
          payments &&
          typeof payments === "object" &&
          Object.keys(payments).length > 0;
        const hasContact =
          contact &&
          typeof contact === "object" &&
          Object.keys(contact).length > 0;

        // Only show the "Complete details" card if BOTH columns are missing
        setPaymentDetailsCompleted(hasPayments && hasContact);

        // Load cases to get the first case
        try {
          const casesRes: any = await legacyApi.apiGetCases();
          console.log("apiGetCases response:", casesRes);
          console.log("casesRes type:", typeof casesRes);
          console.log(
            "casesRes keys:",
            casesRes && typeof casesRes === "object"
              ? Object.keys(casesRes)
              : "not an object"
          );
          console.log("casesRes.cases:", casesRes?.cases);
          console.log("casesRes.data:", casesRes?.data);

          // Try multiple possible response shapes
          let cases = casesRes?.cases;
          if (!cases && casesRes?.data) {
            if (Array.isArray(casesRes.data)) {
              cases = casesRes.data;
            } else if (casesRes.data?.cases) {
              cases = casesRes.data.cases;
            }
          }
          if (!Array.isArray(cases)) {
            cases = [];
          }

          console.log("extracted cases:", cases, "length:", cases?.length);

          if (cases && Array.isArray(cases) && cases.length > 0) {
            const firstCase = cases[0];
            const caseId = firstCase.id;

            // Store the first case row in state (quick reference)
            setUserCase(firstCase);

            // Extract final_document_analysis if available
            if (firstCase.final_document_analysis) {
              setFinalDocumentAnalysis(firstCase.final_document_analysis);
            }

            console.log("DEBUG: Set userCase to:", firstCase);

            // Prefer call_summary from list item, but if missing fetch full case from backend
            let caseDetails: any = firstCase;
            let callSummary = parseMaybe(caseDetails.call_summary);

            if (!callSummary) {
              try {
                const caseDetailsRes: any = await legacyApi.apiGetCase(caseId);
                caseDetails =
                  caseDetailsRes?.case || caseDetailsRes || firstCase;
                callSummary = parseMaybe(caseDetails.call_summary);
              } catch (e) {
                console.warn("apiGetCase failed, using first case object", e);
                caseDetails = firstCase;
              }
            }

            // Store the call_summary for later use
            setCallSummary(callSummary);

            const docsKey =
              callSummary?.documents_requested ||
              callSummary?.documents_requested_list ||
              null;

            console.log("DEBUG: callSummary:", callSummary);
            console.log("DEBUG: docsKey:", docsKey);
            console.log("DEBUG: isArray(docsKey):", Array.isArray(docsKey));

            if (
              callSummary &&
              docsKey &&
              Array.isArray(docsKey) &&
              docsKey.length > 0
            ) {
              // Convert DB entries to a uniform format
              const dbDocs: RequiredDocument[] = docsKey.map(
                (item: any, idx: number) => {
                  let name: string;
                  let reason: string | "N/A" = "N/A";
                  let source: string | "N/A" = "N/A";
                  let status: "missing" | "uploaded" = "missing";
                  let date: string | null = null;
                  let required = true;
                  let category = "general";

                  if (typeof item === "string") {
                    name = item;
                  } else if (typeof item === "object" && item !== null) {
                    name =
                      item.name ||
                      item.title ||
                      item.document_name ||
                      String(item);
                    reason =
                      item.reason || item.why_required || item.why || "N/A";
                    source =
                      item.source ||
                      item.where_get ||
                      item.where_to_get ||
                      item.obtain_from ||
                      "N/A";

                    // Use the uploaded flag to determine status
                    // uploaded=true means the file has been submitted, false means still needed
                    if (item.uploaded === true) {
                      status = "uploaded";
                    } else {
                      status = "missing";
                    }

                    date = item.uploaded_at || item.requested_at || null;
                    required =
                      typeof item.required === "boolean" ? item.required : true;
                    category = item.category || item.type || "general";
                  } else {
                    name = String(item);
                  }

                  return {
                    id: idx + 1,
                    backendId: item.id, // Store the actual backend document ID
                    name,
                    reason,
                    source,
                    status,
                    date,
                    required,
                    category,
                  } as RequiredDocument;
                }
              );

              // Use documents_requested_list directly from call_summary
              setRequiredDocuments(dbDocs);
            }
          }
        } catch (e: any) {
          console.error("failed to load case documents:", {
            error: e?.message,
            errorCode: e?.status,
            errorBody: e?.body,
            stack: e?.stack,
          });
          // Keep default documents if case loading fails
        }
      } catch (e: any) {
        console.error("failed to load profile", e);
        setProfileError(e?.message || "Unable to load profile");
      } finally {
        setLoadingProfile(false);
        setLoadingDocuments(false);
      }
    };
    loadProfileAndDocuments();
    // Check if extension is installed
    const checkExtension = () => {
      // In real app, check window.zerotouchExtension or similar
      setExtensionInstalled(false);
    };
    checkExtension();

    if (
      hasCompletedPayment &&
      !extensionInstalled &&
      !localStorage.getItem("extensionModalDismissed")
    ) {
      setShowExtensionModal(true);
    }

    // Fetch notifications when authenticated
    if (isAuthenticated && !checkingAuth) {
      fetchNotifications({ limit: 50 });
    }
  }, [
    hasCompletedPayment,
    extensionInstalled,
    isAuthenticated,
    checkingAuth,
    fetchNotifications,
  ]);

  const handleDismissExtensionModal = () => {
    setShowExtensionModal(false);
    localStorage.setItem("extensionModalDismissed", "true");
  };

  const handleInstallExtension = () => {
    window.open("https://chrome.google.com/webstore", "_blank");
    setShowExtensionModal(false);
    localStorage.setItem("extensionModalDismissed", "true");
  };

  const uploadedCount = requiredDocuments.filter(
    (doc) => doc.status === "uploaded"
  ).length;
  const requiredCount = requiredDocuments.filter((doc) => doc.required).length;
  const completionPercentage =
    requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

  const mobilityUploadedCount = mobilityDocuments.filter(
    (doc) => doc.status === "uploaded"
  ).length;
  const mobilityRequiredCount = mobilityDocuments.filter(
    (doc) => doc.required
  ).length;
  const mobilityCompletionPercentage =
    mobilityRequiredCount > 0
      ? Math.round((mobilityUploadedCount / mobilityRequiredCount) * 100)
      : 0;

  const specialServicesUploadedCount = specialServicesDocuments.filter(
    (doc) => doc.status === "uploaded"
  ).length;
  const specialServicesRequiredCount = specialServicesDocuments.filter(
    (doc) => doc.required
  ).length;
  const specialServicesCompletionPercentage =
    specialServicesRequiredCount > 0
      ? Math.round(
          (specialServicesUploadedCount / specialServicesRequiredCount) * 100
        )
      : 0;

  const handleStartAnalysis = async () => {
    console.log("🔵 Dashboard: Start Form 7801 AI Analysis button clicked");
    setOcrAnalyzing(true);
    try {
      // Get caseId from the userCase state
      const caseId = userCase?.id;

      if (!caseId) {
        throw new Error("No case found. Please reload the page.");
      }

      console.log("📋 Case ID:", caseId);
      console.log("📤 Calling Form 7801 OpenAI agent analysis endpoint...");

      const response = await fetch("/api/analyze-documents-form7801", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
        body: JSON.stringify({
          caseId: caseId,
        }),
      });

      console.log("📨 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || "Failed to analyze documents");
        } catch {
          throw new Error("Failed to analyze documents");
        }
      }

      const result = await response.json();
      console.log("✅ Analysis completed:", result);

      setOcrComplete(true);
    } catch (error) {
      console.error("❌ Error in analysis:", error);
      alert(
        `אירעה שגיאה בעת ניתוח המסמכים: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setOcrAnalyzing(false);
    } finally {
      setOcrAnalyzing(false);
    }
  };

  const handleSubmitForm7801 = () => {
    if (!finalDocumentAnalysis) return;

    // Store the analysis data in session storage for prefilling
    sessionStorage.setItem(
      "form7801_prefill_data",
      JSON.stringify(finalDocumentAnalysis)
    );

    // Navigate to legal-review page
    router.push("/legal-review");
  };

  const renderDocumentList = (documents: RequiredDocument[]) => (
    <div className="space-y-4">
      {console.warn("DEBUG: ./frontend", documents, "documents")}
      {documents.map((doc, index) => {
        console.log(
          `DEBUG: Rendering doc ${index}: name="${doc.name}", status="${doc.status}", uploaded=${doc.uploaded}`
        );
        const isRejected =
          hasRejectedDocuments && doc.id === rejectedDocumentId;

        return (
          <motion.div
            key={doc.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index }}
            className={`border rounded-lg p-4 transition-all ${
              isRejected
                ? "bg-red-50 border-red-300 ring-2 ring-red-200"
                : doc.status === "uploaded"
                ? "bg-green-50 border-green-200"
                : doc.required
                ? "bg-white border-slate-200 hover:border-blue-300"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {isRejected ? (
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                ) : doc.status === "uploaded" ? (
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                ) : doc.required ? (
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <Info className="w-6 h-6 text-slate-500" />
                  </div>
                )}
                {/* </CHANGE> */}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 leading-tight mb-1">
                      {doc.name}
                    </h4>
                    {isRejected ? (
                      <span className="inline-block px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded">
                        נדרש תיקון
                      </span>
                    ) : doc.required ? (
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                        נדרש
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        מומלץ
                      </span>
                    )}
                    {/* </CHANGE> */}
                  </div>
                </div>

                {isRejected && (
                  <div className="bg-red-100 border-r-4 border-red-600 rounded p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900 mb-1">
                          הערת מנהל התיק:
                        </p>
                        <p className="text-sm text-red-800 leading-relaxed">
                          הצילום מטושטש, לא ניתן לקרוא את מספר הזהות. אנא העלה
                          תמונה ברורה יותר של תעודת הזהות.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {/* </CHANGE> */}

                <div className="bg-slate-50 border-r-2 border-blue-500 rounded p-3 mb-3">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <span className="font-semibold text-blue-600">
                      למה זה נדרש:
                    </span>{" "}
                    {doc.reason === "N/A" ? (
                      <span className="text-slate-500 italic">לא זמין</span>
                    ) : (
                      doc.reason
                    )}
                  </p>
                </div>

                <div
                  className={`border-r-2 rounded p-3 mb-3 flex items-start gap-2 ${
                    doc.source === "N/A"
                      ? "bg-slate-50 border-slate-400"
                      : "bg-amber-50 border-amber-400"
                  }`}
                >
                  <MapPin
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      doc.source === "N/A" ? "text-slate-600" : "text-amber-600"
                    }`}
                  />
                  <p
                    className={`text-sm leading-relaxed ${
                      doc.source === "N/A" ? "text-slate-700" : "text-amber-900"
                    }`}
                  >
                    <span className="font-semibold">איפה להשיג:</span>{" "}
                    {doc.source === "N/A" ? (
                      <span className="italic">לא זמין</span>
                    ) : (
                      doc.source
                    )}
                  </p>
                </div>

                {isRejected ? (
                  <Button
                    onClick={() => handleUploadClick(doc.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                    size="sm"
                    disabled={uploadingDoc === doc.id}
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    {uploadingDoc === doc.id ? "טוען..." : "העלה שוב"}
                  </Button>
                ) : doc.status === "uploaded" ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-700 font-medium">
                      {doc.date}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4 ml-1" />
                      צפייה
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleUploadClick(doc.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                    disabled={uploadingDoc === doc.id}
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    {uploadingDoc === doc.id ? "טוען..." : "העלה מסמך"}
                  </Button>
                )}
                {/* </CHANGE> */}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Hidden file input for document upload */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">
                ZeroTouch Claims
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <ExtensionSyncWidget />
              </div>

              <Link href="/referral">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-blue-600" />
                  <span className="text-slate-700 font-medium">הפנייה</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="relative"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    fetchNotifications({ limit: 50 });
                  }
                }}
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Button>

              <div className="flex items-center gap-3">
                {profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name || "avatar"}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-slate-600" />
                )}
                <div className="text-right leading-tight">
                  <div className="text-slate-900 font-medium">
                    {profile?.full_name || "Your account"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Panel */}
      {showNotifications && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {showNotifications && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 20, opacity: 0 }}
          className="fixed top-20 left-4 right-4 md:right-auto md:left-auto md:w-96 md:top-16 lg:right-4 z-50 max-h-96 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">התראות</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center flex flex-col items-center justify-center h-48">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-600 text-sm">טוען התראות...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">אין התראות חדשות</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`p-4 border-r-4 cursor-pointer transition-colors ${
                      notification.read
                        ? "bg-white border-slate-200 hover:bg-slate-50"
                        : "bg-blue-50 border-blue-500 hover:bg-blue-100"
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          notification.read ? "bg-slate-200" : "bg-blue-500"
                        }`}
                      >
                        {notification.read ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            notification.read
                              ? "text-slate-700"
                              : "text-slate-900"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(notification.created_at).toLocaleDateString(
                            "he-IL"
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <Link href="/" className="hover:text-blue-600">
            בית
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-slate-900 font-medium">התיק שלי</span>
        </div>

        {!loadingProfile && !paymentDetailsCompleted && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Card className="p-6 bg-gradient-to-l from-orange-50 to-amber-50 border-orange-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    פעולה נדרשת: השלמת פרטים אישיים
                  </h3>
                  <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                    כדי להמשיך בתהליך, נדרשים ממך פרטי בנק, קופת חולים וכתובת.
                    פרטים אלו חיוניים למילוי טופס 7801 של ביטוח לאומי.
                  </p>
                  <Link href="/payment-details">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold">
                      <FileText className="w-4 h-4 ml-2" />
                      השלם פרטים עכשיו
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {requiredCount > 0 && uploadedCount === 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Card className="p-6 bg-gradient-to-l from-red-600 to-orange-600 text-white border-red-700 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">
                    עצור! הטיפול בתיק נעצר
                  </h3>
                  <p className="text-lg text-red-50 leading-relaxed">
                    יש לתקן מסמכים מסויימים כדי שנוכל להמשיך בטיפול בתיק שלך.
                    אנא בדוק את הרשימה למטה והעלה מחדש את המסמכים המסומנים.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {showExtensionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleDismissExtensionModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 md:p-12"
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Headline */}
              <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-6">
                {isRTL
                  ? "התקן את הסוכן האישי שלך"
                  : "Install Your Personal Agent"}
              </h2>

              <div className="space-y-4 mb-8">
                {[
                  {
                    key: "auto_sync",
                    icon: CheckCircle2,
                    label: isRTL
                      ? "הגשת מסמכים אוטומטית"
                      : "Auto-submit documents",
                  },
                  {
                    key: "track_payments",
                    icon: CheckCircle2,
                    label: isRTL ? "מעקב אחר סטטוס התיק" : "Track case status",
                  },
                  {
                    key: "no_faxes",
                    icon: CheckCircle2,
                    label: isRTL ? "ללא פקסים או נסיעות" : "No faxes or visits",
                  },
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit.key}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="flex items-center gap-3 bg-green-50 p-4 rounded-xl border border-green-200"
                  >
                    <benefit.icon className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <span className="text-lg font-medium text-slate-800">
                      {benefit.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handleInstallExtension}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                >
                  <Download
                    className={isRTL ? "w-5 h-5 mr-2" : "w-5 h-5 ml-2"}
                  />
                  {isRTL ? "התקן הרחבה" : "Install Extension"}
                </Button>

                <Button
                  onClick={handleDismissExtensionModal}
                  variant="outline"
                  size="lg"
                  className="w-full text-lg py-6 bg-transparent"
                >
                  {isRTL ? "אולי אחר כך" : "Maybe Later"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Welcome Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {profile
              ? `שלום, ${
                  String(profile.full_name || profile.email).split(" ")[0]
                }`
              : "שלום"}
          </h2>
          <p className="text-lg text-slate-600">
            על בסיס שיחת ההיכרות והשאלון, זיהינו את המסמכים הדרושים לתיק שלך
          </p>
        </motion.div>

        {/* AI Insight Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-l from-blue-600 to-blue-700 text-white mb-8 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-blue-200" />
                  <span className="text-sm font-semibold">
                    תובנות מהשיחה עם עו"ד AI
                  </span>
                </div>
                {callSummary?.case_summary && (
                  <p className="text-blue-100 leading-relaxed mb-4">
                    {callSummary.case_summary}
                  </p>
                )}
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-blue-200 mb-1">פיצוי משוער</p>
                    <p className="text-2xl font-bold">
                      ₪
                      {callSummary?.estimated_claim_amount?.toLocaleString() ||
                        "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">השלמת מסמכים</p>
                    <p className="text-lg font-semibold">
                      {completionPercentage}%
                    </p>
                  </div>
                </div>
              </div>
              <Scale className="w-12 h-12 text-blue-300" />
            </div>
          </Card>
        </motion.div>

        {/* Document Checklist Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Documents List */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {currentCase?.case?.status &&
            currentCase?.case?.status.toLowerCase() === "submitted" &&
            (!currentCase?.case?.stage ||
              currentCase?.case?.stage === "initial_questionnaire") &&
            !currentCase.case.committee_decision?.status ? (
              <WaitingForResponsePage callSummary={callSummary} />
            ) : (!currentCase?.case?.agreement_signed ||
                currentCase?.case?.agreement_signed == null) ? (
                <>
                  <div className="max-w-md rounded-xl border border-yellow-300 bg-yellow-50 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                        ⚠️
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Agreement Pending
                        </h3>
                        <p className="mt-1 text-sm text-gray-700">
                          You have not signed the required agreement yet. Please
                          review and sign it to continue.
                        </p>

                        <button
                          onClick={() => router.push(`/checkout?case_id=${currentCase?.case?.id}`)}
                          className="mt-4 inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 transition"
                        >
                          Review & Sign Agreement
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : currentCase?.case?.committee_decision ? (
              currentCase.case.committee_decision?.status === "approved" ? (
                <ClaimApprovedPage />
              ) : currentCase.case.committee_decision?.status === "rejected" ? (
                <ClaimRejectedPage />
              ) : currentCase.case.committee_decision?.status ===
                "ineligible" ? (
                <NotEligiblePage />
              ) : (
                <Card className="p-6 bg-white shadow-md">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        מסמכים לתביעת נכות כללית
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {uploadedCount} מתוך {requiredCount} מסמכים נדרשים הועלו
                      </p>
                    </div>
                  </div>

                  {loadingDocuments ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-6 bg-slate-200 rounded w-1/3" />
                      <div className="w-full h-2 bg-slate-200 rounded" />
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-slate-200 rounded w-3/4" />
                              <div className="h-3 bg-slate-200 rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">
                            התקדמות העלאת מסמכים
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {completionPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completionPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-l from-blue-600 to-blue-500"
                          />
                        </div>
                      </div>

                      {/* Documents List */}
                      {renderDocumentList(requiredDocuments)}
                    </>
                  )}

                  <AnimatePresence mode="wait">
                    {finalDocumentAnalysis ? (
                      // Show submission button when analysis is available
                      <motion.div
                        key="submission-button"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="mt-6 p-5 bg-gradient-to-l from-green-50 to-emerald-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <h4 className="font-bold text-green-900 text-lg">
                            הניתוח הושלם בהצלחה!
                          </h4>
                        </div>
                        <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                          מערכת ה-AI ניתחה את המסמכים והכינה טופס 7801 מוגדר
                          מראש. לחץ להמשך לעמוד הביקורת המשפטית להגשת הטופס.
                        </p>
                        <Button
                          onClick={handleSubmitForm7801}
                          className="w-full bg-gradient-to-l from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="w-5 h-5 ml-2" />
                          הגש את הטופס 7801
                        </Button>
                      </motion.div>
                    ) : completionPercentage === 100 && !ocrComplete ? (
                      <motion.div
                        key="analysis-button"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="mt-6 p-5 bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                          </div>
                          <h4 className="font-bold text-purple-900 text-lg">
                            כל המסמכים הועלו בהצלחה!
                          </h4>
                        </div>
                        <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                          מערכת ה-AI שלנו תנתח את המסמכים, תבין את חוזק הראיות
                          של התיק ותחשב את אחוזי הנכות הצפויים. זה ייקח כמה
                          שניות.
                        </p>
                        <Button
                          onClick={handleStartAnalysis}
                          disabled={ocrAnalyzing}
                          className="w-full bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                        >
                          {ocrAnalyzing ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full ml-2 animate-spin" />
                              מנתח מסמכים...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 ml-2" />
                              התחל ניתוח AI
                            </>
                          )}
                        </Button>
                      </motion.div>
                    ) : ocrComplete && !hasRejectedDocuments ? (
                      <motion.div
                        key="analysis-complete"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-6 p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg shadow-xl"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-7 h-7 text-white" />
                          </div>
                          <h4 className="font-bold text-2xl">
                            ניתוח התיק הושלם!
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                            <p className="text-sm text-emerald-100 mb-1">
                              חוזק הראיות
                            </p>
                            <p className="text-3xl font-bold">{caseStrength}</p>
                            <p className="text-xs text-emerald-100 mt-1">
                              על בסיס המסמכים שהועלו
                            </p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              תובנות מהניתוח:
                            </p>
                            <ul className="text-sm space-y-2 text-emerald-50">
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-300 mt-1">•</span>
                                <span>אבחנה רפואית ברורה ומתועדת היטב</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-300 mt-1">•</span>
                                <span>
                                  רציפות טיפולית של 8 חודשים מחזקת את התיק
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-300 mt-1">•</span>
                                <span>
                                  תיעוד השפעה תעסוקתית תומך בזכאות לפי סעיף 37
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <Link href="/legal-review">
                          <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-bold text-lg h-12">
                            <CheckCircle2 className="w-5 h-5 ml-2" />
                            התיק מוכן - המשך לסקירת נתונים
                          </Button>
                        </Link>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Card>
              )
            ) : (
              <>
                <Card className="p-6 bg-white shadow-md">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        מסמכים לתביעת נכות כללית
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {uploadedCount} מתוך {requiredCount} מסמכים נדרשים הועלו
                      </p>
                    </div>
                  </div>

                  {loadingDocuments ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-6 bg-slate-200 rounded w-1/3" />
                      <div className="w-full h-2 bg-slate-200 rounded" />
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-slate-200 rounded w-3/4" />
                              <div className="h-3 bg-slate-200 rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">
                            התקדמות העלאת מסמכים
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {completionPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completionPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-l from-blue-600 to-blue-500"
                          />
                        </div>
                      </div>

                      {/* Documents List */}
                      {renderDocumentList(requiredDocuments)}
                    </>
                  )}

                  <AnimatePresence mode="wait">
                    {finalDocumentAnalysis ? (
                      // Show submission button when analysis is available
                      <motion.div
                        key="submission-button"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="mt-6 p-5 bg-gradient-to-l from-green-50 to-emerald-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <h4 className="font-bold text-green-900 text-lg">
                            הניתוח הושלם בהצלחה!
                          </h4>
                        </div>
                        <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                          מערכת ה-AI ניתחה את המסמכים והכינה טופס 7801 מוגדר
                          מראש. לחץ להמשך לעמוד הביקורת המשפטית להגשת הטופס.
                        </p>
                        <Button
                          onClick={handleSubmitForm7801}
                          className="w-full bg-gradient-to-l from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="w-5 h-5 ml-2" />
                          הגש את הטופס 7801
                        </Button>
                      </motion.div>
                    ) : completionPercentage === 100 && !ocrComplete ? (
                      <motion.div
                        key="analysis-button"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="mt-6 p-5 bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                          </div>
                          <h4 className="font-bold text-purple-900 text-lg">
                            כל המסמכים הועלו בהצלחה!
                          </h4>
                        </div>
                        <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                          מערכת ה-AI שלנו תנתח את המסמכים, תבין את חוזק הראיות
                          של התיק ותחשב את אחוזי הנכות הצפויים. זה ייקח כמה
                          שניות.
                        </p>
                        <Button
                          onClick={handleStartAnalysis}
                          disabled={ocrAnalyzing}
                          className="w-full bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                        >
                          {ocrAnalyzing ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full ml-2 animate-spin" />
                              מנתח מסמכים...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 ml-2" />
                              התחל ניתוח AI
                            </>
                          )}
                        </Button>
                      </motion.div>
                    ) : ocrComplete && !hasRejectedDocuments ? (
                      <motion.div
                        key="analysis-complete"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-6 p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg shadow-xl"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-7 h-7 text-white" />
                          </div>
                          <h4 className="font-bold text-2xl">
                            ניתוח התיק הושלם!
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                            <p className="text-sm text-emerald-100 mb-1">
                              חוזק הראיות
                            </p>
                            <p className="text-3xl font-bold">{caseStrength}</p>
                            <p className="text-xs text-emerald-100 mt-1">
                              על בסיס המסמכים שהועלו
                            </p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              תובנות מהניתוח:
                            </p>
                            <ul className="text-sm space-y-2 text-emerald-50">
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-300 mt-1">•</span>
                                <span>אבחנה רפואית ברורה ומתועדת היטב</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-300 mt-1">•</span>
                                <span>
                                  רציפות טיפולית של 8 חודשים מחזקת את התיק
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-300 mt-1">•</span>
                                <span>
                                  תיעוד השפעה תעסוקתית תומך בזכאות לפי סעיף 37
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <Link href="/legal-review">
                          <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-bold text-lg h-12">
                            <CheckCircle2 className="w-5 h-5 ml-2" />
                            התיק מוכן - המשך לסקירת נתונים
                          </Button>
                        </Link>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Card>
              </>
            )}

            {hasMobilityClaim && (
              <Card className="p-6 bg-white shadow-md border-r-4 border-purple-500">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Car className="w-6 h-6 text-purple-600" />
                      מסמכים לתביעת ניידות
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {mobilityUploadedCount} מתוך {mobilityRequiredCount}{" "}
                      מסמכים נדרשים הועלו
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                    הטבה נוספת
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      התקדמות העלאת מסמכים
                    </span>
                    <span className="text-sm font-bold text-purple-600">
                      {mobilityCompletionPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mobilityCompletionPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-l from-purple-600 to-purple-500"
                    />
                  </div>
                </div>

                {/* Documents List */}
                {renderDocumentList(mobilityDocuments as RequiredDocument[])}
              </Card>
            )}

            {hasSpecialServicesClaim && (
              <Card className="p-6 bg-white shadow-md border-r-4 border-cyan-500">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-6 h-6 text-cyan-600" />
                      מסמכים לתביעת שירותים מיוחדים
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {specialServicesUploadedCount} מתוך{" "}
                      {specialServicesRequiredCount} מסמכים נדרשים הועלו
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-cyan-100 text-cyan-700 text-sm font-semibold rounded-full">
                    הטבה נוספת
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      התקדמות העלאת מסמכים
                    </span>
                    <span className="text-sm font-bold text-cyan-600">
                      {specialServicesCompletionPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${specialServicesCompletionPercentage}%`,
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-l from-cyan-600 to-cyan-500"
                    />
                  </div>
                </div>

                {/* Documents List */}
                {renderDocumentList(
                  specialServicesDocuments as RequiredDocument[]
                )}
              </Card>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Lawyer Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold">עורכת הדין AI שלך</h4>
                    <p className="text-sm text-emerald-100">עו"ד שרה לוי</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-50 mb-4 leading-relaxed">
                  יש לך שאלות על המסמכים? אני כאן לעזור 24/7
                </p>
                <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-semibold">
                  פתח שיחה
                </Button>
              </Card>
            </motion.div>

            {/* Case Summary */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 bg-white shadow-md">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  סיכום התיק
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">מספר תיק</span>
                    <span className="text-sm font-bold text-slate-900">
                      {userCase?.id || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">סעיפי זכאות</span>
                    <span className="text-sm font-bold text-slate-900">
                      37, 32
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">תאריך פתיחה</span>
                    <span className="text-sm font-bold text-slate-900">
                      {userCase?.created_at
                        ? new Date(userCase.created_at).toLocaleDateString(
                            "he-IL",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">סטטוס</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                      <Clock className="w-3 h-3" />
                      {userCase?.status
                        ? userCase.status === "pending"
                          ? "בהכנה"
                          : userCase.status === "approved"
                          ? "אושר"
                          : userCase.status === "rejected"
                          ? "דחוי"
                          : userCase.status
                        : "בהכנה"}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Security Badge */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-6 bg-slate-900 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-8 h-8 text-blue-400" />
                  <div>
                    <h4 className="font-bold">מאובטח ומוצפן</h4>
                    <p className="text-sm text-slate-400">256-bit SSL</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  כל המסמכים שלך מאוחסנים בצורה מוצפנת ומוגנת בהתאם לתקנות ההגנה
                  על הפרטיות
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
