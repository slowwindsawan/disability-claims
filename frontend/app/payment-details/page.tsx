"use client"

import React, { useState, useEffect } from "react"
import { useLanguage } from "@/lib/language-context"
import * as legacyApi from "@/lib/api"
import { toast } from '@/hooks/use-toast'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Building2, CreditCard, Lock, MapPin, Save, ShieldCheck, Stethoscope, User, AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import Link from "next/link"
import { useRouter } from "next/navigation"
import banksData from "@/lib/banks.json"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function PaymentDetailsPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"

  const [formData, setFormData] = useState({
    bankName: "",
    branchNumber: "",
    accountNumber: "",
    hmo: "",
    doctorName: "",
    address: "",
  })

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Personal fields
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [identityCode, setIdentityCode] = useState("")

  const [bankAccountConfirmed, setBankAccountConfirmed] = useState(false)
  const [selectedBankBranches, setSelectedBankBranches] = useState<string[]>([])

  // Banks loaded from banks.json

  const hmos = ["כללית", "מכבי", "מאוחדת", "לאומית"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Save profile and payments
    const payload: any = {
      full_name: fullName || undefined,
      phone: phone || undefined,
      identity_code: identityCode || undefined,
      payments: {
        bankName: formData.bankName || undefined,
        branchNumber: formData.branchNumber || undefined,
        accountNumber: formData.accountNumber || undefined,
      },
      contact_details: {
        address: formData.address || undefined,
        hmo: formData.hmo || undefined,
        doctorName: formData.doctorName || undefined,
      },
    }

    // Remove empty nested objects
    if (!payload.payments.bankName && !payload.payments.branchNumber && !payload.payments.accountNumber) {
      delete payload.payments
    }
    if (!payload.contact_details.address && !payload.contact_details.hmo && !payload.contact_details.doctorName) {
      delete payload.contact_details
    }

    setLoading(true)
    try {
      console.log('Saving profile with payload:', payload)
      await legacyApi.apiUpdateProfile(payload)
      toast({ title: 'Saved', description: 'Profile updated successfully', variant: 'success' })
      const res: any = await legacyApi.apiGetProfile()
      const p = res?.profile || res?.data || res
      setProfile(p)
    } catch (err: any) {
      console.error('save profile error', err)
      // Handle both API error format and standard errors
      const errorMessage = err?.body?.detail || err?.body?.message || err?.message || JSON.stringify(err?.body || err) || 'Unable to save'
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        // Check if user is admin/subadmin
        const res: any = await legacyApi.apiMe()
        const role = res?.user?.role
        if (role === 'admin' || role === 'subadmin') {
          if (mounted) {
            router.push('/admin')
          }
          return
        }
        
        const profileRes: any = await legacyApi.apiGetProfile()
        const p = profileRes?.profile || profileRes?.data || profileRes
        if (!mounted) return
        setProfile(p)
        setFullName(p?.full_name || '')
        setPhone(p?.phone || '')
        setIdentityCode(p?.identity_code || '')
        // payments/contact_details may be stored as jsonb
        const payments = p?.payments || {}
        const contact = p?.contact_details || {}
        const bankName = payments?.bankName || payments?.bank_name
        setFormData((fd) => ({
          ...fd,
          bankName: bankName || fd.bankName,
          branchNumber: payments?.branchNumber || payments?.branch_number || fd.branchNumber,
          accountNumber: payments?.accountNumber || payments?.account_number || fd.accountNumber,
          hmo: contact?.hmo || fd.hmo,
          doctorName: contact?.doctorName || fd.doctorName,
          address: contact?.address || fd.address,
        }))
        
        // Set available branches if bank is already selected
        if (bankName) {
          const bank = banksData.find(b => b.bank === bankName)
          if (bank) {
            setSelectedBankBranches(bank.localBank)
          }
        }
      } catch (e) {
        console.warn('Unable to load profile', e)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [router])

  const isFormValid =
    formData.bankName &&
    formData.branchNumber &&
    formData.accountNumber &&
    formData.hmo &&
    formData.doctorName &&
    formData.address &&
    bankAccountConfirmed

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <User className="w-5 h-5" />
            <span className="font-medium">{t("payment_details.back_to_dashboard")}</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t("payment_details.title")}</h1>
            <p className="text-slate-600">{t("payment_details.subtitle")}</p>
          </div>

          {/* Security Badge */}
          <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900">{t("payment_details.secure")}</p>
                <p className="text-xs text-blue-700">{t("payment_details.secure_description")}</p>
              </div>
            </div>
          </Card>

          {/* Form */}

          <form onSubmit={handleSubmit}>
            <Card className="p-6 mb-6">
              {/* Section 1: Bank Details */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t("payment_details.bank_title")}</h3>
                    <p className="text-sm text-slate-600">{t("payment_details.bank_subtitle")}</p>
                  </div>
                </div>

                <div className={`space-y-4 ${dir === "rtl" ? "pr-13" : "pl-13"}`}>
                  {/* Bank Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("payment_details.bank_name")}
                    </label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => {
                        const selectedBank = e.target.value
                        setFormData({ ...formData, bankName: selectedBank, branchNumber: "" })
                        const bank = banksData.find(b => b.bank === selectedBank)
                        setSelectedBankBranches(bank?.localBank || [])
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    >
                      <option value="">{t("payment_details.select_bank")}</option>
                      {banksData.map((bank) => (
                        <option key={bank.bank} value={bank.bank}>
                          {bank.bank}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch Number */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("payment_details.branch_number")}
                    </label>
                    <select
                      value={formData.branchNumber}
                      onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                      disabled={!formData.bankName}
                    >
                      <option value="">
                        {formData.bankName ? t("payment_details.branch_placeholder") : "בחר בנק תחילה"}
                      </option>
                      {selectedBankBranches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("payment_details.account_number")}
                    </label>
                    <input
                      type="number"
                      value={formData.accountNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setFormData({ ...formData, accountNumber: value })
                      }}
                      placeholder={t("payment_details.account_placeholder")}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>

                  {/* Bank Account Ownership Confirmation */}
                  <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="bankOwnership"
                        checked={bankAccountConfirmed}
                        onChange={(e) => setBankAccountConfirmed(e.target.checked)}
                        className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <label htmlFor="bankOwnership" className="text-sm text-slate-900 cursor-pointer flex-1">
                        <span className="font-semibold">{t("payment_details.bank_confirmation")}</span>{" "}
                        {t("payment_details.bank_confirmation_detail")}
                      </label>
                    </div>
                  </div>

                  {/* Warning Text about National Insurance payment policy */}
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="w-5 h-5" />
                    <AlertTitle>{t("payment_details.bank_warning")}</AlertTitle>
                    <AlertDescription>{t("payment_details.bank_warning_text")}</AlertDescription>
                  </Alert>

                  <Alert variant="warning" className="mt-2">
                    <CreditCard className="w-5 h-5" />
                    <AlertTitle>{t("payment_details.bank_important")}</AlertTitle>
                    <AlertDescription>{t("payment_details.bank_important_text")}</AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Section 2: HMO Info */}
              <div className="mb-8 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t("payment_details.hmo_title")}</h3>
                    <p className="text-sm text-slate-600">{t("payment_details.hmo_subtitle")}</p>
                  </div>
                </div>

                <div className={`space-y-4 ${dir === "rtl" ? "pr-13" : "pl-13"}`}>
                  {/* HMO */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("payment_details.hmo_label")}
                    </label>
                    <select
                      value={formData.hmo}
                      onChange={(e) => setFormData({ ...formData, hmo: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    >
                      <option value="">{t("payment_details.select_hmo")}</option>
                      {hmos.map((hmo) => (
                        <option key={hmo} value={hmo}>
                          {hmo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Doctor Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("payment_details.doctor_name")}
                    </label>
                    <input
                      type="text"
                      value={formData.doctorName}
                      onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                      placeholder={t("payment_details.doctor_placeholder")}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Contact */}
              <div className="pt-8 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t("payment_details.contact_title")}</h3>
                    <p className="text-sm text-slate-600">{t("payment_details.contact_subtitle")}</p>
                  </div>
                </div>

                <div className={dir === "rtl" ? "pr-13" : "pl-13"}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("payment_details.address_label")}
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t("payment_details.address_placeholder")}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">{t("payment_details.address_note")}</p>
                </div>
              </div>
            </Card>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full py-6 text-lg font-bold ${loading ? 'bg-blue-500/80' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-6 h-6 ml-2" />
                  {t("payment_details.submit_button")}
                </>
              )}
            </Button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">{t("payment_details.footer_note")}</p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
