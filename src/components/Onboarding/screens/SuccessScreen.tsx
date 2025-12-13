import { CheckCircle, ArrowRight } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';

export default function SuccessScreen({ onComplete }: { onComplete?: (data: any) => void }) {
  const { formData, voiceResponses, postPaymentAnswers } = useOnboarding();

  const handleGoToDashboard = () => {
    if (onComplete) {
      onComplete({
        formData,
        voiceResponses,
        postPaymentAnswers
      });
    }
    // In a real app, navigate to /dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center mb-4">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="inline-block">
              <CheckCircle size={64} className="text-green-600 animate-bounce" />
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your application is submitted
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            We've received your disability benefits assessment. A confirmation email has been sent to <span className="font-semibold">{formData.email || 'your email'}</span>.
          </p>

          {/* What Happens Next */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left border border-blue-100">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">What happens next:</h2>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-blue-600 font-bold text-base flex-shrink-0">1</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-xs">Review by medical team</p>
                  <p className="text-xs text-gray-600">Our specialists will review your assessment (3-5 business days)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-600 font-bold text-base flex-shrink-0">2</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-xs">Determination decision</p>
                  <p className="text-xs text-gray-600">You'll receive a decision via email and phone</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-600 font-bold text-base flex-shrink-0">3</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-xs">Next steps</p>
                  <p className="text-xs text-gray-600">If approved, we'll guide you through filing and benefits information</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-green-900 mb-2 text-sm">Application Summary</h3>
            <div className="text-left space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-700">Full name:</span>
                <span className="font-semibold text-gray-900">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Email:</span>
                <span className="font-semibold text-gray-900">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Phone:</span>
                <span className="font-semibold text-gray-900">{formData.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Voice responses:</span>
                <span className="font-semibold text-gray-900">{voiceResponses.length} answered</span>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-xs text-yellow-900">
              💬 Have questions? Our support team is here to help. <a href="#" className="font-semibold underline">Contact us</a>
            </p>
          </div>
        </div>

        {/* Main CTA */}
        <button
          onClick={handleGoToDashboard}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition"
        >
          Go to your dashboard
          <ArrowRight size={18} />
        </button>

        {/* Secondary Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600">
            Application ID: <span className="font-mono font-semibold text-gray-900">APP-{Date.now().toString().slice(-8)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
