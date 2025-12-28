"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface UserIntakeData {
  userStatus: "employee" | "student" | "soldier_active" | "soldier_reserve" | "pensioner" | null
  claimReason: "accident" | "illness" | "adhd" | "service_injury" | "hostile_action" | null
  isWorkRelated: boolean | null
  incomeBracket: "low" | "high" | null
  functionalImpacts: string[]
  documentsReady: boolean | null

  // Jurisdiction & Categorization
  jurisdiction: "NII" | "MOD" | null
  claim_category: "general_disability" | "work_accident" | "hostile_action" | "service_injury" | "adhd" | null

  // Eligibility tracking fields
  isEligible?: boolean
  ineligibilityReasons?: string[]

  // MOD-specific fields
  military_unit?: string
  service_dates?: {
    start: string
    end: string
  }
  is_active_duty?: boolean

  medicalDetails?: {
    diagnosis: string
    bodyPart: string
    painDescription: string
    treatmentDuration: string
    dailyImpact: string[]
    relevantSection: string
  }

  committeePrep?: {
    completed: boolean
    score: number
    attempts: number
    lastAttemptDate: string
    mentionedPoints: {
      radiatingPain: boolean
      liftingDifficulty: boolean
      sleepIssues: boolean
      treatmentDuration: boolean
    }
  }
}

interface UserContextType {
  intakeData: UserIntakeData
  updateIntakeData: (data: Partial<UserIntakeData>) => void
  resetIntakeData: () => void
}

const defaultIntakeData: UserIntakeData = {
  userStatus: null,
  claimReason: null,
  isWorkRelated: null,
  incomeBracket: null,
  functionalImpacts: [],
  documentsReady: null,
  jurisdiction: null,
  claim_category: null,
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [intakeData, setIntakeData] = useState<UserIntakeData>(defaultIntakeData)

  const updateIntakeData = (data: Partial<UserIntakeData>) => {
    setIntakeData((prev) => ({ ...prev, ...data }))
  }

  const resetIntakeData = () => {
    setIntakeData(defaultIntakeData)
  }

  return (
    <UserContext.Provider value={{ intakeData, updateIntakeData, resetIntakeData }}>{children}</UserContext.Provider>
  )
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUserContext must be used within UserProvider")
  }
  return context
}
