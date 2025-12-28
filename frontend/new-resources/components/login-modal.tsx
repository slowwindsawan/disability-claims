"use client"

import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { User, Shield, Users } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter()
  const { t } = useLanguage()

  const handleUserTypeSelection = (type: "user" | "admin" | "subadmin") => {
    onClose()

    switch (type) {
      case "user":
        router.push("/dashboard")
        break
      case "admin":
        router.push("/admin")
        break
      case "subadmin":
        router.push("/admin")
        break
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{t("login.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 bg-transparent"
            onClick={() => handleUserTypeSelection("user")}
          >
            <User className="w-6 h-6 text-blue-600" />
            <div className="text-center">
              <div className="font-semibold">{t("login.existing_user")}</div>
              <div className="text-sm text-muted-foreground">{t("login.existing_user_desc")}</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-300 bg-transparent"
            onClick={() => handleUserTypeSelection("admin")}
          >
            <Shield className="w-6 h-6 text-purple-600" />
            <div className="text-center">
              <div className="font-semibold">{t("login.admin")}</div>
              <div className="text-sm text-muted-foreground">{t("login.admin_desc")}</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300 bg-transparent"
            onClick={() => handleUserTypeSelection("subadmin")}
          >
            <Users className="w-6 h-6 text-green-600" />
            <div className="text-center">
              <div className="font-semibold">{t("login.subadmin")}</div>
              <div className="text-sm text-muted-foreground">{t("login.subadmin_desc")}</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
