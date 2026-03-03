"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  Briefcase,
  TrendingUp,
  AlertCircle,
  ClipboardList,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Stethoscope,
  Receipt,
  CreditCard,
} from "lucide-react"

export interface TimelineEvent {
  ts: string
  letter_date?: string
  action_type: string
  title_he: string
  summary?: string
  key_data?: Record<string, any>
}

interface BtlTimelineProps {
  events: TimelineEvent[]
  collapseAfter?: number
}

const ACTION_CONFIG: Record<string, { icon: any; border: string; bg: string; badge: string; badgeText: string }> = {
  claim_submitted:    { icon: FileText,      border: "border-indigo-400", bg: "bg-indigo-50",  badge: "bg-indigo-100 text-indigo-700",  badgeText: "הגשה" },
  appointment_scheduled: { icon: Calendar,   border: "border-cyan-400",   bg: "bg-cyan-50",    badge: "bg-cyan-100 text-cyan-700",      badgeText: "ועדה" },
  claim_approved:     { icon: CheckCircle2,  border: "border-green-400",  bg: "bg-green-50",   badge: "bg-green-100 text-green-700",    badgeText: "אושר" },
  claim_rejected:     { icon: XCircle,       border: "border-red-400",    bg: "bg-red-50",     badge: "bg-red-100 text-red-700",        badgeText: "נדחה" },
  rehab_approved:     { icon: Briefcase,     border: "border-teal-400",   bg: "bg-teal-50",    badge: "bg-teal-100 text-teal-700",      badgeText: "שיקום" },
  rehab_payment_update: { icon: TrendingUp,  border: "border-blue-400",   bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-700",      badgeText: "תשלום" },
  waiting_for_docs:   { icon: AlertCircle,   border: "border-yellow-400", bg: "bg-yellow-50",  badge: "bg-yellow-100 text-yellow-700",  badgeText: "מסמכים" },
  form_pending:       { icon: ClipboardList, border: "border-orange-400", bg: "bg-orange-50",  badge: "bg-orange-100 text-orange-700",  badgeText: "טופס" },
  informational:      { icon: Info,          border: "border-slate-300",  bg: "bg-slate-50",   badge: "bg-slate-100 text-slate-600",    badgeText: "עדכון" },
}

const DEFAULT_CONFIG = ACTION_CONFIG.informational

function formatDate(iso?: string): string {
  if (!iso) return ""
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function AppointmentKeyData({ data }: { data: Record<string, any> }) {
  if (!data.appointment_date && !data.appointment_place) return null
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      {data.appointment_date && (
        <div className="flex items-center gap-2 text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>{formatDate(data.appointment_date)}{data.appointment_time ? ` בשעה ${data.appointment_time}` : ""}</span>
        </div>
      )}
      {data.appointment_place && (
        <div className="flex items-center gap-2 text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>{data.appointment_place}</span>
        </div>
      )}
      {data.appointment_specialty && (
        <div className="flex items-center gap-2 text-slate-700">
          <Stethoscope className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>{data.appointment_specialty}</span>
        </div>
      )}
    </div>
  )
}

function RejectedKeyData({ data }: { data: Record<string, any> }) {
  const periods: Array<{ from: string; to: string; percentage: number; reason?: string }> =
    data.disability_percentages_by_period || []
  return (
    <div className="mt-3 space-y-2 text-sm">
      {periods.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">אחוזי נכות לפי תקופה</p>
          <div className="rounded-lg border border-red-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-red-50">
                <tr>
                  <th className="text-right px-2 py-1 font-medium text-slate-600">תקופה</th>
                  <th className="text-right px-2 py-1 font-medium text-slate-600">אחוז</th>
                  <th className="text-right px-2 py-1 font-medium text-slate-600">הערה</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50/40"}>
                    <td className="px-2 py-1 text-slate-700">{formatDate(p.from)} – {formatDate(p.to)}</td>
                    <td className="px-2 py-1 font-semibold text-red-700">{p.percentage}%</td>
                    <td className="px-2 py-1 text-slate-500">{p.reason || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data.appeal_form_type && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <ClipboardList className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="text-orange-800 font-medium">ערעור בטופס {data.appeal_form_type}</span>
          {data.appeal_deadline_days && (
            <span className="ml-auto text-xs text-orange-600">{data.appeal_deadline_days} ימים לערעור</span>
          )}
        </div>
      )}
    </div>
  )
}

function RehabPaymentKeyData({ data }: { data: Record<string, any> }) {
  const isReimbursement = !!data.reimbursement_amount
  const breakdown: Array<{ period: string; amount: number }> = data.payment_breakdown || []
  return (
    <div className="mt-3 space-y-2 text-sm">
      {isReimbursement ? (
        <>
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
            <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-blue-800 font-semibold">הוחזר: ₪{Number(data.reimbursement_amount).toLocaleString()}</span>
            {data.reimbursement_period && (
              <span className="text-blue-600 text-xs ml-auto">{data.reimbursement_period}</span>
            )}
          </div>
          {breakdown.length > 0 && (
            <div className="rounded-lg border border-blue-100 overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {breakdown.map((b, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/40"}>
                      <td className="px-2 py-1 text-slate-600">{b.period}</td>
                      <td className="px-2 py-1 font-medium text-slate-800 text-left">₪{Number(b.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : data.monthly_amount ? (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
          <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-blue-800 font-semibold">סכום חודשי: ₪{Number(data.monthly_amount).toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  )
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = ACTION_CONFIG[event.action_type] || DEFAULT_CONFIG
  const Icon = cfg.icon
  const hasKeyData = event.key_data && Object.keys(event.key_data).length > 0

  return (
    <div className={`relative border-r-4 ${cfg.border} pr-4 pl-2 py-3`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{event.title_he}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.badgeText}</span>
            {event.letter_date && (
              <span className="text-xs text-slate-400 mr-auto">{formatDate(event.letter_date)}</span>
            )}
          </div>
          {event.summary && (
            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{event.summary}</p>
          )}

          {/* Inline key data per type */}
          {hasKeyData && (
            <>
              {event.action_type === "appointment_scheduled" && <AppointmentKeyData data={event.key_data!} />}
              {event.action_type === "claim_rejected" && <RejectedKeyData data={event.key_data!} />}
              {event.action_type === "rehab_payment_update" && <RehabPaymentKeyData data={event.key_data!} />}

              {/* Generic expand for other types */}
              {!["appointment_scheduled", "claim_rejected", "rehab_payment_update"].includes(event.action_type) && (
                <>
                  {expanded && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(event.key_data!).map(([k, v]) => {
                        if (v == null || v === "" || (Array.isArray(v) && !v.length)) return null
                        return (
                          <div key={k} className="flex gap-2 text-xs">
                            <span className="text-slate-400 shrink-0 w-28">{k.replace(/_/g, " ")}</span>
                            <span className="text-slate-700 font-medium">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    {expanded ? <><ChevronUp className="w-3 h-3" /> פחות</> : <><ChevronDown className="w-3 h-3" /> פרטים</>}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function BtlTimeline({ events, collapseAfter = 3 }: BtlTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  if (!events || events.length === 0) return null

  const visible = showAll ? events : events.slice(0, collapseAfter)
  const hidden = events.length - collapseAfter

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((ev, i) => (
          <motion.div
            key={ev.ts + i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <TimelineEventRow event={ev} />
          </motion.div>
        ))}
      </AnimatePresence>

      {hidden > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-sm text-slate-500 hover:text-slate-700 py-2 border border-dashed border-slate-200 rounded-lg transition hover:border-slate-400"
        >
          הצג עוד {hidden} עדכונים
        </button>
      )}
      {showAll && events.length > collapseAfter && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full text-sm text-slate-400 hover:text-slate-600 py-1 transition"
        >
          הסתר
        </button>
      )}
    </div>
  )
}
