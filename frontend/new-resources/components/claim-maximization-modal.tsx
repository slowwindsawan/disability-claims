"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Car, HandHeart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"

interface ClaimMaximizationModalProps {
  isOpen: boolean
  onClose: () => void
  eligibleBenefits: {
    mobility?: boolean
    specialServices?: boolean
  }
}

export function ClaimMaximizationModal({ isOpen, onClose, eligibleBenefits }: ClaimMaximizationModalProps) {
  const router = useRouter()
  const [selectedBenefits, setSelectedBenefits] = useState({
    mobility: eligibleBenefits.mobility || false,
    specialServices: eligibleBenefits.specialServices || false,
  })

  const mobilityValue = 2400
  const specialServicesValue = 5600
  const baseFee = 150

  const calculateTotal = () => {
    let total = 0
    if (selectedBenefits.mobility) total += mobilityValue
    if (selectedBenefits.specialServices) total += specialServicesValue
    return total
  }

  const handleContinue = () => {
    router.push("/value-reveal")
  }

  const handleSkip = () => {
    router.push("/value-reveal")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          dir="rtl"
        >
          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute left-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header with Icon */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="mb-2 text-3xl font-bold text-slate-900">רגע לפני שממשיכים... זיהינו הזדמנות.</h2>
              <p className="text-lg text-slate-600">בנוסף לנכות הכללית, הניתוח הקולי הצביע על זכאות לקצבאות נוספות.</p>
            </div>

            {/* Bundle Cards */}
            <div className="mb-6 space-y-4">
              {/* Mobility Card */}
              {eligibleBenefits.mobility && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    selectedBenefits.mobility
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedBenefits.mobility}
                      onCheckedChange={(checked) =>
                        setSelectedBenefits((prev) => ({ ...prev, mobility: checked as boolean }))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                          <Car className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">קצבת ניידות</h3>
                      </div>
                      <p className="mb-2 text-lg font-medium text-green-600">
                        תוספת מוערכת: עד ₪{mobilityValue.toLocaleString()}/חודש
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-blue-600">
                          תוספת דמי טיפול בגין עריכת טופס נפרד: +₪{baseFee}
                        </span>{" "}
                        (במקום ₪800)
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Special Services Card */}
              {eligibleBenefits.specialServices && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`rounded-xl border-2 p-6 transition-all ${
                    selectedBenefits.specialServices
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedBenefits.specialServices}
                      onCheckedChange={(checked) =>
                        setSelectedBenefits((prev) => ({ ...prev, specialServices: checked as boolean }))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                          <HandHeart className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">שירותים מיוחדים</h3>
                      </div>
                      <p className="mb-2 text-lg font-medium text-green-600">
                        תוספת מוערכת: עד ₪{specialServicesValue.toLocaleString()}/חודש
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-blue-600">
                          תוספת דמי טיפול בגין עריכת טופס נפרד: +₪{baseFee}
                        </span>{" "}
                        (במקום ₪800)
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Summary Footer */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-slate-700">שווי פוטנציאלי כולל:</span>
                <span className="text-3xl font-bold text-blue-600">₪{calculateTotal().toLocaleString()}</span>
              </div>

              {/* Primary Button */}
              <Button onClick={handleContinue} size="lg" className="mb-3 w-full bg-blue-600 text-lg hover:bg-blue-700">
                עדכן את התיק שלי והמשך (הכי משתלם) 🚀
              </Button>

              {/* Secondary Link */}
              <button onClick={handleSkip} className="w-full text-center text-sm text-slate-500 hover:text-slate-700">
                לא תודה, אסתפק בנכות כללית בלבד
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
