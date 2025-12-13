import os
import uuid
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response, Request, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .schemas import EligibilityRequest, EligibilityResult
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
from .supabase_client import _has_supabase_py, _supabase_admin
from .email_utils import send_otp_email
from .boldsign import create_embedded_sign_link, get_document_status

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




@app.get('/me')
async def me(user = Depends(get_current_user)):
    if not user:
        return JSONResponse({'status': 'ok', 'anonymous': True})
    return JSONResponse({'status': 'ok', 'user': {'id': user.get('id'), 'email': user.get('email'), 'role': user.get('role'), 'profile': user.get('profile')}})


def require_admin(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail='unauthorized')
    role = user.get('role')
    # Accept boolean-ish admin flag in profile too
    if role in ('admin', 'superadmin'):
        return user
    # fallback: profile may include is_admin boolean
    prof = user.get('profile') or {}
    if prof.get('is_admin') or prof.get('is_superadmin'):
        return user
    raise HTTPException(status_code=403, detail='forbidden')


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
        raise HTTPException(status_code=500, detail='admin_get_user_failed')


@app.patch('/admin/users/{user_id}')
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


@app.get('/admin/users/{user_id}/cases')
async def admin_list_user_cases(user_id: str, user = Depends(require_admin)):
    """Admin: list all cases for a given user_id."""
    try:
        # Use helper to list cases for user
        from .supabase_client import list_cases_for_user
        rows = list_cases_for_user(user_id)
        # Normalize shape
        cases = rows or []
        return JSONResponse({'status': 'ok', 'cases': cases})
    except Exception:
        logger.exception('admin_list_user_cases failed')
        return JSONResponse({'status': 'ok', 'cases': []})


@app.get('/admin/cases')
async def admin_list_all_cases(
    limit: int = 10,
    offset: int = 0,
    status: Optional[str] = None,
    eligibility: Optional[str] = None,
    search: Optional[str] = None,
    user = Depends(require_admin)
):
    """Admin: list all cases with pagination and filters."""
    try:
        from .supabase_client import list_all_cases_paginated, get_profile_by_user_id
        
        # Build filters
        filters = {}
        if status:
            filters['status'] = status
        if eligibility:
            if eligibility == 'eligible':
                filters['eligibility_rating'] = 'gte.1'
            elif eligibility == 'not_eligible':
                filters['eligibility_rating'] = 'lt.1'
        
        # Fetch cases with pagination
        result = list_all_cases_paginated(limit=limit, offset=offset, filters=filters, search=search)
        cases = result.get('cases', [])
        total = result.get('total', 0)
        
        # Enrich cases with user info
        for case in cases:
            user_id = case.get('user_id')
            if user_id:
                try:
                    profiles = get_profile_by_user_id(user_id)
                    if profiles:
                        profile = profiles[0]
                        case['user_name'] = profile.get('full_name')
                        case['user_email'] = profile.get('email')
                except Exception:
                    logger.exception(f'Failed to fetch user profile for {user_id}')
        
        return JSONResponse({'status': 'ok', 'cases': cases, 'total': total})
    except Exception:
        logger.exception('admin_list_all_cases failed')
        return JSONResponse({'status': 'ok', 'cases': [], 'total': 0})


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


