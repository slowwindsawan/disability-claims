import os
from supabase import create_client, Client

url: str = "https://lfcjfpthgaqrvutfvikx.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmY2pmcHRoZ2FxcnZ1dGZ2aWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODg4MzEsImV4cCI6MjA4MDA2NDgzMX0.49GOHecH4ttrzHJG5PGosleFM1SH-0BNf07rF1TvDOU"
supabase: Client = create_client(url, key)

phone_number = "+919608476531"  # include country code

# STEP 1: Send OTP
res = supabase.auth.sign_in_with_otp({
    "phone": phone_number
})

# AuthOtpResponse is NOT a dict
print("OTP request sent.")
print("user=", res.user)
print("session=", res.session)
print("message_id=", res.message_id)

# STEP 2: Wait for OTP input
otp = input("Enter OTP: ").strip()

print("Verifying OTP...")

# STEP 3: Verify OTP
verify = supabase.auth.verify_otp({
    "phone": phone_number,
    "token": otp,
    "type": "sms"
})

# STEP 4: Handle result
if verify.user and verify.session:
    print("✅ OTP verified successfully")
    print("User ID:", verify.user.id)
    print("Session access token:", verify.session.access_token)
    print("User ID:", verify.user.id)
else:
    print("❌ OTP verification failed")