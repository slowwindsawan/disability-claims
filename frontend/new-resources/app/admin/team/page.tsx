"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import {
  Lock,
  FileText,
  MessageSquare,
  DollarSign,
  Database,
  Handshake,
  Eye,
  UserPlus,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface TeamMember {
  id: string
  name: string
  email: string
  role: "case_manager" | "sales_sdr" | "super_admin"
  status: "active" | "suspended"
  lastLogin: string
}

interface Permission {
  id: string
  nameHe: string
  nameEn: string
  icon: any
  locked: boolean
}

const mockTeam: TeamMember[] = [
  {
    id: "1",
    name: "שרה כהן",
    email: "sarah@zerotouch.co.il",
    role: "case_manager",
    status: "active",
    lastLogin: "לפני 2 שעות",
  },
  {
    id: "2",
    name: "דוד לוי",
    email: "david@zerotouch.co.il",
    role: "sales_sdr",
    status: "active",
    lastLogin: "לפני 5 שעות",
  },
  {
    id: "3",
    name: "רחל מזרחי",
    email: "rachel@zerotouch.co.il",
    role: "case_manager",
    status: "suspended",
    lastLogin: "לפני 3 ימים",
  },
]

const caseManagerPermissions: Permission[] = [
  { id: "view_cases", nameHe: "ניהול תיקי נכות", nameEn: "Manage Disability Cases", icon: FileText, locked: false },
  { id: "upload_docs", nameHe: "מסמכים", nameEn: "Documents", icon: FileText, locked: false },
  {
    id: "customer_chat",
    nameHe: "צ'אט עם לקוחות",
    nameEn: "Customer Chat Support",
    icon: MessageSquare,
    locked: false,
  },
  { id: "financial_reports", nameHe: "דוחות כספיים", nameEn: "View Financial Reports", icon: DollarSign, locked: true },
  { id: "export_db", nameHe: "ייצוא דאטה", nameEn: "Export Full Database", icon: Database, locked: true },
  { id: "manage_partners", nameHe: "ניהול שותפים", nameEn: "Manage Partners", icon: Handshake, locked: true },
]

const salesPermissions: Permission[] = [
  { id: "view_medical", nameHe: "מידע רפואי", nameEn: "View Medical Files", icon: FileText, locked: true },
  { id: "view_work_injury", nameHe: "לידים תאונות עבודה", nameEn: "View Work Injury Leads", icon: Eye, locked: false },
  { id: "assign_lead", nameHe: "הקצאת ליד לשותף", nameEn: "Assign Lead to Partner", icon: Handshake, locked: false },
]

