import { useState } from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { API_BASE_URL } from '../../../config/api';

type SignupStep = 'name' | 'email' | 'password' | 'phone' | 'ssn' | 'identity' | 'complete';

const SIGNUP_STEPS: SignupStep[] = ['name', 'email', 'password', 'phone', 'ssn', 'identity'];

export default function SignupFlow() {
  const { goToStep, formData, setFormData, eligibilityRating, eligibilityTitle, eligibilityMessage, confidence, setPendingUserId, setRegistrationDebugOtp } = useOnboarding();
  const [currentStep, setCurrentStep] = useState<SignupStep>('name');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ssnConsent, setSsnConsent] = useState(false);
  const [useIdUpload, setUseIdUpload] = useState(false);

  const stepIndex = SIGNUP_STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / SIGNUP_STEPS.length) * 100;

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'name':
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        break;
      case 'email':
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          newErrors.email = 'Please enter a valid email';
        break;
      case 'password':
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        break;
      case 'phone':
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;
      case 'ssn':
        if (!useIdUpload && !formData.ssn.trim()) newErrors.ssn = 'SSN is required';
        if (!ssnConsent) newErrors.consent = 'You must consent to continue';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      const nextIndex = stepIndex + 1;
      if (nextIndex < SIGNUP_STEPS.length) {
        setCurrentStep(SIGNUP_STEPS[nextIndex]);
      } else {
        // final signup step completed — register user with backend
        (async () => {
          try {
            const payload: any = {
              name: formData.name,
              email: formData.email,
              password: formData.password,
              phone: formData.phone,
              identity_code: formData.identityCode,
              // include eligibility summary so backend can persist it
              eligibility: {
                rating: eligibilityRating,
                title: eligibilityTitle,
                message: eligibilityMessage,
                confidence: confidence,
              },
            };

            const res = await fetch(`${API_BASE_URL}/user/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            console.log('register response', data);
            // store pending user id and debug OTP if present, then go to verification
            try {
              if (data.user_id) setPendingUserId(data.user_id);
              if (data.debug_otp) setRegistrationDebugOtp(data.debug_otp);
            } catch (e) {
              // ignore if setters not available
            }
            goToStep('verify-email');
          } catch (err) {
            console.error('registration failed', err);
            // fallback: continue the flow
            goToStep('verify-email');
          }
        })();
      }
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(SIGNUP_STEPS[stepIndex - 1]);
    } else {
      goToStep('eligibility');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-gray-900 text-sm">
              Step {stepIndex + 1} of {SIGNUP_STEPS.length}
            </h2>
            <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-orange-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Name Step */}
          {currentStep === 'name' && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">What's your name?</h1>
              <p className="text-xs text-gray-600 mb-4">We use this to personalize your assessment.</p>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>
          )}

          {/* Email Step */}
          {currentStep === 'email' && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">What's your email?</h1>
              <p className="text-xs text-gray-600 mb-4">We'll send you updates and a verification code.</p>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              <p className="text-xs text-gray-500 mt-2">A verification code will be sent to this email.</p>
            </div>
          )}

          {/* Password Step */}
          {currentStep === 'password' && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Create a password</h1>
              <p className="text-xs text-gray-600 mb-4">This secures your account. Use a strong, unique password.</p>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
              <PasswordStrengthMeter password={formData.password} />
            </div>
          )}

          {/* Phone Step */}
          {currentStep === 'phone' && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">What's your phone number?</h1>
              <p className="text-xs text-gray-600 mb-4">We'll send an SMS verification code to this number.</p>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 000-0000"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
            </div>
          )}

          {/* SSN Step */}
          {currentStep === 'ssn' && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Identity verification</h1>
              <p className="text-xs text-gray-600 mb-4">We need your SSN to verify eligibility.</p>

              {!useIdUpload ? (
                <>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-xs text-yellow-900">
                      <Lock size={14} className="inline mr-1" />
                      <strong>Why we need this:</strong> Your SSN is encrypted and used only for identity verification. By continuing you consent to secure storage and use.
                    </p>
                  </div>
                  <input
                    type="password"
                    value={formData.ssn}
                    onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                    placeholder="###-##-####"
                    maxLength={11}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm mb-3 ${
                      errors.ssn ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.ssn && <p className="text-red-600 text-xs mt-1">{errors.ssn}</p>}

                  <label className="flex items-start gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={ssnConsent}
                      onChange={(e) => setSsnConsent(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-xs text-gray-700">
                      I consent to the secure storage and use of my SSN for identity verification and eligibility assessment.
                    </span>
                  </label>
                  {errors.consent && <p className="text-red-600 text-xs mb-2">{errors.consent}</p>}

                  <button
                    onClick={() => setUseIdUpload(true)}
                    className="text-orange-600 hover:text-orange-700 text-xs font-medium transition"
                  >
                    Prefer to upload ID instead?
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-xs text-blue-900">
                      <strong>Upload ID:</strong> You can upload a government-issued ID for verification instead.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  <button
                    onClick={() => setUseIdUpload(false)}
                    className="text-orange-600 hover:text-orange-700 text-xs font-medium transition mt-2"
                  >
                    Enter SSN instead?
                  </button>
                </>
              )}
            </div>
          )}
          {/* Identity Step */}
          {currentStep === 'identity' && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Identity confirmation</h1>
              <p className="text-xs text-gray-600 mb-4">Provide a government ID or confirm your identity code to complete signup.</p>
              {useIdUpload ? (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-xs text-blue-900">Upload a government-issued ID (jpg, png, or pdf).</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    onChange={() => { /* file handling/upload will be performed later */ }}
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={formData.identityCode}
                    onChange={(e) => setFormData({ ...formData, identityCode: e.target.value })}
                    placeholder="Identity code (optional)"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm mb-3"
                  />
                </>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-2 pt-4 border-t">
            <button
              onClick={handleBack}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 rounded-lg border border-gray-300 transition text-sm"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition text-sm"
            >
              {stepIndex === SIGNUP_STEPS.length - 1 ? 'Continue to assessment' : 'Continue'}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
