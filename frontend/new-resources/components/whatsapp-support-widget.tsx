"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function WhatsAppSupportWidget() {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()

  const handleWhatsAppClick = () => {
    router.push("/conversation")
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Card className="w-80 bg-white shadow-2xl border-0 overflow-hidden">
              {/* Header */}
              <div className="bg-[#25D366] px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">צוות ZeroTouch זמין עבורך</span>
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Profile section */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    דן
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-100 rounded-2xl rounded-tr-none px-4 py-3 text-right">
                      <p className="text-slate-800 text-sm leading-relaxed">
                        היי, ראיתי שאתה באמצע תהליך. צריך עזרה במשהו?
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-right">דן, מנהל תיקים</p>
                  </div>
                </div>

                {/* Response time */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg py-2">
                  <span className="font-medium">⏱️ זמן מענה ממוצע: 4 דקות</span>
                </div>

                {/* WhatsApp CTA */}
                <Button
                  onClick={handleWhatsAppClick}
                  className="w-full bg-[#25D366] hover:bg-[#20BA59] text-white py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  <MessageCircle className="w-5 h-5 ml-2" />
                  פתח צ'אט בוואטסאפ
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative bg-[#25D366] hover:bg-[#20BA59] text-white rounded-full shadow-2xl hover:shadow-3xl transition-all group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="WhatsApp support"
      >
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="hidden group-hover:inline-block text-sm font-medium whitespace-nowrap animate-in slide-in-from-left-2">
            דבר עם מנהל תיק
          </span>
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {/* Notification Badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
              1
            </div>
          </div>
        </div>
      </motion.button>
    </div>
  )
}
