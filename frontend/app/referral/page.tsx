"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Gift, Copy, Check, Users, Share2, Shield, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Referral {
  id: string
  name: string
  status: "clicked" | "signed_up" | "approved"
  rewardStatus: "pending" | "earned"
  date: string
}

const mockReferrals: Referral[] = [
  {
    id: "1",
    name: "דניאל לוי",
    status: "approved",
    rewardStatus: "earned",
    date: "15.01.2025",
  },
  {
    id: "2",
    name: "מיכל כהן",
    status: "signed_up",
    rewardStatus: "pending",
    date: "18.01.2025",
  },
  {
    id: "3",
    name: "יוסי אברהם",
    status: "clicked",
    rewardStatus: "pending",
    date: "20.01.2025",
  },
]

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const [referrals] = useState<Referral[]>(mockReferrals)

  const referralLink = "https://zerotouch.co.il/ref/israel88"
  const whatsappMessage = `היי, בדקתי זכאות ב-ZeroTouch וזה נראה מבטיח. שווה לך לבדוק גם: ${referralLink}`

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsAppShare = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage)
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank")
  }

  const getStatusBadge = (status: Referral["status"]) => {
    const statusConfig = {
      clicked: { label: "לחץ על הקישור", className: "bg-blue-100 text-blue-700" },
      signed_up: { label: "נרשם", className: "bg-amber-100 text-amber-700" },
      approved: { label: "תיק אושר", className: "bg-green-100 text-green-700" },
    }
    return statusConfig[status]
  }

  const earnedRewards = referrals.filter((r) => r.rewardStatus === "earned").length

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="ghost">חזרה לדשבורד</Button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">ZeroTouch Claims</h1>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl mb-6"
          >
            <Gift className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 text-balance">
            עזור לחברים לקבל את מה שמגיע להם.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto text-balance">
            מכיר עוד מישהו שסובל מבעיה רפואית? שלח לו את הלינק. אם התיק שלו ייפתח, שניכם תקבלו שובר מתנה בשווי{" "}
            <span className="font-bold text-blue-600">₪200</span>.
          </p>
        </motion.div>

        {/* Sharing Tool */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="p-8 mb-8 shadow-lg bg-white">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Share2 className="w-6 h-6 text-blue-600" />
              שתף את הקישור שלך
            </h3>

            {/* Unique Link */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">הקישור האישי שלך</label>
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-slate-50 border-slate-300 text-slate-900 font-mono text-sm"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      הועתק!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 ml-2" />
                      העתק
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* WhatsApp Button */}
            <Button
              onClick={handleWhatsAppShare}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-6 text-lg"
            >
              <svg className="w-6 h-6 ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              שלח לחבר בוואטסאפ
            </Button>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-200">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{referrals.length}</p>
                <p className="text-sm text-slate-600 mt-1">חברים שהזמנת</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{earnedRewards}</p>
                <p className="text-sm text-slate-600 mt-1">פרסים שהרווחת</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tracker */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="p-8 shadow-lg bg-white">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              החברים שהזמנת
            </h3>

            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 text-lg">עדיין לא הזמנת חברים.</p>
                <p className="text-slate-500 text-sm mt-2">שתף את הקישור שלך כדי להתחיל</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral, index) => (
                  <motion.div
                    key={referral.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {referral.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{referral.name}</p>
                        <p className="text-sm text-slate-500">{referral.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={getStatusBadge(referral.status).className}>
                        {getStatusBadge(referral.status).label}
                      </Badge>
                      {referral.rewardStatus === "earned" ? (
                        <Badge className="bg-green-500 text-white">
                          <Gift className="w-3 h-3 ml-1" />
                          ₪200
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">
                          ממתין
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Terms */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Lock className="w-4 h-4" />
            <p>בכפוף לתקנון. המתנה תישלח לאחר פתיחת תיק.</p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
