"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2, XCircle, Calendar, FileText, Briefcase,
  TrendingUp, AlertCircle, ClipboardList, Info, Download, ChevronLeft, ChevronRight
} from "lucide-react"
import type { BtlLetterEntry } from "@/lib/caseApi"

interface LettersTimelineProps {
  letters: BtlLetterEntry[]
  /** letter_date of the currently active/latest letter */
  activeDateKey?: string | null
}

const ACTION_CONFIG: Record<string, {
  icon: any
  border: string
  bg: string
  badge: string
  badgeText: string
}> = {
  claim_submitted:       { icon: FileText,      border: "border-indigo-400", bg: "bg-indigo-50",  badge: "bg-indigo-100 text-indigo-700",  badgeText: "הגשה" },
  appointment_scheduled: { icon: Calendar,      border: "border-cyan-400",   bg: "bg-cyan-50",    badge: "bg-cyan-100 text-cyan-700",       badgeText: "ועדה" },
  claim_approved:        { icon: CheckCircle2,  border: "border-green-400",  bg: "bg-green-50",   badge: "bg-green-100 text-green-700",     badgeText: "אושר" },
  claim_rejected:        { icon: XCircle,       border: "border-red-400",    bg: "bg-red-50",     badge: "bg-red-100 text-red-700",         badgeText: "נדחה" },
  rehab_approved:        { icon: Briefcase,     border: "border-teal-400",   bg: "bg-teal-50",    badge: "bg-teal-100 text-teal-700",       badgeText: "שיקום" },
  rehab_payment_update:  { icon: TrendingUp,    border: "border-blue-400",   bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-700",       badgeText: "תשלום" },
  waiting_for_docs:      { icon: AlertCircle,   border: "border-yellow-400", bg: "bg-yellow-50",  badge: "bg-yellow-100 text-yellow-700",   badgeText: "מסמכים" },
  form_pending:          { icon: ClipboardList, border: "border-orange-400", bg: "bg-orange-50",  badge: "bg-orange-100 text-orange-700",   badgeText: "טופס" },
  informational:         { icon: Info,          border: "border-slate-300",  bg: "bg-slate-50",   badge: "bg-slate-100 text-slate-600",     badgeText: "עדכון" },
}
const DEFAULT_CONFIG = ACTION_CONFIG.informational

function fmtDate(iso?: string | null) {
  if (!iso) return ""
  const [, m, d] = iso.slice(0, 10).split("-")
  const y = iso.slice(0, 4)
  return `${d}/${m}/${y}`
}

export function LettersTimeline({ letters, activeDateKey }: LettersTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!letters.length) return null

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          מכתבים מביטוח לאומי ({letters.length})
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("right")}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="הקודם"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("left")}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="הבא"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        dir="rtl"
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {letters.map((letter, i) => {
          const cfg = ACTION_CONFIG[letter.action_type] ?? DEFAULT_CONFIG
          const Icon = cfg.icon
          const isLatest = i === letters.length - 1
          const isActive = activeDateKey
            ? (letter.letter_date || "").slice(0, 10) === activeDateKey.slice(0, 10)
            : isLatest

          return (
            <motion.div
              key={`${letter.letter_date}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={[
                "shrink-0 w-52 rounded-xl border-2 p-4 flex flex-col gap-2 relative",
                cfg.bg, cfg.border,
                isActive ? "ring-2 ring-offset-1 ring-blue-400 shadow-md" : "shadow-sm",
              ].join(" ")}
            >
              {isLatest && (
                <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                  נוכחי
                </span>
              )}

              <div className="flex items-start gap-2 mt-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.badge}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{letter.title_he}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(letter.letter_date)}</p>
                </div>
              </div>

              <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.badgeText}
              </span>

              {letter.summary && (
                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{letter.summary}</p>
              )}

              {letter.download_url ? (
                <a
                  href={letter.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  הורד PDF
                </a>
              ) : (
                <span className="mt-auto text-[10px] text-slate-400 italic">PDF לא זמין</span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
