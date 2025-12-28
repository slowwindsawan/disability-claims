import type React from "react"
import { Heebo } from "next/font/google"
import "./globals.css"
import { LayoutInner } from "@/components/LayoutInner" // Import the new client component

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["300", "400", "500", "600", "700"] })

// Root layout remains a server component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <LayoutInner>{children}</LayoutInner>
}

export const metadata = {
      generator: 'v0.app'
    };
