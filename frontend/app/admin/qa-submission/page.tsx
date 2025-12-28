"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import { BACKEND_BASE_URL } from '@/variables'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Edit2,
  Save,
  ExternalLink,
  Send,
  Rocket,
  Clock,
  User,
  CreditCard,
  Activity,
  Sparkles,
  Home,
  Menu,
  LogOut,
  Users,
  Filter,
  BarChart3,
  Settings,
  ShieldCheck,
  Phone,
  MapPin,
  Stethoscope,
} from "lucide-react"
import Link from "next/link"

interface UserProfile {
  user_id: string
  full_name: string
  email: string
  phone?: string
  identity_code?: string
  payments?: {
    bankName?: string
    branchNumber?: string
    accountNumber?: string
  }
  contact_details?: {
    hmo?: string
    address?: string
    doctorName?: string
  }
}

export default function QASubmissionConsole() {
  const router = useRouter()
  const { language } = useLanguage()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingUsers, setIsFetchingUsers] = useState(false)
  const [isFetchingUserData, setIsFetchingUserData] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [validationChecks, setValidationChecks] = useState({
    personal: false,
    medical: false,
    bank: false,
  })
  const [activeTab, setActiveTab] = useState("medical")
  const [payloadData, setPayloadData] = useState({
    personal: {
      fullName: "",
      idNumber: "",
      birthDate: "",
      address: "",
      phone: "",
      email: "",
    },
    medical: {
      diagnosis: "",
      diagnosisDate: "",
      treatingPhysician: "",
      hospitalizations: "",
      limitationsAtWork: "",
      percentageExpected: "",
    },
    bank: {
      bankName: "",
      branch: "",
      accountNumber: "",
    },
  })
  const [issues] = useState<any[]>([])

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/')
          return
        }

        const res: any = await legacyApi.apiMe()
        if (!res) {
          router.push('/')
          return
        }

        const role = res?.user?.role || res?.profile?.role || res?.role

        if (role !== 'admin' && role !== 'subadmin') {
          router.push('/')
          return
        }

        setIsAuthorized(true)
        fetchUsers()
      } catch (error) {
        console.error('Authorization check failed:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [router])

  const fetchUsers = async () => {
    setIsFetchingUsers(true)
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/admin/users/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsFetchingUsers(false)
    }
  }

  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user)
    setIsFetchingUserData(true)
    try {
      // Fetch full user profile data
      const response = await fetch(`${BACKEND_BASE_URL}/admin/users/${user.user_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const profile = data.user
        
        // Update payload data with user information
        setPayloadData({
          personal: {
            fullName: profile.full_name || "",
            idNumber: profile.identity_code || "N/A",
            birthDate: "",
            address: profile.contact_details?.address || "N/A",
            phone: profile.phone || "N/A",
            email: profile.email || "",
          },
          medical: {
            diagnosis: "",
            diagnosisDate: "",
            treatingPhysician: profile.contact_details?.doctorName || "N/A",
            hospitalizations: "",
            limitationsAtWork: "",
            percentageExpected: "",
          },
          bank: {
            bankName: profile.payments?.bankName || "N/A",
            branch: profile.payments?.branchNumber || "N/A",
            accountNumber: profile.payments?.accountNumber || "N/A",
          },
        })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setIsFetchingUserData(false)
    }
  }

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

  if (!isAuthorized) {
    return null
  }

  const allChecked = validationChecks.personal && validationChecks.medical && validationChecks.bank
  const isReady = allChecked && issues.length === 0

  // Check if there are any N/A values in payload data
  const hasNAValues = JSON.stringify(payloadData).includes("N/A")
  
  // Check if documents are missing (all tabs should have data)
  const hasMissingDocuments = false // Can be expanded if needed based on document upload status
  
  // Show "missing details" only if there are N/A values AND documents are missing
  const shouldShowMissingDetails = hasNAValues || hasMissingDocuments

  const handleEdit = (section: string, field: string) => {
    setEditingField(`${section}.${field}`)
  }

  const handleSave = () => {
    setEditingField(null)
  }

  const handleLaunchExtension = () => {
    alert("פתיחת פורטל המוסד לביטוח לאומי והפעלת תוסף Chrome...")
  }

  // Skeleton Loader Component
  const SkeletonLoader = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
          className="h-12 bg-slate-200 rounded-lg"
        />
      ))}
    </div>
  )

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
              <Link href="/admin">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Home className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  לוח בקרה
                </Button>
              </Link>
              <Link href="/admin/team">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Users className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                  ניהול צוות
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800 bg-slate-800">
                <ShieldCheck className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                קונסולת QA
              </Button>
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
              <Link href="/admin/settings">
                <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                  <Settings className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
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
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50 text-slate-900">
          {!selectedUser ? (
            // User Selection Screen
            <div className="p-6 max-w-md">
              <h2 className="text-2xl font-bold mb-6">בחר משתמש</h2>
              
              <Card className="p-6">
                {isFetchingUsers ? (
                  <SkeletonLoader />
                ) : (
                  <select
                    onChange={(e) => {
                      const user = users.find(u => u.user_id === e.target.value)
                      if (user) handleSelectUser(user)
                    }}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-white text-right cursor-pointer"
                  >
                    <option value="">-- בחר משתמש --</option>
                    {users.map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                )}
              </Card>
            </div>
          ) : isFetchingUserData ? (
            // Loading state
            <div className="p-6">
              <Button variant="outline" onClick={() => setSelectedUser(null)} className="mb-6">
                ← חזרה לבחירה
              </Button>
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">טוען נתונים...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Top Bar with User Info */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  ← חזרה לבחירה
                </Button>

                {/* Client Info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">{selectedUser.full_name}</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    ת.ז: <span className="font-mono">{selectedUser.identity_code || "N/A"}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {!shouldShowMissingDetails ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-lg px-4 py-2">
                      <CheckCircle2 className="w-5 h-5 ml-2" />
                      מוכן להגשה
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-lg px-4 py-2">
                      <AlertCircle className="w-5 h-5 ml-2" />
                      חסרים פרטים
                    </Badge>
                  )}
                </div>
              </div>

              {/* Validation Alert System */}
              <div className="px-6 py-4">
                <AnimatePresence mode="wait">
                  {issues.length === 0 && allChecked ? (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <span className="text-green-500 font-medium">כל המסמכים והנתונים תקינים. ניתן להגיש.</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2"
                    >
                      {issues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-amber-500">{issue.text}</span>
                        </div>
                      ))}
                      {!allChecked && (
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-amber-500">יש לאשר את כל הסעיפים לפני ההגשה</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Main Work Area */}
              <div className="px-6 pb-6 grid grid-cols-2 gap-6 h-[calc(100vh-330px)]">
                {/* Left Side - Source Documents */}
                <Card className="bg-white border-slate-200 p-6 flex flex-col">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    מסמכי המקור
                  </h2>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-4">
                    {["medical", "id", "bank"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === tab ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab === "medical" && "סיכום רפואי"}
                        {tab === "id" && "תעודת זהות"}
                        {tab === "bank" && "אישור בנק"}
                      </button>
                    ))}
                  </div>

                  {/* Document Preview */}
                  <div className="flex-1 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-3 text-slate-400" />
                      <p className="text-slate-600">
                        תצוגה מקדימה של:{" "}
                        {activeTab === "medical" ? "סיכום רפואי" : activeTab === "id" ? "תעודת זהות" : "אישור בנק"}
                      </p>
                      <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                        <ExternalLink className="w-4 h-4 ml-2" />
                        פתח במסך מלא
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Right Side - Personal & Payment Details */}
                <Card className="bg-white border-slate-200 p-6 flex flex-col overflow-auto">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                    נתוני משתמש והוראות קבע
                  </h2>

                  <div className="space-y-6">
                    {/* Personal Section */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <h3 className="font-bold flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-blue-600" />
                        פרטים אישיים
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">שם מלא</span>
                          <span className="flex-1 font-medium">{payloadData.personal.fullName || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">ת.ז</span>
                          <span className="flex-1 font-medium">{payloadData.personal.idNumber}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">אימייל</span>
                          <span className="flex-1 font-medium">{payloadData.personal.email || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">טלפון</span>
                          <span className="flex-1 font-medium">{payloadData.personal.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details Section */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <h3 className="font-bold flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-green-600" />
                        פרטי קשר
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">כתובת</span>
                          <span className="flex-1 font-medium">{payloadData.personal.address}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">שם רופא</span>
                          <span className="flex-1 font-medium">{payloadData.medical.treatingPhysician}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bank Details Section */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <h3 className="font-bold flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-orange-600" />
                        פרטי בנק והוראות קבע
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">בנק</span>
                          <span className="flex-1 font-medium">{payloadData.bank.bankName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">סניף</span>
                          <span className="flex-1 font-medium">{payloadData.bank.branch}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-32 flex-shrink-0">מספר חשבון</span>
                          <span className="flex-1 font-medium">{payloadData.bank.accountNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>עדכון אחרון על ידי AI: לפני 2 דקות</span>
                </div>

                <Button variant="outline" className="gap-2 bg-transparent">
                  <Send className="w-4 h-4" />
                  בקש מסמכים נוספים מהלקוח (WhatsApp)
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
