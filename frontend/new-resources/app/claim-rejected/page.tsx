"use client"

import { motion } from "framer-motion"
import {
  FileText, AlertCircle, CheckCircle2, TrendingUp, Shield,
  ChevronLeft, Upload, X, ExternalLink, Loader2, Send,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { deriveCaseLetters } from "@/lib/caseApi"
import { BACKEND_BASE_URL } from "@/variables"

interface DocState {
  file: File | null
  uploading: boolean
  done: boolean
  error: boolean
}

interface Props {
  initialCaseObj?: any
}

export default function ClaimRejectedPage({ initialCaseObj }: Props = {}) {
  const router = useRouter()
  const [caseObj, setCaseObj] = useState<any>(initialCaseObj ?? null)
  const [docStates, setDocStates] = useState<Record<string, DocState>>({})
  const [appealLoading, setAppealLoading] = useState(false)

  function initDocStates(c: any) {
    const docs: string[] = (c?.metadata?.btl_action?.required_documents) || []
    const initial: Record<string, DocState> = {}
    docs.forEach((name: string) => {
      initial[name] = { file: null, uploading: false, done: false, error: false }
    })
    const drl: any[] = (c?.call_summary?.documents_requested_list as any[] | undefined) || []
    drl.filter((d) => d.source === "appeal_rejection_letter").forEach((d) => {
      const name: string = d.name || ""
      if (!initial[name]) initial[name] = { file: null, uploading: false, done: false, error: false }
      if (d.status === "uploaded") initial[name].done = true
    })
    setDocStates(initial)
  }

  // When prop arrives/updates (dashboard passes currentCase.case)
  useEffect(() => {
    if (initialCaseObj) {
      setCaseObj(initialCaseObj)
      initDocStates(initialCaseObj)
    }
  }, [initialCaseObj])

  // Fallback: fetch independently when not embedded with a prop
  useEffect(() => {
    if (initialCaseObj) return
    const caseId = localStorage.getItem("case_id")
    const token = localStorage.getItem("access_token")
    if (!caseId || !token) return
    fetch(`${BACKEND_BASE_URL}/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const c = data?.case || data
        if (!c) return
        setCaseObj(c)
        initDocStates(c)
      })
      .catch(() => {})
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────
  const action = caseObj?.metadata?.btl_action || {}
  const cd = caseObj?.committee_decision || caseObj?.metadata?.btl_action || {}
  const rejectionReason =
    cd.department_message || action.department_message || "ביטוח לאומי דחה את התביעה. ניתן לערער."
  const percentagesByPeriod: Array<{ from: string; to: string; percentage: number; reason?: string }> =
    cd.disability_percentages_by_period || action.disability_percentages_by_period || []
  const appealFormType: string = cd.appeal_form_type || action.appeal_form_type || "7810"
  const appealDeadlineDays: number | null = cd.appeal_deadline_days || action.appeal_deadline_days || null
  const letterDate: string | null = cd.letter_date || null

  // PDF of the original rejection letter — try letterDate, then all dates, then btl_timeline
  const rejectionLetterUrl: string | null = (() => {
    const dates: Record<string, any> = caseObj?.letters?.dates || {}
    if (letterDate) {
      const dateKey = letterDate.slice(0, 10)
      const url = dates[dateKey]?.items?.[0]?.download_url ?? null
      if (url) return url
    }
    // Fallback: most recent letter with a download_url in dates blob
    const sorted = Object.keys(dates).sort().reverse()
    for (const key of sorted) {
      const url = dates[key]?.items?.[0]?.download_url ?? null
      if (url) return url
    }
    // Last resort: check btl_timeline entries for a download_url
    const timeline: any[] = caseObj?.metadata?.btl_timeline || []
    for (const entry of [...timeline].reverse()) {
      if (entry.download_url) return entry.download_url
    }
    return null
  })()

  const appealDeadlineDate = (() => {
    if (!appealDeadlineDays || !letterDate) return null
    const d = new Date(letterDate)
    d.setDate(d.getDate() + appealDeadlineDays)
    return d
  })()
  const daysLeft = appealDeadlineDate
    ? Math.max(0, Math.ceil((appealDeadlineDate.getTime() - Date.now()) / 86400000))
    : null

  // Letters timeline
  const letters = deriveCaseLetters(caseObj || {})

  // Required docs for appeal from agent extraction + previously merged appeal docs
  const agentDocs: string[] = (action.required_documents as string[] | undefined) || []
  const appealDrlDocs: string[] = ((caseObj?.call_summary?.documents_requested_list as any[] | undefined) || [])
    .filter((d) => d.source === "appeal_rejection_letter")
    .map((d) => d.name as string)
  const allDocNames = Array.from(new Set([...agentDocs, ...appealDrlDocs]))

  const allRequiredUploaded =
    allDocNames.length === 0 || allDocNames.every((name) => docStates[name]?.done)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmtDate(iso?: string) {
    if (!iso) return ""
    const [y, m, d] = iso.slice(0, 10).split("-")
    return `${d}/${m}/${y}`
  }

  async function handleFileSelect(docName: string, file: File) {
    if (!caseObj?.id) return
    setDocStates((prev) => ({ ...prev, [docName]: { file, uploading: true, done: false, error: false } }))
    try {
      const token = localStorage.getItem("access_token")
      const fd = new FormData()
      fd.append("file", file)
      fd.append("document_name", docName)
      const res = await fetch(`${BACKEND_BASE_URL}/api/cases/${caseObj.id}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      setDocStates((prev) => ({ ...prev, [docName]: { file, uploading: false, done: res.ok, error: !res.ok } }))
    } catch {
      setDocStates((prev) => ({ ...prev, [docName]: { file, uploading: false, done: false, error: true } }))
    }
  }

  function handleRemove(docName: string) {
    setDocStates((prev) => ({ ...prev, [docName]: { file: null, uploading: false, done: false, error: false } }))
  }


  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ChevronLeft className="w-5 h-5 rotate-180" />
            <span className="text-sm font-medium">חזרה לדשבורד</span>
          </Link>
          <h2 className="text-lg font-bold text-slate-900">סטטוס תביעה</h2>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Status card */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
              <Card className="p-6 bg-white shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <FileText className="w-12 h-12 text-slate-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-slate-900">התקבל עדכון מביטוח לאומי</h1>
                      <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm font-medium rounded-full">
                        נדרש ערעור
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      התביעה נדחתה בשלב זה. זהו הליך שכיח (כ-40% מהמקרים). יש להעלות מסמכים נוספים לצורך הגשת הערעור.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Rejection reason + original letter link */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              <Card className="p-6 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900">ניתוח סיבת הדחייה</h2>
                  {rejectionLetterUrl && (
                    <a
                      href={rejectionLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      קרא את המכתב המקורי
                    </a>
                  )}
                </div>
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed">{rejectionReason}</p>
                </div>
                <div className="bg-emerald-50 border-r-4 border-emerald-500 p-4 rounded">
                  <p className="text-emerald-800 font-semibold">
                    סיכויי הצלחה בערעור: <span className="text-2xl">גבוהים</span>
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* Disability percentages table */}
            {percentagesByPeriod.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
                <Card className="p-6 bg-white shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-3">אחוזי נכות שנקבעו לפי תקופה</h2>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-right px-4 py-2.5 font-semibold text-slate-600">תקופה</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-slate-600">אחוז</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-slate-600">הערה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {percentagesByPeriod.map((p, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            <td className="px-4 py-2 text-slate-700">{fmtDate(p.from)} – {fmtDate(p.to)}</td>
                            <td className="px-4 py-2">
                              <span className={`font-bold ${p.percentage === 0 ? "text-red-600" : "text-orange-600"}`}>
                                {p.percentage}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-500 text-xs">{p.reason || "נמוך מהסף הנדרש"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">* הסף לזכאות: 60% ומעלה, או 25%–60% כאשר אחד מהאחוזים מעל 25%</p>
                </Card>
              </motion.div>
            )}

            {/* Appeal deadline */}
            {appealFormType && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.14 }}>
                <Card className="p-5 bg-orange-50 border border-orange-300 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-orange-900 mb-1">זכות ערעור בטופס {appealFormType}</h3>
                      <p className="text-sm text-orange-800">
                        אתה רשאי לערער בפני ועדת הערעורים של ביטוח לאומי באמצעות טופס {appealFormType}.
                      </p>
                      {daysLeft !== null && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                          daysLeft <= 14 ? "bg-red-100 text-red-700" :
                          daysLeft <= 30 ? "bg-orange-100 text-orange-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          ⏰ {daysLeft} ימים נותרים
                          {appealDeadlineDate && (
                            <span className="font-normal text-xs opacity-70">
                              (עד {appealDeadlineDate.toLocaleDateString("he-IL")})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Appeal document upload */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }}>
              <Card className="p-6 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-slate-900">מסמכים נדרשים לערעור</h2>
                  {allDocNames.length > 0 && (
                    <Badge className={allRequiredUploaded ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                      {allDocNames.filter((n) => docStates[n]?.done).length}/{allDocNames.length} הועלו
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600 mb-5 text-sm">
                  המסמכים הבאים זוהו במכתב הדחייה כנדרשים לצורך הגשת הערעור.
                </p>
                {allDocNames.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    לא זוהו מסמכים ספציפיים במכתב הדחייה — ניתן להמשיך להגשת הערעור.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allDocNames.map((docName) => {
                      const ds = docStates[docName] || { file: null, uploading: false, done: false, error: false }
                      return (
                        <Card key={docName} className="p-4 bg-slate-50 border border-slate-200">
                          <p className="font-semibold text-slate-900 mb-2">{docName}</p>
                          {ds.done ? (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-sm font-medium">{ds.file?.name || "הועלה בהצלחה"}</span>
                              </div>
                              <button
                                onClick={() => handleRemove(docName)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                                aria-label="הסר"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : ds.uploading ? (
                            <div className="flex items-center gap-2 text-blue-600 text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              מעלה...
                            </div>
                          ) : (
                            <>
                              {ds.error && <p className="text-xs text-red-600 mb-1">שגיאה בהעלאה — נסה שוב</p>}
                              <div>
                                <input
                                  type="file"
                                  id={`doc-${docName}`}
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileSelect(docName, file)
                                  }}
                                />
                                <label htmlFor={`doc-${docName}`}>
                                  <Button size="sm" variant="outline" className="cursor-pointer bg-transparent" asChild>
                                    <span>
                                      <Upload className="w-4 h-4 ml-2" />
                                      העלה מסמך
                                    </span>
                                  </Button>
                                </label>
                              </div>
                            </>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Submit appeal */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.22 }}>
              <Card className="p-6 bg-white shadow-sm border-t-4 border-blue-600">
                <h3 className="text-lg font-bold text-slate-900 mb-3">הגשת הערעור</h3>
                <p className="text-slate-600 mb-5 leading-relaxed text-sm">
                  לחץ על "הגש ערעור" כדי לעבור לטופס {appealFormType} ולהגיש את הערעור. ניתן להעלות מסמכים נוספים בשלב הטופס.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 font-semibold"
                    disabled={appealLoading}
                    onClick={async () => {
                      const id = caseObj?.id
                      if (!id) { router.push("/legal-review"); return }
                      setAppealLoading(true)
                      try {
                        const token = localStorage.getItem("access_token")
                        await fetch(`${BACKEND_BASE_URL}/api/cases/${id}/status`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ status: "Submission Pending" }),
                        })
                      } catch {}
                      setAppealLoading(false)
                      router.push("/legal-review")
                    }}
                  >
                    {appealLoading ? (
                      <><Loader2 className="w-5 h-5 ml-2 animate-spin" />מעדכן...</>
                    ) : (
                      <><Send className="w-5 h-5 ml-2" />הגש ערעור (טופס {appealFormType})</>
                    )}
                  </Button>
                  <a
                    href={rejectionLetterUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                    onClick={!rejectionLetterUrl ? (e) => e.preventDefault() : undefined}
                  >
                    <Button
                      variant="outline"
                      className={`w-full h-12 font-semibold bg-transparent gap-2 ${!rejectionLetterUrl ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      צפה במכתב הדחייה
                    </Button>
                  </a>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="p-6 bg-white shadow-sm sticky top-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">מסלול התביעה</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-0.5 h-12 bg-slate-200 mt-2" />
                    </div>
                    <div className="pb-4">
                      <h4 className="font-semibold text-slate-900 mb-1">הגשת תביעה</h4>
                      <p className="text-sm text-slate-500">התיק הוגש בהצלחה</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-0.5 h-12 bg-slate-200 mt-2" />
                    </div>
                    <div className="pb-4">
                      <h4 className="font-semibold text-slate-900 mb-1">החלטת הוועדה</h4>
                      <p className="text-sm text-orange-600 font-medium">נדחה</p>
                      {letterDate && <p className="text-xs text-slate-400 mt-1">{fmtDate(letterDate)}</p>}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-1">הגשת ערעור</h4>
                      <p className="text-sm text-slate-500">העלאת מסמכים — שלב פעיל</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>{daysLeft !== null ? `${daysLeft} ימים להגשת ערעור` : "45 ימים להגשת ערעור"}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
