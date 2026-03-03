"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { BACKEND_BASE_URL } from "@/variables"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FlaskConical,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  UserCircle2,
  FileText,
  Zap,
  ArrowRight,
  Play,
} from "lucide-react"

interface LabDoc {
  id: string
  file_name: string
  document_type: string
  uploaded_at: string
  btl_analyzed: boolean
  action_type: string | null
  summary: string
  key_points: string[]
}

interface LabState {
  btl_action: Record<string, any>
  documents: LabDoc[]
  total: number
  analyzed_count: number
  pending_count: number
}

interface RunResult {
  doc_id: string
  file_name: string
  action: Record<string, any>
  btl_action_before: Record<string, any>
  btl_action_after: Record<string, any>
}

const ACTION_COLOR: Record<string, string> = {
  claim_approved: "text-green-400 bg-green-950/40 border-green-700/40",
  claim_rejected: "text-red-400 bg-red-950/40 border-red-700/40",
  rehab_approved: "text-purple-400 bg-purple-950/40 border-purple-700/40",
  rehab_payment_update: "text-blue-400 bg-blue-950/40 border-blue-700/40",
  waiting_for_docs: "text-yellow-400 bg-yellow-950/40 border-yellow-700/40",
  appointment_scheduled: "text-cyan-400 bg-cyan-950/40 border-cyan-700/40",
  claim_submitted: "text-indigo-400 bg-indigo-950/40 border-indigo-700/40",
  informational: "text-slate-400 bg-slate-800/40 border-slate-600/40",
}

const ACTION_LABELS: Record<string, string> = {
  action_type: "Action",
  disability_percentage: "Disability %",
  monthly_amount: "Monthly ₪",
  reimbursement_amount: "Reimbursed ₪",
  reimbursement_period: "Period",
  payment_breakdown: "Breakdown",
  registered_email: "Email",
  appeal_form_type: "Appeal Form",
  appeal_deadline_days: "Appeal Deadline (days)",
  disability_percentages_by_period: "% by Period",
  appointment_date: "Appointment",
  appointment_time: "Time",
  appointment_place: "Location",
  appointment_specialty: "Specialty",
  department_message: "Message",
  needs_human_review: "Needs Review",
  confidence: "Confidence",
}

