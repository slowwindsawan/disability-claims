import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_BASE_URL } from '@/variables'

const BACKEND_URL = BACKEND_BASE_URL

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('time_range') || '30days'
    
    const url = `${BACKEND_URL}/admin/analytics?time_range=${timeRange}`
    
    console.log('[API Route] Fetching analytics from backend:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
    console.log('[API Route] Analytics data:', data)
    return NextResponse.json({
      status: 'ok',
      data: data
    })
  } catch (error) {
    console.error('[API Route] Error calling backend /admin/analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics from backend', details: String(error) },
      { status: 500 }
    )
  }
}
