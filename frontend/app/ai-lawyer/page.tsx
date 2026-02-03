"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AILawyerInterface } from "@/components/ai-lawyer-interface"
import { BACKEND_BASE_URL } from "@/variables"

export default function AILawyerPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(false)

  useEffect(() => {
    // Verify authentication and user status before allowing access
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

    // Check user status - should not be in "Initial questionnaire" status
    const checkUserStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const userData = await response.json()
          const caseStatus = userData?.user?.case?.status || userData?.user?.case_status || userData?.user?.cases?.[0]?.status
          
          console.log('AI Lawyer - Case status:', caseStatus)
          
          if (caseStatus === 'Initial questionnaire') {
            console.log('User still in Initial questionnaire, redirecting to onboarding')
            router.push("/?redirect=onboarding")
            return
          }
          
          setIsAllowed(true)
        } else {
          console.error("Failed to fetch user status")
          router.push("/")
        }
      } catch (error) {
        console.error("Error checking user status:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    checkUserStatus()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAllowed) {
    return null
  }

  return <AILawyerInterface />
}
