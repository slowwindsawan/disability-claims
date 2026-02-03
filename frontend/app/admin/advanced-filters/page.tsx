"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Filter, X, Save, Plus, Trash2, Menu, Home, BarChart3, Settings, LogOut, Activity, Users, ShieldCheck, AlertCircle } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface SavedFilter {
  criteria: any
  created_at: string
  updated_at: string
}

interface FilteredCase {
  case_id: string
  client_name: string
  status: string
  ai_score: number
  estimated_claim_amount: number
}

const CASE_STATUS_VALUES = [
  "Initial questionnaire",
  "Document submission",
  "Submission pending",
  "Submitted"
]

export default function AdvancedFiltersPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [savedFilters, setSavedFilters] = useState<Record<string, SavedFilter>>({})
  const [filterName, setFilterName] = useState("")
  const [status, setStatus] = useState<string>("")
  const [minAiScore, setMinAiScore] = useState("")
  const [maxAiScore, setMaxAiScore] = useState("")
  const [minPotential, setMinPotential] = useState("")
  const [maxPotential, setMaxPotential] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredCases, setFilteredCases] = useState<FilteredCase[]>([])
  const [isApplyingFilter, setIsApplyingFilter] = useState(false)
  const [isSavingFilter, setIsSavingFilter] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/admin/login')
          return
        }

        const res: any = await legacyApi.apiMe()
        if (!res) {
          router.push('/admin/login')
          return
        }

        const role = res?.user?.role || res?.profile?.role || res?.role

        if (role !== 'admin' && role !== 'subadmin') {
          router.push('/admin/login')
          return
        }

        setIsAuthorized(true)
        fetchSavedFilters()
      } catch (error) {
        console.error('Authorization check failed:', error)
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [router])

  const fetchSavedFilters = async () => {
    try {
      const response = await fetch('/api/admin/filters', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSavedFilters(data.data || {})
      }
    } catch (err) {
      console.error('Error fetching saved filters:', err)
    }
  }

  const applyFilter = async () => {
    setError("")
    setSuccessMessage("")
    setIsApplyingFilter(true)

    try {
      const payload = {
        status: status && status !== "all" ? [status] : undefined,
        min_ai_score: minAiScore ? parseInt(minAiScore) : null,
        max_ai_score: maxAiScore ? parseInt(maxAiScore) : null,
        min_income_potential: minPotential ? parseFloat(minPotential) : null,
        max_income_potential: maxPotential ? parseFloat(maxPotential) : null,
        start_date: dateFrom || null,
        end_date: dateTo || null,
        search_query: searchQuery || undefined,
        limit: 200,
        offset: 0,
      }

      const response = await fetch('/api/admin/cases/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setFilteredCases(data.data || [])
        setSuccessMessage(`נמצאו ${data.total || 0} תיקים`)
      } else {
        setError('שגיאה בהפעלת הסינון')
      }
    } catch (err) {
      console.error('Error applying filter:', err)
      setError('שגיאה בהפעלת הסינון')
    } finally {
      setIsApplyingFilter(false)
    }
  }

  const saveFilter = async () => {
    if (!filterName.trim()) {
      setError("הזן שם לסינון")
      return
    }

    setError("")
    setSuccessMessage("")
    setIsSavingFilter(true)

    try {
      const criteria = {
        status: status && status !== "all" ? [status] : undefined,
        min_ai_score: minAiScore ? parseInt(minAiScore) : null,
        max_ai_score: maxAiScore ? parseInt(maxAiScore) : null,
        min_income_potential: minPotential ? parseFloat(minPotential) : null,
        max_income_potential: maxPotential ? parseFloat(maxPotential) : null,
        start_date: dateFrom || null,
        end_date: dateTo || null,
        search_query: searchQuery || null,
      }

      const formData = new FormData()
      formData.append('filter_name', filterName)
      formData.append('filter_data', JSON.stringify(criteria))

      const response = await fetch('/api/admin/filters', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (response.ok) {
        setSuccessMessage(`סינון "${filterName}" נשמר בהצלחה`)
        setFilterName("")
        await fetchSavedFilters()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.detail || 'שגיאה בשמירת הסינון')
      }
    } catch (err) {
      console.error('Error saving filter:', err)
      setError('שגיאה בשמירת הסינון')
    } finally {
      setIsSavingFilter(false)
    }
  }

  const deleteFilter = async (name: string) => {
    try {
      const response = await fetch(`/api/admin/filters/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setSuccessMessage(`סינון "${name}" נמחק בהצלחה`)
        await fetchSavedFilters()
      } else {
        setError('שגיאה במחיקת הסינון')
      }
    } catch (err) {
      console.error('Error deleting filter:', err)
      setError('שגיאה במחיקת הסינון')
    }
  }

  const resetFilters = () => {
    setStatus("")
    setMinAiScore("")
    setMaxAiScore("")
    setMinPotential("")
    setMaxPotential("")
    setDateFrom("")
    setDateTo("")
    setSearchQuery("")
    setFilteredCases([])
    setError("")
    setSuccessMessage("")
  }

  return (
    <>
      {isLoading && (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">טוען...</p>
          </div>
        </div>
      )}

      {!isLoading && !isAuthorized && (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-600">ממתין להורשה...</p>
        </div>
      )}

      {!isLoading && isAuthorized && (
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
            <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800 bg-slate-800">
              <Filter className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
              סינון מתקדם
            </Button>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">סינון מתקדם</h2>
              <p className="text-sm text-slate-600">צור סינונים מותאמים אישית למעקב אחר תיקים</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Filter Builder */}
            <div className="col-span-2 space-y-6">
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  בונה סינונים
                </h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
                    {successMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status Dropdown */}
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">סטטוס תיק</label>
                      <select 
                        value={status || "all"} 
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">כל הסטטוסים</option>
                        {CASE_STATUS_VALUES.map((statusValue) => (
                          <option key={statusValue} value={statusValue}>
                            {statusValue}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">ציון AI - מינימום</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={minAiScore}
                        onChange={(e) => setMinAiScore(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">ציון AI - מקסימום</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="100"
                        value={maxAiScore}
                        onChange={(e) => setMaxAiScore(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">פוטנציאל הכנסות - מינימום</label>
                      <Input
                        type="number"
                        placeholder="₪"
                        value={minPotential}
                        onChange={(e) => setMinPotential(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">פוטנציאל הכנסות - מקסימום</label>
                      <Input
                        type="number"
                        placeholder="₪"
                        value={maxPotential}
                        onChange={(e) => setMaxPotential(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">תאריך התחלה</label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">חיפוש לפי שם או אימייל</label>
                      <Input
                        type="text"
                        placeholder="הזן שם או אימייל"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={applyFilter}
                      disabled={isApplyingFilter}
                    >
                      <Search className="w-4 h-4 ml-2" />
                      {isApplyingFilter ? "מחפש..." : "הפעל סינון"}
                    </Button>
                    <Button variant="outline" onClick={resetFilters}>
                      <X className="w-4 h-4 ml-2" />
                      נקה הכל
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Results Preview */}
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">תוצאות ({filteredCases.length})</h3>
                {filteredCases.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Filter className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>הפעל סינון כדי לראות תוצאות</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredCases.map((caseData) => (
                      <div
                        key={caseData.case_id}
                        className="p-3 border border-slate-200 rounded hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{caseData.client_name}</h4>
                            <p className="text-xs text-slate-500">מזהה: {caseData.case_id}</p>
                            <p className="text-xs text-slate-600 mt-1">סטטוס: {caseData.status}</p>
                          </div>
                          <div className="text-left ml-4">
                            <p className="text-sm font-semibold text-slate-900">ציון AI: {caseData.ai_score}%</p>
                            <p className="text-sm text-green-600">₪{caseData.estimated_claim_amount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Saved Filters */}
            <div className="space-y-6">
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Save className="w-5 h-5 text-green-600" />
                  שמור סינון
                </h3>

                <div className="space-y-3">
                  <Input
                    placeholder="שם הסינון"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                  />
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={saveFilter}
                    disabled={isSavingFilter}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    {isSavingFilter ? "שומר..." : "שמור סינון נוכחי"}
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">סינונים שמורים ({Object.keys(savedFilters).length})</h3>

                {Object.keys(savedFilters).length === 0 ? (
                  <p className="text-center text-slate-500 py-6">אין סינונים שמורים עדיין</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(savedFilters).map(([filterNameKey, filterData]) => (
                      <motion.div
                        key={filterNameKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-sm">{filterNameKey}</h4>
                            <p className="text-xs text-slate-500 mt-2">
                              נוצר: {new Date(filterData.created_at).toLocaleDateString('he-IL')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => deleteFilter(filterNameKey)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
        </div>
      )}
    </>
  )
}
