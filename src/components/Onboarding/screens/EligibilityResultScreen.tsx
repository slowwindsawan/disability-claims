import { useState, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';

export default function EligibilityResultScreen() {
  const {
    goToStep,
    eligibilityRating,
    eligibilityTitle,
    eligibilityMessage,
    confidence,
  } = useOnboarding();

  const [showDetails, setShowDetails] = useState(false);
  const [documentAnalysis, setDocumentAnalysis] = useState<any>(null);

  useEffect(() => {
    // Load document analysis from localStorage
    try {
      const stored = localStorage.getItem('eligibility_document_analysis');
      if (stored) {
        setDocumentAnalysis(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load document analysis', e);
    }
  }, []);

  const ratingExplanation: Record<number, string> = {
    5: 'Strong eligibility with high confidence',
    4: 'Good eligibility, minor clarifications possible',
    3: 'Possible eligibility, needs manual review',
    2: 'Unlikely eligibility with low confidence',
    1: 'Not eligible or missing critical information',
  };

  const sampleFindings = [
    'Medical diagnosis: Chronic condition identified',
    'Duration: Condition ongoing for >12 months',
    'Functional limitation: Significant work impact documented',
    'Treatment status: Currently receiving medical care',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        {/* Result Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          {/* Title and Stars */}
          <div className="text-center mb-6">
            <h1 className={`text-3xl font-bold mb-3 ${
              eligibilityRating >= 4 ? 'text-green-700' :
              eligibilityRating === 3 ? 'text-yellow-700' :
              'text-red-700'
            }`}>
              {eligibilityTitle}
            </h1>

            {/* Star Rating */}
            <div className="flex justify-center gap-1 mb-3" role="img" aria-label={`${eligibilityRating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <div key={star} className="relative">
                  <Star
                    size={36}
                    className={star <= eligibilityRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  />
                </div>
              ))}
            </div>

            {/* Confidence Score */}
            <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg mb-3">
              <p className="text-xs font-semibold text-blue-900">
                Confidence: <span className="text-sm">{confidence}%</span>
              </p>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-700">{eligibilityMessage}</p>
          </div>

          {/* Explanation */}
          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <p className="text-xs text-gray-700">
              <strong>Rating meaning:</strong> {ratingExplanation[eligibilityRating]}
            </p>
          </div>

          {/* Document Analysis Section */}
          {documentAnalysis && (
            <div className="mb-4">
              {!documentAnalysis.is_relevant ? (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex gap-2 items-start mb-2">
                    <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-red-900 text-sm mb-1">Document Issue Detected</h3>
                      <p className="text-xs text-red-800 mb-2">
                        <strong>What we detected:</strong> {documentAnalysis.document_summary || documentAnalysis.document_type}
                      </p>
                      <p className="text-xs text-red-800 mb-3">
                        <strong>Why it may be rejected:</strong> {documentAnalysis.relevance_reason}
                      </p>
                      <div className="bg-white border border-red-200 rounded p-2 text-xs text-red-900">
                        <p className="font-semibold mb-1">To strengthen your claim, upload:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-red-800">
                          {(documentAnalysis.directions || []).slice(0, 3).map((dir: string, idx: number) => (
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
                    <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-green-900 text-sm mb-1">Document Supports Your Claim</h3>
                      <p className="text-xs text-green-800 mb-2">
                        <strong>Document type:</strong> {documentAnalysis.document_type}
                      </p>
                      {documentAnalysis.document_summary && (
                        <p className="text-xs text-green-800 mb-2">
                          <strong>Summary:</strong> {documentAnalysis.document_summary}
                        </p>
                      )}
                      {documentAnalysis.key_points && documentAnalysis.key_points.length > 0 && (
                        <div className="bg-white border border-green-200 rounded p-2 text-xs">
                          <p className="font-semibold text-green-900 mb-1">Key supporting evidence:</p>
                          <ul className="space-y-0.5 text-green-800">
                            {documentAnalysis.key_points.slice(0, 4).map((point: string, idx: number) => (
                              <li key={idx} className="flex gap-1.5">
                                <span className="text-green-600 font-bold">✓</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {documentAnalysis.focus_excerpt && (
                        <div className="mt-2 p-2 bg-white border border-green-200 rounded text-xs text-gray-700">
                          <p className="font-semibold text-green-900 mb-1">Excerpt:</p>
                          <p className="italic">"{documentAnalysis.focus_excerpt.substring(0, 200)}..."</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collapsible Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-150 rounded-lg transition text-sm"
          >
            <span className="font-semibold text-gray-900">Show full analysis details</span>
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showDetails && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Analysis breakdown:</h3>
              <p className="text-xs text-gray-700 mb-2">{eligibilityMessage}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={async () => {
              // Check if user is signed in
              const token = localStorage.getItem('access_token');
              if (token) {
                // Signed-in user: Create case now, then proceed to voice/core analysis
                try {
                  const { apiCreateCase, apiUpdateCase } = await import('../../../lib/api');
                  const payload = {
                    title: 'New case — Eligibility',
                    description: 'Case created after eligibility check',
                    metadata: { eligibility_rating: eligibilityRating, eligibility_title: eligibilityTitle }
                  };
                  const res: any = await apiCreateCase(payload);
                  const created = res?.case || (Array.isArray(res) ? res[0] : null);
                  if (created && created.id) {
                    try { await apiUpdateCase(created.id, { title: String(created.id) }) } catch (e) {}
                    const resume = { step: 'voice', markEligibilityDone: true, caseId: created.id };
                    try { localStorage.setItem('resume_onboarding_step', JSON.stringify(resume)); } catch (e) {}
                    goToStep('voice');
                  } else {
                    console.error('Failed to create case');
                    goToStep('voice');
                  }
                } catch (err) {
                  console.error('Case creation error:', err);
                  goToStep('voice');
                }
              } else {
                // Anonymous user: Proceed to signup (case will be created after signup)
                goToStep('signup');
              }
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
          >
            {(() => {
              const token = localStorage.getItem('access_token');
              return token ? 'Proceed to Core Analysis' : 'Proceed to Personal Details';
            })()}
          </button>
          <button
            onClick={() => goToStep('upload')}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition text-sm"
          >
            Retake test / Upload different document
          </button>
        </div>

        {/* Disclaimer */}
        {eligibilityRating < 4 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
            <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-yellow-900">
                <strong>Note:</strong> This is an initial assessment. A complete medical review will be performed during the next step.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
