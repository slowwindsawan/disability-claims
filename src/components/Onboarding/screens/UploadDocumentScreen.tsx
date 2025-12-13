import { Upload, Lock, X } from 'lucide-react';
import { useOnboarding } from '../OnboardingFlow';
import { useState } from 'react';

export default function UploadDocumentScreen() {
  const { goToStep, uploadedFile, setUploadedFile } = useOnboarding();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null)[1];

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (allowedTypes.includes(file.type) || allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))) {
      setUploadedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload medical document</h1>
          <p className="text-sm text-gray-600">We only need one basic medical document (prescription, lab report, referral).</p>
        </div>

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
            dragActive ? 'border-orange-600 bg-orange-50' : 'border-gray-300 bg-white'
          }`}
        >
          {!uploadedFile ? (
            <>
              <Upload className="mx-auto mb-3 text-gray-400" size={40} />
              <h3 className="text-base font-semibold text-gray-900 mb-2">Drag and drop your document</h3>
              <p className="text-sm text-gray-600 mb-3">or</p>
              <label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Choose file"
                />
                <button
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-5 rounded-lg transition inline-block text-sm"
                >
                  Choose file
                </button>
              </label>
              <p className="text-xs text-gray-500 mt-3">PDF, JPG, PNG, or DOCX (max 10MB)</p>
            </>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Upload size={20} className="text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-600">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Remove file"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-600 flex items-center gap-2 justify-center">
                <Lock size={14} />
                Secure upload — files are encrypted in transit
              </p>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
          <Lock size={18} className="text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900 text-xs">Secure upload</p>
            <p className="text-xs text-green-700">Your file is encrypted in transit and stored securely</p>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>Need help?</strong> Upload one clear page showing medical information like a prescription, lab report, or doctor's referral.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => goToStep('landing')}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition text-sm"
          >
            Back
          </button>
          <button
            onClick={() => uploadedFile && goToStep('processing')}
            disabled={!uploadedFile}
            className={`flex-1 font-semibold py-2 px-4 rounded-lg transition text-sm ${
              uploadedFile
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Upload & check eligibility
          </button>
        </div>
      </div>
    </div>
  );
}
