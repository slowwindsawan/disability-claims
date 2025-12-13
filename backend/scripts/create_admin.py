#!/usr/bin/env python3
"""
Simple helper to create an admin user in Supabase.

Usage (PowerShell):
  $env:SUPABASE_URL = 'https://your-project.supabase.co'
  $env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'
  python .\backend\scripts\create_admin.py --email admin@example.com --password 'StrongP@ssw0rd!'

This script:
 - Calls Supabase admin auth endpoint to create the auth user and marks email confirmed.
 - Inserts/updates a `user_profile` row with `role='admin'`, `is_admin=true`, and `verified=true`.

WARNING: Requires the Supabase service role key. Keep it secret.
"""

import os
from dotenv import load_dotenv
load_dotenv()
import sys
import argparse
import requests
import json


def admin_headers(service_key: str):
    return {
        'Authorization': f'Bearer {service_key}',
        'apikey': service_key,
        'Content-Type': 'application/json'
    }


def create_auth_user(supabase_url: str, service_key: str, email: str, password: str):
    url = f"{supabase_url.rstrip('/')}/auth/v1/admin/users"
    payload = {'email': email, 'password': password, 'email_confirm': True}
    r = requests.post(url, headers=admin_headers(service_key), json=payload, timeout=20)
    try:
        r.raise_for_status()
    except Exception:
        # Print response for debugging and re-raise
        print('ERROR: failed to create auth user:', r.status_code, r.text)
        raise
    return r.json()


def upsert_user_profile(supabase_url: str, service_key: str, user_id: str, email: str, full_name: str = None):
    # Try PATCH by user_id first (if exists), else POST create
    headers = admin_headers(service_key)
    headers['Prefer'] = 'return=representation'
    body = {
        'user_id': user_id,
        'email': email,
        'verified': True,
        'role': 'admin',
        'is_admin': True
    }
    if full_name:
        body['full_name'] = full_name

    # Attempt to insert; PostgREST will return 409 if conflict on unique constraint.
    post_url = f"{supabase_url.rstrip('/')}/rest/v1/user_profile"
    try:
        r = requests.post(post_url, headers=headers, json=body, timeout=20)
        # Success
        if r.status_code in (200, 201):
            return r.json()
        # If insert failed due to existing row or bad request, try patch by email
        if r.status_code in (409, 400):
            # If schema missing boolean flags (is_admin/is_superadmin), retry without them
            try:
                resp_json = r.json()
            except Exception:
                resp_json = None
            msg = ''
            if isinstance(resp_json, dict):
                msg = resp_json.get('message') or resp_json.get('error') or ''
            else:
                msg = r.text or ''

            # If the error indicates missing is_admin column, remove booleans and retry
            if "Could not find the 'is_admin' column" in msg or "Could not find the 'is_superadmin' column" in msg:
                alt_body = {k: v for k, v in body.items() if k not in ('is_admin', 'is_superadmin')}
                patch_url = f"{post_url}?email=eq.{email}"
                r2 = requests.patch(patch_url, headers=headers, json=alt_body, timeout=20)
                r2.raise_for_status()
                return r2.json()

            # Generic patch attempt by email
            patch_url = f"{post_url}?email=eq.{email}"
            r2 = requests.patch(patch_url, headers=headers, json=body, timeout=20)
            r2.raise_for_status()
            return r2.json()

        r.raise_for_status()
    except requests.HTTPError as http_err:
        # print response content if available
        try:
            content = r.text
            code = r.status_code
        except Exception:
            content = 'no-response'
            code = 'no-code'
        print('ERROR: failed to create/upsert user_profile:', code, content)
        raise
    except Exception:
        print('ERROR: failed to create/upsert user_profile:', r.status_code if 'r' in locals() else 'no-response', (r.text if 'r' in locals() else ''))
        raise


def parse_args():
    p = argparse.ArgumentParser(description='Create a Supabase admin user and user_profile')
    p.add_argument('--email', '-e', required=True, help='Email for admin user')
    p.add_argument('--password', '-p', required=True, help='Password for admin user')
    p.add_argument('--name', '-n', required=False, help='Optional full name')
    return p.parse_args()


if __name__ == '__main__':
    args = parse_args()

    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not SUPABASE_URL or not SERVICE_KEY:
        print('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment before running')
        sys.exit(2)

    try:
        print(f"Creating auth user {args.email} (email will be marked confirmed)")
        auth_res = create_auth_user(SUPABASE_URL, SERVICE_KEY, args.email, args.password)
        # auth_res shape may vary; try to find id
        user_id = None
        if isinstance(auth_res, dict):
            user_id = auth_res.get('id') or auth_res.get('user', {}).get('id') or auth_res.get('aud')
        if not user_id:
            # Some responses nest under 'data'
            try:
                if isinstance(auth_res, dict) and auth_res.get('data'):
                    d = auth_res.get('data')
                    if isinstance(d, dict):
                        user_id = d.get('id') or (d.get('user') or {}).get('id')
            except Exception:
                pass

        if not user_id:
            print('WARNING: Could not extract user_id from auth create response; result:')
            print(json.dumps(auth_res, indent=2))
            print('You may need to check the Supabase admin API response manually.')
        else:
            print('Auth user created with id:', user_id)

        print('Upserting user_profile row (role=admin)')
        profile_res = upsert_user_profile(SUPABASE_URL, SERVICE_KEY, user_id or '', args.email, args.name)
        print('Profile upsert result:')
        try:
            print(json.dumps(profile_res, indent=2))
        except Exception:
            print(profile_res)

        print('\nSUCCESS: admin user created / promoted. You can now sign in using the email and password provided.')
    except Exception as e:
        print('\nERROR: operation failed:', str(e))
        sys.exit(1)
