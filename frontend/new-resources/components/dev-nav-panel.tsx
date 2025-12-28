"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { X, Code2, Search } from "lucide-react"
import Link from "next/link"

interface Route {
  path: string
  name: string
  category: string
}

const routes: Route[] = [
  // Main Flow
  { path: "/", name: "Homepage / Landing", category: "Main Flow" },
  { path: "/ai-lawyer", name: "AI Lawyer Chat", category: "Main Flow" },
  { path: "/end-of-call", name: "End of Call", category: "Main Flow" },
  { path: "/value-reveal", name: "Value Reveal", category: "Main Flow" },
  { path: "/checkout", name: "Checkout", category: "Main Flow" },
  { path: "/payment-confirmation", name: "Payment Confirmation", category: "Main Flow" },
  { path: "/payment-details", name: "Payment Details", category: "Main Flow" },

  // Document Collection
  { path: "/medical-documents", name: "Medical Documents", category: "Documents" },
  { path: "/dashboard", name: "Dashboard", category: "Documents" },
  { path: "/legal-review", name: "Legal Review", category: "Documents" },

  // Committee
  { path: "/waiting-for-response", name: "Waiting for Response", category: "Committee" },
  { path: "/committee-prep", name: "Committee Prep", category: "Committee" },
  { path: "/committee-good-luck", name: "Committee Good Luck", category: "Committee" },

  // Outcomes
  { path: "/claim-approved", name: "Claim Approved", category: "Outcomes" },
  { path: "/claim-rejected", name: "Claim Rejected", category: "Outcomes" },
  { path: "/not-eligible", name: "Not Eligible", category: "Outcomes" },

  // Rehabilitation
  { path: "/rehab-approved", name: "Rehab Approved", category: "Rehabilitation" },
  { path: "/rehab-claims", name: "Rehab Claims", category: "Rehabilitation" },
  { path: "/rehab-agreement", name: "Rehab Agreement", category: "Rehabilitation" },
  { path: "/rehab-form-270", name: "Rehab Form 270", category: "Rehabilitation" },

  // Work Injury Flow
  { path: "/work-injury-context", name: "Work Injury Context", category: "Work Injury" },
  { path: "/work-injury-calculator", name: "Work Injury Calculator", category: "Work Injury" },
  { path: "/work-injury-documents", name: "Work Injury Documents", category: "Work Injury" },
  { path: "/work-injury-approval", name: "Work Injury Approval", category: "Work Injury" },
  { path: "/work-injury-success", name: "Work Injury Success", category: "Work Injury" },

  // Admin
  { path: "/admin", name: "Admin Dashboard", category: "Admin" },
  { path: "/admin/analytics", name: "Admin Analytics", category: "Admin" },
  { path: "/admin/team", name: "Admin Team", category: "Admin" },
  { path: "/admin/advanced-filters", name: "Admin Advanced Filters", category: "Admin" },
  { path: "/admin/settings", name: "Admin Settings", category: "Admin" },
  { path: "/admin/qa-submission", name: "Admin QA Submission", category: "Admin" },

  // Auth & Info
  { path: "/login", name: "Login", category: "Auth & Info" },
  { path: "/incomplete-intake", name: "Incomplete Intake", category: "Auth & Info" },
  { path: "/referral", name: "Referral", category: "Auth & Info" },

  // Legal Pages
  { path: "/about", name: "About", category: "Legal" },
  { path: "/faq", name: "FAQ", category: "Legal" },
  { path: "/terms", name: "Terms", category: "Legal" },
  { path: "/privacy", name: "Privacy", category: "Legal" },
  { path: "/refunds", name: "Refunds", category: "Legal" },
  { path: "/accessibility", name: "Accessibility", category: "Legal" },
]

export function DevNavPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Filter routes by search
  const filteredRoutes = routes.filter(
    (route) =>
      route.name.toLowerCase().includes(search.toLowerCase()) ||
      route.path.toLowerCase().includes(search.toLowerCase()) ||
      route.category.toLowerCase().includes(search.toLowerCase()),
  )

  // Group by category
  const groupedRoutes = filteredRoutes.reduce(
    (acc, route) => {
      if (!acc[route.category]) {
        acc[route.category] = []
      }
      acc[route.category].push(route)
      return acc
    },
    {} as Record<string, Route[]>,
  )

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <>
      {/* Toggle Button - Fixed bottom right */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
        size="icon"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Code2 className="h-5 w-5" />}
      </Button>

      {/* Dev Panel - Slide in from right */}
      {isOpen && (
        <div className="fixed top-0 right-0 h-full w-80 bg-background border-l shadow-2xl z-40 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Dev Navigation
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search routes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{filteredRoutes.length} routes found</p>
          </div>

          {/* Routes List */}
          <ScrollArea className="flex-1 p-4">
            {Object.entries(groupedRoutes).map(([category, categoryRoutes]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
                <div className="space-y-1">
                  {categoryRoutes.map((route) => (
                    <Link
                      key={route.path}
                      href={route.path}
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <div className="font-medium">{route.name}</div>
                      <div className="text-xs text-muted-foreground">{route.path}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {filteredRoutes.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No routes found</div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t text-xs text-muted-foreground text-center">
            Dev mode only - Hidden in production
          </div>
        </div>
      )}
    </>
  )
}
