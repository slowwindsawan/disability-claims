import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_BASE_URL } from '@/variables'

const BACKEND_URL = BACKEND_BASE_URL

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    
    const url = `${BACKEND_URL}/admin/claims-table${queryString ? `?${queryString}` : ''}`
    
    console.log('[API Route] Fetching claims-table from backend:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('[API Route] Backend response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('[API Route] Backend error response:', errorText)
      return NextResponse.json(
        { error: `Backend returned ${response.status}: ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[API Route] Backend claims-table data:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API Route] Error calling backend /admin/claims-table:', error)
    return NextResponse.json(
      { error: 'Failed to fetch claims from backend', details: String(error) },
      { status: 500 }
    )
  }
}
