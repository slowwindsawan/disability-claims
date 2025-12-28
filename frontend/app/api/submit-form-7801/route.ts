import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE_URL } from '@/variables'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis, formData } = body;

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Submit form to backend
    const response = await fetch(
      `${BACKEND_BASE_URL}/forms/7801/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          analysis,
          formData
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || "Failed to submit form" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      caseId: data.case_id,
      message: "Form 7801 submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    return NextResponse.json(
      { error: "Failed to submit form" },
      { status: 500 }
    );
  }
}
