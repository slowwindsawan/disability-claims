"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, RefreshCw, CopyCheck as CloudCheck, Download } from "lucide-react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"

type SyncStatus = "not_installed" | "stale" | "fresh" | "syncing"

export default function ExtensionSyncWidget() {
  const { language, t } = useLanguage()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("not_installed")
  const [lastSyncTime, setLastSyncTime] = useState<string>("14/12/2025, 10:00")
  const dir = language === "he" ? "rtl" : "ltr"

  useEffect(() => {
    const statuses: SyncStatus[] = ["not_installed", "fresh"]
    let index = 0
    const interval = setInterval(() => {
      index = (index + 1) % statuses.length
      setSyncStatus(statuses[index])
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const handleSync = () => {
    setSyncStatus("syncing")
    window.open("https://ps.btl.gov.il/", "_blank")
    setTimeout(() => {
      setSyncStatus("fresh")
      setLastSyncTime(new Date().toLocaleString(language === "he" ? "he-IL" : "en-US"))
    }, 3000)
  }

  const handleInstall = () => {
    window.open("https://chrome.google.com/webstore", "_blank")
  }

  // State A: Not Installed
  if (syncStatus === "not_installed") {
    return (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <p className="font-semibold">{t("extension.widget.not_installed")}</p>
            </div>
            <Button onClick={handleInstall} size="sm" className="bg-white text-blue-700 hover:bg-blue-50 flex-shrink-0">
              <Download className="w-4 h-4 mr-2" />
              {t("extension.widget.install")}
            </Button>
          </div>
        </Card>
      </motion.div>
    )
  }

  // State B: Stale (>3 days) - HIDDEN
  // Skipped to avoid showing status update required message

  // State C: Syncing
  if (syncStatus === "syncing") {
    return (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "linear" }}
            >
              <RefreshCw className="w-5 h-5" />
            </motion.div>
            <p className="font-semibold">{t("extension.widget.syncing")}</p>
          </div>
        </Card>
      </motion.div>
    )
  }

  // State D: Fresh (<24 hours)
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="group relative">
        <Card className="p-3 bg-green-50 border-green-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CloudCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-900">{t("extension.widget.fresh")}</span>
            </div>
          </div>
        </Card>

        {/* Tooltip */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <Card className="p-2 bg-slate-900 text-white text-xs whitespace-nowrap border-0 shadow-xl">
            {t("extension.widget.last_update")}: {lastSyncTime}
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
