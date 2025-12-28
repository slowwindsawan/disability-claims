"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import {
  SettingsIcon,
  Bell,
  Shield,
  Users,
  Zap,
  Database,
  Mail,
  Menu,
  Home,
  Filter,
  BarChart3,
  LogOut,
  Activity,
  Save,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function SettingsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [autoAssign, setAutoAssign] = useState(true)
  const [twoFactor, setTwoFactor] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/')
          return
        }

        const res: any = await legacyApi.apiMe()
        const role = res?.user?.role || res?.profile?.role || res?.role

        if (role !== 'admin' && role !== 'subadmin') {
          router.push('/')
          return
        }

        setIsAuthorized(true)
      } catch (error) {
        console.error('Authorization check failed:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [router])

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

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex h-screen bg-slate-50" dir="rtl">
      {/* Sidebar */}
      {sidebarOpen && (
        <motion.aside
          initial={{ x: 300 }}
          animate={{ x: 0 }}
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
            <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800 bg-slate-800">
              <SettingsIcon className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
              הגדרות
            </Button>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">הגדרות מערכת</h2>
                <p className="text-sm text-slate-600">ניהול תצורה ואבטחה</p>
              </div>
            </div>

            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  נשמר
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="general">כללי</TabsTrigger>
              <TabsTrigger value="notifications">התראות</TabsTrigger>
              <TabsTrigger value="security">אבטחה</TabsTrigger>
              <TabsTrigger value="automation">אוטומציה</TabsTrigger>
              <TabsTrigger value="integrations">אינטגרציות</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-blue-600" />
                  הגדרות כלליות
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">שם החברה</label>
                    <Input defaultValue="ZeroTouch Claims Ltd." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">מספר רישיון עריכת דין</label>
                    <Input defaultValue="123456789" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">אימייל תמיכה</label>
                    <Input defaultValue="support@zerotouch.co.il" type="email" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">טלפון משרד</label>
                    <Input defaultValue="03-1234567" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">כתובת משרד</h3>
                <Textarea
                  rows={4}
                  defaultValue="רחוב הרצל 123&#10;תל אביב-יפו, 6801234&#10;ישראל"
                  className="resize-none"
                />
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  הגדרות התראות
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">התראות דוא"ל</p>
                      <p className="text-sm text-slate-600">קבל עדכונים באימייל על תיקים חדשים</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">התראות SMS</p>
                      <p className="text-sm text-slate-600">קבל הודעות SMS על תיקים קריטיים</p>
                    </div>
                    <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-sm font-medium text-slate-700 mb-2 block">תדירות דיווח שבועי</label>
                    <Input type="email" placeholder="admin@example.com" />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Security */}
            <TabsContent value="security" className="space-y-6">
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  אבטחה והרשאות
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">אימות דו-שלבי (2FA)</p>
                      <p className="text-sm text-slate-600">הגן על החשבון עם אימות נוסף</p>
                    </div>
                    <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-sm font-medium text-slate-700 mb-2 block">הרשאות ניהול</label>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-slate-600" />
                        <span className="text-sm text-slate-700">5 משתמשים פעילים</span>
                      </div>
                      <Button variant="outline" size="sm">
                        נהל הרשאות משתמשים
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Automation */}
            <TabsContent value="automation" className="space-y-6">
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  אוטומציות
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">שיבוץ אוטומטי לעורכי דין</p>
                      <p className="text-sm text-slate-600">שבץ תיקים חדשים לפי עומס עבודה</p>
                    </div>
                    <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      תזכורות אוטומטיות למסמכים חסרים
                    </label>
                    <Input type="number" defaultValue="3" className="w-32" />
                    <p className="text-xs text-slate-500 mt-1">ימים לפני שליחת תזכורת</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Integrations */}
            <TabsContent value="integrations" className="space-y-6">
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  אינטגרציות חיצוניות
                </h3>
                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">SendGrid Email API</p>
                        <p className="text-sm text-slate-600">שליחת אימיילים ללקוחות</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      מחובר
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Supabase Database</p>
                        <p className="text-sm text-slate-600">מסד נתונים ראשי</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      מחובר
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full bg-transparent">
                    <Database className="w-4 h-4 ml-2" />
                    הוסף אינטגרציה חדשה
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
