import { NextRequest, NextResponse } from 'next/server'

import { BACKEND_BASE_URL } from '@/variables'

const BACKEND_URL = BACKEND_BASE_URL

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id
    
    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      )
    }

    const url = `${BACKEND_URL}/admin/cases/${caseId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('Error calling backend /admin/cases/:id:', error)
    return NextResponse.json(
      { error: 'Failed to fetch case' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id
    const body = await request.json()
    
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
    console.error('Error calling backend PATCH /admin/cases/:id:', error)
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 }
    )
  }
}
