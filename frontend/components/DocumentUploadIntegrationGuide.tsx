/**
 * INTEGRATION GUIDE: Document Upload with Relevance Checking
 * 
 * This file demonstrates how to integrate the document relevance checking feature
 * into any component that handles document uploads.
 */

// ============================================================
// STEP 1: Import Required Components and Hooks
// ============================================================

import { useState } from 'react'
import * as legacyApi from '@/lib/api'
import { useDocumentUploadWithRelevance } from '@/hooks/use-document-upload-with-relevance'
import { DocumentRelevanceDialog } from '@/components/DocumentRelevanceDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

// ============================================================
// STEP 2: Setup Component with Upload Hook
// ============================================================

export function DocumentUploadExample({ caseId }: { caseId: string }) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Initialize the upload hook with callbacks
  const {
    uploadDocument,
    confirmUpload,
    rejectUpload,
    isUploading,
    pendingUpload,
    relevanceCheck,
    showRelevanceDialog,
  } = useDocumentUploadWithRelevance({
    onSuccess: (result) => {
      console.log('Upload successful:', result)
      // Refresh case data, update UI, etc.
      setSelectedFile(null)
    },
    onError: (error) => {
      console.error('Upload failed:', error)
    },
  })

  // ============================================================
  // STEP 3: Handle File Selection and Upload
  // ============================================================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר קובץ',
        variant: 'destructive',
      })
      return
    }

    try {
      // Call uploadDocument - it will handle relevance checking automatically
      const result = await uploadDocument(
        caseId,
        selectedFile,
        'medical_report', // document_type
        undefined, // document_id (optional)
        'תעודה רפואית מהרופא המטפל', // document_name (for matching)
        false // confirmed (always false on first upload)
      )

      // If result.status === 'needs_confirmation', the relevance dialog will show automatically
      // If result.status === 'ok', the document was uploaded successfully
      
      if (result.status === 'ok') {
        console.log('Document uploaded successfully!')
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  // ============================================================
  // STEP 4: Handle User Decision on Low-Confidence Documents
  // ============================================================

  const handleConfirmUpload = async () => {
    try {
      // User chose to upload anyway - confirm the upload
      await confirmUpload()
      console.log('Document confirmed and saved!')
    } catch (error) {
      console.error('Confirm error:', error)
    }
  }

  const handleRejectUpload = async () => {
    try {
      // User chose to reject - delete temp file from storage
      await rejectUpload()
      console.log('Document rejected and deleted')
      setSelectedFile(null)
      // Allow user to select a different file
    } catch (error) {
      console.error('Reject error:', error)
    }
  }

  // ============================================================
  // STEP 5: Render UI with Relevance Dialog
  // ============================================================

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? 'מעלה...' : 'העלה מסמך'}
      </Button>

      {/* Relevance Check Dialog */}
      {relevanceCheck && (
        <DocumentRelevanceDialog
          isOpen={showRelevanceDialog}
          onOpenChange={(open) => {
            if (!open && pendingUpload) {
              // User closed dialog without choosing - treat as reject
              handleRejectUpload()
            }
          }}
          relevanceCheck={relevanceCheck}
          documentName={pendingUpload?.documentName}
          onConfirm={handleConfirmUpload}
          onReject={handleRejectUpload}
          isConfirming={isUploading}
          isRejecting={isUploading}
        />
      )}
    </div>
  )
}

// ============================================================
// ALTERNATIVE: Manual Integration (without the hook)
// ============================================================

export function ManualDocumentUploadExample({ caseId }: { caseId: string }) {
  const [showDialog, setShowDialog] = useState(false)
  const [relevanceCheck, setRelevanceCheck] = useState<any>(null)
  const [tempStorage, setTempStorage] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleManualUpload = async () => {
    if (!selectedFile) return

    try {
      const result = await legacyApi.apiUploadCaseDocument(
        caseId,
        selectedFile,
        'general',
        undefined,
        'Document Name',
        false // confirmed
      )

      if (result.status === 'needs_confirmation') {
        // Show dialog manually
        setRelevanceCheck(result.relevance_check)
        setTempStorage(result.temp_storage_info)
        setShowDialog(true)
      } else {
        // Success!
        console.log('Uploaded:', result)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleManualConfirm = async () => {
    if (!selectedFile) return

    try {
      // Re-upload with confirmed=true
      const result = await legacyApi.apiUploadCaseDocument(
        caseId,
        selectedFile,
        'general',
        undefined,
        'Document Name',
        true // confirmed
      )
      
      console.log('Confirmed and uploaded:', result)
      setShowDialog(false)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleManualReject = async () => {
    if (!tempStorage) return

    try {
      // Delete temp file
      await legacyApi.apiDeleteTempDocument(caseId, tempStorage.storage_path)
      console.log('Deleted temp file')
      setShowDialog(false)
      setSelectedFile(null)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div>
      <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
      <button onClick={handleManualUpload}>Upload</button>
      
      {relevanceCheck && (
        <DocumentRelevanceDialog
          isOpen={showDialog}
          onOpenChange={setShowDialog}
          relevanceCheck={relevanceCheck}
          onConfirm={handleManualConfirm}
          onReject={handleManualReject}
        />
      )}
    </div>
  )
}

// ============================================================
// QUICK INTEGRATION CHECKLIST
// ============================================================

/*

✅ BACKEND (Already Complete):
   - Document relevance checker agent created
   - Upload endpoint modified to check relevance
   - Delete temp document endpoint added
   - Storage deletion utility added

✅ FRONTEND:
   1. Import useDocumentUploadWithRelevance hook
   2. Import DocumentRelevanceDialog component
   3. Initialize hook with onSuccess/onError callbacks
   4. Call uploadDocument() when user selects file
   5. Render DocumentRelevanceDialog with relevance check data
   6. Handle confirmUpload() and rejectUpload() actions

📝 NOTES:
   - Confidence threshold: > 60 = auto-approve, <= 60 = show dialog
   - Files are uploaded to storage immediately
   - If user rejects, temp file is deleted from storage
   - If user confirms, file is saved to database
   - The hook handles all state management automatically

*/
