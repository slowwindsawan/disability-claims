"use client"

import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider, useLanguage } from "@/lib/language-context"
import { UserProvider } from "@/lib/user-context"
import { Heebo } from "next/font/google" // Assuming Heebo font is still needed here
import AccountControls from "@/components/account-controls"
import { Toaster } from "@/components/ui/toaster"
import CompleteDetailsNotice from '@/components/complete-details-notice'
import { useEffect, useState } from "react"

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["300", "400", "500", "600", "700"] })

// Inner component that uses the language context
function LayoutInnerComponent({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const isRTL = language === "he"
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <html lang={isMounted && isRTL ? "he" : "en"} dir={isMounted ? (isRTL ? "rtl" : "ltr") : "ltr"}>
      <head>
        <title>ZeroTouch Claims | Your Compensation. Maximized.</title>
        <meta name="description" content="AI system that replaces a lawyer" />
        <meta name="generator" content="v0.app" />
      </head>
      <body className={`${heebo.className} font-sans antialiased`}>
        {children}
        <CompleteDetailsNotice />
        <AccountControls />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}

// This component now wraps the providers and the actual layout content
export function LayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <UserProvider>
        <LayoutInnerComponent>{children}</LayoutInnerComponent>
      </UserProvider>
    </LanguageProvider>
  )
}
