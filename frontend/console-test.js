/**
 * Quick test to verify Supabase is working
 * Copy this to browser console (F12) and run it
 */

(async () => {
  console.log('🔍 Testing Supabase Phone OTP Setup...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('✓ Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('✓ Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing in .env.local');
    return;
  }

  try {
    // Import Supabase client
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client initialized successfully\n');

    // Test phone OTP
    console.log('📱 Testing Phone OTP with: +919608476531');
    const testPhone = '+919608476531';
    
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: testPhone,
    });

    if (error) {
      console.error('❌ OTP Send Failed:', error.message);
      console.error('Details:', error);
    } else {
      console.log('✅ OTP Sent Successfully!');
      console.log('Message ID:', data?.message_id);
      console.log('User:', data?.user);
      console.log('\n📱 Check your phone for OTP code');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
})();
