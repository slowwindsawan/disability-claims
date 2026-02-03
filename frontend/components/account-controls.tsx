"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import * as legacyApi from "@/lib/api"

/**
 * Global token expiration interceptor hook.
 * Monitors for 401 responses and auto-logouts user.
 */
export function useTokenExpirationHandler() {
  const router = useRouter()

  useEffect(() => {
    // Store original fetch to intercept responses
    const originalFetch = window.fetch

    window.fetch = async (...args: any[]) => {
      const response = await originalFetch(...args)

      // If we get a 401, token has expired
      if (response.status === 401) {
        console.warn("⚠️ Token expired (401). Auto-logging out...")
        await handleAutoLogout()
        router.push("/")
      }

      return response
    }

    return () => {
      // Restore original fetch on cleanup
      window.fetch = originalFetch
    }
  }, [router])
}

/**
 * Handle auto-logout by clearing all stored data
 */
export async function handleAutoLogout() {
  const token = localStorage.getItem("access_token")
  try {
    if (token) {
      try {
        await legacyApi.apiLogout(token)
      } catch (e) {
        console.warn("apiLogout failed:", e)
      }
    }
  } finally {
    localStorage.removeItem("access_token")
    localStorage.removeItem("case_id")
    localStorage.removeItem("vapi_call_id")
    localStorage.removeItem("call_summary")
    // Broadcast to other tabs
    try {
      window.dispatchEvent(new Event("storage"))
    } catch (e) {}
  }
}

/**
 * Logout handler for use in components
 */
export async function performLogout(router: any) {
  await handleAutoLogout()
  router.push("/")
}
