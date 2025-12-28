"use client"

import { useState, useEffect } from "react"
import { FileSignature, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { BACKEND_BASE_URL } from '@/variables'

interface DocumentSigningIframeProps {
  onSigningComplete?: (documentId: string) => void
  onSigningStart?: () => void
  documentType?: "powerOfAttorney" | "medicalRecords" | "terms" | "confidentialityWaiver"
  disabled?: boolean
  caseId?: string
}

export function DocumentSigningIframe({
  onSigningComplete,
  onSigningStart,
  documentType = "powerOfAttorney",
  disabled = false,
  caseId,
}: DocumentSigningIframeProps) {
  const [signingLink, setSigningLink] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signStatus, setSignStatus] = useState<"idle" | "in-progress" | "signed" | "completed">("idle")
  const [showFinishButton, setShowFinishButton] = useState(false)

  const initSigning = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    setError(null)
    setSigningLink(null)
    setDocumentId(null)
    setShowFinishButton(false)
    setSignStatus("idle")

    try {
      onSigningStart?.()

      const token = localStorage.getItem("access_token")

      // Get user data from /me endpoint
      let userId = localStorage.getItem("user_id") || ""
      let name = ""
      let email = ""

      const apiBase = BACKEND_BASE_URL

      try {
        const meResponse = await fetch(`${apiBase}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (meResponse.ok) {
          const userData = await meResponse.json()
          console.log("User data from /me:", userData)

          if (!userId) {
            userId = userData.id || userData.profile?.user_id || ""
          }

          name = userData.profile?.full_name || userData.name || ""
          email = userData.email || userData.profile?.email || ""
        }
      } catch (e) {
        console.error("Failed to fetch user data:", e)
      }

      // Use fallback values if still missing
      if (!name) {
        name = email?.split("@")[0] || "User"
      }

      if (!email && userId) {
        email = `user_${userId}@temp.com`
      }

      console.log("E-Signature Data:", { userId, name, email, documentType })

      if (!userId && !email) {
        throw new Error("Cannot identify user - no userId or email available")
      }

      console.log("Calling BoldSign API...")
      const response = await fetch(`${apiBase}/boldsign/create-embed-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          name,
          email,
          documentType,
          caseId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("BoldSign API error:", errorData)
        throw new Error(errorData.detail || "Failed to create signing link")
      }

      const data = await response.json()
      console.log("BoldSign response:", data)
      setSigningLink(data.signingLink)
      setDocumentId(data.documentId)
      setSignStatus("in-progress")
      console.log("E-Signature setup complete!")
    } catch (err: any) {
      console.error("Failed to initialize BoldSign:", err)
      setError(err.message || "Failed to load signing session")
      setSignStatus("idle")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!disabled && signStatus === "idle" && !signingLink) {
      initSigning()
    }
  }, [disabled, documentType])

  useEffect(() => {
    // Listen for postMessage events from BoldSign iframe
    const handleMessage = (event: MessageEvent) => {
      console.log("Event received from iframe:", event.data)

      if (event.data && event.data.action === "onDocumentSigned") {
        console.log("BoldSign event: Signed — marking as completed.")
        setSignStatus("completed")
        // Immediately notify parent that signing is complete
        if (documentId) {
          onSigningComplete?.(documentId)
          // Track document signed status in backend and mark as completed
          console.log("📤 Sending signature complete request to backend...")
          markAsCompletedInternal(documentId).catch(err => {
            console.error("❌ Failed to mark signature complete:", err)
          })
          // Also track the document
          trackDocumentSigned(documentId, documentType).catch(err => {
            console.error("❌ Failed to track document signed:", err)
          })
        }
      }
    }

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [documentId, onSigningComplete])

  const trackDocumentSigned = async (docId: string, docType: string) => {
    try {
      const token = localStorage.getItem("access_token")
      const apiBase = BACKEND_BASE_URL
      
      if (!caseId) {
        console.warn("⚠️ No caseId available to track document signed")
        return
      }

      const response = await fetch(`${apiBase}/cases/${caseId}/document-signed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: docId,
          documentType: docType,
          signedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error tracking document signed:", errorData)
      } else {
        console.log(`✅ Document '${docType}' tracked as signed in backend`)
      }
    } catch (err) {
      console.error("Failed to track document signed:", err)
    }
  }

  const markAsCompletedInternal = async (docId: string) => {
    try {
      const token = localStorage.getItem("access_token")
      const apiBase = BACKEND_BASE_URL
      
      const payload = {
        documentId: docId,
        documentType,
        caseId,
      }
      
      console.log("📤 Sending signature-complete request with payload:", payload)
      
      const response = await fetch(`${apiBase}/boldsign/signature-complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      console.log("📥 Response status:", response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Error response from backend:", errorData)
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      } else {
        const responseData = await response.json()
        console.log("✅ Backend response:", responseData)
        console.log("✅ agreement_signed should now be TRUE in database")
      }
    } catch (err) {
      console.error("❌ Failed to mark signature as complete:", err)
      throw err
    }
  }

  const markAsCompleted = async () => {
    if (!documentId) return
    await markAsCompletedInternal(documentId)
    setSignStatus("completed")
  }

  const handleRetry = () => {
    setSigningLink(null)
    setDocumentId(null)
    setShowFinishButton(false)
    initSigning()
  }

  if (isLoading || (!signingLink && !error)) {
    return (
      <div className="w-full bg-slate-50 rounded-lg border border-slate-200 p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">{error ? "Error loading" : "Preparing signing..."}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 mb-2">Unable to Load Document</p>
              <p className="text-sm text-red-800 mb-4">{error}</p>
              <Button onClick={handleRetry} className="bg-red-600 hover:bg-red-700 text-white">
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-4">
      {/* Signing Iframe */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <iframe
          src={signingLink || ""}
          title={`BoldSign Embedded Signing - ${documentType}`}
          className="w-full"
          style={{ height: "500px", border: "none" }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>

      {/* Action Button */}
      <div className="text-center">
        {signStatus === "signed" && showFinishButton ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Button
              onClick={markAsCompleted}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Confirm Signature
            </Button>
            <p className="text-xs text-slate-500 mt-2">Click to finalize your signature</p>
          </motion.div>
        ) : signStatus === "completed" ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-lg font-semibold border border-green-200">
              <CheckCircle className="w-5 h-5" />
              Document Signed Successfully
            </div>
          </motion.div>
        ) : (
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium">
            <Loader2 size={18} className="animate-spin text-slate-500" />
            Waiting for signing to complete...
          </div>
        )}
      </div>
    </motion.div>
  )
}
