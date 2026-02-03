"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { performLogout } from "@/components/account-controls"
import { useLanguage } from "@/lib/language-context"

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showIcon?: boolean
}

export function LogoutButton({
  variant = "outline",
  size = "default",
  className = "",
  showIcon = true
}: LogoutButtonProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const isRTL = language === "he"
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await performLogout(router)
    } catch (err) {
      console.error("Logout error:", err)
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
    >
      {showIcon && <LogOut size={18} className={isRTL ? "ml-2" : "mr-2"} />}
      {loading ? (isRTL ? "יציאה..." : "Logging out...") : (isRTL ? "יציאה" : "Logout")}
    </Button>
  )
}
