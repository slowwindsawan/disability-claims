"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RefreshCw, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"

export default function ExtensionDocumentBanner() {
  const { language, t } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"

  const handleSync = () => {
    window.open("https://ps.btl.gov.il/", "_blank")
  }

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white border-0 shadow-xl mb-6">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{t("extension.banner.title")}</h3>
              <p className="text-blue-100 leading-relaxed">{t("extension.banner.subtitle")}</p>
            </div>
          </div>

          <Button
            onClick={handleSync}
            size="lg"
            className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-lg hover:shadow-xl transition-all flex-shrink-0"
          >
            <RefreshCw className={dir === "rtl" ? "w-5 h-5 mr-2" : "w-5 h-5 ml-2"} />
            {t("extension.banner.button")}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
