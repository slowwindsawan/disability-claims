"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import { BACKEND_BASE_URL } from '@/variables'
import {
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Search,
  Filter,
  Eye,
  Edit,
  MessageCircle,
  Phone,
  CheckCircle2,
  XCircle,
  Upload,
  Send,
  X,
  BarChart3,
  Menu,
  Home,
  Settings,
  LogOut,
  Activity,
  Zap,
  FileText,
  Plus,
  ShieldCheck,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Download,
  Trash2,
  ChevronDown,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useAdminCases } from "@/hooks/useAdminCases"

type ClientStatus = string  // Allow any status value from database

interface Client {
  id: string
  case_id: string
  name: string
  phone: string
  status: ClientStatus
  lastActive: string
  aiScore: number
  potentialFee: number
  daysStuck: number
  documents: { id?: string; name: string; reason?: string; source?: string; required?: boolean; status?: string; uploaded: boolean; requestedAt?: string; file_url?: string; document_id?: string }[]
  timeline: { date: string; event: string; status: string }[]
  form7801?: Form7801Data
  hasMobility?: boolean // Added property for mobility product
  hasSpecialServices?: boolean // Added property for special services product
  products?: string[] // All products from call_summary
  eligibilityData?: {
    eligibility_score?: number
    eligibility_status?: string
    strengths?: string[]
    weaknesses?: string[]
    required_next_steps?: string[]
    document_analysis?: any
  }
}

interface Form7801Data {
  personalInfo: {
    fullName: string
    idNumber: string
    address: string
    phone: string
    email: string
    birthDate: string
    maritalStatus: string
  }
  employmentHistory: {
    employer: string
    from: string
    to: string
    salary: string
  }[]
  disabilityInfo: {
    conditions: string[]
    onsetDate: string
    specialists: string
    hospitalizations: string
  }
  bankDetails: {
    bankName: string
    branch: string
    accountNumber: string
  }
}

interface WorkInjuryLead {
  id: string
  name: string
  phone: string
  calculatedValue: number
  status: "pending_transfer" | "transferred_to_partner" | "rejected_by_partner"
  partnerName?: string
  lastActive: string
  submittedDate: string
  injuryDate: string
  conflictChecked: boolean // New field for conflict check status
  employerName: string // New field for defendant/employer
  insurerName: string // New field for insurer
  injuryType: string // New field for type of injury
  liabilityKeywords?: string[] // New field for negligence detection
  userQuote?: string // New field for key user statement
}

// Live data will be used for active claims via the `useAdminCases` hook.

