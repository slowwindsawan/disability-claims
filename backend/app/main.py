import os
import uuid
import asyncio
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response, Request, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .schemas import EligibilityRequest, EligibilityResult, CaseFilterRequest
from .ocr import extract_text_from_document
from .legal import load_legal_document_chunks
from .gemini_client import call_gemini, analyze_document_questions
from typing import Dict, Any, Optional
from pathlib import Path
import json
import logging
import traceback
from fastapi import Body
from datetime import datetime, timedelta
import secrets
import requests
# Disable verbose logging from PDF/image libraries
logging.getLogger('pdfminer').setLevel(logging.ERROR)
logging.getLogger('pdfplumber').setLevel(logging.ERROR)
logging.getLogger('PIL').setLevel(logging.WARNING)
logging.getLogger('pdf2image').setLevel(logging.WARNING)

from .supabase_client import (
    create_auth_user,
    insert_user_profile,
    verify_profile_otp,
    update_profile_otp,
    update_profile_user_id,
    get_profile_by_email,
    sign_in,
    get_user_from_token,
    logout_token,
    send_password_reset,
    get_profile_by_user_id,
    get_user_eligibilities,
    update_onboarding_state,
)
from .supabase_client import (
    mark_profile_verified_by_email,
    insert_user_eligibility,
    create_case,
    get_case,
    list_cases_for_user,
    update_case,
    delete_case,
    storage_upload_file,
    insert_case_document,
)
from .supabase_client import (
    list_notifications,
    mark_notification_read,
)
from .supabase_client import _has_supabase_py, _supabase_admin, SUPABASE_URL
from .email_utils import send_otp_email
from .boldsign import create_embedded_sign_link, get_document_status
from .constants import CaseStatusConstants
from .case_status_manager import CaseStatusManager
from .document_analyzer_agent import analyze_case_documents_with_agent
from .openai_form7801_agent import analyze_documents_with_openai_agent
from .job_queue import get_job_queue, JobStatus
from aiohttp import web
from openai import OpenAI

client = OpenAI()

app = FastAPI(title="Eligibility Orchestrator")
# Default to WARNING to reduce noisy logs; allow override with LOG_LEVEL env var
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'WARNING').upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.WARNING),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# Reduce verbosity from noisy third-party libraries and the supabase client
for _name in ('supabase_client', 'supabase_auth', 'httpx', 'httpcore', 'urllib3', 'hpack'):
    try:
        logging.getLogger(_name).setLevel(logging.WARNING)
    except Exception:
        pass
logger = logging.getLogger('eligibility_orchestrator')


def update_case_status(case_id: str, case_data: dict) -> str:
    """
    Determine and update case status based on case data.
    Returns the new status.
    """
    try:
        new_status = CaseStatusManager.get_status_for_case(case_data)
        current_status = case_data.get('status')
        
        # Only update if status has changed
        if current_status != new_status:
            logger.info(f"Updating case {case_id} status from '{current_status}' to '{new_status}'")
            update_case(case_id, {'status': new_status})
        
        return new_status
    except Exception as e:
        logger.warning(f"Failed to update case status for {case_id}: {e}")
        return case_data.get('status')


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency: resolve current user from Authorization header (Bearer token).
    Returns profile dict merged with auth user info or None when no header provided.
    Raises HTTPException(401) when token invalid.
    """
    if not authorization:
        return None
    # Accept either full header or raw token
    token = authorization
    if isinstance(authorization, str) and authorization.lower().startswith('bearer '):
        token = authorization.split(' ', 1)[1]
    try:
        auth_user = get_user_from_token(token)
    except ValueError as ve:
        # propagate specific errors
        if str(ve) == 'user_not_found':
            raise HTTPException(status_code=401, detail='user_not_found')
        raise HTTPException(status_code=401, detail='invalid_token')
    except Exception:
        raise HTTPException(status_code=401, detail='invalid_token')

    # Fetch profile row if exists
    try:
        profiles = get_profile_by_user_id(auth_user.get('id'))
        profile = profiles[0] if profiles else {}
    except Exception:
        profile = {}

    # Merge basic fields
    merged = {
        'id': auth_user.get('id') or profile.get('user_id'),
        'email': auth_user.get('email') or profile.get('email'),
        'role': profile.get('role') or profile.get('roles') or None,
        'profile': profile,
        'auth': auth_user
    }
    return merged


async def require_admin(current_user=Depends(get_current_user)):
    """Dependency: ensure user has admin or subadmin role."""
    if not current_user:
        raise HTTPException(status_code=401, detail='user_not_authenticated')
    
    role = current_user.get('role')
    profile = current_user.get('profile') or {}
    
    # Check role field first
    if role and role in ['admin', 'subadmin']:
        return current_user
    
    # Fallback: check profile flags
    if profile.get('is_admin') or profile.get('is_subadmin'):
        return current_user
    
    raise HTTPException(status_code=403, detail='insufficient_permissions')


@app.get('/me')
async def me(user = Depends(get_current_user)):
    if not user:
        return JSONResponse({'status': 'ok', 'anonymous': True})
    return JSONResponse({'status': 'ok', 'user': {'id': user.get('id'), 'email': user.get('email'), 'role': user.get('role'), 'profile': user.get('profile')}})



def require_auth(user = Depends(get_current_user)):
    """Dependency to ensure the caller is authenticated (any logged-in user)."""
    if not user:
        raise HTTPException(status_code=401, detail='unauthorized')
    return user


def require_superadmin(user = Depends(get_current_user)):
    """Dependency to ensure the caller is a superadmin."""
    if not user:
        raise HTTPException(status_code=401, detail='unauthorized')
    role = user.get('role')
    if role == 'superadmin':
        return user
    prof = user.get('profile') or {}
    if prof.get('is_superadmin'):
        return user
    raise HTTPException(status_code=403, detail='forbidden')


@app.get('/admin/stats')
async def admin_stats(user = Depends(require_admin)):
    """Return aggregate statistics and recent rows used by the admin dashboard.
    This endpoint is best-effort: if the DB tables are missing it will return
    empty/default values rather than failing the whole request.
    """
    try:
        # Import admin helpers from supabase_client (best-effort)
        from .supabase_client import admin_list_profiles, admin_list_cases, admin_count_profiles

        # Fetch data (limit sizes to avoid returning enormous payloads)
        try:
            total_users = admin_count_profiles()
        except Exception:
            logger.exception('admin_stats: failed to count profiles')
            total_users = 0

        try:
            recent_users = admin_list_profiles(limit=20) or []
        except Exception:
            logger.exception('admin_stats: failed to list recent users')
            recent_users = []

        try:
            recent_cases = admin_list_cases(limit=20) or []
        except Exception:
            logger.exception('admin_stats: failed to list recent cases')
            recent_cases = []

        # Compute simple metrics
        recent_user_count_30d = 0
        try:
            from datetime import datetime, timedelta
            cutoff = datetime.utcnow() - timedelta(days=30)
            for u in recent_users:
                created = u.get('created_at')
                if created:
                    try:
                        # created may be ISO string
                        dt = datetime.fromisoformat(created.replace('Z', '+00:00')) if isinstance(created, str) else None
                        if dt and dt >= cutoff:
                            recent_user_count_30d += 1
                    except Exception:
                        pass
        except Exception:
            recent_user_count_30d = 0

        # Basic funnel estimates (best-effort using fields if present)
        total_cases = len(recent_cases) if recent_cases else 0

        stats = {
            'total_users': total_users,
            'recent_user_count_30d': recent_user_count_30d,
            'total_cases_sampled': total_cases,
            'recent_users': recent_users,
            'recent_cases': recent_cases,
        }

        return JSONResponse({'status': 'ok', 'stats': stats})
    except Exception:
        logger.exception('admin_stats failed')
        raise HTTPException(status_code=500, detail='admin_error')


@app.get('/admin/users')
async def admin_users(user = Depends(require_admin)):
    """Return a list of regular users (exclude admins/subadmins)."""
    try:
        from .supabase_client import admin_list_users
        users = admin_list_users(limit=200) or []
        return JSONResponse({'status': 'ok', 'users': users})
    except Exception:
        logger.exception('admin_users failed')
        # return empty list instead of raising to keep the admin UI functional
        return JSONResponse({'status': 'ok', 'users': []})


@app.get('/admin/manage-subadmins')
async def list_subadmins(user = Depends(require_admin)):
    """Admin: list subadmins."""
    try:
        from .supabase_client import admin_list_subadmins
        subs = admin_list_subadmins(limit=200) or []
        return JSONResponse({'status': 'ok', 'subadmins': subs})
    except Exception:
        logger.exception('list_subadmins failed')
        return JSONResponse({'status': 'ok', 'subadmins': []})


@app.get('/admin/subadmins')
async def list_subadmins_new(user = Depends(require_admin)):
    """Admin: list subadmins (new endpoint)."""
    try:
        from .supabase_client import admin_list_subadmins
        subs = admin_list_subadmins(limit=200) or []
        return JSONResponse({'status': 'ok', 'subadmins': subs})
    except Exception:
        logger.exception('list_subadmins failed')
        return JSONResponse({'status': 'ok', 'subadmins': []})


@app.post('/admin/subadmins')
async def create_subadmin_with_permissions(payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Admin: create a subadmin account with permissions. 
    Expects {email, name, phone, password?, admin_permissions?}.
    admin_permissions is a dict with boolean permission flags:
    {
        "view_cases": true,
        "edit_cases": false,
        "delete_cases": false,
        "view_documents": true,
        ...
    }
    """
    email = payload.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='missing_email')
    
    # Validate email format
    if '@' not in email or '.' not in email.split('@')[-1]:
        raise HTTPException(status_code=400, detail='invalid_email_format')
    
    name = payload.get('name')
    phone = payload.get('phone', '').strip() if payload.get('phone') else None
    password = payload.get('password')
    permissions = payload.get('admin_permissions', {})
    
    # Validate password if provided
    if password and len(password) < 6:
        raise HTTPException(status_code=400, detail='password_too_short_min_6_chars')
    
    try:
        from .supabase_client import admin_create_subadmin
        res = admin_create_subadmin(email=email, name=name, phone=phone, password=password, permissions=permissions)
        return JSONResponse({'status': 'ok', 'subadmin': res})
    except ValueError as e:
        # Handle validation errors from backend (email exists, etc)
        error_msg = str(e)
        logger.warning(f'Validation error creating subadmin: {error_msg}')
        
        # Return user-friendly error message
        if 'email_exists' in error_msg:
            raise HTTPException(status_code=400, detail='email_already_exists')
        elif 'already registered' in error_msg.lower():
            raise HTTPException(status_code=400, detail='email_already_registered')
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except requests.exceptions.HTTPError as e:
        logger.exception(f'Supabase auth error: {e.response.status_code}')
        error_msg = f'Failed to create user: {e.response.status_code}'
        try:
            error_detail = e.response.json()
            if 'message' in error_detail:
                error_msg = error_detail['message']
            elif 'msg' in error_detail:
                error_msg = error_detail['msg']
        except:
            pass
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        logger.exception('create_subadmin_with_permissions failed')
        error_detail = str(e).split('\n')[0][:100]  # Get first line of error, max 100 chars
        raise HTTPException(status_code=500, detail=f'create_subadmin_failed: {error_detail}')



