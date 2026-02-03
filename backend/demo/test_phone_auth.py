"""
Test Phone OTP Authentication with Supabase
Similar to the frontend flow - demonstrates the complete phone auth process
"""
import os
from supabase import create_client, Client

# Your Supabase credentials
url: str = "https://lfcjfpthgaqrvutfvikx.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmY2pmcHRoZ2FxcnZ1dGZ2aWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODg4MzEsImV4cCI6MjA4MDA2NDgzMX0.49GOHecH4ttrzHJG5PGosleFM1SH-0BNf07rF1TvDOU"
supabase: Client = create_client(url, key)

# Test phone number - use your own number with country code
phone_number = "+919608476531"  # India format
# For Israel: "+972501234567"

print("=" * 60)
print("PHONE OTP AUTHENTICATION TEST")
print("=" * 60)

# STEP 1: Send OTP
print(f"\n📱 Sending OTP to {phone_number}...")
try:
    res = supabase.auth.sign_in_with_otp({
        "phone": phone_number
    })
    
    print("✅ OTP request sent successfully!")
    print(f"   User: {res.user}")
    print(f"   Session: {res.session}")
    print(f"   Message ID: {res.message_id}")
except Exception as e:
    print(f"❌ Failed to send OTP: {e}")
    exit(1)

# STEP 2: Wait for OTP input
print("\n📩 Check your phone for the OTP code")
otp = input("Enter the 6-digit OTP: ").strip()

if not otp or len(otp) < 4:
    print("❌ Invalid OTP entered")
    exit(1)

# STEP 3: Verify OTP
print(f"\n🔐 Verifying OTP...")
try:
    verify = supabase.auth.verify_otp({
        "phone": phone_number,
        "token": otp,
        "type": "sms"
    })
    
    if verify.user and verify.session:
        print("✅ OTP verified successfully!")
        print(f"\n👤 User Information:")
        print(f"   User ID: {verify.user.id}")
        print(f"   Phone: {verify.user.phone}")
        print(f"   Created: {verify.user.created_at}")
        print(f"\n🔑 Session Information:")
        print(f"   Access Token: {verify.session.access_token[:50]}...")
        print(f"   Expires At: {verify.session.expires_at}")
        
        # STEP 4: Test backend sync
        print(f"\n🔄 Testing backend sync...")
        import requests
        
        backend_url = "http://localhost:8000/auth/phone-login"
        headers = {
            "Authorization": f"Bearer {verify.session.access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "phone": phone_number,
            "supabase_user_id": verify.user.id
        }
        
        try:
            response = requests.post(backend_url, json=payload, headers=headers)
            if response.ok:
                data = response.json()
                print("✅ Backend sync successful!")
                print(f"   User ID: {data.get('user_id')}")
                print(f"   Case ID: {data.get('case_id')}")
                print(f"   Is Existing User: {data.get('is_existing_user')}")
            else:
                print(f"⚠️  Backend sync failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"⚠️  Backend sync error: {e}")
            print("   (Make sure backend server is running on http://localhost:8000)")
        
    else:
        print("❌ OTP verification failed")
        
except Exception as e:
    print(f"❌ OTP verification error: {e}")
    exit(1)

print("\n" + "=" * 60)
print("TEST COMPLETED")
print("=" * 60)
