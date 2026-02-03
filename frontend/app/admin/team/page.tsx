"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import { BACKEND_BASE_URL } from '@/variables'
import {
  Users,
  Lock,
  FileText,
  MessageSquare,
  DollarSign,
  Database,
  Handshake,
  Eye,
  Menu,
  LogOut,
  Home,
  ShieldCheck,
  BarChart3,
  Activity,
  UserPlus,
  Clock,
  CheckCircle2,
  Filter,
  Settings,
  Edit,
  Trash2,
  X,
  Save,
  AlertCircle,
  Mail,
  Phone,
  Shield,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

interface SubAdmin {
  id: string
  user_id: string
  full_name: string
  email: string
  phone?: string
  role: string
  is_subadmin: boolean
  admin_permissions: AdminPermissions
  created_at: string
  photo_url?: string
}

interface AdminPermissions {
  view_cases?: boolean
  edit_cases?: boolean
  delete_cases?: boolean
  view_documents?: boolean
  upload_documents?: boolean
  delete_documents?: boolean
  view_users?: boolean
  edit_users?: boolean
  view_reports?: boolean
  export_data?: boolean
  manage_partners?: boolean
  view_financial?: boolean
  send_messages?: boolean
  manage_forms?: boolean
}

interface Permission {
  id: keyof AdminPermissions
  nameHe: string
  nameEn: string
  icon: any
  category: string
}


const allPermissions: Permission[] = [
  // Cases Management
  { id: "view_cases", nameHe: "צפייה בתיקים", nameEn: "View Cases", icon: Eye, category: "cases" },
  { id: "edit_cases", nameHe: "עריכת תיקים", nameEn: "Edit Cases", icon: Edit, category: "cases" },
  { id: "delete_cases", nameHe: "מחיקת תיקים", nameEn: "Delete Cases", icon: Trash2, category: "cases" },
  
  // Documents
  { id: "view_documents", nameHe: "צפייה במסמכים", nameEn: "View Documents", icon: FileText, category: "documents" },
  { id: "upload_documents", nameHe: "העלאת מסמכים", nameEn: "Upload Documents", icon: FileText, category: "documents" },
  { id: "delete_documents", nameHe: "מחיקת מסמכים", nameEn: "Delete Documents", icon: Trash2, category: "documents" },
  
  // Users
  { id: "view_users", nameHe: "צפייה במשתמשים", nameEn: "View Users", icon: Users, category: "users" },
  { id: "edit_users", nameHe: "עריכת משתמשים", nameEn: "Edit Users", icon: Edit, category: "users" },
  
  // Reports & Data
  { id: "view_reports", nameHe: "צפייה בדוחות", nameEn: "View Reports", icon: BarChart3, category: "reports" },
  { id: "export_data", nameHe: "ייצוא נתונים", nameEn: "Export Data", icon: Database, category: "reports" },
  
  // Partners
  { id: "manage_partners", nameHe: "ניהול שותפים", nameEn: "Manage Partners", icon: Handshake, category: "partners" },
  
  // Financial
  { id: "view_financial", nameHe: "צפייה בנתונים כספיים", nameEn: "View Financial Data", icon: DollarSign, category: "financial" },
  
  // Communication
  { id: "send_messages", nameHe: "שליחת הודעות", nameEn: "Send Messages", icon: MessageSquare, category: "communication" },
  
  // Forms
  { id: "manage_forms", nameHe: "ניהול טפסים", nameEn: "Manage Forms", icon: FileText, category: "forms" },
]

export default function TeamManagement() {
  const router = useRouter()
  const { language } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingSubAdmin, setIsCreatingSubAdmin] = useState(false)
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([])
  const [isFetchingSubAdmins, setIsFetchingSubAdmins] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<SubAdmin | null>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  })
  const [createPermissions, setCreatePermissions] = useState<AdminPermissions>({})
  const [editPermissions, setEditPermissions] = useState<AdminPermissions>({})

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/admin/login')
          return
        }

        const res: any = await legacyApi.apiMe()
        const role = res?.user?.role || res?.profile?.role || res?.role

        // Only super admin (role === 'admin') can access this page
        if (role !== 'admin') {
          router.push('/admin')
          return
        }

        setIsAdmin(true)
        setIsAuthorized(true)
        fetchSubAdmins()
      } catch (error) {
        console.error('Authorization check failed:', error)
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [router])

  const fetchSubAdmins = async () => {
    setIsFetchingSubAdmins(true)
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/admin/subadmins`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubAdmins(data.subadmins || [])
      }
    } catch (error) {
      console.error('Error fetching subadmins:', error)
    } finally {
      setIsFetchingSubAdmins(false)
    }
  }

  const handleCreateSubAdmin = async () => {
    // Validation
    if (!formData.email) {
      alert('אימייל נדרש')
      return
    }
    
    if (!formData.email.includes('@')) {
      alert('אימייל לא תקין')
      return
    }
    
    if (!formData.full_name) {
      alert('שם מלא נדרש')
      return
    }
    
    if (formData.password && formData.password.length < 6) {
      alert('סיסמה חייבת להיות לפחות 6 תווים')
      return
    }

    setIsCreatingSubAdmin(true)

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/admin/subadmins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          password: formData.password || undefined,
          admin_permissions: createPermissions
        })
      })

      if (response.ok) {
        setShowAddModal(false)
        setFormData({ full_name: "", email: "", phone: "", password: "" })
        setCreatePermissions({})
        fetchSubAdmins()
        alert('תת-מנהל נוצר בהצלחה!')
      } else {
        const error = await response.json()
        const errorMsg = error.detail || 'שגיאה ביצירת תת-מנהל'
        console.error('Error response:', error)
        
        // Provide user-friendly error messages
        let userMessage = errorMsg
        
        // Map error codes to Hebrew messages
        const errorMessages: Record<string, string> = {
          'email_already_exists': 'כתובת האימייל כבר רשומה במערכת',
          'email_already_registered': 'כתובת האימייל כבר רשומה במערכת',
          'missing_email': 'אימייל נדרש',
          'invalid_email_format': 'אימייל לא תקין',
          'password_too_short_min_6_chars': 'סיסמה חייבת להיות לפחות 6 תווים',
          'Failed to create user': 'שגיאה ביצירת משתמש - בדקו את הנתונים שלחם'
        }
        
        // Check if error message matches any known error
        for (const [key, message] of Object.entries(errorMessages)) {
          if (errorMsg.includes(key)) {
            userMessage = message
            break
          }
        }
        
        // Fallback for common patterns
        if (userMessage === errorMsg) {
          if (errorMsg.toLowerCase().includes('password')) {
            userMessage = 'סיסמה לא עומדת בדרישות המינימום'
          } else if (errorMsg.toLowerCase().includes('email')) {
            userMessage = 'אימייל לא תקין או קיים בשימוש'
          }
        }
        
        alert(`שגיאה: ${userMessage}`)
      }
    } catch (error) {
      console.error('Error creating subadmin:', error)
      alert('שגיאה בחיבור לשרת')
    } finally {
      setIsCreatingSubAdmin(false)
    }
  }

  const handleUpdatePermissions = async () => {
    setIsUpdatingPermissions(true)
    if (!selectedSubAdmin) {
      setIsUpdatingPermissions(false)
      return
    }

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/admin/subadmins/${selectedSubAdmin.user_id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ admin_permissions: editPermissions })
      })

      if (response.ok) {
        setShowEditModal(false)
        setSelectedSubAdmin(null)
        fetchSubAdmins()
        alert('הרשאות עודכנו בהצלחה!')
      } else {
        alert('שגיאה בעדכון הרשאות')
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
      alert('שגיאה בעדכון הרשאות')
    } finally {
      setIsUpdatingPermissions(false)
    }
  }

  const handleDeleteSubAdmin = async (userId: string, email: string) => {
    // Only super admin can delete
    if (!isAdmin) {
      alert('רק מנהל מערכת יכול למחוק תת-מנהלים')
      return
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${email}?`)) return

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/admin/subadmins/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (response.ok) {
        fetchSubAdmins()
        alert('תת-מנהל נמחק בהצלחה!')
      } else {
        alert('שגיאה במחיקת תת-מנהל')
      }
    } catch (error) {
      console.error('Error deleting subadmin:', error)
      alert('שגיאה בחיבור לשרת')
    }
  }

  const openEditModal = (subAdmin: SubAdmin) => {
    setSelectedSubAdmin(subAdmin)
    setEditPermissions(subAdmin.admin_permissions || {})
    setShowEditModal(true)
  }

  const togglePermission = (permissionId: keyof AdminPermissions) => {
    setEditPermissions(prev => ({
      ...prev,
      [permissionId]: !prev[permissionId]
    }))
  }

  const toggleCreatePermission = (permissionId: keyof AdminPermissions) => {
    setCreatePermissions(prev => ({
      ...prev,
      [permissionId]: !prev[permissionId]
    }))
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

  const categorizedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = []
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Skeleton Loading Component
  const SkeletonLoader = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
          className="p-4 border border-slate-200 rounded-lg bg-slate-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-slate-300 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-slate-300 rounded w-32 mb-2" />
                <div className="h-3 bg-slate-300 rounded w-48 mb-2" />
                <div className="h-3 bg-slate-300 rounded w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 bg-slate-300 rounded px-3 w-16" />
              <div className="h-8 bg-slate-300 rounded w-24" />
              <div className="h-8 bg-slate-300 rounded w-8" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50" dir={dir}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl">
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-400" />
              <span>ZeroTouch Admin</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">{language === "he" ? "מרכז בקרה" : "Control Center"}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                <Home className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                {language === "he" ? "לוח בקרה" : "Dashboard"}
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800 bg-slate-800">
              <Users className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
              {language === "he" ? "ניהול צוות" : "Team Management"}
            </Button>
            <Link href="/admin/qa-submission">
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                <ShieldCheck className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                {language === "he" ? "קונסולת QA" : "QA Console"}
              </Button>
            </Link>
            <Link href="/admin/advanced-filters">
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                <Filter className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                {language === "he" ? "סינון מתקדם" : "Advanced Filters"}
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                <BarChart3 className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                {language === "he" ? "אנליטיקס" : "Analytics"}
              </Button>
            </Link>
            <Link href="/admin/prompts">
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                <Zap className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                {language === "he" ? "AI Prompts" : "AI Prompts"}
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                <Settings className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                {language === "he" ? "הגדרות" : "Settings"}
              </Button>
            </Link>
          </nav>

          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">{language === "he" ? "מנ" : "SA"}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{language === "he" ? "מנהל מערכת" : "Super Admin"}</p>
                <p className="text-xs text-slate-400">admin@zerotouch.co.il</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-red-400 hover:bg-slate-800">
              <LogOut className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
              {language === "he" ? "יציאה" : "Logout"}
            </Button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {language === "he" ? "ניהול צוות והרשאות" : "Team & Access Control"}
              </h2>
              <p className="text-sm text-slate-600">
                {language === "he" ? "הגדרת הרשאות וניהול גישות לצוות" : "Configure permissions and manage team access"}
              </p>
            </div>
          </div>

          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 ml-2" />
            הוסף תת-מנהל
          </Button>
        </header>

        <ScrollArea className="flex-1 p-6" style={{overflow:"scroll"}}>
          {/* SubAdmins List */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">תת-מנהלים במערכת</h3>
              
              {isFetchingSubAdmins ? (
                <SkeletonLoader />
              ) : subAdmins.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>אין תת-מנהלים במערכת</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subAdmins.map((subAdmin) => (
                    <motion.div
                      key={subAdmin.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Shield className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{subAdmin.full_name}</p>
                            <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {subAdmin.email}
                              </span>
                              {subAdmin.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {subAdmin.phone}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              נוצר ב: {new Date(subAdmin.created_at).toLocaleDateString('he-IL')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700">תת-מנהל</Badge>
                          {isAdmin && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openEditModal(subAdmin)}
                              >
                                <Edit className="w-4 h-4 ml-2" />
                                ערוך הרשאות
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteSubAdmin(subAdmin.user_id, subAdmin.email)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Permissions Reference */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">מטריצת הרשאות זמינות</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(categorizedPermissions).map(([category, perms]) => (
                <div key={category} className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2 capitalize">{category}</h4>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <perm.icon className="w-4 h-4" />
                        <span>{perm.nameHe}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </ScrollArea>
      </div>

      {/* Add SubAdmin Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto z-50"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">הוסף תת-מנהל חדש</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="border-b border-slate-200 pb-6">
                  <h4 className="font-semibold text-slate-900 mb-4">פרטים בסיסיים</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">שם מלא</label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="הזן שם מלא"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">אימייל</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="הזן כתובת אימייל"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">טלפון (אופציונלי)</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="הזן מספר טלפון"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">סיסמה</label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="הזן סיסמה"
                      />
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4">הרשאות</h4>
                  <div className="space-y-4">
                    {Object.entries(categorizedPermissions).map(([category, perms]) => (
                      <div key={category} className="border border-slate-200 rounded-lg p-4">
                        <h5 className="font-semibold text-slate-900 mb-3 capitalize">{category}</h5>
                        <div className="space-y-3">
                          {perms.map((perm) => (
                            <div key={perm.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <perm.icon className="w-4 h-4 text-slate-600" />
                                <span className="text-sm text-slate-700">{perm.nameHe}</span>
                              </div>
                              <Checkbox
                                checked={createPermissions[perm.id] || false}
                                onCheckedChange={() => toggleCreatePermission(perm.id)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)} 
                  className="flex-1"
                  disabled={isCreatingSubAdmin}
                >
                  ביטול
                </Button>
                <Button 
                  onClick={handleCreateSubAdmin} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isCreatingSubAdmin}
                >
                  {isCreatingSubAdmin ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
                      <span>יוצר...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      <span>צור תת-מנהל</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {showEditModal && selectedSubAdmin && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto z-50"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">ערוך הרשאות</h3>
                  <p className="text-sm text-slate-600">{selectedSubAdmin.full_name}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {Object.entries(categorizedPermissions).map(([category, perms]) => (
                  <div key={category} className="border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3 capitalize">{category}</h4>
                    <div className="space-y-3">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <perm.icon className="w-4 h-4 text-slate-600" />
                            <span className="text-sm text-slate-700">{perm.nameHe}</span>
                          </div>
                          <Checkbox
                            checked={editPermissions[perm.id] || false}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)} 
                  className="flex-1"
                  disabled={isUpdatingPermissions}
                >
                  ביטול
                </Button>
                <Button 
                  onClick={handleUpdatePermissions} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isUpdatingPermissions}
                >
                  {isUpdatingPermissions ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
                      <span>משנה...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      <span>שמור שינויים</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