export default function BtlLabPage() {
  const [caseId, setCaseId] = useState("")
  const [userId, setUserId] = useState("")
  const [detectedName, setDetectedName] = useState<string | null>(null)
  const [btlCreds, setBtlCreds] = useState<Record<string, string> | null>(null)

  const [limit, setLimit] = useState(1)
  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [syncMessage, setSyncMessage] = useState("")
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [liveState, setLiveState] = useState<LabState | null>(null)
  const snapshotRef = useRef<LabState | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [events, setEvents] = useState<{ ts: string; text: string; kind: "info" | "doc" | "change" }[]>([])

  // Per-doc analysis state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<RunResult | null>(null)

  const addEvent = useCallback((text: string, kind: "info" | "doc" | "change" = "info") => {
    const ts = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    setEvents((e) => [{ ts, text, kind }, ...e].slice(0, 50))
  }, [])

  const fetchLab = useCallback(async (id: string): Promise<LabState | null> => {
    try {
      const r = await fetch(`${BACKEND_BASE_URL}/api/btl-lab/${id}`)
      if (!r.ok) return null
      return await r.json()
    } catch { return null }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const startPolling = useCallback((id: string) => {
    stopPolling()
    let prevDocIds = new Set(snapshotRef.current?.documents.map((d) => d.id) || [])
    let prevAction = JSON.stringify(snapshotRef.current?.btl_action || {})

    pollRef.current = setInterval(async () => {
      const state = await fetchLab(id)
      if (!state) return
      setLiveState(state)

      for (const doc of state.documents) {
        if (!prevDocIds.has(doc.id)) {
          addEvent(`New letter received: ${doc.file_name}`, "doc")
          prevDocIds = new Set(state.documents.map((d) => d.id))
        }
      }

      const newAction = JSON.stringify(state.btl_action)
      if (newAction !== prevAction) {
        const prev = JSON.parse(prevAction) as Record<string, any>
        const curr = state.btl_action
        for (const [k, v] of Object.entries(curr)) {
          const label = ACTION_LABELS[k] || k
          if (JSON.stringify(v) !== JSON.stringify(prev[k])) {
            addEvent(`${label}: ${prev[k] == null ? "(none)" : prev[k]} → ${v}`, "change")
          }
        }
        prevAction = newAction
      }
    }, 2500)
  }, [fetchLab, stopPolling, addEvent])

  useEffect(() => {
    const storedCase = localStorage.getItem("case_id") || localStorage.getItem("current_case_id")
    const storedUser = localStorage.getItem("user_id") || localStorage.getItem("userId")
    if (storedCase) setCaseId(storedCase)
    if (storedUser) setUserId(storedUser)
    try {
      const raw = localStorage.getItem("user_profile") || localStorage.getItem("userProfile")
      if (raw) { const p = JSON.parse(raw); setDetectedName(p?.full_name || p?.name || p?.email || null) }
    } catch {}
    try {
      const creds = localStorage.getItem("btl_credentials")
      if (creds) setBtlCreds(JSON.parse(creds))
    } catch {}
  }, [])

  useEffect(() => {
    if (caseId && !snapshotRef.current) {
      fetchLab(caseId).then((s) => { if (s) { snapshotRef.current = s; setLiveState(s) } })
    }
  }, [caseId, fetchLab])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event?.data?.type) return
      const t = event.data.type
      if (t === "BTL_EXTENSION_START_LETTERS_SYNC_RESULT" || t === "BTL_EXTENSION_RUN_CHECK_STATUS_RESULT") {
        if (syncTimeout.current) clearTimeout(syncTimeout.current)
        if (event.data.success) {
          setSyncStatus("success")
          setSyncMessage(`Extension done — letter(s) uploaded, running analysis…`)
          addEvent("Extension sync completed — auto-analyzing latest", "info")
          // Auto-analyze the latest unanalyzed doc after sync
          setTimeout(() => runLatest(), 2000)
        } else {
          setSyncStatus("error")
          setSyncMessage(event.data.error || "Extension returned an error")
          addEvent(`Extension error: ${event.data.error || "unknown"}`, "info")
          stopPolling()
        }
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [limit, addEvent, stopPolling, caseId])

  // ── Analyze a specific document (force, regardless of btl_analyzed) ───────
  const analyzeDoc = async (docId: string, fileName: string) => {
    if (!caseId) return
    setAnalyzingId(docId)
    setRunResult(null)
    addEvent(`Analyzing: ${fileName}`, "info")
    try {
      const r = await fetch(`${BACKEND_BASE_URL}/api/btl-lab/${caseId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_ids: [docId], mark_analyzed: true }),
      })
      const data = await r.json()
      if (!r.ok || data.status === "nothing_to_process") {
        addEvent(`Analysis returned nothing for ${fileName}`, "info")
        setAnalyzingId(null)
        return
      }
      const processed = data.processed?.[0]
      if (processed) {
        setRunResult({
          doc_id: docId,
          file_name: fileName,
          action: processed.action || {},
          btl_action_before: data.btl_action_before || {},
          btl_action_after: data.btl_action_after || {},
        })
        addEvent(`Action: ${processed.action?.action_type || "unknown"}`, "change")
      }
      // Refresh the doc list
      const fresh = await fetchLab(caseId)
      if (fresh) setLiveState(fresh)
    } catch (e: any) {
      addEvent(`Analysis failed: ${e.message}`, "info")
    }
    setAnalyzingId(null)
  }

  // ── Analyze latest letter regardless ──────────────────────────────────────
  const runLatest = async () => {
    if (!caseId) return
    const state = await fetchLab(caseId)
    if (!state) return
    const letters = state.documents.filter(d =>
      d.document_type === "letter" || d.document_type === "btl_admin_letter"
    )
    if (!letters.length) { addEvent("No letters found to analyze", "info"); return }
    // Sort by uploaded_at desc to get the newest
    letters.sort((a, b) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""))
    const latest = letters[0]
    await analyzeDoc(latest.id, latest.file_name)
  }

  // ── Extension sync trigger ─────────────────────────────────────────────────
  const triggerSync = async () => {
    if (!caseId || !userId) {
      setSyncStatus("error"); setSyncMessage("No session — log in from the dashboard first"); return
    }
    const snap = await fetchLab(caseId)
    snapshotRef.current = snap
    setLiveState(snap)
    setEvents([])
    setRunResult(null)

    setSyncStatus("running")
    setSyncMessage("Sending to extension…")
    addEvent(`Trigger fired — limit: ${limit}`, "info")

    window.postMessage({
      type: "BTL_EXTENSION_STORE_PAYLOAD",
      payload: {
        user_id: userId, case_id: caseId, lab_limit: limit,
        source: "btl-lab", prompted_at: new Date().toISOString(),
        ...(btlCreds ? { btl_credentials: btlCreds } : {}),
      },
    }, "*")

    setTimeout(() => {
      window.postMessage({ type: "BTL_EXTENSION_START_LETTERS_SYNC" }, "*")
      startPolling(caseId)
    }, 250)

    syncTimeout.current = setTimeout(() => {
      setSyncStatus("error")
      setSyncMessage("No response after 30s — is the extension installed?")
      stopPolling()
    }, 30000)
  }

  const letters = (liveState?.documents || []).filter(
    d => d.document_type === "letter" || d.document_type === "btl_admin_letter"
  ).sort((a, b) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""))

  const currentAction = liveState?.btl_action || {}
  const snapshotAction = snapshotRef.current?.btl_action || {}
  const changedKeys = Object.keys(currentAction).filter(
    (k) => JSON.stringify(currentAction[k]) !== JSON.stringify(snapshotAction[k])
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Left: Controls */}
          <Card className="bg-slate-900 border-slate-700 p-7 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">BTL Lab</h1>
                <p className="text-xs text-slate-500">Analyze letters · see agent actions</p>
              </div>
            </div>

            {caseId ? (
              <div className="flex items-center gap-2 text-xs text-green-400 mb-6 bg-green-950/30 border border-green-800/40 rounded-lg px-3 py-2">
                <UserCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{detectedName || caseId.slice(0, 16) + "…"}</span>
                {!btlCreds && <span className="text-yellow-500 ml-auto shrink-0">⚠ no creds</span>}
              </div>
            ) : (
              <div className="text-xs text-yellow-500 mb-6 bg-yellow-950/30 border border-yellow-800/40 rounded-lg px-3 py-2">
                No session — log in from the dashboard first
              </div>
            )}

            {/* Analyze latest button */}
            <Button
              onClick={runLatest}
              disabled={!!analyzingId || !caseId}
              className="w-full mb-3 bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-semibold text-sm"
            >
              {analyzingId ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</> : <><Play className="w-4 h-4 mr-2" /> Analyze Latest Letter</>}
            </Button>

            <div className="text-xs text-slate-600 text-center mb-5">Forces re-analysis even if already done</div>

            <div className="border-t border-slate-800 pt-5">
              <div className="text-xs text-slate-400 mb-2 font-medium">Extension sync (download new)</div>
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setLimit((l) => Math.max(1, l - 1))} className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center text-3xl font-bold text-white">{limit}</div>
                <button onClick={() => setLimit((l) => l + 1)} className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                onClick={triggerSync}
                disabled={syncStatus === "running" || !caseId}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white h-10 font-semibold text-sm"
              >
                {syncStatus === "running"
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Syncing…</>
                  : <><Download className="w-4 h-4 mr-2" />Download from BTL</>}
              </Button>
              {syncStatus === "success" && <div className="mt-3 flex items-start gap-2 text-green-400 text-xs"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><span>{syncMessage}</span></div>}
              {syncStatus === "error" && <div className="mt-3 flex items-start gap-2 text-red-400 text-xs"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{syncMessage}</span></div>}
            </div>

            {liveState && (
              <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Total", val: liveState.total, c: "text-white" },
                  { label: "Analyzed", val: liveState.analyzed_count, c: "text-green-400" },
                  { label: "Pending", val: liveState.pending_count, c: "text-yellow-400" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className={`text-xl font-bold ${s.c}`}>{s.val}</div>
                    <div className="text-xs text-slate-600">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Right: Analysis Result + Live Log */}
          <div className="space-y-4">

            {/* Analysis result */}
            {runResult && (
              <Card className="bg-slate-900 border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Analysis Result</span>
                  <span className="ml-auto text-xs text-slate-500 truncate max-w-32">{runResult.file_name}</span>
                </div>

                {/* What action was determined */}
                {runResult.action?.action_type && (
                  <div className={`rounded-lg border px-3 py-2 mb-3 text-sm font-semibold ${ACTION_COLOR[runResult.action.action_type] || ACTION_COLOR.informational}`}>
                    {runResult.action.action_type.replace(/_/g, " ")}
                    {runResult.action.confidence != null && (
                      <span className="text-xs font-normal ml-2 opacity-70">confidence: {runResult.action.confidence}</span>
                    )}
                  </div>
                )}

                {/* All fields from action */}
                <div className="space-y-1 mb-3">
                  {Object.entries(runResult.action).map(([k, v]) => {
                    if (k === "action_type" || v == null || v === "") return null
                    return (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-slate-500 w-28 shrink-0">{ACTION_LABELS[k] || k}</span>
                        <span className="text-slate-200 font-medium">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                      </div>
                    )
                  })}
                </div>

                {/* DB state change */}
                <div className="border-t border-slate-800 pt-3 mt-3">
                  <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">DB State Changes</div>
                  {(() => {
                    const changes = Object.entries(runResult.btl_action_after).filter(
                      ([k, v]) => JSON.stringify(v) !== JSON.stringify(runResult.btl_action_before[k])
                    )
                    if (!changes.length) return <div className="text-xs text-slate-600">No changes to case metadata</div>
                    return changes.map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs mb-1">
                        <span className="text-slate-500 w-28 shrink-0">{ACTION_LABELS[k] || k}</span>
                        <span className="text-slate-600 line-through mr-1">{String(runResult.btl_action_before[k] ?? "—")}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                        <span className="text-green-400 font-medium ml-1">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                      </div>
                    ))
                  })()}
                </div>
              </Card>
            )}

            {/* Event log */}
            {events.length > 0 && (
              <Card className="bg-slate-900 border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Live Log</span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {events.map((ev, i) => (
                    <div key={i} className="flex gap-2 text-xs font-mono">
                      <span className="text-slate-700 shrink-0">{ev.ts}</span>
                      <span className={ev.kind === "change" ? "text-green-400" : ev.kind === "doc" ? "text-cyan-400" : "text-slate-400"}>{ev.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ── Full document list with per-doc analyze ── */}
        {letters.length > 0 && (
          <Card className="bg-slate-900 border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-200">All Letters ({letters.length})</span>
              <span className="text-xs text-slate-600">— click Analyze to force re-run on any</span>
            </div>
            <div className="space-y-2">
              {letters.map((doc) => {
                const cls = ACTION_COLOR[doc.action_type || ""] || ACTION_COLOR.informational
                const isThis = runResult?.doc_id === doc.id
                const isAnalyzing = analyzingId === doc.id
                return (
                  <div key={doc.id} className={`rounded-lg border p-3 flex items-start gap-3 transition ${isThis ? "border-emerald-600/60 bg-emerald-950/20" : "border-slate-700/50 bg-slate-800/30"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 truncate">{doc.file_name}</span>
                        {doc.btl_analyzed && (
                          <span className="text-xs text-green-500 shrink-0">✓ analyzed</span>
                        )}
                      </div>
                      {doc.action_type && (
                        <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded border ${cls}`}>
                          {doc.action_type.replace(/_/g, " ")}
                        </span>
                      )}
                      {doc.summary && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.summary}</p>
                      )}
                      <div className="text-xs text-slate-700 mt-0.5">{doc.uploaded_at?.slice(0, 16).replace("T", " ")}</div>
                    </div>
                    <button
                      onClick={() => analyzeDoc(doc.id, doc.file_name)}
                      disabled={!!analyzingId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600/20 hover:bg-violet-600/40 border border-violet-600/40 text-violet-300 transition disabled:opacity-40 shrink-0"
                    >
                      {isAnalyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Analyze
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
