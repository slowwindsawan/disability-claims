import { ChevronRight, Info } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';

export default function LandingScreen() {
  const { goToStep } = useOnboarding();
  const { setEligibilityRating, setEligibilityTitle, setEligibilityMessage, setConfidence } = useOnboarding();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Check eligibility in minutes
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Answer a few quick questions and upload one medical document to get an initial eligibility rating.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xl font-bold text-orange-600 mb-2">⚡</div>
            <p className="text-sm text-gray-700">Fast & secure upload</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xl font-bold text-orange-600 mb-2">📊</div>
            <p className="text-sm text-gray-700">Instant eligibility rating</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xl font-bold text-orange-600 mb-2">🔒</div>
            <p className="text-sm text-gray-700">Your data is safe</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => goToStep('questionnaire')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
          >
            Start eligibility test
            <ChevronRight size={18} />
          </button>
          {/* Dev/testing: skip eligibility and show dummy score (only in non-production) */}
          {import.meta.env && import.meta.env.MODE !== 'production' && (
            <button
              onClick={() => {
                // set a dummy eligibility result for testing
                setEligibilityRating(4);
                setEligibilityTitle('Likely eligible (test)');
                setEligibilityMessage('This is a developer/test path showing a dummy eligibility score.');
                setConfidence(78);
                goToStep('eligibility');
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              Skip eligibility (test)
            </button>
          )}
          <button
            onClick={() => {/* Learn more could show a modal */}}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition"
          >
            Learn more
          </button>
        </div>

        {/* Trust badge */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-600">
          <Info size={14} />
          <span>Your information is encrypted and secure</span>
        </div>
      </div>
    </div>
  );
}