@app.post('/admin/manage-subadmins')
async def create_subadmin(payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Admin: create a subadmin account. Expects {email, name, phone, password?}."""
    email = payload.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='missing_email')
    name = payload.get('name')
    phone = payload.get('phone')
    password = payload.get('password')
    try:
        from .supabase_client import admin_create_subadmin
        res = admin_create_subadmin(email=email, name=name, phone=phone, password=password)
        return JSONResponse({'status': 'ok', 'subadmin': res})
    except Exception:
        logger.exception('create_subadmin failed')
        raise HTTPException(status_code=500, detail='create_subadmin_failed')


@app.patch('/admin/manage-subadmins/{user_id}')
async def patch_subadmin(user_id: str, payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Admin: update a subadmin's profile. payload contains fields to patch."""
    try:
        from .supabase_client import admin_update_profile
        res = admin_update_profile(user_id=user_id, fields=payload)
        return JSONResponse({'status': 'ok', 'updated': res})
    except Exception:
        logger.exception('patch_subadmin failed')
        raise HTTPException(status_code=500, detail='patch_subadmin_failed')


@app.delete('/admin/manage-subadmins/{user_id}')
async def delete_subadmin(user_id: str, user = Depends(require_admin)):
    """Admin: delete a subadmin auth user (and optionally the profile)."""
    try:
        from .supabase_client import admin_delete_auth_user
        admin_delete_auth_user(user_id)
        return JSONResponse({'status': 'ok'})
    except Exception:
        logger.exception('delete_subadmin failed')
        raise HTTPException(status_code=500, detail='delete_subadmin_failed')


@app.get('/admin/subadmins/{user_id}/permissions')
async def get_subadmin_permissions_endpoint(user_id: str, user = Depends(require_admin)):
    """Admin: get permissions for a subadmin."""
    try:
        from .supabase_client import _postgrest_headers
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?user_id=eq.{user_id}&select=admin_permissions"
        resp = requests.get(url, headers=_postgrest_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
        permissions = data[0].get('admin_permissions', {}) if data else {}
        return JSONResponse({'status': 'ok', 'permissions': permissions})
    except Exception:
        logger.exception('get_subadmin_permissions failed')
        raise HTTPException(status_code=500, detail='get_permissions_failed')


@app.patch('/admin/subadmins/{user_id}/permissions')
async def update_subadmin_permissions_endpoint(user_id: str, payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Admin: update permissions for a subadmin. Expects {admin_permissions: {...}}."""
    permissions = payload.get('admin_permissions', {})
    try:
        from .supabase_client import update_subadmin_permissions
        res = update_subadmin_permissions(user_id, permissions)
        return JSONResponse({'status': 'ok', 'result': res})
    except Exception:
        logger.exception('update_subadmin_permissions failed')
        raise HTTPException(status_code=500, detail='update_permissions_failed')


@app.delete('/admin/subadmins/{id}')
async def delete_subadmin_endpoint(id: str, user = Depends(require_admin)):
    """Admin: delete a subadmin (both auth user and profile)."""
    try:
        from .supabase_client import admin_delete_auth_user, delete_user_profile
        # Delete the profile first
        try:
            delete_user_profile(id)
            logger.info(f'Deleted profile for user {id}')
        except Exception as e:
            logger.error(f'Error deleting profile: {e}')
        
        # Then delete the auth user - this is critical
        result = admin_delete_auth_user(id)
        logger.info(f'Deleted auth user {id}: {result}')
        
        return JSONResponse({'status': 'ok', 'detail': 'subadmin_deleted'})
    except Exception as e:
        logger.exception(f'delete_subadmin_endpoint failed: {e}')
        raise HTTPException(status_code=500, detail=f'delete_subadmin_failed: {str(e)}')


@app.get('/admin/users/list')
async def admin_list_users(
    limit: int = 200,
    offset: int = 0,
    user = Depends(require_admin)
):
    """Admin: list all non-admin/non-subadmin users (no cases, just users)."""
    try:
        import requests
        from .supabase_client import _postgrest_headers
        
        # Fetch ALL non-admin/non-subadmin users from user_profile
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
        params = {
            'select': 'user_id,email,full_name,phone,identity_code,contact_details,payments',
            'limit': str(limit),
            'offset': str(offset),
            'order': 'created_at.desc'
        }
        
        # Filter out admins and sub-admins
        params['or'] = '(and(role.is.null), and(is_subadmin.is.false)))'
        
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        
        users = resp.json()
        
        return JSONResponse({
            'status': 'ok',
            'users': users
        })
    except Exception:
        logger.exception('admin_list_users failed')
        raise HTTPException(status_code=500, detail='admin_list_users_failed')


@app.get('/admin/users/cases')
async def admin_list_all_users_cases(
    limit: int = 200,
    offset: int = 0,
    user = Depends(require_admin)
):
    """
    Admin: list all non-admin/non-subadmin users with their first case and enriched data.
    Fetches all user profiles (excluding admins and sub-admins) and their cases, then enriches with:
    - ai_score from user_profile.eligibility_raw.eligibility_score
    - estimated_claim_amount from cases.call_summary.estimated_claim_amount
    - products from cases.call_summary.products
    - recent_activity = "not available"
    """
    try:
        import requests
        from .supabase_client import _postgrest_headers
        
        logger.info(f'admin_list_all_users_cases called by user: {user.get("id")}')
        
        # Fetch ALL non-admin/non-subadmin users from user_profile
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
        params = {
            'limit': str(limit),
            'offset': str(offset),
            'order': 'created_at.desc'
        }
        
        # Filter out admins and sub-admins
        # Include only users where: (role is NULL OR role NOT IN admin/subadmin) AND (is_admin != true) AND (is_subadmin != true)
        params['or'] = '(and(role.is.null), and(is_subadmin.is.false)))'
        
        headers = _postgrest_headers()
        headers['Prefer'] = 'count=exact'
        
        logger.info(f'Fetching users from user_profile with limit={limit}, offset={offset}')
        
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        
        # Get total count from Content-Range header
        total = 0
        content_range = resp.headers.get('Content-Range')
        if content_range:
            parts = content_range.split('/')
            if len(parts) > 1:
                try:
                    total = int(parts[1])
                except (ValueError, IndexError):
                    pass
        
        users = resp.json()
        logger.info(f'Fetched {len(users)} users from user_profile (total: {total})')
        
        # For each user, fetch their associated cases
        cases = []
        for profile in users:
            user_id = profile.get('user_id')
            if not user_id:
                logger.warning(f'User profile {profile.get("id")} has no user_id, skipping')
                continue
            
            try:
                # Fetch FIRST case for this user only
                cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
                cases_params = {
                    'user_id': f'eq.{user_id}',
                    'order': 'created_at.desc',
                    'limit': '1'  # Only fetch the first case
                }
                
                cases_resp = requests.get(cases_url, headers=_postgrest_headers(), params=cases_params, timeout=10)
                cases_resp.raise_for_status()
                user_cases = cases_resp.json()
                
                logger.debug(f'User {user_id} has {len(user_cases)} case(s)')
                
                # Skip users with no cases
                if not user_cases or len(user_cases) == 0:
                    logger.debug(f'User {user_id} has no cases, skipping')
                    continue
                
                # Process only the first case
                case = user_cases[0]
                
                # Skip if case is None
                if not case:
                    logger.warning(f'Case data is None for user_id={user_id}, skipping')
                    continue
                
                logger.debug(f'Case data for user {user_id}: status={case.get("status")}, id={case.get("id")}')
                
                # Enrich case with user and eligibility data
                try:
                    case['user_name'] = profile.get('full_name') if profile else None
                    case['user_email'] = profile.get('email') if profile else None
                    case['user_phone'] = profile.get('phone') if profile else None
                    case['user_photo_url'] = profile.get('photo_url') if profile else None
                    case['user_id'] = user_id
                    
                    # Fetch FIRST eligibility record for this user from user_eligibility table
                    eligibility_raw = {}
                    try:
                        eligibility_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_eligibility"
                        eligibility_params = {
                            'user_id': f'eq.{user_id}',
                            'order': 'processed_at.desc',
                            'limit': '1'  # Only fetch the first (most recent) eligibility record
                        }
                        
                        eligibility_resp = requests.get(eligibility_url, headers=_postgrest_headers(), params=eligibility_params, timeout=10)
                        eligibility_resp.raise_for_status()
                        eligibility_records = eligibility_resp.json()
                        
                        if eligibility_records and len(eligibility_records) > 0:
                            eligibility_record = eligibility_records[0]
                            eligibility_raw = eligibility_record.get('eligibility_raw', {})
                            
                            # Parse eligibility_raw if it's a string
                            if isinstance(eligibility_raw, str):
                                try:
                                    import json
                                    eligibility_raw = json.loads(eligibility_raw)
                                except:
                                    eligibility_raw = {}
                        
                        logger.debug(f'Fetched eligibility for user {user_id}: score={eligibility_raw.get("eligibility_score", 0)}')
                    except Exception as e:
                        logger.warning(f'Failed to fetch eligibility for user_id={user_id}: {e}')
                        eligibility_raw = {}
                    
                    case['ai_score'] = eligibility_raw.get('eligibility_score', 0) if eligibility_raw else 0
                    case['eligibility_status'] = eligibility_raw.get('eligibility_status', 'not_rated') if eligibility_raw else 'not_rated'
                    
                    # Extract estimated_claim_amount and products from call_summary
                    call_summary = {}
                    if case:
                        call_summary = case.get('call_summary', {})
                        if isinstance(call_summary, str):
                            try:
                                import json
                                call_summary = json.loads(call_summary)
                            except:
                                call_summary = {}
                    
                    case['estimated_claim_amount'] = call_summary.get('estimated_claim_amount', 0) if call_summary else 0
                    case['products'] = call_summary.get('products', []) if call_summary else []
                    
                    # Add recent activity
                    case['recent_activity'] = 'not available'
                    
                    cases.append(case)
                except Exception as e:
                    logger.warning(f'Failed to enrich case for user_id={user_id}: {e}')
                    
            except Exception as e:
                logger.warning(f'Failed to fetch cases for user_id={user_id}: {e}')
        
        logger.info(f'Total cases fetched for all users: {len(cases)}')
        
        return JSONResponse({
            'status': 'ok', 
            'cases': cases, 
            'total': len(cases)
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_list_all_users_cases failed: {e}')
        return JSONResponse({'status': 'error', 'message': str(e), 'cases': [], 'total': 0}, status_code=500)


@app.get('/admin/users/{user_id}')
async def admin_get_user(user_id: str, user = Depends(require_admin)):
    """Admin: get user profile details."""
    try:
        from .supabase_client import get_profile_by_user_id, get_user_eligibilities
        profiles = get_profile_by_user_id(user_id)
        if not profiles:
            raise HTTPException(status_code=404, detail='user_not_found')
        profile = profiles[0]
        
        # Get onboarding answers
        onboarding_state = profile.get('onboarding_state') or {}
        
        # Get eligibility records
        eligibilities = get_user_eligibilities(user_id) or []
        
        return JSONResponse({
            'status': 'ok',
            'user': {
                'id': user_id,
                'email': profile.get('email'),
                'full_name': profile.get('full_name'),
                'phone': profile.get('phone'),
                'identity_code': profile.get('identity_code'),
                'contact_details': profile.get('contact_details'),
                'payments': profile.get('payments'),
                'role': profile.get('role') or profile.get('roles'),
                'verified': profile.get('verified'),
                'onboarding_state': onboarding_state,
                'eligibilities': eligibilities,
                'created_at': profile.get('created_at'),
                'updated_at': profile.get('updated_at')
            }
        })
    except HTTPException:
        raise
    except Exception:
        logger.exception('admin_get_user failed')
        raise HTTPException(status_code=500, detail='admin_get_user_failed')@app.patch('/admin/users/{user_id}')
async def patch_admin_user(user_id: str, payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Admin: patch a user's profile fields (role, email, full_name, etc)."""
    try:
        from .supabase_client import admin_update_profile
        res = admin_update_profile(user_id=user_id, fields=payload)
        return JSONResponse({'status': 'ok', 'updated': res})
    except Exception:
        logger.exception('patch_admin_user failed')
        raise HTTPException(status_code=500, detail='patch_admin_user_failed')


@app.delete('/admin/users/{user_id}')
async def delete_admin_user(user_id: str, user = Depends(require_superadmin)):
    """Superadmin-only: delete an auth user (and optionally profile)."""
    try:
        from .supabase_client import admin_delete_auth_user
        admin_delete_auth_user(user_id)
        return JSONResponse({'status': 'ok'})
    except Exception:
        logger.exception('delete_admin_user failed')
        raise HTTPException(status_code=500, detail='delete_admin_user_failed')


@app.get('/admin/cases')
async def admin_list_all_cases(
    limit: int = 200,
    offset: int = 0,
    status: Optional[str] = None,
    eligibility: Optional[str] = None,
    search: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Admin: list all users (except admins/sub-admins) with their cases and eligibility data."""
    try:
        from .supabase_client import _postgrest_headers, _supabase_admin
        import requests
        
        # Fetch ALL users from user_profile (excluding admin/subadmin)
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
        params = {
            'limit': str(limit),
            'offset': str(offset),
            'order': 'created_at.desc'
        }
        
        # Filter out admins and sub-admins
        # Include only users where role is NULL or role is NOT 'admin' or 'subadmin'
        # Using 'or' to handle both null and non-admin/non-subadmin cases
        params['or'] = '(role.is.null,and(role.neq.admin,role.neq.subadmin))'
        
        headers = _postgrest_headers()
        headers['Prefer'] = 'count=exact'
        
        logger.info(f'Fetching users from user_profile with limit={limit}, offset={offset}')
        
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        
        # Get total count from Content-Range header
        total = 0
        content_range = resp.headers.get('Content-Range')
        if content_range:
            parts = content_range.split('/')
            if len(parts) > 1:
                try:
                    total = int(parts[1])
                except (ValueError, IndexError):
                    pass
        
        users = resp.json()
        logger.info(f'Fetched {len(users)} users from user_profile (total: {total})')
        
        # For each user, fetch their associated cases
        cases = []
        for profile in users:
            user_id = profile.get('user_id')
            if not user_id:
                logger.warning(f'User profile {profile.get("id")} has no user_id, skipping')
                continue
            
            try:
                # Fetch cases for this user
                cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
                cases_params = {
                    'user_id': f'eq.{user_id}',
                    'order': 'created_at.desc',
                    'limit': '1000'
                }
                
                cases_resp = requests.get(cases_url, headers=_postgrest_headers(), params=cases_params, timeout=10)
                cases_resp.raise_for_status()
                user_cases = cases_resp.json()
                
                logger.debug(f'User {user_id} has {len(user_cases)} case(s)')
                
                # Enrich each case with user and eligibility data
                for case in user_cases:
                    case['user_name'] = profile.get('full_name')
                    case['user_email'] = profile.get('email')
                    case['user_phone'] = profile.get('phone')
                    case['user_photo_url'] = profile.get('photo_url')
                    case['user_id'] = user_id
                    
                    # Get eligibility score from user_profile.eligibility_raw
                    eligibility_raw = profile.get('eligibility_raw', {})
                    if isinstance(eligibility_raw, str):
                        try:
                            import json
                            eligibility_raw = json.loads(eligibility_raw)
                        except:
                            eligibility_raw = {}
                    
                    case['ai_score'] = eligibility_raw.get('eligibility_score', 0)
                    case['eligibility_status'] = eligibility_raw.get('eligibility_status', 'not_rated')
                    
                    # Extract estimated_claim_amount from call_summary
                    call_summary = case.get('call_summary', {})
                    if isinstance(call_summary, str):
                        try:
                            import json
                            call_summary = json.loads(call_summary)
                        except:
                            call_summary = {}
                    case['estimated_claim_amount'] = call_summary.get('estimated_claim_amount', 0)
                    
                    # Add recent activity
                    case['recent_activity'] = 'not available'
                    
                    cases.append(case)
                    
            except Exception as e:
                logger.warning(f'Failed to fetch cases for user_id={user_id}: {e}')
        
        logger.info(f'Total cases fetched for all users: {len(cases)}')
        
        return JSONResponse({
            'status': 'ok', 
            'cases': cases, 
            'total': len(cases)
        })
    except Exception as e:
        logger.exception(f'admin_list_all_cases failed: {e}')
        return JSONResponse({'status': 'ok', 'cases': [], 'total': 0})


@app.get('/admin/claims-table')
async def admin_claims_table(
    limit: int = 200,
    offset: int = 0,
    user = Depends(get_current_user)
):
    """
    Admin panel endpoint: Fetch all claims/cases data for the table view.
    Returns data with:
    - לקוח (Client): from user_profile (full_name, email, phone)
    - מוצרים בתיק (Products): from cases.call_summary.products
    - סטטוס (Status): from cases.status
    - AI Score (ציון AI): from user_profile.eligibility_raw.eligibility_score
    - Estimated claim amount (סכום עתודה משוער): from cases.call_summary.estimated_claim_amount
    - Recent activity (פעילות אחרונה): hardcoded as "not available"
    
    Filters: Only non-admin and non-sub-admin users
    """
    try:
        import requests
        from .supabase_client import _postgrest_headers
        
        # Fetch ALL non-admin/non-subadmin users from user_profile
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
        params = {
            'limit': str(limit),
            'offset': str(offset),
            'order': 'created_at.desc'
        }
        
        # Filter: exclude admins and sub-admins
        params['or'] = '(and(role.is.null,is_admin.is.false,is_subadmin.is.false),and(role.not.in.(admin,subadmin),is_admin.is.false,is_subadmin.is.false))'
        
        headers = _postgrest_headers()
        headers['Prefer'] = 'count=exact'
        
        logger.info(f'Admin claims table: Fetching users with limit={limit}, offset={offset}')
        
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        
        total = 0
        content_range = resp.headers.get('Content-Range')
        if content_range:
            parts = content_range.split('/')
            if len(parts) > 1:
                try:
                    total = int(parts[1])
                except (ValueError, IndexError):
                    pass
        
        users = resp.json()
        logger.info(f'Fetched {len(users)} users (total: {total})')
        
        # Build claims table data
        claims_data = []
        
        for profile in users:
            user_id = profile.get('user_id')
            if not user_id:
                continue
            
            try:
                # Fetch cases for this user
                cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
                cases_params = {
                    'user_id': f'eq.{user_id}',
                    'order': 'created_at.desc',
                    'limit': '1000'
                }
                
                cases_resp = requests.get(cases_url, headers=_postgrest_headers(), params=cases_params, timeout=10)
                cases_resp.raise_for_status()
                user_cases = cases_resp.json()
                
                # For each case, build the claims table row
                for case in user_cases:
                    # Parse call_summary if it's a string
                    call_summary = case.get('call_summary', {})
                    if isinstance(call_summary, str):
                        try:
                            import json
                            call_summary = json.loads(call_summary)
                        except:
                            call_summary = {}
                    
                    # Parse eligibility_raw if it's a string
                    eligibility_raw = profile.get('eligibility_raw', {})
                    if isinstance(eligibility_raw, str):
                        try:
                            import json
                            eligibility_raw = json.loads(eligibility_raw)
                        except:
                            eligibility_raw = {}
                    
                    # Build row for claims table
                    row = {
                        'id': case.get('id'),
                        'case_id': case.get('id'),
                        'user_id': user_id,
                        # לקוח (Client) - from user_profile
                        'client_name': profile.get('full_name'),
                        'client_email': profile.get('email'),
                        'client_phone': profile.get('phone'),
                        'client_photo': profile.get('photo_url'),
                        # מוצרים בתיק (Products) - from call_summary.products
                        'products': call_summary.get('products', []),
                        # סטטוס (Status) - from cases.status
                        'status': case.get('status'),
                        # ציון AI (AI Score) - from eligibility_raw.eligibility_score
                        'ai_score': eligibility_raw.get('eligibility_score', 0),
                        'eligibility_status': eligibility_raw.get('eligibility_status', 'not_rated'),
                        # סכום עתודה משוער (Estimated claim amount) - from call_summary.estimated_claim_amount
                        'estimated_claim_amount': call_summary.get('estimated_claim_amount', 0),
                        # פעילות אחרונה (Recent activity) - hardcoded
                        'recent_activity': 'not available',
                        # Additional metadata
                        'created_at': case.get('created_at'),
                        'updated_at': case.get('updated_at'),
                    }
                    
                    claims_data.append(row)
                    
            except Exception as e:
                logger.warning(f'Failed to fetch cases for user_id={user_id}: {e}')
        
        logger.info(f'Built claims table with {len(claims_data)} rows')
        
        return JSONResponse({
            'status': 'ok',
            'data': claims_data,
            'total': len(claims_data)
        })
        
    except Exception as e:
        logger.exception(f'admin_claims_table failed: {e}')
        return JSONResponse({'status': 'ok', 'data': [], 'total': 0})


@app.post('/admin/cases/filter')
async def filter_cases_advanced(
    filter_params: CaseFilterRequest,
    user = Depends(get_current_user)
):
    """
    Advanced filtering endpoint for admin cases.
    Filters by:
    - Status (list)
    - Minimum/Maximum AI score
    - Minimum/Maximum income potential (estimated_claim_amount)
    - Start date (created_at)
    - End date (updated_at)
    - Search query (client name, email, case ID)
    """
    try:
        import requests
        from .supabase_client import _postgrest_headers
        
        # Build filter params for PostgREST query
        filters = []
        params = {}
        
        # Status filter
        if filter_params.status and len(filter_params.status) > 0:
            status_list = ','.join([f'"{s}"' for s in filter_params.status])
            filters.append(f'status.in.({status_list})')
        
        # Date filters
        if filter_params.start_date:
            filters.append(f"created_at.gte.{filter_params.start_date.isoformat()}")
        if filter_params.end_date:
            filters.append(f"updated_at.lte.{filter_params.end_date.isoformat()}")
        
        # Build the initial cases query
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
        query_params = {
            'limit': str(filter_params.limit),
            'offset': str(filter_params.offset),
            'order': 'created_at.desc'
        }
        
        # Add filters
        for f in filters:
            query_params['or'] = query_params.get('or', '') + (',' if query_params.get('or') else '') + f
        
        headers = _postgrest_headers()
        headers['Prefer'] = 'count=exact'
        
        resp = requests.get(url, headers=headers, params=query_params, timeout=15)
        resp.raise_for_status()
        
        cases = resp.json()
        
        # Now process cases and apply additional filters
        filtered_data = []
        
        for case in cases:
            # Skip if case is None or not a dict
            if not case or not isinstance(case, dict):
                logger.warning(f'Skipping invalid case object: {case}')
                continue
            
            user_id = case.get('user_id')
            if not user_id:
                continue
            
            try:
                # Fetch user profile for eligibility score
                profile_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?user_id=eq.{user_id}"
                logger.info(f'Fetching profile for case {case.get("id")}, user_id: {user_id}')
                profile_resp = requests.get(profile_url, headers=_postgrest_headers(), timeout=10)
                profile_resp.raise_for_status()
                
                profiles = profile_resp.json()
                if not profiles:
                    logger.warning(f'No profiles found for user_id: {user_id}, case: {case.get("id")}')
                    continue
                
                profile = profiles[0]
                if not profile:
                    logger.warning(f'Profile is None for user_id: {user_id}, case: {case.get("id")}')
                    continue
                
                logger.debug(f'Profile loaded: {profile.get("user_id")} for case {case.get("id")}')
                
                # Parse eligibility_raw
                eligibility_raw = profile.get('eligibility_raw', {})
                logger.debug(f'eligibility_raw type: {type(eligibility_raw)}, value: {eligibility_raw}')
                if isinstance(eligibility_raw, str):
                    try:
                        eligibility_raw = json.loads(eligibility_raw)
                    except Exception as parse_err:
                        logger.warning(f'Failed to parse eligibility_raw for case {case.get("id")}: {parse_err}')
                        eligibility_raw = {}
                
                ai_score = eligibility_raw.get('eligibility_score', 0) if eligibility_raw else 0
                logger.debug(f'AI score for case {case.get("id")}: {ai_score}')
                
                # Apply AI score filters
                if filter_params.min_ai_score is not None and ai_score < filter_params.min_ai_score:
                    logger.debug(f'Case {case.get("id")} filtered out: AI score {ai_score} < {filter_params.min_ai_score}')
                    continue
                if filter_params.max_ai_score is not None and ai_score > filter_params.max_ai_score:
                    logger.debug(f'Case {case.get("id")} filtered out: AI score {ai_score} > {filter_params.max_ai_score}')
                    continue
                
                # Parse call_summary
                call_summary = case.get('call_summary', {})
                logger.debug(f'call_summary type: {type(call_summary)}, value: {call_summary}')
                if isinstance(call_summary, str):
                    try:
                        call_summary = json.loads(call_summary)
                    except Exception as parse_err:
                        logger.warning(f'Failed to parse call_summary for case {case.get("id")}: {parse_err}')
                        call_summary = {}
                
                estimated_claim = call_summary.get('estimated_claim_amount', 0) if call_summary else 0
                logger.debug(f'Estimated claim for case {case.get("id")}: {estimated_claim}')
                
                # Apply income potential filters
                if filter_params.min_income_potential is not None and estimated_claim < filter_params.min_income_potential:
                    logger.debug(f'Case {case.get("id")} filtered out: claim {estimated_claim} < {filter_params.min_income_potential}')
                    continue
                if filter_params.max_income_potential is not None and estimated_claim > filter_params.max_income_potential:
                    logger.debug(f'Case {case.get("id")} filtered out: claim {estimated_claim} > {filter_params.max_income_potential}')
                    continue
                
                # Apply search query filter
                if filter_params.search_query:
                    query_lower = filter_params.search_query.lower()
                    client_name = profile.get('full_name') or ''
                    client_email = profile.get('email') or ''
                    case_id = case.get('id', '')
                    logger.debug(f'Searching in: name={client_name}, email={client_email}, case_id={case_id}')
                    match = (
                        query_lower in client_name.lower() or
                        query_lower in client_email.lower() or
                        query_lower in case_id.lower()
                    )
                    if not match:
                        logger.debug(f'Case {case.get("id")} filtered out: search query "{filter_params.search_query}" not found')
                        continue
                
                # Build response row
                row = {
                    'case_id': case.get('id'),
                    'user_id': user_id,
                    'client_name': profile.get('full_name'),
                    'client_email': profile.get('email'),
                    'client_phone': profile.get('phone'),
                    'status': case.get('status'),
                    'ai_score': ai_score,
                    'eligibility_status': eligibility_raw.get('eligibility_status', 'not_rated') if eligibility_raw else 'not_rated',
                    'estimated_claim_amount': estimated_claim,
                    'created_at': case.get('created_at'),
                    'updated_at': case.get('updated_at'),
                    'products': call_summary.get('products', []) if call_summary else [],
                    'risk_assessment': call_summary.get('risk_assessment') if call_summary else None,
                }
                logger.info(f'Case {case.get("id")} passed all filters and added to results')
                
                filtered_data.append(row)
                
            except Exception as e:
                case_id = case.get("id") if isinstance(case, dict) else "unknown"
                import traceback
                error_traceback = traceback.format_exc()
                logger.error(f'Failed to process case {case_id}: {type(e).__name__}: {e}')
                logger.error(f'Traceback: {error_traceback}')
                continue
        
        return JSONResponse({
            'status': 'ok',
            'data': filtered_data,
            'total': len(filtered_data),
            'limit': filter_params.limit,
            'offset': filter_params.offset
        })
        
    except Exception as e:
        logger.exception(f'filter_cases_advanced failed: {e}')
        return JSONResponse({'status': 'error', 'message': str(e), 'data': [], 'total': 0})


@app.post('/admin/filters')
async def save_admin_filter(
    filter_name: str = Form(...),
    filter_data: str = Form(...),
    user = Depends(get_current_user)
):
    """Save a filter in user_profile.admin_filters JSONB column."""
    try:
        if user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail='admin_required')
        
        from .supabase_client import _postgrest_headers
        
        # Get current filters
        profile_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?id=eq.{user['id']}"
        profile_resp = requests.get(profile_url, headers=_postgrest_headers(), timeout=10)
        profile_resp.raise_for_status()
        
        profiles = profile_resp.json()
        if not profiles:
            raise HTTPException(status_code=404, detail='profile_not_found')
        
        profile = profiles[0]
        admin_filters = profile.get('admin_filters', {})
        if isinstance(admin_filters, str):
            try:
                admin_filters = json.loads(admin_filters)
            except:
                admin_filters = {}
        
        # Add/update filter
        filter_json = json.loads(filter_data)
        admin_filters[filter_name] = {
            'criteria': filter_json,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Update profile
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?id=eq.{user['id']}"
        headers = _postgrest_headers().copy()
        headers['Prefer'] = 'return=representation'
        
        resp = requests.patch(url, headers=headers, json={'admin_filters': admin_filters}, timeout=15)
        resp.raise_for_status()
        
        return JSONResponse({'status': 'ok', 'filter_name': filter_name})
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'save_admin_filter failed: {e}')
        raise HTTPException(status_code=500, detail='save_filter_failed')


@app.get('/admin/filters')
async def get_admin_filters(user = Depends(get_current_user)):
    """Get all saved filters from user_profile.admin_filters."""
    try:
        if user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail='admin_required')
        
        from .supabase_client import _postgrest_headers
        
        profile_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?id=eq.{user['id']}"
        profile_resp = requests.get(profile_url, headers=_postgrest_headers(), timeout=10)
        profile_resp.raise_for_status()
        
        profiles = profile_resp.json()
        if not profiles:
            return JSONResponse({'status': 'ok', 'data': {}})
        
        admin_filters = profiles[0].get('admin_filters', {})
        if isinstance(admin_filters, str):
            try:
                admin_filters = json.loads(admin_filters)
            except:
                admin_filters = {}
        
        return JSONResponse({'status': 'ok', 'data': admin_filters})
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'get_admin_filters failed: {e}')
        raise HTTPException(status_code=500, detail='get_filters_failed')


@app.delete('/admin/filters/{filter_name}')
async def delete_admin_filter(filter_name: str, user = Depends(get_current_user)):
    """Delete a filter from user_profile.admin_filters."""
    try:
        if user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail='admin_required')
        
        from .supabase_client import _postgrest_headers
        
        profile_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?id=eq.{user['id']}"
        profile_resp = requests.get(profile_url, headers=_postgrest_headers(), timeout=10)
        profile_resp.raise_for_status()
        
        profiles = profile_resp.json()
        if not profiles:
            raise HTTPException(status_code=404, detail='profile_not_found')
        
        admin_filters = profiles[0].get('admin_filters', {})
        if isinstance(admin_filters, str):
            try:
                admin_filters = json.loads(admin_filters)
            except:
                admin_filters = {}
        
        if filter_name not in admin_filters:
            raise HTTPException(status_code=404, detail='filter_not_found')
        
        del admin_filters[filter_name]
        
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?id=eq.{user['id']}"
        headers = _postgrest_headers().copy()
        headers['Prefer'] = 'return=representation'
        
        resp = requests.patch(url, headers=headers, json={'admin_filters': admin_filters}, timeout=15)
        resp.raise_for_status()
        
        return JSONResponse({'status': 'ok', 'deleted': True})
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'delete_admin_filter failed: {e}')
        raise HTTPException(status_code=500, detail='delete_filter_failed')


@app.get('/cases/{case_id}/documents')
async def get_case_documents(case_id: str, user = Depends(require_auth)):
    """Get all documents associated with a case."""
    try:
        from .supabase_client import get_case_documents
        
        # Verify user has access to this case
        from .supabase_client import get_case
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        # Check if user is admin or owner
        if user['role'] != 'admin' and case.get('user_id') != user['id']:
            raise HTTPException(status_code=403, detail='access_denied')
        
        documents = get_case_documents(case_id)
        return JSONResponse({'status': 'ok', 'documents': documents})
    except HTTPException:
        raise
    except Exception:
        logger.exception(f'get_case_documents failed for case_id={case_id}')
        raise HTTPException(status_code=500, detail='get_case_documents_failed')


@app.get('/cases/{case_id}/documents/{document_id}/summary')
async def get_document_summary(
    case_id: str,
    document_id: str,
    user = Depends(require_auth)
):
    """Get detailed summary and metadata for a specific document."""
    try:
        from .supabase_client import get_case
        import uuid
        
        # Verify user has access to this case
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        # Check if user is admin or has access to this case
        role = user.get('role')
        profile = user.get('profile') or {}
        is_admin = (role and role in ['admin', 'subadmin']) or profile.get('is_admin') or profile.get('is_subadmin')
        
        # Admin users can access any case, non-admins can only access their own cases
        if not is_admin:
            if case.get('user_id') != user['id']:
                raise HTTPException(status_code=403, detail='access_denied')
        
        # Fetch document from case_documents table
        from .supabase_client import _supabase_admin
        
        response = _supabase_admin.table('case_documents').select(
            'id, file_name, file_type, created_at, metadata'
        ).eq('id', document_id).eq('case_id', case_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail='document_not_found')
        
        doc = response.data[0]
        metadata = doc.get('metadata', {})
        
        # Extract summary information
        return JSONResponse({
            'status': 'ok',
            'document': {
                'id': doc.get('id'),
                'file_name': doc.get('file_name'),
                'file_type': doc.get('file_type'),
                'created_at': doc.get('created_at'),
                'metadata': {
                    'document_summary': metadata.get('document_summary', ''),
                    'key_points': metadata.get('key_points', []),
                    'is_relevant': metadata.get('is_relevant', False),
                    'upload_source': metadata.get('upload_source', ''),
                    'relevance_score': metadata.get('relevance_score'),
                    'document_type': metadata.get('document_type'),
                    'relevance_reason': metadata.get('relevance_reason', ''),
                    'structured_data': metadata.get('structured_data', {})
                }
            }
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'get_document_summary failed for document_id={document_id}')
        raise HTTPException(status_code=500, detail='get_document_summary_failed')


@app.post('/cases/{case_id}/documents')
async def upload_case_document(
    case_id: str,
    file: UploadFile = File(...),
    document_type: str = Form('general'),
    document_id: str = Form(None),
    document_name: str = Form(None),
    user = Depends(require_auth)
):
    """Upload an additional document to a case. Supports PDF and image files with OCR and summarization.
    
    Args:
        document_id: Backend ID if available (from case_documents table)
        document_name: Name of the document from documents_requested_list (REQUIRED for matching)
    
    The document_name is used to match and update the correct document in call_summary.documents_requested_list.
    The local uploaded filename is irrelevant for matching - it's just stored as the file.
    """
    try:
        from datetime import datetime
        from .supabase_client import (
            get_case, 
            storage_upload_file, 
            insert_case_document,
            get_profile_by_user_id,
            update_case
        )
        from pathlib import Path
        
        # Verify user has access to this case
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        if user['role'] != 'admin' and case.get('user_id') != user['id']:
            raise HTTPException(status_code=403, detail='access_denied')
        
        # Verify user_profile exists (required for FK constraint)
        profile = get_profile_by_user_id(user['id'])
        if not profile:
            raise HTTPException(status_code=400, detail='user_profile_not_found')
        
        # Read file content
        content = await file.read()
        filesize = len(content)
        file_ext = Path(file.filename).suffix or ''
        
        # Validate file type - only PDF and image files allowed
        from .ocr import is_pdf, is_image
        if not (is_pdf(content, file.filename) or is_image(file.filename)):
            raise HTTPException(status_code=400, detail='invalid_file_type_only_pdf_and_images_allowed')
        
        # Extract text and analyze document for summary
        document_summary = None
        document_key_points = []
        is_relevant = True
        
        try:
            logger.info(f"Analyzing document: {file.filename}")
            text, extraction_success = extract_text_from_document(content, file.filename)
            
            if extraction_success and text:
                from .dashboard_document_summarizer import summarize_dashboard_document
                summary_result = summarize_dashboard_document(text, document_name=file.filename, document_type=document_type)
                
                document_summary = summary_result.get('document_summary', '')
                document_key_points = summary_result.get('key_points', [])
                is_relevant = summary_result.get('is_relevant', True)
                
                logger.info(f"Document analysis complete: relevant={is_relevant}, summary_length={len(document_summary) if document_summary else 0}, key_points={len(document_key_points)}")
            else:
                logger.warning(f"Failed to extract text from {file.filename}")
        except Exception as e:
            logger.warning(f"Failed to analyze document: {e}")
        
        # Upload to Supabase Storage
        from .utils import sanitize_filename
        import uuid
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = sanitize_filename(Path(file.filename).name)
        
        # If sanitization removed everything, use extension and unique ID
        if not safe_filename or safe_filename == Path(file.filename).suffix:
            safe_filename = f"document_{unique_id}{file_ext}"
        else:
            # Add unique ID to ensure no collisions
            name_parts = safe_filename.rsplit('.', 1)
            if len(name_parts) == 2:
                safe_filename = f"{name_parts[0]}_{unique_id}.{name_parts[1]}"
            else:
                safe_filename = f"{safe_filename}_{unique_id}"
        
        storage_path = f"cases/{case_id}/documents/{timestamp}_{safe_filename}"
        
        upload_result = storage_upload_file(
            bucket='case-documents',
            path=storage_path,
            file_bytes=content,
            content_type=file.content_type or 'application/octet-stream',
            upsert=True
        )
        storage_url = upload_result.get('public_url')
        logger.info(f"Uploaded document to: {storage_url}")
        
        # Insert document record with analysis metadata
        doc_record = insert_case_document(
            case_id=case_id,
            file_path=storage_path,
            file_name=file.filename,
            file_type=file.content_type,
            file_size=filesize,
            document_type=document_type,
            uploaded_by=user['profile']['id'],
            metadata={
                'upload_source': 'manual_upload',
                'document_summary': document_summary,
                'key_points': document_key_points,
                'is_relevant': is_relevant
            }
        )
        
        # Update call_summary.documents_requested_list with uploaded document info
        try:
            call_summary = case.get('call_summary', {})
            
            # Parse call_summary if it's a string (JSON)
            if isinstance(call_summary, str):
                try:
                    call_summary = json.loads(call_summary)
                except json.JSONDecodeError:
                    call_summary = {}
            
            # Ensure call_summary is a dict
            if not isinstance(call_summary, dict):
                call_summary = {}
            
            # Ensure documents_requested_list exists
            if 'documents_requested_list' not in call_summary:
                call_summary['documents_requested_list'] = []
            
            # Update document status - try to match by document_id or name
            documents_list = call_summary.get('documents_requested_list', [])
            
            # Ensure documents_list contains dicts, not strings
            normalized_documents_list = []
            for item in documents_list:
                if isinstance(item, str):
                    try:
                        item = json.loads(item)
                    except (json.JSONDecodeError, ValueError):
                        logger.warning(f"Could not parse document item as JSON: {item}")
                        continue
                if isinstance(item, dict):
                    normalized_documents_list.append(item)
            documents_list = normalized_documents_list
            
            # Get the document ID from the inserted record (from case_documents table)
            doc_id = doc_record.get('id') if isinstance(doc_record, dict) else None
            
            logger.info(f"DEBUG upload_case_document:")
            logger.info(f"  document_id from frontend: {document_id}")
            logger.info(f"  document_name from frontend: {document_name}")
            logger.info(f"  file.filename (local file, IGNORED for matching): {file.filename}")
            logger.info(f"  doc_id from case_documents: {doc_id}")
            logger.info(f"  documents_list count: {len(documents_list)}")
            for idx, doc in enumerate(documents_list):
                logger.info(f"    doc[{idx}]: id={doc.get('id')}, name={doc.get('name')}")
            
            # Match document by ID first, then by exact name from documents_requested_list
            document_matched = False
            
            # Strategy 1: If document_id was provided, try to match by ID first
            if document_id:
                for idx, doc in enumerate(documents_list):
                    if doc.get('id') == document_id:
                        doc['uploaded'] = True
                        doc['document_id'] = doc_id
                        doc['file_url'] = storage_url
                        document_matched = True
                        logger.info(f"✓ MATCHED by ID at index {idx}: {doc.get('name')}")
                        break
            
            # Strategy 2: If document_name provided from frontend, match by exact name
            if not document_matched and document_name:
                logger.info(f"[Strategy 2] Matching by document_name: {document_name}")
                for idx, doc in enumerate(documents_list):
                    if doc.get('name') == document_name:
                        doc['uploaded'] = True
                        doc['document_id'] = doc_id
                        doc['file_url'] = storage_url
                        document_matched = True
                        logger.info(f"✓ MATCHED by name at index {idx}: {doc.get('name')}")
                        break
            
            if not document_matched:
                logger.warning(f"✗ NO MATCH FOUND")
                if not document_name and not document_id:
                    logger.warning(f"  ERROR: Frontend must provide document_name or document_id from documents_requested_list")
                elif document_name:
                    logger.warning(f"  ERROR: Could not find document with name='{document_name}'")
                    logger.warning(f"  Available documents: {[d.get('name') for d in documents_list]}")
            
            call_summary['documents_requested_list'] = documents_list
            
            # Update case with modified call_summary - pass dict directly, Supabase client handles JSON
            logger.info(f"DEBUG: Updating case {case_id} with {len(documents_list)} documents")
            if document_matched:
                logger.info(f"  ✓ Document was matched and updated")
            logger.info(f"  call_summary dict: {call_summary}")
            result = update_case(case_id, {'call_summary': call_summary})
            logger.info(f"  update_case returned: {result}")
            logger.info(f"✓ Updated call_summary for case {case_id}")
        except Exception as e:
            logger.exception(f"CRITICAL: Failed to update call_summary with document info: {e}")
            raise HTTPException(status_code=500, detail=f'Failed to persist document update to database: {str(e)}')
        
        # Update case status based on documents uploaded
        try:
            updated_case = get_case(case_id)
            if updated_case:
                new_status = update_case_status(case_id, updated_case[0])
                logger.info(f"Updated case status after document upload: {new_status}")
        except Exception as e:
            logger.warning(f"Failed to update case status after document upload: {e}")
        
        return JSONResponse({
            'status': 'ok',
            'document': doc_record,
            'storage_url': storage_url,
            'summary': document_summary,
            'key_points': document_key_points
        })
    except HTTPException:
        raise
    except Exception:
        logger.exception(f'upload_case_document failed for case_id={case_id}')
        raise HTTPException(status_code=500, detail='upload_case_document_failed')



@app.get('/cases/{case_id}/recommended-documents')
async def get_recommended_documents(case_id: str, user = Depends(require_auth)):
    """Get AI-recommended medical documents for a case based on eligibility analysis."""
    try:
        from .supabase_client import get_case, get_user_eligibilities
        
        # Verify user has access to this case
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        if user['role'] != 'admin' and case.get('user_id') != user['id']:
            raise HTTPException(status_code=403, detail='access_denied')
        
        # Get eligibility data for this user
        eligibilities = get_user_eligibilities(user['id'])
        latest_eligibility = eligibilities[0] if eligibilities else None
        
        # Generate AI recommendations based on case data and eligibility
        recommendations = []
        
        if latest_eligibility:
            # Extract conditions and weaknesses from eligibility analysis
            analysis_summary = latest_eligibility.get('summary', '')
            weaknesses = latest_eligibility.get('metadata', {}).get('weaknesses', [])
            
            # Default required documents
            recommendations.append({
                'id': 'medical-records',
                'title': 'Recent Medical Records',
                'description': 'Complete medical records from the past 12 months showing diagnosis, treatment, and ongoing care.',
                'required': True,
                'uploaded': False,
            })
            
            recommendations.append({
                'id': 'physician-statement',
                'title': 'Physician Statement',
                'description': 'A detailed statement from your treating physician describing your condition and limitations.',
                'required': True,
                'uploaded': False,
            })
            
            # Add context-specific recommendations based on analysis
            if 'diagnostic' in analysis_summary.lower() or 'test' in analysis_summary.lower():
                recommendations.append({
                    'id': 'diagnostic-tests',
                    'title': 'Diagnostic Test Results',
                    'description': 'Lab results, imaging reports (X-rays, MRIs, CT scans), or other diagnostic test results.',
                    'required': False,
                    'uploaded': False,
                })
            
            if 'treatment' in analysis_summary.lower() or 'medication' in analysis_summary.lower():
                recommendations.append({
                    'id': 'treatment-history',
                    'title': 'Treatment History',
                    'description': 'Documentation of all treatments, medications, therapies, and their outcomes.',
                    'required': False,
                    'uploaded': False,
                })
            
            if 'specialist' in analysis_summary.lower() or len(weaknesses) > 2:
                recommendations.append({
                    'id': 'specialist-reports',
                    'title': 'Specialist Reports',
                    'description': 'Reports from any specialists you have consulted (neurologist, psychiatrist, orthopedist, etc.).',
                    'required': False,
                    'uploaded': False,
                })
        else:
            # Fallback recommendations if no eligibility data
            recommendations = [
                {
                    'id': 'medical-records',
                    'title': 'Recent Medical Records',
                    'description': 'Complete medical records from the past 12 months.',
                    'required': True,
                    'uploaded': False,
                },
                {
                    'id': 'physician-statement',
                    'title': 'Physician Statement',
                    'description': 'Statement from your treating physician.',
                    'required': True,
                    'uploaded': False,
                },
                {
                    'id': 'diagnostic-tests',
                    'title': 'Diagnostic Test Results',
                    'description': 'Lab results and imaging reports.',
                    'required': False,
                    'uploaded': False,
                },
            ]
        
        return JSONResponse({
            'status': 'ok',
            'recommendations': recommendations,
            'case_id': case_id
        })
    except HTTPException:
        raise
    except Exception:
        logger.exception(f'get_recommended_documents failed for case_id={case_id}')
        raise HTTPException(status_code=500, detail='get_recommended_documents_failed')


@app.post('/upload/medical-document')
async def upload_medical_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    case_id: str = Form(...),
    document_id: str = Form(None),
    document_name: str = Form(None),
    user = Depends(require_auth)
):
    """Upload a medical document recommended by the AI.
    
    Args:
        document_id: Backend ID if available (from case_documents table)
        document_name: Name of the document from documents_requested_list (REQUIRED for matching)
    
    The document_name is used to match and update the correct document in call_summary.documents_requested_list.
    The local uploaded filename is irrelevant for matching - it's just stored as the file.
    """
    try:
        from .supabase_client import get_case, storage_upload_file, insert_case_document, update_case
        
        # Verify user has access to this case
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        if user['role'] != 'admin' and case.get('user_id') != user['id']:
            raise HTTPException(status_code=403, detail='access_denied')
        
        # Read file content
        file_content = await file.read()
        
        # Extract text and analyze document for summary
        document_summary = None
        document_key_points = []
        is_relevant = True
        
        try:
            logger.info(f"Analyzing medical document: {file.filename}")
            text, extraction_success = extract_text_from_document(file_content, file.filename)
            
            if extraction_success and text:
                from .dashboard_document_summarizer import summarize_dashboard_document
                summary_result = summarize_dashboard_document(text, document_name=file.filename, document_type=document_type)
                
                document_summary = summary_result.get('document_summary', '')
                document_key_points = summary_result.get('key_points', [])
                is_relevant = summary_result.get('is_relevant', True)
                
                logger.info(f"Document analysis complete: relevant={is_relevant}, summary_length={len(document_summary) if document_summary else 0}, key_points={len(document_key_points)}")
            else:
                logger.warning(f"Failed to extract text from {file.filename}")
        except Exception as e:
            logger.warning(f"Failed to analyze document: {e}")
        
        # Upload to Supabase Storage
        from .utils import sanitize_filename
        from pathlib import Path
        import uuid
        bucket_name = 'case-documents'
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        sanitized_filename = sanitize_filename(file.filename)
        
        # Ensure we have a valid filename with unique ID to prevent collisions
        file_ext = Path(file.filename).suffix or ''
        if not sanitized_filename or sanitized_filename == file_ext:
            sanitized_filename = f"document_{unique_id}{file_ext}"
        else:
            name_parts = sanitized_filename.rsplit('.', 1)
            if len(name_parts) == 2:
                sanitized_filename = f"{name_parts[0]}_{unique_id}.{name_parts[1]}"
            else:
                sanitized_filename = f"{sanitized_filename}_{unique_id}"
        
        file_path = f"{user['id']}/{case_id}/{document_type}_{timestamp}_{sanitized_filename}"
        
        upload_result = storage_upload_file(
            bucket_name=bucket_name,
            file_path=file_path,
            file_data=file_content,
            content_type=file.content_type or 'application/octet-stream'
        )
        
        storage_url = upload_result.get('public_url')
        logger.info(f"Uploaded medical document to: {storage_url}")
        
        # Insert document record with analysis metadata
        doc_record = insert_case_document(
            case_id=case_id,
            document_type=document_type,
            file_name=file.filename,
            file_path=file_path,
            file_size=len(file_content),
            file_type=file.content_type,
            storage_url=storage_url,
            uploaded_by=user['profile']['id'],
            metadata={
                'upload_source': 'medical_documents_flow',
                'document_category': 'medical',
                'ai_recommended': True,
                'document_summary': document_summary,
                'key_points': document_key_points,
                'is_relevant': is_relevant
            }
        )
        
        # Update call_summary.documents_requested_list with uploaded document info
        try:
            call_summary = case.get('call_summary', {})
            
            # Parse call_summary if it's a string (JSON)
            if isinstance(call_summary, str):
                try:
                    call_summary = json.loads(call_summary)
                except json.JSONDecodeError:
                    call_summary = {}
            
            # Ensure call_summary is a dict
            if not isinstance(call_summary, dict):
                call_summary = {}
            
            # Ensure documents_requested_list exists
            if 'documents_requested_list' not in call_summary:
                call_summary['documents_requested_list'] = []
            
            # Update document status - try to match by document_id or name
            documents_list = call_summary.get('documents_requested_list', [])
            
            # Get the document ID from the inserted record
            doc_id = doc_record.get('id') if isinstance(doc_record, dict) else None
            
            # DEBUG logging
            logger.info(f"DEBUG upload_medical_document:")
            logger.info(f"  document_id from frontend: {document_id}")
            logger.info(f"  document_name from frontend: {document_name}")
            logger.info(f"  file.filename (local file, IGNORED for matching): {file.filename}")
            logger.info(f"  doc_id from case_documents: {doc_id}")
            logger.info(f"  documents_list count: {len(documents_list)}")
            for idx, doc in enumerate(documents_list):
                logger.info(f"    doc[{idx}]: id={doc.get('id')}, name={doc.get('name')}")
            
            # Match document by ID first, then by exact name from documents_requested_list
            document_matched = False
            matched_index = -1
            
            # Strategy 1: If document_id was provided from frontend, match by that
            if document_id:
                logger.info(f"[Strategy 1] Attempting to match by document_id: {document_id}")
                for idx, doc in enumerate(documents_list):
                    if doc.get('id') == document_id:
                        doc['uploaded'] = True
                        doc['document_id'] = doc_id
                        doc['file_url'] = storage_url
                        document_matched = True
                        matched_index = idx
                        logger.info(f"  ✓ MATCHED by ID at index {idx}: {doc.get('name')}")
                        break
            
            # Strategy 2: If document_name provided from frontend, match by exact name
            if not document_matched and document_name:
                logger.info(f"[Strategy 2] Matching by document_name: {document_name}")
                for idx, doc in enumerate(documents_list):
                    if doc.get('name') == document_name:
                        doc['uploaded'] = True
                        doc['document_id'] = doc_id
                        doc['file_url'] = storage_url
                        document_matched = True
                        matched_index = idx
                        logger.info(f"  ✓ MATCHED by name at index {idx}: {doc.get('name')}")
                        break
            
            # Log result
            if document_matched:
                logger.info(f"✓ Document matched and updated at index {matched_index}")
            else:
                logger.warning(f"✗ NO MATCH FOUND")
                if not document_name and not document_id:
                    logger.warning(f"  ERROR: Frontend must provide document_name or document_id from documents_requested_list")
                elif document_name:
                    logger.warning(f"  ERROR: Could not find document with name='{document_name}'")
                    logger.warning(f"  Available documents: {[d.get('name') for d in documents_list]}")
            
            call_summary['documents_requested_list'] = documents_list
            
            # Update case with modified call_summary - pass dict directly, Supabase client handles JSON
            logger.info(f"DEBUG: Updating case {case_id} with {len(documents_list)} documents")
            logger.info(f"  call_summary dict: {call_summary}")
            result = update_case(case_id, {'call_summary': call_summary})
            logger.info(f"  update_case returned: {result}")
            logger.info(f"✓ Updated call_summary for case {case_id} with document upload info")
        except Exception as e:
            logger.exception(f"CRITICAL: Failed to update call_summary with document info: {e}")
            raise HTTPException(status_code=500, detail=f'Failed to persist document update to database: {str(e)}')
        
        return JSONResponse({
            'status': 'ok',
            'document': doc_record,
            'message': 'Medical document uploaded successfully'
        })
    except HTTPException:
        raise
    except Exception:
        logger.exception(f'upload_medical_document failed')
        raise HTTPException(status_code=500, detail='upload_medical_document_failed')



@app.delete('/cases/{case_id}/documents/{document_id}')
async def delete_case_document_endpoint(
    case_id: str,
    document_id: str,
    user = Depends(require_auth)
):
    """Delete a document from a case."""
    try:
        from .supabase_client import get_case, get_case_documents, delete_case_document, storage_delete_file
        
        # Verify user has access to this case
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        if user['role'] != 'admin' and case.get('user_id') != user['id']:
            raise HTTPException(status_code=403, detail='access_denied')
        
        # Get all documents for the case to verify document exists and belongs to case
        documents = get_case_documents(case_id)
        doc = next((d for d in documents if d.get('id') == document_id), None)
        
        if not doc:
            raise HTTPException(status_code=404, detail='document_not_found')
        
        # Delete from storage
        file_path = doc.get('file_path')
        if file_path:
            try:
                storage_delete_file(bucket='case-documents', path=file_path)
                logger.info(f"Deleted file from storage: {file_path}")
            except Exception:
                logger.exception(f'Failed to delete file from storage: {file_path}')
        
        # Delete database record
        delete_case_document(document_id)
        
        return JSONResponse({
            'status': 'ok',
            'message': 'document_deleted',
            'document_id': document_id
        })
    except HTTPException:
        raise
    except Exception:
        logger.exception(f'delete_case_document failed for document_id={document_id}')
        raise HTTPException(status_code=500, detail='delete_case_document_failed')


# ===========================
# AGENT PROMPTS MANAGEMENT
# ===========================

@app.get('/api/agents')
async def list_agents(user = Depends(require_admin)):
    """List all agent prompts from the database."""
    try:
        from .supabase_client import _supabase_admin
        
        response = _supabase_admin.table('agents').select('*').order('updated_at', desc=True).execute()
        agents = response.data or []
        
        return JSONResponse({
            'status': 'ok',
            'agents': agents,
            'can_edit': True
        })
    except Exception as e:
        logger.exception(f'list_agents failed: {e}')
        raise HTTPException(status_code=500, detail='list_agents_failed')


@app.get('/api/agents/{agent_id}')
async def get_agent(agent_id: str, user = Depends(require_admin)):
    """Get a single agent prompt by ID."""
    try:
        from .supabase_client import _supabase_admin
        
        response = _supabase_admin.table('agents').select('*').eq('id', agent_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail='agent_not_found')
        
        return JSONResponse({
            'status': 'ok',
            'agent': response.data[0]
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'get_agent failed: {e}')
        raise HTTPException(status_code=500, detail='get_agent_failed')


@app.put('/api/agents/{agent_id}')
async def update_agent(agent_id: str, payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Update an agent prompt."""
    try:
        from .supabase_client import _supabase_admin
        
        prompt = payload.get('prompt')
        model = payload.get('model')
        description = payload.get('description')
        meta_data = payload.get('meta_data')
        
        if not prompt:
            raise HTTPException(status_code=400, detail='missing_prompt')
        
        update_data = {
            'prompt': prompt,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if model:
            update_data['model'] = model
        if description:
            update_data['description'] = description
        if meta_data is not None:
            update_data['meta_data'] = meta_data
        
        response = _supabase_admin.table('agents').update(update_data).eq('id', agent_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail='agent_not_found')
        
        return JSONResponse({
            'status': 'ok',
            'agent': response.data[0]
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'update_agent failed: {e}')
        raise HTTPException(status_code=500, detail='update_agent_failed')


@app.post('/api/agents')
async def create_agent(payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Create a new agent prompt."""
    try:
        from .supabase_client import _supabase_admin
        
        name = payload.get('name')
        prompt = payload.get('prompt')
        model = payload.get('model', 'gpt-4o')
        description = payload.get('description', '')
        
        if not name or not prompt:
            raise HTTPException(status_code=400, detail='missing_name_or_prompt')
        
        new_agent = {
            'name': name,
            'prompt': prompt,
            'model': model,
            'description': description,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        response = _supabase_admin.table('agents').insert(new_agent).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=400, detail='failed_to_create_agent')
        
        return JSONResponse({
            'status': 'ok',
            'agent': response.data[0]
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'create_agent failed: {e}')
        raise HTTPException(status_code=500, detail='create_agent_failed')


@app.get('/api/agents/by-name/{agent_name}')
async def get_agent_by_name(agent_name: str):
    """
    Public endpoint to fetch an active agent configuration by name.
    Used by VAPI integration to fetch dynamic prompt and model configuration.
    """
    try:
        from .supabase_client import get_agent_prompt
        
        # Use existing function with empty fallback - we'll handle the fallback in frontend
        agent_config = get_agent_prompt(agent_name, fallback_prompt='')
        
        if not agent_config.get('prompt'):
            # Agent not found, return a 404 with helpful message
            raise HTTPException(
                status_code=404, 
                detail=f"Agent '{agent_name}' not found or not active in database"
            )
        
        return JSONResponse({
            'status': 'ok',
            'agent': {
                'name': agent_name,
                'prompt': agent_config.get('prompt'),
                'model': agent_config.get('model', 'gpt-4o'),
                'output_schema': agent_config.get('output_schema'),
                'meta_data': agent_config.get('meta_data')
            }
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'get_agent_by_name failed for {agent_name}: {e}')
        raise HTTPException(status_code=500, detail='get_agent_by_name_failed')


@app.delete('/api/agents/{agent_id}')
async def delete_agent(agent_id: str, user = Depends(require_admin)):
    """Delete an agent prompt."""
    try:
        from .supabase_client import _supabase_admin
        
        response = _supabase_admin.table('agents').delete().eq('id', agent_id).execute()
        
        return JSONResponse({
            'status': 'ok',
            'deleted': True
        })
    except Exception as e:
        logger.exception(f'delete_agent failed: {e}')
        raise HTTPException(status_code=500, detail='delete_agent_failed')


@app.get('/admin/cases/work-disability')
async def get_work_disability_cases(
    page: int = 1,
    limit: int = 20
):
    """
    Get cases with 'Work Disability' product type for the admin dashboard.
    Returns paginated list of work disability cases with relevant data.
    """
    try:
        from .supabase_client import _postgrest_headers
        
        logger.info(f"Fetching work disability cases: page={page}, limit={limit}")
        
        # Get all cases
        offset = (page - 1) * limit
        cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases?order=created_at.desc&limit={limit}&offset={offset}"
        
        logger.info(f"Calling Supabase: {cases_url}")
        cases_resp = requests.get(cases_url, headers=_postgrest_headers(), timeout=15)
        logger.info(f"Supabase response status: {cases_resp.status_code}")
        
        if not cases_resp.ok:
            logger.error(f"Supabase error: {cases_resp.text}")
            cases_resp.raise_for_status()
        
        cases = cases_resp.json()
        logger.info(f"Fetched {len(cases)} cases from Supabase")
        
        # Log sample case structure to debug field names
        if cases:
            logger.info(f"Sample case fields: {cases[0].keys()}")
        
        # Fetch all user profiles to get email data
        profiles_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?limit=500"
        profiles_resp = requests.get(profiles_url, headers=_postgrest_headers(), timeout=15)
        profiles_resp.raise_for_status()
        profiles = profiles_resp.json()
        
        # Create a map of user_id to profile for quick lookup
        user_profiles = {profile.get('user_id'): profile for profile in profiles}
        logger.info(f"Loaded {len(user_profiles)} user profiles")
        
        # Filter for Work Disability cases
        work_disability_cases = []
        for case in cases:
            try:
                call_summary = case.get('call_summary', {})
                if isinstance(call_summary, str):
                    call_summary = json.loads(call_summary)
                
                products = call_summary.get('products', [])
                if isinstance(products, str):
                    products = json.loads(products)
                
                # Check if Work Disability is in the products
                if products and 'Work Disability' in products:
                    # Extract eligibility data
                    eligibility_raw = case.get('eligibility_raw', {})
                    if isinstance(eligibility_raw, str):
                        eligibility_raw = json.loads(eligibility_raw)
                    
                    # Get user profile to fetch email
                    user_id = case.get('user_id')
                    user_profile = user_profiles.get(user_id) if user_id else None
                    client_email = user_profile.get('email') if user_profile else ''
                    client_name = user_profile.get('full_name') or user_profile.get('name') if user_profile else case.get('client_name', 'Unknown')
                    client_phone = user_profile.get('phone_number') if user_profile else case.get('client_phone', '')
                    
                    # Build case response object
                    case_obj = {
                        'id': case.get('id'),
                        'client_name': client_name,
                        'client_email': client_email,
                        'client_phone': client_phone,
                        'status': case.get('status', 'new'),
                        'created_at': case.get('created_at'),
                        'updated_at': case.get('updated_at'),
                        'eligibility_score': eligibility_raw.get('eligibility_score', 0),
                        'potential_fee': call_summary.get('estimated_claim_amount', 0),
                    }
                    work_disability_cases.append(case_obj)
            except Exception as parse_err:
                logger.warning(f'Failed to parse case {case.get("id")}: {parse_err}')
                continue
        
        logger.info(f"Found {len(work_disability_cases)} work disability cases")
        
        return JSONResponse({
            'status': 'ok',
            'cases': work_disability_cases,
            'count': len(work_disability_cases),
            'page': page,
            'limit': limit
        })
        
    except Exception as e:
        logger.error(f'Failed to get work disability cases: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/admin/cases/{case_id}')
async def admin_get_case(case_id: str, user = Depends(require_admin)):
    """Admin: get a single case by id."""
    try:
        from .supabase_client import get_case
        rows = get_case(case_id)
        if not rows:
            raise HTTPException(status_code=404, detail='case_not_found')
        case = rows[0]
        return JSONResponse({'status': 'ok', 'case': case})
    except HTTPException:
        raise
    except Exception:
        logger.exception('admin_get_case failed')
        raise HTTPException(status_code=500, detail='admin_get_case_failed')


@app.patch('/admin/cases/{case_id}')
async def admin_patch_case(case_id: str, payload: Dict[str, Any] = Body(...), user = Depends(require_admin)):
    """Admin: patch fields on a case (e.g., status)."""
    try:
        from .supabase_client import update_case
        updated = update_case(case_id=case_id, fields=payload)
        return JSONResponse({'status': 'ok', 'case': updated})
    except Exception:
        logger.exception('admin_patch_case failed')
        raise HTTPException(status_code=500, detail='admin_patch_case_failed')


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Global handler for HTTPException to perform a logout when the token is invalid
    or expired (401). Clears auth cookies so the frontend can detect logged-out
    state and redirect the user to the login page.
    """
    try:
        detail_str = str(exc.detail) if exc.detail is not None else ''
    except Exception:
        detail_str = ''

    # If this is an auth-related 401, clear cookies and return a consistent response
    if exc.status_code == 401 and any(k in detail_str for k in ('invalid', 'user_not_found', 'missing_authorization', 'invalid_token')):
        resp = JSONResponse(status_code=401, content={'status': 'unauthenticated', 'detail': detail_str})
        # clear Supabase cookies if present
        try:
            resp.delete_cookie('sb_access_token', path='/')
            resp.delete_cookie('sb_refresh_token', path='/')
        except Exception:
            pass
        return resp

    # default behaviour for other HTTPExceptions
    return JSONResponse(status_code=exc.status_code, content={'detail': detail_str})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = os.environ.get('UPLOADS_DIR', './uploads')
Path(UPLOADS_DIR).mkdir(parents=True, exist_ok=True)

LEGAL_DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', 'documents')


@app.post('/eligibility-check')
async def eligibility_check(answers: str = Form(...), file: UploadFile = File(...)):
    """
    answers: JSON string in form field 'answers' (should include case_id and user_id)
    file: uploaded PDF/image
    """
    logger.info(f"Received /eligibility-check request; uploaded_filename={file.filename}")
    logger.warning(f"[ELIGIBILITY_INPUT] answers={answers}, filename={file.filename}, content_type={file.content_type}")

    # parse answers
    try:
        answers_obj: Dict[str, Any] = json.loads(answers)
    except Exception as e:
        logger.warning("Invalid JSON in 'answers' form field", exc_info=True)
        raise HTTPException(status_code=400, detail='Invalid JSON in answers')

    # read file content
    try:
        content = await file.read()
        filesize = len(content)
        file_ext = Path(file.filename).suffix or '.pdf'
        logger.info(f"Read uploaded file {file.filename}; size={filesize} bytes")
    except Exception:
        logger.exception("Failed to read uploaded file")
        raise HTTPException(status_code=500, detail='Failed to read uploaded file')

    # Extract text using Google Vision API (works for PDFs, images, scanned docs)
    try:
        text, extraction_success = extract_text_from_document(content, file.filename)
        logger.info(f"Text extraction complete; success={extraction_success}; extracted_chars={len(text) if text else 0}")
        
        # Log OCR preview for debugging
        if text:
            preview = text[:500].replace('\n', ' ')
            logger.info(f"OCR PREVIEW (first 500 chars): {preview}")
        else:
            logger.warning("OCR extracted NO TEXT - document may be blank or unreadable")
    except Exception as e:
        logger.exception("Text extraction failed using Google Vision; attempting PDF fallback if applicable")
        # If Google Vision credentials are missing or fail, attempt a local PDF fallback
        fallback_text = None
        fallback_success = False
        try:
            # Only attempt fallback for PDF files (digital PDFs)
            if file_ext.lower().endswith('.pdf'):
                try:
                    from .ocr import extract_text_from_pdf_bytes
                    fallback_text, fallback_success = extract_text_from_pdf_bytes(content)
                    if fallback_success:
                        text = fallback_text
                        extraction_success = True
                        logger.info(f"Used PyPDF2 fallback extraction; extracted_chars={len(text) if text else 0}")
                except Exception:
                    logger.exception('PDF fallback extraction failed')

        except Exception:
            logger.exception('Unexpected error during fallback extraction')

        if not fallback_success:
            # Re-raise the original error as an HTTP 500 if no fallback available
            raise HTTPException(status_code=500, detail=f'Text extraction failed: {str(e)}')

    # Get case and user info for organizing the upload
    case_id = answers_obj.get('case_id') if isinstance(answers_obj, dict) else None
    user_id = answers_obj.get('user_id') if isinstance(answers_obj, dict) else None
    
    # Generate unique filename
    uid = uuid.uuid4().hex
    file_ext = Path(file.filename).suffix or '.pdf'
    safe_filename = f"{uid}{file_ext}"
    
    # Upload to Supabase Storage bucket 'eligibility-documents'
    storage_url = None
    try:
        from datetime import datetime
        from .supabase_client import storage_upload_file
        
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        # Store in bucket organized by user_id
        storage_path = f"{user_id}/{timestamp}_{safe_filename}" if user_id else f"anonymous/{timestamp}_{safe_filename}"
        
        upload_result = storage_upload_file(
            bucket='eligibility-documents',
            path=storage_path,
            file_bytes=content,
            content_type=file.content_type or 'application/octet-stream',
            upsert=True
        )
        storage_url = upload_result.get('public_url')
        logger.info(f"Uploaded eligibility document to Supabase Storage: {storage_url}")
    except Exception as e:
        logger.exception("Failed to upload to Supabase Storage")
        raise HTTPException(status_code=500, detail=f'Failed to upload file: {str(e)}')
    
    # STEP 1: Check document relevance (STRICT validation) - DO THIS FIRST before uploading
    from .eligibility_processor import check_document_relevance, analyze_questionnaire_with_guidelines, load_eligibility_guidelines
    
    try:
        logger.info("="*80)
        logger.info("STEP 1: DOCUMENT ANALYSIS - Get summary and check relevance")
        logger.info("="*80)
        logger.info(f"OCR Text Length: {len(text)} characters")
        logger.info(f"OCR Text Preview (first 1000 chars):\n{text[:1000]}")
        logger.info("-"*80)
        
        relevance_result = check_document_relevance(text, provider='gpt')
        
        logger.info("="*80)
        logger.info("DOCUMENT ANALYSIS RESULT:")
        logger.info(f"  Is Relevant: {relevance_result['is_relevant']}")
        logger.info(f"  Relevance Score: {relevance_result['relevance_score']}/100")
        logger.info(f"  Document Type: {relevance_result['document_type']}")
        logger.info(f"  Reason: {relevance_result['relevance_reason']}")
        logger.info(f"  Statement: {relevance_result['statement']}")
        if relevance_result.get('document_summary'):
            logger.info(f"  Summary: {relevance_result['document_summary']}")
        logger.info("="*80)
        
        # Extract document summary and key points
        document_summary = relevance_result.get('document_summary', '')
        document_key_points = relevance_result.get('key_points', [])
        
        # Only pass document summary to questionnaire analysis if document is relevant/medical
        document_context_for_analysis = ''
        if relevance_result['is_relevant']:
            document_context_for_analysis = document_summary
            logger.info(f"✓ DOCUMENT IS RELEVANT: Will include summary in questionnaire analysis")
        else:
            logger.warning(f"⚠️ DOCUMENT NOT RELEVANT: Will analyze questionnaire without document context")
            logger.warning(f"Document will be flagged on result screen: {relevance_result['relevance_reason']}")
        
    except Exception as e:
        logger.exception("❌ Document relevance check failed with exception")
        raise HTTPException(status_code=500, detail=f'Document validation failed: {str(e)}')
    
    # STEP 2: Load guidelines and analyze questionnaire
    try:
        logger.info("STEP 2: Loading eligibility guidelines")
        guidelines_text = load_eligibility_guidelines()
        if not guidelines_text:
            logger.warning("Guidelines not available, using fallback")
            guidelines_text = "Complete written documentation required. Objective medical evidence from specialists. Work-related injury must be documented."
        
        logger.info(f"STEP 2: Analyzing questionnaire with guidelines")
        if document_context_for_analysis:
            logger.info(f"  Including document context in analysis")
        else:
            logger.info(f"  Analyzing questionnaire only (no valid document context)")
        model_res = analyze_questionnaire_with_guidelines(
            answers=answers_obj,
            guidelines_text=guidelines_text,
            provider='gpt',
            document_summary=document_context_for_analysis
        )
        logger.info(f"Questionnaire analysis: status={model_res.get('eligibility_status')}, score={model_res.get('eligibility_score')}")
        
    except Exception as e:
        logger.exception("Questionnaire analysis failed")
        raise HTTPException(status_code=500, detail=f'Questionnaire analysis failed: {str(e)}')

    # Now upload to Supabase Storage with document analysis metadata (after analysis is complete)
    if case_id and storage_url is None:
        try:
            from datetime import datetime
            from .supabase_client import storage_upload_file, insert_case_document
            
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            safe_filename = Path(file.filename).name.replace(' ', '_')
            storage_path = f"cases/{case_id}/documents/{timestamp}_{safe_filename}"
            
            upload_result = storage_upload_file(
                bucket='case-documents',
                path=storage_path,
                file_bytes=content,
                content_type=file.content_type or 'application/octet-stream',
                upsert=True
            )
            storage_url = upload_result.get('public_url')
            logger.info(f"Uploaded eligibility document to Supabase Storage: {storage_url}")
            
            # Insert document record with analysis metadata
            insert_case_document(
                case_id=case_id,
                file_path=storage_path,
                file_name=file.filename,
                file_type=file.content_type,
                file_size=filesize,
                document_type='eligibility_document',
                uploaded_by=user_id,
                metadata={
                    'source': 'eligibility_check',
                    'document_summary': document_summary,
                    'key_points': document_key_points,
                    'is_relevant': relevance_result['is_relevant'],
                    'relevance_score': relevance_result['relevance_score'],
                    'document_type': relevance_result['document_type']
                }
            )
            logger.info(f"Stored eligibility document record with analysis metadata")
        except Exception:
            logger.exception("Failed to upload to Supabase Storage (non-fatal)")
            # Continue even if storage upload fails

    # Shape response with new structure including document analysis
    result = {
        'eligibility': model_res.get('eligibility_status', 'needs_review'),
        'eligibility_status': model_res.get('eligibility_status', 'needs_review'),
        'eligibility_score': model_res.get('eligibility_score', 0),
        'reason_summary': model_res.get('reason_summary', ''),
        'confidence': int(model_res.get('confidence', 0)),
        'rule_references': model_res.get('rule_references', []),
        'required_next_steps': model_res.get('required_next_steps', []),
        'strengths': model_res.get('strengths', []),
        'weaknesses': model_res.get('weaknesses', []),
        'missing_information': model_res.get('missing_information', []),
        # Document analysis data for result screen
        'document_analysis': {
            'is_relevant': relevance_result['is_relevant'],
            'relevance_score': relevance_result['relevance_score'],
            'relevance_reason': relevance_result['relevance_reason'],
            'document_type': relevance_result['document_type'],
            'document_summary': document_summary,
            'key_points': document_key_points,
            'focus_excerpt': relevance_result.get('focus_excerpt', ''),
            'statement': relevance_result['statement'],
            'directions': relevance_result.get('directions', [])
        }
    }

    # Persist audit row (best-effort) into Supabase `user_eligibility`
    try:
        user_id = answers_obj.get('user_id') if isinstance(answers_obj, dict) else None
        case_id = answers_obj.get('case_id') if isinstance(answers_obj, dict) else None
        
        eligibility_payload = {
            'rating': result.get('eligibility_status'),
            'title': f"Eligibility Score: {result.get('eligibility_score')}/100",
            'message': result.get('reason_summary'),
            'confidence': result.get('confidence'),
            'raw': {
                'eligibility_score': result.get('eligibility_score'),
                'eligibility_status': result.get('eligibility_status'),
                'strengths': result.get('strengths', []),
                'weaknesses': result.get('weaknesses', []),
                'required_next_steps': result.get('required_next_steps', []),
                'missing_information': result.get('missing_information', []),
                'rule_references': result.get('rule_references', []),
                'document_analysis': result.get('document_analysis', {})
            }
        }
        
        insert_user_eligibility(
            user_id=user_id,
            uploaded_file=storage_url,
            eligibility=eligibility_payload,
            case_id=case_id
        )
        
        # Update case metadata if case_id exists
        if case_id:
            try:
                doc_analysis = result.get('document_analysis', {})
                meta_updates = {
                    'eligibility_score': result.get('eligibility_score'),
                    'eligibility_status': result.get('eligibility_status'),
                    'eligibility_doc_summary': doc_analysis.get('document_summary'),
                    'eligibility_doc_type': doc_analysis.get('document_type'),
                    'eligibility_doc_relevant': doc_analysis.get('is_relevant'),
                    'eligibility_confidence': result.get('confidence')
                }
                update_case(case_id=case_id, fields={'metadata': meta_updates})
            except Exception:
                logger.exception('Failed to update case metadata (non-fatal)')
                
    except Exception:
        logger.exception('Failed to persist eligibility audit (non-fatal)')

    logger.debug(f"Final shaped result: {result}")
    logger.warning(f"[ELIGIBILITY_OUTPUT] status=ok, eligibility_score={result.get('eligibility_score')}, eligibility_status={result.get('eligibility_status')}, confidence={result.get('confidence')}")

    return JSONResponse({'status': 'ok', 'data': result})


@app.get('/vapi/document-summary')
async def get_document_summary_for_vapi(
    current_user: dict = Depends(get_current_user),
    force_refresh: bool = False
):
    """
    Fetch medical documents from user_eligibility table, download from Supabase Storage,
    run OCR to extract text, use LLM to generate summary, and return for Vapi system prompt.
    
    Args:
        force_refresh: If True, ignore cached summary and regenerate from OCR + LLM
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    user_id = current_user.get('id')
    if not user_id:
        raise HTTPException(status_code=400, detail='User ID not found')
    
    logger.info(f"[VAPI_DEBUG] Fetching document summary for user_id: {user_id}, force_refresh={force_refresh}")
    logger.warning(f"[VAPI_INPUT] user_id={user_id}, force_refresh={force_refresh}, auth_email={current_user.get('email')}")
    
    try:
        from .supabase_client import list_cases_for_user, get_user_eligibility
        from .eligibility_processor import check_document_relevance
        import httpx
        
        # Get user's cases
        cases = list_cases_for_user(user_id)
        logger.info(f"[VAPI_DEBUG] Found {len(cases) if cases else 0} cases for user {user_id}")
        
        if not cases:
            return JSONResponse({
                'status': 'no_document',
                'message': 'No cases found',
                'summary': None,
                'key_points': []
            })
        
        # Get the most recent case
        latest_case = sorted(cases, key=lambda x: x.get('created_at', ''), reverse=True)[0]
        case_id = latest_case.get('id')
        logger.info(f"[VAPI_DEBUG] Using latest case_id: {case_id}")
        
        # Fetch eligibility records from user_eligibility table
        eligibility_records = []
        try:
            logger.info(f"[VAPI_DEBUG] Calling get_user_eligibility(user_id={user_id}, case_id={case_id})")
            eligibility_records = get_user_eligibility(user_id=user_id, case_id=case_id)
            logger.info(f"[VAPI_DEBUG] get_user_eligibility returned {len(eligibility_records) if eligibility_records else 0} records")
            if not eligibility_records:
                logger.info(f"[VAPI_DEBUG] No eligibility records with case_id={case_id}, trying user_id only")
                eligibility_records = get_user_eligibility(user_id=user_id)
                logger.info(f"[VAPI_DEBUG] get_user_eligibility (user_id only) returned {len(eligibility_records) if eligibility_records else 0} records")
        except Exception as e:
            logger.exception(f"[VAPI_DEBUG] Failed to fetch eligibility records: {e}")
            eligibility_records = []
        
        if not eligibility_records:
            return JSONResponse({
                'status': 'no_document',
                'message': 'No medical documents uploaded yet',
                'summary': None,
                'key_points': []
            })
        
        # Process the most recent eligibility record with an uploaded file
        all_summaries = []
        all_key_points = []
        
        for record in eligibility_records:
            uploaded_file_url = record.get('uploaded_file')
            if not uploaded_file_url:
                continue
            
            record_id = record.get('id')
            eligibility_raw = record.get('eligibility_raw')
            
            logger.info(f"[VAPI_DEBUG] Processing document: {uploaded_file_url}")
            
            # First check if we already have a cached summary in eligibility_raw (unless force_refresh)
            cached_summary = None
            cached_key_points = []
            use_cache = False
            
            if eligibility_raw and not force_refresh:
                try:
                    raw_data = json.loads(eligibility_raw) if isinstance(eligibility_raw, str) else eligibility_raw
                    doc_analysis = raw_data.get('document_analysis', {}) if isinstance(raw_data, dict) else {}
                    
                    if doc_analysis and doc_analysis.get('is_relevant'):
                        cached_summary = doc_analysis.get('document_summary')
                        cached_key_points = doc_analysis.get('key_points', [])
                        
                        # Use cache if we have EITHER detailed summary (>100 chars) OR key_points with any summary
                        has_detailed_summary = cached_summary and len(cached_summary) > 100
                        has_key_points_with_summary = cached_summary and cached_key_points and len(cached_key_points) > 0
                        
                        if has_detailed_summary or has_key_points_with_summary:
                            logger.info(f"[VAPI_DEBUG] ✅ Using cached data from database ({len(cached_summary) if cached_summary else 0} chars, {len(cached_key_points)} key points) - skipping OCR/LLM")
                            
                            # Combine cached summary and key points into one text (no filename)
                            full_cached_summary = cached_summary if cached_summary else ""
                            if cached_key_points:
                                full_cached_summary += "\n\n**Key Medical Points:**\n" + "\n".join([f"• {kp}" for kp in cached_key_points])
                            
                            all_summaries.append(full_cached_summary.strip())
                            use_cache = True
                        else:
                            logger.info(f"[VAPI_DEBUG] No usable cached data (summary: {len(cached_summary) if cached_summary else 0} chars, key_points: {len(cached_key_points)}) - will regenerate with OCR/LLM")
                except Exception as e:
                    logger.warning(f"[VAPI_DEBUG] Failed to parse cached eligibility_raw: {e}")
            
            if use_cache:
                continue  # Skip OCR/LLM processing
            
            if force_refresh:
                logger.info(f"[VAPI_DEBUG] force_refresh=True, ignoring cache and regenerating summary")
            
            # No cached summary - need to download, OCR, and analyze
            try:
                # Download file from Supabase Storage
                file_content = None
                
                if uploaded_file_url.startswith('http'):
                    # It's a Supabase Storage URL - download it
                    logger.info(f"[VAPI_DEBUG] Downloading from Supabase Storage: {uploaded_file_url}")
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.get(uploaded_file_url)
                        response.raise_for_status()
                        file_content = response.content
                        logger.info(f"[VAPI_DEBUG] Downloaded {len(file_content)} bytes")
                else:
                    logger.warning(f"[VAPI_DEBUG] Skipping non-HTTP file path: {uploaded_file_url}")
                    continue
                
                if not file_content:
                    continue
                
                # Extract filename for logging
                filename = uploaded_file_url.split('/')[-1]
                
                # Run OCR to extract text
                logger.info(f"[VAPI_DEBUG] Running OCR on {filename}")
                text, extraction_success = extract_text_from_document(file_content, filename)
                
                if not extraction_success or not text:
                    logger.warning(f"[VAPI_DEBUG] OCR failed for {filename}")
                    continue
                
                logger.info(f"[VAPI_DEBUG] OCR extracted {len(text)} characters from {filename}")
                
                # Use LLM to analyze and summarize the document
                logger.info(f"[VAPI_DEBUG] Analyzing document with LLM")
                relevance_result = check_document_relevance(text, provider='gpt')
                
                if relevance_result.get('is_relevant'):
                    doc_summary = relevance_result.get('document_summary', '')
                    doc_key_points = relevance_result.get('key_points', [])
                    
                    logger.info(f"[VAPI_DEBUG] Document is relevant, summary generated: {len(doc_summary)} chars, {len(doc_key_points)} key points")
                    
                    # Combine summary and key points into one comprehensive text
                    full_summary = doc_summary
                    if doc_key_points:
                        full_summary += "\n\n**Key Medical Points:**\n" + "\n".join([f"• {kp}" for kp in doc_key_points])
                    
                    all_summaries.append(full_summary)
                    
                    # Store the generated summary back in eligibility_raw for caching
                    try:
                        from .supabase_client import update_user_eligibility
                        
                        # Merge with existing eligibility_raw data
                        existing_data = json.loads(eligibility_raw) if isinstance(eligibility_raw, str) else (eligibility_raw or {})
                        existing_data['document_analysis'] = {
                            'document_summary': doc_summary,
                            'key_points': doc_key_points,
                            'is_relevant': True,
                            'relevance_score': relevance_result.get('relevance_score'),
                            'document_type': relevance_result.get('document_type'),
                            'relevance_reason': relevance_result.get('relevance_reason')
                        }
                        
                        update_user_eligibility(record_id, {'eligibility_raw': existing_data})
                        logger.info(f"[VAPI_DEBUG] Cached summary in database for record {record_id}")
                    except Exception as e:
                        logger.warning(f"[VAPI_DEBUG] Failed to cache summary in database: {e}")
                else:
                    logger.info(f"[VAPI_DEBUG] Document marked as not relevant: {relevance_result.get('relevance_reason')}")
                    
            except Exception as e:
                logger.exception(f"[VAPI_DEBUG] Failed to process document {uploaded_file_url}: {e}")
                continue
        
        if not all_summaries:
            return JSONResponse({
                'status': 'no_summary',
                'message': 'Medical documents found but summaries could not be generated',
                'summary': None,
                'key_points': []
            })
        
        # Combine all summaries (already includes key points integrated)
        combined_summary = '\n\n---\n\n'.join(all_summaries)
        
        logger.info(f"[VAPI_DEBUG] Generated {len(all_summaries)} comprehensive document summaries")
        logger.warning(f"[VAPI_OUTPUT] status=ok, user_id={user_id}, summaries_count={len(all_summaries)}, summary_length={len(combined_summary)} chars")
        return JSONResponse({
            'status': 'ok',
            'summary': combined_summary,
            'key_points': []  # Empty - everything is in summary now
        })
        
    except Exception as e:
        logger.exception('Failed to fetch document summary')
        raise HTTPException(status_code=500, detail=f'Failed to fetch summary: {str(e)}')


@app.get('/vapi/check-interview-status')
async def check_interview_status(current_user: dict = Depends(get_current_user)):
    """
    Check if user has already completed the voice interview.
    Returns call details if interview was done.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import list_cases_for_user
        
        user_id = current_user.get('id')
        cases = list_cases_for_user(user_id)
        
        logger.info(f"[VAPI] check_interview_status: user_id={user_id}, cases_count={len(cases) if cases else 0}")
        
        if not cases:
            logger.info(f"[VAPI] No cases found for user {user_id}")
            return JSONResponse({
                'status': 'not_started',
                'has_call': False
            })
        
        # Get the most recent case
        latest_case = sorted(cases, key=lambda x: x.get('created_at', ''), reverse=True)[0]
        case_id = latest_case.get('id')
        call_details = latest_case.get('call_details')
        
        logger.info(f"[VAPI] Latest case {case_id}: has call_details={call_details is not None}, type={type(call_details)}, len={len(call_details) if isinstance(call_details, dict) else 'N/A'}")
        
        # Check if call_details exists and is not null/empty
        if call_details and isinstance(call_details, dict) and len(call_details) > 0:
            # Extract transcript summary
            transcript = call_details.get('transcript', '')
            summary = call_details.get('summary', '')
            
            # Extract estimated claim amount from structured data
            estimated_claim_amount = None
            try:
                analysis = call_details.get('analysis', {})
                if isinstance(analysis, dict):
                    structured_data = analysis.get('structured_data', {})
                    if isinstance(structured_data, dict):
                        estimated_claim_amount = structured_data.get('estimated_claim_amount')
            except Exception:
                pass
            
            logger.info(f"[VAPI] Interview completed for case {case_id}")
            return JSONResponse({
                'status': 'completed',
                'has_call': True,
                'case_id': case_id,
                'transcript': transcript,
                'summary': summary,
                'estimated_claim_amount': estimated_claim_amount,
                'call_details': call_details
            })
        else:
            logger.info(f"[VAPI] No call_details found for case {case_id}")
            return JSONResponse({
                'status': 'not_started',
                'has_call': False
            })
            
    except Exception as e:
        logger.exception(f'Failed to check interview status: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to check status: {str(e)}')


@app.get('/vapi/call-details/{call_id}')
async def get_vapi_call_details(
    call_id: str,
    case_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Fetch call details from Vapi API including transcript.
    Creates a job for analysis and returns immediately.
    Frontend should check for job_id in response and poll if analysis is not complete.
    
    Args:
        call_id: VAPI call ID
        case_id: Optional case ID from frontend (passed as query param)
        current_user: Authenticated user
    
    Returns:
        - If analysis job already exists and completed: full call details with analysis
        - If analysis job is pending/running: job_id for polling
        - If no job exists yet: creates job and returns job_id
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from vapi import Vapi
        from .supabase_client import get_case
        
        # Get Vapi API token from environment
        vapi_token = os.getenv('VAPI_API_KEY')
        if not vapi_token:
            raise HTTPException(status_code=500, detail='VAPI_API_KEY not configured')
        
        # Get user_id
        user_id = current_user.get('id')
        
        # If case_id provided, verify it exists and belongs to user
        if case_id:
            logger.info(f"[VAPI] Using provided case_id: {case_id}")
            case_result = get_case(case_id)
            if not case_result:
                raise HTTPException(status_code=404, detail='Case not found')
            if isinstance(case_result, list):
                case = case_result[0] if len(case_result) > 0 else None
            else:
                case = case_result
            if not case:
                raise HTTPException(status_code=404, detail='Case not found')
            
            # Debug logging
            logger.info(f"[VAPI] Case user_id: {case.get('user_id')}, Current user_id: {user_id}")
            logger.info(f"[VAPI] Case keys: {list(case.keys())}")
            
            # Check ownership - handle both string and UUID comparisons
            case_user_id = str(case.get('user_id', ''))
            current_user_id = str(user_id)
            if case_user_id != current_user_id:
                logger.error(f"[VAPI] Access denied: case user_id={case_user_id}, current user_id={current_user_id}")
                raise HTTPException(status_code=403, detail='Access denied to this case')
        else:
            # No case_id provided, try to find latest case
            from .supabase_client import list_cases_for_user
            cases = list_cases_for_user(user_id)
            if not cases:
                raise HTTPException(status_code=404, detail='No case found for user. Please provide case_id.')
            latest_case = sorted(cases, key=lambda x: x.get('created_at', ''), reverse=True)[0]
            case_id = latest_case.get('id')
            case = latest_case
            logger.info(f"[VAPI] Using latest case_id: {case_id}")
        
        # Initialize Vapi client
        client = Vapi(token=vapi_token)
        
        # Fetch call details
        logger.info(f"[VAPI] Fetching call details for call_id: {call_id}")
        try:
            call_details = client.calls.get(id=call_id)
        except Exception as e:
            logger.error(f"[VAPI] Failed to fetch call details: {str(e)}")
            # Return error response instead of crashing
            raise HTTPException(
                status_code=404,
                detail=f"Call with ID '{call_id}' not found in Vapi. The call may not exist, have been deleted, or the ID may be incorrect."
            )
        
        logger.info(f"[VAPI] Call details retrieved successfully")
        
        # Convert Pydantic model to dict for JSON serialization
        call_dict = call_details.model_dump(mode='json') if hasattr(call_details, 'model_dump') else call_details.dict()
        
        # Log important fields from call_details
        logger.info(f"[VAPI] 🔍 Call details structure:")
        logger.info(f"[VAPI]   - Call ID: {call_dict.get('id')}")
        logger.info(f"[VAPI]   - Status: {call_dict.get('status')}")
        logger.info(f"[VAPI]   - Has 'analysis' key: {'analysis' in call_dict}")
        
        if 'analysis' in call_dict:
            analysis = call_dict.get('analysis', {})
            logger.info(f"[VAPI] 📊 Analysis in call_details:")
            logger.info(f"[VAPI]   - Has 'structuredData': {'structuredData' in analysis}")
            if 'structuredData' in analysis:
                structured_data = analysis.get('structuredData', {})
                related_topics = structured_data.get('related_topics', [])
                logger.info(f"[VAPI] 🏷️  Related topics in fresh call_details: {related_topics}")
        else:
            logger.info(f"[VAPI] ⚠️  No 'analysis' key in call_details")
        
        # Save call_details to database immediately
        from .supabase_client import update_case
        try:
            update_case(case_id, {'call_details': call_dict})
            logger.info(f"[VAPI] ✅ Saved call_details to database for case {case_id}")
        except Exception as e:
            logger.warning(f"[VAPI] Failed to save call_details to database: {e}")
        
        # Check if analysis already exists in the case
        existing_call_summary = case.get('call_summary')
        if existing_call_summary:
            logger.info(f"[VAPI] 🔍 Found existing call_summary in case - will REANALYZE anyway")
            # Log what's in the existing analysis for reference
            try:
                analysis_result = json.loads(existing_call_summary) if isinstance(existing_call_summary, str) else existing_call_summary
                logger.info(f"[VAPI] 📋 Previous analysis details:")
                logger.info(f"[VAPI]   - Risk Assessment: {analysis_result.get('risk_assessment', 'N/A')}")
                logger.info(f"[VAPI]   - Case Summary: {analysis_result.get('case_summary', 'N/A')[:100]}...")
            except Exception as e:
                logger.warning(f"[VAPI] Could not parse existing call_summary: {e}")
        
        # Always analyze (removed early return for existing analysis)
        # No existing analysis, check for job or create one
        job_queue = get_job_queue()
        
        # Look for existing job for this call
        existing_job = None
        for job in job_queue.jobs.values():
            if (job.metadata.get('call_id') == call_id and 
                job.metadata.get('user_id') == user_id and
                job.job_type == 'vapi_call_analysis'):
                existing_job = job
                break
        
        if existing_job:
            # Job exists, check status
            if existing_job.status == JobStatus.COMPLETED:
                # Job completed, return result
                logger.info(f"[VAPI] Job completed, returning analysis")
                return JSONResponse({
                    'status': 'ok',
                    'call': call_dict,
                    'analysis': existing_job.result.get('analysis', {})
                })
            else:
                # Job still running, return job info
                logger.info(f"[VAPI] Analysis job {existing_job.job_id} still {existing_job.status.value}")
                return JSONResponse({
                    'status': 'analyzing',
                    'job_id': existing_job.job_id,
                    'job_status': existing_job.status.value,
                    'progress': existing_job.progress,
                    'message': f'Call analysis in progress. Poll /jobs/{existing_job.job_id} for status.'
                })
        
        # No job exists, create one
        transcript = call_dict.get('transcript', '')
        messages = call_dict.get('messages', [])
        
        if not transcript:
            logger.warning(f"[VAPI] No transcript available for analysis")
            return JSONResponse({
                'status': 'ok',
                'call': call_dict,
                'analysis': {
                    'call_summary': 'No transcript available',
                    'documents_requested_list': [],
                    'case_summary': 'No transcript available',
                    'key_legal_points': [],
                    'risk_assessment': 'Needs More Info',
                    'estimated_claim_amount': 'Pending evaluation'
                }
            })
        
        # Create analysis job
        job_id = job_queue.create_job(
            job_type='vapi_call_analysis',
            metadata={
                'call_id': call_id,
                'case_id': case_id,
                'user_id': user_id,
                'endpoint': 'vapi-call-details'
            }
        )
        
        logger.info(f"[VAPI] 📝 Created analysis job {job_id} for call {call_id}")
        logger.info(f"[VAPI] 🚀 Launching background task for job execution...")
        
        # Execute job in background
        task = asyncio.create_task(
            job_queue.execute_job(
                job_id,
                _execute_vapi_call_analysis,
                call_id,
                case_id,
                user_id,
                call_dict,
                transcript,
                messages
            )
        )
        
        # Log if task creation succeeded
        logger.info(f"[VAPI] ✅ Background task created successfully for job {job_id}")
        
        logger.info(f"[VAPI] Created analysis job {job_id} for call {call_id}")
        logger.info(f"[VAPI] 🔙 RETURNING TO FRONTEND immediately with job_id: {job_id}")
        logger.info(f"[VAPI] 📢 Frontend should poll /jobs/{job_id} to check completion status")
        logger.info(f"[VAPI] ⚠️  Data will be saved to DB when background task completes")
        
        return JSONResponse({
            'status': 'analyzing',
            'job_id': job_id,
            'job_status': 'pending',
            'message': f'Call analysis job created. Poll /jobs/{job_id} for status.'
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[VAPI] Failed to fetch call details: {e}")
        raise HTTPException(status_code=500, detail=f'Failed to fetch call details: {str(e)}')


async def _execute_vapi_call_analysis(
    call_id: str,
    case_id: str,
    user_id: str,
    call_dict: dict,
    transcript: str,
    messages: list
):
    """Background task for VAPI call analysis"""
    from .openai_call_analyzer import analyze_call_conversation_openai
    from .supabase_client import get_user_eligibility, update_case
    
    logger.info(f"[VAPI] ═══════════════════════════════════════════")
    logger.info(f"[VAPI] 🚀 Background task started!")
    logger.info(f"[VAPI] Starting background analysis for call {call_id}")
    logger.info(f"[VAPI] 📋 Input parameters:")
    logger.info(f"[VAPI]   - Case ID: {case_id}")
    logger.info(f"[VAPI]   - User ID: {user_id}")
    logger.info(f"[VAPI]   - Transcript length: {len(transcript)} chars")
    logger.info(f"[VAPI]   - Messages count: {len(messages)}")
    logger.info(f"[VAPI]   - call_dict has 'analysis': {'analysis' in call_dict}")
    
    # Check OPENAI_API_KEY
    if not os.getenv("OPENAI_API_KEY"):
        logger.error(f"[VAPI] ❌ OPENAI_API_KEY is not set!")
        raise ValueError("OPENAI_API_KEY not configured")
    else:
        logger.info(f"[VAPI] ✅ OPENAI_API_KEY is configured")
    
    if 'analysis' in call_dict:
        analysis = call_dict.get('analysis', {})
        structured_data = analysis.get('structuredData', {})
        related_topics = structured_data.get('related_topics', [])
        logger.info(f"[VAPI] 🏷️  Related topics in call_dict: {related_topics}")
    
    # Fetch user_eligibility data
    eligibility_records = []
    try:
        eligibility_records = get_user_eligibility(user_id=user_id)
        logger.info(f"[VAPI] 📋 Found {len(eligibility_records) if eligibility_records else 0} eligibility records")
    except Exception as e:
        logger.warning(f"[VAPI] Could not fetch eligibility records: {e}")
    
    # Analyze conversation - call_dict is passed as call_details parameter
    logger.info(f"[VAPI] 🤖 Calling analyze_call_conversation_openai with call_details...")
    
    try:
        analysis_result = await analyze_call_conversation_openai(transcript, messages, eligibility_records, call_dict)
        logger.info(f"[VAPI] ✅ Analysis complete. Documents requested: {len(analysis_result.get('documents_requested_list', []))}")
    except Exception as e:
        logger.exception(f"[VAPI] ❌ Analysis failed with error: {e}")
        # Create fallback analysis result
        analysis_result = {
            "call_summary": f"Call analysis failed: {str(e)}. Manual review required.",
            "documents_requested_list": [],
            "case_summary": "Analysis failed",
            "key_legal_points": ["Manual review required"],
            "risk_assessment": "Needs More Info",
            "estimated_claim_amount": 0.0,
            "degree_funding": 0.0,
            "monthly_allowance": 0.0,
            "income_tax_exemption": False,
            "living_expenses": 0.0,
            "products": [],
            "chance_of_approval": 0.0
        }
    
    # Save to case
    try:
        update_payload = {
            'call_details': call_dict,
            'call_summary': json.dumps(analysis_result, ensure_ascii=False),
            'status': CaseStatusConstants.INITIAL_QUESTIONNAIRE
        }
        
        logger.info(f"[VAPI] 💾 Attempting to save analysis to case {case_id}...")
        logger.info(f"[VAPI] 📦 Update payload keys: {list(update_payload.keys())}")
        logger.info(f"[VAPI] 📏 call_summary length: {len(update_payload['call_summary'])} chars")
        
        update_case(case_id, update_payload)
        logger.info(f"[VAPI] ✅ update_case() call completed")
        
        # Small delay to ensure DB commit
        await asyncio.sleep(0.5)
        logger.info(f"[VAPI] ⏱️  Waited 500ms for DB commit")
        
        # Verify the save by reading back
        try:
            from .supabase_client import get_case
            verification = get_case(case_id)
            if verification and len(verification) > 0:
                saved_summary = verification[0].get('call_summary')
                if saved_summary:
                    logger.info(f"[VAPI] ✅ Verification: call_summary is now saved (length: {len(str(saved_summary))} chars)")
                else:
                    logger.error(f"[VAPI] ❌ Verification FAILED: call_summary is still NULL in database!")
                    # Retry once
                    logger.info(f"[VAPI] 🔄 Retrying save...")
                    update_case(case_id, update_payload)
                    await asyncio.sleep(1)
                    verification = get_case(case_id)
                    if verification and len(verification) > 0:
                        saved_summary = verification[0].get('call_summary')
                        if saved_summary:
                            logger.info(f"[VAPI] ✅ Retry successful!")
                        else:
                            logger.error(f"[VAPI] ❌ Retry failed - data still not saved!")
            else:
                logger.error(f"[VAPI] ❌ Verification FAILED: Could not retrieve case {case_id}")
        except Exception as ve:
            logger.warning(f"[VAPI] ⚠️  Could not verify save: {ve}")
            
    except Exception as e:
        logger.exception(f"[VAPI] ❌ Failed to save analysis to database: {e}")
        raise  # Re-raise to mark job as failed
    
    logger.info(f"[VAPI] ═══════════════════════════════════════════")
    logger.info(f"[VAPI] 🏁 BACKGROUND TASK COMPLETED!")
    logger.info(f"[VAPI] ✅ All data has been saved to database for case {case_id}")
    logger.info(f"[VAPI] 📢 Frontend can now fetch updated case data")
    logger.info(f"[VAPI] 🎯 About to return result - job will be marked as COMPLETED")
    logger.info(f"[VAPI] ═══════════════════════════════════════════")
    
    # Return result for job queue - THIS MARKS THE JOB AS COMPLETED
    result = {
        'call_id': call_id,
        'case_id': case_id,
        'analysis': analysis_result,
        'message': 'Call analysis completed successfully'
    }
    
    logger.info(f"[VAPI] 🚀 Returning result to job queue now...")
    return result


@app.post('/cases/{case_id}/call-details')
async def save_call_details_and_analyze(
    case_id: str,
    call_data: dict,
    request: Request
):
    """
    Save call details (transcript, call_id, duration) to a case and analyze using OpenAI.
    This endpoint is called by the frontend after a call ends.
    """
    # Extract user from token manually (without full validation)
    user_id = None
    auth_header = request.headers.get("authorization")
    
    if not auth_header:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        # Extract token from "Bearer <token>" format
        token = auth_header
        if isinstance(auth_header, str) and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1]
        
        # Decode token without validation to extract user_id
        import base64
        import json as json_module
        parts = token.split('.')
        if len(parts) >= 2:
            payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
            payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
            payload_obj = json_module.loads(payload_json)
            user_id = payload_obj.get('sub')
            logger.info(f"[CALL] User extracted from token: {user_id}")
    except Exception as e:
        logger.error(f"[CALL] Failed to extract user from token: {e}")
        raise HTTPException(status_code=401, detail='Invalid authentication token')
    
    if not user_id:
        raise HTTPException(status_code=401, detail='Could not extract user from token')
    
    try:
        from .supabase_client import get_case, update_case
        from .openai_call_analyzer import analyze_call_conversation_openai
        
        # Validate case ownership
        case = get_case(case_id)
        if not case:
            raise HTTPException(status_code=404, detail='Case not found')
        
        if isinstance(case, list):
            case = case[0] if len(case) > 0 else None
            if not case:
                raise HTTPException(status_code=404, detail='Case not found')
        
        if str(case.get('user_id')) != str(user_id):
            logger.warning(f"[CALL] Access denied: case user_id={case.get('user_id')}, token user_id={user_id}")
            raise HTTPException(status_code=403, detail='Not authorized to update this case')
        
        # Extract call data
        call_id = call_data.get('call_id', '')
        transcript = call_data.get('transcript', [])
        duration = call_data.get('duration', 0)
        timestamp = call_data.get('timestamp', '')
        
        logger.info(f"[CALL] Saving call details for case {case_id}: call_id={call_id}, duration={duration}s")
        
        # Convert transcript array to string if needed
        transcript_text = ''
        if isinstance(transcript, list):
            transcript_text = '\n'.join(transcript)
        else:
            transcript_text = str(transcript)
        
        # Get user's full name from profile
        user_full_name = None
        try:
            from .supabase_client import get_profile_by_user_id
            profiles = get_profile_by_user_id(user_id)
            if profiles and len(profiles) > 0:
                user_full_name = profiles[0].get('full_name')
                if user_full_name:
                    logger.info(f"[CALL] Using user's full name from profile: {user_full_name}")
        except Exception as e:
            logger.warning(f"[CALL] Could not fetch user profile for full_name: {e}")
        
        # Prepend user name to transcript if available
        if user_full_name:
            transcript_text = f"USER NAME: {user_full_name}\n\n{transcript_text}"
        
        # Analyze conversation using OpenAI
        logger.info(f"[CALL] Analyzing conversation with OpenAI agent...")
        analysis_result = await analyze_call_conversation_openai(transcript_text, [], None, None)
        logger.info(f"[CALL] Analysis complete. Documents requested: {len(analysis_result.get('documents_requested_list', []))}")
        
        # Build call_details object
        call_details = {
            'call_id': call_id,
            'transcript': transcript_text,
            'duration': duration,
            'timestamp': timestamp,
            'analysis': {
                'summary': analysis_result.get('call_summary', ''),
                'structured_data': {
                    'case_summary': analysis_result.get('case_summary', ''),
                    'documents_requested_list': analysis_result.get('documents_requested_list', []),
                    'key_legal_points': analysis_result.get('key_legal_points', []),
                    'risk_assessment': analysis_result.get('risk_assessment', 'Needs More Info'),
                    'estimated_claim_amount': analysis_result.get('estimated_claim_amount', 0.0),
                    'degree_funding': analysis_result.get('degree_funding', 0.0),
                    'monthly_allowance': analysis_result.get('monthly_allowance', 0.0),
                    'income_tax_exemption': analysis_result.get('income_tax_exemption', False),
                    'living_expenses': analysis_result.get('living_expenses', 0.0)
                }
            }
        }
        
        # Update case with call details and analysis
        update_payload = {
            'call_details': call_details,
            'call_summary': json.dumps(analysis_result, ensure_ascii=False)
        }
        
        update_case(case_id, update_payload)
        logger.info(f"[CALL] Successfully saved call details and analysis to case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'message': 'Call details saved and analyzed successfully',
            'case_id': case_id,
            'analysis': analysis_result
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[CALL] Failed to save call details: {e}")
        raise HTTPException(status_code=500, detail=f'Failed to save call details: {str(e)}')


@app.post('/vapi/re-analyze-call/{case_id}')
async def re_analyze_call(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Re-analyze an existing call using the latest OpenAI agent.
    Returns immediately with a job_id. Frontend should poll /jobs/{job_id} for status.
    
    Returns:
        - job_id: ID to poll for status and results
        - status: 'accepted' (job created)
        - message: Human-readable message
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import get_case
        
        # Get the case to verify it exists
        case = get_case(case_id)
        if not case:
            raise HTTPException(status_code=404, detail='Case not found')
        
        # Handle case being a list
        if isinstance(case, list):
            if len(case) == 0:
                raise HTTPException(status_code=404, detail='Case not found')
            case = case[0]
        
        # Verify user has access
        if current_user['role'] != 'admin' and case.get('user_id') != current_user['id']:
            raise HTTPException(status_code=403, detail='Access denied')
        
        # Get call details from case
        call_details = case.get('call_details')
        if not call_details or not isinstance(call_details, dict):
            raise HTTPException(status_code=400, detail='No call details found for this case')
        
        # Extract transcript and messages
        transcript = call_details.get('transcript', '')
        messages = call_details.get('messages', [])
        
        if not transcript:
            raise HTTPException(status_code=400, detail='No transcript found in call details')
        
        # Create job
        job_queue = get_job_queue()
        job_id = job_queue.create_job(
            job_type='call_analysis',
            metadata={
                'case_id': case_id,
                'user_id': current_user['id'],
                'endpoint': 're-analyze-call'
            }
        )
        
        # Execute job in background
        asyncio.create_task(
            job_queue.execute_job(
                job_id,
                _execute_call_analysis,
                case_id,
                transcript,
                messages,
                call_details
            )
        )
        
        logger.info(f"[VAPI] Created job {job_id} for re-analyzing call {case_id}")
        
        return JSONResponse({
            'status': 'accepted',
            'job_id': job_id,
            'message': 'Call analysis job created. Poll /jobs/{job_id} for status.',
            'poll_url': f'/jobs/{job_id}'
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[VAPI] Failed to create call analysis job: {e}")
        raise HTTPException(status_code=500, detail=f'Failed to create job: {str(e)}')


async def _execute_call_analysis(case_id: str, transcript: str, messages: list, call_details: dict):
    """Background task for call analysis"""
    from .supabase_client import update_case
    from .openai_call_analyzer import analyze_call_conversation_openai
    
    logger.info(f"[VAPI] Starting call analysis for case {case_id}")
    
    # Run analysis
    analysis_result = await analyze_call_conversation_openai(transcript, messages, None, call_details)
    logger.info(f"[VAPI] Analysis completed. Documents: {len(analysis_result.get('documents_requested_list', []))}")
    
    # Update call_details with new analysis
    call_details['analysis'] = {
        'summary': analysis_result.get('call_summary', ''),
        'structured_data': {
            'case_summary': analysis_result.get('case_summary', ''),
            'documents_requested_list': analysis_result.get('documents_requested_list', []),
            'key_legal_points': analysis_result.get('key_legal_points', []),
            'risk_assessment': analysis_result.get('risk_assessment', 'Needs More Info'),
            'estimated_claim_amount': analysis_result.get('estimated_claim_amount', 'Pending evaluation')
        }
    }
    
    # Save to database
    update_payload = {
        'call_details': call_details,
        'call_summary': json.dumps(analysis_result, ensure_ascii=False)
    }
    
    update_case(case_id, update_payload)
    logger.info(f"[VAPI] Updated case {case_id} with new analysis")
    
    # Return result for job queue
    return {
        'case_id': case_id,
        'analysis': analysis_result,
        'message': 'Call re-analyzed successfully'
    }


@app.get('/vapi/requested-documents')
async def get_requested_documents(current_user: dict = Depends(get_current_user)):
    """
    Get list of documents requested during the voice interview from call_details.
    Also returns documents already uploaded for the case.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import list_cases_for_user, _supabase_admin
        
        user_id = current_user.get('id')
        cases = list_cases_for_user(user_id)
        
        if not cases:
            return JSONResponse({
                'status': 'no_case',
                'requested_documents': [],
                'uploaded_documents': []
            })
        
        # Get the most recent case
        latest_case = sorted(cases, key=lambda x: x.get('created_at', ''), reverse=True)[0]
        case_id = latest_case.get('id')
        call_details = latest_case.get('call_details')
        call_summary = latest_case.get('call_summary')
        
        # Extract requested documents from call analysis
        requested_documents = []
        
        # First try to get from call_summary (new format - full JSON)
        if call_summary and isinstance(call_summary, str):
            try:
                summary_data = json.loads(call_summary)
                if isinstance(summary_data, dict):
                    documents_list = summary_data.get('documents_requested_list', [])
                    if isinstance(documents_list, list):
                        requested_documents = documents_list
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse call_summary JSON for case {case_id}")
        
        # Fallback: try call_details.analysis (old format)
        if not requested_documents and call_details and isinstance(call_details, dict):
            analysis = call_details.get('analysis', {})
            if isinstance(analysis, dict):
                structured_data = analysis.get('structured_data', {})
                if isinstance(structured_data, dict):
                    documents_list = structured_data.get('documents_requested_list', [])
                    if isinstance(documents_list, list):
                        requested_documents = documents_list
        
        # Get already uploaded documents for this case
        uploaded_documents = []
        try:
            if _supabase_admin:
                result = _supabase_admin.table('case_documents').select('*').eq('case_id', case_id).execute()
                if result and result.data:
                    uploaded_documents = result.data
        except Exception as e:
            logger.warning(f"Failed to fetch uploaded documents: {e}")
        
        return JSONResponse({
            'status': 'ok',
            'case_id': case_id,
            'requested_documents': requested_documents,
            'uploaded_documents': uploaded_documents,
            'all_documents_uploaded': len(uploaded_documents) >= len(requested_documents) if requested_documents else False
        })
        
    except Exception as e:
        logger.exception(f'Failed to get requested documents: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to get requested documents: {str(e)}')


@app.get('/cases/{case_id}/strategy-status')
async def get_case_strategy_status(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Check if a case already has a generated strategy.
    Returns strategy status and data if available.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import get_case
        
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='Case not found')
        
        case = case_list[0]
        # Verify user has access
        if current_user['role'] != 'admin' and case.get('user_id') != current_user['id']:
            raise HTTPException(status_code=403, detail='Access denied')
        
        strategy = case.get('strategy')
        has_strategy = strategy is not None and isinstance(strategy, dict) and len(strategy) > 0
        
        # Check if documents are required from call_details
        call_details = case.get('call_details', {})
        documents_required = False
        if isinstance(call_details, dict):
            analysis = call_details.get('analysis', {})
            if isinstance(analysis, dict):
                structured_data = analysis.get('structured_data', {})
                if isinstance(structured_data, dict):
                    docs_list = structured_data.get('documents_requested_list', [])
                    documents_required = isinstance(docs_list, list) and len(docs_list) > 0
        
        return JSONResponse({
            'status': 'ok',
            'has_strategy': has_strategy,
            'strategy': strategy if has_strategy else None,
            'documents_required': documents_required,
            'case_status': case.get('status')
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'Failed to get strategy status: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to get strategy status: {str(e)}')


@app.post('/cases/{case_id}/analyze-with-agent')
async def analyze_case_with_agent(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Analyze a case's uploaded documents using the AI agent.
    Returns immediately with a job_id. Frontend should poll /jobs/{job_id} for status.
    
    Returns:
        - job_id: ID to poll for status and results
        - status: 'accepted' (job created)
        - message: Human-readable message
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import get_case, _supabase_admin
        
        logger.info(f"🔵 Starting agent analysis for case {case_id}")
        
        # Get case and verify access
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='Case not found')
        
        case = case_list[0]
        if current_user['role'] != 'admin' and case.get('user_id') != current_user['id']:
            raise HTTPException(status_code=403, detail='Access denied')
        
        # Extract document IDs from call_summary
        call_summary = case.get('call_summary', {})
        if isinstance(call_summary, str):
            try:
                call_summary = json.loads(call_summary)
            except:
                call_summary = {}
        
        documents_requested = call_summary.get('documents_requested_list', [])
        logger.info(f"📄 Found {len(documents_requested)} documents in call_summary")
        
        # Collect all documents with their summaries
        documents_with_summaries = []
        
        if _supabase_admin and documents_requested:
            for doc_req in documents_requested:
                doc_id = doc_req.get('document_id')
                if not doc_id:
                    continue
                
                try:
                    result = _supabase_admin.table('case_documents').select('*').eq('id', doc_id).execute()
                    if result.data and len(result.data) > 0:
                        documents_with_summaries.append(result.data[0])
                except Exception as e:
                    logger.warning(f"⚠️ Failed to fetch document {doc_id}: {e}")
        
        if not documents_with_summaries:
            raise HTTPException(status_code=400, detail='No uploaded documents found to analyze')
        
        # Create job
        job_queue = get_job_queue()
        job_id = job_queue.create_job(
            job_type='document_analysis_agent',
            metadata={
                'case_id': case_id,
                'user_id': current_user['id'],
                'document_count': len(documents_with_summaries),
                'endpoint': 'analyze-with-agent'
            }
        )
        
        # Execute job in background
        asyncio.create_task(
            job_queue.execute_job(
                job_id,
                _execute_agent_analysis,
                case_id,
                documents_with_summaries
            )
        )
        
        logger.info(f"✅ Created job {job_id} for agent analysis of case {case_id}")
        
        return JSONResponse({
            'status': 'accepted',
            'job_id': job_id,
            'message': 'Document analysis job created. Poll /jobs/{job_id} for status.',
            'poll_url': f'/jobs/{job_id}',
            'documents_count': len(documents_with_summaries)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'❌ Error creating analysis job: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to create analysis job: {str(e)}')


async def _execute_agent_analysis(case_id: str, documents_with_summaries: list):
    """Background task for agent-based document analysis"""
    from .supabase_client import update_case
    from .document_analyzer_agent import analyze_case_documents_with_agent
    
    logger.info(f"📊 Processing {len(documents_with_summaries)} documents for agent analysis")
    
    # Call the agent
    agent_result = await analyze_case_documents_with_agent(case_id, documents_with_summaries)
    
    logger.info(f"✅ Agent analysis completed. Storing result")
    
    # Store result
    update_case(case_id, {
        'form_7801_analysis': agent_result,
        'form_7801_analysis_timestamp': datetime.utcnow().isoformat(),
        'analysis_status': 'completed'
    })
    
    return {
        'case_id': case_id,
        'analysis': agent_result,
        'documents_analyzed': len(documents_with_summaries),
        'timestamp': datetime.utcnow().isoformat()
    }


@app.post('/cases/{case_id}/analyze-documents-form7801')
async def analyze_documents_form7801(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Analyze case documents using OpenAI Form 7801 agent.
    Returns immediately with a job_id. Frontend should poll /jobs/{job_id} for status.
    
    This endpoint is called from the "התחל ניתוח AI" button on the dashboard.
    
    Returns:
        - job_id: ID to poll for status and results
        - status: 'accepted' (job created)
        - message: Human-readable message
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import get_case, _supabase_admin
        
        logger.info(f"🔵 Starting OpenAI Form 7801 analysis for case {case_id}")
        
        # Get case and verify access
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='Case not found')
        
        case = case_list[0]
        if current_user['role'] != 'admin' and case.get('user_id') != current_user['id']:
            raise HTTPException(status_code=403, detail='Access denied')
        
        # Extract call summary and call details
        call_summary = case.get('call_summary', {})
        if isinstance(call_summary, str):
            try:
                call_summary = json.loads(call_summary)
            except:
                call_summary = {}
        
        call_details = case.get('call_details', {})
        if isinstance(call_details, str):
            try:
                call_details = json.loads(call_details)
            except:
                call_details = {}
        
        documents_requested = call_summary.get('documents_requested_list', [])
        logger.info(f"📄 Found {len(documents_requested)} documents in call_summary")
        
        # Collect all documents with their metadata
        documents_with_metadata = []
        
        if _supabase_admin and documents_requested:
            for doc_req in documents_requested:
                doc_id = doc_req.get('document_id')
                if not doc_id:
                    continue
                
                try:
                    result = _supabase_admin.table('case_documents').select('*').eq('id', doc_id).execute()
                    if result.data and len(result.data) > 0:
                        documents_with_metadata.append(result.data[0])
                except Exception as e:
                    logger.warning(f"⚠️ Failed to fetch document {doc_id}: {e}")
        
        # Create job
        job_queue = get_job_queue()
        job_id = job_queue.create_job(
            job_type='document_analysis_form7801',
            metadata={
                'case_id': case_id,
                'user_id': current_user['id'],
                'document_count': len(documents_with_metadata),
                'endpoint': 'analyze-documents-form7801'
            }
        )
        
        # Execute job in background
        asyncio.create_task(
            job_queue.execute_job(
                job_id,
                _execute_form7801_analysis,
                case_id,
                documents_with_metadata,
                call_summary,
                call_details
            )
        )
        
        logger.info(f"✅ Created job {job_id} for Form 7801 analysis of case {case_id}")
        
        return JSONResponse({
            'status': 'accepted',
            'job_id': job_id,
            'message': 'Form 7801 analysis job created. Poll /jobs/{job_id} for status.',
            'poll_url': f'/jobs/{job_id}',
            'documents_count': len(documents_with_metadata)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'❌ Error creating Form 7801 analysis job: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to create analysis job: {str(e)}')


async def _execute_form7801_analysis(case_id: str, documents_with_metadata: list, call_summary: dict, call_details: dict | None = None):
    """Background task for Form 7801 document analysis"""
    from .supabase_client import update_case
    from .openai_form7801_agent import analyze_documents_with_openai_agent
    
    logger.info(f"📊 Processing {len(documents_with_metadata)} documents for Form 7801 analysis")
    logger.info(f"🤖 Calling OpenAI Form 7801 agent...")
    
    # Call the OpenAI agent
    agent_result = await analyze_documents_with_openai_agent(
        case_id=case_id,
        documents_data=documents_with_metadata,
        call_summary=call_summary,
        call_details=call_details
    )
    
    logger.info(f"✅ Agent analysis completed. Storing result")
    
    # Store result and update status
    update_case(case_id, {
        'final_document_analysis': agent_result,
        'status': 'Submission Pending'
    })
    
    logger.info(f"✅ Form 7801 analysis saved successfully for case {case_id}")
    
    return {
        'case_id': case_id,
        'analysis': agent_result,
        'documents_analyzed': len(documents_with_metadata),
        'timestamp': datetime.utcnow().isoformat()
    }


@app.post('/cases/{case_id}/process-documents')
async def process_case_documents(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Process all uploaded documents for a case:
    1. Run OCR on all documents
    2. Perform Disability Stacking Assessment
    3. Perform IEL Assessment
    4. Generate Statement_of_Claims strategy
    5. Save to cases.strategy
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import get_case, update_case, _supabase_admin, storage_download_file
        from .ocr import extract_text_from_document
        from .gemini_client import call_gemini
        
        # Get case and verify access
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='Case not found')
        
        case = case_list[0]
        if current_user['role'] != 'admin' and case.get('user_id') != current_user['id']:
            raise HTTPException(status_code=403, detail='Access denied')
        
        # Get call details for context
        call_details = case.get('call_details', {})
        transcript = call_details.get('transcript', '')
        analysis = call_details.get('analysis', {})
        structured_data = analysis.get('structured_data', {}) if isinstance(analysis, dict) else {}
        
        # Get uploaded documents
        documents = []
        try:
            if _supabase_admin:
                result = _supabase_admin.table('case_documents').select('*').eq('case_id', case_id).execute()
                if result and result.data:
                    documents = result.data
        except Exception as e:
            logger.warning(f"Failed to fetch documents: {e}")
        
        # Process each document with OCR
        document_texts = []
        for doc in documents:
            try:
                file_path = doc.get('file_path')
                if not file_path:
                    continue
                
                # Download file from storage
                file_bytes = storage_download_file('case-documents', file_path)
                if not file_bytes:
                    logger.warning(f"Could not download document: {file_path}")
                    continue
                
                # Extract text with OCR
                text = extract_text_from_document(file_bytes, doc.get('file_name', ''))
                if text:
                    document_texts.append({
                        'filename': doc.get('file_name'),
                        'type': doc.get('document_type'),
                        'text': text
                    })
                    logger.info(f"OCR extracted {len(text)} chars from {doc.get('file_name')}")
            except Exception as e:
                logger.exception(f"Failed to process document {doc.get('file_name')}: {e}")
        
        # Generate comprehensive strategy using LLM
        strategy_prompt = f"""You are an expert Israeli disability claims attorney specializing in Bituach Leumi (National Insurance Institute) claims.

**CASE CONTEXT:**
Interview Transcript:
{transcript}

Case Summary: {structured_data.get('case_summary', 'N/A')}
Key Legal Points: {structured_data.get('key_legal_points', [])}

**MEDICAL DOCUMENTS ANALYZED:**
{chr(10).join([f"- {doc['type']}: {doc['text'][:500]}..." for doc in document_texts]) if document_texts else "No documents provided"}

**YOUR TASK:**
Generate a comprehensive Statement of Claims strategy covering:

1. **RETROACTIVITY ANALYSIS** (Up to 12 months back-pay)
   - Date of first diagnosis
   - Date of first income loss
   - Recommended claim start date
   - Justification for retroactivity

2. **DISABILITY STACKING ASSESSMENT** (Goal: >20% medical threshold)
   - Primary disability and estimated percentage
   - Secondary conditions identified (psychiatric, medication side effects, etc.)
   - Total weighted disability percentage estimate
   - Specific medical items from BTL regulation to cite

3. **IEL (Impairment of Earning Capacity) ASSESSMENT** (50%-100% incapacity)
   - Functional limitations preventing work
   - Specific work activities affected
   - Daily living impact (Sheram eligibility check)
   - Evidence of job loss, reduced hours, or performance impact

4. **VOCATIONAL REHABILITATION ELIGIBILITY**
   - Student status assessment
   - Potential for Dmei Shikum (rehabilitation funds)
   - Recommended vocational path if applicable

5. **REQUIRED DOCUMENTATION**
   - Missing medical records needed
   - Specific tests or evaluations required
   - Employment/income documentation gaps

6. **STATEMENT OF CLAIMS DRAFT**
   - Professional legal narrative for Medical Committee
   - Key arguments in order of priority
   - Supporting evidence summary

7. **FOLLOW-UP QUESTIONS** (if information incomplete)
   - Specific questions to ask user
   - Information gaps that need clarification

Provide your response as a detailed JSON structure with all sections above."""

        try:
            strategy_response = call_gemini(
                system_prompt="You are an expert Israeli disability claims attorney. Provide detailed, professional legal strategies.",
                user_prompt=strategy_prompt,
                max_output_tokens=4000
            )
            
            # Parse strategy response
            import json
            strategy_data = json.loads(strategy_response) if isinstance(strategy_response, str) else strategy_response
            
            # Save strategy to database
            update_case(case_id, {'strategy': strategy_data, 'status': 'strategy_generated'})
            
            return JSONResponse({
                'status': 'ok',
                'strategy': strategy_data,
                'documents_processed': len(document_texts)
            })
            
        except json.JSONDecodeError:
            # If LLM doesn't return valid JSON, wrap response
            strategy_data = {'raw_strategy': strategy_response}
            update_case(case_id, {'strategy': strategy_data, 'status': 'strategy_generated'})
            return JSONResponse({
                'status': 'ok',
                'strategy': strategy_data,
                'documents_processed': len(document_texts)
            })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'Failed to process documents: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to process documents: {str(e)}')


@app.post('/cases/{case_id}/generate-strategy')
async def generate_case_strategy_direct(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Generate strategy directly from call details without documents.
    Used when no documents are required.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import get_case, update_case
        from .gemini_client import call_gemini
        
        # Get case and verify access
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='Case not found')
        
        case = case_list[0]
        if current_user['role'] != 'admin' and case.get('user_id') != current_user['id']:
            raise HTTPException(status_code=403, detail='Access denied')
        
        # Get call details
        call_details = case.get('call_details', {})
        transcript = call_details.get('transcript', '')
        analysis = call_details.get('analysis', {})
        structured_data = analysis.get('structured_data', {}) if isinstance(analysis, dict) else {}
        
        # Generate strategy using LLM (same prompt as document version, but without documents)
        strategy_prompt = f"""You are an expert Israeli disability claims attorney specializing in Bituach Leumi (National Insurance Institute) claims.

**CASE CONTEXT:**
Interview Transcript:
{transcript}

Case Summary: {structured_data.get('case_summary', 'N/A')}
Key Legal Points: {structured_data.get('key_legal_points', [])}

**NOTE:** No medical documents were provided. Base your analysis on interview information only.

**YOUR TASK:**
Generate a comprehensive Statement of Claims strategy covering:

1. **RETROACTIVITY ANALYSIS** (Up to 12 months back-pay)
   - Date of first diagnosis (from interview)
   - Date of first income loss
   - Recommended claim start date
   - Justification for retroactivity

2. **DISABILITY STACKING ASSESSMENT** (Goal: >20% medical threshold)
   - Primary disability and estimated percentage
   - Secondary conditions identified from interview
   - Total weighted disability percentage estimate
   - Specific medical items from BTL regulation to cite

3. **IEL (Impairment of Earning Capacity) ASSESSMENT** (50%-100% incapacity)
   - Functional limitations preventing work
   - Specific work activities affected
   - Daily living impact
   - Evidence of job loss or performance impact

4. **VOCATIONAL REHABILITATION ELIGIBILITY**
   - Student status assessment
   - Potential for rehabilitation funds

5. **REQUIRED DOCUMENTATION**
   - Essential medical records needed
   - Specific tests or evaluations required
   - Employment documentation needed

6. **STATEMENT OF CLAIMS DRAFT**
   - Professional legal narrative for Medical Committee
   - Key arguments in priority order
   - Supporting evidence from interview

7. **FOLLOW-UP QUESTIONS**
   - Critical information gaps
   - Specific questions to clarify details

Provide response as detailed JSON structure."""

        try:
            strategy_response = call_gemini(
                system_prompt="You are an expert Israeli disability claims attorney. Provide detailed, professional legal strategies.",
                user_prompt=strategy_prompt,
                max_output_tokens=4000
            )
            
            # Parse strategy response
            import json
            strategy_data = json.loads(strategy_response) if isinstance(strategy_response, str) else strategy_response
            
            # Save strategy to database
            update_case(case_id, {'strategy': strategy_data, 'status': 'strategy_generated'})
            
            return JSONResponse({
                'status': 'ok',
                'strategy': strategy_data
            })
            
        except json.JSONDecodeError:
            # If LLM doesn't return valid JSON, wrap response
            strategy_data = {'raw_strategy': strategy_response}
            update_case(case_id, {'strategy': strategy_data, 'status': 'strategy_generated'})
            return JSONResponse({
                'status': 'ok',
                'strategy': strategy_data
            })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'Failed to generate strategy: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to generate strategy: {str(e)}')


@app.get('/vapi/eligibility-file')
async def get_eligibility_file_for_vapi(current_user: dict = Depends(get_current_user)):
    """
    Get the most recent eligibility file for the current user to upload to Vapi.
    Returns file data and metadata needed for Vapi upload.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    user_id = current_user.get('id')
    if not user_id:
        raise HTTPException(status_code=400, detail='User ID not found')
    
    try:
        # Get user's eligibility records
        eligibility_records = get_user_eligibilities(user_id)
        
        if not eligibility_records:
            return JSONResponse({
                'status': 'no_file',
                'message': 'No eligibility documents found'
            })
        
        # Find the most recent record with an uploaded file
        latest_with_file = None
        for record in sorted(eligibility_records, key=lambda x: x.get('created_at', ''), reverse=True):
            uploaded_file_path = record.get('uploaded_file')
            if uploaded_file_path and os.path.exists(uploaded_file_path):
                latest_with_file = record
                break
        
        if not latest_with_file:
            return JSONResponse({
                'status': 'no_file',
                'message': 'No eligibility documents found on server'
            })
        
        uploaded_file_path = latest_with_file['uploaded_file']
        
        # Read file and prepare for upload
        with open(uploaded_file_path, 'rb') as f:
            file_content = f.read()
        
        import base64
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Get file info
        file_name = os.path.basename(uploaded_file_path)
        file_size = len(file_content)
        
        return JSONResponse({
            'status': 'ok',
            'file': {
                'name': file_name,
                'size': file_size,
                'data': file_base64,
                'content_type': 'application/pdf' if file_name.endswith('.pdf') else 'application/octet-stream'
            }
        })
        
    except Exception as e:
        logger.exception('Failed to fetch eligibility file')
        raise HTTPException(status_code=500, detail=f'Failed to fetch file: {str(e)}')


@app.post('/vapi/upload-file')
async def upload_file_to_vapi(current_user: dict = Depends(get_current_user)):
    """
    Upload the user's eligibility file to Vapi and return the file ID.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    vapi_token = os.environ.get('VAPI_API_KEY')
    if not vapi_token:
        raise HTTPException(status_code=500, detail='Vapi API key not configured')
    
    user_id = current_user.get('id')
    if not user_id:
        raise HTTPException(status_code=400, detail='User ID not found')
    
    try:
        import httpx
        
        # Get user's eligibility records
        eligibility_records = get_user_eligibilities(user_id)
        
        if not eligibility_records:
            return JSONResponse({
                'status': 'no_file',
                'message': 'No eligibility documents found',
                'file_id': None
            })
        
        # Find the most recent record with an uploaded file
        latest_with_file = None
        for record in sorted(eligibility_records, key=lambda x: x.get('created_at', ''), reverse=True):
            uploaded_file_path = record.get('uploaded_file')
            if uploaded_file_path and os.path.exists(uploaded_file_path):
                latest_with_file = record
                break
        
        if not latest_with_file:
            return JSONResponse({
                'status': 'no_file',
                'message': 'No eligibility documents found on server',
                'file_id': None
            })
        
        uploaded_file_path = latest_with_file['uploaded_file']
        file_name = os.path.basename(uploaded_file_path)
        
        # Upload to Vapi
        with open(uploaded_file_path, 'rb') as f:
            files = {
                'file': (file_name, f, 'application/pdf' if file_name.endswith('.pdf') else 'application/octet-stream')
            }
            
            headers = {
                'Authorization': f'Bearer {vapi_token}'
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    'https://api.vapi.ai/file',
                    files=files,
                    headers=headers
                )
                
                if response.status_code != 200 and response.status_code != 201:
                    logger.error(f'Vapi upload failed: {response.status_code} - {response.text}')
                    raise HTTPException(
                        status_code=500,
                        detail=f'Vapi upload failed: {response.status_code}'
                    )
                
                result = response.json()
                file_id = result.get('id') or result.get('file', {}).get('id')
                
                if not file_id:
                    logger.error(f'No file ID in Vapi response: {result}')
                    raise HTTPException(
                        status_code=500,
                        detail='No file ID returned from Vapi'
                    )
                
                logger.info(f'Successfully uploaded file to Vapi: {file_id}')
                
                return JSONResponse({
                    'status': 'ok',
                    'file_id': file_id,
                    'file_name': file_name
                })
        
    except httpx.HTTPError as e:
        logger.exception('HTTP error during Vapi upload')
        raise HTTPException(status_code=500, detail=f'Upload failed: {str(e)}')
    except Exception as e:
        logger.exception('Failed to upload file to Vapi')
        raise HTTPException(status_code=500, detail=f'Failed to upload: {str(e)}')


@app.post('/eligibility-submit')
async def eligibility_submit(
    answers: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    """
    Comprehensive eligibility submission endpoint.
    
    Process flow:
    1. Parse questionnaire answers
    2. Extract text from uploaded document (if provided) using OCR
    3. Use Gemini to summarize document and extract key points
    4. Load eligibility.pdf guidelines
    5. Use Gemini to score eligibility based on guidelines
    6. Save all data to database
    7. Upload file to Supabase storage (if case_id provided)
    
    Parameters:
        answers: JSON string with questionnaire answers and optional user_id/case_id
        file: Optional uploaded medical document (PDF, JPG, PNG, DOCX)
    
    Returns:
        {
            'status': 'ok',
            'data': {
                'eligibility_score': int,
                'eligibility_status': str,
                'confidence': int,
                'reason_summary': str,
                'document_summary': str,
                'key_points': List[str],
                'strengths': List[str],
                'weaknesses': List[str],
                'required_next_steps': List[str]
            }
        }
    """
    from .eligibility_processor import (
        summarize_and_extract_keypoints,
        score_eligibility_with_guidelines,
        load_eligibility_guidelines,
        check_document_relevance,
    )
    
    logger.info(f"Received /eligibility-submit request")
    
    # Parse answers
    try:
        answers_obj: Dict[str, Any] = json.loads(answers)
        logger.info(f"Parsed answers: {len(answers_obj)} keys")
    except Exception as e:
        logger.warning("Invalid JSON in 'answers' form field", exc_info=True)
        raise HTTPException(status_code=400, detail='Invalid JSON in answers')
    
    user_id = answers_obj.get('user_id')
    case_id = answers_obj.get('case_id')
    
    # Process uploaded file if provided
    document_analysis = {}
    ocr_text = ''
    saved_path = None
    storage_url = None
    
    if file and file.filename:
        logger.info(f"Processing uploaded file: {file.filename}")
        
        # Validate file type (only PDF and images allowed)
        allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'}
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            logger.warning(f"Rejected unsupported file type: {file.filename}")
            raise HTTPException(
                status_code=400, 
                detail=f'Unsupported file type. Only PDF and image files (JPG, PNG, etc.) are allowed.'
            )
        
        try:
            # Read file content
            content = await file.read()
            filesize = len(content)
            logger.info(f"Read file: {filesize} bytes")
            
            # Extract text using OCR
            try:
                ocr_text, extraction_success = extract_text_from_document(content, file.filename)
                if not extraction_success or not ocr_text:
                    logger.warning("OCR extraction returned empty result")
                    raise Exception("No text could be extracted from the document")
                logger.info(f"OCR extraction: success={extraction_success}, chars={len(ocr_text)}")
            except Exception as e:
                logger.exception("OCR extraction failed")
                error_msg = str(e)
                if "API key not configured" in error_msg:
                    raise HTTPException(status_code=500, detail='Server configuration error: Google Vision API not configured')
                elif "Unsupported file type" in error_msg:
                    raise HTTPException(status_code=400, detail=error_msg)
                else:
                    raise HTTPException(status_code=500, detail=f'Text extraction failed: {error_msg}')

            # Check document relevance and get summary
            relevance_result = None
            document_context_for_scoring = ''
            try:
                logger.info("="*80)
                logger.info("/eligibility-submit: DOCUMENT ANALYSIS - Get summary and check relevance")
                logger.info("="*80)
                logger.info(f"OCR Text Length: {len(ocr_text)} characters")
                logger.info(f"OCR Text Preview (first 1000 chars):\n{ocr_text[:1000]}")
                logger.info("-"*80)

                relevance_result = check_document_relevance(ocr_text, provider='gpt')

                logger.info("DOCUMENT ANALYSIS RESULT (/eligibility-submit):")
                logger.info(f"  Is Relevant: {relevance_result['is_relevant']}")
                logger.info(f"  Relevance Score: {relevance_result['relevance_score']}/100")
                logger.info(f"  Document Type: {relevance_result['document_type']}")
                logger.info(f"  Reason: {relevance_result['relevance_reason']}")
                logger.info(f"  Statement: {relevance_result['statement']}")
                if relevance_result.get('document_summary'):
                    logger.info(f"  Summary: {relevance_result['document_summary']}")
                logger.info("="*80)

                # Only use document context for scoring if relevant
                if relevance_result['is_relevant']:
                    document_context_for_scoring = relevance_result.get('document_summary', '')
                    logger.info(f"✓ DOCUMENT IS RELEVANT: Will include in scoring analysis")
                else:
                    logger.warning(f"⚠️ DOCUMENT NOT RELEVANT: Will score questionnaire without document context")
                    logger.warning(f"Document will be flagged on result screen: {relevance_result['relevance_reason']}")
            except Exception as e:
                # If relevance check fails, continue without document context
                logger.exception("/eligibility-submit: Document relevance check failed; continuing without document context")
                relevance_result = {
                    'is_relevant': False,
                    'relevance_score': 0,
                    'relevance_reason': 'Analysis failed',
                    'document_type': 'unknown',
                    'document_summary': 'Unable to analyze document',
                    'key_points': [],
                    'focus_excerpt': '',
                    'statement': 'Document analysis encountered an error',
                    'directions': ['Please try uploading again or upload a different document']
                }
            
            # Upload to Supabase Storage bucket 'eligibility-documents'
            uid = uuid.uuid4().hex
            safe_filename = f"{uid}{file_ext}"
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            storage_path = f"{user_id}/{timestamp}_{safe_filename}" if user_id else f"anonymous/{timestamp}_{safe_filename}"
            
            try:
                upload_result = storage_upload_file(
                    bucket='eligibility-documents',
                    path=storage_path,
                    file_bytes=content,
                    content_type=file.content_type or 'application/octet-stream',
                    upsert=True
                )
                storage_url = upload_result.get('public_url')
                logger.info(f"Uploaded eligibility document to Supabase Storage: {storage_url}")
            except Exception as e:
                logger.exception("Failed to upload to Supabase Storage")
                raise HTTPException(status_code=500, detail=f'Failed to upload file: {str(e)}')
            
            # Also upload to case-documents if case_id provided (for case documents table)
            if case_id:
                try:
                    case_storage_path = f"cases/{case_id}/eligibility/{timestamp}_{safe_filename}"
                    
                    case_upload_result = storage_upload_file(
                        bucket='case-documents',
                        path=case_storage_path,
                        file_bytes=content,
                        content_type=file.content_type or 'application/octet-stream',
                        upsert=True
                    )
                    logger.info(f"Also uploaded to case-documents bucket")
                    
                    # Insert document record
                    insert_case_document(
                        case_id=case_id,
                        file_path=case_storage_path,
                        file_name=file.filename,
                        file_type=file.content_type,
                        file_size=filesize,
                        document_type='eligibility_document',
                        uploaded_by=user_id,
                        metadata={'source': 'eligibility_submit'}
                    )
                except Exception:
                    logger.exception("Failed to upload to Supabase Storage (non-fatal)")
            
            # Store document analysis from relevance check
            if relevance_result:
                document_analysis = {
                    'summary': relevance_result.get('document_summary', ''),
                    'key_points': relevance_result.get('key_points', []),
                    'is_relevant': relevance_result['is_relevant'],
                    'relevance_score': relevance_result['relevance_score'],
                    'document_type': relevance_result['document_type']
                }
                logger.info(f"Document analysis stored from relevance check")
            else:
                document_analysis = {
                    'summary': 'Document uploaded but analysis failed',
                    'key_points': [],
                    'is_relevant': False,
                    'relevance_score': 0,
                    'document_type': 'unknown'
                }
        
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("File processing failed")
            raise HTTPException(status_code=500, detail=f'File processing failed: {str(e)}')
    else:
        logger.info("No file uploaded - proceeding with questionnaire only")
        document_analysis = {
            'summary': '',
            'key_points': [],
            'is_relevant': False,
            'relevance_score': 0,
            'document_type': 'none'
        }
        relevance_result = None
        document_context_for_scoring = ''
    
    # Load eligibility guidelines
    try:
        guidelines_text = load_eligibility_guidelines()
        logger.info(f"Loaded guidelines: {len(guidelines_text)} characters")
    except Exception:
        logger.exception("Failed to load guidelines (non-fatal)")
        guidelines_text = ""
    
    # Score eligibility using Gemini with guidelines
    # Only pass document context if it's relevant
    try:
        scoring_document_context = {
            'summary': document_context_for_scoring,
            'key_points': document_analysis.get('key_points', []) if document_context_for_scoring else []
        }
        scoring_result = score_eligibility_with_guidelines(
            answers=answers_obj,
            document_analysis=scoring_document_context,
            guidelines_text=guidelines_text
        )
        logger.info(f"Eligibility scored: {scoring_result.get('eligibility_status')} ({scoring_result.get('eligibility_score')}/100)")
    except Exception:
        logger.exception("Failed to score eligibility")
        raise HTTPException(status_code=500, detail='Eligibility scoring failed')
    
    # Create case for the user (only if user_id is provided)
    if user_id:
        try:
            from .supabase_client import create_case
            
            case_title = f"Disability Claim - {scoring_result.get('eligibility_status', 'Under Review').title()}"
            case_description = f"Work-related injury claim with eligibility score: {scoring_result.get('eligibility_score')}/100"
            
            case_metadata = {
                'eligibility_score': scoring_result.get('eligibility_score'),
                'eligibility_status': scoring_result.get('eligibility_status'),
                'confidence': scoring_result.get('confidence'),
                'injury_date': answers_obj.get('injury_date'),
                'work_related': answers_obj.get('work_related'),
                'has_document': bool(file)
            }
            
            case = create_case(
                user_id=user_id,
                title=case_title,
                description=case_description,
                metadata=case_metadata
            )
            case_id = case.get('id') if isinstance(case, dict) else case[0].get('id') if isinstance(case, list) else None
            logger.info(f"Created case: {case_id}")
            
        except Exception:
            logger.exception("Failed to create case (non-fatal)")
            case_id = None
    else:
        logger.info("No user_id provided - skipping case creation (user can create case after signup)")
    
    # Save to database
    try:
        eligibility_payload = {
            'rating': scoring_result.get('eligibility_score'),
            'title': scoring_result.get('eligibility_status'),
            'message': scoring_result.get('reason_summary'),
            'confidence': scoring_result.get('confidence'),
            'raw': {
                'scoring': scoring_result,
                'document_analysis': {
                    'is_relevant': relevance_result['is_relevant'] if relevance_result else False,
                    'relevance_score': relevance_result['relevance_score'] if relevance_result else 0,
                    'relevance_reason': relevance_result.get('relevance_reason', '') if relevance_result else '',
                    'document_type': relevance_result.get('document_type', 'unknown') if relevance_result else 'none',
                    'document_summary': document_analysis.get('summary', ''),
                    'key_points': document_analysis.get('key_points', []),
                    'focus_excerpt': relevance_result.get('focus_excerpt', '') if relevance_result else '',
                    'statement': relevance_result.get('statement', '') if relevance_result else '',
                    'directions': relevance_result.get('directions', []) if relevance_result else []
                } if (file and file.filename) else None,
                'ocr_text_length': len(ocr_text) if file and file.filename else 0,
                'storage_url': storage_url,
                'answers': answers_obj,
                'processed_at': datetime.utcnow().isoformat()
            }
        }
        
        insert_user_eligibility(
            user_id=user_id,
            uploaded_file=storage_url or '',
            eligibility=eligibility_payload,
            case_id=case_id
        )
        logger.info("Saved eligibility data to database")
        
    except Exception:
        logger.exception("Failed to save to database (non-fatal)")
    
    # Build response with document_analysis matching /eligibility-check structure
    result = {
        'eligibility_score': scoring_result.get('eligibility_score'),
        'eligibility_status': scoring_result.get('eligibility_status'),
        'confidence': scoring_result.get('confidence'),
        'reason_summary': scoring_result.get('reason_summary'),
        'strengths': scoring_result.get('strengths', []),
        'weaknesses': scoring_result.get('weaknesses', []),
        'required_next_steps': scoring_result.get('required_next_steps', []),
        'rule_references': scoring_result.get('rule_references', []),
        'storage_url': storage_url,
        'case_id': case_id,
        # Document analysis for result screen (only if file was uploaded)
        'document_analysis': {
            'is_relevant': relevance_result['is_relevant'] if relevance_result else False,
            'relevance_score': relevance_result['relevance_score'] if relevance_result else 0,
            'relevance_reason': relevance_result.get('relevance_reason', '') if relevance_result else '',
            'document_type': relevance_result.get('document_type', 'unknown') if relevance_result else 'none',
            'document_summary': document_analysis.get('summary', ''),
            'key_points': document_analysis.get('key_points', []),
            'focus_excerpt': relevance_result.get('focus_excerpt', '') if relevance_result else '',
            'statement': relevance_result.get('statement', '') if relevance_result else '',
            'directions': relevance_result.get('directions', []) if relevance_result else []
        } if (file and file.filename) else None
    }
    
    logger.info("Eligibility submission complete")
    return JSONResponse({'status': 'ok', 'data': result})


@app.post('/admin/cases/{case_id}/documents/request')
async def admin_request_document(
    case_id: str,
    payload: Dict[str, Any] = Body(...),
    user = Depends(require_admin)
):
    """
    Admin endpoint to request documents from a client for a specific case.
    
    Request body:
    {
        "name": "Document name",
        "reason": "Reason for requesting this document",
        "source": "Where the document should come from",
        "required": true
    }
    
    Returns the updated documents_requested_list array.
    """
    try:
        from .supabase_client import get_case, update_case
        
        # Verify case exists
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        
        # Get current call_summary
        call_summary = case.get('call_summary', {})
        
        # Parse call_summary if it's a string (JSON)
        if isinstance(call_summary, str):
            try:
                call_summary = json.loads(call_summary)
            except json.JSONDecodeError:
                call_summary = {}
        
        # Ensure call_summary is a dict
        if not isinstance(call_summary, dict):
            call_summary = {}
        
        # Ensure documents_requested_list exists
        if 'documents_requested_list' not in call_summary:
            call_summary['documents_requested_list'] = []
        
        # Create document request object
        document_request = {
            'id': str(uuid.uuid4()),
            'name': payload.get('name', ''),
            'reason': payload.get('reason', ''),
            'source': payload.get('source', ''),
            'required': payload.get('required', True),
            'requested_at': datetime.utcnow().isoformat(),
            'status': 'pending',
            'uploaded': False
        }
        
        # Add to documents_requested_list
        call_summary['documents_requested_list'].append(document_request)
        
        # Update case with new call_summary
        update_case(case_id, {'call_summary': call_summary})
        
        logger.info(f"Added document request to case {case_id}: {document_request['name']}")
        
        return JSONResponse({
            'status': 'ok',
            'document': document_request,
            'documents': call_summary.get('documents_requested_list', [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_request_document failed for case_id={case_id}')
        raise HTTPException(status_code=500, detail='admin_request_document_failed')


@app.get('/admin/cases/{case_id}/documents/requested')
async def admin_get_requested_documents(
    case_id: str,
    user = Depends(require_admin)
):
    """
    Admin endpoint to get list of requested documents for a case.
    
    Returns:
    {
        "status": "ok",
        "documents": [
            {
                "id": "uuid",
                "name": "Document name",
                "reason": "Reason for request",
                "source": "Where to get it",
                "required": true,
                "requested_at": "2024-01-01T00:00:00",
                "status": "pending" | "received",
                "uploaded": false
            }
        ]
    }
    """
    try:
        from .supabase_client import get_case
        
        # Verify case exists
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        
        # Get call_summary
        call_summary = case.get('call_summary', {})
        
        # Parse call_summary if it's a string (JSON)
        if isinstance(call_summary, str):
            try:
                call_summary = json.loads(call_summary)
            except json.JSONDecodeError:
                call_summary = {}
        
        # Extract documents_requested_list
        documents = call_summary.get('documents_requested_list', [])
        
        logger.info(f"Retrieved {len(documents)} requested documents for case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'documents': documents
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_get_requested_documents failed for case_id={case_id}')
        raise HTTPException(status_code=500, detail='admin_get_requested_documents_failed')


@app.patch('/admin/cases/{case_id}/documents/requested/{document_id}')
async def admin_update_requested_document(
    case_id: str,
    document_id: str,
    payload: Dict[str, Any] = Body(...),
    user = Depends(require_admin)
):
    """
    Admin endpoint to update a requested document's status (mark as received, etc).
    
    Request body can contain:
    {
        "status": "received" | "pending",
        "uploaded": true | false,
        "notes": "Optional notes about the document"
    }
    """
    try:
        from .supabase_client import get_case, update_case
        
        # Verify case exists
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        
        # Get call_summary
        call_summary = case.get('call_summary', {})
        
        # Parse call_summary if it's a string (JSON)
        if isinstance(call_summary, str):
            try:
                call_summary = json.loads(call_summary)
            except json.JSONDecodeError:
                call_summary = {}
        
        # Find and update the document
        documents = call_summary.get('documents_requested_list', [])
        document_found = False
        
        for doc in documents:
            if doc.get('id') == document_id:
                # Update fields
                if 'status' in payload:
                    doc['status'] = payload['status']
                if 'uploaded' in payload:
                    doc['uploaded'] = payload['uploaded']
                if 'notes' in payload:
                    doc['notes'] = payload['notes']
                
                doc['updated_at'] = datetime.utcnow().isoformat()
                document_found = True
                break
        
        if not document_found:
            raise HTTPException(status_code=404, detail='document_request_not_found')
        
        # Update case with modified call_summary
        update_case(case_id, {'call_summary': call_summary})
        
        logger.info(f"Updated document request {document_id} in case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'document': next((d for d in documents if d.get('id') == document_id), None),
            'documents': documents
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_update_requested_document failed')
        raise HTTPException(status_code=500, detail='admin_update_requested_document_failed')


@app.delete('/admin/cases/{case_id}/documents/requested/{document_id}')
async def admin_delete_requested_document(
    case_id: str,
    document_id: str,
    user = Depends(require_admin)
):
    """
    Admin endpoint to delete a requested document from the request list.
    """
    try:
        from .supabase_client import get_case, update_case
        
        # Verify case exists
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        
        # Get call_summary
        call_summary = case.get('call_summary', {})
        
        # Parse call_summary if it's a string (JSON)
        if isinstance(call_summary, str):
            try:
                call_summary = json.loads(call_summary)
            except json.JSONDecodeError:
                call_summary = {}
        
        # Find and remove the document
        documents = call_summary.get('documents_requested_list', [])
        initial_count = len(documents)
        
        documents = [d for d in documents if d.get('id') != document_id]
        
        if len(documents) == initial_count:
            raise HTTPException(status_code=404, detail='document_request_not_found')
        
        call_summary['documents_requested_list'] = documents
        
        # Update case with modified call_summary
        update_case(case_id, {'call_summary': call_summary})
        
        logger.info(f"Deleted document request {document_id} from case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'documents': documents
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_delete_requested_document failed')
        raise HTTPException(status_code=500, detail='admin_delete_requested_document_failed')


@app.put('/admin/cases/{case_id}/documents/update-all')
async def admin_update_all_documents(
    case_id: str,
    payload: Dict[str, Any] = Body(...),
    user = Depends(require_admin)
):
    """
    Admin endpoint to update all requested documents for a case.
    
    Request body:
    {
        "documents": [
            {
                "id": "uuid or empty for new",
                "name": "Document name",
                "reason": "Reason for requesting",
                "source": "Where to get it",
                "required": true
            }
        ]
    }
    """
    try:
        from .supabase_client import get_case, update_case
        
        # Verify case exists
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        
        # Get current call_summary
        call_summary = case.get('call_summary', {})
        
        # Parse call_summary if it's a string (JSON)
        if isinstance(call_summary, str):
            try:
                call_summary = json.loads(call_summary)
            except json.JSONDecodeError:
                call_summary = {}
        
        # Ensure call_summary is a dict
        if not isinstance(call_summary, dict):
            call_summary = {}
        
        # Process documents
        documents = payload.get('documents', [])
        updated_documents = []
        
        for doc in documents:
            # Keep existing ID or generate new one
            doc_id = doc.get('id', str(uuid.uuid4()))
            
            # Build document object
            updated_doc = {
                'id': doc_id,
                'name': doc.get('name', ''),
                'reason': doc.get('reason', ''),
                'source': doc.get('source', ''),
                'required': doc.get('required', True),
                'status': doc.get('status', 'pending'),
                'uploaded': doc.get('uploaded', False)
            }
            
            # Keep requested_at if document already exists, otherwise set current time
            existing_docs = call_summary.get('documents_requested_list', [])
            existing_doc = next((d for d in existing_docs if d.get('id') == doc_id), None)
            if existing_doc:
                updated_doc['requested_at'] = existing_doc.get('requested_at', datetime.utcnow().isoformat())
            else:
                updated_doc['requested_at'] = datetime.utcnow().isoformat()
            
            updated_documents.append(updated_doc)
        
        # Update call_summary with new documents list
        call_summary['documents_requested_list'] = updated_documents
        
        # Update case
        update_case(case_id, {'call_summary': call_summary})
        
        logger.info(f"Updated {len(updated_documents)} documents for case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'documents': updated_documents
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_update_all_documents failed for case_id={case_id}')
        raise HTTPException(status_code=500, detail='admin_update_all_documents_failed')


@app.get('/admin/cases/{case_id}/uploaded-documents')
async def admin_get_uploaded_documents(
    case_id: str,
    user = Depends(require_admin)
):
    """
    Admin endpoint to get list of actual uploaded documents for a case from case_documents table.
    
    Returns:
    {
        "status": "ok",
        "documents": [
            {
                "id": "uuid",
                "file_name": "filename.pdf",
                "file_type": "application/pdf",
                "file_size": 1024,
                "document_type": "medical_report",
                "file_path": "cases/...",
                "file_url": "https://...",
                "metadata": {...},
                "uploaded_at": "2024-01-01T00:00:00",
                "created_at": "2024-01-01T00:00:00"
            }
        ]
    }
    """
    try:
        from .supabase_client import _supabase_admin, SUPABASE_URL
        
        if not _supabase_admin:
            raise HTTPException(status_code=500, detail='database_not_available')
        
        # Fetch all documents for this case
        result = _supabase_admin.table('case_documents').select('*').eq('case_id', case_id).execute()
        
        if not result or not result.data:
            return JSONResponse({
                'status': 'ok',
                'documents': []
            })
        
        documents = result.data
        
        # Construct file URLs and enrich response
        enriched_documents = []
        for doc in documents:
            file_url = None
            if doc.get('file_path'):
                # Construct Supabase Storage URL
                file_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/cases/{doc['file_path']}"
            
            enriched_documents.append({
                'id': doc.get('id'),
                'file_name': doc.get('file_name'),
                'file_type': doc.get('file_type'),
                'file_size': doc.get('file_size'),
                'document_type': doc.get('document_type'),
                'file_path': doc.get('file_path'),
                'file_url': file_url,
                'metadata': doc.get('metadata', {}),
                'uploaded_at': doc.get('uploaded_at'),
                'created_at': doc.get('created_at')
            })
        
        logger.info(f"Retrieved {len(enriched_documents)} uploaded documents for case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'documents': enriched_documents
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_get_uploaded_documents failed for case_id={case_id}')
        raise HTTPException(status_code=500, detail='admin_get_uploaded_documents_failed')


@app.delete('/admin/cases/{case_id}/uploaded-documents/{document_id}')
async def admin_delete_uploaded_document(
    case_id: str,
    document_id: str,
    user = Depends(require_admin)
):
    """
    Admin endpoint to delete an uploaded document.
    Deletes from case_documents table and optionally from storage.
    
    Returns:
    {
        "status": "ok",
        "deleted_id": "uuid"
    }
    """
    try:
        from .supabase_client import _supabase_admin, storage_delete_file
        
        if not _supabase_admin:
            raise HTTPException(status_code=500, detail='database_not_available')
        
        # Fetch document to verify it belongs to this case
        result = _supabase_admin.table('case_documents').select('*').eq('id', document_id).eq('case_id', case_id).execute()
        
        if not result or not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail='document_not_found')
        
        doc = result.data[0]
        file_path = doc.get('file_path')
        
        # Delete from storage if file_path exists
        if file_path:
            try:
                storage_delete_file(bucket='cases', path=file_path)
                logger.info(f"Deleted file from storage: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete file from storage: {e}")
                # Continue with database deletion even if storage deletion fails
        
        # Delete from database
        delete_result = _supabase_admin.table('case_documents').delete().eq('id', document_id).execute()
        
        logger.info(f"Deleted document {document_id} from case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'deleted_id': document_id
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'admin_delete_uploaded_document failed')
        raise HTTPException(status_code=500, detail='admin_delete_uploaded_document_failed')


@app.get('/health')
async def health():
    return {'status': 'ok'}


@app.get('/jobs/{job_id}')
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    """
    Poll for job status and results.
    
    Returns:
        - job_id: Job identifier
        - status: 'pending', 'running', 'completed', or 'failed'
        - progress: Progress percentage (0-100)
        - progress_message: Human-readable progress message
        - result: Job result (only when completed)
        - error: Error message (only when failed)
        - timestamps: Created, started, and completed times
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    job_queue = get_job_queue()
    job = job_queue.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    
    # Verify user has access to this job (check metadata user_id)
    job_user_id = job.metadata.get('user_id')
    if current_user['role'] != 'admin' and job_user_id and job_user_id != current_user['id']:
        raise HTTPException(status_code=403, detail='Access denied')
    
    return JSONResponse(job.to_dict())


@app.get('/jobs')
async def list_jobs(current_user: dict = Depends(get_current_user)):
    """
    List all jobs for the current user.
    Admins can see all jobs.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    job_queue = get_job_queue()
    
    # Filter jobs based on user permissions
    user_jobs = []
    for job in job_queue.jobs.values():
        job_user_id = job.metadata.get('user_id')
        
        # Include job if user is admin or job belongs to user
        if current_user['role'] == 'admin' or (job_user_id and job_user_id == current_user['id']):
            user_jobs.append(job.to_dict())
    
    return JSONResponse({
        'jobs': user_jobs,
        'count': len(user_jobs)
    })


def _link_eligibility_documents_to_case(user_id: str, case_id: str):
    """
    Helper function to find any user_eligibility records for this user that have 
    uploaded files but no case_id, and upload those files to Supabase Storage 
    organized by the case_id, then insert records to case_documents table.
    
    This handles the anonymous user scenario where documents are uploaded 
    before signup/case creation.
    """
    from datetime import datetime
    from .supabase_client import storage_upload_file, insert_case_document
    
    try:
        # Find eligibility records with uploaded files but no case_id
        eligibilities = get_user_eligibilities(user_id=user_id)
        
        for elig in eligibilities:
            uploaded_file_path = elig.get('uploaded_file')
            elig_case_id = elig.get('case_id')
            
            # Skip if no file or already linked to a case
            if not uploaded_file_path or elig_case_id:
                continue
            
            # Check if file exists locally
            if not os.path.exists(uploaded_file_path):
                logger.warning(f"Eligibility file not found: {uploaded_file_path}")
                continue
            
            try:
                # Read the local file
                with open(uploaded_file_path, 'rb') as f:
                    content = f.read()
                
                filesize = len(content)
                file_ext = Path(uploaded_file_path).suffix or '.pdf'
                original_filename = Path(uploaded_file_path).name
                
                # Upload to Supabase Storage
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                storage_path = f"cases/{case_id}/documents/{timestamp}_eligibility_document{file_ext}"
                
                upload_result = storage_upload_file(
                    bucket='case-documents',
                    path=storage_path,
                    file_bytes=content,
                    content_type='application/octet-stream',
                    upsert=True
                )
                storage_url = upload_result.get('public_url')
                logger.info(f"Linked eligibility document to case: {storage_url}")
                
                # Insert document record
                insert_case_document(
                    case_id=case_id,
                    file_path=storage_path,
                    file_name=original_filename,
                    file_type='application/pdf',
                    file_size=filesize,
                    document_type='eligibility_document',
                    uploaded_by=user_id,
                    metadata={'source': 'anonymous_eligibility_check', 'linked_at_signup': True}
                )
                
                logger.info(f"Successfully linked eligibility document for user {user_id} to case {case_id}")
                
                # Optionally delete the local temp file after successful upload
                try:
                    os.remove(uploaded_file_path)
                    logger.debug(f"Deleted temp file: {uploaded_file_path}")
                except Exception:
                    pass
                    
            except Exception:
                logger.exception(f"Failed to upload eligibility file {uploaded_file_path} to case {case_id}")
                continue
                
    except Exception:
        logger.exception(f"Failed to link eligibility documents for user {user_id}")
        raise


@app.post('/user/register')
async def user_register(payload: Dict[str, Any] = Body(...)):
    """Register user: create auth user, insert profile and generate OTP for email verification.
    Expects JSON: {name, email, password, phone, identity_code}
    """
    required = ['name', 'email', 'password']
    for k in required:
        if k not in payload:
            raise HTTPException(status_code=400, detail=f'missing_{k}')

    name = payload.get('name')
    email = payload.get('email')
    password = payload.get('password')
    phone = payload.get('phone')
    identity_code = payload.get('identity_code')

    logger.info(f"Starting registration for email={email}")

    try:
        auth_res = create_auth_user(email=email, password=password, phone=phone)
        user_id = auth_res.get('id') or auth_res.get('user', {}).get('id') or auth_res.get('aud')
    except Exception as e:
        logger.exception('Auth user creation failed')
        raise HTTPException(status_code=500, detail=f'auth_create_failed: {str(e)}')

    # Check whether we require email verification for signup.
    require_verification = os.environ.get('REQUIRE_EMAIL_VERIFICATION', '0') == '1'

    # include eligibility payload if present (from frontend test-skip or real flow)
    eligibility_payload = payload.get('eligibility')
    try:
        if require_verification:
            # generate OTP
            otp = f"{secrets.randbelow(1000000):06d}"
            otp_expires = datetime.utcnow() + timedelta(minutes=10)

            try:
                profile_res = insert_user_profile(
                    user_id=str(user_id),
                    name=name,
                    email=email,
                    phone=phone,
                    identity_code=identity_code or '',
                    otp=otp,
                    otp_expires_at=otp_expires,
                    eligibility=eligibility_payload,
                    verified=False
                )
            except Exception as e:
                logger.exception(f'insert_user_profile failed during registration: {e}')
                raise HTTPException(status_code=500, detail=f'profile_creation_failed: {str(e)}')
            # Send OTP via email (if SMTP configured)
            try:
                send_otp_email(email, otp)
            except Exception:
                logger.exception('send_otp_email failed; continuing')
            # Create an initial case even when email verification is required so user can resume later
            try:
                case_metadata = {'initial_eligibility': eligibility_payload}
                created_case = create_case(user_id=str(user_id), title=None, description='Initial case created at signup', metadata=case_metadata)
                case_id = None
                if isinstance(created_case, list) and len(created_case) > 0:
                    case_id = created_case[0].get('id')
                elif isinstance(created_case, dict):
                    case_id = created_case.get('id')
                try:
                    if case_id:
                        insert_user_eligibility(user_id=str(user_id), uploaded_file=None, eligibility=eligibility_payload, case_id=case_id)
                except Exception:
                    logger.exception('Failed to insert initial eligibility linked to created case (non-fatal)')
                
                # Link any existing eligibility documents uploaded before signup (anonymous scenario)
                if case_id:
                    try:
                        _link_eligibility_documents_to_case(user_id=str(user_id), case_id=case_id)
                    except Exception:
                        logger.exception('Failed to link pre-signup documents to case (non-fatal)')
            except Exception:
                logger.exception('Failed to create initial case during signup (non-fatal)')
            # Response: do not include OTP in production responses. Include only in DEBUG.
            response = {'status': 'ok', 'user_id': user_id}
            if os.environ.get('LOG_LEVEL', '').upper() == 'DEBUG':
                response['debug_otp'] = otp
        else:
            # No email verification required: insert profile and mark verified immediately
            try:
                profile_res = insert_user_profile(
                    user_id=str(user_id),
                    name=name,
                    email=email,
                    phone=phone,
                    identity_code=identity_code or '',
                    otp=None,
                    otp_expires_at=None,
                    eligibility=eligibility_payload,
                    verified=True
                )
            except Exception as e:
                logger.exception(f'insert_user_profile failed during registration: {e}')
                raise HTTPException(status_code=500, detail=f'profile_creation_failed: {str(e)}')
            # Create an initial case for this user to track the signup/eligibility flow
            try:
                case_metadata = {'initial_eligibility': eligibility_payload}
                created_case = create_case(user_id=str(user_id), title=None, description='Initial case created at signup', metadata=case_metadata)
                # If the insert_user_eligibility function exists, link the eligibility audit to the created case
                case_id = None
                if isinstance(created_case, list) and len(created_case) > 0:
                    case_id = created_case[0].get('id')
                elif isinstance(created_case, dict):
                    # create_case may return the created row or a list depending on PostgREST
                    case_id = created_case.get('id') or (created_case[0].get('id') if isinstance(created_case, list) and len(created_case) > 0 else None)

                try:
                    if case_id:
                        insert_user_eligibility(user_id=str(user_id), uploaded_file=None, eligibility=eligibility_payload, case_id=case_id)
                except Exception:
                    logger.exception('Failed to insert initial eligibility linked to created case (non-fatal)')
                
                # Link any existing eligibility documents uploaded before signup (anonymous scenario)
                if case_id:
                    try:
                        _link_eligibility_documents_to_case(user_id=str(user_id), case_id=case_id)
                    except Exception:
                        logger.exception('Failed to link pre-signup documents to case (non-fatal)')

            except Exception:
                logger.exception('Failed to create initial case during signup (non-fatal)')

            response = {'status': 'ok', 'user_id': user_id}

        logger.debug(f"insert_user_profile returned: {profile_res}")
    except Exception as e:
        logger.exception('Failed to insert user profile')
        raise HTTPException(status_code=500, detail=f'profile_create_failed: {str(e)}')

    logger.info(f"Registration created for email={email}; user_id={user_id}")
    return JSONResponse(response)



@app.post('/user/login')
async def user_login(payload: Dict[str, Any] = Body(...), response: Response = None):
    """Authenticate user and return access token and user info. Expects {email, password}"""
    email = payload.get('email')
    password = payload.get('password')
    if not email or not password:
        raise HTTPException(status_code=400, detail='missing_email_or_password')
    try:
        res = sign_in(email=email, password=password)
        # Normalize possible return shapes (supabase-py vs token endpoint)
        access_token = None
        refresh_token = None
        expires_in = None
        user_obj = None

        if isinstance(res, dict):
            # Shape A: top-level tokens + user
            if res.get('access_token'):
                access_token = res.get('access_token')
                refresh_token = res.get('refresh_token')
                expires_in = res.get('expires_in')
                user_obj = res.get('user') or res.get('data')

            # Shape B: supabase-py SDK shape: {'data': {'session': {...}, 'user': {...}}, 'error': ...}
            elif res.get('data') and isinstance(res.get('data'), dict):
                data = res.get('data')
                session = data.get('session') or {}
                access_token = session.get('access_token') or data.get('access_token')
                refresh_token = session.get('refresh_token') or data.get('refresh_token')
                expires_in = session.get('expires_in') or data.get('expires_in')
                user_obj = data.get('user') or data.get('user_metadata') or session.get('user')

            # Shape C: sometimes lib returns {'user': {...}, ...}
            elif res.get('user'):
                user_obj = res.get('user')
                access_token = res.get('access_token') or res.get('token')
                refresh_token = res.get('refresh_token')

        # sanitize user object (convert datetimes and objects to JSON-friendly types)
        def _sanitize(obj):
            from datetime import datetime, date
            if obj is None:
                return None
            # primitives
            if isinstance(obj, (str, int, float, bool)):
                return obj
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            if isinstance(obj, dict):
                return {k: _sanitize(v) for k, v in obj.items()}
            if isinstance(obj, (list, tuple)):
                return [_sanitize(v) for v in obj]
            # obj may be a supabase sdk object with attributes
            try:
                d = obj.__dict__
            except Exception:
                d = None
            if d:
                return {k: _sanitize(v) for k, v in d.items()}
            # fallback to string
            try:
                return str(obj)
            except Exception:
                return None

        sanitized_user = _sanitize(user_obj)

        # If we have an access token, set HttpOnly cookies (server-side session)
        if access_token:
            cookie_secure = os.environ.get('COOKIE_SECURE', '0') == '1' or os.environ.get('ENV', '').lower() == 'production'
            # 30 days default for access cookie
            max_age_access = int(os.environ.get('ACCESS_TOKEN_MAX_AGE', 60 * 60 * 24 * 30))
            max_age_refresh = int(os.environ.get('REFRESH_TOKEN_MAX_AGE', 60 * 60 * 24 * 60))
            # set cookies on the Response passed in (FastAPI injects it)
            if response is not None:
                response.set_cookie('sb_access_token', access_token, httponly=True, secure=cookie_secure, samesite='lax', max_age=max_age_access, path='/')
                if refresh_token:
                    response.set_cookie('sb_refresh_token', refresh_token, httponly=True, secure=cookie_secure, samesite='lax', max_age=max_age_refresh, path='/')

        data_out = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': expires_in,
            'user': sanitized_user
        }

        return JSONResponse({'status': 'ok', 'data': data_out})
    except ValueError as ve:
        # Expected/auth-related errors from supabase-py normalized as ValueError
        logger.warning(f'Login failed for {email}: {str(ve)}')
        # Map some common messages to friendly error codes
        msg = str(ve).lower()
        if 'invalid' in msg or 'credentials' in msg:
            raise HTTPException(status_code=401, detail='invalid_credentials')
        if 'confirm' in msg or 'confirmed' in msg or 'email' in msg and 'confirm' in msg:
            raise HTTPException(status_code=403, detail='email_not_confirmed')
        raise HTTPException(status_code=401, detail=f'login_failed: {str(ve)}')
    except Exception as e:
        logger.exception('Login failed')
        raise HTTPException(status_code=401, detail='login_failed')


@app.post('/signup-with-case')
async def signup_with_case(payload: Dict[str, Any] = Body(...)):
    """Signup and create case in one step.
    Creates user account, profile, and a case automatically.
    Expects: {email, password, name?, phone?}
    Returns: {status, user_id, case_id, access_token}
    """
    email = payload.get('email')
    password = payload.get('password')
    name = payload.get('name') or email.split('@')[0]
    phone = payload.get('phone')

    if not email or not password:
        raise HTTPException(status_code=400, detail='missing_email_or_password')

    logger.info(f"Starting signup-with-case for email={email}")

    try:
        # Create auth user
        auth_res = create_auth_user(email=email, password=password, phone=phone)
        user_id = auth_res.get('id') or auth_res.get('user', {}).get('id') or auth_res.get('aud')
        if not user_id:
            raise Exception('Failed to extract user_id from auth response')
    except Exception as e:
        logger.exception('Auth user creation failed')
        raise HTTPException(status_code=400, detail=f'auth_create_failed: {str(e)}')

    try:
        # Create user profile (marked as verified immediately - no email verification)
        profile_res = insert_user_profile(
            user_id=str(user_id),
            name=name,
            email=email,
            phone=phone or '',
            identity_code='',
            otp=None,
            otp_expires_at=None,
            eligibility=None,
            verified=True
        )
        logger.info(f"Created profile for user {user_id}")
    except Exception as e:
        logger.exception(f'insert_user_profile failed: {e}')
        raise HTTPException(status_code=400, detail=f'profile_creation_failed: {str(e)}')

    # Create initial case
    case_id = None
    try:
        case_metadata = {}
        created_case = create_case(
            user_id=str(user_id),
            title=None,
            description='Initial case created at signup',
            metadata=case_metadata
        )
        
        # Extract case_id from response (can be list or dict)
        if isinstance(created_case, list) and len(created_case) > 0:
            case_id = created_case[0].get('id')
        elif isinstance(created_case, dict):
            case_id = created_case.get('id')
        
        logger.info(f"Created case {case_id} for user {user_id}")
    except Exception as e:
        logger.exception('Failed to create case (non-fatal)')
        # Don't fail signup if case creation fails - case_id will be None

    # Generate access token by signing in
    try:
        login_res = sign_in(email=email, password=password)
        
        # Extract access token
        access_token = None
        if isinstance(login_res, dict):
            if login_res.get('access_token'):
                access_token = login_res.get('access_token')
            elif login_res.get('data') and isinstance(login_res.get('data'), dict):
                session = login_res['data'].get('session') or {}
                access_token = session.get('access_token') or login_res['data'].get('access_token')
            elif login_res.get('user'):
                access_token = login_res.get('access_token') or login_res.get('token')
        
        logger.info(f"Successfully logged in user {user_id} after signup")
    except Exception as e:
        logger.exception('Failed to generate access token after signup')
        access_token = None

    response_data = {
        'status': 'ok',
        'user_id': str(user_id),
        'case_id': case_id or '',
        'access_token': access_token,
        'email': email
    }

    logger.info(f"Signup-with-case completed for {email}: user_id={user_id}, case_id={case_id}")
    return JSONResponse(response_data)


@app.post('/user/logout')
async def user_logout(token: Dict[str, Any] = Body(...), response: Response = None):
    """Logout by revoking the provided access token. Expects {access_token}"""
    access_token = token.get('access_token')
    if not access_token:
        raise HTTPException(status_code=400, detail='missing_access_token')
    try:
        logout_token(access_token)
        # clear cookies if present
        if response is not None:
            response.delete_cookie('sb_access_token', path='/')
            response.delete_cookie('sb_refresh_token', path='/')
        return JSONResponse({'status': 'ok'})
    except Exception as e:
        logger.exception('Logout failed')
        raise HTTPException(status_code=500, detail=f'logout_failed: {str(e)}')


@app.post('/user/reset-password')
async def user_reset_password(payload: Dict[str, Any] = Body(...)):
    """Trigger a password reset email via Supabase. Expects {email}."""
    email = payload.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='missing_email')
    try:
        send_password_reset(email)
        return JSONResponse({'status': 'ok'})
    except Exception as e:
        logger.exception('Password reset failed')
        raise HTTPException(status_code=500, detail=f'reset_failed: {str(e)}')


def _get_user_from_request_auth(authorization_header: str):
    if not authorization_header:
        raise HTTPException(status_code=401, detail='missing_authorization')
    parts = authorization_header.split(' ')
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        raise HTTPException(status_code=401, detail='invalid_authorization')
    token = parts[1]
    try:
        # Decode JWT token directly without Supabase validation
        import base64
        import json as json_module
        token_parts = token.split('.')
        if len(token_parts) != 3:
            raise HTTPException(status_code=401, detail='invalid_token_format')
        
        # Decode payload (add padding if needed)
        payload_b64 = token_parts[1]
        payload_b64 += '=' * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload_obj = json_module.loads(payload_json)
        
        # Extract user info from JWT claims
        user_id = payload_obj.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail='invalid_token_claims')
        
        # Return user dict compatible with existing code
        user = {
            'id': user_id,
            'email': payload_obj.get('email', ''),
            'user_metadata': payload_obj.get('user_metadata', {}),
            'app_metadata': payload_obj.get('app_metadata', {})
        }
        return user, token
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to decode JWT token: {e}")
        raise HTTPException(status_code=401, detail='invalid_token')


@app.post('/user/onboarding/save')
async def save_onboarding(payload: Dict[str, Any] = Body(...), authorization: str = None):
    """Save onboarding progress for the authenticated user. Expects JSON body containing onboarding_state."""
    onboarding_state = payload.get('onboarding_state')
    if onboarding_state is None:
        raise HTTPException(status_code=400, detail='missing_onboarding_state')
    # get user from Authorization header (expect access_token in payload for compatibility)
    access_token = payload.get('access_token')
    if not access_token:
        raise HTTPException(status_code=401, detail='missing_access_token')
    # normalize into 'Bearer <token>' format for helper
    auth_header = f'Bearer {access_token}'
    user, token = _get_user_from_request_auth(auth_header)
    user_id = user.get('id')
    try:
        update_onboarding_state(user_id=user_id, onboarding_state=onboarding_state)
        return JSONResponse({'status': 'ok'})
    except Exception as e:
        logger.exception('Failed to save onboarding')
        raise HTTPException(status_code=500, detail=f'save_failed: {str(e)}')


@app.get('/user/onboarding/load')
async def load_onboarding(request: Request):
    """Load onboarding progress for the authenticated user. Expect Authorization: Bearer <access_token> header."""
    # Extract Authorization header from request environment
    from fastapi import Request
    from fastapi import Depends
    # The simple approach: read raw headers from starlette request via dependency injection
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        if not auth:
            raise HTTPException(status_code=401, detail='missing_authorization')
        try:
            user = get_user_from_token(auth.split(' ', 1)[1])
        except Exception:
            raise HTTPException(status_code=401, detail='invalid_token')
        profiles = get_profile_by_user_id(user.get('id'))
        if not profiles:
            return JSONResponse({'status': 'ok', 'onboarding_state': None})
        profile = profiles[0]
        return JSONResponse({'status': 'ok', 'onboarding_state': profile.get('onboarding_state')})
    return await _inner(request)


@app.get('/user/profile')
async def user_profile(request: Request):
    """Return the authenticated user's Supabase auth user and profile row."""
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        if not auth:
            raise HTTPException(status_code=401, detail='missing_authorization')
        try:
            token = auth.split(' ', 1)[1]
            user = get_user_from_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail='invalid_token')
        # fetch profile row
        profiles = get_profile_by_user_id(user.get('id'))
        profile = profiles[0] if profiles else None
        return JSONResponse({'status': 'ok', 'user': user, 'profile': profile})
    return await _inner(request)


@app.get('/user-eligibility')
async def get_user_eligibility_records(request: Request):
    """Return the authenticated user's eligibility records from user_eligibility table."""
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        if not auth:
            raise HTTPException(status_code=401, detail='missing_authorization')
        try:
            token = auth.split(' ', 1)[1]
            user = get_user_from_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail='invalid_token')
        
        user_id = user.get('id')
        from .supabase_client import get_user_eligibility
        eligibility_records = get_user_eligibility(user_id=user_id)
        
        return JSONResponse(eligibility_records or [])
    return await _inner(request)


@app.patch('/user/profile')
async def patch_user_profile(payload: Dict[str, Any] = Body(...), request: Request = None):
    """Allow authenticated user to patch their own profile fields.
    Accepts JSON body with fields to patch on user_profile (e.g., full_name, email, admin_settings).
    Uses the service role to perform the update for consistency.
    """
    from fastapi import Request
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        if not auth:
            raise HTTPException(status_code=401, detail='missing_authorization')
        user, token = _get_user_from_request_auth(auth)
        user_id = user.get('id')
        try:
            # Use admin_upsert_profile helper to upsert profile row by user_id
            from .supabase_client import admin_upsert_profile
            res = admin_upsert_profile(user_id=str(user_id), fields=payload)
            return JSONResponse({'status': 'ok', 'profile': res})
        except Exception as e:
            logger.exception('patch_user_profile failed')
            error_detail = str(e)
            if '409' in error_detail or 'Conflict' in error_detail:
                raise HTTPException(status_code=409, detail='profile_conflict_error')
            raise HTTPException(status_code=500, detail='profile_update_failed')
    return await _inner(request)


@app.post('/user/change-password')
async def change_password(payload: Dict[str, Any] = Body(...), authorization: Optional[str] = Header(None)):
    """Change password for authenticated user without requiring the current password.
    Expects JSON: { new_password }
    Uses the Supabase Admin API (service role key) to update the auth user's password.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail='missing_authorization')
    try:
        user, token = _get_user_from_request_auth(authorization)
    except HTTPException:
        raise

    new_password = payload.get('new_password')
    if not new_password:
        raise HTTPException(status_code=400, detail='missing_new_password')

    try:
        # Use Supabase admin GoTrue endpoint to update the user's password by id
        from .supabase_client import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        import requests

        user_id = user.get('id')
        if not user_id:
            raise HTTPException(status_code=400, detail='user_id_missing')

        admin_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{user_id}"
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        }
        # Some GoTrue/Supabase deployments expect PUT for admin user updates.
        resp = requests.put(admin_url, headers=headers, json={'password': new_password}, timeout=10)
        if resp.status_code >= 400:
            try:
                body = resp.json()
            except Exception:
                body = {'text': resp.text}
            logger.warning('Admin password update failed: status=%s body=%s text=%s', resp.status_code, body, resp.text)
            # If method not allowed, attempt PATCH as a fallback for older deployments
            if resp.status_code == 405:
                try:
                    resp2 = requests.patch(admin_url, headers=headers, json={'password': new_password}, timeout=10)
                    if resp2.status_code < 400:
                        return JSONResponse({'status': 'ok'})
                    logger.warning('Fallback PATCH also failed: status=%s text=%s', resp2.status_code, resp2.text)
                except Exception:
                    logger.exception('Fallback PATCH attempt failed')
            raise HTTPException(status_code=500, detail='password_update_failed')

        return JSONResponse({'status': 'ok'})
    except HTTPException:
        raise
    except Exception:
        logger.exception('Failed to update password via admin API')
        raise HTTPException(status_code=500, detail='password_update_failed')



@app.post('/user/profile/photo')
async def upload_profile_photo(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    """Upload a profile photo for the authenticated user and update their profile.photo_url.
    Returns the updated profile representation.
    """
    # auth required
    if not authorization:
        raise HTTPException(status_code=401, detail='missing_authorization')
    try:
        user, token = _get_user_from_request_auth(authorization)
    except HTTPException:
        raise
    user_id = user.get('id')

    # Read file content
    try:
        content = await file.read()
    except Exception:
        logger.exception('Failed to read uploaded profile photo')
        raise HTTPException(status_code=500, detail='failed_to_read_file')

    # Attempt to upload to Supabase Storage (service role) and fallback to local save
    photo_url = None
    try:
        # import a lightweight uploader to avoid circular imports if present
        from . import supabase_client
        bucket = os.environ.get('SUPABASE_STORAGE_BUCKET', 'public')
        # generate path: profiles/<user_id>/<uuid>.<ext>
        ext = Path(file.filename).suffix or '.png'
        object_path = f"profiles/{user_id}/{uuid.uuid4().hex}{ext}"
        # call storage_upload_file if available
        upload_fn = getattr(supabase_client, 'storage_upload_file', None)
        if callable(upload_fn):
            try:
                res = upload_fn(bucket=bucket, path=object_path, file_bytes=content, content_type=(file.content_type or 'application/octet-stream'))
                # res expected to contain 'public_url'
                photo_url = res.get('public_url') if isinstance(res, dict) else None
            except RuntimeError as re:
                # Clear guidance when bucket is missing
                if str(re) == 'bucket_not_found':
                    logger.error('Supabase storage bucket not found: %s. Create the bucket or set SUPABASE_STORAGE_BUCKET correctly.', bucket)
                raise
    except Exception:
        logger.exception('Supabase Storage upload failed; will fall back to local save')

    # Fallback to saving locally if upload did not produce a public URL
    if not photo_url:
        try:
            file_ext = Path(file.filename).suffix or '.png'
            uid = uuid.uuid4().hex
            saved_name = f"{uid}{file_ext}"
            saved_path = os.path.join(UPLOADS_DIR, saved_name)
            with open(saved_path, 'wb') as f:
                f.write(content)
            # Local path as fallback (not public), consider serving or using a proxy
            photo_url = saved_path
        except Exception:
            logger.exception('Failed to save uploaded profile photo (fallback)')
            raise HTTPException(status_code=500, detail='failed_to_save_file')

    # update profile with the URL (public storage URL or local path)
    try:
        from .supabase_client import admin_update_profile, admin_upsert_profile
        # Prefer PATCH update by user_id to avoid insert conflicts; if no row exists, fall back to upsert
        res = None
        try:
            res = admin_update_profile(user_id=str(user_id), fields={'photo_url': photo_url})
            # Some PostgREST shapes return an empty list or [] when nothing updated
            if not res:
                res = admin_upsert_profile(user_id=str(user_id), fields={'photo_url': photo_url})
        except Exception:
            # Upsert as a safe fallback
            res = admin_upsert_profile(user_id=str(user_id), fields={'photo_url': photo_url})
        return JSONResponse({'status': 'ok', 'profile': res})
    except Exception:
        logger.exception('Failed to update profile with photo_url')
        raise HTTPException(status_code=500, detail='profile_update_failed')


@app.get('/cases')
async def list_cases(request: Request):
    """Return eligibility audit rows (cases) for the authenticated user."""
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        user, token = _get_user_from_request_auth(auth)
        user_id = user.get('id')
        logger.info(f'list_cases: user_id={user_id}, auth_header_present={bool(auth)}')
        try:
            # Prefer direct supabase-py admin client usage when available
            rows = None
            if _has_supabase_py and _supabase_admin is not None:
                try:
                    logger.debug('Listing cases using direct supabase-py admin client')
                    res = _supabase_admin.table('cases').select('*').eq('user_id', user_id).execute()
                    if isinstance(res, dict) and 'data' in res:
                        rows = res['data']
                    else:
                        rows = res
                except Exception:
                    logger.exception('Direct supabase-py list failed; falling back to helper')
                    rows = None
            if rows is None:
                rows = list_cases_for_user(user_id)
            # Normalize various possible shapes (list, dict with 'data', SDK objects with .data)
            cases_out = None
            try:
                if isinstance(rows, list):
                    cases_out = rows
                elif isinstance(rows, dict) and 'data' in rows:
                    cases_out = rows.get('data')
                elif hasattr(rows, 'data'):
                    cases_out = getattr(rows, 'data')
                else:
                    cases_out = rows
            except Exception:
                cases_out = rows
            
            # Ensure we always return a list
            if not isinstance(cases_out, list):
                cases_out = list(cases_out) if cases_out else []
            
            logger.info(f'list_cases: found {len(cases_out)} cases for user_id={user_id}')
            return JSONResponse({'status': 'ok', 'cases': cases_out})
        except Exception as e:
            logger.exception('Failed to fetch cases')
            raise HTTPException(status_code=500, detail=f'cases_failed: {str(e)}')
    res = await _inner(request)
    # avoid printing to stdout; use logger.debug if needed
    return res

@app.post('/cases')
async def create_case_endpoint(payload: Dict[str, Any] = Body(...), request: Request = None):
    """Create a new case for the authenticated user. Expects JSON {title, description, metadata}, Authorization header required."""
    from fastapi import Request
    # Expect Authorization header via request context; use inner to access headers
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        user, token = _get_user_from_request_auth(auth)
        user_id = user.get('id')
        title = payload.get('title')
        description = payload.get('description')
        metadata = payload.get('metadata')
        try:
            created = create_case(user_id=user_id, title=title, description=description, metadata=metadata)
            # Normalize created shape: prefer a single object (first row) when SDK/PostgREST returns a list
            case_obj = None
            try:
                if isinstance(created, list):
                    case_obj = created[0] if len(created) > 0 else None
                elif isinstance(created, dict) and created.get('data') is not None:
                    # sometimes the SDK returns {'data': [...]}
                    data = created.get('data')
                    if isinstance(data, list):
                        case_obj = data[0] if len(data) > 0 else None
                    else:
                        case_obj = data
                else:
                    case_obj = created
            except Exception:
                case_obj = created

            # Create notification for user when case is created
            try:
                from .supabase_client import create_notification
                case_id = case_obj.get('id') if case_obj else None
                create_notification(
                    user_id=user_id,
                    notification_type='case_created',
                    title='Case Created',
                    message=f'Your case "{title or "Untitled"}" has been created successfully.',
                    data={'case_id': str(case_id)} if case_id else {}
                )
            except Exception:
                logger.exception('Failed to create case_created notification')

            return JSONResponse({'status': 'ok', 'case': case_obj})
        except Exception as e:
            logger.exception('Failed to create case')
            raise HTTPException(status_code=500, detail=f'create_case_failed: {str(e)}')
    # Pass through the actual Request object
    return await _inner(request)


@app.get('/cases/{case_id}')
async def get_case_endpoint(case_id: str, request: Request):
    """Get a single case by id for the authenticated user."""
    from fastapi import Request
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        user, token = _get_user_from_request_auth(auth)
        user_id = user.get('id')
        try:
            rows = get_case(case_id)
            if not rows:
                raise HTTPException(status_code=404, detail='case_not_found')
            case = rows[0]
            if case.get('user_id') != user_id:
                raise HTTPException(status_code=403, detail='forbidden')
            return JSONResponse({'status': 'ok', 'case': case})
        except HTTPException:
            raise
        except Exception as e:
            logger.exception('Failed to fetch case')
            raise HTTPException(status_code=500, detail=f'case_failed: {str(e)}')
    return await _inner(request)


@app.patch('/cases/{case_id}')
async def patch_case_endpoint(case_id: str, payload: Dict[str, Any] = Body(...), request: Request = None):
    """Update case by id. Only owner may update."""
    from fastapi import Request
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        user, token = _get_user_from_request_auth(auth)
        user_id = user.get('id')
        try:
            rows = get_case(case_id)
            if not rows:
                raise HTTPException(status_code=404, detail='case_not_found')
            case = rows[0]
            if case.get('user_id') != user_id:
                raise HTTPException(status_code=403, detail='forbidden')
            updated = update_case(case_id=case_id, fields=payload)
            
            # Notify admins when case status changes to submitted
            try:
                old_status = case.get('status', '').lower()
                new_status = payload.get('status', '').lower()
                if new_status == 'submitted' and old_status != 'submitted':
                    from .supabase_client import create_notification, get_admin_user_ids
                    admin_ids = get_admin_user_ids()
                    case_title = case.get('title') or 'Untitled case'
                    for admin_id in admin_ids:
                        try:
                            create_notification(
                                user_id=admin_id,
                                notification_type='case_submitted',
                                title='Case Submitted',
                                message=f'User has submitted case "{case_title}" for review.',
                                data={'case_id': str(case_id), 'user_id': str(user_id)}
                            )
                        except Exception:
                            logger.exception(f'Failed to notify admin {admin_id}')
            except Exception:
                logger.exception('Failed to create case_submitted notifications')
            
            return JSONResponse({'status': 'ok', 'case': updated})
        except HTTPException:
            raise
        except Exception as e:
            logger.exception('Failed to update case')
            raise HTTPException(status_code=500, detail=f'update_failed: {str(e)}')
    return await _inner(request)


@app.delete('/cases/{case_id}')
async def delete_case_endpoint(case_id: str, request: Request):
    """Delete a case by id. Only owner may delete."""
    from fastapi import Request
    async def _inner(request: Request):
        auth = request.headers.get('authorization')
        if not auth:
            raise HTTPException(status_code=401, detail='missing_authorization')
        try:
            token = auth.split(' ', 1)[1]
            user = get_user_from_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail='invalid_token')
        user_id = user.get('id')
        try:
            rows = get_case(case_id)
            if not rows:
                raise HTTPException(status_code=404, detail='case_not_found')
            case = rows[0]
            if case.get('user_id') != user_id:
                raise HTTPException(status_code=403, detail='forbidden')
            delete_case(case_id)
            return JSONResponse({'status': 'ok'})
        except HTTPException:
            raise
        except Exception as e:
            logger.exception('Failed to delete case')
            raise HTTPException(status_code=500, detail=f'delete_failed: {str(e)}')
    return await _inner(request)

# ===========================
# NOTIFICATION ENDPOINTS
# ===========================

@app.get('/notifications')
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user=Depends(get_current_user)
):
    """Get notifications for the current user."""
    try:
        user_id = current_user.get('id')
        if not user_id:
            raise HTTPException(status_code=401, detail='user_not_authenticated')
        
        notifications = list_notifications(
            user_id=user_id,
            limit=limit,
            unread_only=unread_only
        )
        
        return {'notifications': notifications}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail='failed_to_fetch_notifications')


@app.patch('/notifications/{notification_id}')
async def update_notification(
    notification_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user=Depends(get_current_user)
):
    """Mark a notification as read or unread."""
    try:
        user_id = current_user.get('id')
        if not user_id:
            raise HTTPException(status_code=401, detail='user_not_authenticated')
        
        read = payload.get('read', True)
        
        # Update the notification
        result = mark_notification_read(notification_id=notification_id, read=read)
        
        return {'success': True, 'notification': result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification {notification_id}: {e}")
        raise HTTPException(status_code=500, detail='failed_to_update_notification')


@app.post('/user/verify-email')
async def user_verify_email(payload: Dict[str, Any] = Body(...)):
    """Verify an OTP for the given email. Expects {email, otp}.
    Marks profile verified on success.
    """
    email = payload.get('email')
    otp = payload.get('otp')
    if not email or not otp:
        raise HTTPException(status_code=400, detail='missing_email_or_otp')

    # Dev/testing bypass: allow any OTP when ALLOW_ANY_OTP=1 or when LOG_LEVEL=DEBUG
    allow_any = os.environ.get('ALLOW_ANY_OTP', '0') == '1' or os.environ.get('LOG_LEVEL', '').upper() == 'DEBUG'
    try:
        # Always ensure a Supabase auth user exists for this profile. If registration previously failed
        # to create the auth user, create it now so the account is real (not simulated).
        profiles = get_profile_by_email(email)
        profile = profiles[0] if profiles else None

        if allow_any:
            # mark verified (dev override) but still create auth user if missing
            if profile and not profile.get('user_id'):
                # create auth user with a generated temporary password
                temp_password = secrets.token_urlsafe(16)
                try:
                    auth_res = create_auth_user(email=email, password=temp_password, phone=profile.get('phone'))
                    created_id = auth_res.get('id') or auth_res.get('user', {}).get('id') or auth_res.get('aud')
                    if created_id:
                        update_profile_user_id(email=email, user_id=str(created_id))
                        logger.info(f"Created auth user for {email} during verify (dev override); user_id={created_id}")
                except Exception:
                    logger.exception('Failed to create auth user during dev verify override')

            updated = mark_profile_verified_by_email(email=email)
            logger.info(f"Email verified (dev override) for {email}")
            return JSONResponse({'status': 'ok', 'profile': updated, 'debug_override': True})

        # Normal flow: verify OTP, then ensure auth user exists
        updated = verify_profile_otp(email=email, otp=otp)

        # if profile exists but no user_id (maybe auth creation failed earlier), create it now
        profiles = get_profile_by_email(email)
        profile = profiles[0] if profiles else None
        if profile and not profile.get('user_id'):
            # We don't have the user's password; generate a strong temporary one and create the auth user
            temp_password = secrets.token_urlsafe(16)
            try:
                auth_res = create_auth_user(email=email, password=temp_password, phone=profile.get('phone'))
                created_id = auth_res.get('id') or auth_res.get('user', {}).get('id') or auth_res.get('aud')
                if created_id:
                    update_profile_user_id(email=email, user_id=str(created_id))
                    logger.info(f"Created auth user for {email} during verify; user_id={created_id}")
            except Exception:
                logger.exception('Failed to create auth user during verify')

        logger.info(f"Email verified for {email}")
        return JSONResponse({'status': 'ok', 'profile': updated})
    except ValueError as ve:
        logger.warning(f"OTP verification failed for {email}: {str(ve)}")
        if str(ve) == 'profile_not_found':
            raise HTTPException(status_code=404, detail='profile_not_found')
        if str(ve) == 'invalid_otp':
            raise HTTPException(status_code=400, detail='invalid_otp')
        if str(ve) == 'otp_expired':
            raise HTTPException(status_code=400, detail='otp_expired')
        raise HTTPException(status_code=400, detail='otp_invalid')
    except Exception as e:
        logger.exception('OTP verification error')
        raise HTTPException(status_code=500, detail=f'verification_failed: {str(e)}')


@app.post('/user/resend-otp')
async def user_resend_otp(payload: Dict[str, Any] = Body(...)):
    """Regenerate and resend OTP for the given email."""
    email = payload.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='missing_email')

    # generate new OTP
    otp = f"{secrets.randbelow(1000000):06d}"
    otp_expires = datetime.utcnow() + timedelta(minutes=10)

    try:
        # update profile row with new otp
        update_profile_otp(email=email, otp=otp, otp_expires_at=otp_expires)
        # send email
        try:
            send_otp_email(email, otp)
        except Exception:
            logger.exception('Failed to send OTP email on resend')
        resp = {'status': 'ok'}
        if os.environ.get('LOG_LEVEL', '').upper() == 'DEBUG':
            resp['debug_otp'] = otp
        return JSONResponse(resp)
    except Exception as e:
        logger.exception('resend otp failed')
        raise HTTPException(status_code=500, detail=f'resend_failed: {str(e)}')


# ============= BoldSign E-Signature Integration =============

@app.post('/boldsign/create-embed-link')
async def boldsign_create_embed_link(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a BoldSign embedded signing link for the user.
    Uses authenticated user data as fallback for missing fields.
    Returns: signingLink, documentId, caseId
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        # Use authenticated user data as fallback
        user_id = payload.get('userId') or current_user.get('id')
        email = payload.get('email') or current_user.get('email')
        name = payload.get('name') or current_user.get('full_name') or email.split('@')[0] if email else 'User'
        case_id = payload.get('caseId')
        
        # Only require userId OR email (one of them must exist)
        if not user_id and not email:
            raise HTTPException(
                status_code=400,
                detail='Missing required fields: need at least userId or email'
            )
        
        # Generate fallback email if missing
        if not email and user_id:
            email = f"user_{user_id}@temp.com"
        
        # Get existing case or create one only if absolutely necessary
        if not case_id:
            # Try to find an existing case for this user
            try:
                existing_cases = list_cases(user_id=user_id)
                if existing_cases and len(existing_cases) > 0:
                    # Use the most recent case
                    case_id = existing_cases[0].get('id')
                    logger.info(f'Using existing case {case_id} for e-signature')
                else:
                    # Only create a new case if none exists
                    case_result = create_case(
                        user_id=user_id,
                        title=f"Disability Claim for {name}",
                        description="E-signature pending",
                        metadata={"source": "esignature_flow"}
                    )
                    # Extract case_id from result (can be array or dict)
                    if isinstance(case_result, list) and len(case_result) > 0:
                        case_id = case_result[0].get('id')
                    elif isinstance(case_result, dict):
                        case_id = case_result.get('id')
                    
                    logger.info(f'Created new case {case_id} for e-signature')
            except Exception as e:
                logger.warning(f'Failed to get/create case for e-signature: {e}')
                # Continue without case - we'll still create the signature
        
        # Create embedded signing link
        result = await create_embedded_sign_link(
            user_id=user_id,
            name=name,
            email=email,
            case_id=case_id,
        )
        
        # Update case metadata with document_id
        if case_id:
            try:
                case_data = get_case(case_id)
                if case_data:
                    metadata = case_data.get('metadata', {}) or {}
                    metadata['boldsign_document_id'] = result['documentId']
                    metadata['signature_status'] = 'pending'
                    update_case(
                        case_id=case_id,
                        fields={'metadata': metadata}
                    )
            except Exception as e:
                logger.warning(f'Failed to update case with signature info: {e}')
        
        # Add caseId to response
        result['caseId'] = case_id
        return JSONResponse(result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception('Failed to create BoldSign embed link')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to create signing link: {str(e)}'
        )


@app.get('/boldsign/document-status/{document_id}')
async def boldsign_get_status(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the status of a BoldSign document.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        status = await get_document_status(document_id)
        return JSONResponse(status)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception('Failed to get document status')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get document status: {str(e)}'
        )


@app.post('/boldsign/signature-complete')
async def boldsign_signature_complete(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Mark signature as complete in the case metadata.
    Called after user finishes signing.
    Updates agreement_signed to true and tracks signed documents.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        case_id = payload.get('caseId')
        document_id = payload.get('documentId')
        document_type = payload.get('documentType', 'unknown')
        
        logger.info(f"📝 Processing signature complete request: case_id={case_id}, doc_id={document_id}, doc_type={document_type}")
        
        if not case_id or not document_id:
            logger.error(f"❌ Missing required fields: case_id={case_id}, document_id={document_id}")
            raise HTTPException(
                status_code=400,
                detail='Missing caseId or documentId'
            )
        
        # Update case metadata
        case_data_list = get_case(case_id)
        if not case_data_list or len(case_data_list) == 0:
            logger.error(f"❌ Case not found: {case_id}")
            raise HTTPException(status_code=404, detail='Case not found')
        
        # get_case returns a list, get the first item
        case_data = case_data_list[0] if isinstance(case_data_list, list) else case_data_list
        logger.info(f"📋 Current case data retrieved, preparing update...")
        
        # Parse metadata if it's a JSON string
        metadata = case_data.get('metadata', {}) or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}
        
        metadata['signature_status'] = 'completed'
        metadata['signature_completed_at'] = datetime.utcnow().isoformat()
        
        # Track signed documents by type
        if 'signed_documents' not in metadata:
            metadata['signed_documents'] = {}
        
        metadata['signed_documents'][document_type] = {
            'document_id': document_id,
            'signed_at': datetime.utcnow().isoformat(),
            'status': 'signed'
        }
        
        # Prepare fields to update
        update_fields = {
            'metadata': metadata,
            'agreement_signed': True
        }
        
        logger.info(f"🔄 Updating case {case_id} with fields: {update_fields}")
        
        # Update case with agreement_signed = true and metadata
        result = update_case(
            case_id=case_id,
            fields=update_fields
        )
        
        logger.info(f"✅ Case updated successfully. Result: {result}")
        logger.info(f"✅ Document '{document_type}' signed for case {case_id} (document_id: {document_id})")
        logger.info(f"✅ agreement_signed column set to TRUE for case {case_id}")
        
        return JSONResponse({
            'status': 'ok',
            'message': f'Signature for {document_type} marked as complete',
            'document_type': document_type,
            'document_id': document_id,
            'agreement_signed': True,
            'case_id': case_id
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'❌ Failed to mark signature complete: {str(e)}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to update signature status: {str(e)}'
        )


@app.post('/cases/{case_id}/document-signed')
async def track_document_signed(
    case_id: str,
    payload: Dict[str, Any] = Body(...),
    user = Depends(get_current_user)
):
    """
    Track when a specific document is signed.
    Updates the documents_signed tracking in case metadata and sets agreement_signed to true.
    """
    if not user:
        raise HTTPException(status_code=401, detail='unauthorized')
    
    try:
        document_id = payload.get('documentId')
        document_type = payload.get('documentType', 'unknown')
        signed_at = payload.get('signedAt')
        
        if not document_id:
            raise HTTPException(
                status_code=400,
                detail='Missing documentId'
            )
        
        # Get case data - returns a list
        case_data_list = get_case(case_id)
        if not case_data_list or len(case_data_list) == 0:
            raise HTTPException(status_code=404, detail='Case not found')
        
        # get_case returns a list, get the first item
        case_data = case_data_list[0] if isinstance(case_data_list, list) else case_data_list
        
        # Update metadata with signed document tracking
        # Parse metadata if it's a JSON string
        metadata = case_data.get('metadata', {}) or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}
        
        if 'documents_signed' not in metadata:
            metadata['documents_signed'] = {}
        
        metadata['documents_signed'][document_type] = {
            'document_id': document_id,
            'signed_at': signed_at or datetime.utcnow().isoformat(),
            'status': 'signed'
        }
        
        # Update the case with metadata AND agreement_signed = true
        update_case(
            case_id=case_id,
            fields={
                'metadata': metadata,
                'agreement_signed': True
            }
        )
        
        logger.info(f"✅ Document '{document_type}' signed for case {case_id} (doc_id: {document_id})")
        logger.info(f"✅ agreement_signed column set to TRUE for case {case_id}")
        return JSONResponse({
            'status': 'ok',
            'message': f'Document {document_type} tracked as signed',
            'document_type': document_type,
            'case_id': case_id,
            'agreement_signed': True
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception('Failed to track document signed')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to track document signed: {str(e)}'
        )



@app.post('/eligibility/check-document-relevance')
async def check_document_relevance_endpoint(
    file: UploadFile = File(...),
    provider: str = Form('gemini'),
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """
    Step 1 of eligibility workflow: Check if uploaded document is relevant for disability claim.
    
    This endpoint performs OCR on uploaded document and uses AI to determine:
    - Is this a medical/clinical document?
    - What type of document is it (medical_report, discharge_summary, receipt, blank_page)?
    - Is it relevant for disability claim processing?
    - What should the user do if irrelevant?
    
    Parameters:
        file: Uploaded document (PDF, JPG, PNG, DOCX)
        provider: AI provider to use ('gemini' or 'gpt'), default 'gemini'
        current_user: Automatically injected from Authorization header (optional)
    
    Returns:
        {
            'status': 'ok',
            'data': {
                'is_relevant': bool,
                'relevance_score': int,  # 0-100
                'relevance_reason': str,
                'focus_excerpt': str,    # Key section from document
                'document_type': str,    # medical_report, discharge_summary, receipt, blank_page, other
                'statement': str,        # User-facing message
                'directions': List[str]  # What to do next (especially if irrelevant)
            }
        }
    """
    from .eligibility_processor import check_document_relevance
    from .ocr import extract_text_from_document
    
    logger.info(f"Received /eligibility/check-document-relevance; file={file.filename}, provider={provider}")
    
    # Validate provider
    if provider not in ['gemini', 'gpt']:
        raise HTTPException(
            status_code=400,
            detail="Invalid provider. Must be 'gemini' or 'gpt'"
        )
    
    # Read file content
    try:
        content = await file.read()
        filesize = len(content)
        file_ext = Path(file.filename).suffix or '.pdf'
        logger.info(f"Read uploaded file {file.filename}; size={filesize} bytes")
    except Exception:
        logger.exception("Failed to read uploaded file")
        raise HTTPException(status_code=500, detail='Failed to read uploaded file')
    
    # Extract text using OCR
    try:
        text, extraction_success = extract_text_from_document(content, file.filename)
        logger.info(f"OCR extraction complete; success={extraction_success}; extracted_chars={len(text) if text else 0}")
        
        if not extraction_success or not text or len(text.strip()) < 20:
            # Try PDF fallback for digital PDFs
            if file_ext.lower() == '.pdf':
                try:
                    from .ocr import extract_text_from_pdf_bytes
                    fallback_text, fallback_success = extract_text_from_pdf_bytes(content)
                    if fallback_success and fallback_text:
                        text = fallback_text
                        extraction_success = True
                        logger.info(f"PDF fallback successful; extracted_chars={len(text)}")
                except Exception:
                    logger.exception('PDF fallback extraction failed')
            
            if not extraction_success or not text or len(text.strip()) < 20:
                raise HTTPException(
                    status_code=400,
                    detail='Could not extract meaningful text from document. Please ensure document is readable and contains text.'
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Text extraction failed")
        raise HTTPException(status_code=500, detail=f'Text extraction failed: {str(e)}')
    
    # Check document relevance using AI
    try:
        result = check_document_relevance(text, provider=provider)
        logger.info(f"Document relevance check complete; is_relevant={result['is_relevant']}, score={result['relevance_score']}")
        
        return JSONResponse({
            'status': 'ok',
            'data': result
        })
    except Exception as e:
        logger.exception("Document relevance check failed")
        raise HTTPException(
            status_code=500,
            detail=f'Document relevance check failed: {str(e)}'
        )


@app.post('/eligibility/analyze-questionnaire')
async def analyze_questionnaire_endpoint(
    answers: str = Form(...),
    provider: str = Form('gemini'),
    document_summary: Optional[str] = Form(None),
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """
    Step 2 of eligibility workflow: Analyze questionnaire answers against official guidelines.
    
    This endpoint should be called AFTER document relevance check passes.
    Uses AI to evaluate questionnaire answers against comprehensive disability claim guidelines.
    
    Parameters:
        answers: JSON string containing questionnaire answers (dict of question_id -> answer)
        provider: AI provider to use ('gemini' or 'gpt'), default 'gemini'
        document_summary: Optional summary from validated medical document (from Step 1)
        current_user: Automatically injected from Authorization header (optional)
    
    Returns:
        {
            'status': 'ok',
            'data': {
                'eligibility_score': int,         # 0-100
                'eligibility_status': str,        # approved, pending, denied, needs_review
                'confidence': int,                # 0-100
                'reason_summary': str,            # Why this status was assigned
                'rule_references': List[Dict],    # Relevant guideline sections
                'required_next_steps': List[str], # What user must do next
                'strengths': List[str],           # Positive aspects of submission
                'weaknesses': List[str],          # Issues that need addressing
                'missing_information': List[str]  # Required info not provided
            }
        }
    """
    from .eligibility_processor import analyze_questionnaire_with_guidelines, load_eligibility_guidelines
    
    logger.info(f"Received /eligibility/analyze-questionnaire; provider={provider}, has_doc_summary={bool(document_summary)}")
    
    # Validate provider
    if provider not in ['gemini', 'gpt']:
        raise HTTPException(
            status_code=400,
            detail="Invalid provider. Must be 'gemini' or 'gpt'"
        )
    
    # Parse answers
    try:
        answers_obj: Dict[str, Any] = json.loads(answers)
        logger.info(f"Parsed questionnaire answers: {len(answers_obj)} questions")
    except Exception as e:
        logger.warning("Invalid JSON in 'answers' form field", exc_info=True)
        raise HTTPException(status_code=400, detail='Invalid JSON in answers')
    
    # Load guidelines
    try:
        guidelines_text = load_eligibility_guidelines()
        if not guidelines_text:
            logger.error("Failed to load eligibility guidelines")
            raise HTTPException(
                status_code=500,
                detail='Guidelines not available. Please contact support.'
            )
        logger.info(f"Loaded guidelines: {len(guidelines_text)} chars")
    except Exception as e:
        logger.exception("Failed to load guidelines")
        raise HTTPException(
            status_code=500,
            detail=f'Failed to load guidelines: {str(e)}'
        )
    
    # Analyze questionnaire
    try:
        result = analyze_questionnaire_with_guidelines(
            answers=answers_obj,
            guidelines_text=guidelines_text,
            provider=provider,
            document_summary=document_summary
        )
        logger.info(f"Questionnaire analysis complete; status={result['eligibility_status']}, score={result['eligibility_score']}")
        
        return JSONResponse({
            'status': 'ok',
            'data': result
        })
    except Exception as e:
        logger.exception("Questionnaire analysis failed")
        raise HTTPException(
            status_code=500,
            detail=f'Questionnaire analysis failed: {str(e)}'
        )


@app.post('/vapi/re-analyze-call/{case_id}')
async def re_analyze_call(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Re-analyze existing call_details and user_eligibility without needing to re-interview.
    Useful for testing the analysis flow during development.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from .supabase_client import get_case, get_user_eligibility, update_case
        from .openai_call_analyzer import analyze_call_conversation_openai
        
        user_id = current_user.get('id')
        
        # Get the case
        case_result = get_case(case_id)
        if not case_result or not isinstance(case_result, list) or len(case_result) == 0:
            raise HTTPException(status_code=404, detail=f'Case {case_id} not found')
        
        case = case_result[0]  # Extract first result from list
        
        # Verify the case belongs to the current user
        if case.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail='Unauthorized access to case')
        
        # Get call_details from the case
        call_details = case.get('call_details')
        if not call_details:
            raise HTTPException(status_code=400, detail='No call_details found in case')
        
        # Parse call_details if it's a JSON string
        if isinstance(call_details, str):
            call_details = json.loads(call_details)
        
        # Extract transcript and messages
        transcript = call_details.get('transcript', '')
        messages = call_details.get('messages', [])
        
        if not transcript:
            raise HTTPException(status_code=400, detail='No transcript found in call_details')
        
        logger.info(f"[REANALYZE] Re-analyzing case {case_id} with transcript ({len(transcript)} chars)")
        
        # Fetch user_eligibility data
        eligibility_records = []
        try:
            eligibility_records = get_user_eligibility(user_id=user_id)
            logger.info(f"[REANALYZE] Found {len(eligibility_records) if eligibility_records else 0} eligibility records")
        except Exception as e:
            logger.warning(f"[REANALYZE] Could not fetch eligibility records: {e}")
        
        # Analyze conversation using OpenAI agent
        try:
            analysis_result = await analyze_call_conversation_openai(transcript, messages, eligibility_records, call_details)
            logger.info(f"[REANALYZE] Successfully re-analyzed conversation. Summary length: {len(analysis_result.get('call_summary', ''))} chars")
        except Exception as e:
            logger.exception(f"[REANALYZE] Failed to analyze conversation: {e}")
            analysis_result = {
                'call_summary': 'Re-analysis failed. Please review transcript manually.',
                'documents_requested_list': [],
                'case_summary': 'Analysis pending',
                'key_legal_points': [],
                'risk_assessment': 'Needs More Info',
                'estimated_claim_amount': 'Pending evaluation'
            }
        
        # Update case with new analysis
        update_payload = {
            'call_summary': json.dumps(analysis_result, ensure_ascii=False)
        }
        
        update_case(case_id, update_payload)
        logger.info(f"[REANALYZE] Updated case {case_id} with new analysis")
        
        return JSONResponse({
            'status': 'ok',
            'message': 'Case re-analyzed successfully',
            'analysis': analysis_result
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[REANALYZE] Failed to re-analyze call: {e}")
        raise HTTPException(status_code=500, detail=f'Failed to re-analyze call: {str(e)}')


@app.get('/admin/analytics')
async def get_analytics(
    time_range: str = "30days"
):
    """
    Get analytics and metrics for admin dashboard.
    time_range: 7days, 30days, 90days, year
    """
    try:
        from datetime import datetime, timedelta
        from .supabase_client import _postgrest_headers
        
        # Calculate date range
        end_date = datetime.now()
        if time_range == "7days":
            start_date = end_date - timedelta(days=7)
        elif time_range == "90days":
            start_date = end_date - timedelta(days=90)
        elif time_range == "year":
            start_date = end_date - timedelta(days=365)
        else:  # 30days default
            start_date = end_date - timedelta(days=30)
        
        # Get cases in the time range
        cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases?created_at.gte.{start_date.isoformat()}&created_at.lte.{end_date.isoformat()}&limit=500"
        cases_resp = requests.get(cases_url, headers=_postgrest_headers(), timeout=15)
        cases_resp.raise_for_status()
        cases = cases_resp.json()
        
        total_cases = len(cases)
        
        # Count by status
        status_counts = {}
        for case in cases:
            status = case.get('status', 'Unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Fetch user profiles for eligibility data
        profiles_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?limit=500"
        profiles_resp = requests.get(profiles_url, headers=_postgrest_headers(), timeout=15)
        profiles_resp.raise_for_status()
        profiles = profiles_resp.json()
        
        # Calculate metrics
        avg_ai_score = 0
        if profiles:
            total_score = 0
            count = 0
            for profile in profiles:
                try:
                    eligibility_raw = profile.get('eligibility_raw', {})
                    if isinstance(eligibility_raw, str):
                        eligibility_raw = json.loads(eligibility_raw)
                    score = eligibility_raw.get('eligibility_score', 0)
                    if score:
                        total_score += score
                        count += 1
                except:
                    pass
            avg_ai_score = int(total_score / count) if count > 0 else 0
        
        # Calculate claim amounts and extract disability types
        total_claim_amount = 0
        disability_type_counts = {}
        
        for case in cases:
            try:
                call_summary = case.get('call_summary', {})
                if isinstance(call_summary, str):
                    call_summary = json.loads(call_summary)
                
                # Extract claim amount
                amount = call_summary.get('estimated_claim_amount', 0)
                if amount:
                    total_claim_amount += amount
                
                # Extract disability types from products field
                products = call_summary.get('products', [])
                if isinstance(products, str):
                    products = json.loads(products)
                
                if products:
                    for product in products:
                        disability_type_counts[product] = disability_type_counts.get(product, 0) + 1
                else:
                    # Default to 'General Disability' if no products specified
                    disability_type_counts['General Disability'] = disability_type_counts.get('General Disability', 0) + 1
            except Exception as parse_err:
                logger.warning(f'Failed to parse call_summary for case: {parse_err}')
                disability_type_counts['General Disability'] = disability_type_counts.get('General Disability', 0) + 1
        
        # Stage distribution
        stage_distribution = {}
        for status, count in status_counts.items():
            percentage = int((count / total_cases) * 100) if total_cases > 0 else 0
            stage_distribution[status] = {
                'count': count,
                'percentage': percentage
            }
        
        # Calculate previous period for comparison
        if time_range == "7days":
            prev_start = start_date - timedelta(days=7)
        elif time_range == "90days":
            prev_start = start_date - timedelta(days=90)
        elif time_range == "year":
            prev_start = start_date - timedelta(days=365)
        else:
            prev_start = start_date - timedelta(days=30)
        
        prev_cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases?created_at.gte.{prev_start.isoformat()}&created_at.lt.{start_date.isoformat()}&limit=500"
        prev_cases_resp = requests.get(prev_cases_url, headers=_postgrest_headers(), timeout=15)
        prev_cases = prev_cases_resp.json() if prev_cases_resp.ok else []
        prev_total_cases = len(prev_cases)
        
        # Calculate conversion rate (cases that reached submission)
        submitted_count = status_counts.get('Submitted', 0)
        conversion_rate = int((submitted_count / total_cases) * 100) if total_cases > 0 else 0
        
        prev_submitted = sum(1 for c in prev_cases if c.get('status') == 'Submitted')
        prev_conversion = int((prev_submitted / prev_total_cases) * 100) if prev_total_cases > 0 else 0
        conversion_change = conversion_rate - prev_conversion
        
        # Calculate new cases change percentage
        cases_change = int(((total_cases - prev_total_cases) / prev_total_cases) * 100) if prev_total_cases > 0 else 0
        
        # Average processing time (days)
        total_days = 0
        count = 0
        for case in cases:
            try:
                created = datetime.fromisoformat(case.get('created_at', '').replace('Z', '+00:00'))
                updated = datetime.fromisoformat(case.get('updated_at', '').replace('Z', '+00:00'))
                days = (updated - created).days
                if days >= 0:
                    total_days += days
                    count += 1
            except:
                pass
        avg_processing_days = int(total_days / count) if count > 0 else 0
        
        return JSONResponse({
            'status': 'ok',
            'metrics': {
                'total_cases': total_cases,
                'cases_change': f"+{cases_change}%" if cases_change >= 0 else f"{cases_change}%",
                'conversion_rate': conversion_rate,
                'conversion_change': f"+{conversion_change}%" if conversion_change >= 0 else f"{conversion_change}%",
                'avg_ai_score': avg_ai_score,
                'avg_processing_days': avg_processing_days,
                'total_claim_potential': total_claim_amount,
            },
            'stage_distribution': stage_distribution,
            'claim_types': disability_type_counts
        })
        
    except Exception as e:
        logger.error(f'Failed to get analytics: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to get analytics: {str(e)}')


@app.get('/admin/analytics')
async def get_analytics(
    time_range: str = "30days"
):
    """
    Get analytics and metrics for admin dashboard.
    time_range: 7days, 30days, 90days, year
    """
    try:
        from datetime import datetime, timedelta
        from .supabase_client import _postgrest_headers
        
        # Calculate date range
        end_date = datetime.now()
        if time_range == "7days":
            start_date = end_date - timedelta(days=7)
        elif time_range == "90days":
            start_date = end_date - timedelta(days=90)
        elif time_range == "year":
            start_date = end_date - timedelta(days=365)
        else:  # 30days default
            start_date = end_date - timedelta(days=30)
        
        # Get cases in the time range
        cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases?created_at.gte.{start_date.isoformat()}&created_at.lte.{end_date.isoformat()}&limit=500"
        cases_resp = requests.get(cases_url, headers=_postgrest_headers(), timeout=15)
        cases_resp.raise_for_status()
        cases = cases_resp.json()
        
        total_cases = len(cases)
        
        # Count by status
        status_counts = {}
        for case in cases:
            status = case.get('status', 'Unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Fetch user profiles for eligibility data
        profiles_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?limit=500"
        profiles_resp = requests.get(profiles_url, headers=_postgrest_headers(), timeout=15)
        profiles_resp.raise_for_status()
        profiles = profiles_resp.json()
        
        # Calculate metrics
        avg_ai_score = 0
        if profiles:
            total_score = 0
            count = 0
            for profile in profiles:
                try:
                    eligibility_raw = profile.get('eligibility_raw', {})
                    if isinstance(eligibility_raw, str):
                        eligibility_raw = json.loads(eligibility_raw)
                    score = eligibility_raw.get('eligibility_score', 0)
                    if score:
                        total_score += score
                        count += 1
                except:
                    pass
            avg_ai_score = int(total_score / count) if count > 0 else 0
        
        # Calculate claim amounts and extract disability types
        total_claim_amount = 0
        disability_type_counts = {}
        
        for case in cases:
            try:
                call_summary = case.get('call_summary', {})
                if isinstance(call_summary, str):
                    call_summary = json.loads(call_summary)
                
                # Extract claim amount
                amount = call_summary.get('estimated_claim_amount', 0)
                if amount:
                    total_claim_amount += amount
                
                # Extract disability types from products field
                products = call_summary.get('products', [])
                if isinstance(products, str):
                    products = json.loads(products)
                
                if products:
                    for product in products:
                        disability_type_counts[product] = disability_type_counts.get(product, 0) + 1
                else:
                    # Default to 'General Disability' if no products specified
                    disability_type_counts['General Disability'] = disability_type_counts.get('General Disability', 0) + 1
            except Exception as parse_err:
                logger.warning(f'Failed to parse call_summary for case: {parse_err}')
                disability_type_counts['General Disability'] = disability_type_counts.get('General Disability', 0) + 1
        
        # Stage distribution
        stage_distribution = {}
        for status, count in status_counts.items():
            percentage = int((count / total_cases) * 100) if total_cases > 0 else 0
            stage_distribution[status] = {
                'count': count,
                'percentage': percentage
            }
        
        # Calculate previous period for comparison
        if time_range == "7days":
            prev_start = start_date - timedelta(days=7)
        elif time_range == "90days":
            prev_start = start_date - timedelta(days=90)
        elif time_range == "year":
            prev_start = start_date - timedelta(days=365)
        else:
            prev_start = start_date - timedelta(days=30)
        
        prev_cases_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases?created_at.gte.{prev_start.isoformat()}&created_at.lt.{start_date.isoformat()}&limit=500"
        prev_cases_resp = requests.get(prev_cases_url, headers=_postgrest_headers(), timeout=15)
        prev_cases = prev_cases_resp.json() if prev_cases_resp.ok else []
        prev_total_cases = len(prev_cases)
        
        # Calculate conversion rate (cases that reached submission)
        submitted_count = status_counts.get('Submitted', 0)
        conversion_rate = int((submitted_count / total_cases) * 100) if total_cases > 0 else 0
        
        prev_submitted = sum(1 for c in prev_cases if c.get('status') == 'Submitted')
        prev_conversion = int((prev_submitted / prev_total_cases) * 100) if prev_total_cases > 0 else 0
        conversion_change = conversion_rate - prev_conversion
        
        # Calculate new cases change percentage
        cases_change = int(((total_cases - prev_total_cases) / prev_total_cases) * 100) if prev_total_cases > 0 else 0
        
        # Average processing time (days)
        total_days = 0
        count = 0
        for case in cases:
            try:
                created = datetime.fromisoformat(case.get('created_at', '').replace('Z', '+00:00'))
                updated = datetime.fromisoformat(case.get('updated_at', '').replace('Z', '+00:00'))
                days = (updated - created).days
                if days >= 0:
                    total_days += days
                    count += 1
            except:
                pass
        avg_processing_days = int(total_days / count) if count > 0 else 0
        
        return JSONResponse({
            'status': 'ok',
            'metrics': {
                'total_cases': total_cases,
                'cases_change': f"+{cases_change}%" if cases_change >= 0 else f"{cases_change}%",
                'conversion_rate': conversion_rate,
                'conversion_change': f"+{conversion_change}%" if conversion_change >= 0 else f"{conversion_change}%",
                'avg_ai_score': avg_ai_score,
                'avg_processing_days': avg_processing_days,
                'total_claim_potential': total_claim_amount,
            },
            'stage_distribution': stage_distribution,
            'claim_types': disability_type_counts
        })
        
    except Exception as e:
        logger.error(f'Failed to get analytics: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to get analytics: {str(e)}')

# --- CONFIG ---
INTERVIEW_PROMPT = """
You are an AI interview agent.

Goal:
Understand the user's AI project.

Rules:
- Ask ONE question at a time
- Decide the next question automatically
- Ask follow-ups if answers are unclear
- Do not repeat questions
"""

# Get OpenAI API key from environment
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

@app.post("/offer")
async def offer(request: Request):
    try:
        # Check if OpenAI API key is configured
        if not OPENAI_API_KEY:
            print("❌ OPENAI_API_KEY is not configured in environment variables")
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        
        # Get user from token if available (optional - the endpoint works without auth too)
        user_id = None
        user_name = "there"  # default greeting
        
        auth_header = request.headers.get("authorization")
        if auth_header:
            try:
                # Extract token from "Bearer <token>" format
                token = auth_header
                if isinstance(auth_header, str) and auth_header.lower().startswith('bearer '):
                    token = auth_header.split(' ', 1)[1]
                
                # Try to decode token without validation to extract claims
                import base64
                import json as json_module
                try:
                    parts = token.split('.')
                    if len(parts) >= 2:
                        payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
                        payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
                        payload_obj = json_module.loads(payload_json)
                        
                        user_id = payload_obj.get('sub')
                        user_name = payload_obj.get('name') or payload_obj.get('email', 'there').split('@')[0]
                        print(f"✅ User extracted from token claims: ID={user_id}, Name={user_name}")
                        
                        # Try to fetch user's full_name from user_profile table
                        try:
                            from .supabase_client import get_profile_by_user_id
                            profiles = get_profile_by_user_id(user_id)
                            if profiles and len(profiles) > 0:
                                profile_full_name = profiles[0].get('full_name')
                                if profile_full_name:
                                    user_name = profile_full_name
                                    print(f"✅ Updated user name from profile: {user_name}")
                        except Exception as profile_err:
                            print(f"⚠️ Failed to fetch user profile for full_name: {profile_err}")
                except Exception as decode_err:
                    print(f"⚠️ Failed to decode token claims: {decode_err}")
                    # Fall back to proper validation if decode fails
                    try:
                        auth_user = get_user_from_token(token)
                        if auth_user:
                            user_id = auth_user.get("id")
                            user_name = auth_user.get("full_name") or auth_user.get("email", "there").split("@")[0]
                            print(f"✅ User extracted via validation: ID={user_id}, Name={user_name}")
                            
                            # Try to fetch user's full_name from user_profile table
                            try:
                                from .supabase_client import get_profile_by_user_id
                                profiles = get_profile_by_user_id(user_id)
                                if profiles and len(profiles) > 0:
                                    profile_full_name = profiles[0].get('full_name')
                                    if profile_full_name:
                                        user_name = profile_full_name
                                        print(f"✅ Updated user name from profile: {user_name}")
                            except Exception as profile_err:
                                print(f"⚠️ Failed to fetch user profile for full_name: {profile_err}")
                    except Exception as val_err:
                        print(f"⚠️ Token validation also failed: {val_err}")
                        
            except Exception as e:
                print(f"⚠️ Could not process auth header: {e}")
        else:
            print(f"ℹ️ No authentication provided, continuing with default context")
        
        # Fetch agent instructions from database
        agent_response = _supabase_admin.table("agents").select("prompt").eq("name", "interview_voice_agent").eq("is_active", True).maybe_single().execute()
        print(f"📋 Agent response: {agent_response}")
        
        instructions = """
You are an AI interview agent.

Rules:
- AI speaks first
- Ask ONE question at a time
- Decide follow-ups automatically
- Do not repeat questions
- Start the interview immediately
"""
        
        if agent_response.data and agent_response.data.get("prompt"):
            instructions = agent_response.data["prompt"]
            print(f"✅ Agent instructions loaded from database")
        else:
            print(f"⚠️ No agent instructions found, using defaults")
        
        # Fetch user eligibility data if user_id is available
        eligibility_context = ""
        if user_id:
            print(f"🔍 Fetching eligibility data for user_id: {user_id}")
            try:
                eligibility_response = _supabase_admin.table("user_eligibility").select("eligibility_raw").eq("user_id", user_id).order("processed_at", desc=True).limit(1).maybe_single().execute()
                print(f"📊 Eligibility response type: {type(eligibility_response)}")
                print(f"📊 Eligibility response: {eligibility_response}")
                
                # Handle different response structures
                eligibility_data = None
                if hasattr(eligibility_response, 'data'):
                    eligibility_data = eligibility_response.data
                    print(f"📊 Data from response.data: {eligibility_data} (type: {type(eligibility_data)})")
                else:
                    eligibility_data = eligibility_response
                    print(f"📊 Using response directly: {eligibility_data} (type: {type(eligibility_data)})")
                
                # Extract eligibility_raw from the response
                if eligibility_data:
                    if isinstance(eligibility_data, dict):
                        eligibility_raw = eligibility_data.get("eligibility_raw")
                    elif isinstance(eligibility_data, list) and len(eligibility_data) > 0:
                        eligibility_raw = eligibility_data[0].get("eligibility_raw") if isinstance(eligibility_data[0], dict) else None
                    else:
                        eligibility_raw = None
                    
                    print(f"📊 Extracted eligibility_raw: {eligibility_raw} (type: {type(eligibility_raw)})")
                    
                    if eligibility_raw:
                        if isinstance(eligibility_raw, str):
                            # If it's a JSON string, parse it
                            import json as json_module
                            try:
                                eligibility_raw = json_module.loads(eligibility_raw)
                            except:
                                print(f"⚠️ Failed to parse eligibility_raw as JSON")
                        
                        if isinstance(eligibility_raw, dict):
                            print(f"✅ Eligibility data found")
                            
                            # Build eligibility context
                            eligibility_context = f"""

### USER'S ELIGIBILITY ASSESSMENT

**Eligibility Status:** {eligibility_raw.get('eligibility_status', 'Unknown')}
**Eligibility Score:** {eligibility_raw.get('eligibility_score', 'N/A')}/100

**Strengths:**
{chr(10).join(f"- {s}" for s in eligibility_raw.get('strengths', [])) if eligibility_raw.get('strengths') else 'None documented'}

**Weaknesses:**
{chr(10).join(f"- {w}" for w in eligibility_raw.get('weaknesses', [])) if eligibility_raw.get('weaknesses') else 'None documented'}

**Missing Information:**
{chr(10).join(f"- {m}" for m in eligibility_raw.get('missing_information', [])) if eligibility_raw.get('missing_information') else 'None identified'}

**Required Next Steps:**
{chr(10).join(f"- {step}" for step in eligibility_raw.get('required_next_steps', [])) if eligibility_raw.get('required_next_steps') else 'None specified'}

**Document Analysis Summary:**
{eligibility_raw.get('document_analysis', {}).get('document_summary', 'No document analysis available') if isinstance(eligibility_raw.get('document_analysis'), dict) else 'No document analysis available'}

Use this information to guide your interview questions and address the identified gaps and weaknesses.
"""
                        else:
                            print(f"⚠️ eligibility_raw is not a dict: {type(eligibility_raw)}")
                    else:
                        print(f"⚠️ No eligibility_raw found in response")
            except Exception as e:
                print(f"❌ Error fetching eligibility data: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"⚠️ No user_id available, skipping eligibility fetch")
        
        # Combine instructions with user name and eligibility context
        final_instructions = f"{instructions}\n\n**User's Name:** {user_name}{eligibility_context}"

        print(f"\n📝 FINAL INSTRUCTIONS (length: {len(final_instructions)} chars)\n")
        
        # Make request to OpenAI Realtime API
        print(f"🔄 Making request to OpenAI Realtime Sessions API...")
        try:
            r = requests.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview",
                    "voice": "alloy",
                    "instructions": final_instructions,
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    }
                },
                timeout=30,
            )
            
            print(f"✅ OpenAI API response status: {r.status_code}")
            r.raise_for_status()
            data = r.json()

            return {
                "client_secret": data["client_secret"]["value"]
            }
        except requests.exceptions.ConnectionError as ce:
            print(f"❌ Connection error to OpenAI API: {ce}")
            raise HTTPException(status_code=503, detail=f"Cannot connect to OpenAI API: {str(ce)}")
        except requests.exceptions.Timeout as te:
            print(f"❌ Timeout connecting to OpenAI API: {te}")
            raise HTTPException(status_code=504, detail=f"OpenAI API timeout: {str(te)}")
        except requests.exceptions.RequestException as re:
            print(f"❌ Request error to OpenAI API: {re}")
            if hasattr(re, 'response') and re.response is not None:
                print(f"❌ Response status: {re.response.status_code}")
                print(f"❌ Response body: {re.response.text}")
            raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(re)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in /offer endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



# python -m uvicorn app.main:app --reload --port 8000
