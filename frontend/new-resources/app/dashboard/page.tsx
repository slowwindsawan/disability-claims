"use client"

import { motion, AnimatePresence } from "framer-motion"
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
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/language-context"
import ExtensionSyncWidget from "@/components/extension-sync-widget"

const requiredDocuments = [
  {
    id: 1,
    name: "אישור אבחנה רפואית - פיברומיאלגיה",
    reason: "לפי סעיף 37, נדרש אישור רופא על האבחנה המדויקת",
    source: "ניתן לקבל מהרופא המטפל או מרשומות קופת החולים",
    status: "uploaded",
    date: "הועלה ב-12.01.2025",
    required: true,
    category: "general",
  },
  {
    id: 2,
    name: "תיעוד טיפולים רפואיים - 6 חודשים אחרונים",
    reason: "להוכחת רציפות טיפולית ושכיחות התסמינים",
    source: "ניתן להזמין דרך אתר או אפליקציית קופת החולים",
    status: "uploaded",
    date: "הועלה ב-12.01.2025",
    required: true,
    category: "general",
  },
  {
    id: 3,
    name: "אישור מעביד על היעדרויות",
    reason: "מזוהה בשיחה: יש השפעה משמעותית על העבודה",
    source: "יש לפנות למחלקת משאבי אנוש במקום העבודה",
    status: "missing",
    date: null,
    required: true,
    category: "general",
  },
  {
    id: 4,
    name: "ממצאי בדיקות דם ואנטי-גופים",
    reason: "נדרש לאימות האבחנה ושלילת מחלות אחרות",
    source: "ניתן להזמין מהמעבדה שבה בוצעה הבדיקה או דרך קופת החולים",
    status: "missing",
    date: null,
    required: true,
    category: "general",
  },
  {
    id: 5,
    name: "חוות דעת ראומטולוג",
    reason: "מומלץ - יחזק את התיק בצורה משמעותית",
    source: "יש לקבוע תור לרופא ראומטולוג דרך קופת החולים",
    status: "missing",
    date: null,
    required: false,
    category: "general",
  },
]

const mobilityDocuments = [
  {
    id: 101,
    name: "אישור רופא על מגבלת ניידות",
    reason: "נדרש להוכחת הצורך בתמיכה בניידות",
    source: "ניתן לקבל מהרופא המטפל או מומחה אורתופד",
    status: "missing",
    date: null,
    required: true,
    category: "mobility",
  },
  {
    id: 102,
    name: "תיעוד תדירות טיפולים חוץ-ביתיים",
    reason: "להוכחת הצורך בהסעות תכופות למרפאות",
    source: "ניתן להזמין סיכום ביקורים מקופת החולים",
    status: "missing",
    date: null,
    required: true,
    category: "mobility",
  },
  {
    id: 103,
    name: "צילום רנטגן / CT למפרקים",
    reason: "מומלץ - מחזק את ההוכחה למגבלה פיזית",
    source: "ניתן להזמין מהמכון הרנטגן או דרך קופת החולים",
    status: "missing",
    date: null,
    required: false,
    category: "mobility",
  },
]

const specialServicesDocuments = [
  {
    id: 201,
    name: "תיאור מפורט של השירות הנדרש",
    reason: "נדרש להבנת הצורך בשירות מיוחד (ניקיון, סיעוד וכו')",
    source: "ניתן להכין במסמך Word או PDF פשוט",
    status: "missing",
    date: null,
    required: true,
    category: "special-services",
  },
  {
    id: 202,
    name: "הצעת מחיר מספק שירות",
    reason: "להוכחת העלות החודשית של השירות",
    source: "יש לבקש הצעת מחיר מחברות ניקיון/סיעוד",
    status: "missing",
    date: null,
    required: true,
    category: "special-services",
  },
  {
    id: 203,
    name: "חוות דעת עובד סוציאלי",
    reason: "מומלץ - מחזק את התביעה לשירותים מיוחדים",
    source: "ניתן לפנות לעובד סוציאלי בקופת החולים או במחלקת הרווחה",
    status: "missing",
    date: null,
    required: false,
    category: "special-services",
  },
]

