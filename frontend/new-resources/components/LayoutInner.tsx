"use client"

import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider, useLanguage } from "@/lib/language-context"
import { UserProvider } from "@/lib/user-context"
import { Heebo } from "next/font/google"
import { DevNavPanel } from "@/components/dev-nav-panel"
import { GlobalHeader } from "@/components/global-header"

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["300", "400", "500", "600", "700"] })

// Inner component that uses the language context
function LayoutInnerComponent({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const isRTL = language === "he"

  // Using CSS classes instead to control text direction
  return (
    <html lang={language}>
      <head>
        <title>ZeroTouch Claims | Your Compensation. Maximized.</title>
        <meta name="description" content="AI system that replaces a lawyer" />
        <meta name="generator" content="v0.app" />
      </head>
      <body className={`${heebo.className} font-sans antialiased ${isRTL ? "rtl-layout" : "ltr-layout"}`}>
        <GlobalHeader />
        <div className="pt-[72px]">{children}</div>
        <Analytics />
        <DevNavPanel />
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
