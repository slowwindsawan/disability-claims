"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

type ClientStatus =
  | "new"
  | "document_collection"
  | "ready_for_submission"
  | "submitted"
  | "approved"
  | "rejected"
  | "appeal_pending" // Added appeal status

interface Client {
  id: string
  name: string
  phone: string
  status: ClientStatus
  lastActive: string
  aiScore: number
  potentialFee: number
  daysStuck: number
  documents: { name: string; uploaded: boolean }[]
  timeline: { date: string; event: string; status: string }[]
  form7801?: Form7801Data
  hasMobility?: boolean // Added property for mobility product
  hasSpecialServices?: boolean // Added property for special services product
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

const mockClients: Client[] = [
  {
    id: "ZTC-001",
    name: "יוחאי כהן",
    phone: "050-1234567",
    status: "document_collection",
    lastActive: "לפני שעתיים",
    aiScore: 85,
    potentialFee: 12750,
    daysStuck: 1,
    documents: [
      { name: "אישור אבחנה רפואית", uploaded: true },
      { name: "תיעוד טיפולים", uploaded: true },
      { name: "אישור מעביד", uploaded: false },
    ],
    timeline: [
      { date: "12.01.2025", event: "השלים שאלון התחלתי", status: "completed" },
      { date: "12.01.2025", event: "שיחה עם עו״ד AI", status: "completed" },
      { date: "12.01.2025", event: "החל העלאת מסמכים", status: "in_progress" },
    ],
    form7801: {
      personalInfo: {
        fullName: "יוחאי כהן",
        idNumber: "123456789",
        address: "רחוב הרצל 45, תל אביב",
        phone: "050-1234567",
        email: "yochai@example.com",
        birthDate: "15.03.1985",
        maritalStatus: "נשוי",
      },
      employmentHistory: [
        {
          employer: "חברת היי-טק בע״מ",
          from: "01.2020",
          to: "06.2024",
          salary: "18,000",
        },
        {
          employer: "סטארט-אפ ישראלי",
          from: "03.2018",
          to: "12.2019",
          salary: "15,000",
        },
      ],
      disabilityInfo: {
        conditions: ["פגיעה בעמוד השדרה", "כאבים כרוניים", "מוגבלות תנועה"],
        onsetDate: "15.06.2024",
        specialists: "ד״ר משה לוי - אורתופד, ד״ר שרה כהן - כאב",
        hospitalizations: "אשפוז בבית חולים איכילוב 20-25.06.2024",
      },
      bankDetails: {
        bankName: "בנק לאומי",
        branch: "523",
        accountNumber: "123456",
      },
    },
    hasMobility: true, // Example product data
  },
  {
    id: "ZTC-002",
    name: "מירי לוי",
    phone: "052-9876543",
    status: "new",
    lastActive: "לפני 8 ימים",
    aiScore: 72,
    potentialFee: 8500,
    daysStuck: 8,
    documents: [],
    timeline: [{ date: "04.01.2025", event: "נרשם למערכת", status: "completed" }],
  },
  {
    id: "ZTC-003",
    name: "דוד אברהם",
    phone: "054-1112233",
    status: "committee",
    lastActive: "לפני יום",
    aiScore: 91,
    potentialFee: 15300,
    daysStuck: 0,
    documents: [
      { name: "אישור אבחנה רפואית", uploaded: true },
      { name: "תיעוד טיפולים", uploaded: true },
      { name: "אישור מעביד", uploaded: true },
    ],
    timeline: [
      { date: "08.01.2025", event: "השלים שאלון", status: "completed" },
      { date: "09.01.2025", event: "העלה מסמכים", status: "completed" },
      { date: "11.01.2025", event: "הוגש לוועדה", status: "in_progress" },
    ],
    hasSpecialServices: true, // Example product data
  },
  {
    id: "ZTC-004",
    name: "שרה גולן",
    phone: "053-4445566",
    status: "approved",
    lastActive: "לפני שעה",
    aiScore: 88,
    potentialFee: 13200,
    daysStuck: 0,
    documents: [
      { name: "אישור אבחנה רפואית", uploaded: true },
      { name: "תיעוד טיפולים", uploaded: true },
      { name: "אישור מעביד", uploaded: true },
    ],
    timeline: [
      { date: "05.01.2025", event: "השלים תהליך", status: "completed" },
      { date: "10.01.2025", event: "תביעה אושרה", status: "completed" },
    ],
  },
  {
    id: "ZTC-005",
    name: "אלי מזרחי",
    phone: "050-7778899",
    status: "document_collection",
    lastActive: "לפני 5 ימים",
    aiScore: 65,
    potentialFee: 9800,
    daysStuck: 5,
    documents: [{ name: "אישור אבחנה רפואית", uploaded: true }],
    timeline: [
      { date: "07.01.2025", event: "השלים שאלון", status: "completed" },
      { date: "07.01.2025", event: "החל העלאת מסמכים", status: "in_progress" },
    ],
  },
]

const mockWorkInjuryLeads: WorkInjuryLead[] = [
  {
    id: "WI-001",
    name: "אלון דוד",
    phone: "052-1234567",
    calculatedValue: 85000,
    status: "pending_transfer",
    lastActive: "לפני 3 שעות",
    submittedDate: "12.01.2025",
    injuryDate: "10.01.2025",
    conflictChecked: false,
    employerName: "חברת בנייה א.א. בע״מ",
    insurerName: "מנורה מבטחים",
    injuryType: "פגיעת גב",
    liabilityKeywords: ["scaffolding fell", "no safety harness"],
    userQuote: "ביקשתי סולם תקין והמנהל אמר לי לעלות בכל זאת",
  },
  {
    id: "WI-002",
    name: "רונית לוי",
    phone: "054-9876543",
    calculatedValue: 92000,
    status: "transferred_to_partner",
    partnerName: "עו״ד כהן ושות׳",
    lastActive: "לפני יום",
    submittedDate: "10.01.2025",
    injuryDate: "15.07.2024",
    conflictChecked: true,
    employerName: "מפעלי תעשייה ירושלים בע״מ",
    insurerName: "הפניקס",
    injuryType: "כוויה כימית",
  },
  {
    id: "WI-003",
    name: "משה אברהם",
    phone: "053-5556677",
    calculatedValue: 68000,
    status: "pending_transfer",
    lastActive: "לפני 5 שעות",
    submittedDate: "11.01.2025",
    injuryDate: "15.01.2019",
    conflictChecked: false,
    employerName: "קבוצת שילה נדל״ן",
    insurerName: "כלל ביטוח",
    injuryType: "פגיעה בכתף",
    liabilityKeywords: ["wet floor", "no warning signs"],
    userQuote: "הרצפה הייתה רטובה ואף אחד לא שם שלט אזהרה",
  },
]

export default function AdminDashboard() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "stuck" | "ready">("all")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showDocumentRequest, setShowDocumentRequest] = useState(false)
  const [newDocumentName, setNewDocumentName] = useState("")
  const [newDocumentWhere, setNewDocumentWhere] = useState("")
  const [newDocumentReason, setNewDocumentReason] = useState("")
  const [customMessage, setCustomMessage] = useState("")

  const totalClients = mockClients.length
  const totalRevenue = mockClients.reduce((sum, c) => sum + c.potentialFee, 0)
  const stuckClients = mockClients.filter((c) => c.daysStuck > 3).length
  const conversionRate = 68

  const [businessLine, setBusinessLine] = useState<"active_claims" | "partner_leads">("active_claims")

  const [conflictCheckStatus, setConflictCheckStatus] = useState<Record<string, boolean>>({})

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

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch =
      client.name.includes(searchQuery) || client.id.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleRequestDocument = () => {
    console.log("Document requested:", { newDocumentName, newDocumentWhere, newDocumentReason })
    // Here you would send a notification to the client
    alert(`בקשת מסמך נשלחה ל-${selectedClient?.name}`)
    setShowDocumentRequest(false)
    setNewDocumentName("")
    setNewDocumentWhere("")
    setNewDocumentReason("")
  }

  const handleSendMessage = () => {
    console.log("Message sent:", customMessage)
    alert(`הודעה נשלחה ל-${selectedClient?.name}`)
    setCustomMessage("")
  }

  return (
    <div className="flex h-screen bg-slate-50">
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
                <Home className="w-5 h-5 ml-3" />
                לוח בקרה
              </Button>
              {/* CHANGE: Added link to team management page */}
              <Link href="/admin/team">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Users className="w-5 h-5 ml-3" />
                  ניהול צוות
                </Button>
              </Link>
              <Link href="/admin/qa-submission">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <ShieldCheck className="w-5 h-5 ml-3" />
                  קונסולת QA והגשה
                </Button>
              </Link>
              <Link href="/admin/advanced-filters">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Filter className="w-5 h-5 ml-3" />
                  סינון מתקדם
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <BarChart3 className="w-5 h-5 ml-3" />
                  אנליטיקס
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Settings className="w-5 h-5 ml-3" />
                  הגדרות
                </Button>
              </Link>
            </nav>

            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">מנ</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">מנהל מערכת</p>
                  <p className="text-xs text-slate-400">admin@zerotouch.co.il</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-red-400 hover:bg-slate-800">
                <LogOut className="w-5 h-5 ml-3" />
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
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">מוצרים בתיק</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">סטטוס</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פעילות אחרונה</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">ציון AI</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פוטנציאל</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client, index) => {
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
                              <div className="flex flex-wrap gap-1">
                                <Badge className="bg-blue-100 text-blue-700 text-xs">נכות כללית</Badge>
                                {client.hasMobility && (
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">ניידות</Badge>
                                )}
                                {client.hasSpecialServices && (
                                  <Badge className="bg-orange-100 text-orange-700 text-xs">שר״מ</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                                  {client.daysStuck > 3 && (
                                    <Badge className="bg-red-100 text-red-700">
                                      <AlertTriangle className="w-3 h-3 ml-1" />
                                      {client.daysStuck} ימים
                                    </Badge>
                                  )}
                                </div>
                                {(client.hasMobility || client.hasSpecialServices) && (
                                  <div className="text-xs space-y-0.5 mt-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500">כללי:</span>
                                      <span className="text-green-600 font-medium">מוכן ✓</span>
                                    </div>
                                    {client.hasMobility && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-500">ניידות:</span>
                                        <span className="text-amber-600 font-medium">חסרים מסמכים ⚠</span>
                                      </div>
                                    )}
                                    {client.hasSpecialServices && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-500">שר״מ:</span>
                                        <span className="text-green-600 font-medium">מוכן ✓</span>
                                      </div>
                                    )}
                                  </div>
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
                      })}
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
                    <h3 className="text-lg font-semibold text-slate-900">לידים - תאונות עבודה</h3>
                    <p className="text-sm text-slate-600">לידים להעברה לשותפים משפטיים</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{mockWorkInjuryLeads.length} לידים פעילים</Badge>
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
                      {mockWorkInjuryLeads.map((lead, index) => {
                        const statusConfig = getLeadStatusBadge(lead.status)
                        const timeSensitivity = getTimeSensitivity(lead.injuryDate)
                        const isUrgent = timeSensitivity.urgencyLevel === "critical"
                        // Updated conflict check logic
                        const isConflictChecked = conflictCheckStatus[lead.id] || lead.conflictChecked
                        const hasLiability = lead.liabilityKeywords && lead.liabilityKeywords.length > 0

                        return (
                          <motion.tr
                            key={lead.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              {!isConflictChecked ? (
                                // State 1: Pre-Acceptance - Obfuscated View
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-amber-600" />
                                    <p className="text-sm font-semibold text-amber-700">בדיקת ניגוד עניינים נדרשת</p>
                                  </div>

                                  {/* Obfuscated name */}
                                  <div className="bg-slate-100 px-3 py-2 rounded">
                                    <p className="text-xs text-slate-500 mb-1">שם לקוח</p>
                                    <p className="font-semibold text-slate-400 blur-sm select-none">{lead.name}</p>
                                    <p className="text-sm text-slate-900 mt-1">
                                      {lead.name.split(" ")[0]} {lead.name.split(" ")[1]?.[0]}.
                                    </p>
                                  </div>

                                  {/* Injury type - visible */}
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">סוג פגיעה</p>
                                    <p className="font-medium text-slate-900">{lead.injuryType}</p>
                                  </div>

                                  {/* Employer/Defendant - PROMINENT */}
                                  <div className="bg-blue-50 border-2 border-blue-200 px-3 py-2 rounded">
                                    <p className="text-xs text-blue-600 mb-1 font-semibold">מעביד / נתבע</p>
                                    <p className="font-bold text-lg text-blue-900">{lead.employerName}</p>
                                  </div>

                                  {/* Insurer - visible */}
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">חברת ביטוח</p>
                                    <p className="font-medium text-slate-900">{lead.insurerName}</p>
                                  </div>

                                  {/* Liability indicator if exists */}
                                  {hasLiability && (
                                    <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                                      <div className="flex items-center gap-2 mb-1">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        <p className="text-xs font-semibold text-amber-700">חשד לרשלנות מעביד</p>
                                      </div>
                                      {lead.userQuote && (
                                        <p className="text-xs text-slate-700 italic">
                                          <span className="font-semibold">המשתמש אמר:</span> "{lead.userQuote}"
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Action buttons */}
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                      onClick={() => handleAcceptLead(lead.id)}
                                    >
                                      <CheckCircle className="w-4 h-4 ml-2" />
                                      אין ניגוד עניינים - חשוף תיק
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                                      onClick={() => handleRejectLead(lead.id)}
                                    >
                                      <XCircle className="w-4 h-4 ml-2" />
                                      דחה
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                // State 2: Post-Acceptance - Full Details Revealed
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <p className="text-xs font-semibold">נבדק - אין ניגוד עניינים</p>
                                  </div>
                                  <p className="font-semibold text-slate-900">{lead.name}</p>
                                  <p className="text-sm text-slate-500">{lead.id}</p>
                                  <p className="text-xs text-slate-400">{lead.phone}</p>
                                  <p className="text-sm text-slate-700 mt-1">פגיעה: {lead.injuryType}</p>
                                  <p className="text-xs text-slate-500">מעביד: {lead.employerName}</p>
                                  {hasLiability && (
                                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                                      <AlertTriangle className="w-3 h-3 ml-1" />
                                      פוטנציאל גבוה
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <div className={!isConflictChecked ? "blur-sm select-none" : ""}>
                                <p className="text-xl font-bold text-emerald-600">
                                  ₪{lead.calculatedValue.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">אומדן תאונת עבודה</p>
                                {hasLiability && isConflictChecked && (
                                  <Badge className="mt-1 bg-yellow-100 text-yellow-700 text-xs">Gold Lead</Badge>
                                )}
                              </div>
                            </td>

                            {/* Time sensitivity - always visible */}
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <p className="text-sm font-medium text-slate-700">{lead.injuryDate}</p>
                                </div>
                                <p className="text-xs text-slate-500">{timeSensitivity.timeElapsed}</p>
                                {timeSensitivity.message && (
                                  <Badge className={`${timeSensitivity.badgeColor} text-xs font-semibold`}>
                                    {timeSensitivity.diffDays <= 2 && <AlertCircle className="w-3 h-3 ml-1" />}
                                    {timeSensitivity.message}
                                  </Badge>
                                )}
                              </div>
                            </td>

                            {/* Submitted date */}
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm text-slate-900">{lead.submittedDate}</p>
                                <p className="text-xs text-slate-500">{lead.lastActive}</p>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                              {lead.partnerName && <p className="text-xs text-slate-500 mt-1">{lead.partnerName}</p>}
                            </td>

                            {/* Actions - only show if conflict checked */}
                            <td className="px-6 py-4">
                              {isConflictChecked && (
                                <div className="flex items-center gap-2">
                                  {lead.status === "pending_transfer" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className={isUrgent ? "animate-pulse bg-emerald-600 hover:bg-emerald-700" : ""}
                                      >
                                        <Send className="w-4 h-4 ml-2" />
                                        שלח במייל לשותף
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                                        onClick={() => handleExportCasePackage(lead)}
                                      >
                                        <Download className="w-4 h-4 ml-2" />
                                        הורד תיק מלא (ZIP)
                                      </Button>
                                    </>
                                  )}
                                  {lead.status === "transferred_to_partner" && (
                                    <>
                                      <Button size="sm" variant="outline">
                                        <Eye className="w-4 h-4 ml-2" />
                                        צפה בפרטים
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                                        onClick={() => handleExportCasePackage(lead)}
                                      >
                                        <Download className="w-4 h-4 ml-2" />
                                        הורד תיק
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                              {!isConflictChecked && (
                                <p className="text-xs text-slate-400 italic">נא לבצע בדיקת ניגוד עניינים</p>
                              )}
                            </td>
                          </motion.tr>
                        )
                      })}
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
              className="fixed left-0 top-0 h-full w-[700px] bg-white shadow-2xl z-50 flex flex-col"
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
                          </div>
                        </motion.div>
                      ))}
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-slate-900">מסמכים נדרשים</h4>
                        <Button size="sm" onClick={() => setShowDocumentRequest(true)}>
                          <Plus className="w-4 h-4 ml-2" />
                          בקש מסמך
                        </Button>
                      </div>

                      {selectedClient.documents.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <Upload className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                          <p>עדיין לא הועלו מסמכים</p>
                        </div>
                      ) : (
                        selectedClient.documents.map((doc, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 border border-slate-200 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              {doc.uploaded ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <span className="text-sm text-slate-900">{doc.name}</span>
                            </div>
                            {doc.uploaded ? (
                              <Badge className="bg-green-100 text-green-700">הועלה</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700">חסר</Badge>
                            )}
                          </motion.div>
                        ))
                      )}

                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <h5 className="font-semibold text-slate-900 mb-3">ערוך רשימת מסמכים</h5>
                        <p className="text-sm text-slate-600 mb-4">
                          המערכת זיהתה את המסמכים לעיל בהתבסס על שיחת ה-AI. ניתן לערוך את הרשימה ידנית.
                        </p>
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          <Edit className="w-4 h-4 ml-2" />
                          ערוך את בקשת ה-AI
                        </Button>
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
