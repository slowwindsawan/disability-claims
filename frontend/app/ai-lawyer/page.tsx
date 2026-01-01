"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AILawyerInterface } from "@/components/ai-lawyer-interface"

export default function AILawyerPage() {
  const router = useRouter()

  useEffect(() => {
    // Verify authentication before allowing access
    const token = localStorage.getItem("access_token")
    const caseId = localStorage.getItem("case_id")
    
    console.log("🔐 AI Lawyer Page - Auth Check:")
    console.log("  - Token:", token ? "✅ Present" : "❌ Missing")
    console.log("  - Case ID:", caseId ? "✅ Present" : "❌ Missing")
    
    if (!token) {
      console.error("❌ No access token found, redirecting to home")
      router.push("/")
      return
    }
    
    if (!caseId) {
      console.warn("⚠️ No case ID found, might need to create one")
    }
  }, [router])

  return <AILawyerInterface />
}
