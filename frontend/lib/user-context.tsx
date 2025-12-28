"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface UserIntakeData {
  userStatus: "employee" | "student" | "soldier" | "pensioner" | null
  claimReason: "accident" | "illness" | "adhd" | null
  isWorkRelated: boolean | null
  incomeBracket: "low" | "high" | null
  functionalImpacts: string[]
  documentsReady: boolean | null
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
