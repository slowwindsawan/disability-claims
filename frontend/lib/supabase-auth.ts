import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client lazily for session management and auth metadata updates
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "your_supabase_url" || supabaseAnonKey === "your_supabase_anon_key") {
    console.warn("Supabase credentials not configured - session management will be limited");
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

// Export a getter instead of direct client
export function getSupabase() {
  return getSupabaseClient();
}

// For backwards compatibility, export the instance as well
export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase client not initialized");
    }
    return (client as any)[prop];
  },
});

// Get backend URL from environment or default to localhost
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Send OTP to phone number via backend
 * @param {string} phone - E.164 format (e.g. +13334445555 or +972501234567)
 */
export async function sendOtp(phone: string) {
  // Ensure phone starts with +
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  
  const response = await fetch(`${BACKEND_URL}/auth/send-phone-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: formattedPhone }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send OTP');
  }

  const data = await response.json();
  return {
    success: data.success,
    message: data.message || "OTP sent",
  };
}

/**
 * Verify OTP and create/login user via backend
 * @param {string} phone - same phone used for OTP
 * @param {string} otp - code received by user
 */
export async function verifyOtp(phone: string, otp: string) {
  // Ensure phone starts with +
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  
  const response = await fetch(`${BACKEND_URL}/auth/verify-phone-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      phone: formattedPhone,
      otp: otp 
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to verify OTP');
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Invalid OTP');
  }

  return {
    success: true,
    user: data.user,
    session: data.session,
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
  };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const client = getSupabase();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}

/**
 * Get current user session
 */
export async function getSession() {
  const client = getSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return session;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const client = getSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  return user;
}
