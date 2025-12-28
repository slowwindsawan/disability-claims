"use client"

import { useEffect, useState } from "react"
import { BACKEND_BASE_URL } from '@/variables'

export interface Case {
  id: string
  case_id?: string
  user_id?: string
  created_at?: string
  updated_at?: string
  case?: Record<string, unknown>
  [key: string]: unknown
}

interface UseCurrentCaseReturn {
  currentCase: Case | null
  loadingCase: boolean
  errorCase: string | null
  formatCaseNumber: (caseData: Case | null) => string
}

function useCurrentCase(): UseCurrentCaseReturn {
  const [currentCase, setCurrentCase] = useState<Case | null>(null)
  const [loadingCase, setLoadingCase] = useState(true)
  const [errorCase, setErrorCase] = useState<string | null>(null)

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const caseId = localStorage.getItem("case_id")
        const token = localStorage.getItem("access_token")

        if (!caseId || !token) {
          console.warn("⚠️ Missing case_id or access_token")
          setCurrentCase(null)
          setLoadingCase(false)
          return
        }

        const apiUrl = `${BACKEND_BASE_URL}/cases/${caseId}`
        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("❌ Failed to fetch case:", response.statusText)
          console.error("❌ Error response:", errorText)
          setErrorCase(`Failed to fetch case: ${response.statusText}`)
          setCurrentCase(null)
          setLoadingCase(false)
          return
        }

        const caseData = await response.json()
        console.log("✅ Case data loaded:", caseData)
        setCurrentCase(caseData)
        setErrorCase(null)
      } catch (error) {
        console.error("❌ Error fetching case:", error)
        setErrorCase(error instanceof Error ? error.message : "Unknown error")
        setCurrentCase(null)
      } finally {
        setLoadingCase(false)
      }
    }

    fetchCase()
  }, [])

  const formatCaseNumber = (caseData: Case | null): string => {
    if (!caseData) return "N/A"
    
    // Try different possible case ID fields
    const caseId = caseData.case_id || caseData.id || (caseData as Record<string, unknown>).caseId
    
    if (!caseId) return "N/A"
    
    const idStr = String(caseId)
    // Format as XXXX-XXXX if long enough, otherwise return as-is
    if (idStr.length >= 8) {
      return `${idStr.slice(0, 4)}-${idStr.slice(4)}`
    }
    return idStr
  }

  return {
    currentCase,
    loadingCase,
    errorCase,
    formatCaseNumber,
  }
}

export default useCurrentCase
