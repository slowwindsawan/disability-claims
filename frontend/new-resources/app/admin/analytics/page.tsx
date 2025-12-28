"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Users, DollarSign, Clock, CheckCircle2, BarChart3 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30days")

  const metrics = [
    { label: "תיקים חדשים", value: "142", change: "+12%", trend: "up", icon: Users, color: "blue" },
    { label: "שיעור המרה", value: "68%", change: "+5%", trend: "up", icon: TrendingUp, color: "green" },
    { label: "זמן טיפול ממוצע", value: "18 יום", change: "-3 ימים", trend: "up", icon: Clock, color: "purple" },
    { label: "הכנסות צפויות", value: "₪1.2M", change: "+18%", trend: "up", icon: DollarSign, color: "emerald" },
  ]

  const stageMetrics = [
    { stage: "שאלון ראשוני", count: 45, percentage: 32, color: "bg-blue-500" },
    { stage: "איסוף מסמכים", count: 38, percentage: 27, color: "bg-amber-500" },
    { stage: "בוועדה", count: 31, percentage: 22, color: "bg-purple-500" },
    { stage: "אושר", count: 19, percentage: 13, color: "bg-green-500" },
    { stage: "נדחה", count: 9, percentage: 6, color: "bg-red-500" },
  ]

  const topPerformers = [
    { name: "סוג תביעה: נכות כללית", claims: 87, success: 92 },
    { name: "סוג תביעה: שיקום מקצועי", claims: 54, success: 85 },
    { name: "סוג תביעה: נכות עבודה", claims: 41, success: 78 },
  ]

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">אנליטיקס ודוחות</h2>
            <p className="text-sm text-slate-600">מעקב אחר ביצועים ומגמות</p>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 ימים אחרונים</SelectItem>
              <SelectItem value="30days">30 ימים אחרונים</SelectItem>
              <SelectItem value="90days">90 ימים אחרונים</SelectItem>
              <SelectItem value="year">שנה אחרונה</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
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
                <Card className={`p-6 bg-gradient-to-br ${colorClasses[metric.color]} text-white shadow-lg`}>
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="w-8 h-8 opacity-80" />
                    <span className="text-3xl font-bold">{metric.value}</span>
                  </div>
                  <p className="text-sm opacity-90 mb-2">{metric.label}</p>
                  <div className="flex items-center gap-1 text-sm">
                    {metric.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{metric.change}</span>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Stage Funnel */}
          <Card className="col-span-2 p-6 bg-white shadow-md">
            <h3 className="text-lg font-bold text-slate-900 mb-6">משפך המרה</h3>
            <div className="space-y-4">
              {stageMetrics.map((stage, index) => (
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
              ))}
            </div>
          </Card>

          {/* Top Performers */}
          <Card className="p-6 bg-white shadow-md">
            <h3 className="text-lg font-bold text-slate-900 mb-6">סוגי תביעות מובילים</h3>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
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
              ))}
            </div>
          </Card>
        </div>

        {/* Weekly Trend Chart Placeholder */}
        <Card className="p-6 bg-white shadow-md">
          <h3 className="text-lg font-bold text-slate-900 mb-6">מגמות שבועיות</h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <div className="text-center text-slate-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p>גרף מגמות - להטמעה עם ספריית charts</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
