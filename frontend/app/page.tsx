"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { BACKEND_BASE_URL } from '@/variables'
import {
  Shield,
  Check,
  X,
  CheckCircle,
  Users,
  TrendingUp,
  Clock,
  Award,
  Languages,
  DollarSign,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import WhatsAppSupportWidget from "@/components/whatsapp-support-widget"
import LegalTechFooter from "@/components/legaltech-footer"
import { useLanguage } from "@/lib/language-context"
import { useUserContext } from "@/lib/user-context"
import Link from "next/link"
import * as legacyApi from "../../src/lib/api"
import { EligibilityQuestionnaire } from "@/components/eligibility-questionnaire"
import { AILawyerWrapper } from "@/components/ai-lawyer-wrapper"

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email") // Default to email
  const [otpState, setOtpState] = useState<"phone" | "code" | "success" | "signup" | "eligibility" | "wizard" | "ai-lawyer">("phone")
  const [phone, setPhone] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", ""])
  const [email, setEmail] = useState("demo1@demo.com")
  const [password, setPassword] = useState("Qwert@123")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [signupError, setSignupError] = useState("")
  const [signupLoading, setSignupLoading] = useState(false)
  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { intakeData, updateIntakeData } = useUserContext()
  const isRTL = language === "he"
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)

  // keep logged-in state in sync with localStorage across tabs
  React.useEffect(() => {
    const check = () => setIsLoggedIn(!!localStorage.getItem('access_token'))
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  const questions = [t("questionnaire.question1"), t("questionnaire.question2"), t("questionnaire.question3")]

  const handleStartQuiz = async () => {
    setShowQuiz(true)
    
    // If already logged in, check if user has existing eligibility record
    if (isLoggedIn) {
      setIsCheckingEligibility(true)
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setOtpState("wizard")
          return
        }

        // Fetch user profile to check for eligibility records
        const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const userData = await response.json()
          const eligibilities = userData?.user?.eligibilities || []
          
          // If user has eligibility records, skip quiz and go directly to voice agent
          if (eligibilities && eligibilities.length > 0) {
            console.log('User has existing eligibility records, skipping quiz and going to voice agent')
            setOtpState("ai-lawyer")
          } else {
            // No existing records, show eligibility quiz
            setOtpState("wizard")
          }
        } else {
          // Error fetching user data, default to wizard
          setOtpState("wizard")
        }
      } catch (error) {
        console.error('Error checking eligibility records:', error)
        // Default to wizard on error
        setOtpState("wizard")
      } finally {
        setIsCheckingEligibility(false)
      }
    } else {
      // Not logged in, show login/signup
      setOtpState("phone")
    }
  }

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length >= 9) {
      setOtpState("code")
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...otpCode]
      newCode[index] = value
      setOtpCode(newCode)

      if (value && index < 3) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }

      if (newCode.every((digit) => digit !== "") && newCode.join("").length === 4) {
        setTimeout(() => {
          setOtpState("success")
          setTimeout(() => {
            if (isReturningUser) {
              router.push("/dashboard")
            } else {
              // Skip signup form and go directly to wizard
              setOtpState("wizard")
            }
          }, 1500)
        }, 300)
      }
    }
  }

  const handleAnswer = (answer: boolean) => {
    setAnswers([...answers, answer])
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setTimeout(() => {
        window.location.href = "/medical-documents"
      }, 500)
    }
  }

  const handleLoginModalOtp = (e: React.FormEvent) => {
    e.preventDefault()
    // Logic to handle OTP submission in the login modal
  }

  const [emailLogin, setEmailLogin] = useState("")
  const [passwordLogin, setPasswordLogin] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState("")

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")
    setEmailLoading(true)
    try {
      // First, try to login
      const loginRes: any = await legacyApi.apiLogin(emailLogin, passwordLogin)
      const token = loginRes?.data?.access_token || loginRes?.data?.accessToken
      if (token) {
        localStorage.setItem('access_token', token)
        setShowLoginModal(false)
        router.push('/dashboard')
        return
      }
    } catch (loginErr: any) {
      console.log('Login failed, attempting to create account:', loginErr)
      
      // If login failed, try to create a new account
      try {
        const signupRes = await fetch(`${BACKEND_BASE_URL}/signup-with-case`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailLogin,
            password: passwordLogin,
            name: emailLogin.split('@')[0],
          }),
        })

        if (!signupRes.ok) {
          const error = await signupRes.json()
          throw new Error(error.detail || 'Signup failed')
        }

        const data = await signupRes.json()
        console.log('Account created successfully:', data)
        
        // Store credentials and proceed to wizard
        setUserId(data.user_id)
        setCaseId(data.case_id)
        
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('user_id', data.user_id)
          localStorage.setItem('case_id', data.case_id)
        }

        // Close login modal and proceed to wizard
        setShowLoginModal(false)
        setShowQuiz(true)
        setOtpState("wizard")
        return
      } catch (signupErr: any) {
        console.error('Signup error:', signupErr)
        setEmailError(signupErr.message || 'Failed to login or create account')
      }
    } finally {
      setEmailLoading(false)
    }
  }

  const handleWizardNext = () => {
    if (wizardStep < 6) {
      setWizardStep(wizardStep + 1)
    } else {
      // Complete wizard and navigate
      router.push("/medical-documents")
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError("")

    if (password.length < 6) {
      setSignupError(isRTL ? "הסיסמה חייבת להכיל לפחות 6 תווים" : "Password must be at least 6 characters")
      return
    }

    setSignupLoading(true)
    try {
      // Create user account and case
      const response = await fetch(`${BACKEND_BASE_URL}/signup-with-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          phone: phone || undefined, // Only send phone if provided
          name: email.split('@')[0], // Use email prefix as default name
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Signup failed')
      }

      const data = await response.json()
      console.log('Signup successful:', data)
      
      // Store user_id and case_id for use throughout the flow
      setUserId(data.user_id)
      setCaseId(data.case_id)
      
      // Store token for authenticated requests
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user_id', data.user_id)
        localStorage.setItem('case_id', data.case_id)
      }

      // Skip OTP flow and move directly to wizard
      setOtpState("wizard")
    } catch (err: any) {
      console.error('Signup error:', err)
      setSignupError(err.message || (isRTL ? 'נכשל ביצירת חשבון' : 'Failed to create account'))
    } finally {
      setSignupLoading(false)
    }
  }

  const handleEligibilityComplete = async (answers: Record<string, string>) => {
    setEligibilityAnswers(answers)
    
    // Save eligibility answers to backend
    try {
      const token = localStorage.getItem('access_token')
      const currentCaseId = caseId || localStorage.getItem('case_id')
      
      if (currentCaseId && token) {
        console.log('Saving eligibility answers to case:', currentCaseId)
        const response = await fetch(`${BACKEND_BASE_URL}/cases/${currentCaseId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            metadata: { eligibility_answers: answers },
            description: `Eligibility answers collected at ${new Date().toISOString()}`,
          }),
        })
        
        if (response.ok) {
          console.log('Eligibility answers saved successfully')
        } else {
          console.error('Failed to save eligibility answers:', await response.text())
        }
      } else {
        console.warn('Cannot save eligibility answers: missing case_id or token')
      }
    } catch (err) {
      console.error('Failed to save eligibility answers:', err)
      // Continue anyway - don't block user flow
    }

    // Move to AI lawyer
    setOtpState("ai-lawyer")
  }

  const handleAILawyerComplete = () => {
    // After AI lawyer conversation, redirect to dashboard
    router.push("/dashboard")
  }

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1)
    }
  }

  const canProceed = () => {
    switch (wizardStep) {
      case 1:
        return intakeData.userStatus !== null
      case 2:
        return intakeData.claimReason !== null
      case 3:
        return intakeData.isWorkRelated !== null
      case 4:
        return intakeData.incomeBracket !== null
      case 5:
        return intakeData.functionalImpacts.length > 0
      case 6:
        return intakeData.documentsReady !== null
      default:
        return false
    }
  }

  const toggleFunctionalImpact = (impact: string) => {
    const current = intakeData.functionalImpacts
    const updated = current.includes(impact) ? current.filter((i) => i !== impact) : [...current, impact]
    updateIntakeData({ functionalImpacts: updated })
  }

  const progress = ((wizardStep - 1) / 6) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50" dir={isRTL ? "rtl" : "ltr"}>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="outline" className="flex items-center gap-2">
                  <span className="hidden sm:inline">{t("header.personal_area")}</span>
                  <Shield className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={() => setShowLoginModal(true)} className="flex items-center gap-2">
                <span className="hidden sm:inline">{t("header.personal_area")}</span>
                <Shield className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "he" ? "en" : "he")}
              className="flex items-center gap-2"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{language === "he" ? "EN" : "עב"}</span>
            </Button>
          </div>

          <Link href="/" className="flex items-center gap-2">
            {isRTL ? (
              <>
                <div className="text-2xl font-bold text-blue-600">ZeroTouch</div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-blue-600">ZeroTouch</div>
              </>
            )}
          </Link>
        </div>
      </motion.header>

      {!showQuiz ? (
        <>
          {/* Hero Section */}
          <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1
                className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight"
                style={{ direction: isRTL ? "rtl" : "ltr" }}
              >
                {t("hero.title")}
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                {t("hero.subtitle")}
              </p>
              <Button onClick={handleStartQuiz} size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                {t("hero.cta")}
              </Button>

              <p
                className="text-xs text-slate-500 mt-6 max-w-2xl mx-auto leading-relaxed"
                style={{ direction: isRTL ? "rtl" : "ltr" }}
              >
                {t("hero.legal_notice")}
              </p>
            </motion.div>
          </section>

          {/* How It Works Section */}
          <section className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className={`text-center mb-16 text-${isRTL ? "right" : "left"} md:text-center`}
              >
                <h2 className="text-4xl font-bold text-slate-900 mb-4" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("how_it_works.title")}
                </h2>
                <p className="text-xl text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("how_it_works.subtitle")}
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: CheckCircle,
                    title: t("how_it_works.check_eligibility"),
                    description: t("how_it_works.check_eligibility_description"),
                    step: "01",
                  },
                  {
                    icon: Users,
                    title: t("how_it_works.ai_legal_consultant"),
                    description: t("how_it_works.ai_legal_consultant_description"),
                    step: "02",
                  },
                  {
                    icon: TrendingUp,
                    title: t("how_it_works.compensation"),
                    description: t("how_it_works.compensation_description"),
                    step: "03",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="relative mb-6">
                      <div className="absolute -top-4 -right-4 text-6xl font-bold text-blue-50">{item.step}</div>
                      <div className="relative bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                        <item.icon className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {item.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Statistics Section */}
          <section className="py-32 bg-white">
            <div className="max-w-5xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className={`text-center mb-16 text-${isRTL ? "right" : "left"} md:text-center`}
              >
                <h2
                  className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
                  style={{ direction: isRTL ? "rtl" : "ltr" }}
                >
                  {t("stats.title")}
                </h2>
                <p className="text-xl text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("stats.subtitle")}
                </p>
              </motion.div>

              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { value: "12,000+", label: t("stats.happy_clients"), icon: Users, color: "text-blue-600" },
                  {
                    value: "₪42,500",
                    label: t("stats.average_compensation"),
                    icon: TrendingUp,
                    color: "text-green-600",
                  },
                  {
                    value: "3 " + t("stats.time_unit"),
                    label: t("stats.check_time"),
                    icon: Clock,
                    color: "text-purple-600",
                  },
                  { value: "94%", label: t("stats.success_rate"), icon: Award, color: "text-orange-600" },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4`}>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                    <div className={`text-3xl md:text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                    <div className="text-sm text-slate-600">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-slate-900 mb-4" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("benefits.title")}
                </h2>
                <p className="text-xl text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("benefits.subtitle")}
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    icon: Clock,
                    title: t("benefits.speed"),
                    description: t("benefits.speed_description"),
                    color: "text-blue-600",
                  },
                  {
                    icon: DollarSign,
                    title: t("benefits.cost"),
                    description: t("benefits.cost_description"),
                    color: "text-green-600",
                  },
                  {
                    icon: Shield,
                    title: t("benefits.availability"),
                    description: t("benefits.availability_description"),
                    color: "text-purple-600",
                  },
                  {
                    icon: CheckCircle,
                    title: t("benefits.transparency"),
                    description: t("benefits.transparency_description"),
                    color: "text-orange-600",
                  },
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-slate-50 p-6 rounded-xl hover:shadow-lg transition-shadow"
                  >
                    <benefit.icon className={`w-12 h-12 ${benefit.color} mb-4`} />
                    <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 text-sm" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {benefit.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-24 bg-gradient-to-br from-blue-600 to-blue-700">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2
                  className="text-4xl md:text-5xl font-bold text-white mb-6"
                  style={{ direction: isRTL ? "rtl" : "ltr" }}
                >
                  {t("cta.title")}
                </h2>
                <p className="text-xl text-blue-100 mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                  {t("cta.subtitle")}
                </p>
                <Button
                  onClick={handleStartQuiz}
                  size="lg"
                  className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-100"
                >
                  {t("cta.button")}
                </Button>
              </motion.div>
            </div>
          </section>

          <LegalTechFooter />
        </>
      ) : (
        <main className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="w-full max-w-md p-8 md:p-12 shadow-2xl bg-white rounded-2xl">
            <AnimatePresence mode="wait">
              {otpState === "phone" && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {isRTL ? "בואו נתחיל" : "Let's Get Started"}
                  </h2>
                  <p className="text-slate-600 text-sm mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {isRTL ? "צור חשבון כדי להתחיל את תהליך בדיקת הזכאות" : "Create an account to start your eligibility check"}
                  </p>

                  {/* Signup Method Tabs */}
                  <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg" dir={isRTL ? "rtl" : "ltr"}>
                    <button
                      type="button"
                      onClick={() => setSignupMethod("email")}
                      className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                        signupMethod === "email"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isRTL ? "📧 אימייל וסיסמה" : "📧 Email & Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupMethod("phone")}
                      className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                        signupMethod === "phone"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isRTL ? "📱 טלפון ו-SMS" : "📱 Phone & SMS"}
                    </button>
                  </div>

                  {signupError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                      {signupError}
                    </div>
                  )}

                  {/* Email Signup Form */}
                  {signupMethod === "email" && (
                    <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-2 text-right" dir={isRTL ? "rtl" : "ltr"}>
                      <label className="text-sm font-medium text-slate-700">
                        {isRTL ? "אימייל" : "Email"}
                      </label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="text-lg py-6"
                        required
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2 text-right" dir={isRTL ? "rtl" : "ltr"}>
                      <label className="text-sm font-medium text-slate-700">
                        {isRTL ? "סיסמה" : "Password"}
                      </label>
                      <Input
                        type="password"
                        placeholder={isRTL ? "לפחות 6 תווים" : "At least 6 characters"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-lg py-6"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2 text-right" dir={isRTL ? "rtl" : "ltr"}>
                      <label className="text-sm font-medium text-slate-700">
                        {isRTL ? "טלפון (אופציונלי)" : "Phone (Optional)"}
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="tel"
                          placeholder="50-123-4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 text-right text-lg py-6"
                          maxLength={10}
                        />
                        <div className="bg-slate-100 px-4 py-3 rounded-lg text-slate-600 font-medium">972+</div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg"
                        disabled={signupLoading}
                      >
                        {signupLoading ? "יוצר חשבון..." : "המשך לבדיקת זכאות"}
                      </Button>
                    </div>
                  </form>
                  )}

                  {/* Phone Signup Form */}
                  {signupMethod === "phone" && (
                    <form onSubmit={handlePhoneSubmit} className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Input
                          type="tel"
                          placeholder="50-123-4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 text-right text-lg py-6"
                          maxLength={10}
                        />
                        <div className="bg-slate-100 px-4 py-3 rounded-lg text-slate-600 font-medium">972+</div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg"
                        disabled={phone.length < 9}
                      >
                        {isRTL ? "שלח קוד אימות" : "Send Verification Code"}
                      </Button>
                    </form>
                  )}

                  <div className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-600">
                    <Shield className="w-4 h-4" />
                    <span>{isRTL ? "המידע שלך מוגן ומוצפן" : "Your information is protected and encrypted"}</span>
                  </div>
                </motion.div>
              )}

              {otpState === "code" && (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {isRTL ? "הזן קוד אימות" : "Enter Verification Code"}
                  </h2>
                  <p className="text-slate-600 text-sm mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {isRTL ? "שלחנו קוד בן 4 ספרות למספר" : "We sent a 4-digit code to"}
                    <span className="font-medium text-slate-900 mx-1">972-{phone}</span>
                  </p>

                  <div className="flex justify-center gap-3 mb-8" dir="ltr">
                    {otpCode.map((digit, index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        className="w-14 h-14 text-center text-2xl font-bold"
                      />
                    ))}
                  </div>

                  <Button variant="ghost" className="text-orange-600 hover:text-orange-700">
                    {isRTL ? "שלח קוד שוב" : "Resend Code"}
                  </Button>
                </motion.div>
              )}

              {otpState === "success" && (
                <motion.div
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-10 h-10 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {isRTL ? "אומת בהצלחה!" : "Verified Successfully!"}
                  </h2>
                  <p className="text-slate-600 text-sm mt-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {isRTL ? "מעביר אותך לשלב הבא..." : "Taking you to the next step..."}
                  </p>
                </motion.div>
              )}

              {otpState === "signup" && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {isRTL ? "השלם את ההרשמה" : "Complete Your Signup"}
                    </h2>
                    <p className="text-slate-600 text-sm" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {isRTL ? "הזן/י אימייל וסיסמה להשלמת החשבון" : "Enter email and password to complete your account"}
                    </p>
                  </div>

                  {signupError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {signupError}
                    </div>
                  )}

                  <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-2 text-right" dir={isRTL ? "rtl" : "ltr"}>
                      <label className="text-sm font-medium text-slate-700">
                        {isRTL ? "אימייל" : "Email"}
                      </label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="text-lg py-6"
                        required
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2 text-right" dir={isRTL ? "rtl" : "ltr"}>
                      <label className="text-sm font-medium text-slate-700">
                        {isRTL ? "סיסמה" : "Password"}
                      </label>
                      <Input
                        type="password"
                        placeholder={isRTL ? "לפחות 6 תווים" : "At least 6 characters"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-lg py-6"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg"
                        disabled={signupLoading}
                      >
                        {signupLoading ? (isRTL ? "יוצר חשבון..." : "Creating account...") : (isRTL ? "המשך לבדיקת זכאות" : "Continue to Eligibility Check")}
                      </Button>
                    </div>
                  </form>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                    <Shield className="w-4 h-4" />
                    <span>{isRTL ? "המידע שלך מוגן ומוצפן" : "Your information is protected and encrypted"}</span>
                  </div>
                </motion.div>
              )}

              {otpState === "wizard" && (
                <motion.div
                  key="wizard"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8"
                >
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-sm text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                      {t("wizard.progress").replace("{current}", String(wizardStep)).replace("{total}", "6")}
                    </p>
                  </div>

                  {/* Step 1: User Status */}
                  {wizardStep === 1 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step1.title")}
                        </h2>
                        <p className="text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step1.subtitle")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { value: "employee", label: t("wizard.step1.employee"), icon: "💼" },
                          { value: "student", label: t("wizard.step1.student"), icon: "🎓" },
                          { value: "soldier", label: t("wizard.step1.soldier"), icon: "🪖" },
                          { value: "pensioner", label: t("wizard.step1.pensioner"), icon: "👴" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateIntakeData({ userStatus: option.value as any })}
                            className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                              intakeData.userStatus === option.value
                                ? "border-blue-600 bg-blue-50"
                                : "border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            <div className="text-4xl mb-2">{option.icon}</div>
                            <div className="font-medium text-slate-900">{option.label}</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Claim Reason */}
                  {wizardStep === 2 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step2.title")}
                        </h2>
                        <p className="text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step2.subtitle")}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {[
                          { value: "accident", label: t("wizard.step2.accident"), icon: "🚑" },
                          { value: "illness", label: t("wizard.step2.illness"), icon: "🩺" },
                          { value: "adhd", label: t("wizard.step2.adhd"), icon: "🧠" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateIntakeData({ claimReason: option.value as any })}
                            className={`w-full p-5 rounded-xl border-2 transition-all hover:scale-102 flex items-center gap-4 ${
                              intakeData.claimReason === option.value
                                ? "border-blue-600 bg-blue-50"
                                : "border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            <div className="text-3xl">{option.icon}</div>
                            <div className="font-medium text-slate-900 text-lg">{option.label}</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Work Related */}
                  {wizardStep === 3 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step3.title")}
                        </h2>
                        <p className="text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step3.subtitle")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => updateIntakeData({ isWorkRelated: true })}
                          className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                            intakeData.isWorkRelated === true
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-4xl mb-3">✅</div>
                          <div className="font-medium text-slate-900 text-lg">{t("wizard.step3.yes")}</div>
                        </button>
                        <button
                          onClick={() => updateIntakeData({ isWorkRelated: false })}
                          className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                            intakeData.isWorkRelated === false
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-4xl mb-3">❌</div>
                          <div className="font-medium text-slate-900 text-lg">{t("wizard.step3.no")}</div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Income Bracket */}
                  {wizardStep === 4 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step4.title")}
                        </h2>
                        <p className="text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step4.subtitle")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => updateIntakeData({ incomeBracket: "low" })}
                          className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                            intakeData.incomeBracket === "low"
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-4xl mb-3">💰</div>
                          <div className="font-medium text-slate-900">{t("wizard.step4.low")}</div>
                        </button>
                        <button
                          onClick={() => updateIntakeData({ incomeBracket: "high" })}
                          className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                            intakeData.incomeBracket === "high"
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-4xl mb-3">💵</div>
                          <div className="font-medium text-slate-900">{t("wizard.step4.high")}</div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Functional Impacts */}
                  {wizardStep === 5 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step5.title")}
                        </h2>
                        <p className="text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step5.subtitle")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {intakeData.claimReason === "adhd"
                          ? [
                              { value: "concentration", label: t("wizard.step5.concentration"), icon: "🎯" },
                              { value: "memory", label: t("wizard.step5.memory"), icon: "🧠" },
                              { value: "organization", label: t("wizard.step5.organization"), icon: "📋" },
                              { value: "social", label: t("wizard.step5.social"), icon: "👥" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => toggleFunctionalImpact(option.value)}
                                className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                                  intakeData.functionalImpacts.includes(option.value)
                                    ? "border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg"
                                    : "border-slate-200 hover:border-blue-300 bg-white"
                                }`}
                              >
                                <div className="text-4xl mb-3">{option.icon}</div>
                                <div className="font-semibold text-slate-900">{option.label}</div>
                              </button>
                            ))
                          : [
                              { value: "mobility", label: t("wizard.step5.mobility"), icon: "🚶" },
                              { value: "chronic_pain", label: t("wizard.step5.chronic_pain"), icon: "💊" },
                              { value: "sheram", label: t("wizard.step5.sheram"), icon: "🛁" },
                              { value: "vision", label: t("wizard.step5.vision"), icon: "👁️" },
                              { value: "hearing", label: t("wizard.step5.hearing"), icon: "👂" },
                              { value: "mental", label: t("wizard.step5.mental"), icon: "🧠" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => toggleFunctionalImpact(option.value)}
                                className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                                  intakeData.functionalImpacts.includes(option.value)
                                    ? "border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg"
                                    : "border-slate-200 hover:border-blue-300 bg-white"
                                }`}
                              >
                                <div className="text-4xl mb-3">{option.icon}</div>
                                <div className="font-semibold text-slate-900">{option.label}</div>
                              </button>
                            ))}
                      </div>

                      {intakeData.functionalImpacts.length === 0 && (
                        <p className="text-center text-amber-600 text-sm">{t("wizard.step5.none_selected")}</p>
                      )}
                    </motion.div>
                  )}

                  {/* Step 6: Documents Ready */}
                  {wizardStep === 6 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step6.title")}
                        </h2>
                        <p className="text-slate-600" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                          {t("wizard.step6.subtitle")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => updateIntakeData({ documentsReady: true })}
                          className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                            intakeData.documentsReady === true
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-4xl mb-3">📄</div>
                          <div className="font-medium text-slate-900 text-lg">{t("wizard.step6.yes")}</div>
                        </button>
                        <button
                          onClick={() => updateIntakeData({ documentsReady: false })}
                          className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                            intakeData.documentsReady === false
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-4xl mb-3">📋</div>
                          <div className="font-medium text-slate-900 text-lg">{t("wizard.step6.no")}</div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-4 pt-4">
                    {wizardStep > 1 && (
                      <Button onClick={handleWizardBack} variant="outline" size="lg" className="flex-1 bg-transparent">
                        {t("wizard.back")}
                      </Button>
                    )}
                    <Button
                      onClick={handleWizardNext}
                      disabled={!canProceed()}
                      size="lg"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {wizardStep === 6 ? t("wizard.complete") : t("wizard.next")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Eligibility Questionnaire */}
          {otpState === "eligibility" && (
            <EligibilityQuestionnaire 
              onComplete={handleEligibilityComplete}
              onBack={() => setOtpState("signup")}
            />
          )}

          {/* AI Lawyer */}
          {otpState === "ai-lawyer" && (
            <div className="fixed inset-0 z-50">
              <AILawyerWrapper onComplete={handleAILawyerComplete} />
              {/* Add a continue button overlay after some time */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                <Button
                  onClick={handleAILawyerComplete}
                  size="lg"
                  className="bg-orange-600 hover:bg-orange-700 shadow-2xl"
                  dir="rtl"
                >
                  סיים שיחה והמשך ללוח הבקרה
                </Button>
              </div>
            </div>
          )}
        </main>
      )}

      <WhatsAppSupportWidget />

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="p-8 bg-white rounded-2xl shadow-2xl relative">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("login.title")}
                  </h2>
                  <p className="text-slate-600 text-sm mb-8" style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {t("login.subtitle")}
                  </p>
                </div>

                <form onSubmit={handleLoginModalOtp} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input type="tel" placeholder="50-123-4567" className="flex-1 text-right" dir="rtl" />
                    <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-medium">
                      972+
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    onClick={() => setIsReturningUser(true)}
                  >
                    {t("login.send_code")}
                  </Button>
                </form>

                <div className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-600">
                  <Shield className="w-4 h-4" />
                  <span>{t("login.secure_connection")}</span>
                </div>

                {/* Email/password login (testing) */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Email & password (testing)</h3>
                  {emailError && <div className="text-sm text-red-600 mb-2">{emailError}</div>}
                  <form onSubmit={handleEmailLogin} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={emailLogin}
                      onChange={(e) => setEmailLogin(e.target.value)}
                      className="w-full"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={passwordLogin}
                      onChange={(e) => setPasswordLogin(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={emailLoading}>
                        {emailLoading ? 'Logging in…' : 'Login with email'}
                      </Button>
                      <Button variant="ghost" onClick={() => { setEmailLogin(''); setPasswordLogin('') }}>
                        Clear
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}