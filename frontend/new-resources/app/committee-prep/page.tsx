"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה
        </button>
      </header>

      {/* Chat */}
      <div className="flex-1 flex items-stretch justify-center p-4">
        <div className="w-full max-w-2xl flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              טוען...
            </div>
          ) : caseId ? (
            <div className="flex-1" style={{ minHeight: "calc(100vh - 100px)" }}>
              <CommitteePrepChat caseId={caseId} language="he" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              לא נמצא תיק פעיל
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
