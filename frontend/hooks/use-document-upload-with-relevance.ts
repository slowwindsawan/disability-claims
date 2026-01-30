"use client"

import { useState } from 'react'
import * as legacyApi from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface RelevanceCheckResult {
  is_relevant: boolean
  confidence: number
  detailed_analysis: string
  missing_items: string[]
  recommendations: string
  matched_aspects: string[]
}

interface TempStorageInfo {
  storage_path: string
  storage_url: string
  file_name: string
  file_size: number
  document_type: string
}

interface UploadResponse {
  status: 'ok' | 'needs_confirmation'
  relevance_check?: RelevanceCheckResult
  temp_storage_info?: TempStorageInfo
  document?: any
  storage_url?: string
  summary?: string
  key_points?: string[]
}

interface UseDocumentUploadOptions {
  onSuccess?: (result: any) => void
  onError?: (error: any) => void
}

export function useDocumentUploadWithRelevance(options: UseDocumentUploadOptions = {}) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<{
    file: File
    caseId: string
    documentType: string
    documentId?: string
    documentName?: string
    tempStorageInfo?: TempStorageInfo
    relevanceCheck?: RelevanceCheckResult
  } | null>(null)

  const uploadDocument = async (
    caseId: string,
    file: File,
    documentType: string = 'general',
    documentId?: string,
    documentName?: string,
    confirmed: boolean = false
  ): Promise<UploadResponse> => {
    setIsUploading(true)
    
    try {
      const result = await legacyApi.apiUploadCaseDocument(
        caseId,
        file,
        documentType,
        documentId,
        documentName,
        confirmed
      )

      if (result.status === 'needs_confirmation') {
        // Store pending upload for later confirmation
        setPendingUpload({
          file,
          caseId,
          documentType,
          documentId,
          documentName,
          tempStorageInfo: result.temp_storage_info,
          relevanceCheck: result.relevance_check,
        })
        
        setIsUploading(false)
        return result
      }

      // Success - document uploaded
      if (options.onSuccess) {
        options.onSuccess(result)
      }
      
      toast({
        title: "המסמך הועלה בהצלחה",
        description: documentName || "המסמך נשמר במערכת",
      })
      
      setIsUploading(false)
      setPendingUpload(null)
      return result

    } catch (error: any) {
      console.error('Upload error:', error)
      
      if (options.onError) {
        options.onError(error)
      }
      
      toast({
        title: "שגיאה בהעלאת המסמך",
        description: error?.body?.detail || "אנא נסה שוב",
        variant: "destructive",
      })
      
      setIsUploading(false)
      throw error
    }
  }

  const confirmUpload = async (): Promise<any> => {
    if (!pendingUpload) {
      throw new Error('No pending upload to confirm')
    }

    setIsUploading(true)
    
    try {
      // Re-upload with confirmed=true
      const result = await legacyApi.apiUploadCaseDocument(
        pendingUpload.caseId,
        pendingUpload.file,
        pendingUpload.documentType,
        pendingUpload.documentId,
        pendingUpload.documentName,
        true // confirmed
      )

      if (options.onSuccess) {
        options.onSuccess(result)
      }
      
      toast({
        title: "המסמך הועלה בהצלחה",
        description: pendingUpload.documentName || "המסמך נשמר במערכת",
      })
      
      setIsUploading(false)
      setPendingUpload(null)
      return result

    } catch (error: any) {
      console.error('Confirm upload error:', error)
      
      if (options.onError) {
        options.onError(error)
      }
      
      toast({
        title: "שגיאה בהעלאת המסמך",
        description: error?.body?.detail || "אנא נסה שוב",
        variant: "destructive",
      })
      
      setIsUploading(false)
      throw error
    }
  }

  const rejectUpload = async (): Promise<void> => {
    if (!pendingUpload || !pendingUpload.tempStorageInfo) {
      setPendingUpload(null)
      return
    }

    setIsUploading(true)
    
    try {
      // Delete the temporary file from storage
      await legacyApi.apiDeleteTempDocument(
        pendingUpload.caseId,
        pendingUpload.tempStorageInfo.storage_path
      )
      
      toast({
        title: "המסמך נמחק",
        description: "תוכל להעלות מסמך אחר",
      })
      
      setIsUploading(false)
      setPendingUpload(null)

    } catch (error: any) {
      console.error('Reject upload error:', error)
      
      toast({
        title: "שגיאה במחיקת המסמך",
        description: "המשך בכל זאת",
        variant: "destructive",
      })
      
      setIsUploading(false)
      setPendingUpload(null)
    }
  }

  const cancelPending = () => {
    setPendingUpload(null)
  }

  return {
    uploadDocument,
    confirmUpload,
    rejectUpload,
    cancelPending,
    isUploading,
    pendingUpload,
    relevanceCheck: pendingUpload?.relevanceCheck,
    showRelevanceDialog: !!pendingUpload,
  }
}
