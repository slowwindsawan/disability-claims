import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_BASE_URL } from '@/variables'

const BACKEND_URL = BACKEND_BASE_URL

/**
 * POST /api/analyze-documents-form7801
 * 
 * Calls the backend Form 7801 OpenAI agent analysis endpoint.
 * This is triggered from the "התחל ניתוח AI" button on the dashboard.
 * 
 * Request body:
 * {
 *   "caseId": "string" (required)
 * }
 * 
 * Response:
 * {
 *   "status": "ok",
 *   "case_id": "string",
 *   "analysis": {
 *     "form_7801": { ... },
 *     "summary": "string",
 *     "strategy": "string",
 *     "claim_rate": number,
 *     "recommendations": ["string"]
 *   },
 *   "documents_analyzed": number,
 *   "timestamp": "ISO-8601"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const caseId = body.caseId

    if (!caseId) {
      console.error('❌ Case ID is required')
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      )
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    console.log('🔵 Frontend API: Starting Form 7801 analysis for case:', caseId)
    
    const url = `${BACKEND_URL}/cases/${caseId}/analyze-documents-form7801`
    console.log('📤 Calling backend:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })

    console.log('📨 Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Backend Error:', errorText)
      
      let errorData = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { detail: errorText }
      }
      
      return NextResponse.json(
        { error: 'Backend Form 7801 analysis failed', details: errorData },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('✅ Form 7801 analysis completed')
    console.log('📊 Documents analyzed:', result.documents_analyzed)
    console.log('📋 Claim rate:', result.analysis?.claim_rate)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('❌ Frontend API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process Form 7801 analysis', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
