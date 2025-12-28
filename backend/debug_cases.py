#!/usr/bin/env python3
"""Debug script to check cases in the database."""
import os
from dotenv import load_dotenv
load_dotenv()

from app.supabase_client import _supabase_admin, _has_supabase_py
import requests

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print("=== Checking cases in database ===")
print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"Has supabase-py: {_has_supabase_py}")

if _has_supabase_py and _supabase_admin is not None:
    print("\nUsing supabase-py admin client:")
    try:
        res = _supabase_admin.table('cases').select('id, user_id, title').execute()
        print(f"Response: {res}")
        if hasattr(res, 'data'):
            print(f"Cases data: {res.data}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("\nUsing HTTP REST API:")
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        print(f"Requesting: {url}")
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")

print("\n=== Checking user profiles ===")
if _has_supabase_py and _supabase_admin is not None:
    print("Using supabase-py admin client:")
    try:
        res = _supabase_admin.table('profiles').select('id, email').execute()
        print(f"Response: {res}")
        if hasattr(res, 'data'):
            print(f"Profiles: {res.data}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("Using HTTP REST API:")
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        print(f"Requesting: {url}")
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")
