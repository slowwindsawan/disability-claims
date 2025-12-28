"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, CheckCircle2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

type LoginState = "phone" | "otp" | "success"

export default function LoginPage() {
  const router = useRouter()
  const [state, setState] = useState<LoginState>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [countdown, setCountdown] = useState(30)
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    if (state === "otp" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [state, countdown])

  useEffect(() => {
    if (state === "success") {
      setTimeout(() => {
        router.push("/")
      }, 2000)
    }
  }, [state, router])

  const handleSendCode = () => {
    if (phone.length >= 9) {
      setState("otp")
      setCountdown(30)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0]
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus()
    }

    // Check if all digits are entered
    if (newOtp.every((digit) => digit !== "")) {
      // Simulate verification
      setTimeout(() => {
        setState("success")
      }, 500)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus()
    }
  }

  const maskedPhone = phone.slice(0, 3) + "..." + phone.slice(-2)

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4" dir="rtl">
      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">ZeroTouch Claims</h1>
        </div>
      </motion.div>

      {/* Main Card */}
      <AnimatePresence mode="wait">
        {/* State A: Phone Entry */}
        {state === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-slate-900 mb-3">היי, בוא נתחבר</h2>
              <p className="text-lg text-slate-600">הכנס את הנייד לקבלת קוד אימות</p>
            </div>

            <div className="space-y-6">
              {/* Phone Input */}
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">972+</div>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="50-123-4567"
                  className="w-full h-16 pr-20 text-lg text-right border-2 border-slate-300 focus:border-blue-600 rounded-xl"
                  maxLength={10}
                />
              </div>

              <Button
                onClick={handleSendCode}
                disabled={phone.length < 9}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                שלח לי קוד ב-SMS
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-8 text-slate-500">
              <span className="text-sm">מבטיחים לא לשלוח ספאם</span>
              <Lock className="w-4 h-4" />
            </div>
          </motion.div>
        )}

        {/* State B: OTP Verification */}
        {state === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">הקוד נשלח ל-{maskedPhone}</h2>
              <button
                onClick={() => setCountdown(30)}
                disabled={countdown > 0}
                className={`text-sm font-medium ${countdown > 0 ? "text-slate-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700"}`}
              >
                {countdown > 0
                  ? `לא קיבלת? שלח שוב (00:${countdown.toString().padStart(2, "0")})`
                  : "לא קיבלת? שלח שוב"}
              </button>
            </div>

            <div className="space-y-8">
              {/* OTP Input - 4 boxes */}
              <div className="flex justify-center gap-3 rtl:flex-row-reverse" dir="ltr">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-16 h-16 text-center text-2xl font-bold border-2 border-slate-300 focus:border-blue-600 rounded-xl"
                    maxLength={1}
                  />
                ))}
              </div>

              <Button
                onClick={() => setState("success")}
                disabled={otp.some((digit) => digit === "")}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                אמת והכנס
              </Button>
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => setState("phone")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                שנה מספר טלפון
              </button>
            </div>
          </motion.div>
        )}

        {/* State C: Success */}
        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="mb-6 flex justify-center"
            >
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-slate-900 mb-3"
            >
              אימות בוצע בהצלחה!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-slate-600"
            >
              מעביר אותך לדף הבית...
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
