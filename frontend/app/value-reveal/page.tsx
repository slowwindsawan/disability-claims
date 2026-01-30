"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
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
  strength_score?: number
}

export default function ValueRevealPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCaseSummary = async () => {
      try {
        let caseId = localStorage.getItem("case_id")
        const token = localStorage.getItem("access_token")

        if (!token) {
          console.error("❌ Missing access_token - redirecting to login")
          setLoading(false)
          router.push('/')
          return
        }

        // Case ID is optional - if missing, we'll try to fetch user's latest case
        if (!caseId) {
          console.warn("⚠️ No case_id in localStorage, attempting to fetch from profile")
          try {
            const profileResponse = await fetch(`${BACKEND_BASE_URL}/user/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json()
              caseId = profileData?.profile?.case_id || profileData?.profile?.latest_case_id || profileData?.case_id || profileData?.latest_case_id
              if (caseId) {
                localStorage.setItem('case_id', caseId)
                console.log('✅ Retrieved case_id from profile:', caseId)
              }
            }
          } catch (e) {
            console.error('Failed to fetch profile for case_id:', e)
          }
        }

        // If still no case_id, fetch all cases and use the first one
        if (!caseId) {
          console.warn("⚠️ Still no case_id, fetching all user cases from database")
          try {
            let userId = localStorage.getItem("user_id")
            const casesResponse = await fetch(`${BACKEND_BASE_URL}/cases?user_id=${userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (casesResponse.ok) {
              const casesData = await casesResponse.json()
              const cases = Array.isArray(casesData) ? casesData : casesData.cases || casesData.data || []
              
              if (cases.length > 0) {
                caseId = cases[0].id || cases[0].case_id
                if (caseId) {
                  localStorage.setItem('case_id', caseId)
                  console.log('✅ Retrieved case_id from first case in list:', caseId)
                }
              }
              
              // Get user_id from the response payload if not already set
              if (!userId && casesData?.user_id) {
                userId = casesData.user_id
                localStorage.setItem('user_id', userId)
                console.log('✅ Retrieved user_id from response payload:', userId)
              }
            }
          } catch (e) {
            console.error('Failed to fetch cases list:', e)
          }
        }

        if (!caseId) {
          console.warn("⚠️ No case_id available - cannot load case summary")
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

  const handleProceedToPayment = () => {
    try {
      const caseId = localStorage.getItem("case_id")
      
      if (!caseId) {
        console.warn("⚠️ No case_id available")
        return
      }

      console.log("💳 Proceeding to checkout for case:", caseId)
      
      // Navigate to checkout page with case_id
      router.push(`/checkout?case_id=${caseId}`)
    } catch (error) {
      console.error("❌ Error proceeding to checkout:", error)
    }
  }

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
                {language === "he" ? "ניתוח התיק הושלם" : "Case Analysis Complete"}
              </h2>
              {caseSummary?.case_summary && (
                <p className="text-lg text-slate-600 mb-6">
                  {caseSummary.case_summary}
                </p>
              )}
              <p className="text-base text-slate-700">
                {language === "he" 
                  ? "תודה על השיתוף פעולה והבנתכם."
                  : "Thank you for your cooperation and understanding."}
              </p>
            </div>
            {caseSummary?.risk_assessment && (
              <div className="border-t pt-6 mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {language === "he" ? "הערכת סיכון" : "Risk Assessment"}
                </h3>
                <p className="text-slate-700">{caseSummary.risk_assessment}</p>
              </div>
            )}
            {caseSummary?.key_legal_points && caseSummary.key_legal_points.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {language === "he" ? "נקודות חשובות" : "Key Points"}
                </h3>
                <ul className="space-y-2">
                  {caseSummary.key_legal_points.map((point, index) => (
                    <li key={index} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-slate-400 flex-shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <>
          {/* Analysis Summary Section with Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="max-w-6xl mx-auto px-4 pb-32"
          >
            {/* Scores Grid - Top Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Strength Score Card */}
              {caseSummary?.strength_score !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.9 }}
                >
                  <Card className="p-8 bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm border border-blue-200 shadow-xl h-full flex flex-col items-center justify-center">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">
                      {language === "he" ? "דירוג חוזק התביעה" : "Claim Strength"}
                    </h3>
                    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          stroke="#3b82f6"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(caseSummary.strength_score / 100) * 339.3} 339.3`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-4xl font-bold text-blue-600">{caseSummary.strength_score}</div>
                        <div className="text-sm text-blue-600">/100</div>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 text-center">
                      {language === "he" 
                        ? "איכות ומלאות הנתונים שנאספו"
                        : "Quality & completeness of data"}
                    </p>
                  </Card>
                </motion.div>
              )}

              {/* Approval Chance Card */}
              {caseSummary?.chance_of_approval !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.0 }}
                >
                  <Card className="p-8 bg-gradient-to-br from-emerald-50 to-emerald-100/50 backdrop-blur-sm border border-emerald-200 shadow-xl h-full flex flex-col items-center justify-center">
                    <h3 className="text-lg font-semibold text-emerald-900 mb-4">
                      {language === "he" ? "סיכוי להסכמה" : "Approval Chance"}
                    </h3>
                    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          stroke="#10b981"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(caseSummary.chance_of_approval / 100) * 339.3} 339.3`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-4xl font-bold text-emerald-600">{caseSummary.chance_of_approval}</div>
                        <div className="text-sm text-emerald-600">%</div>
                      </div>
                    </div>
                    <p className="text-sm text-emerald-700 text-center">
                      {language === "he" 
                        ? "הסתברות להסכמת התביעה"
                        : "Probability of claim approval"}
                    </p>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Details Grid - Bottom Section */}
            <div className="grid grid-cols-1 gap-6">
              {/* Case Summary Card */}
              {caseSummary?.case_summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 }}
                >
                  <Card className="p-6 bg-white/70 backdrop-blur-sm border-white/50 shadow-xl">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">
                      {language === "he" ? "סיכום התיק" : "Case Summary"}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">{caseSummary.case_summary}</p>
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
                onClick={handleProceedToPayment}
                size="lg"
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white py-6 text-lg font-bold rounded-xl shadow-2xl transition-all hover:shadow-3xl"
              >
                {language === "he" ? "💳 עבור לתשלום" : "💳 Proceed to Payment"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
