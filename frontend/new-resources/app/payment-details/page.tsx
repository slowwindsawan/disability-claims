"use client"

import type React from "react"
import { useLanguage } from "@/lib/language-context"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Building2, CreditCard, Lock, MapPin, Save, ShieldCheck, Stethoscope, User, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

  const [bankAccountConfirmed, setBankAccountConfirmed] = useState(false)

  const banks = [
    "בנק לאומי",
    "בנק הפועלים",
    "בנק דיסקונט",
    "בנק מזרחי טפחות",
    "בנק מרכנתיל",
    "בנק יהב",
    "בנק ירושלים",
    "בנק מסד",
  ]

  const hmos = ["כללית", "מכבי", "מאוחדת", "לאומית"]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In real app: save to database
    router.push("/dashboard")
  }

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
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    >
                      <option value="">{t("payment_details.select_bank")}</option>
                      {banks.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch Number */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("payment_details.branch_number")}
                    </label>
                    <input
                      type="text"
                      value={formData.branchNumber}
                      onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })}
                      placeholder={t("payment_details.branch_placeholder")}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("payment_details.account_number")}
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
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
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-900">
                      <span className="font-semibold">{t("payment_details.bank_warning")}</span>{" "}
                      {t("payment_details.bank_warning_text")}
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      <span className="font-semibold">{t("payment_details.bank_important")}</span>{" "}
                      {t("payment_details.bank_important_text")}
                    </p>
                  </div>
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
              disabled={!isFormValid}
              className="w-full py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-6 h-6 ml-2" />
              {t("payment_details.submit_button")}
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