export default function TeamManagement() {
  const { language, t } = useLanguage()
  const dir = language === "he" ? "rtl" : "ltr"
  const [selectedRole, setSelectedRole] = useState<"case_manager" | "sales_sdr">("case_manager")
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<"case_manager" | "sales_sdr">("case_manager")

  const roleLabels = {
    case_manager: { he: "מנהל תיקים", en: "Case Manager" },
    sales_sdr: { he: "נציג מכירות", en: "Sales / SDR" },
    super_admin: { he: "מנהל על", en: "Super Admin" },
  }

  const statusLabels = {
    active: { he: "פעיל", en: "Active" },
    suspended: { he: "מושהה", en: "Suspended" },
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {language === "he" ? "ניהול צוות והרשאות" : "Team & Access Control"}
          </h2>
          <p className="text-sm text-slate-600">
            {language === "he" ? "הגדרת הרשאות וניהול גישות לצוות" : "Configure permissions and manage team access"}
          </p>
        </div>

        <Button onClick={() => setShowAddMember(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className={`w-4 h-4 ${language === "he" ? "ml-2" : "mr-2"}`} />
          {language === "he" ? "הוסף חבר צוות" : "Invite Member"}
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {/* Add Member Modal */}
        {showAddMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddMember(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {language === "he" ? "הוספת חבר צוות חדש" : "Add New Team Member"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {language === "he" ? "שם מלא" : "Full Name"}
                  </label>
                  <Input
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder={language === "he" ? "הזן שם מלא" : "Enter full name"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {language === "he" ? "אימייל" : "Email"}
                  </label>
                  <Input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder={language === "he" ? "הזן כתובת אימייל" : "Enter email address"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {language === "he" ? "תפקיד" : "Role"}
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as "case_manager" | "sales_sdr")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="case_manager">{roleLabels.case_manager[language]}</option>
                    <option value="sales_sdr">{roleLabels.sales_sdr[language]}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setShowAddMember(false)} variant="outline" className="flex-1">
                  {language === "he" ? "ביטול" : "Cancel"}
                </Button>
                <Button
                  onClick={() => {
                    alert(`${language === "he" ? "הזמנה נשלחה ל-" : "Invitation sent to "}${newMemberEmail}`)
                    setShowAddMember(false)
                    setNewMemberName("")
                    setNewMemberEmail("")
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {language === "he" ? "שלח הזמנה" : "Send Invitation"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Roles Matrix */}
        <Card className="p-6 mb-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            {language === "he" ? "מטריצת הרשאות לפי תפקידים" : "Permissions Matrix by Role"}
          </h3>
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => setSelectedRole("case_manager")}
              variant={selectedRole === "case_manager" ? "default" : "outline"}
              className={selectedRole === "case_manager" ? "bg-blue-600" : ""}
            >
              {roleLabels.case_manager[language]}
            </Button>
            <Button
              onClick={() => setSelectedRole("sales_sdr")}
              variant={selectedRole === "sales_sdr" ? "default" : "outline"}
              className={selectedRole === "sales_sdr" ? "bg-blue-600" : ""}
            >
              {roleLabels.sales_sdr[language]}
            </Button>
          </div>

          <div className="space-y-3">
            {(selectedRole === "case_manager" ? caseManagerPermissions : salesPermissions).map((perm) => (
              <div
                key={perm.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  perm.locked ? "bg-slate-50 border-slate-200" : "bg-green-50 border-green-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      perm.locked ? "bg-slate-200" : "bg-green-500"
                    }`}
                  >
                    {perm.locked ? (
                      <Lock className="w-5 h-5 text-slate-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{language === "he" ? perm.nameHe : perm.nameEn}</p>
                    <p className="text-sm text-slate-600">
                      {perm.locked ? (language === "he" ? "חסום" : "Denied") : language === "he" ? "מאושר" : "Allowed"}
                    </p>
                  </div>
                </div>
                {perm.locked ? (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    {language === "he" ? "ללא גישה" : "No Access"}
                  </Badge>
                ) : (
                  <Badge className="bg-green-500">{language === "he" ? "גישה מלאה" : "Full Access"}</Badge>
                )}
              </div>
            ))}
          </div>

          {selectedRole === "sales_sdr" && (
            <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  {language === "he" ? "הגנה על מידע רפואי" : "Medical Data Protection"}
                </p>
                <p className="text-sm text-amber-700">
                  {language === "he"
                    ? "נציגי מכירות אינם יכולים לגשת למידע רפואי מסיבות פרטיות ותקנות GDPR"
                    : "Sales representatives cannot access medical information for privacy and GDPR compliance"}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Team List */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            {language === "he" ? "רשימת חברי צוות" : "Team Members List"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th
                    className={`pb-3 text-${language === "he" ? "right" : "left"} text-sm font-semibold text-slate-700`}
                  >
                    {language === "he" ? "שם" : "Name"}
                  </th>
                  <th
                    className={`pb-3 text-${language === "he" ? "right" : "left"} text-sm font-semibold text-slate-700`}
                  >
                    {language === "he" ? "תפקיד" : "Role"}
                  </th>
                  <th
                    className={`pb-3 text-${language === "he" ? "right" : "left"} text-sm font-semibold text-slate-700`}
                  >
                    {language === "he" ? "כניסה אחרונה" : "Last Login"}
                  </th>
                  <th
                    className={`pb-3 text-${language === "he" ? "right" : "left"} text-sm font-semibold text-slate-700`}
                  >
                    {language === "he" ? "סטטוס" : "Status"}
                  </th>
                  <th
                    className={`pb-3 text-${language === "he" ? "right" : "left"} text-sm font-semibold text-slate-700`}
                  >
                    {language === "he" ? "פעולות" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockTeam.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100">
                    <td className="py-4">
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant="outline">{roleLabels[member.role][language]}</Badge>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{member.lastLogin}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      {member.status === "active" ? (
                        <Badge className="bg-green-500">
                          {language === "he" ? statusLabels.active.he : statusLabels.active.en}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500">
                          {language === "he" ? statusLabels.suspended.he : statusLabels.suspended.en}
                        </Badge>
                      )}
                    </td>
                    <td className="py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          alert(
                            `${language === "he" ? "צפייה בלוג ביקורות עבור" : "Viewing audit log for"} ${member.name}`,
                          )
                        }
                      >
                        <Eye className={`w-4 h-4 ${language === "he" ? "ml-2" : "mr-2"}`} />
                        {language === "he" ? "לוג ביקורות" : "Audit Log"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
