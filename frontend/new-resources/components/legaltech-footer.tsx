"use client"

import { Shield, Facebook, Linkedin, Instagram, Lock, CreditCard } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function LegalTechFooter() {
  const { language, t } = useLanguage()

  return (
    <footer className="bg-slate-900 text-white" dir={language === "he" ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Column 1: Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{t("header.company_name")}</h3>
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{t("footer.brand_description")}</p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{t("footer.quick_links")}</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-slate-300 hover:text-white transition-colors text-sm">
                  {t("footer.free_check")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors text-sm">
                  {t("footer.personal_area")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-slate-300 hover:text-white transition-colors text-sm">
                  {t("footer.faq")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-slate-300 hover:text-white transition-colors text-sm">
                  {t("footer.about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact & Support */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{t("footer.contact_support")}</h4>
            <ul className="space-y-3">
              <li className="text-slate-300 text-sm">{t("footer.whatsapp")}</li>
              <li className="text-slate-300 text-sm">{t("footer.email")}</li>
              <li className="text-slate-300 text-sm">{t("footer.address")}</li>
              <li className="pt-2">
                <Link
                  href="/accessibility"
                  className="text-slate-300 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <span className="text-lg">♿</span>
                  {t("footer.accessibility")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Trust & Legal */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{t("footer.trust_security")}</h4>

            {/* Payment Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white rounded px-3 py-2 flex items-center gap-1">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-slate-900 text-xs font-medium">Visa</span>
              </div>
              <div className="bg-white rounded px-3 py-2 flex items-center gap-1">
                <CreditCard className="w-5 h-5 text-orange-500" />
                <span className="text-slate-900 text-xs font-medium">Mastercard</span>
              </div>
              <div className="bg-white rounded px-3 py-2 flex items-center gap-1">
                <CreditCard className="w-5 h-5 text-slate-900" />
                <span className="text-slate-900 text-xs font-medium">Apple Pay</span>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Lock className="w-4 h-4 text-green-400" />
              <span>{t("footer.ssl_secured")}</span>
            </div>

            {/* Legal Links */}
            <ul className="space-y-2 pt-2">
              <li>
                <Link href="/terms" className="text-slate-300 hover:text-white transition-colors text-sm">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-300 hover:text-white transition-colors text-sm">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="text-slate-300 hover:text-white transition-colors text-sm">
                  {t("footer.refunds")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">{t("footer.copyright")}</p>
            <p
              className={`text-slate-500 text-xs ${language === "he" ? "text-center md:text-right" : "text-center md:text-left"} max-w-2xl leading-relaxed`}
            >
              {t("footer.disclaimer")}
            </p>
          </div>

          <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-center text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">{t("footer.legal_notice_title")}</span>{" "}
              {t("footer.legal_notice_text")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
