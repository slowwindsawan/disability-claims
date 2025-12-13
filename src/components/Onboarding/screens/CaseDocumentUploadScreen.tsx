import { useState, useEffect } from 'react';
import { Lock, X, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import { getApiUrl } from '../../../config/api';

interface RequestedDocument {
  name: string;
  file: File | null;
  uploaded: boolean;
  processing?: boolean;
  summary?: string;
  ocrExtracted?: boolean;
}

export default function CaseDocumentUploadScreen() {
  const { goToStep } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [requestedDocs, setRequestedDocs] = useState<RequestedDocument[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [allDocsUploaded, setAllDocsUploaded] = useState(false);
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequestedDocuments();
  }, []);

  const fetchRequestedDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${getApiUrl('/vapi/requested-documents')}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requested documents');
      }

      const data = await response.json();
      
      if (data.status === 'no_case') {
        setError('No case found. Please complete the voice interview first to create your disability claim.');
        return;
      }

      setCaseId(data.case_id);
      setUploadedDocs(data.uploaded_documents || []);
      setAllDocsUploaded(data.all_documents_uploaded || false);

      // Initialize requested documents with upload status from backend
      const docs: RequestedDocument[] = (data.requested_documents || []).map((doc: any) => {
        // Handle both old format (string) and new format (object with status)
        if (typeof doc === 'string') {
          return {
            name: doc,
            file: null,
            uploaded: false,
          };
        } else {
          return {
            name: doc.name,
            file: null,
            uploaded: doc.uploaded || false,
          };
        }
      });

      setRequestedDocs(docs);
      
      // If all documents already uploaded, show completion state
      if (data.all_documents_uploaded) {
        setAllDocsUploaded(true);
      }
      
    } catch (err: any) {
      console.error('Error fetching requested documents:', err);
      setError(err.message || 'Failed to load requested documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (index: number, file: File | null) => {
    const updated = [...requestedDocs];
    updated[index].file = file;
    // If selecting a new file for an already uploaded document, mark as not uploaded
    // so user can upload the replacement
    if (file && updated[index].uploaded) {
      updated[index].uploaded = false;
    }
    setRequestedDocs(updated);
  };

  const handleDrag = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveIndex(index);
    } else if (e.type === 'dragleave') {
      setDragActiveIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveIndex(null);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(index, file);
    }
  };

  const uploadDocument = async (index: number) => {
    const doc = requestedDocs[index];
    if (!doc.file || !caseId) return;

    try {
      setUploading(true);
      setError(null);
      
      // Mark document as processing
      const processingUpdate = [...requestedDocs];
      processingUpdate[index].processing = true;
      setRequestedDocs(processingUpdate);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', doc.file);
      formData.append('document_type', doc.name);

      const response = await fetch(`${getApiUrl(`/cases/${caseId}/documents`)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Mark document as uploaded with summary info
      const updated = [...requestedDocs];
      updated[index].uploaded = true;
      updated[index].processing = false;
      updated[index].summary = result.summary || '';
      updated[index].ocrExtracted = result.ocr_extracted || false;
      setRequestedDocs(updated);
      
      // Add to uploaded documents list
      setUploadedDocs([...uploadedDocs, result.document]);
      
      // Check if all documents are now uploaded
      const allUploaded = updated.every(d => d.uploaded || !d.file);
      setAllDocsUploaded(allUploaded);
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      
      // Reset processing state on error
      const errorUpdate = [...requestedDocs];
      errorUpdate[index].processing = false;
      setRequestedDocs(errorUpdate);
    } finally {
      setUploading(false);
    }
  };

  const uploadAllDocuments = async () => {
    for (let i = 0; i < requestedDocs.length; i++) {
      // Upload if has file and either not uploaded yet or needs replacement
      if (requestedDocs[i].file && !requestedDocs[i].uploaded) {
        await uploadDocument(i);
      }
    }
  };

  // A document needs upload if it has a file selected but hasn't been uploaded yet
  const canUpload = requestedDocs.some(doc => doc.file && !doc.uploaded);
  const allFilesSelected = requestedDocs.every(doc => doc.file !== null);
  const hasAnyUploaded = requestedDocs.some(doc => doc.uploaded);
  // All selected files are uploaded if every document either has no file or is uploaded
  const allSelectedUploaded = requestedDocs.every(doc => !doc.file || doc.uploaded);
  const canContinue = !hasAnyUploaded || allSelectedUploaded;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading requested documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => goToStep('voice')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show completion state if all documents already uploaded
  if (allDocsUploaded && uploadedDocs.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Documents Submitted Successfully! 🎉
            </h2>
            <p className="text-gray-600">
              All requested documents have been uploaded. Your case is now complete.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Uploaded Documents:</h3>
            <div className="space-y-2">
              {uploadedDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">{doc.document_type || doc.file_name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>What's Next?</strong> Our legal team will review your documents and assess your disability claim. You'll receive updates via email and can track progress through your dashboard.
            </p>
          </div>

          <button
            onClick={() => goToStep('success')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Complete
          </button>
        </div>
      </div>
    );
  }

  // Show upload interface if no documents requested
  if (requestedDocs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Documents Required</h2>
            <p className="text-gray-600">
              Based on your interview, no specific documents are needed at this time. You can proceed to complete your claim submission. You can always upload documents later through your case dashboard.
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
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit Supporting Documents
          </h1>
          <p className="text-gray-600 mb-3">
            To strengthen your disability claim, please upload the following documents if you have them available. These documents help us better understand your case and expedite the review process.
          </p>
        </div>

        {/* Document Upload Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Document Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requestedDocs.map((doc, index) => (
                <tr 
                  key={index}
                  onDragEnter={(e) => handleDrag(e, index)}
                  onDragLeave={(e) => handleDrag(e, index)}
                  onDragOver={(e) => handleDrag(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`hover:bg-gray-50 transition ${
                    dragActiveIndex === index ? 'bg-orange-50' : ''
                  }`}
                >
                  {/* Document Name Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <span className="font-medium text-gray-900 text-sm">{doc.name}</span>
                    </div>
                  </td>

                  {/* File Column */}
                  <td className="px-6 py-4">
                    {doc.file ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1">
                          <FileText size={16} className="text-gray-600 flex-shrink-0" />
                          <div className="text-left">
                            <p className="text-xs text-gray-900 font-medium truncate max-w-xs">
                              {doc.file.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        {!doc.uploaded && (
                          <button
                            onClick={() => handleFileSelect(index, null)}
                            className="text-gray-400 hover:text-gray-600"
                            disabled={uploading}
                            title="Remove file"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.docx"
                          onChange={(e) => handleFileSelect(index, e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <span className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                          Choose file...
                        </span>
                      </label>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4">
                    {doc.processing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 animate-spin" />
                        <span className="text-sm font-medium text-blue-700">Processing...</span>
                      </div>
                    ) : doc.uploaded ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-green-700">Uploaded & Summarized</span>
                        </div>
                        {doc.summary && (
                          <details className="text-xs text-gray-600 mt-1">
                            <summary className="cursor-pointer hover:text-gray-900 font-medium">
                              View Summary
                            </summary>
                            <p className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap">
                              {doc.summary}
                            </p>
                          </details>
                        )}
                      </div>
                    ) : doc.file ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Ready to upload
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4 text-right">
                    {doc.file && !doc.uploaded && !doc.processing && (
                      <button
                        onClick={() => uploadDocument(index)}
                        disabled={uploading}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Upload
                      </button>
                    )}
                    {doc.processing && (
                      <span className="text-sm text-blue-600">Processing...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* File Format Info */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <FileText size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-blue-900">
              <strong>Automatic Processing:</strong> Each document is automatically analyzed using OCR (Optical Character Recognition) and AI to extract and summarize key information. Supported formats: PDF, JPG, PNG (max 10MB per file).
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
          <Lock size={18} className="text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900 text-xs">Secure Upload</p>
            <p className="text-xs text-green-700">
              Your documents are encrypted and stored securely. We comply with HIPAA and data protection regulations.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {canUpload && (
            <button
              onClick={uploadAllDocuments}
              disabled={uploading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Documents...
                </span>
              ) : (
                'Upload All Documents'
              )}
            </button>
          )}
          
          <button
            onClick={() => goToStep('success')}
            disabled={uploading || !canContinue}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canContinue ? 'Please upload all selected files before continuing' : ''}
          >
            Continue
          </button>
        </div>
        
        {hasAnyUploaded && !allSelectedUploaded && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ You have uploaded some documents. Please upload all selected files before continuing, or remove unselected files.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
