"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Shield, Key, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BACKEND_BASE_URL } from '@/variables'
import * as legacyApi from "@/lib/api"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Attempt login
      const loginRes: any = await legacyApi.apiLogin(email, password)
      const token = loginRes?.data?.access_token || loginRes?.data?.accessToken

      if (!token) {
        setError("Invalid login response")
        return
      }

      // Verify user is admin
      const userRes = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!userRes.ok) {
        setError("Failed to verify user")
        return
      }

      const userData = await userRes.json()

      if (userData.role !== 'admin') {
        setError("Access denied. Admin privileges required.")
        return
      }

      // Store token and redirect to admin panel
      localStorage.setItem('access_token', token)
      
      // Store user_id if available
      if (userData.id || userData.user_id) {
        localStorage.setItem('user_id', userData.id || userData.user_id)
      }

      // Redirect to admin panel
      router.push('/admin')

    } catch (error: any) {
      console.error('Admin login failed:', error)
      setError(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Admin Access
            </h1>
            <p className="text-slate-600 text-sm">
              Sign in to access the admin panel
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6"
            >
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-lg py-6"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-lg py-6"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !email.trim() || !password.trim()}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Key className="w-5 h-5" />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield className="w-3 h-3" />
              <span>Secure admin access • Encrypted connection</span>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </motion.div>
    </div>
  )
}
