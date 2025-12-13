import { useEffect, useState } from 'react';
import { useOnboarding } from '../OnboardingFlow';
import { AlertCircle, FileText, TrendingUp, TrendingDown } from 'lucide-react';

export default function AnalysisPaymentScreen({ showPayment = false }: { showPayment?: boolean }) {
  const { goToStep, paymentAmount, eligibilityRating, eligibilityTitle, eligibilityMessage } = useOnboarding();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!showPayment) {
      // Load analysis data from localStorage
      const data = localStorage.getItem('eligibility_analysis');
      if (data) {
        setAnalysisData(JSON.parse(data));
      }
      
      // Show loading for 2 seconds, then display results
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showPayment, goToStep]);

  if (!showPayment && !showResults) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-2xl w-full bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="inline-block mb-4">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Analyzing your eligibility and medical documents…
          </h2>
          <p className="text-sm text-gray-600">
            This usually takes <span className="font-semibold">&lt;30 seconds</span>
          </p>
        </div>
      </div>
    );
  }

  if (!showPayment && showResults) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
        <div className="max-w-3xl w-full">
          {/* Eligibility Score Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Eligibility Analysis Complete</h1>
                <p className="text-sm text-gray-600 mt-1">Based on your questionnaire and documents</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">{eligibilityRating}/100</div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">{eligibilityTitle}</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">{eligibilityMessage}</p>
            </div>

            {/* Document Analysis Section */}
            {analysisData?.document_analysis ? (
              <div className="mb-4">
                {!analysisData.document_analysis.is_relevant ? (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <div className="flex gap-2 items-start mb-2">
                      <FileText className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-red-900 text-sm mb-1">⚠️ Document Issue Detected</h3>
                        <p className="text-xs text-red-800 mb-2">
                          <strong>What we detected:</strong> {analysisData.document_analysis.document_summary || analysisData.document_analysis.document_type}
                        </p>
                        <p className="text-xs text-red-800 mb-3">
                          <strong>Why it may weaken your claim:</strong> {analysisData.document_analysis.relevance_reason}
                        </p>
                        <div className="bg-white border border-red-200 rounded p-2 text-xs text-red-900">
                          <p className="font-semibold mb-1">To strengthen your claim, upload:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-red-800">
                            {(analysisData.document_analysis.directions || []).slice(0, 3).map((dir: string, idx: number) => (
                              <li key={idx}>{dir}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="flex gap-2 items-start mb-2">
                      <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-bold text-green-900 text-sm mb-1">✓ Document Supports Your Claim</h3>
                        <p className="text-xs text-green-800 mb-2">
                          <strong>Document type:</strong> {analysisData.document_analysis.document_type}
                        </p>
                        {analysisData.document_analysis.document_summary && (
                          <p className="text-xs text-green-800 mb-2">
                            <strong>Summary:</strong> {analysisData.document_analysis.document_summary}
                          </p>
                        )}
                        {analysisData.document_analysis.key_points && analysisData.document_analysis.key_points.length > 0 && (
                          <div className="bg-white border border-green-200 rounded p-2 text-xs">
                            <p className="font-semibold text-green-900 mb-1">Key supporting evidence:</p>
                            <ul className="space-y-0.5 text-green-800">
                              {analysisData.document_analysis.key_points.map((point: string, idx: number) => (
                                <li key={idx} className="flex gap-1.5">
                                  <span className="text-green-600 font-bold">✓</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <div className="flex gap-2 items-center text-gray-600">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">No supportive medical file uploaded yet</p>
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-7">
                  Consider uploading medical records to strengthen your claim
                </p>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {analysisData?.strengths && analysisData.strengths.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Strengths</h3>
                  </div>
                  <ul className="space-y-1">
                    {analysisData.strengths.map((item: string, idx: number) => (
                      <li key={idx} className="text-xs text-green-800">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData?.weaknesses && analysisData.weaknesses.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-orange-900">Areas to Address</h3>
                  </div>
                  <ul className="space-y-1">
                    {analysisData.weaknesses.map((item: string, idx: number) => (
                      <li key={idx} className="text-xs text-orange-800">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Next Steps */}
            {analysisData?.required_next_steps && analysisData.required_next_steps.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">Required Next Steps</h3>
                </div>
                <ul className="space-y-1">
                  {analysisData.required_next_steps.map((step: string, idx: number) => (
                    <li key={idx} className="text-xs text-yellow-800">• {step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              onClick={() => goToStep('voice')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-lg transition"
            >
              Continue to Voice Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Complete your assessment</h1>
          <p className="text-xs text-gray-600 mb-6">
            A comprehensive medical review has been completed. Proceed with payment to finalize your application.
          </p>

          {/* Payment Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Assessment fee breakdown</h2>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-700">Comprehensive medical assessment</span>
                <span className="font-semibold text-gray-900">${paymentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Processing fee</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Secured by</span>
                <span>Stripe</span>
              </div>
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-orange-600">${paymentAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Security Badge */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4 flex gap-2">
            <span className="text-lg flex-shrink-0">🔒</span>
            <div>
              <p className="font-semibold text-green-900 text-xs">Secure payment</p>
              <p className="text-xs text-green-700">
                Processed securely by Stripe. You'll receive a receipt at your email.
              </p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Payment method</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-orange-600 has-[:checked]:bg-orange-50">
                <input type="radio" name="payment" defaultChecked className="w-4 h-4 text-orange-600" />
                <span className="text-gray-700 font-medium text-sm">Credit/Debit Card</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="payment" className="w-4 h-4 text-orange-600" />
                <span className="text-gray-700 font-medium text-sm">PayPal</span>
              </label>
            </div>
          </div>

          {/* Terms */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4 text-xs text-blue-900">
            <p>
              By clicking <strong>Pay & continue</strong>, you agree to our <a href="#" className="font-semibold underline">Terms of Service</a> and <a href="#" className="font-semibold underline">Privacy Policy</a>.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => goToStep('voice')}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 rounded-lg border border-gray-300 transition text-sm"
            >
              Back
            </button>
            <button
              onClick={() => goToStep('case-documents')}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
            >
              Pay ${paymentAmount.toFixed(2)} & continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
