import { useState, useEffect } from "react";
import { View, Plus, Minus, Eye } from "lucide-react";
import OnboardingFlow from './Onboarding/OnboardingFlow'
import { useNavigate } from 'react-router-dom'
import { normalizeOnboardingStep } from '../lib/onboardingUtils'
import { apiGetCases } from "../lib/api";
import Skeleton, { SkeletonCard } from './Skeleton'

interface MyCaseProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function MyCase(props: MyCaseProps) {
  const { onNavigate } = props
  const [activeTab, setActiveTab] = useState("social");
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const formatError = (err: any) => {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return err
    // api.request throws { status, body }
    if (err.body) {
      if (typeof err.body === 'string') return err.body
      if (err.body.message) return String(err.body.message)
      if (err.body.detail) return String(err.body.detail)
      try { return JSON.stringify(err.body) } catch (e) { return String(err.body) }
    }
    if (err.message) return String(err.message)
    try { return JSON.stringify(err) } catch (e) { return String(err) }
  }

  // cases will be loaded from the backend; we keep a placeholder list removed

  const statusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return "bg-yellow-100 text-yellow-800";
    if (s === "submitted") return "bg-blue-100 text-blue-800";
    if (s === "rejected") return "bg-red-100 text-red-800";
    if (s === "approved") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const [isOpenOnboarding, setIsOpenOnboarding] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res: any = await apiGetCases()
        // backend returns { status:'ok', cases: [...] }
        const rows = res?.cases || []
        if (mounted) setCases(rows)
      } catch (err: any) {
        console.error('Failed to load cases', err)
        if (mounted) setError(formatError(err) || 'Failed to load cases')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleCreateCase = async () => {
    // Open onboarding at the questionnaire step and do NOT call backend yet.
    // The case will be created when the user completes the eligibility questionnaire.
    try {
      const resume = { step: 'questionnaire', markEligibilityDone: false } as any;
      try { localStorage.setItem('resume_onboarding_step', JSON.stringify(resume)) } catch (e) {}
      setIsOpenOnboarding(true)
    } catch (err: any) {
      console.error('Failed to start onboarding', err)
      setCreateError(formatError(err) || 'Failed to start onboarding')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {isOpenOnboarding ? (
        <>
          <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 backdrop-blur-sm">
            <div className="relative w-full h-full max-w-full">
              <div className="absolute top-4 left-4">
                <button
                  className="text-sm px-3 py-2 rounded border bg-white/90"
                  onClick={() => {
                    // Close overlay and allow resume later via the resume key
                    setIsOpenOnboarding(false)
                    navigate('/mycase')
                  }}
                >
                  Quit &amp; Return to My Cases
                </button>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="text-sm text-white/90">You can quit anytime and resume later.</div>
              </div>

              <div className="h-full overflow-auto">
                <OnboardingFlow onComplete={() => { setIsOpenOnboarding(false); onNavigate('mycase') }} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Layout */}
          <div className="flex flex-1">
            {/* Main */}
            <main className="flex-1 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-semibold">Your Cases</h1>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateCase}
                      className="inline-flex items-center gap-2 px-4 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Case</span>
                    </button>
                    {createError && (
                      <div className="text-sm text-red-700 ml-3">{createError}</div>
                    )}
                    <button
                      onClick={() => {
                        /* TODO: Implement remove case */
                      }}
                      className="inline-flex items-center gap-2 px-4 py-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Remove Case</span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("social")}
                    className={`px-4 py-1 rounded-full ${
                      activeTab === "social"
                        ? "bg-blue-600 text-white"
                        : "bg-white border"
                    }`}
                  >
                    Social Security
                  </button>
                  <button
                    onClick={() => setActiveTab("professional")}
                    className={`px-4 py-1 rounded-full ${
                      activeTab === "professional"
                        ? "bg-blue-600 text-white"
                        : "bg-white border"
                    }`}
                  >
                    Professional Rehabilitation
                  </button>
                </div>
              </div>

              {/* "Table" header */}
              <div className="hidden md:grid grid-cols-12 gap-4 items-center px-4 py-3 text-sm font-medium text-gray-600 bg-white border rounded-t shadow-md">
                <div className="col-span-7">Case</div>
                <div className="col-span-2 text-right">Created</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {/* list */}
              <div className="space-y-3 mt-2">
                {loading && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <SkeletonCard />
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 120px 120px', gap: 12, padding: 12, alignItems: 'center', background: '#fff', borderRadius: 6 }}>
                        <div>
                          <Skeleton style={{ height: 14, width: '50%' }} />
                          <Skeleton style={{ height: 10, width: '70%', marginTop: 8 }} />
                        </div>
                        <Skeleton style={{ height: 12, width: '90%' }} />
                        <Skeleton style={{ height: 12, width: '80%' }} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <Skeleton style={{ height: 32, width: 64 }} />
                          <Skeleton style={{ height: 32, width: 64 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {error && <div className="p-4 bg-red-50 text-red-700 border rounded">{error}</div>}
                {!loading && !error && cases.length === 0 && (
                  <div className="p-4 bg-white border rounded">No cases found. Click "Add Case" to create one.</div>
                )}
                {!loading && !error && cases.map((c: any, i: number) => (
                  <div
                    key={c.id || i}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white border rounded p-4"
                  >
                    <div className="md:col-span-7">
                      <h4 className="text-sm font-semibold">Case • {c.id ? String(c.id).slice(0,8) : '—'}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        <strong className="mr-2">Status:</strong> {(c.status || 'Pending')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Show metadata-based chips for parts: eligibility, assessment, voice-agent, q/s, core-analysis, payments */}
                        {(() => {
                          let meta = c.metadata
                          if (typeof meta === 'string') {
                            try { meta = JSON.parse(meta) } catch (e) { meta = null }
                          }
                          const chips: any[] = []
                          if (meta && meta.initial_eligibility) chips.push({k:'eligibility', v:'Eligibility'})
                          if (meta && meta.assessments) chips.push({k:'assessments', v:'Assessments'})
                          if (meta && meta.voice_agent) chips.push({k:'voice_agent', v:'Voice Agent'})
                          if (meta && meta.qs) chips.push({k:'qs', v:'Q/S'})
                          if (meta && meta.core_analysis) chips.push({k:'core_analysis', v:'Core Analysis'})
                          if (meta && meta.payments) chips.push({k:'payments', v:'Payments'})
                          if (chips.length === 0) chips.push({k:'empty', v:'No details'})
                          return chips.map(ch => (
                            <span key={ch.k} className="text-xs px-2 py-1 bg-gray-100 rounded-full">{ch.v}</span>
                          ))
                        })()}
                        {/* Show next-step indicator if available */}
                        {(() => {
                          try {
                            let meta = c.metadata
                            if (typeof meta === 'string') {
                              meta = JSON.parse(meta)
                            }
                            const step = meta && (meta.current_step || meta.next_step || meta.onboarding_step || meta.step)
                            if (step) {
                              const label = typeof step === 'string' ? step.replace(/[-_]/g,' ').replace(/\b\w/g, l => l.toUpperCase()) : String(step)
                              return (<span className="text-xs px-2 py-1 bg-blue-50 text-blue-800 rounded-full ml-2">Next: {label}</span>)
                            }
                          } catch (e) {
                            // ignore parse errors
                          }
                          return null
                        })()}
                      </div>
                    </div>

                    <div className="md:col-span-2 flex md:justify-end items-center text-sm text-gray-600">
                      <span className="whitespace-nowrap">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                    </div>

                    <div className="md:col-span-2 flex justify-start md:justify-center">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(
                          c.status || 'Pending'
                        )}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current inline-block opacity-90" />
                        <span className="capitalize">{(c.status || 'Pending')}</span>
                      </span>
                    </div>

                    <div className="md:col-span-1 flex flex-wrap justify-end items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1 border rounded hover:bg-gray-50 text-sm"
                        aria-label={`View ${c.title}`}
                        onClick={() => onNavigate(`user-detail:${c.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">View</span>
                      </button>

                      <button
                        className="inline-flex items-center gap-2 px-3 py-1 border rounded hover:bg-red-50 text-sm text-red-700"
                        aria-label={`Delete ${c.title}`}
                        onClick={() => { setDeletingCaseId(String(c.id)); setDeleteError(null) }}
                      >
                        <span className="hidden sm:inline">Delete</span>
                      </button>

                      {/* Continue button: save resume step and navigate to dashboard */}
                      {(() => {
                        let resumeStep: string = 'voice'
                        let markEligibilityDone = false
                        try {
                          let meta = c.metadata
                          if (typeof meta === 'string') {
                            meta = JSON.parse(meta)
                          }
                          if (meta) {
                            const found = meta.current_step || meta.next_step || meta.onboarding_step || meta.step
                            if (found) resumeStep = String(found)
                            if (meta.eligibility_completed || meta.eligibility_done) markEligibilityDone = true
                          }
                        } catch (e) {
                          // ignore parse errors
                        }

                        try {
                          const n = normalizeOnboardingStep(resumeStep)
                          if (n) resumeStep = n
                        } catch (e) {}

                        const handleContinue = () => {
                          try {
                            const payload = { step: resumeStep, markEligibilityDone: !!markEligibilityDone, caseId: c.id }
                            localStorage.setItem('resume_onboarding_step', JSON.stringify(payload))
                          } catch (e) {}
                          setIsOpenOnboarding(false)
                          navigate('/dashboard')
                        }

                        return (
                          <button onClick={handleContinue} className="inline-flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-white text-sm">Continue</button>
                        )
                      })()}
                    </div>
                  </div>
                ))}
                
                {/* Delete confirmation modal (inline, no alert/confirm) */}
                {deletingCaseId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
                      <h3 className="text-lg font-semibold mb-2">Delete case</h3>
                      <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete case <strong>{deletingCaseId}</strong>? This action cannot be undone.</p>
                      {deleteError && <div className="text-sm text-red-700 mb-3">{deleteError}</div>}
                      <div className="flex justify-end gap-3">
                        <button className="px-4 py-2 rounded border" onClick={() => { setDeletingCaseId(null); setDeleteError(null) }} disabled={deleteLoading}>Cancel</button>
                        <button
                          className="px-4 py-2 rounded bg-red-600 text-white"
                          onClick={async () => {
                            try {
                              setDeleteLoading(true)
                              setDeleteError(null)
                              await (await import('../lib/api')).apiDeleteCase(deletingCaseId as string)
                              // remove from local list
                              setCases((prev) => prev.filter((x) => String(x.id) !== String(deletingCaseId)))
                              setDeletingCaseId(null)
                            } catch (err: any) {
                              console.error('Delete failed', err)
                              const msg = err?.body?.detail || err?.message || (typeof err === 'string' ? err : 'Delete failed')
                              setDeleteError(String(msg))
                            } finally {
                              setDeleteLoading(false)
                            }
                          }}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? 'Deleting…' : 'Delete case'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
}