export default function DashboardPage() {
  const { language } = useLanguage()
  const isRTL = language === "he"

  const [uploadingDoc, setUploadingDoc] = useState<number | null>(null)
  const [ocrAnalyzing, setOcrAnalyzing] = useState(false)
  const [ocrComplete, setOcrComplete] = useState(false)
  const [disabilityPercentage, setDisabilityPercentage] = useState(45)
  const [caseStrength, setCaseStrength] = useState("חזק")

  const [paymentDetailsCompleted, setPaymentDetailsCompleted] = useState(false)
  // In a real app, this would come from user session/database

  // In a real app, this would come from user session/database based on claim maximization modal selections
  const [hasMobilityClaim, setHasMobilityClaim] = useState(false)
  const [hasSpecialServicesClaim, setHasSpecialServicesClaim] = useState(false)

  const [hasRejectedDocuments, setHasRejectedDocuments] = useState(false) // In real app, from database
  const rejectedDocumentId = 1 // ID card rejected

  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [hasCompletedPayment, setHasCompletedPayment] = useState(true) // Check if user completed payment/checkout

  // Case status and analysis data
  const [caseStatus, setCaseStatus] = useState<string>("")
  const [finalDocumentAnalysis, setFinalDocumentAnalysis] = useState<any>(null)

  useEffect(() => {
    // Check if extension is installed
    const checkExtension = () => {
      // In real app, check window.zerotouchExtension or similar
      setExtensionInstalled(false)
    }
    checkExtension()

    if (hasCompletedPayment && !extensionInstalled && !localStorage.getItem("extensionModalDismissed")) {
      setShowExtensionModal(true)
    }
  }, [hasCompletedPayment, extensionInstalled])

  useEffect(() => {
    // Fetch case status and final_document_analysis
    const fetchCaseStatus = async () => {
      try {
        const casesResponse = await fetch(`/api/user/cases`)
        if (!casesResponse.ok) return
        
        const casesData = await casesResponse.json()
        const cases = casesData?.cases || []
        
        if (cases.length > 0) {
          const caseData = cases[0]
          setCaseStatus(caseData.status || "")
          setFinalDocumentAnalysis(caseData.final_document_analysis || null)
        }
      } catch (error) {
        console.error("Failed to fetch case status:", error)
      }
    }
    
    fetchCaseStatus()
  }, [])

  const handleDismissExtensionModal = () => {
    setShowExtensionModal(false)
    localStorage.setItem("extensionModalDismissed", "true")
  }

  const handleInstallExtension = () => {
    window.open("https://chrome.google.com/webstore", "_blank")
    setShowExtensionModal(false)
    localStorage.setItem("extensionModalDismissed", "true")
  }

  const handleSubmitForm7801 = () => {
    if (!finalDocumentAnalysis) return
    
    // Store the analysis data in session storage for prefilling
    sessionStorage.setItem("form7801_prefill_data", JSON.stringify(finalDocumentAnalysis))
    
    // Navigate to legal-review page
    window.location.href = "/legal-review"
  }

  const handleStartAnalysis = async () => {
    console.log("🔵 Dashboard: Start Analysis button clicked")
    setOcrAnalyzing(true)
    try {
      // Get the user's current case
      const casesResponse = await fetch(`/api/user/cases`)
      if (!casesResponse.ok) {
        throw new Error("Failed to fetch cases")
      }
      
      const casesData = await casesResponse.json()
      const cases = casesData?.cases || []
      
      if (cases.length === 0) {
        throw new Error("No case found for user")
      }
      
      const caseId = cases[0].id
      console.log("📋 Case ID:", caseId)
      
      console.log("📤 Sending case to backend for agent analysis...")
      
      const response = await fetch("/api/analyze-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId: caseId,
        }),
      })

      console.log("📨 Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API Error:", errorText)
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || "Failed to analyze documents")
        } catch {
          throw new Error("Failed to analyze documents")
        }
      }

      const result = await response.json()
      console.log("✅ Analysis completed:", result)
      
      setOcrComplete(true)
    } catch (error) {
      console.error("❌ Error in analysis:", error)
      alert(`אירעה שגיאה בעת ניתוח המסמכים: ${error instanceof Error ? error.message : String(error)}`)
      setOcrAnalyzing(false)
    } finally {
      setOcrAnalyzing(false)
    }
  }

  const uploadedCount = requiredDocuments.filter((doc) => doc.status === "uploaded").length
  const requiredCount = requiredDocuments.filter((doc) => doc.required).length
  const completionPercentage = Math.round((uploadedCount / requiredCount) * 100)

  const mobilityUploadedCount = mobilityDocuments.filter((doc) => doc.status === "uploaded").length
  const mobilityRequiredCount = mobilityDocuments.filter((doc) => doc.required).length
  const mobilityCompletionPercentage =
    mobilityRequiredCount > 0 ? Math.round((mobilityUploadedCount / mobilityRequiredCount) * 100) : 0

  const specialServicesUploadedCount = specialServicesDocuments.filter((doc) => doc.status === "uploaded").length
  const specialServicesRequiredCount = specialServicesDocuments.filter((doc) => doc.required).length
  const specialServicesCompletionPercentage =
    specialServicesRequiredCount > 0
      ? Math.round((specialServicesUploadedCount / specialServicesRequiredCount) * 100)
      : 0

  const renderDocumentList = (documents: typeof requiredDocuments) => (
    <div className="space-y-4">
      {documents.map((doc, index) => {
        const isRejected = hasRejectedDocuments && doc.id === rejectedDocumentId

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
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 leading-tight mb-1">{doc.name}</h4>
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
                  </div>
                </div>

                {isRejected && (
                  <div className="bg-red-100 border-r-4 border-red-600 rounded p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900 mb-1">הערת מנהל התיק:</p>
                        <p className="text-sm text-red-800 leading-relaxed">
                          הצילום מטושטש, לא ניתן לקרוא את מספר הזהות. אנא העלה תמונה ברורה יותר של תעודת הזהות.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border-r-2 border-blue-500 rounded p-3 mb-3">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <span className="font-semibold text-blue-600">למה זה נדרש:</span> {doc.reason}
                  </p>
                </div>

                <div className="bg-amber-50 border-r-2 border-amber-400 rounded p-3 mb-3 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 leading-relaxed">
                    <span className="font-semibold">איפה להשיג:</span> {doc.source}
                  </p>
                </div>

                {isRejected ? (
                  <Button
                    onClick={() => setUploadingDoc(doc.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    העלה שוב
                  </Button>
                ) : doc.status === "uploaded" ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-700 font-medium">{doc.date}</p>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      <FileText className="w-4 h-4 ml-1" />
                      צפייה
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setUploadingDoc(doc.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    העלה מסמך
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">ZeroTouch Claims</h1>
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
              <Button variant="ghost" className="relative">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <Button variant="ghost" className="flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                <span className="text-slate-700">יוחאי כהן</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

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

        {!paymentDetailsCompleted && (
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
                  <h3 className="text-lg font-bold text-slate-900 mb-1">פעולה נדרשת: השלמת פרטים אישיים</h3>
                  <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                    כדי להמשיך בתהליך, נדרשים ממך פרטי בנק, קופת חולים וכתובת. פרטים אלו חיוניים למילוי טופס 7801 של
                    ביטוח לאומי.
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

        {hasRejectedDocuments && (
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
                  <h3 className="text-2xl font-bold mb-2">עצור! הטיפול בתיק נעצר</h3>
                  <p className="text-lg text-red-50 leading-relaxed">
                    יש לתקן מסמכים מסויימים כדי שנוכל להמשיך בטיפול בתיק שלך. אנא בדוק את הרשימה למטה והעלה מחדש את
                    המסמכים המסומנים.
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
                {isRTL ? "התקן את הסוכן האישי שלך" : "Install Your Personal Agent"}
              </h2>

              <div className="space-y-4 mb-8">
                {[
                  {
                    key: "auto_sync",
                    icon: CheckCircle2,
                    label: isRTL ? "הגשת מסמכים אוטומטית" : "Auto-submit documents",
                  },
                  {
                    key: "track_payments",
                    icon: CheckCircle2,
                    label: isRTL ? "מעקב אחר סטטוס התיק" : "Track case status",
                  },
                  { key: "no_faxes", icon: CheckCircle2, label: isRTL ? "ללא פקסים או נסיעות" : "No faxes or visits" },
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit.key}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="flex items-center gap-3 bg-green-50 p-4 rounded-xl border border-green-200"
                  >
                    <benefit.icon className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <span className="text-lg font-medium text-slate-800">{benefit.label}</span>
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
                  <Download className={isRTL ? "w-5 h-5 mr-2" : "w-5 h-5 ml-2"} />
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
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">שלום, יוחאי</h2>
          <p className="text-lg text-slate-600">על בסיס שיחת ההיכרות והשאלון, זיהינו את המסמכים הדרושים לתיק שלך</p>
        </motion.div>

        {/* AI Insight Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 bg-gradient-to-l from-blue-600 to-blue-700 text-white mb-8 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-blue-200" />
                  <span className="text-sm font-semibold">תובנות מהשיחה עם עו"ד AI</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">זיהינו את המקרה שלך: פיברומיאלגיה + מגבלות תעסוקתיות</h3>
                <p className="text-blue-100 leading-relaxed mb-4">
                  על בסיס השיחה שלנו, הבנו שהמצב הרפואי שלך מגביל את עבודתך ומשפיע על חיי היומיום. זיהינו זכאות לפי{" "}
                  <span className="font-bold">סעיף 37</span> ו-<span className="font-bold">סעיף 32</span> לביטוח לאומי.
                </p>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-blue-200 mb-1">פיצוי משוער</p>
                    <p className="text-2xl font-bold">₪42,500</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200 mb-1">השלמת מסמכים</p>
                    <p className="text-lg font-semibold">{completionPercentage}%</p>
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

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">התקדמות העלאת מסמכים</span>
                  <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
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

              <AnimatePresence mode="wait">
                {caseStatus === "Submission Pending" && finalDocumentAnalysis ? (
                  // Show submission button instead of analysis button
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
                      <h4 className="font-bold text-green-900 text-lg">הניתוח הושלם בהצלחה!</h4>
                    </div>
                    <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                      מערכת ה-AI ניתחה את המסמכים והכינה טופס 7801 מוגדר מראש. לחץ להמשך לעמוד הביקורת המשפטית להגשת הטופס.
                    </p>
                    <Button
                      onClick={handleSubmitForm7801}
                      className="w-full bg-gradient-to-l from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                    >
                      <CheckCircle2 className="w-5 h-5 ml-2" />
                      הגש את הטופס 7801
                    </Button>
                  </motion.div>
                ) : completionPercentage === 100 && !ocrComplete && (
                  // Show analysis button if completion is 100% and analysis not done
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
                      <h4 className="font-bold text-purple-900 text-lg">כל המסמכים הועלו בהצלחה!</h4>
                    </div>
                    <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                      מערכת ה-AI שלנו תנתח את המסמכים, תבין את חוזק הראיות של התיק ותחשב את אחוזי הנכות הצפויים. זה ייקח
                      כמה שניות.
                    </p>
                    <Button
                      onClick={handleStartAnalysis}
                      disabled={ocrAnalyzing}
                      className="w-full bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                    >
                      {ocrAnalyzing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full ml-2"
                          />
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
                )}

                {ocrComplete && !hasRejectedDocuments && (
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
                    <h4 className="font-bold text-2xl">ניתוח התיק הושלם!</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                      <p className="text-sm text-emerald-100 mb-1">חוזק הראיות</p>
                      <p className="text-3xl font-bold">{caseStrength}</p>
                      <p className="text-xs text-emerald-100 mt-1">על בסיס המסמכים שהועלו</p>
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
                          <span>רציפות טיפולית של 8 חודשים מחזקת את התיק</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-300 mt-1">•</span>
                          <span>תיעוד השפעה תעסוקתית תומך בזכאות לפי סעיף 37</span>
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
                )}
              </AnimatePresence>
            </Card>

            {hasMobilityClaim && (
              <Card className="p-6 bg-white shadow-md border-r-4 border-purple-500">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Car className="w-6 h-6 text-purple-600" />
                      מסמכים לתביעת ניידות
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {mobilityUploadedCount} מתוך {mobilityRequiredCount} מסמכים נדרשים הועלו
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                    הטבה נוספת
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">התקדמות העלאת מסמכים</span>
                    <span className="text-sm font-bold text-purple-600">{mobilityCompletionPercentage}%</span>
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
                {renderDocumentList(mobilityDocuments)}
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
                      {specialServicesUploadedCount} מתוך {specialServicesRequiredCount} מסמכים נדרשים הועלו
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-cyan-100 text-cyan-700 text-sm font-semibold rounded-full">
                    הטבה נוספת
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">התקדמות העלאת מסמכים</span>
                    <span className="text-sm font-bold text-cyan-600">{specialServicesCompletionPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${specialServicesCompletionPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-l from-cyan-600 to-cyan-500"
                    />
                  </div>
                </div>

                {/* Documents List */}
                {renderDocumentList(specialServicesDocuments)}
              </Card>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Lawyer Card */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
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
                <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-semibold">פתח שיחה</Button>
              </Card>
            </motion.div>

            {/* Case Summary */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <Card className="p-6 bg-white shadow-md">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  סיכום התיק
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">מספר תיק</span>
                    <span className="text-sm font-bold text-slate-900">#ZTC-2024-7891</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">סעיפי זכאות</span>
                    <span className="text-sm font-bold text-slate-900">37, 32</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">תאריך פתיחה</span>
                    <span className="text-sm font-bold text-slate-900">12.01.2025</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">סטטוס</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                      <Clock className="w-3 h-3" />
                      בהכנה
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Security Badge */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
              <Card className="p-6 bg-slate-900 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-8 h-8 text-blue-400" />
                  <div>
                    <h4 className="font-bold">מאובטח ומוצפן</h4>
                    <p className="text-sm text-slate-400">256-bit SSL</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  כל המסמכים שלך מאוחסנים בצורה מוצפנת ומוגנת בהתאם לתקנות ההגנה על הפרטיות
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
