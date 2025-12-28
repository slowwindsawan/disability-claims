import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_BASE_URL } from '@/variables'

const BACKEND_URL = BACKEND_BASE_URL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const url = `${BACKEND_URL}/admin/cases/filter`
    
    console.log('[API Route] Filtering cases from backend:', url)
    console.log('[API Route] Filter payload:', body)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('[API Route] Backend response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('[API Route] Backend filter error:', errorText)
      return NextResponse.json(
        { error: `Backend returned ${response.status}: ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[API Route] Filter results:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API Route] Error calling backend /admin/cases/filter:', error)
    return NextResponse.json(
      { error: 'Failed to filter cases', details: String(error) },
      { status: 500 }
    )
  }
}
