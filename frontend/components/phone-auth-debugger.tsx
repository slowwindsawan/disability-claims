/**
 * Debug helper to test Supabase phone OTP functionality
 * Add this to your page to debug authentication issues
 */

'use client'

import { useState } from 'react'
import { sendOtp, verifyOtp } from '@/lib/supabase-auth'

export function PhoneAuthDebugger() {
  const [phone, setPhone] = useState('+972501234567')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const handleSendOtp = async () => {
    setError('')
    setResult(null)
    setLoading(true)
    
    try {
      console.log('Sending OTP to:', phone)
      const res = await sendOtp(phone)
      console.log('OTP sent:', res)
      setResult(res)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    setResult(null)
    setLoading(true)
    
    try {
      console.log('Verifying OTP:', phone, otp)
      const res = await verifyOtp(phone, otp)
      console.log('OTP verified:', res)
      setResult(res)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg z-[9999] max-w-sm">
      <div className="text-sm space-y-2">
        <div className="font-bold text-blue-600">Debug: Phone OTP</div>
        
        <div>
          <label className="text-xs font-semibold">Phone:</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full text-xs border p-1 rounded"
            placeholder="+972501234567"
          />
        </div>

        <button
          onClick={handleSendOtp}
          disabled={loading}
          className="w-full text-xs bg-blue-500 text-white p-1 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send OTP'}
        </button>

        <div>
          <label className="text-xs font-semibold">OTP Code:</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full text-xs border p-1 rounded"
            placeholder="000000"
            maxLength={6}
          />
        </div>

        <button
          onClick={handleVerifyOtp}
          disabled={loading || !otp}
          className="w-full text-xs bg-green-500 text-white p-1 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>

        {error && (
          <div className="text-xs bg-red-100 text-red-700 p-2 rounded border border-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="text-xs bg-green-100 text-green-700 p-2 rounded border border-green-300 max-h-48 overflow-auto">
            <strong>Result:</strong>
            <pre className="text-xs mt-1 whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
