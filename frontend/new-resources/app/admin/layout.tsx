"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import { Menu, Home, Users, Filter, BarChart3, Settings, LogOut, Activity, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userEmail, setUserEmail] = useState<string>("")
  const [logoutLoading, setLogoutLoading] = useState(false)
  const { language } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const dir = language === "he" ? "rtl" : "ltr"

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await legacyApi.apiGetProfile()
        if (profile?.email) {
          setUserEmail(profile.email)
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    }
    fetchUserProfile()
  }, [])

  const handleLogout = async () => {
    const token = localStorage.getItem('access_token')
    setLogoutLoading(true)
    try {
      if (token) {
        try {
          await legacyApi.apiLogout(token)
        } catch (e) {
          console.warn('apiLogout failed', e)
        }
      }
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('case_id')
      localStorage.removeItem('vapi_call_id')
      localStorage.removeItem('call_summary')
      setLogoutLoading(false)
      router.push('/')
      try { window.dispatchEvent(new Event('storage')) } catch (e) {}
    }
  }

  const navItems = [
    {
      href: "/admin",
      icon: Home,
      labelHe: "לוח בקרה",
      labelEn: "Dashboard",
    },
    {
      href: "/admin/team",
      icon: Users,
      labelHe: "ניהול צוות",
      labelEn: "Team Management",
    },
    {
      href: "/admin/qa-submission",
      icon: ShieldCheck,
      labelHe: "קונסולת QA והגשה",
      labelEn: "QA & Submission Console",
    },
    {
      href: "/admin/advanced-filters",
      icon: Filter,
      labelHe: "סינון מתקדם",
      labelEn: "Advanced Filters",
    },
    {
      href: "/admin/analytics",
      icon: BarChart3,
      labelHe: "אנליטיקס",
      labelEn: "Analytics",
    },
  ]

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin"
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-slate-50" dir={dir}>
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: dir === "rtl" ? 300 : -300 }}
            animate={{ x: 0 }}
            exit={{ x: dir === "rtl" ? 300 : -300 }}
            className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-slate-700">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-400" />
                <span>ZeroTouch Admin</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">{language === "he" ? "מרכז בקרה" : "Control Center"}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${
                        active ? "text-white bg-slate-800" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                      {language === "he" ? item.labelHe : item.labelEn}
                    </Button>
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">{language === "he" ? "מנ" : "SA"}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{language === "he" ? "מנהל מערכת" : "Super Admin"}</p>
                  <p className="text-xs text-slate-400">{userEmail || "Loading..."}</p>
                </div>
              </div>
              <Button onClick={handleLogout} disabled={logoutLoading} variant="ghost" className="w-full justify-start text-red-400 hover:bg-slate-800 disabled:opacity-50">
                <LogOut className={`w-5 h-5 ${language === "he" ? "ml-3" : "mr-3"}`} />
                {logoutLoading ? (language === "he" ? "יוצא..." : "Logging out...") : (language === "he" ? "יציאה" : "Logout")}
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toggle Button (Fixed) */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  )
}
