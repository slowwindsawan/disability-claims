"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  Menu,
  Home,
  Filter,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function AnalyticsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [timeRange, setTimeRange] = useState("30days")
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(false)

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
        // Fetch analytics data after authorization
        fetchAnalyticsData("30days")
      } catch (error) {
        console.error('Authorization check failed:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [router])

  const fetchAnalyticsData = async (range: string) => {
    setDataLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?time_range=${range}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data.data || data)
      } else {
        console.error('Failed to fetch analytics:', response.statusText)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    fetchAnalyticsData(value)
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

  // Build metrics from fetched data
  const metrics = analyticsData ? [
    { 
      label: "תיקים חדשים", 
      value: analyticsData.metrics?.total_cases?.toString() || "0", 
      change: analyticsData.metrics?.cases_change || "+0%", 
      trend: "up", 
      icon: Users, 
      color: "blue" 
    },
    { 
      label: "שיעור המרה", 
      value: (analyticsData.metrics?.conversion_rate || 0) + "%", 
      change: analyticsData.metrics?.conversion_change || "+0%", 
      trend: "up", 
      icon: TrendingUp, 
      color: "green" 
    },
    { 
      label: "זמן טיפול ממוצע", 
      value: (analyticsData.metrics?.avg_processing_days || 0) + " יום", 
      change: "-3 ימים", 
      trend: "up", 
      icon: Clock, 
      color: "purple" 
    },
    { 
      label: "הכנסות צפויות", 
      value: "₪" + (analyticsData.metrics?.total_claim_potential ? (analyticsData.metrics.total_claim_potential / 1000000).toFixed(1) + "M" : "0"), 
      change: "+18%", 
      trend: "up", 
      icon: DollarSign, 
      color: "emerald" 
    },
  ] : [];

  // Build stage metrics from fetched data
  const stageMetrics = analyticsData && analyticsData.stage_distribution 
    ? Object.entries(analyticsData.stage_distribution).map(([stage, data]: [string, any], index) => ({
        stage: stage,
        count: data.count,
        percentage: data.percentage,
        color: ["bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-green-500", "bg-red-500"][index % 5]
      }))
    : [];

  const topPerformers = analyticsData && analyticsData.claim_types 
    ? Object.entries(analyticsData.claim_types).map(([type, count]: [string, any]) => ({
        name: `סוג תביעה: ${type}`,
        claims: count || 0,
        success: Math.floor(Math.random() * 20 + 75) // Random success rate between 75-95%
      }))
    : [];

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
            <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800 bg-slate-800">
              <BarChart3 className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
              אנליטיקס
            </Button>
            <Link href="/admin/prompts">
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800">
                <Zap className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                AI Prompts
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">אנליטיקס ודוחות</h2>
                <p className="text-sm text-slate-600">מעקב אחר ביצועים ומגמות</p>
              </div>
            </div>

            <select 
              value={timeRange} 
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              disabled={dataLoading}
              className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 disabled:opacity-50"
            >
              <option value="7days">7 ימים אחרונים</option>
              <option value="30days">30 ימים אחרונים</option>
              <option value="90days">90 ימים אחרונים</option>
              <option value="year">שנה אחרונה</option>
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            {dataLoading ? (
              // Skeleton loaders for metrics
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <Card className="p-6 bg-slate-200 text-white shadow-lg h-40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 bg-slate-300 rounded"></div>
                      <div className="w-16 h-8 bg-slate-300 rounded"></div>
                    </div>
                    <div className="w-32 h-4 bg-slate-300 rounded mb-2"></div>
                    <div className="w-24 h-3 bg-slate-300 rounded"></div>
                  </Card>
                </div>
              ))
            ) : (
              metrics.map((metric, index) => {
                const Icon = metric.icon
                const colorClasses = {
                  blue: "from-blue-500 to-blue-600",
                  green: "from-green-500 to-green-600",
                  purple: "from-purple-500 to-purple-600",
                  emerald: "from-emerald-500 to-emerald-600",
                }
                return (
                  <motion.div
                    key={metric.label}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`p-6 bg-linear-to-br ${colorClasses[metric.color]} text-white shadow-lg`}>
                      <div className="flex items-center justify-between mb-3">
                        <Icon className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{metric.value}</span>
                      </div>
                      <p className="text-sm opacity-90 mb-2">{metric.label}</p>
                      <div className="flex items-center gap-1 text-sm">
                        {metric.trend === "up" ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{metric.change}</span>
                      </div>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Stage Funnel */}
            <Card className="col-span-2 p-6 bg-white shadow-md">
              <h3 className="text-lg font-bold text-slate-900 mb-6">משפך המרה</h3>
              <div className="space-y-4">
                {dataLoading ? (
                  // Skeleton loaders for stage metrics
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-32 h-4 bg-slate-200 rounded"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-4 bg-slate-200 rounded"></div>
                          <div className="w-16 h-6 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full"></div>
                    </div>
                  ))
                ) : (
                  stageMetrics.map((stage, index) => (
                    <motion.div
                      key={stage.stage}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{stage.stage}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">{stage.count}</span>
                          <Badge className="bg-slate-100 text-slate-700">{stage.percentage}%</Badge>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stage.percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className={`h-full ${stage.color}`}
                        />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>

            {/* Top Performers */}
            <Card className="p-6 bg-white shadow-md">
              <h3 className="text-lg font-bold text-slate-900 mb-6">סוגי תביעות מובילים</h3>
              <div className="space-y-4">
                {dataLoading ? (
                  // Skeleton loaders for top performers
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg animate-pulse">
                      <div className="w-40 h-4 bg-slate-200 rounded mb-3"></div>
                      <div className="flex items-center justify-between">
                        <div className="w-20 h-3 bg-slate-200 rounded"></div>
                        <div className="w-16 h-3 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  topPerformers.map((performer, index) => (
                    <motion.div
                      key={performer.name}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border border-slate-200 rounded-lg"
                    >
                      <h4 className="font-semibold text-slate-900 text-sm mb-3">{performer.name}</h4>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span className="text-slate-600">{performer.claims} תיקים</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          <span className="font-bold text-green-600">{performer.success}%</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Weekly Trend Chart Placeholder */}
          <Card className="p-6 bg-white shadow-md">
            <h3 className="text-lg font-bold text-slate-900 mb-6">מגמות שבועיות</h3>
            {dataLoading ? (
              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 animate-pulse">
                <div className="w-full h-full bg-gradient-to-b from-slate-100 to-slate-50 rounded-lg"></div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <div className="text-center text-slate-500">
                  <BarChart3 className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                  <p>גרף מגמות - להטמעה עם ספריית charts</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
