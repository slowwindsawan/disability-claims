import type React from "react"
import type { Metadata } from "next"
import { Heebo } from "next/font/google"
import "./globals.css"
import { LayoutInner } from "@/components/LayoutInner" // Import the new client component

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["300", "400", "500", "600", "700"] })

// Metadata for static export
export const metadata: Metadata = {
  title: "Disability Claims",
  description: "Disability Claims Management System",
  generator: 'v0.app'
}

// Root layout remains a server component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <LayoutInner>{children}</LayoutInner>
}
