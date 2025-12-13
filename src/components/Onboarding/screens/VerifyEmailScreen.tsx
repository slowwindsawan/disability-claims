import React, { useState } from 'react';
import { useOnboarding } from '../OnboardingFlow';

export default function VerifyEmailScreen() {
  const { formData, goToStep, pendingUserId, registrationDebugOtp, setRegistrationDebugOtp } = useOnboarding();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Verification failed');
        setLoading(false);
        return;
      }
      // success -> proceed to voice assessment (required)
      setRegistrationDebugOtp(null);
      goToStep('voice');
    } catch (e: any) {
      setError(e?.message || 'Verification error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Resend failed');
        setLoading(false);
        return;
      }
      // optionally show debug otp
      if (data.debug_otp) {
        setRegistrationDebugOtp(data.debug_otp);
      }
      setResendCooldown(60);
    } catch (e: any) {
      setError(e?.message || 'Resend error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Verify your email</h2>
          <p className="text-sm text-gray-600 mb-4">We sent a verification code to <strong>{formData.email}</strong>. Enter it below to continue.</p>

          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm mb-3"
          />

          {registrationDebugOtp && (
            <div className="mb-3 text-xs text-gray-600">
              <strong>Dev OTP:</strong> {registrationDebugOtp}
            </div>
          )}

          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
            >
              {loading ? 'Verifying...' : 'Verify and continue'}
            </button>
            <button
              onClick={() => goToStep('signup')}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 rounded-lg border border-gray-300 transition text-sm"
            >
              Edit details
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 rounded-lg border border-gray-300 transition text-sm"
            >
              {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
