"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import * as legacyApi from "@/lib/api"
import { Button } from "./ui/button"

export default function AccountControls() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setLoggedIn(!!token)
    const onStorage = () => setLoggedIn(!!localStorage.getItem('access_token'))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleLogout = async () => {
    const token = localStorage.getItem('access_token')
    setLoading(true)
    try {
      if (token) {
        try {
          await legacyApi.apiLogout(token)
        } catch (e) {
          // ignore API logout errors
          console.warn('apiLogout failed', e)
        }
      }
    } finally {
      localStorage.removeItem('access_token')
      setLoading(false)
      setLoggedIn(false)
      // navigate to home
      router.push('/')
      // broadcast to other tabs
      try { window.dispatchEvent(new Event('storage')) } catch (e) {}
    }
  }

  // Hide floating logout in admin pages (now handled by sidebar)
  // Only show if definitely logged in and not in admin
  if (!loggedIn || pathname?.startsWith('/admin')) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
        {loading ? 'Logging out…' : 'Logout'}
      </Button>
    </div>
  )
}
