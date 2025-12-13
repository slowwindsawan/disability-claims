import { useEffect, useState, useRef } from 'react';
import { useOnboarding } from '../OnboardingFlow';
import LoadingSpinner from '../components/LoadingSpinner';
import ProgressSteps from '../components/ProgressSteps';
import { QUESTION_CATALOG } from '../../../lib/questionCatalog';
import { getApiUrl } from '../../../config/api';

export default function ProcessingScreen() {
  const {
    goToStep,
    uploadedFile,
    eligibilityAnswers,
    setEligibilityRating,
    setEligibilityTitle,
    setEligibilityMessage,
    setConfidence,
  } = useOnboarding();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const mountedRef = useRef(true);

  async function runAnalysis() {
    setError(null);
    setLoading(true);
    if (!uploadedFile) {
      setError('No uploaded file found. Please upload a document first.');
      setLoading(false);
      return;
    }

      // Build form data. Include the full question catalog so the server can perform document-question analysis.
      // NOTE: case_id is NOT included here because case is created AFTER eligibility results are shown
      const form = new FormData();
      
      // Get user_id from access token if available (for signed-in users)
      let userId = null;
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub;
        }
      } catch (e) {
        console.warn('Failed to extract user_id from token', e);
      }
      
      // Build answers object with metadata (no case_id yet)
      const answersPayload = {
        ...(eligibilityAnswers || {}),
        user_id: userId
      };
      
      form.append('answers', JSON.stringify(answersPayload));
      
      // Attach the canonical question catalog (array of question objects) for server-side analysis
      try {
        const questionsArray = Object.values(QUESTION_CATALOG || {});
        form.append('questions', JSON.stringify(questionsArray));
      } catch (e) {
        // non-fatal: continue without questions if serialization fails
        console.warn('Failed to attach question catalog to eligibility upload', e);
      }
      form.append('file', uploadedFile as Blob, (uploadedFile as File).name);

    try {
      const res = await fetch(getApiUrl('/eligibility-check'), {
        method: 'POST',
        body: form,
      });

      const payload = await res.json();

      if (!res.ok) {
        const text = payload.message || payload.detail || JSON.stringify(payload);
        throw new Error(`Server error: ${res.status} ${text}`);
      }

      const data = payload?.data;

      if (!data) throw new Error('Invalid response from server');

      // Map eligibility status to a 1-5 rating for UI
      const status = (data.eligibility_status || data.eligibility || '').toString();
      const score = Number(data.eligibility_score || 0);
      
      let rating = 3;
      let title = 'Needs Review';
      
      if (status === 'approved' || status === 'eligible') {
        rating = 5;
        title = 'Likely Approved';
      } else if (status === 'pending' || status === 'likely') {
        rating = score >= 70 ? 4 : 3;
        title = score >= 70 ? 'Strong Case' : 'Pending Review';
      } else if (status === 'needs_review') {
        rating = 3;
        title = 'Needs Additional Information';
      } else if (status === 'denied' || status === 'not_eligible') {
        rating = score >= 40 ? 2 : 1;
        title = score >= 40 ? 'Weak Case' : 'Likely Denied';
      }

      const message = data.reason_summary || '';
      const confidence = Number(data.confidence || 0);

      // Store document analysis for result screen
      if (data.document_analysis) {
        try {
          localStorage.setItem('eligibility_document_analysis', JSON.stringify(data.document_analysis));
        } catch (e) {
          console.warn('Failed to store document analysis', e);
        }
      }

      if (mountedRef.current) {
        setEligibilityRating(rating);
        setEligibilityTitle(title);
        setEligibilityMessage(message);
        setConfidence(confidence);
        setLoading(false);
        goToStep('eligibility');
      }
    } catch (err: any) {
      console.error('eligibility-check failed', err);
      if (mountedRef.current) {
        setError(err?.message || 'Eligibility check failed');
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    runAnalysis();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFile, eligibilityAnswers]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        {/* Progress Steps */}
        <div className="mb-8">
          <ProgressSteps steps={['Uploading', 'Analyzing', 'Scoring']} />
        </div>

        {/* Loading card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <LoadingSpinner />
          <h2 className="text-xl font-bold text-gray-900 mt-4 mb-1">Checking your eligibility…</h2>
          <p className="text-sm text-gray-600">This usually takes a few seconds.</p>
          <p className="text-xs text-gray-500 mt-2">We're extracting text and running an automated eligibility check.</p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <div>{error}</div>
              <div className="mt-3 flex items-center justify-center space-x-3">
                <button
                  onClick={() => {
                    // retry without refilling form
                    setError(null);
                    setLoading(true);
                    runAnalysis();
                  }}
                  className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-800 hover:bg-gray-50"
                >
                  Retry
                </button>
                <button onClick={() => goToStep('upload')} className="text-sm text-gray-600 hover:underline">Start over</button>
              </div>
            </div>
          )}
        </div>

        {/* Cancel option */}
        {/* <div className="mt-4 text-center">
          <button onClick={() => goToStep('upload')} className="text-gray-600 hover:text-gray-900 text-xs font-medium transition">← Cancel and upload different document</button>
        </div> */}
      </div>
    </div>
  );
}
