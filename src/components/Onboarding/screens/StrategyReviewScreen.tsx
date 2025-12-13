import { useState, useEffect } from 'react';
import { CheckCircle, FileText, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import { getApiUrl } from '../../../config/api';

export default function StrategyReviewScreen() {
  const { goToStep } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<any>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStrategy();
  }, []);

  const loadStrategy = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get user's case
      const casesResponse = await fetch(getApiUrl('/cases'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!casesResponse.ok) {
        throw new Error('Failed to fetch cases');
      }

      const casesData = await casesResponse.json();
      const cases = casesData.cases || [];
      
      if (cases.length === 0) {
        throw new Error('No case found');
      }

      // Get most recent case
      const latestCase = cases.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      setCaseId(latestCase.id);

      // Get strategy status
      const strategyResponse = await fetch(
        getApiUrl(`/cases/${latestCase.id}/strategy-status`),
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!strategyResponse.ok) {
        throw new Error('Failed to fetch strategy');
      }

      const strategyData = await strategyResponse.json();
      
      if (!strategyData.has_strategy) {
        throw new Error('Strategy not generated yet');
      }

      setStrategy(strategyData.strategy);
      
    } catch (err: any) {
      console.error('Error loading strategy:', err);
      setError(err.message || 'Failed to load strategy');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!caseId) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');

      // Save follow-up answers if provided
      if (Object.keys(followUpAnswers).length > 0) {
        const updatedStrategy = {
          ...strategy,
          follow_up_responses: followUpAnswers,
        };

        await fetch(getApiUrl(`/cases/${caseId}`), {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            strategy: updatedStrategy,
            status: 'submitted',
          }),
        });
      }

      // Navigate to success screen
      goToStep('success');
      
    } catch (err) {
      console.error('Failed to submit:', err);
      setError('Failed to submit case');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your case strategy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => goToStep('case-documents')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hasFollowUpQuestions = strategy?.follow_up_questions && 
    Array.isArray(strategy.follow_up_questions) && 
    strategy.follow_up_questions.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Your Statement of Claims Strategy
            </h1>
          </div>
          <p className="text-gray-600">
            Based on your interview and documents, here's your comprehensive disability claims strategy.
          </p>
        </div>

        {/* Strategy Sections */}
        {strategy?.retroactivity_analysis && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Retroactivity Analysis
            </h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Claim Start Date:</strong> {strategy.retroactivity_analysis.recommended_start_date}</p>
              <p><strong>Justification:</strong> {strategy.retroactivity_analysis.justification}</p>
            </div>
          </div>
        )}

        {strategy?.disability_stacking && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Disability Stacking Assessment</h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Primary Disability:</strong> {strategy.disability_stacking.primary_disability}</p>
              <p><strong>Estimated Percentage:</strong> {strategy.disability_stacking.estimated_percentage}</p>
              {strategy.disability_stacking.secondary_conditions && (
                <div>
                  <strong>Secondary Conditions:</strong>
                  <ul className="list-disc ml-6 mt-1">
                    {strategy.disability_stacking.secondary_conditions.map((cond: string, idx: number) => (
                      <li key={idx}>{cond}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {strategy?.iel_assessment && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3">IEL (Earning Capacity) Assessment</h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Functional Limitations:</strong> {strategy.iel_assessment.functional_limitations}</p>
              <p><strong>Work Impact:</strong> {strategy.iel_assessment.work_impact}</p>
            </div>
          </div>
        )}

        {strategy?.statement_of_claims && (
          <div className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-lg border-2 border-purple-200 p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Statement of Claims</h2>
            <div className="text-gray-800 whitespace-pre-wrap">
              {strategy.statement_of_claims}
            </div>
          </div>
        )}

        {/* Follow-Up Questions */}
        {hasFollowUpQuestions && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              Additional Information Needed
            </h2>
            <p className="text-gray-700 mb-4">
              Please provide the following information to strengthen your claim:
            </p>
            <div className="space-y-4">
              {strategy.follow_up_questions.map((question: string, idx: number) => (
                <div key={idx}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {idx + 1}. {question}
                  </label>
                  <textarea
                    value={followUpAnswers[`q${idx}`] || ''}
                    onChange={(e) => setFollowUpAnswers({
                      ...followUpAnswers,
                      [`q${idx}`]: e.target.value
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={3}
                    placeholder="Your answer..."
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => goToStep('case-documents')}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition"
          >
            Back to Documents
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (hasFollowUpQuestions && Object.keys(followUpAnswers).length === 0)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Case
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
