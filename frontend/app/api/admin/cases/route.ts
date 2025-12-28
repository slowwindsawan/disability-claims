import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_BASE_URL } from '@/variables'

const BACKEND_URL = BACKEND_BASE_URL

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    
    const url = `${BACKEND_URL}/admin/cases${queryString ? `?${queryString}` : ''}`
    
    console.log('[API Route] Fetching from backend:', url)
    
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
    console.log('[API Route] Backend data:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API Route] Error calling backend /admin/cases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cases from backend', details: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const searchParams = request.nextUrl.searchParams
    const caseId = searchParams.get('id')
    
    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      )
    }

    const url = `${BACKEND_URL}/admin/cases/${caseId}`
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error calling backend PATCH /admin/cases:', error)
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pathname = request.nextUrl.pathname
    
    // Check if this is a filter request
    if (pathname.includes('/filter')) {
      const url = `${BACKEND_URL}/admin/cases/filter`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log('[API Route] Backend filter error:', errorText)
        return NextResponse.json(
          { error: `Backend returned ${response.status}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API Route] Error calling backend POST /admin/cases:', error)
    return NextResponse.json(
      { error: 'Failed to filter cases' },
      { status: 500 }
    )
  }
}
