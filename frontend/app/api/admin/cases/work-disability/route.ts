import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE_URL } from '@/variables'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    
    const backendUrl = BACKEND_BASE_URL;
    const authHeader = request.headers.get('authorization');
    
    console.log(`Fetching work disability cases from: ${backendUrl}/admin/cases/work-disability?page=${page}&limit=${limit}`);
    
    const response = await fetch(
      `${backendUrl}/admin/cases/work-disability?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      }
    );

    console.log(`Backend response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${errorText}`);
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched work disability cases:`, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching work disability cases:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to fetch work disability cases',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
