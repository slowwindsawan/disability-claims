"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CommitteePrepChat from "@/components/committee-prep-chat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, ClipboardList, AlertCircle, CheckCircle2, X } from "lucide-react";
import Link from "next/link";

export default function CommitteePrepTestPage() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState("");
  const [language, setLanguage] = useState<"he" | "en">("he");
  const [showChat, setShowChat] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Auto-load case_id from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("case_id");
    if (stored) {
      setCaseId(stored);
      setIsConfigured(true);
    }
  }, []);

  const activeCaseId = caseId || manualOverride.trim();

  // ── Setup screen (shown only if no case_id in localStorage) ────────────────
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-lg mx-auto">
          <div className="mb-8 flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Committee Prep — Test Console</h1>
          </div>

          <Card className="p-8">
            <h2 className="text-lg font-semibold mb-6 text-slate-900">Configure Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Case ID</label>
                <input
                  type="text"
                  value={manualOverride}
                  onChange={(e) => setManualOverride(e.target.value)}
                  placeholder="Enter case ID"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === "Enter" && activeCaseId && setIsConfigured(true)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                <div className="flex gap-3">
                  {(["he", "en"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                        language === lang
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {lang === "he" ? "עברית" : "English"}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => setIsConfigured(true)}
                disabled={!activeCaseId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                Continue
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main view — mirrors dashboard medical_committee_scheduled UI ────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Back bar */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setIsConfigured(false)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Change case
          </button>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {activeCaseId}
          </span>
        </div>

        <div className="space-y-4">
          {/* ── Appointment banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">הוזמנת לוועדה רפואית</h3>
                <p className="text-sm text-blue-100">
                  פרטי התור יוטענו אוטומטית מהתיק על ידי הסוכן
                </p>
                <p className="text-xs text-blue-200 mt-1 opacity-80">
                  [ Test mode — case: {activeCaseId} ]
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Committee prep coach card ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">מאמן הכנה לוועדה רפואית</h3>
                <p className="text-sm text-slate-600 mt-1">
                  הסוכן שלנו יסביר לך מה לצפות בוועדה, יתרגל איתך תשובות לשאלות הרופאים, ויעזור לך לתאר את מצבך בצורה הטובה ביותר.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    onClick={() => setShowChat(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-sm"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    פתח מאמן הכנה לוועדה
                  </Button>
                  {/* Language toggle */}
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                    {(["he", "en"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`px-3 py-1.5 font-medium transition ${
                          language === lang
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {lang === "he" ? "עב" : "EN"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── What to bring checklist ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-amber-50 border border-amber-200 p-5"
          >
            <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              מה להביא לוועדה
            </h4>
            <ul className="space-y-2 text-sm text-amber-900">
              {[
                "תעודת זהות",
                "כל מסמך רפואי שלא הוגש עדיין",
                "תקצירי בדיקות (MRI, CT, נוירופסיכולוגי)",
                "רשימת תרופות ומינונים",
                "דיסקים עם צילומים רפואיים",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* ── Committee prep chat modal ── */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={(e) => e.target === e.currentTarget && setShowChat(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              >
                <button
                  onClick={() => setShowChat(false)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
                <CommitteePrepChat
                  caseId={activeCaseId}
                  language={language}
                  onClose={() => setShowChat(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
