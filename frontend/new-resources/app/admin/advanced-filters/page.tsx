"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, X, Save, Plus, Trash2, Menu, Home, BarChart3, Settings, LogOut, Activity } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface SavedFilter {
  id: string
  name: string
  criteria: string
  count: number
}

const mockSavedFilters: SavedFilter[] = [
  { id: "1", name: "תיקים תקועים +7 ימים", criteria: "status: stuck, days > 7", count: 12 },
  { id: "2", name: "ציון AI גבוה (>80)", criteria: "ai_score > 80", count: 34 },
  { id: "3", name: "פוטנציאל הכנסות גבוה", criteria: "potential > 15000", count: 18 },
]

export default function AdvancedFiltersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [savedFilters, setSavedFilters] = useState(mockSavedFilters)
  const [filterName, setFilterName] = useState("")
  const [status, setStatus] = useState("")
  const [minAiScore, setMinAiScore] = useState("")
  const [minPotential, setMinPotential] = useState("")
  const [daysStuck, setDaysStuck] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const handleSaveFilter = () => {
    if (!filterName) return
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      criteria: `status: ${status || "any"}, ai_score > ${minAiScore || "0"}`,
      count: Math.floor(Math.random() * 50),
    }
    setSavedFilters([...savedFilters, newFilter])
    setFilterName("")
  }

  const handleDeleteFilter = (id: string) => {
    setSavedFilters(savedFilters.filter((f) => f.id !== id))
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
                <Home className="w-5 h-5 ml-3" />
                לוח בקרה
              </Button>
            </Link>
            <Link href="/admin/advanced-filters">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800 bg-slate-800">
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

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">סטטוס תיק</label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סטטוס" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">חדש</SelectItem>
                          <SelectItem value="document_collection">איסוף מסמכים</SelectItem>
                          <SelectItem value="committee">בוועדה</SelectItem>
                          <SelectItem value="approved">אושר</SelectItem>
                          <SelectItem value="rejected">נדחה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">ציון AI מינימלי</label>
                      <Input
                        type="number"
                        placeholder="0-100"
                        value={minAiScore}
                        onChange={(e) => setMinAiScore(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">פוטנציאל הכנסות מינימלי</label>
                      <Input
                        type="number"
                        placeholder="₪"
                        value={minPotential}
                        onChange={(e) => setMinPotential(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">תקוע למעלה מ-</label>
                      <Input
                        type="number"
                        placeholder="ימים"
                        value={daysStuck}
                        onChange={(e) => setDaysStuck(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">תאריך התחלה</label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">תאריך סיום</label>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Search className="w-4 h-4 ml-2" />
                      הפעל סינון
                    </Button>
                    <Button variant="outline">
                      <X className="w-4 h-4 ml-2" />
                      נקה הכל
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Results Preview */}
              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">תוצאות תצוגה מקדימה</h3>
                <div className="text-center py-12 text-slate-500">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>הפעל סינון כדי לראות תוצאות</p>
                </div>
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
                  <Input placeholder="שם הסינון" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSaveFilter}>
                    <Plus className="w-4 h-4 ml-2" />
                    שמור סינון נוכחי
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-white shadow-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">סינונים שמורים</h3>

                <div className="space-y-3">
                  {savedFilters.map((filter) => (
                    <motion.div
                      key={filter.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 text-sm">{filter.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">{filter.criteria}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteFilter(filter.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{filter.count} תיקים</Badge>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
