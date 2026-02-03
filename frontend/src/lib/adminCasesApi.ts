/**
 * Admin Claims Table API Service
 * Directly fetches claims data from backend for the admin table
 */

import { CaseData } from "./caseStatusConstants";
import { BACKEND_BASE_URL } from '@/variables';

interface ClaimsTableRow {
  id: string;
  case_id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_photo: string | null;
  products: string[];
  status: string;
  ai_score: number;
  eligibility_status: string;
  estimated_claim_amount: number;
  recent_activity: string;
  created_at: string;
  updated_at: string;
}

interface ClaimsTableResponse {
  status: string;
  data: ClaimsTableRow[];
  total: number;
}

const BACKEND_URL = BACKEND_BASE_URL;

/**
 * Fetch claims table data directly from backend
 * Gets all non-admin, non-subadmin users with their cases and eligibility scores
 */
export async function fetchAdminClaimsTable(limit: number = 200, offset: number = 0): Promise<{ rows: ClaimsTableRow[]; total: number }> {
  try {
    const url = `${BACKEND_URL}/admin/users/cases?limit=${limit}&offset=${offset}`;
    
    console.log('Fetching claims table from:', url);
    
    // Get the access token from localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found. Please log in.');
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Claims table response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - insufficient permissions');
      }
      if (response.status === 403) {
        throw new Error('Forbidden - admin access required');
      }
      throw new Error(`Failed to fetch claims table: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Claims table data fetched successfully:', data);
    
    // Transform the raw case data to ClaimsTableRow format
    const rows: ClaimsTableRow[] = (data.cases || []).map((caseData: any) => ({
      id: caseData.id,
      case_id: caseData.id,
      user_id: caseData.user_id,
      client_name: caseData.user_name,
      client_email: caseData.user_email,
      client_phone: caseData.user_phone,
      client_photo: caseData.user_photo_url,
      products: caseData.products || [],
      status: caseData.status,
      ai_score: caseData.ai_score || 0,
      eligibility_status: caseData.eligibility_status || 'not_rated',
      estimated_claim_amount: caseData.estimated_claim_amount || 0,
      recent_activity: caseData.recent_activity || 'not available',
      created_at: caseData.created_at,
      updated_at: caseData.updated_at,
    }));
    
    return { rows, total: data.total || 0 };
  } catch (error) {
    console.error('Error fetching claims table:', error);
    throw error;
  }
}

/**
 * Transform claims table rows to CaseData format for display
 */
export function transformClaimsRowsToCaseData(rows: ClaimsTableRow[]): CaseData[] {
  return rows.map((row) => ({
    id: row.case_id,
    user_id: row.user_id,
    user_name: row.client_name,
    user_email: row.client_email,
    user_phone: row.client_phone,
    user_photo_url: row.client_photo,
    status: row.status,
    ai_score: row.ai_score,
    eligibility_status: row.eligibility_status,
    estimated_claim_amount: row.estimated_claim_amount,
    recent_activity: row.recent_activity,
    created_at: row.created_at,
    call_summary: {
      products: row.products,
    },
  } as CaseData));
}

/**
 * Fetch and transform claims data in one call
 */
export async function fetchAdminCases(limit: number = 8, offset: number = 0): Promise<{ cases: CaseData[]; total: number }> {
  const { rows, total } = await fetchAdminClaimsTable(limit, offset);
  const cases = transformClaimsRowsToCaseData(rows);
  return { cases, total };
}

export async function fetchCaseDetail(caseId: string): Promise<CaseData> {
  try {
    const response = await fetch(`${BACKEND_URL}/cases/${caseId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      if (response.status === 404) {
        throw new Error("Case not found");
      }
      throw new Error(`Failed to fetch case: ${response.statusText}`);
    }

    const data = await response.json();
    return data.case || data;
  } catch (error) {
    console.error("Error fetching case detail:", error);
    throw error;
  }
}

export async function updateCaseStatus(
  caseId: string,
  status: string
): Promise<CaseData> {
  try {
    const response = await fetch(`${BACKEND_URL}/cases/${caseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update case: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating case status:", error);
    throw error;
  }
}
