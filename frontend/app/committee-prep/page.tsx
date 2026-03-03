"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CommitteePrepChat from "@/components/committee-prep-chat"

export default function CommitteePrepPage() {
  const router = useRouter()
  const [caseId, setCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("case_id")
    if (stored) {
      setCaseId(stored)
    }
    setLoading(false)
  }, [])

  if (loading) return null

  if (!caseId) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm" dir="rtl">
      לא נמצא תיק פעיל
    </div>
  )

  return (
    <div className="h-screen flex flex-col">
      <CommitteePrepChat caseId={caseId} language="he" onClose={() => router.back()} />
    </div>
  )
}
