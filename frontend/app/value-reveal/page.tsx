"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Wallet, GraduationCap, Home, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card" 
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { BACKEND_BASE_URL } from '@/variables'

interface CaseSummary {
  call_summary?: string
  case_summary?: string
  documents_requested_list?: string[]
  key_legal_points?: string[]
  risk_assessment?: string
  estimated_claim_amount?: string | number
  degree_funding?: string | number
  monthly_allowance?: string | number
  income_tax_exemption?: boolean
  living_expenses?: string | number
  chance_of_approval?: number
}

export default function ValueRevealPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [reanalyzingLoading, setReanalyzingLoading] = useState(false)

  useEffect(() => {
    const fetchCaseSummary = async () => {
      try {
        const caseId = localStorage.getItem("case_id")
        const token = localStorage.getItem("access_token")

        if (!caseId || !token) {
          console.error("❌ Missing case_id or access_token")
          console.error("case_id:", caseId)
          console.error("token:", token)
          setLoading(false)
          return
        }

        console.log("📥 Fetching case data from database for case:", caseId)
        const apiUrl = `${BACKEND_BASE_URL}/cases/${caseId}`
        console.log("📍 API URL:", apiUrl)
        console.log("🔐 Token:", token.substring(0, 20) + "...")
        
        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        console.log("📊 Response status:", response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("❌ Failed to fetch case data:", response.statusText)
          console.error("❌ Error response:", errorText)
          setLoading(false)
          return
        }

        const caseData = await response.json()
        console.log("✅ Case data fetched from DB:", caseData)

        // Extract call_summary from the response - handle both nested and flat structures
        let callSummary = caseData.case?.call_summary || caseData.call_summary || caseData.analysis
        
        if (callSummary) {
          try {
            // Parse if it's a string, otherwise use as-is
            const parsed = typeof callSummary === "string" ? JSON.parse(callSummary) : callSummary
            setCaseSummary(parsed)
            console.log("✅ Case summary extracted from database:", parsed)
          } catch (e) {
            console.error("Failed to parse call_summary:", e)
            setLoading(false)
          }
        } else {
          console.warn("⚠️ No call_summary found in response")
          console.warn("⚠️ Full response structure:", JSON.stringify(caseData, null, 2))
        }
      } catch (error) {
        console.error("❌ Error fetching case summary:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCaseSummary()
  }, [])

  const handleReanalyze = async () => {
    try {
      const caseId = localStorage.getItem("case_id")
      const token = localStorage.getItem("access_token")

      if (!caseId || !token) {
        console.error("❌ Missing case_id or access_token")
        return
      }

      setReanalyzingLoading(true)
      console.log("🔄 Starting re-analysis for case:", caseId)

      const response = await fetch(
        `${BACKEND_BASE_URL}/vapi/re-analyze-call/${caseId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        console.error("❌ Re-analysis failed:", response.statusText)
        return
      }

      const result = await response.json()
      console.log("✅ Re-analysis completed:", result)

      // Update the case summary with the new analysis
      if (result.analysis) {
        setCaseSummary(result.analysis)
        console.log("✅ Case summary updated with new analysis")
      }
    } catch (error) {
      console.error("❌ Error during re-analysis:", error)
    } finally {
      setReanalyzingLoading(false)
    }
  }

  // Extract estimated amount, fallback to "N/A"
  const getEstimatedAmount = () => {
    const amount = caseSummary?.estimated_claim_amount
    if (amount === undefined || amount === null) return "N/A"
    if (typeof amount === "number") return `₪${amount.toLocaleString()}`
    if (typeof amount === "string" && amount !== "N/A" && amount !== "Unknown") return `₪${amount}`
    return amount
  }
  const estimatedAmount = getEstimatedAmount()

  // Check if approval chance is less than 20%
  const isLowApprovalChance = caseSummary?.chance_of_approval !== undefined && caseSummary.chance_of_approval < 20

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col" dir={dir}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center pt-12 pb-8 px-4"
      >
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg mb-6">
          <span className="text-lg font-semibold text-foreground">{t("value_reveal.analysis_complete")}</span>
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        {!isLowApprovalChance && (
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">{t("value_reveal.potential_title")}</p>
        )}
      </motion.div>

      {/* Low Approval Chance Message */}
      {isLowApprovalChance ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-1 flex items-center justify-center px-4 py-12"
        >
          <div className="max-w-2xl bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                {language === "he" ? "לא ניתן להמשיך בתביעה" : "Unable to Proceed with Claim"}
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                {language === "he" 
                  ? `סיכוי ההסכמה לתביעה הוא ${caseSummary?.chance_of_approval}%. בשלב זה, אין בסיס רפואי מספיק להמשך בתהליך.`
                  : `The approval chance for your claim is ${caseSummary?.chance_of_approval}%. At this stage, there is insufficient medical basis to proceed with the claim.`}
              </p>
              <p className="text-base text-slate-700">
                {language === "he" 
                  ? "תודה על השיתוף פעולה והבנתכם."
                  : "Thank you for your cooperation and understanding."}
              </p>
            </div>
            <div className="border-t pt-6">
              <h3 className="font-semibold text-slate-900 mb-3">
                {language === "he" ? "הערות משפטיות:" : "Legal Notes:"}
              </h3>
              {caseSummary?.key_legal_points && caseSummary.key_legal_points.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {caseSummary.key_legal_points.map((point, index) => (
                    <li key={index} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-slate-400 flex-shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Hero Section - Big Number */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-12 px-4"
          >
            <div className="relative inline-block">
              {/* Glow effect behind the number */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 blur-3xl opacity-30 rounded-full"></div>

              <div className="relative">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  className="text-6xl md:text-8xl font-bold bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4"
                >
                  {estimatedAmount}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="text-xl md:text-2xl font-medium text-slate-700"
                >
                  {t("value_reveal.retroactive_payment")}
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Analysis Details Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="max-w-5xl mx-auto px-4 pb-32"
          >
            <div className="space-y-6">
              {/* Chance of Approval Card */}
              {caseSummary?.chance_of_approval !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.9 }}
                >
                  <Card className="p-6 bg-white/70 backdrop-blur-sm border-white/50 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {language === "he" ? "סיכוי ההסכמה" : "Chance of Approval"}
                      </h3>
                      <div className="text-3xl font-bold text-emerald-600">{caseSummary.chance_of_approval}%</div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Risk Assessment Card */}
              {caseSummary?.risk_assessment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.0 }}
                >
                  <Card className="p-6 bg-white/70 backdrop-blur-sm border-white/50 shadow-xl">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">
                      {language === "he" ? "הערכת סיכון" : "Risk Assessment"}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">{caseSummary.risk_assessment}</p>
                  </Card>
                </motion.div>
              )}

              {/* Key Legal Points Card */}
              {caseSummary?.key_legal_points && caseSummary.key_legal_points.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 }}
                >
                  <Card className="p-6 bg-white/70 backdrop-blur-sm border-white/50 shadow-xl">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      {language === "he" ? "נקודות משפטיות חשובות" : "Key Legal Points"}
                    </h3>
                    <ul className="space-y-2">
                      {caseSummary.key_legal_points.map((point, index) => (
                        <li key={index} className="flex gap-3 text-slate-700">
                          <span className="text-emerald-600 flex-shrink-0 font-semibold">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Sticky Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl"
          >
            <div className="max-w-5xl mx-auto px-4 py-6">
              <Button
                onClick={() => {
                  const caseId = localStorage.getItem("case_id")
                  if (caseId) {
                    router.push(`/checkout?case_id=${caseId}`)
                  } else {
                    router.push("/checkout")
                  }
                }}
                size="lg"
                className="w-full bg-gradient-to-l from-slate-900 via-blue-900 to-slate-900 hover:from-slate-800 hover:via-blue-800 hover:to-slate-800 text-white py-8 text-xl font-bold rounded-xl shadow-2xl transition-all hover:shadow-3xl"
              >
                {t("value_reveal.cta_button")}
              </Button>
              <p className="text-center text-slate-600 text-sm mt-3">{t("value_reveal.cta_subtitle")}</p>
            </div>
          </motion.div>

          {/* Trust Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.5 }}
            className="fixed bottom-32 left-0 right-0 text-center"
          >
            <div className="inline-flex items-center gap-2 bg-slate-100/80 backdrop-blur-sm rounded-full px-6 py-2">
              <span className="text-sm font-medium text-slate-600">{t("value_reveal.disability_sections")}</span>
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