@app.post('/cases/{case_id}/documents')
async def upload_case_document(
    case_id: str,
    file: UploadFile = File(...),
    document_type: str = Form('general'),
    user = Depends(require_auth)
):
    """Upload an additional document to a case."""
    try:
        from datetime import datetime
        from .supabase_client import get_case, storage_upload_file, insert_case_document
        
        # Verify user has access to this case
        case_list = get_case(case_id)
        if not case_list:
            raise HTTPException(status_code=404, detail='case_not_found')
        
        case = case_list[0]
        if user['role'] != 'admin' and case.get('user_id') != user['id']:
            raise HTTPException(status_code=403, detail='access_denied')
        
        # Read file content
        content = await file.read()
        filesize = len(content)
        file_ext = Path(file.filename).suffix or ''
        
        # Upload to Supabase Storage
        from .utils import sanitize_filename
        import uuid
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]  # Short unique identifier
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
        
        # Check if document with same type already exists and update it
        from .supabase_client import get_case_documents, update_case_document
        existing_docs = get_case_documents(case_id)
        existing_doc = next((d for d in existing_docs if d.get('document_type') == document_type), None)
        
        if existing_doc:
            # Update existing document
            doc_record = update_case_document(
                document_id=existing_doc['id'],
                file_path=storage_url,  # Store full URL
                file_name=file.filename,
                file_type=file.content_type,
                file_size=filesize,
                metadata={'upload_source': 'manual_upload', 'replaced_at': datetime.utcnow().isoformat()}
            )
            logger.info(f"Updated existing document {existing_doc['id']} for type: {document_type}")
        else:
            # Insert new document record
            doc_record = insert_case_document(
                case_id=case_id,
                file_path=storage_url,  # Store full URL instead of storage path
                file_name=file.filename,
                file_type=file.content_type,
                file_size=filesize,
                document_type=document_type,
                uploaded_by=user['id'],
                metadata={'upload_source': 'manual_upload'}
            )
        
        return JSONResponse({
            'status': 'ok',
            'document': doc_record,
            'storage_url': storage_url
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
    user = Depends(require_auth)
):
    """Upload a medical document recommended by the AI."""
    try:
        from .supabase_client import get_case, storage_upload_file, insert_case_document
        
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
                from .eligibility_processor import check_document_relevance
                relevance_result = check_document_relevance(text, provider='gpt')
                
                document_summary = relevance_result.get('document_summary', '')
                document_key_points = relevance_result.get('key_points', [])
                is_relevant = relevance_result.get('is_relevant', True)
                
                logger.info(f"Document analysis complete: relevant={is_relevant}, summary_length={len(document_summary) if document_summary else 0}")
            else:
                logger.warning(f"Failed to extract text from {file.filename}")
        except Exception as e:
            logger.warning(f"Failed to analyze document: {e}")
        
        # Upload to Supabase Storage
        from .utils import sanitize_filename
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
        
        # Check if document with same type already exists and update it
        from .supabase_client import get_case_documents, update_case_document
        existing_docs = get_case_documents(case_id)
        existing_doc = next((d for d in existing_docs if d.get('document_type') == document_type), None)
        
        if existing_doc:
            # Update existing document
            doc_record = update_case_document(
                document_id=existing_doc['id'],
                file_path=storage_url,  # Store full URL
                file_name=file.filename,
                file_type=file.content_type,
                file_size=len(file_content),
                metadata={
                    'upload_source': 'medical_documents_flow',
                    'document_category': 'medical',
                    'ai_recommended': True,
                    'document_summary': document_summary,
                    'key_points': document_key_points,
                    'is_relevant': is_relevant,
                    'replaced_at': datetime.now().isoformat()
                }
            )
            logger.info(f"Updated existing medical document {existing_doc['id']} for type: {document_type}")
        else:
            # Insert new document record with analysis metadata
            doc_record = insert_case_document(
                case_id=case_id,
                document_type=document_type,
                file_name=file.filename,
                file_path=storage_url,  # Store full URL instead of storage path
                file_size=len(file_content),
                file_type=file.content_type,
                uploaded_by=user['id'],
                metadata={
                    'upload_source': 'medical_documents_flow',
                    'document_category': 'medical',
                    'ai_recommended': True,
                    'document_summary': document_summary,
                    'key_points': document_key_points,
                    'is_relevant': is_relevant
                }
            )
        
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
            provider='gemini',
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
async def get_vapi_call_details(call_id: str, current_user: dict = Depends(get_current_user)):
    """
    Fetch call details from Vapi API including transcript.
    Analyze conversation using Gemini to generate comprehensive summary and document list.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    try:
        from vapi import Vapi
        from .openai_call_analyzer import analyze_call_conversation_openai
        
        # Get Vapi API token from environment
        vapi_token = os.getenv('VAPI_API_KEY')
        if not vapi_token:
            raise HTTPException(status_code=500, detail='VAPI_API_KEY not configured')
        
        # Initialize Vapi client
        client = Vapi(token=vapi_token)
        
        # Fetch call details
        logger.info(f"[VAPI] Fetching call details for call_id: {call_id}")
        call_details = client.calls.get(id=call_id)
        
        logger.info(f"[VAPI] Call details retrieved successfully")
        
        # Convert Pydantic model to dict for JSON serialization with datetime serialization
        call_dict = call_details.model_dump(mode='json') if hasattr(call_details, 'model_dump') else call_details.dict()
        
        # Extract transcript and messages for analysis
        transcript = call_dict.get('transcript', '')
        messages = call_dict.get('messages', [])
        
        # Analyze conversation using OpenAI agent
        logger.info(f"[VAPI] Analyzing call conversation with OpenAI agent")
        analysis_result = {}
        
        if transcript:
            try:
                analysis_result = await analyze_call_conversation_openai(transcript, messages)
                logger.info(f"[VAPI] Successfully analyzed conversation. Summary length: {len(analysis_result.get('call_summary', ''))} chars")
            except Exception as e:
                logger.exception(f"[VAPI] Failed to analyze conversation: {e}")
                # Continue with empty analysis rather than failing the entire request
                analysis_result = {
                    'call_summary': 'Analysis failed. Please review transcript manually.',
                    'documents_requested_list': [],
                    'case_summary': 'Analysis pending',
                    'key_legal_points': [],
                    'risk_assessment': 'Needs More Info',
                    'estimated_claim_amount': 'Pending evaluation'
                }
        else:
            logger.warning(f"[VAPI] No transcript found in call details")
            analysis_result = {
                'call_summary': 'No transcript available',
                'documents_requested_list': [],
                'case_summary': 'No transcript available',
                'key_legal_points': [],
                'risk_assessment': 'Needs More Info',
                'estimated_claim_amount': 'Pending evaluation'
            }
        
        # Save call details and analysis to the user's case
        try:
            from .supabase_client import list_cases_for_user, update_case
            
            user_id = current_user.get('id')
            cases = list_cases_for_user(user_id)
            
            if cases:
                # Get the most recent case
                latest_case = sorted(cases, key=lambda x: x.get('created_at', ''), reverse=True)[0]
                case_id = latest_case.get('id')
                
                # Build the update payload (store full analysis as JSON in call_summary)
                update_payload = {
                    'call_details': call_dict,
                    'call_summary': json.dumps(analysis_result, ensure_ascii=False)
                }
                
                # Update case with call details and our OpenAI analysis
                update_case(case_id, update_payload)
                logger.info(f"[VAPI] Saved call details and analysis to case {case_id}")
                
                # Also add the analysis to the response for immediate use
                call_dict['analysis'] = {
                    'summary': analysis_result.get('call_summary', ''),
                    'structured_data': {
                        'case_summary': analysis_result.get('case_summary', ''),
                        'documents_requested_list': analysis_result.get('documents_requested_list', []),
                        'key_legal_points': analysis_result.get('key_legal_points', []),
                        'risk_assessment': analysis_result.get('risk_assessment', 'Needs More Info'),
                        'estimated_claim_amount': analysis_result.get('estimated_claim_amount', 'Pending evaluation')
                    }
                }
            else:
                logger.warning(f"[VAPI] No cases found for user {user_id}")
                # Still add analysis to response
                call_dict['analysis'] = {
                    'summary': analysis_result.get('call_summary', ''),
                    'structured_data': {
                        'case_summary': analysis_result.get('case_summary', ''),
                        'documents_requested_list': analysis_result.get('documents_requested_list', []),
                        'key_legal_points': analysis_result.get('key_legal_points', []),
                        'risk_assessment': analysis_result.get('risk_assessment', 'Needs More Info'),
                        'estimated_claim_amount': analysis_result.get('estimated_claim_amount', 'Pending evaluation')
                    }
                }
        except Exception as e:
            logger.exception(f"[VAPI] Failed to save call details to case: {e}")
            # Still add analysis to response even if save failed
            call_dict['analysis'] = {
                'summary': analysis_result.get('call_summary', ''),
                'structured_data': {
                    'case_summary': analysis_result.get('case_summary', ''),
                    'documents_requested_list': analysis_result.get('documents_requested_list', []),
                    'key_legal_points': analysis_result.get('key_legal_points', []),
                    'risk_assessment': analysis_result.get('risk_assessment', 'Needs More Info'),
                    'estimated_claim_amount': analysis_result.get('estimated_claim_amount', 'Pending evaluation')
                }
            }
        
        return JSONResponse({
            'status': 'ok',
            'call': call_dict,
            'analysis': analysis_result
        })
        
    except Exception as e:
        logger.exception(f"[VAPI] Failed to fetch call details: {e}")
        raise HTTPException(status_code=500, detail=f'Failed to fetch call details: {str(e)}')


@app.post('/vapi/re-analyze-call/{case_id}')
async def re_analyze_call(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Re-analyze an existing call using the latest OpenAI agent.
    Useful for updating analysis when agent prompts or logic changes.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')
    
    # TODO: Re-enable admin check in production
    # Only admins can re-analyze calls
    # if current_user.get('role') != 'admin':
    #     raise HTTPException(status_code=403, detail='Admin access required')
    
    try:
        from .supabase_client import get_case, update_case
        from .openai_call_analyzer import analyze_call_conversation_openai
        
        # Get the case
        case = get_case(case_id)
        if not case:
            raise HTTPException(status_code=404, detail='Case not found')
        
        logger.info(f"[VAPI] Case type: {type(case)}, case data: {case}")
        
        # Handle case being a list (supabase sometimes returns list)
        if isinstance(case, list):
            if len(case) == 0:
                raise HTTPException(status_code=404, detail='Case not found')
            case = case[0]
        
        # Get call details from case
        call_details = case.get('call_details')
        if not call_details or not isinstance(call_details, dict):
            raise HTTPException(status_code=400, detail='No call details found for this case')
        
        # Extract transcript and messages
        transcript = call_details.get('transcript', '')
        messages = call_details.get('messages', [])
        
        if not transcript:
            raise HTTPException(status_code=400, detail='No transcript found in call details')
        
        logger.info(f"[VAPI] Re-analyzing call for case {case_id}")
        
        # Run new analysis
        analysis_result = await analyze_call_conversation_openai(transcript, messages)
        logger.info(f"[VAPI] Re-analysis completed. Documents: {len(analysis_result.get('documents_requested_list', []))}")
        
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
        
        # Save updated call_details and call_summary (store full analysis as JSON)
        update_payload = {
            'call_details': call_details,
            'call_summary': json.dumps(analysis_result, ensure_ascii=False)
        }
        
        logger.info(f"[VAPI] Attempting to update case {case_id}")
        logger.debug(f"[VAPI] Update payload keys: {update_payload.keys()}, call_details size: {len(str(call_details))} chars")
        
        try:
            update_case(case_id, update_payload)
            logger.info(f"[VAPI] Updated case {case_id} with new analysis")
        except Exception as update_error:
            logger.exception(f"[VAPI] Failed to update case in database: {update_error}")
            # Still return success to user since analysis was completed
            logger.warning(f"[VAPI] Analysis completed but database update failed. Returning analysis anyway.")
        
        return JSONResponse({
            'status': 'ok',
            'message': 'Call re-analyzed successfully',
            'analysis': analysis_result,
            'call_details': call_details
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[VAPI] Failed to re-analyze call: {e}")
        raise HTTPException(status_code=500, detail=f'Failed to re-analyze call: {str(e)}')


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
        
        # Create a map of uploaded document types for frontend matching
        uploaded_types = {doc.get('document_type'): doc for doc in uploaded_documents}
        
        # Mark which requested documents have been uploaded
        requested_with_status = []
        for req_doc in requested_documents:
            uploaded_doc = uploaded_types.get(req_doc)
            requested_with_status.append({
                'name': req_doc,
                'uploaded': req_doc in uploaded_types,
                'file_url': uploaded_doc.get('file_path') if uploaded_doc else None,
                'file_name': uploaded_doc.get('file_name') if uploaded_doc else None,
                'uploaded_at': uploaded_doc.get('uploaded_at') if uploaded_doc else None
            })
        
        return JSONResponse({
            'status': 'ok',
            'case_id': case_id,
            'requested_documents': requested_with_status,
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


@app.get('/health')
async def health():
    return {'status': 'ok'}


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
        user = get_user_from_token(token)
        return user, token
    except ValueError as ve:
        # propagate specific user_not_found error for clearer client feedback
        if str(ve) == 'user_not_found':
            raise HTTPException(status_code=401, detail='user_not_found')
        raise HTTPException(status_code=401, detail='invalid_token')
    except Exception:
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
        except Exception:
            logger.exception('patch_user_profile failed')
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
            return JSONResponse({'status': 'ok', 'cases': cases_out or []})
        except Exception as e:
            logger.exception('Failed to fetch cases')
            raise HTTPException(status_code=500, detail=f'cases_failed: {str(e)}')
    res = await _inner(request)
    # avoid printing to stdout; use logger.debug if needed
    logger.debug('list_cases response prepared')
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
    user = Depends(get_current_user)
):
    """
    Create a BoldSign embedded signing link for the user.
    Uses authenticated user data as fallback for missing fields.
    Returns: signingLink, documentId, caseId
    """
    if not user:
        raise HTTPException(status_code=401, detail='unauthorized')
    
    try:
        # Use authenticated user data as fallback
        user_id = payload.get('userId') or user.get('id')
        email = payload.get('email') or user.get('email')
        name = payload.get('name') or user.get('full_name') or email.split('@')[0] if email else 'User'
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
        
        # Create a case if not provided
        if not case_id:
            try:
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
                logger.warning(f'Failed to create case for e-signature: {e}')
                # Continue without case - we'll still create the signature
        
        # Create embedded signing link
        result = await create_embedded_sign_link(
            user_id=user_id,
            name=name,
            email=email,
            case_id=case_id,
        )
        
        # Update case metadata with document_id
        try:
            case_data = get_case(case_id)
            if case_data:
                metadata = case_data.get('metadata', {}) or {}
                metadata['boldsign_document_id'] = result['documentId']
                metadata['signature_status'] = 'pending'
                update_case(
                    case_id=case_id,
                    updates={'metadata': metadata}
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
    user = Depends(get_current_user)
):
    """
    Get the status of a BoldSign document.
    """
    if not user:
        raise HTTPException(status_code=401, detail='unauthorized')
    
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
    user = Depends(get_current_user)
):
    """
    Mark signature as complete in the case metadata.
    Called after user finishes signing.
    """
    if not user:
        raise HTTPException(status_code=401, detail='unauthorized')
    
    try:
        case_id = payload.get('caseId')
        document_id = payload.get('documentId')
        
        if not case_id or not document_id:
            raise HTTPException(
                status_code=400,
                detail='Missing caseId or documentId'
            )
        
        # Update case metadata
        case_data = get_case(case_id)
        if not case_data:
            raise HTTPException(status_code=404, detail='Case not found')
        
        metadata = case_data.get('metadata', {}) or {}
        metadata['signature_status'] = 'completed'
        metadata['signature_completed_at'] = datetime.utcnow().isoformat()
        
        update_case(
            case_id=case_id,
            updates={'metadata': metadata}
        )
        
        return JSONResponse({'status': 'ok', 'message': 'Signature marked as complete'})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception('Failed to mark signature complete')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to update signature status: {str(e)}'
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


# Starting command: python -m uvicorn app.main:app --reload --port 8000
