import { useEffect } from 'react';
import { useOnboarding } from '../OnboardingFlow';

export default function SubmissionScreen() {
  const { goToStep } = useOnboarding();

  useEffect(() => {
    // Simulate submission
    const timer = setTimeout(() => {
      goToStep('success');
    }, 4000);

    return () => clearTimeout(timer);
  }, [goToStep]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-lg border border-gray-200 p-8 text-center">
        {/* Animated checkmark */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <div className="relative w-12 h-12">
              <svg className="w-full h-full text-green-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1">All set — submitting your application…</h2>
        <p className="text-xs text-gray-600 mb-4">This should only take a moment</p>

        {/* Progress steps */}
        <div className="space-y-2 text-left bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-xs text-gray-700">Eligibility assessment completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-xs text-gray-700">Payment processed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-2.5 h-2.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <span className="text-xs text-gray-700">Submitting your application</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">You'll be redirected to your dashboard shortly…</p>
      </div>
    </div>
  );
}
