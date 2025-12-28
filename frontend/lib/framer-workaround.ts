/**
 * Workaround for Framer Motion + Turbopack DOM reconciliation issues
 * This module provides utilities to handle AnimatePresence safely with Turbopack
 */

export const TURBOPACK_ANIMATE_PRESENCE_MODE = "sync"

/**
 * Check if we should disable exit animations for compatibility
 * Set NODE_ENV or process.env flag to disable them
 */
export const shouldDisableExitAnimations = () => {
  if (typeof window === "undefined") return false
  // Enable if development and Turbopack dev server
  return process.env.NODE_ENV === "development"
}
