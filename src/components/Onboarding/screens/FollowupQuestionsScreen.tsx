import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, CheckCircle, MessageCircle, RefreshCw } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import { getApiUrl } from '../../../config/api';

interface FollowupQuestion {
  question: string;
  answer: string;
}

export default function FollowupQuestionsScreen() {
  const { goToStep } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [followupQuestions, setFollowupQuestions] = useState<FollowupQuestion[]>([]);
  const [hasFollowups, setHasFollowups] = useState<boolean | null>(null);
  const hasAnalyzedRef = useRef(false);

  useEffect(() => {
    // Only analyze once when component mounts
    if (hasAnalyzedRef.current) return;
    
    hasAnalyzedRef.current = true;
    let mounted = true;
    
    const analyze = async () => {
      if (mounted) {
        await analyzeForFollowups();
      }
    };
    analyze();
    
    return () => {
      mounted = false;
    };
  }, []);

  const analyzeForFollowups = async () => {
    try {
      setLoading(true);
      setAnalyzing(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Always fetch the latest case from API to avoid stale localStorage data
      const casesResponse = await fetch(`${getApiUrl('/cases')}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!casesResponse.ok) {
        throw new Error('Failed to fetch cases');
      }

      const casesData = await casesResponse.json();
      if (!casesData.cases || casesData.cases.length === 0) {
        // No case found - skip followup and go to success
        console.log('No case found, skipping to success');
        goToStep('success');
        return;
      }

      // Get the most recent case
      const currentCaseId = casesData.cases[0].id;
      setCaseId(currentCaseId);
      
      // Update localStorage with current case_id
      localStorage.setItem('case_id', currentCaseId);

      // Check if followups already exist in the database
      const caseResponse = await fetch(`${getApiUrl(`/cases/${currentCaseId}`)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (caseResponse.ok) {
        const caseData = await caseResponse.json();
        
        // Check if followups column has data
        if (caseData.followups) {
          console.log('Found existing followups in database');
          const followupsData = typeof caseData.followups === 'string' 
            ? JSON.parse(caseData.followups) 
            : caseData.followups;
          
          // Check if followups have questions
          if (followupsData.questions && followupsData.questions.length > 0) {
            // Load existing followup questions with their answers (if any)
            const questionsWithAnswers: FollowupQuestion[] = followupsData.questions.map((q: string, idx: number) => ({
              question: q,
              answer: followupsData.answers && followupsData.answers[idx] ? followupsData.answers[idx] : '',
            }));
            setFollowupQuestions(questionsWithAnswers);
            setHasFollowups(true);
            setLoading(false);
            setAnalyzing(false);
            return;
          }
        }
      }

      // No existing followups found, run follow-up agent
      console.log('No existing followups found, running followup agent');
      const formData = new FormData();
      formData.append('provider', 'gpt');

      const response = await fetch(`${getApiUrl(`/cases/${currentCaseId}/analyze-followup`)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If error is about missing data, skip to success
        if (response.status === 400 || errorData.skipped_reason) {
          console.log('Skipping followup due to insufficient data');
          goToStep('success');
          return;
        }
        throw new Error(errorData.detail || 'Failed to analyze for follow-up questions');
      }

      const data = await response.json();
      
      setHasFollowups(data.has_followup_questions);
      
      if (data.has_followup_questions && data.followup_questions && data.followup_questions.length > 0) {
        // Initialize questions with empty answers
        const questionsWithAnswers: FollowupQuestion[] = data.followup_questions.map((q: string) => ({
          question: q,
          answer: '',
        }));
        setFollowupQuestions(questionsWithAnswers);
      } else {
        // No follow-up questions needed, skip to success
        console.log('No followup questions, proceeding to success');
        goToStep('success');
      }

    } catch (err: any) {
      console.error('Error analyzing for follow-ups:', err);
      setError(err.message || 'Failed to analyze case');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const handleAnswerChange = (index: number, answer: string) => {
    const updated = [...followupQuestions];
    updated[index].answer = answer;
    setFollowupQuestions(updated);
  };

  const regenerateFollowups = async () => {
    if (!caseId) return;
    
    try {
      setRegenerating(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Force regenerate by calling the followup agent
      const formData = new FormData();
      formData.append('provider', 'gpt');

      const response = await fetch(`${getApiUrl(`/cases/${caseId}/analyze-followup`)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to regenerate follow-up questions');
      }

      const data = await response.json();
      
      if (data.has_followup_questions && data.followup_questions && data.followup_questions.length > 0) {
        const questionsWithAnswers: FollowupQuestion[] = data.followup_questions.map((q: string) => ({
          question: q,
          answer: '',
        }));
        setFollowupQuestions(questionsWithAnswers);
        setHasFollowups(true);
      } else {
        setError('No follow-up questions were generated');
      }

    } catch (err: any) {
      console.error('Error regenerating follow-ups:', err);
      setError(err.message || 'Failed to regenerate questions');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all questions are answered
    const unanswered = followupQuestions.filter(q => !q.answer.trim());
    if (unanswered.length > 0) {
      setError('Please answer all questions before continuing');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token || !caseId) {
        throw new Error('Not authenticated');
      }

      // Update followups column with answers
      const followupsUpdate = {
        questions: followupQuestions.map(q => q.question),
        answers: followupQuestions.map(q => q.answer),
        answered: true,
        answered_at: new Date().toISOString()
      };

      const response = await fetch(`${getApiUrl(`/cases/${caseId}`)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followups: JSON.stringify(followupsUpdate),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answers');
      }

      // Continue to success screen
      goToStep('success');

    } catch (err: any) {
      console.error('Error submitting follow-up answers:', err);
      setError(err.message || 'Failed to submit answers');
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = followupQuestions.every(q => q.answer.trim().length > 0);

  if (loading || analyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-orange-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Analyzing Your Case...
          </h2>
          <p className="text-gray-600">
            Our AI is reviewing your interview and uploaded documents to identify any additional information needed to strengthen your claim.
          </p>
        </div>
      </div>
    );
  }

  if (error && !followupQuestions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => analyzeForFollowups()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (hasFollowups === false || followupQuestions.length === 0) {
    // This shouldn't normally be reached as we redirect to success
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Case Complete!</h2>
            <p className="text-gray-600">
              Your case information is complete. No additional questions needed.
            </p>
          </div>
          <button
            onClick={() => goToStep('success')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Additional Information Needed
          </h1>
          <p className="text-gray-600">
            Based on your interview and documents, we need some clarification to strengthen your disability claim. Please answer the following questions:
          </p>
        </div>

        {/* Questions Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-6">
            {followupQuestions.map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                <label className="block mb-2">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{item.question}</span>
                  </div>
                  <textarea
                    value={item.answer}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    rows={4}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </label>
                {item.answer.trim() && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Answer recorded</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Provide as much detail as possible. Specific dates, names, and descriptions help us build a stronger case for your disability claim.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={regenerateFollowups}
            disabled={regenerating || submitting}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {regenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Regenerate Questions
              </>
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting || regenerating}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Answers & Continue'
            )}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {followupQuestions.filter(q => q.answer.trim()).length} of {followupQuestions.length} questions answered
        </div>
      </div>
    </div>
  );
}
