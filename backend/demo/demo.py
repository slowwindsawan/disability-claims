import os
from supabase import create_client, Client

url: str = "https://lfcjfpthgaqrvutfvikx.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmY2pmcHRoZ2FxcnZ1dGZ2aWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODg4MzEsImV4cCI6MjA4MDA2NDgzMX0.49GOHecH4ttrzHJG5PGosleFM1SH-0BNf07rF1TvDOU"
supabase: Client = create_client(url, key)

user = supabase.auth.sign_in_with_password({ "email": "demo@demo.com", "password": "Qwert@123" })

print(supabase.table("cases")
    .select("*")
    .execute())