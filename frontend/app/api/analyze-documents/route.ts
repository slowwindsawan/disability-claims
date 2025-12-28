import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_BASE_URL } from '@/variables'

const BACKEND_URL = BACKEND_BASE_URL

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

    console.log('🔵 Frontend API: Calling backend agent analysis for case:', caseId)

    const url = `${BACKEND_URL}/cases/${caseId}/analyze-with-agent`
    console.log('📤 Calling backend:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        { error: 'Backend analysis failed', details: errorData },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('✅ Agent analysis completed')
    console.log('📊 Analysis summary:', result.analysis?.summary?.substring(0, 200))

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error in analyze-documents:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze documents',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
