import { useState, useEffect } from 'react';
import { FileSignature, CheckCircle, Loader2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import { getApiUrl } from '../../../config/api';

interface BoldSignEmbeddedSignerProps {
  userId?: string;
  name?: string;
  email?: string;
  caseId?: string;
  onSigned?: (documentId: string) => void;
}

export default function BoldSignEmbeddedSigner({
  userId: propUserId = '',
  name: propName = '',
  email: propEmail = '',
  caseId: propCaseId = '',
  onSigned,
}: BoldSignEmbeddedSignerProps = {}) {
  const { goToStep } = useOnboarding();
  const [signingLink, setSigningLink] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signStatus, setSignStatus] = useState<'idle' | 'in-progress' | 'completed'>('idle');
  const [showFinishButton, setShowFinishButton] = useState(false);

  const initSigning = async () => {
    setIsLoading(true);
    setError(null);
    setSigningLink(null);
    setDocumentId(null);
    setShowFinishButton(false);

    try {
      const token = localStorage.getItem('access_token');
      
      // Get data from props, localStorage, or analysis data
      const analysisData = localStorage.getItem('analysis_data');
      let parsedAnalysis: any = null;
      try {
        parsedAnalysis = analysisData ? JSON.parse(analysisData) : null;
      } catch (e) {
        console.error('Failed to parse analysis data:', e);
      }

      // Extract user_id from JWT token
      let userId = propUserId || localStorage.getItem('user_id') || '';
      if (!userId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload.user_id || payload.id || '';
          console.log('Extracted userId from token:', userId);
        } catch (e) {
          console.error('Failed to parse JWT token:', e);
        }
      }

      const caseId = propCaseId || parsedAnalysis?.case_id || localStorage.getItem('case_id') || '';
      let name = propName || '';
      let email = propEmail || '';

      // Fetch user data from /me endpoint
      try {
        const meResponse = await fetch(getApiUrl('/me'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (meResponse.ok) {
          const userData = await meResponse.json();
          console.log('User data from /me:', userData);
          
          // Extract user ID if not already found
          if (!userId) {
            userId = userData.id || userData.profile?.user_id || '';
          }
          
          // Extract name and email
          name = name || userData.profile?.full_name || userData.name || '';
          email = email || userData.email || userData.profile?.email || '';
        } else {
          console.error('Failed to fetch user data, status:', meResponse.status);
        }
      } catch (e) {
        console.error('Failed to fetch user data:', e);
      }

      // Use fallback values if still missing
      if (!name) {
        name = email?.split('@')[0] || 'User';
        console.log('Using fallback name:', name);
      }
      
      if (!email && userId) {
        email = `user_${userId}@temp.com`;
        console.log('Using fallback email:', email);
      }

      // Log what we found
      console.log('E-Signature Data:', { userId, name, email });

      // Backend will handle missing data, just validate we have something
      if (!userId && !email) {
        throw new Error('Cannot identify user - no userId or email available');
      }

      console.log('Calling BoldSign API...');
      const response = await fetch(getApiUrl('/boldsign/create-embed-link'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          name,
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('BoldSign API error:', errorData);
        throw new Error(errorData.detail || 'Failed to create signing link');
      }

      const data = await response.json();
      console.log('BoldSign response:', data);
      setSigningLink(data.signingLink);
      setDocumentId(data.documentId);
      setActiveCaseId(data.caseId || caseId);
      
      // Store caseId in localStorage for later use
      if (data.caseId) {
        localStorage.setItem('case_id', data.caseId);
      }
      
      setSignStatus('in-progress');
      console.log('E-Signature setup complete!');
    } catch (err: any) {
      console.error('Failed to initialize BoldSign:', err);
      setError(err.message || 'Failed to load signing session');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initSigning();
  }, [propUserId, propName, propEmail, propCaseId]);

  useEffect(() => {
    // Listen for postMessage events from BoldSign iframe
    const handleMessage = (event: MessageEvent) => {
      console.log('Event received from iframe:', event.data);

      // Check if the event matches BoldSign's success signature
      // When BoldSign indicates the document was signed, allow the user
      // to click the confirmation button. Do NOT auto-complete here.
      if (event.data && event.data.action === 'onDocumentSigned') {
        console.log('BoldSign event: Signed — allowing user to confirm.');
        setShowFinishButton(true);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [documentId, activeCaseId]);

  const handleIframeLoad = () => {
    // Iframe loaded - could be the signing page or redirect page
    console.log('Iframe loaded');
  };

  const markAsCompleted = async () => {
    if (!documentId || !activeCaseId) return;

    try {
      const token = localStorage.getItem('access_token');
      await fetch(getApiUrl('/boldsign/signature-complete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          caseId: activeCaseId,
          documentId,
        }),
      });

      setSignStatus('completed');
      if (onSigned) onSigned(documentId);
    } catch (err) {
      console.error('Failed to mark signature as complete:', err);
    }
  };

  const handleContinue = () => {
    goToStep('payment');
  };

  const handleRetry = () => {
    initSigning();
  };

  if (isLoading || (!signingLink && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Preparing your document...
          </h2>
          <p className="text-gray-600 mb-4">
            Setting up the signing session
          </p>
          {/* Temporary skip button for testing */}
          <button
            onClick={handleContinue}
            className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition"
          >
            Skip for now (Testing)
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSignature size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load signing
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      {signStatus !== 'completed' ? (
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <FileSignature size={32} className="text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sign Your Agreement
            </h1>
            <p className="text-gray-600">
              Please review and sign the disability claim agreement below
            </p>
          </div>

          {/* Signing Iframe */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <iframe
              src={signingLink || ''}
              title="BoldSign Embedded Signing"
              className="w-full"
              style={{ height: '600px', border: 'none' }}
              onLoad={handleIframeLoad}
            />
          </div>

          {/* Action Button */}
          <div className="text-center">
            {showFinishButton ? (
              <>
                <button
                  type="button"
                  onClick={markAsCompleted}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <CheckCircle size={20} />
                  I've finished signing
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Click this button to finalize your signature
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold">
                  <Loader2 size={18} className="animate-spin text-gray-500" />
                  Waiting for signing to complete...
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  The finish button will appear after signing completes in the embedded window.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Completion Screen */
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ✅ Signature Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              Your document has been successfully signed and saved.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Document ID:</strong>
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1">{documentId}</p>
            </div>
            <button
              onClick={handleContinue}
              className="px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
