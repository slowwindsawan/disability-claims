import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import { getApiUrl } from '../../../config/api';

interface RecommendedDocument {
  id: string;
  title: string;
  description: string;
  required: boolean;
  uploaded: boolean;
}

export default function MedicalDocumentsUpload() {
  const { goToStep } = useOnboarding();
  const [recommendations, setRecommendations] = useState<RecommendedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, File>>(new Map());

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const caseId = localStorage.getItem('case_id');
      
      // Fetch AI-recommended documents for this case
      const response = await fetch(getApiUrl(`/cases/${caseId}/recommended-documents`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || getDefaultRecommendations());
      } else {
        // Fallback to default recommendations if endpoint fails
        setRecommendations(getDefaultRecommendations());
      }
    } catch (error) {
      console.error('Failed to load document recommendations:', error);
      setRecommendations(getDefaultRecommendations());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultRecommendations = (): RecommendedDocument[] => {
    // Default recommendations based on common disability claims
    return [
      {
        id: 'medical-records',
        title: 'Recent Medical Records',
        description: 'Complete medical records from the past 12 months showing diagnosis, treatment, and ongoing care.',
        required: true,
        uploaded: false,
      },
      {
        id: 'physician-statement',
        title: 'Physician Statement',
        description: 'A detailed statement from your treating physician describing your condition and limitations.',
        required: true,
        uploaded: false,
      },
      {
        id: 'diagnostic-tests',
        title: 'Diagnostic Test Results',
        description: 'Lab results, imaging reports (X-rays, MRIs, CT scans), or other diagnostic test results.',
        required: false,
        uploaded: false,
      },
      {
        id: 'treatment-history',
        title: 'Treatment History',
        description: 'Documentation of all treatments, medications, therapies, and their outcomes.',
        required: false,
        uploaded: false,
      },
      {
        id: 'specialist-reports',
        title: 'Specialist Reports',
        description: 'Reports from any specialists you have consulted (neurologist, psychiatrist, orthopedist, etc.).',
        required: false,
        uploaded: false,
      },
    ];
  };

  const handleFileSelect = async (docId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingId(docId);
    
    try {
      const token = localStorage.getItem('access_token');
      const caseId = localStorage.getItem('case_id');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docId);
      formData.append('case_id', caseId || '');

      const response = await fetch(getApiUrl('/upload/medical-document'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the uploaded files map
        const newUploadedFiles = new Map(uploadedFiles);
        newUploadedFiles.set(docId, file);
        setUploadedFiles(newUploadedFiles);

        // Mark document as uploaded in recommendations
        setRecommendations(prev =>
          prev.map(rec =>
            rec.id === docId ? { ...rec, uploaded: true } : rec
          )
        );
      } else {
        alert('Failed to upload document. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveFile = (docId: string) => {
    const newUploadedFiles = new Map(uploadedFiles);
    newUploadedFiles.delete(docId);
    setUploadedFiles(newUploadedFiles);

    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === docId ? { ...rec, uploaded: false } : rec
      )
    );
  };

  const canContinue = () => {
    // Can continue if all required documents are uploaded
    const requiredDocs = recommendations.filter(rec => rec.required);
    return requiredDocs.every(rec => rec.uploaded);
  };

  const handleContinue = () => {
    // Save progress and move to next step
    localStorage.setItem('medical_documents_uploaded', 'true');
    goToStep('submission');
  };

  const handleSkip = () => {
    // Allow skipping but save preference
    localStorage.setItem('medical_documents_skipped', 'true');
    goToStep('submission');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-2xl w-full bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="inline-block mb-4">
            <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Loading document recommendations...
          </h2>
          <p className="text-sm text-gray-600">
            Our AI is analyzing your case to recommend the best supporting documents
          </p>
        </div>
      </div>
    );
  }

  const requiredCount = recommendations.filter(rec => rec.required).length;
  const uploadedRequired = recommendations.filter(rec => rec.required && rec.uploaded).length;
  const totalUploaded = recommendations.filter(rec => rec.uploaded).length;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Medical Documents</h1>
              <p className="text-sm text-gray-600 mt-1">
                Our AI has recommended these documents to strengthen your claim
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {uploadedRequired}/{requiredCount}
              </div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">
                Required
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">
                  Why these documents matter
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  These documents have been specifically recommended based on your eligibility assessment. 
                  Uploading them will significantly improve your chances of approval and help us process 
                  your claim more efficiently.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Document list */}
        <div className="space-y-3 mb-4">
          {recommendations.map((doc) => (
            <div
              key={doc.id}
              className={`bg-white rounded-lg border p-4 transition ${
                doc.uploaded
                  ? 'border-green-300 bg-green-50'
                  : doc.required
                  ? 'border-orange-300'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {doc.uploaded ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {doc.title}
                    </h3>
                    {doc.required && !doc.uploaded && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        Required
                      </span>
                    )}
                    {doc.uploaded && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    {doc.description}
                  </p>

                  {/* Upload section */}
                  {!doc.uploaded ? (
                    <div>
                      <input
                        type="file"
                        id={`file-${doc.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => handleFileSelect(doc.id, e)}
                        disabled={uploadingId === doc.id}
                      />
                      <label
                        htmlFor={`file-${doc.id}`}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                          uploadingId === doc.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {uploadingId === doc.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Document
                          </>
                        )}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, JPG, PNG, DOC (max 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-green-200 rounded px-3 py-2">
                        <p className="text-xs font-medium text-green-900">
                          {uploadedFiles.get(doc.id)?.name || 'Document uploaded'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-700">
                {totalUploaded} of {recommendations.length} documents uploaded
              </span>
            </div>
            <div className="text-gray-600">
              {canContinue() ? (
                <span className="text-green-600 font-semibold">✓ Ready to continue</span>
              ) : (
                <span className="text-orange-600 font-semibold">
                  {requiredCount - uploadedRequired} required document(s) remaining
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => goToStep('payment')}
            className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition"
          >
            Back
          </button>
          <button
            onClick={handleSkip}
            className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition"
          >
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            disabled={!canContinue()}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg transition ${
              canContinue()
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canContinue() ? 'Continue to Submission' : 'Upload Required Documents First'}
          </button>
        </div>
      </div>
    </div>
  );
}
