"use client"

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, XCircle, FileWarning } from "lucide-react"

interface RelevanceCheckResult {
  is_relevant: boolean
  confidence: number
  detailed_analysis: string
  missing_items: string[]
  recommendations: string
  matched_aspects: string[]
}

interface DocumentRelevanceDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  relevanceCheck: RelevanceCheckResult
  documentName?: string
  onConfirm: () => void
  onReject: () => void
  isConfirming?: boolean
  isRejecting?: boolean
}

export function DocumentRelevanceDialog({
  isOpen,
  onOpenChange,
  relevanceCheck,
  documentName,
  onConfirm,
  onReject,
  isConfirming = false,
  isRejecting = false,
}: DocumentRelevanceDialogProps) {
  const confidence = relevanceCheck?.confidence || 0
  const isRelevant = relevanceCheck?.is_relevant || false
  
  // Determine severity color
  const getSeverityColor = () => {
    if (confidence > 60) return 'text-green-600'
    if (confidence > 40) return 'text-orange-600'
    return 'text-red-600'
  }
  
  const getSeverityIcon = () => {
    if (confidence > 60) return <CheckCircle2 className="h-6 w-6 text-green-600" />
    if (confidence > 40) return <AlertTriangle className="h-6 w-6 text-orange-600" />
    return <XCircle className="h-6 w-6 text-red-600" />
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getSeverityIcon()}
            <AlertDialogTitle className="text-xl">
              {confidence > 60 ? 'המסמך רלוונטי חלקית' : 'המסמך עשוי לא להתאים לדרישות'}
            </AlertDialogTitle>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <Badge variant={confidence > 60 ? "default" : "destructive"}>
              רמת התאמה: {confidence}%
            </Badge>
            {documentName && (
              <Badge variant="outline" className="text-xs">
                {documentName}
              </Badge>
            )}
          </div>
          
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-right">
              {/* Detailed Analysis */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  ניתוח מפורט
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {relevanceCheck?.detailed_analysis}
                </p>
              </div>

              {/* Matched Aspects */}
              {relevanceCheck?.matched_aspects && relevanceCheck.matched_aspects.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    מה כן תקין במסמך ({relevanceCheck.matched_aspects.length})
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                    {relevanceCheck.matched_aspects.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Items */}
              {relevanceCheck?.missing_items && relevanceCheck.missing_items.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    מידע חסר או בעייתי ({relevanceCheck.missing_items.length})
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                    {relevanceCheck.missing_items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {relevanceCheck?.recommendations && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    המלצות
                  </h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {relevanceCheck.recommendations}
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-900">
                <strong>שים לב:</strong> אתה יכול להמשיך ולהעלות את המסמך גם אם הוא לא מתאים בדיוק לדרישות, 
                אך זה עלול לעכב את טיפול בתביעה או לדרוש העלאה מחדש של מסמך מתאים יותר.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isConfirming || isRejecting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isConfirming ? 'מעלה...' : 'העלה בכל זאת'}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onReject}
            disabled={isConfirming || isRejecting}
          >
            {isRejecting ? 'מוחק...' : 'בטל והעלה מסמך אחר'}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