const mockWorkInjuryLeads: WorkInjuryLead[] = []

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const router = useRouter()
  const { language } = useLanguage()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "stuck" | "ready">("all")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showDocumentRequest, setShowDocumentRequest] = useState(false)
  const [newDocumentName, setNewDocumentName] = useState("")
  const [newDocumentWhere, setNewDocumentWhere] = useState("")
  const [newDocumentReason, setNewDocumentReason] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [businessLine, setBusinessLine] = useState<"active_claims" | "partner_leads">("active_claims")
  const [conflictCheckStatus, setConflictCheckStatus] = useState<Record<string, boolean>>({})
  const [showEditDocuments, setShowEditDocuments] = useState(false)
  const [editingDocuments, setEditingDocuments] = useState<any[]>([])
  const [workDisabilityCases, setWorkDisabilityCases] = useState<any[]>([])
  const [loadingWorkDisability, setLoadingWorkDisability] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<any>(null)
  const [expandedDocuments, setExpandedDocuments] = useState<Record<string, boolean>>({})
  const [documentSummaries, setDocumentSummaries] = useState<Record<string, any>>({})
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({})

  // Use live cases from backend (replaces mockClients)
  const { cases: adminCases, loading: casesLoading, error: casesError, total: casesTotal, refetch: refetchCases } = useAdminCases();

  const mapStatus = (s?: string): ClientStatus => {
    // Use the actual status from the database, return as-is
    return s || ""
  }

  const computeDaysStuck = (createdAt?: string) => {
    if (!createdAt) return 0
    const created = new Date(createdAt)
    const diff = Date.now() - created.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const mapCaseToClient = (c: any): Client => {
    // Parse call_summary if it's a string
    let callSummary = c.call_summary
    if (typeof callSummary === 'string') {
      try {
        callSummary = JSON.parse(callSummary)
      } catch {
        callSummary = {}
      }
    }
    
    const products: string[] = callSummary?.products || []
    
    // Get documents from call_summary.documents_requested_list (from AI analysis)
    const documentsRequestedList = callSummary?.documents_requested_list || []
    const documents = documentsRequestedList.map((d: any) => ({
      id: d.id,
      name: d.name,
      reason: d.reason,
      source: d.source,
      required: d.required,
      status: d.status,
      uploaded: d.status === 'received' || d.uploaded,
      requestedAt: d.requested_at,
      file_url: d.file_url,
      document_id: d.document_id
    }))

    // Parse eligibility data if available
    let eligibilityData: any = {}
    if (c.eligibility_raw) {
      try {
        eligibilityData = typeof c.eligibility_raw === 'string' 
          ? JSON.parse(c.eligibility_raw) 
          : c.eligibility_raw
      } catch {
        eligibilityData = {}
      }
    }

    // Build timeline with status progression
    const timeline = [
      {
        date: c.created_at ? new Date(c.created_at).toLocaleDateString('he-IL') : "לא ידוע",
        event: "שאלון ראשוני הושלם",
        status: "completed"
      }
    ]

    // Add eligibility assessment if available
    if (eligibilityData.eligibility_score !== undefined) {
      timeline.push({
        date: c.created_at ? new Date(c.created_at).toLocaleDateString('he-IL') : "לא ידוע",
        event: `הערכת זכאות: ציון ${eligibilityData.eligibility_score} - ${eligibilityData.eligibility_status || "בעיבוד"}`,
        status: eligibilityData.eligibility_status === "approved" ? "completed" : eligibilityData.eligibility_status === "needs_review" ? "pending" : "pending"
      })
    }

    // Add documents uploaded status
    const uploadedDocsCount = documents.filter(d => d.uploaded).length
    const totalDocsRequested = documents.length
    if (totalDocsRequested > 0) {
      timeline.push({
        date: new Date().toLocaleDateString('he-IL'),
        event: `מסמכים שהועלו: ${uploadedDocsCount} מתוך ${totalDocsRequested}`,
        status: uploadedDocsCount === totalDocsRequested ? "completed" : uploadedDocsCount > 0 ? "pending" : "pending"
      })
    }

    // Add current case status
    timeline.push({
      date: c.updated_at ? new Date(c.updated_at).toLocaleDateString('he-IL') : new Date().toLocaleDateString('he-IL'),
      event: `סטטוס התיק: ${c.status || "פעיל"}`,
      status: c.status === "submitted" || c.status === "completed" ? "completed" : "pending"
    })

    return {
      id: c.id,
      case_id: c.id, // Add case_id field
      name: c.user_name || c.user_email || "לא ידוע",
      phone: c.user_phone || "",
      status: mapStatus(c.status),
      lastActive: c.recent_activity || (c.updated_at ? new Date(c.updated_at).toLocaleString() : "not available"),
      aiScore: c.ai_score || 0,
      potentialFee: c.estimated_claim_amount || 0,
      daysStuck: computeDaysStuck(c.created_at),
      documents,
      timeline,
      form7801: undefined,
      products: products,
      hasMobility: products.some((p: string) => 
        p.toLowerCase().includes("mobility") || 
        p.toLowerCase().includes("ניידות")
      ),
      hasSpecialServices: products.some((p: string) => 
        p.toLowerCase().includes("special services") || 
        p.toLowerCase().includes("שר״מ") ||
        p.toLowerCase().includes("שרמ")
      ),
      eligibilityData
    }
  }

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/')
          return
        }

        const res: any = await legacyApi.apiMe()
        console.log('Admin auth response:', res)
        
        // Check role from multiple possible paths
        const role = res?.user?.role || res?.profile?.role || res?.role
        console.log('Extracted role:', role)

        // Store user data for display
        setLoggedInUser(res?.user || res?.profile || res)

        // Check if user has admin or subadmin role
        if (role === 'admin' || role === 'subadmin') {
          setIsAuthorized(true)
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Authorization check failed:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [router])

  // Fetch requested documents when a case is selected
  useEffect(() => {
    const caseId = selectedClient?.case_id
    if (!caseId) {
      return
    }

    const fetchRequestedDocuments = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(
          `${BACKEND_BASE_URL}/admin/cases/${caseId}/documents/requested`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          console.warn(data)
          // Map the requested documents to the Client format
          const documents = (data.documents || []).map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            reason: doc.reason,
            source: doc.source,
            required: doc.required,
            status: doc.status,
            uploaded: doc.status === 'received' || doc.uploaded,
            requestedAt: doc.requested_at,
            file_url: doc?.file_url,
            document_id: doc?.document_id
          }))

          // Update selectedClient with new documents
          setSelectedClient(prev => prev ? {
            ...prev,
            documents
          } : null)
        }
      } catch (error) {
        console.error("Error fetching requested documents:", error)
      }
    }

    fetchRequestedDocuments()
  }, [selectedClient?.case_id])

  // Fetch uploaded documents when a case is selected
  useEffect(() => {
    if (selectedClient?.case_id) {
      fetchUploadedDocuments(selectedClient.case_id)
    } else {
      setUploadedDocuments([])
    }
  }, [selectedClient?.case_id])

  // Fetch work disability cases
  useEffect(() => {
    const fetchWorkDisabilityCases = async () => {
      setLoadingWorkDisability(true)
      try {
        console.log('Fetching work disability cases...')
        const response = await fetch('/api/admin/cases/work-disability', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        console.log('Work disability response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('Work disability data:', data)
          const cases = data.cases || []
          setWorkDisabilityCases(cases)
        } else {
          const errorData = await response.json()
          console.error('Work disability fetch error:', errorData)
        }
      } catch (err) {
        console.error('Error fetching work disability cases:', err)
      } finally {
        setLoadingWorkDisability(false)
      }
    }

    if (businessLine === "partner_leads") {
      fetchWorkDisabilityCases()
    }
  }, [businessLine])

  // Handle logout
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        await legacyApi.apiLogout(token)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('access_token')
      router.push('/')
    }
  }

  // Show loading while checking authorization
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authorized
  if (!isAuthorized) {
    return null
  }

  const liveClients: Client[] = (adminCases || []).map(mapCaseToClient)
  const totalClients = liveClients.length
  const totalRevenue = liveClients.reduce((sum, c) => sum + (c.potentialFee || 0), 0)
  const stuckClients = liveClients.filter((c) => c.daysStuck > 3).length
  const conversionRate = 68

  const handleAcceptLead = (leadId: string) => {
    setConflictCheckStatus((prev) => ({ ...prev, [leadId]: true }))
    // In real app, this would update the backend
  }

  const handleRejectLead = (leadId: string) => {
    // In real app, this would update the lead status to rejected
    console.log("[v0] Lead rejected due to conflict of interest:", leadId)
  }

  const handleExportCasePackage = (lead: WorkInjuryLead) => {
    // Simulate ZIP file generation
    console.log("[v0] Generating case package for lead:", lead.id)

    // In a real implementation, this would:
    // 1. Generate PDF from chat transcript
    // 2. Collect all medical documents
    // 3. Generate signed consent form PDF
    // 4. Create metadata JSON/XML
    // 5. ZIP everything together
    // 6. Download to user's machine

    // For now, just show a success message
    alert(
      `הורדת תיק מלא עבור ${lead.name}\n\nהתיק כולל:\n- סיכום שיחת Intake (PDF)\n- מסמכים רפואיים\n- טופס הסכמה חתום\n- מטא-דאטה (JSON)`,
    )
  }

  const filteredClients = liveClients.filter((client) => {
    const q = searchQuery || ""
    const matchesSearch =
      client.name.includes(q) || client.id.toLowerCase().includes(q.toLowerCase()) || client.phone.includes(q)
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "stuck" && client.daysStuck > 2) ||
      (filterStatus === "ready" && client.status === "document_collection")
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: ClientStatus) => {
    const statusConfig = {
      new: { label: "חדש", className: "bg-blue-100 text-blue-700" },
      document_collection: { label: "איסוף מסמכים", className: "bg-amber-100 text-amber-700" },
      ready_for_submission: { label: "מוכן להגשה", className: "bg-green-100 text-green-700" },
      submitted: { label: "הוגש", className: "bg-indigo-100 text-indigo-700" },
      approved: { label: "אושר", className: "bg-emerald-100 text-emerald-700" },
      rejected: { label: "נדחה", className: "bg-red-100 text-red-700" },
      appeal_pending: { label: "ערעור בתהליך", className: "bg-orange-100 text-orange-700" }, // Added appeal status badge
    }
    return statusConfig[status] || statusConfig.new
  }

  const getLeadStatusBadge = (status: WorkInjuryLead["status"]) => {
    const statusConfig = {
      pending_transfer: { label: "ממתין להעברה", className: "bg-amber-100 text-amber-700" },
      transferred_to_partner: { label: "הועבר לעו״ד", className: "bg-blue-100 text-blue-700" },
      rejected_by_partner: { label: "נדחה ע״י שותף", className: "bg-red-100 text-red-700" },
    }
    return statusConfig[status]
  }

  const getTimeSensitivity = (injuryDate: string) => {
    const injury = new Date(injuryDate.split(".").reverse().join("-"))
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - injury.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    let urgencyLevel: "critical" | "warning" | "normal" = "normal"
    let message = ""
    let badgeColor = ""

    if (diffDays <= 2) {
      urgencyLevel = "critical"
      message = "דיווח מיידי נדרש!"
      badgeColor = "bg-emerald-100 text-emerald-700 border border-emerald-300 animate-pulse"
    } else if (diffYears >= 6) {
      urgencyLevel = "critical"
      message = "סכנת התיישנות"
      badgeColor = "bg-red-100 text-red-700 border border-red-300"
    }

    let timeElapsed = ""
    if (diffYears > 0) {
      timeElapsed = `עברו ${diffYears} ${diffYears === 1 ? "שנה" : "שנים"} מהאירוע`
    } else if (diffMonths > 0) {
      timeElapsed = `עברו ${diffMonths} ${diffMonths === 1 ? "חודש" : "חודשים"} מהאירוע`
    } else {
      timeElapsed = `עברו ${diffDays} ${diffDays === 1 ? "יום" : "ימים"} מהאירוע`
    }

    return { urgencyLevel, message, badgeColor, timeElapsed, diffDays }
  }

  const handleRequestDocument = async () => {
    if (!selectedClient?.case_id) {
      alert("אנא בחר תיק תיקייה תחילה")
      return
    }

    if (!newDocumentName.trim()) {
      alert("אנא הכנס את שם המסמך")
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert("Session expired. Please login again.")
        return
      }

      const response = await fetch(
        `${BACKEND_BASE_URL}/admin/cases/${selectedClient.case_id}/documents/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newDocumentName,
            reason: newDocumentReason,
            source: newDocumentWhere,
            required: true
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to request document')
      }

      const data = await response.json()
      
      // Update the documents list in the case
      setSelectedClient({
        ...selectedClient,
        documents: data.documents || []
      })

      alert(`בקשת מסמך נשלחה ל-${selectedClient?.name}`)
      setShowDocumentRequest(false)
      setNewDocumentName("")
      setNewDocumentWhere("")
      setNewDocumentReason("")
    } catch (error) {
      console.error("Error requesting document:", error)
      alert(`שגיאה: ${error instanceof Error ? error.message : 'Failed to request document'}`)
    }
  }

  const handleEditDocuments = () => {
    if (!selectedClient?.documents) return
    setEditingDocuments(JSON.parse(JSON.stringify(selectedClient.documents)))
    setShowEditDocuments(true)
  }

  const handleSaveDocumentEdits = async () => {
    if (!selectedClient?.case_id) {
      alert("אנא בחר תיקייה תחילה")
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert("Session expired. Please login again.")
        return
      }

      const response = await fetch(
        `${BACKEND_BASE_URL}/admin/cases/${selectedClient.case_id}/documents/update-all`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            documents: editingDocuments
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update documents')
      }

      const data = await response.json()
      
      setSelectedClient({
        ...selectedClient,
        documents: data.documents || []
      })

      alert("המסמכים עודכנו בהצלחה")
      setShowEditDocuments(false)
    } catch (error) {
      console.error("Error updating documents:", error)
      alert(`שגיאה: ${error instanceof Error ? error.message : 'Failed to update documents'}`)
    }
  }

  const handleDeleteDocumentFromList = (index: number) => {
    setEditingDocuments(editingDocuments.filter((_, i) => i !== index))
  }

  const handleUpdateDocumentField = (index: number, field: string, value: string) => {
    const updated = [...editingDocuments]
    updated[index] = { ...updated[index], [field]: value }
    setEditingDocuments(updated)
  }

  // Fetch uploaded documents for a case
  const fetchUploadedDocuments = async (caseId: string) => {
    if (!caseId) return

    try {
      setLoadingDocuments(true)
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `${BACKEND_BASE_URL}/admin/cases/${caseId}/uploaded-documents`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setUploadedDocuments(data.documents || [])
      }
    } catch (error) {
      console.error("Error fetching uploaded documents:", error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  // Fetch document summary details
  const fetchDocumentSummary = async (caseId: string, documentId: string) => {
    if (!caseId || !documentId) return

    try {
      setLoadingSummary(prev => ({ ...prev, [documentId]: true }))
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `${BACKEND_BASE_URL}/cases/${caseId}/documents/${documentId}/summary`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setDocumentSummaries(prev => ({ ...prev, [documentId]: data.document }))
      }
    } catch (error) {
      console.error("Error fetching document summary:", error)
    } finally {
      setLoadingSummary(prev => ({ ...prev, [documentId]: false }))
    }
  }

  // Toggle document summary dropdown
  const toggleDocumentSummary = (caseId: string, documentId: string) => {
    setExpandedDocuments(prev => {
      const newState = { ...prev, [documentId]: !prev[documentId] }
      
      // If opening and we don't have summary yet, fetch it
      if (newState[documentId] && !documentSummaries[documentId]) {
        fetchDocumentSummary(caseId, documentId)
      }
      
      return newState
    })
  }

  // Delete an uploaded document
  const handleDeleteUploadedDocument = async (documentId: string) => {
    if (!selectedClient?.case_id) return

    if (!confirm('אתה בטוח שאתה רוצה למחוק מסמך זה?')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert("Session expired. Please login again.")
        return
      }

      const response = await fetch(
        `${BACKEND_BASE_URL}/admin/cases/${selectedClient.case_id}/uploaded-documents/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to delete document')
      }

      // Refresh the list
      fetchUploadedDocuments(selectedClient.case_id)
      alert('המסמך נמחק בהצלחה')
    } catch (error) {
      console.error("Error deleting document:", error)
      alert(`שגיאה: ${error instanceof Error ? error.message : 'Failed to delete document'}`)
    }
  }

  const handleSendMessage = () => {
    console.log("Message sent:", customMessage)
    alert(`הודעה נשלחה ל-${selectedClient?.name}`)
    setCustomMessage("")
  }

  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-slate-700">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-400" />
                <span>ZeroTouch Admin</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">מרכז בקרה</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800 bg-slate-800">
                <Home className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                לוח בקרה
              </Button>
              <Link href="/admin/team">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Users className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  ניהול צוות
                </Button>
              </Link>
              <Link href="/admin/qa-submission">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <ShieldCheck className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  קונסולת QA
                </Button>
              </Link>
              <Link href="/admin/advanced-filters">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Filter className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  סינון מתקדם
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <BarChart3 className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  אנליטיקס
                </Button>
              </Link>
              <Link href="/admin/prompts">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Zap className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  AI Prompts
                </Button>
              </Link>
              {/* Settings hidden for now */}
              {/* <Link href="/admin/settings">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Settings className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  הגדרות
                </Button>
              </Link> */}
            </nav>

            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">מנ</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">מנהל מערכת</p>
                  <p className="text-xs text-slate-400">{loggedInUser?.email || 'admin@system.co.il'}</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-red-400 hover:bg-slate-800" onClick={handleLogout}>
                <LogOut className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                יציאה
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">ניהול תיקים</h2>
              <p className="text-sm text-slate-600">מעקב אחר כל הלקוחות והתיקים במערכת</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 ml-2" />
              סינון מתקדם
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* God View - Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-8 h-8 text-blue-200" />
                  <span className="text-3xl font-bold">{totalClients}</span>
                </div>
                <p className="text-sm text-blue-100">תיקים פעילים</p>
              </Card>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-8 h-8 text-emerald-200" />
                  <span className="text-3xl font-bold">₪{(totalRevenue / 1000).toFixed(0)}k</span>
                </div>
                <p className="text-sm text-emerald-100">פוטנציאל הכנסות</p>
              </Card>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <AlertTriangle className="w-8 h-8 text-red-200" />
                  <span className="text-3xl font-bold">{stuckClients}</span>
                </div>
                <p className="text-sm text-red-100">תיקים תקועים</p>
                <Badge className="mt-2 bg-red-700 text-white text-xs">קריטי</Badge>
              </Card>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-indigo-200" />
                  <span className="text-3xl font-bold">{conversionRate}%</span>
                </div>
                <p className="text-sm text-indigo-100">שיעור המרה</p>
              </Card>
            </motion.div>
          </div>

          <Card className="mb-6 bg-white shadow-md">
            <div className="border-b border-slate-200">
              <div className="flex gap-1 p-2">
                <Button
                  variant={businessLine === "active_claims" ? "default" : "ghost"}
                  onClick={() => setBusinessLine("active_claims")}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 ml-2" />
                  תיקים פעילים
                </Button>
                <Button
                  variant={businessLine === "partner_leads" ? "default" : "ghost"}
                  onClick={() => setBusinessLine("partner_leads")}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 ml-2" />
                  לידים להעברה
                </Button>
              </div>
            </div>
          </Card>

          {businessLine === "active_claims" ? (
            <>
              {/* Search and Filters */}
              <Card className="p-4 mb-6 bg-white shadow-md">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      placeholder="חיפוש לפי שם, מספר תיק או טלפון..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("all")}
                    >
                      הכל
                    </Button>
                    <Button
                      variant={filterStatus === "stuck" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("stuck")}
                      className={filterStatus === "stuck" ? "bg-red-600" : ""}
                    >
                      תקועים
                    </Button>
                    <Button
                      variant={filterStatus === "ready" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus("ready")}
                      className={filterStatus === "ready" ? "bg-green-600" : ""}
                    >
                      מוכנים להגשה
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Claims Management Table */}
              <Card className="bg-white shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">לקוח</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">ציון AI</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פוטנציאל</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">סטטוס</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">מוצרים בתיק</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פעילות אחרונה</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients && filteredClients.length > 0 ? (
                        filteredClients.map((client, index) => {
                          const statusConfig = getStatusBadge(client.status)
                          return (
                            <motion.tr
                              key={client.id}
                              initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => setSelectedClient(client)}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-slate-900">{client.name}</p>
                                <p className="text-sm text-slate-500">{client.id}</p>
                                <p className="text-xs text-slate-400">{client.phone}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${client.aiScore >= 80 ? "bg-green-500" : client.aiScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                                    style={{ width: `${client.aiScore}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-slate-900">{client.aiScore}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-emerald-600">
                                ₪{client.potentialFee.toLocaleString()}
                              </span>
                              <p className="text-xs text-slate-500">סכום משוער</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={statusConfig.className}>{client?.status}</Badge>
                                  {client.daysStuck > 3 && (
                                    <Badge className="bg-red-100 text-red-700">
                                      <AlertTriangle className="w-3 h-3 ml-1" />
                                      {client.daysStuck} ימים
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {client.products && client.products.length > 0 ? (
                                  client.products.map((product, idx) => {
                                    // Determine badge color based on product type
                                    const isWorkDisability = product.toLowerCase().includes("work disability") || 
                                                            product.toLowerCase().includes("נכות עבודה")
                                    const isMobility = product.toLowerCase().includes("mobility") || 
                                                      product.toLowerCase().includes("ניידות")
                                    const isSpecialServices = product.toLowerCase().includes("special services") || 
                                                             product.toLowerCase().includes("שר״מ") ||
                                                             product.toLowerCase().includes("שרמ")
                                    
                                    let badgeClass = "bg-slate-100 text-slate-700"
                                    if (isWorkDisability) badgeClass = "bg-blue-100 text-blue-700"
                                    else if (isMobility) badgeClass = "bg-purple-100 text-purple-700"
                                    else if (isSpecialServices) badgeClass = "bg-orange-100 text-orange-700"
                                    
                                    return (
                                      <Badge key={idx} className={`${badgeClass} text-xs`}>
                                        {product}
                                      </Badge>
                                    )
                                  })
                                ) : (
                                  <span className="text-xs text-slate-400">אין מוצרים</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-sm ${client.daysStuck > 7 ? "text-red-600 font-semibold" : "text-slate-600"}`}
                              >
                                {client.lastActive}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(`https://wa.me/972${client.phone.slice(1)}`, "_blank")
                                  }}
                                >
                                  <MessageCircle className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedClient(client)
                                  }}
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                  <Edit className="w-4 h-4 text-slate-600" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                              {casesLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                  <p>טוען תיקים...</p>
                                </>
                              ) : casesError ? (
                                <>
                                  <AlertTriangle className="w-8 h-8 text-red-500" />
                                  <p>שגיאה בטעינת התיקים</p>
                                  <Button size="sm" variant="outline" onClick={refetchCases}>
                                    נסה שוב
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-8 h-8 text-slate-300" />
                                  <p>לא נמצאו תיקים</p>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-white shadow-md overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">לידים להעברה</h3>
                    <p className="text-sm text-slate-600">תיקי נכות עבודה להעברה לשותפים משפטיים</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{workDisabilityCases.length} תיקים</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פרטי ליד</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">שווי מחושב</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">דחיפות זמנים</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">תאריך הגשה</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">סטטוס</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingWorkDisability ? (
                        // Skeleton loaders for work disability cases
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={`skeleton-${index}`} className="border-b border-slate-100">
                            <td className="px-6 py-4">
                              <div className="space-y-2 animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 bg-slate-200 rounded w-28 animate-pulse"></div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <div className="h-8 bg-slate-200 rounded w-24 animate-pulse"></div>
                                <div className="h-8 bg-slate-200 rounded w-16 animate-pulse"></div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : workDisabilityCases.length > 0 ? (
                        // Actual work disability cases
                        workDisabilityCases.map((caseItem, index) => {
                          const statusColors: Record<string, string> = {
                            new: "bg-blue-100 text-blue-700",
                            in_progress: "bg-yellow-100 text-yellow-700",
                            completed: "bg-emerald-100 text-emerald-700",
                            rejected: "bg-red-100 text-red-700",
                          }
                          const statusColor = statusColors[caseItem.status] || "bg-slate-100 text-slate-700"
                          
                          return (
                            <motion.tr
                              key={caseItem.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                  <p className="font-semibold text-slate-900 text-sm">{caseItem.client_name}</p>
                                  <p className="text-xs text-slate-600 mt-1">{caseItem.client_email}</p>
                                  <p className="text-xs text-slate-600">{caseItem.client_phone}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-lg font-bold text-emerald-600">
                                  ₪{Math.round((caseItem.potential_fee || 0) / 1000)}K
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-600">עדכון נדרש</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-600">
                                  {new Date(caseItem.created_at).toLocaleDateString('he-IL')}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <Badge className={statusColor}>
                                  {caseItem.status === "new" && "חדש"}
                                  {caseItem.status === "in_progress" && "בעיבוד"}
                                  {caseItem.status === "completed" && "הושלם"}
                                  {caseItem.status === "rejected" && "דחוי"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => setSelectedClient(caseItem)}
                                  >
                                    <Eye className="w-4 h-4 ml-2" />
                                    צפה
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 bg-transparent"
                                  >
                                    <MessageCircle className="w-4 h-4 ml-2" />
                                    WhatsApp
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                            אין מקרים של אי כושר עבודה זמין
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Client Detail Drawer */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedClient(null)}
            />
            <motion.div
              initial={{ x: 600 }}
              animate={{ x: 0 }}
              exit={{ x: 600 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 h-full w-[700px] bg-white shadow-2xl z-50 flex flex-col scroll-auto"
              dir="rtl"
              style={{overflowY:"scroll"}}
            >
              {/* Drawer Header */}
              <div className="bg-gradient-to-l from-indigo-600 to-indigo-700 text-white p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{selectedClient.name}</h3>
                    <p className="text-indigo-200 text-sm">{selectedClient.id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedClient(null)}
                    className="text-white hover:bg-indigo-500"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{selectedClient.phone}</span>
                  </div>
                  <Badge className={getStatusBadge(selectedClient.status).className}>
                    {getStatusBadge(selectedClient.status).label}
                  </Badge>
                </div>
              </div>

              {/* Drawer Content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <Tabs defaultValue="timeline" className="w-full">
                    <TabsList className="w-full grid grid-cols-4">
                      <TabsTrigger value="timeline">ציר זמן</TabsTrigger>
                      <TabsTrigger value="documents">מסמכים</TabsTrigger>
                      <TabsTrigger value="form7801">טופס 7801</TabsTrigger>
                      <TabsTrigger value="rescue">פעולות</TabsTrigger>
                    </TabsList>

                    <TabsContent value="timeline" className="space-y-4">
                      <h4 className="font-semibold text-slate-900 mb-3">התקדמות התיק</h4>
                      {selectedClient.timeline.map((event, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0">
                            {event.status === "completed" ? (
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <Activity className="w-5 h-5 text-amber-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{event.event}</p>
                            <p className="text-xs text-slate-500">{event.date}</p>
                            
                            {/* Show eligibility details if this is an eligibility event */}
                            {event.event.includes("הערכת זכאות") && selectedClient.eligibilityData && (
                              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                                <div>
                                  <span className="font-semibold text-slate-700">ציון זכאות:</span>
                                  <span className="ml-2 text-slate-600">{selectedClient.eligibilityData.eligibility_score}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700">סטטוס:</span>
                                  <span className="ml-2 text-slate-600">{selectedClient.eligibilityData.eligibility_status}</span>
                                </div>
                                {selectedClient.eligibilityData.weaknesses && selectedClient.eligibilityData.weaknesses.length > 0 && (
                                  <div>
                                    <span className="font-semibold text-red-700">נקודות חלשות:</span>
                                    <ul className="mt-1 ml-2 space-y-1 text-red-600">
                                      {selectedClient.eligibilityData.weaknesses.map((w: string, i: number) => (
                                        <li key={i}>• {w}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {selectedClient.eligibilityData.required_next_steps && selectedClient.eligibilityData.required_next_steps.length > 0 && (
                                  <div>
                                    <span className="font-semibold text-blue-700">שלבים נדרשים:</span>
                                    <ul className="mt-1 ml-2 space-y-1 text-blue-600">
                                      {selectedClient.eligibilityData.required_next_steps.map((step: string, i: number) => (
                                        <li key={i}>• {step}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {selectedClient.eligibilityData.document_analysis && (
                                  <div>
                                    <span className="font-semibold text-slate-700">ניתוח מסמכים:</span>
                                    <div className="mt-1 ml-2 text-slate-600 space-y-1">
                                      <div>סוג מסמך: {selectedClient.eligibilityData.document_analysis.document_type}</div>
                                      <div>תלות: {selectedClient.eligibilityData.document_analysis.relevance_score}%</div>
                                      <div>הערה: {selectedClient.eligibilityData.document_analysis.relevance_reason}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-slate-900">מסמכים</h4>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleEditDocuments}>
                              <Edit className="w-4 h-4 ml-2" />
                              עריכה
                            </Button>
                            <Button size="sm" onClick={() => setShowDocumentRequest(true)}>
                              <Plus className="w-4 h-4 ml-2" />
                              בקש מסמך
                            </Button>
                          </div>
                        </div>

                        {loadingDocuments && selectedClient.documents.length === 0 ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={`skeleton-${i}`} className="border border-slate-200 rounded-lg bg-white p-4 animate-pulse">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="w-5 h-5 bg-slate-300 rounded-full flex-shrink-0 mt-0.5"></div>
                                    <div className="flex-1 space-y-2 min-w-0">
                                      <div className="h-4 bg-slate-300 rounded w-1/3"></div>
                                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <div className="h-6 w-12 bg-slate-300 rounded"></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : selectedClient.documents.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                            <Upload className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">לא בוקשו מסמכים עדיין</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedClient.documents.map((doc, index) => (
                              <motion.div
                                key={doc.id || index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition overflow-hidden"
                              >
                                {/* Main Card */}
                                <div className="p-4 flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    {doc.uploaded ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                                      {doc.reason && <p className="text-xs text-slate-600 mt-1">{doc.reason}</p>}
                                      {doc.source && <p className="text-xs text-slate-500">מ: {doc.source}</p>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    {doc.file_url && (
                                      <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded transition flex items-center gap-1"
                                        title="הצג קובץ"
                                      >
                                        <Eye className="w-4 h-4" />
                                        צפה
                                      </a>
                                    )}
                                    <Badge className={doc.uploaded ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                                      {doc.uploaded ? "הועלה" : "חסר"}
                                    </Badge>
                                    {/* Summary Toggle Button */}
                                    {doc.uploaded && doc.document_id && (
                                      <button
                                        onClick={() => toggleDocumentSummary(selectedClient.case_id, doc.document_id)}
                                        className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded transition flex items-center gap-1"
                                        title="הצג סיכום"
                                      >
                                        <ChevronDown
                                          className={`w-4 h-4 transition-transform ${
                                            expandedDocuments[doc.document_id] ? 'rotate-180' : ''
                                          }`}
                                        />
                                        סיכום
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Document Summary Dropdown */}
                                <AnimatePresence>
                                  {expandedDocuments[doc.document_id] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="border-t border-slate-200 bg-slate-50"
                                    >
                                      <div className="p-4 space-y-4">
                                        {loadingSummary[doc.document_id] ? (
                                          <div className="flex items-center justify-center py-6">
                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
                                          </div>
                                        ) : documentSummaries[doc.document_id] ? (
                                          <>
                                            {/* Relevance Info */}
                                            {documentSummaries[doc.document_id].metadata?.is_relevant !== undefined && (
                                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between mb-2">
                                                  <span className="text-xs font-semibold text-slate-600">רלוונטיות</span>
                                                  <Badge
                                                    className={
                                                      documentSummaries[doc.document_id].metadata?.is_relevant
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }
                                                  >
                                                    {documentSummaries[doc.document_id].metadata?.is_relevant ? 'רלוונטי' : 'לא רלוונטי'}
                                                  </Badge>
                                                </div>
                                                {documentSummaries[doc.document_id].metadata?.relevance_score !== undefined && (
                                                  <p className="text-xs text-slate-600">
                                                    ניקוד רלוונטיות: {documentSummaries[doc.document_id].metadata.relevance_score}/100
                                                  </p>
                                                )}
                                                {documentSummaries[doc.document_id].metadata?.relevance_reason && (
                                                  <p className="text-xs text-slate-600 mt-1">
                                                    {documentSummaries[doc.document_id].metadata.relevance_reason}
                                                  </p>
                                                )}
                                              </div>
                                            )}

                                            {/* Document Summary */}
                                            {documentSummaries[doc.document_id].metadata?.document_summary && (
                                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                                <h6 className="text-xs font-semibold text-slate-900 mb-2">סיכום מסמך</h6>
                                                <p className="text-xs text-slate-700 leading-relaxed line-clamp-6">
                                                  {documentSummaries[doc.document_id].metadata.document_summary}
                                                </p>
                                              </div>
                                            )}

                                            {/* Key Points */}
                                            {documentSummaries[doc.document_id].metadata?.key_points && documentSummaries[doc.document_id].metadata.key_points.length > 0 && (
                                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                                <h6 className="text-xs font-semibold text-slate-900 mb-2">נקודות עיקריות</h6>
                                                <ul className="text-xs text-slate-700 space-y-1 max-h-40 overflow-y-auto">
                                                  {documentSummaries[doc.document_id].metadata.key_points.slice(0, 10).map((point: string, idx: number) => (
                                                    <li key={idx} className="flex gap-2">
                                                      <span className="text-slate-400">•</span>
                                                      <span>{point}</span>
                                                    </li>
                                                  ))}
                                                  {documentSummaries[doc.document_id].metadata.key_points.length > 10 && (
                                                    <li className="text-slate-500 italic">
                                                      ועוד {documentSummaries[doc.document_id].metadata.key_points.length - 10} נקודות...
                                                    </li>
                                                  )}
                                                </ul>
                                              </div>
                                            )}

                                            {/* Document Type */}
                                            {documentSummaries[doc.document_id].metadata?.document_type && (
                                              <div className="p-3 bg-white rounded-lg border border-slate-200">
                                                <p className="text-xs text-slate-600">
                                                  <span className="font-semibold">סוג מסמך:</span> {documentSummaries[doc.document_id].metadata.document_type}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <div className="text-center py-4 text-slate-500">
                                            <p className="text-xs">לא הצלחנו לטעון את פרטי המסמך</p>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="form7801" className="space-y-4">
                      <h4 className="font-semibold text-slate-900 mb-3">פרטי טופס 7801</h4>

                      {selectedClient.form7801 ? (
                        <div className="space-y-6">
                          {/* Personal Info */}
                          <Card className="p-4 bg-slate-50">
                            <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              פרטי התובע
                            </h5>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-slate-600">שם מלא:</span>
                                <p className="font-semibold">{selectedClient.form7801.personalInfo.fullName}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">ת.ז:</span>
                                <p className="font-semibold">{selectedClient.form7801.personalInfo.idNumber}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-600">כתובת:</span>
                                <p className="font-semibold">{selectedClient.form7801.personalInfo.address}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">טלפון:</span>
                                <p className="font-semibold">{selectedClient.form7801.personalInfo.phone}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">אימייל:</span>
                                <p className="font-semibold">{selectedClient.form7801.personalInfo.email}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">תאריך לידה:</span>
                                <p className="font-semibold">{selectedClient.form7801.personalInfo.birthDate}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">מצב משפחתי:</span>
                                <p className="font-semibold">{selectedClient.form7801.personalInfo.maritalStatus}</p>
                              </div>
                            </div>
                          </Card>

                          {/* Employment History */}
                          <Card className="p-4 bg-slate-50">
                            <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              היסטוריית עבודה (15 חודשים)
                            </h5>
                            <div className="space-y-3">
                              {selectedClient.form7801.employmentHistory.map((job, index) => (
                                <div key={index} className="p-3 bg-white rounded border border-slate-200">
                                  <p className="font-semibold text-slate-900">{job.employer}</p>
                                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                    <div>
                                      <span className="text-slate-600">מתאריך:</span>
                                      <p className="font-semibold">{job.from}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-600">עד תאריך:</span>
                                      <p className="font-semibold">{job.to}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-600">שכר:</span>
                                      <p className="font-semibold">₪{job.salary}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Disability Info */}
                          <Card className="p-4 bg-slate-50">
                            <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              פרטי הנכות
                            </h5>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="text-slate-600">מחלות/ליקויים:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedClient.form7801.disabilityInfo.conditions.map((condition, index) => (
                                    <Badge key={index} className="bg-red-100 text-red-700">
                                      {condition}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-600">תאריך תחילת הנכות:</span>
                                <p className="font-semibold">{selectedClient.form7801.disabilityInfo.onsetDate}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">רופאים מומחים:</span>
                                <p className="font-semibold">{selectedClient.form7801.disabilityInfo.specialists}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">אשפוזים:</span>
                                <p className="font-semibold">
                                  {selectedClient.form7801.disabilityInfo.hospitalizations}
                                </p>
                              </div>
                            </div>
                          </Card>

                          {/* Bank Details */}
                          <Card className="p-4 bg-slate-50">
                            <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              פרטי חשבון בנק
                            </h5>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-slate-600">בנק:</span>
                                <p className="font-semibold">{selectedClient.form7801.bankDetails.bankName}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">סניף:</span>
                                <p className="font-semibold">{selectedClient.form7801.bankDetails.branch}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">מספר חשבון:</span>
                                <p className="font-semibold">{selectedClient.form7801.bankDetails.accountNumber}</p>
                              </div>
                            </div>
                          </Card>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                          <p>טופס 7801 עדיין לא הושלם</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="rescue" className="space-y-4">
                      <h4 className="font-semibold text-slate-900 mb-3">פעולות מנהל</h4>

                      {/* Legal Audit Trail Section */}
                      <Card className="p-4 bg-slate-900 border-slate-700">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          מסלול ביקורת משפטי (Legal Audit Trail)
                        </h5>
                        <p className="text-sm text-slate-400 mb-4">
                          ראיות שהמשתמש חתם והסכים לתנאים - לצורך הגנה משפטית
                        </p>

                        <div className="space-y-3 text-sm font-mono">
                          {/* Terms Agreement */}
                          <div className="bg-slate-800 p-3 rounded border border-slate-700">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-blue-400 font-semibold">הסכמה לתנאי שימוש</span>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="text-slate-400 text-xs space-y-1">
                              <div>
                                תאריך: <span className="text-white">15/12/2024 14:32:18</span>
                              </div>
                              <div>
                                IP: <span className="text-white">37.142.18.245</span>
                              </div>
                            </div>
                          </div>

                          {/* Anti-Spam Law */}
                          <div className="bg-slate-800 p-3 rounded border border-slate-700">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-blue-400 font-semibold">אישור חוק הספאם</span>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="text-slate-400 text-xs">
                              סטטוס: <span className="text-green-400">✅ אושר</span>
                            </div>
                          </div>

                          {/* Form 7801 Signature */}
                          <div className="bg-slate-800 p-3 rounded border border-slate-700">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-blue-400 font-semibold">חתימה על טופס 7801</span>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="text-slate-400 text-xs space-y-1">
                              <div>
                                תאריך: <span className="text-white">16/12/2024 09:15:42</span>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-400 hover:text-blue-300"
                                onClick={() => window.open("/signature-image.png", "_blank")}
                              >
                                צפה בתמונת החתימה →
                              </Button>
                            </div>
                          </div>

                          {/* Cover Letter Approval */}
                          <div className="bg-slate-800 p-3 rounded border border-slate-700">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-blue-400 font-semibold">אישור נוסח מכתב נלווה</span>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="text-slate-400 text-xs">
                              <div>
                                תאריך: <span className="text-white">16/12/2024 10:22:33</span>
                              </div>
                              <div className="mt-1 text-slate-500">המשתמש אישר את טקסט ה-AI</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            כל הנתונים מוצפנים ומאוחסנים בהתאם לתקנות הגנת הפרטיות
                          </p>
                        </div>
                      </Card>

                      {/* Appeal Management Section */}
                      {selectedClient.status === "rejected" || selectedClient.status === "appeal_pending" ? (
                        <Card className="p-4 bg-orange-50 border-orange-200">
                          <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-600" />
                            ניהול ערעור
                          </h5>
                          <p className="text-sm text-slate-600 mb-3">
                            התיק נדחה ונמצא בשלב ערעור. עקוב אחר העלאת המסמכים הנדרשים
                          </p>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">MRI נוסף</span>
                              <Badge className="bg-green-100 text-green-700 text-xs">הועלה</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">חוו"ד מומחה</span>
                              <Badge className="bg-amber-100 text-amber-700 text-xs">ממתין</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">תצהיר עד</span>
                              <Badge variant="outline" className="text-xs">
                                אופציונלי
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Button
                              className="w-full bg-orange-600 hover:bg-orange-700"
                              onClick={() => window.open("/claim-rejected", "_blank")}
                            >
                              <FileText className="w-4 h-4 ml-2" />
                              צפה בדף הערעור של הלקוח
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full bg-transparent"
                              onClick={() => setShowDocumentRequest(true)}
                            >
                              <Plus className="w-4 h-4 ml-2" />
                              בקש מסמך נוסף לערעור
                            </Button>
                          </div>
                        </Card>
                      ) : null}

                      <Card className="p-4 bg-amber-50 border-amber-200">
                        <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-amber-600" />
                          שלח הודעה מותאמת ללקוח
                        </h5>
                        <p className="text-sm text-slate-600 mb-3">כתוב הודעה אישית שתישלח ללקוח</p>
                        <Textarea
                          placeholder="לדוגמה: שלום יוחאי, ראינו שיש בעיה עם מסמך X, נשמח לעזור..."
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          rows={4}
                          className="mb-3"
                        />
                        <Button
                          className="w-full bg-amber-600 hover:bg-amber-700"
                          onClick={handleSendMessage}
                          disabled={!customMessage.trim()}
                        >
                          <Send className="w-4 h-4 ml-2" />
                          שלח הודעה
                        </Button>
                      </Card>

                      <Card className="p-4">
                        <h5 className="font-semibold text-slate-900 mb-2">פעולות מהירות</h5>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start bg-transparent"
                            onClick={() => window.open(`https://wa.me/972${selectedClient.phone.slice(1)}`, "_blank")}
                          >
                            <Phone className="w-4 h-4 ml-2" />
                            התקשר ללקוח
                          </Button>
                          <Button variant="outline" className="w-full justify-start bg-transparent">
                            <Zap className="w-4 h-4 ml-2" />
                            הפעל תזכורת אוטומטית
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-red-600 bg-transparent">
                            <AlertTriangle className="w-4 h-4 ml-2" />
                            סמן כתיק בעייתי
                          </Button>
                        </div>
                      </Card>

                      {selectedClient.daysStuck > 3 && (
                        <Card className="p-4 bg-red-50 border-red-200">
                          <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            תיק תקוע - מצב Rescue
                          </h5>
                          <p className="text-sm text-red-700 mb-3">
                            הלקוח לא פעיל כבר {selectedClient.daysStuck} ימים. מומלץ ליצור קשר.
                          </p>
                          <Button className="w-full bg-red-600 hover:bg-red-700">
                            <Zap className="w-4 h-4 ml-2" />
                            הפעל מצב Rescue
                          </Button>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>

              <div className="border-t border-slate-200 p-4 bg-slate-50">
                <div className="flex gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    אשר תיק להגשה
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    <Edit className="w-4 h-4 ml-2" />
                    ערוך פרטים
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditDocuments && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowEditDocuments(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[80vh] bg-white rounded-lg shadow-2xl z-50 p-6 overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">ערוך רשימת מסמכים</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowEditDocuments(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {editingDocuments.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">אין מסמכים לעריכה</p>
                  </div>
                ) : (
                  <>
                    {editingDocuments.map((doc, index) => (
                      <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900">מסמך {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocumentFromList(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">שם המסמך</label>
                            <Input
                              value={doc.name || ""}
                              onChange={(e) => handleUpdateDocumentField(index, "name", e.target.value)}
                              placeholder="שם המסמך"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">מ: (המקור)</label>
                            <Input
                              value={doc.source || ""}
                              onChange={(e) => handleUpdateDocumentField(index, "source", e.target.value)}
                              placeholder="מאיפה להשיג את המסמך"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">סיבה</label>
                            <Textarea
                              value={doc.reason || ""}
                              onChange={(e) => handleUpdateDocumentField(index, "reason", e.target.value)}
                              placeholder="למה המסמך נדרש"
                              rows={2}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`required-${index}`}
                              checked={doc.required || false}
                              onChange={(e) => handleUpdateDocumentField(index, "required", e.target.checked ? "true" : "false")}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                            <label htmlFor={`required-${index}`} className="text-sm font-medium text-slate-700">
                              מסמך חובה
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-200">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSaveDocumentEdits}
                >
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  שמור שינויים
                </Button>
                <Button variant="outline" onClick={() => setShowEditDocuments(false)}>
                  ביטול
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDocumentRequest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowDocumentRequest(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] bg-white rounded-lg shadow-2xl z-50 p-6"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">בקש מסמך מהלקוח</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowDocumentRequest(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">שם המסמך</label>
                  <Input
                    placeholder="לדוגמה: אישור מעביד על תקופת העסקה"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">מאיפה להשיג</label>
                  <Input
                    placeholder="לדוגמה: מחלקת משאבי אנוש במקום העבודה"
                    value={newDocumentWhere}
                    onChange={(e) => setNewDocumentWhere(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">למה המסמך נדרש</label>
                  <Textarea
                    placeholder="לדוגמה: כדי לאמת את תקופת העסקה ושכר לצורך חישוב הזכאות"
                    value={newDocumentReason}
                    onChange={(e) => setNewDocumentReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleRequestDocument}
                    disabled={!newDocumentName.trim() || !newDocumentWhere.trim() || !newDocumentReason.trim()}
                  >
                    <Send className="w-4 h-4 ml-2" />
                    שלח בקשה ללקוח
                  </Button>
                  <Button variant="outline" onClick={() => setShowDocumentRequest(false)}>
                    ביטול
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
