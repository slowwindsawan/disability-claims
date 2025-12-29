import os
import requests
import logging
from datetime import datetime, timedelta
import json
import urllib.parse

logger = logging.getLogger('supabase_client')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

# Try to import supabase-py (auth client). If available, prefer it for auth operations.
_has_supabase_py = False
_supabase = None
_supabase_admin = None
try:
    from supabase import create_client as _create_supabase_client
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        _supabase = _create_supabase_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        _supabase_admin = _create_supabase_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    _has_supabase_py = True
    logger.debug('supabase-py detected: using client for auth operations')
except Exception:
    _has_supabase_py = False
    logger.debug('supabase-py not available; falling back to HTTP requests')


def _admin_headers():
    # Some Supabase admin endpoints expect the service role key in both the
    # Authorization header and the 'apikey' header. Include both to avoid 401s.
    return {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
    }


def _postgrest_headers():
    # PostgREST accepts service role key as Authorization and apikey header
    hdr = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=representation'
    }
    return hdr


def _normalize_sdk_response(res):
    """Normalize possible supabase-py SDK responses into plain Python types.
    - If `res` is a dict, prefer `res.get('data')` when present.
    - If `res` has a `.data` attribute (APIResponse), return that.
    - If `res` has an `error` attribute, raise a ValueError with the message.
    - Otherwise try to coerce to a JSON-friendly dict/list or string.
    """
    if res is None:
        return None
    # dict-like (HTTP fallback or newer SDK returning dict)
    if isinstance(res, dict):
        # prefer the `data` key when present (PostgREST/supabase-py shape)
        if 'error' in res and res.get('error'):
            # raise with SDK error message
            err = res.get('error')
            msg = err.get('message') if isinstance(err, dict) and err.get('message') else str(err)
            raise ValueError(msg or 'Supabase SDK error')
        if 'data' in res:
            return res.get('data')
        return res

    # Objects returned by older/newer supabase-py may expose `.data` and `.error`
    try:
        data = getattr(res, 'data', None)
        err = getattr(res, 'error', None)
        if err:
            # err may be dict-like or object
            try:
                msg = err.get('message') if isinstance(err, dict) else str(err)
            except Exception:
                msg = str(err)
            raise ValueError(msg or 'Supabase SDK error')
        if data is not None:
            return data
    except Exception:
        # fallthrough to next attempts
        pass

    # Try to convert common SDK objects to plain structures
    try:
        if hasattr(res, '__dict__'):
            return {k: _normalize_sdk_response(v) for k, v in res.__dict__.items()}
    except Exception:
        pass

    # Last resort: string representation
    try:
        return str(res)
    except Exception:
        return None


def create_auth_user(email: str, password: str, phone: str = None, email_confirm: bool = True) -> dict:
    """Create a Supabase auth user via Admin API. Requires service role key.

    By default this function will mark the created user as email-confirmed
    (`email_confirm=True`) so the user does not need to verify their email.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')

    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
    payload = {'email': email, 'password': password}
    if phone and phone.strip():  # Only add phone if provided and non-empty
        payload['phone'] = phone.strip()
    # Mark email as confirmed by default when creating admin user
    if email_confirm:
        # GoTrue/Supabase admin API supports `email_confirm` boolean to mark the
        # account as confirmed at creation time (so no verification step required).
        payload['email_confirm'] = True

    # user_metadata could include other items
    try:
        resp = requests.post(url, headers=_admin_headers(), json=payload, timeout=15)
        resp.raise_for_status()
        logger.info(f"Created auth user for {email} (email_confirm={email_confirm})")
        return resp.json()
    except requests.exceptions.HTTPError as e:
        # Parse error response to get detailed error info
        error_detail = None
        try:
            error_body = e.response.json()
            error_code = error_body.get('error_code', '')
            error_msg = error_body.get('msg', '')
            
            # Check for specific known errors
            if error_code == 'email_exists':
                error_detail = f'email_exists: {email}'
            elif error_msg:
                error_detail = error_msg
        except:
            error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
        
        logger.error(f'Failed to create auth user: {e.response.status_code} - {error_detail}')
        raise ValueError(f'Failed to create auth user: {error_detail}')
    except Exception:
        logger.exception('Failed to create auth user')
        raise


def sign_in(email: str, password: str) -> dict:
    """Sign in a user via Supabase Auth (returns access_token, refresh_token, user info)
    Uses the anon key for this call.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError('Supabase config missing')
    # Use JSON body including grant_type to avoid mismatches between form vs json parsing.
    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/token"
    payload = {'email': email, 'password': password, 'grant_type': 'password'}
    # Include anon key in both apikey and Authorization to match Supabase expectations.
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    # If supabase-py is available, prefer it (it wraps auth calls and returns structured results)
    if _has_supabase_py and _supabase is not None:
        try:
            logger.debug(f"Signing in user via supabase-py {email}")
            fn = getattr(_supabase.auth, 'sign_in_with_password', None)
            if fn:
                res = fn({"email": email, "password": password})
                # Normalise known response shapes from supabase-py
                # Common shape: {'data': {'user': {...}, 'session': {...}}, 'error': None}
                if isinstance(res, dict):
                    err = res.get('error')
                    if err:
                        msg = err.get('message') if isinstance(err, dict) else str(err)
                        logger.debug(f"supabase-py returned error: {msg}")
                        raise ValueError(msg or 'authentication_failed')

                    data = res.get('data') or {}
                    session = data.get('session') or {}
                    user = data.get('user') or (session.get('user') if isinstance(session, dict) else None)

                    out = {}
                    if session:
                        out['access_token'] = session.get('access_token') or session.get('accessToken')
                        out['refresh_token'] = session.get('refresh_token') or session.get('refreshToken')
                        out['expires_in'] = session.get('expires_in')
                    out['user'] = user
                    return out

                # Some older clients may return objects with attributes
                if hasattr(res, 'user') or hasattr(res, 'session'):
                    session = getattr(res, 'session', None)
                    user = getattr(res, 'user', None)
                    out = {}
                    if session is not None:
                        out['access_token'] = getattr(session, 'access_token', None) or getattr(session, 'accessToken', None)
                        out['refresh_token'] = getattr(session, 'refresh_token', None) or getattr(session, 'refreshToken', None)
                        out['expires_in'] = getattr(session, 'expires_in', None)
                    out['user'] = user.__dict__ if hasattr(user, '__dict__') else user
                    return out

                # If we get here, return as-is and let the caller handle it
                return res

            # fallback to older interface `sign_in(email=..., password=...)`
            fn2 = getattr(_supabase.auth, 'sign_in', None)
            if fn2:
                res = fn2(email=email, password=password)
                return res
        except ValueError:
            # pass through known auth errors for upstream handling
            raise
        except Exception:
            logger.exception('supabase-py sign_in failed, falling back to HTTP')

    try:
        logger.debug(f"Signing in user {email} via HTTP token endpoint (form-encoded)")
        # Use OAuth2 / GoTrue form-encoded password grant. Field name is `username`.
        form_headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
        data = {
            'grant_type': 'password',
            'username': email,
            'password': password,
        }

        # Let requests encode the form body (pass dict to `data=`) so the
        # Content-Type and encoding are handled correctly by requests.
        # Log a masked representation for debugging (never print raw password).
        masked = {'username': email, 'password': '********', 'grant_type': 'password'}
        try_body = urllib.parse.urlencode({'username': email, 'password': '********', 'grant_type': 'password'})
        logger.debug(f"Sign-in request to {url} headers={{'apikey':'***','Authorization':'***','Content-Type': 'application/x-www-form-urlencoded'}} payload={masked}")
        resp = requests.post(url, headers=form_headers, data=data, timeout=10)
        logger.debug(f"Sign-in response status={resp.status_code} text={resp.text}")
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to sign in')
        raise


def get_user_from_token(access_token: str) -> dict:
    """Return the Supabase auth user object for a bearer token."""
    if not SUPABASE_URL:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"

    # Basic debug: try to decode the token (no verification) to log the `sub`/`aud` claims
    try:
        import base64
        parts = access_token.split('.')
        if len(parts) >= 2:
            payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
            payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
            try:
                payload_obj = json.loads(payload_json)
                logger.debug(f"Token claims (sub/aud): sub={payload_obj.get('sub')} aud={payload_obj.get('aud')}")
            except Exception:
                logger.debug('Failed to parse token payload for debugging')
    except Exception:
        pass

    # prefer supabase-py admin client if available
    if _has_supabase_py and _supabase_admin is not None:
        try:
            logger.debug('Fetching user from token via supabase-py admin client')
            fn = getattr(_supabase_admin.auth, 'get_user', None)
            if fn:
                res = fn(access_token)
                # normalize result
                if isinstance(res, dict):
                    # newer clients return {'data': {'user': {...}}, 'error': ...}
                    if res.get('data') and isinstance(res.get('data'), dict):
                        # extract user object
                        if res['data'].get('user'):
                            return res['data']['user']
                        return res['data']
                    if res.get('user'):
                        return res.get('user')
                    return res
        except Exception:
            logger.exception('supabase-py get_user failed, falling back to HTTP')

    headers = {'Authorization': f'Bearer {access_token}', 'apikey': SUPABASE_ANON_KEY}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        # Inspect response (if available) for Supabase specific headers to provide clearer logs
        try:
            status = resp.status_code
            sb_code = resp.headers.get('x-sb-error-code')
            logger.warning(f'get_user_from_token HTTP {status} x-sb-error-code={sb_code}')
            if status in (403, 404) and sb_code == 'user_not_found':
                # This means the JWT's `sub` user id does not exist in auth.users
                raise ValueError('user_not_found')
        except NameError:
            pass
        logger.exception('Failed to fetch user from token')
        raise


def logout_token(access_token: str) -> dict:
    """Revoke a session token using Supabase auth logout endpoint."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/logout"
    headers = {'Authorization': f'Bearer {access_token}', 'apikey': SUPABASE_ANON_KEY}
    try:
        resp = requests.post(url, headers=headers, timeout=10)
        logger.debug(f"Logout response status={resp.status_code} text={resp.text}")
        resp.raise_for_status()
        return {'status': 'ok'}
    except Exception:
        logger.exception('Failed to logout')
        raise


def send_password_reset(email: str) -> dict:
    """Trigger Supabase password recovery email (recover endpoint)."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/recover"
    payload = {'email': email}
    headers = {'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json'}
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        logger.debug(f"Password reset response status={resp.status_code} text={resp.text}")
        resp.raise_for_status()
        return {'status': 'ok'}
    except Exception:
        logger.exception('Failed to request password reset')
        raise


def get_profile_by_user_id(user_id: str) -> list:
    """Fetch user_profile rows matching a given user_id."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    params = {'user_id': f'eq.{user_id}'}
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to fetch profile by user_id')
        raise


def create_notification(user_id: str, notification_type: str, title: str, message: str, data: dict = None) -> dict:
    """Create a notification row in the `notifications` table via PostgREST."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
    body = {
        'user_id': user_id,
        'type': notification_type,
        'title': title,
        'message': message,
        'read': False,
        'created_at': datetime.utcnow().isoformat()
    }
    if data is not None:
        try:
            body['data'] = json.dumps(data)
        except Exception:
            body['data'] = data

    try:
        resp = requests.post(url, headers=_postgrest_headers(), json=body, timeout=10)
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {'status_text': resp.text}
    except Exception:
        logger.exception('Failed to create notification')
        raise


def list_notifications(user_id: str, limit: int = 50, unread_only: bool = False, notif_type: str = None, since: str = None, until: str = None) -> list:
    """List notifications for a given user with optional filters."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
    params = {}
    params['user_id'] = f'eq.{user_id}'
    if unread_only:
        params['read'] = 'eq.false'
    if notif_type:
        params['type'] = f'eq.{notif_type}'
    if since:
        params['created_at'] = f'gte.{since}'
    if until:
        params['created_at'] = f'lt.{until}'
    # order by newest first
    params['order'] = 'created_at.desc'
    params['limit'] = str(limit)

    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to list notifications')
        raise


def mark_notification_read(notification_id: str, read: bool = True) -> dict:
    """Mark a specific notification as read/unread."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/notifications?id=eq.{notification_id}"
    body = {'read': bool(read)}
    try:
        resp = requests.patch(url, headers=_postgrest_headers(), json=body, timeout=10)
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {'status_text': resp.text}
    except Exception:
        logger.exception('Failed to mark notification read')
        raise


def get_admin_user_ids(limit: int = 100) -> list:
    """Return a list of user_id values for admin and superadmin profiles."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    # Query for roles or boolean admin flags
    params = {
        'or': 'role.eq.admin,role.eq.superadmin,is_admin.eq.true,is_superadmin.eq.true',
        'select': 'user_id',
        'limit': str(limit)
    }
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        rows = resp.json()
        return [r.get('user_id') for r in rows if r.get('user_id')]
    except Exception:
        logger.exception('Failed to get admin user ids')
        raise


def get_user_eligibilities(user_id: str) -> list:
    """Fetch eligibility audit rows for user_id from user_eligibility."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_eligibility"
    params = {'user_id': f'eq.{user_id}'}
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to fetch user eligibilities')
        raise


def update_onboarding_state(user_id: str, onboarding_state: dict) -> dict:
    """Patch the onboarding_state JSONB on the user_profile for the given user_id."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?user_id=eq.{user_id}"
    body = {'onboarding_state': json.dumps(onboarding_state)}
    try:
        logger.debug(f"Updating onboarding_state for user_id={user_id}")
        resp = requests.patch(url, headers=_postgrest_headers(), json=body, timeout=10)
        logger.debug(f"Update onboarding response: status={resp.status_code} text={resp.text}")
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {'status_text': resp.text}
    except Exception:
        logger.exception('Failed to update onboarding state')
        raise


def insert_user_profile(user_id: str, name: str, email: str, phone: str, identity_code: str, otp: str = None, otp_expires_at: datetime = None, eligibility: dict = None, verified: bool = False) -> dict:
    """Insert a record into user_profile table via PostgREST.
    Optional `eligibility` dict can include rating/title/message/confidence/raw.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    body = {
        'user_id': user_id,
        'full_name': name,
        'email': email,
        'phone': phone,
        'identity_code': identity_code,
        'verified': bool(verified),
        'created_at': datetime.utcnow().isoformat()
    }
    # include OTP fields only when provided
    if otp is not None and otp_expires_at is not None:
        body['email_otp'] = otp
        body['otp_expires_at'] = otp_expires_at.isoformat()
    # include eligibility summary if provided
    if eligibility:
        try:
            body['eligibility_rating'] = int(eligibility.get('rating')) if eligibility.get('rating') is not None else None
        except Exception:
            body['eligibility_rating'] = None
        body['eligibility_title'] = eligibility.get('title')
        body['eligibility_message'] = eligibility.get('message')
        body['eligibility_confidence'] = int(eligibility.get('confidence')) if eligibility.get('confidence') is not None else None
        body['eligibility_raw'] = json.dumps(eligibility.get('raw')) if eligibility.get('raw') is not None else None
    try:
        logger.debug(f"Inserting user_profile: url={url} body={body}")
        resp = requests.post(url, headers=_postgrest_headers(), json=body, timeout=15)
        logger.debug(f"Supabase response status={resp.status_code} text={resp.text}")
        resp.raise_for_status()
        logger.info(f"Inserted profile for user_id={user_id}")
        try:
            return resp.json()
        except Exception:
            return {'status_text': resp.text}
    except Exception:
        logger.exception('Failed to insert user profile')
        raise


def get_profile_by_email(email: str) -> list:
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    params = {'email': f'eq.{email}'}
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to fetch profile by email')
        raise


def verify_profile_otp(email: str, otp: str) -> dict:
    """Verify OTP stored in user_profile and mark verified.
    Returns the updated profile row if success, else raises.
    """
    profiles = get_profile_by_email(email)
    if not profiles:
        raise ValueError('profile_not_found')
    profile = profiles[0]
    if profile.get('email_otp') != otp:
        raise ValueError('invalid_otp')
    # check expiry
    expires = profile.get('otp_expires_at')
    if expires:
        exp_dt = datetime.fromisoformat(expires)
        if datetime.utcnow() > exp_dt:
            raise ValueError('otp_expired')

    # mark verified
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?email=eq.{email}"
    body = {'verified': True, 'email_otp': None}
    try:
        resp = requests.patch(url, headers=_postgrest_headers(), json=body, timeout=10)
        resp.raise_for_status()
        logger.info(f"Verified profile for email={email}")
        return resp.json()
    except Exception:
        logger.exception('Failed to mark profile verified')
        raise


def mark_profile_verified_by_email(email: str) -> dict:
    """Mark the profile as verified without checking OTP. (Dev/testing helper)"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?email=eq.{email}"
    body = {'verified': True, 'email_otp': None}
    try:
        resp = requests.patch(url, headers=_postgrest_headers(), json=body, timeout=10)
        resp.raise_for_status()
        logger.info(f"Marked profile verified for email={email} (dev override)")
        return resp.json()
    except Exception:
        logger.exception('Failed to mark profile verified (dev)')
        raise


def update_profile_otp(email: str, otp: str, otp_expires_at: datetime) -> dict:
    """Update the OTP and expiry for a profile (used for resend)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?email=eq.{email}"
    body = {'email_otp': otp, 'otp_expires_at': otp_expires_at.isoformat()}
    try:
        resp = requests.patch(url, headers=_postgrest_headers(), json=body, timeout=10)
        resp.raise_for_status()
        logger.info(f"Updated OTP for {email}")
        return resp.json()
    except Exception:
        logger.exception('Failed to update profile OTP')
        raise


def update_profile_user_id(email: str, user_id: str) -> dict:
    """Update the user_profile row to set the Supabase auth user_id after creating auth user."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?email=eq.{email}"
    body = {'user_id': user_id}
    try:
        logger.debug(f"Updating profile user_id for {email} -> {user_id}")
        resp = requests.patch(url, headers=_postgrest_headers(), json=body, timeout=10)
        logger.debug(f"Supabase update response: status={resp.status_code} text={resp.text}")
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {'status_text': resp.text}
    except Exception:
        logger.exception('Failed to update profile user_id')
        raise


def insert_user_eligibility(user_id: str, uploaded_file: str, eligibility: dict, case_id: str = None) -> dict:
    """Insert an eligibility audit row into `user_eligibility` table.
    eligibility is a dict that may contain rating/title/message/confidence/raw
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_eligibility"
    body = {
        'user_id': user_id,
        'uploaded_file': uploaded_file,
        'eligibility_rating': None,
        'eligibility_title': None,
        'eligibility_message': None,
        'eligibility_confidence': None,
        'eligibility_raw': None
    }
    if eligibility:
        try:
            body['eligibility_rating'] = int(eligibility.get('rating')) if eligibility.get('rating') is not None else None
        except Exception:
            body['eligibility_rating'] = None
        body['eligibility_title'] = eligibility.get('title')
        body['eligibility_message'] = eligibility.get('message')
        try:
            body['eligibility_confidence'] = int(eligibility.get('confidence')) if eligibility.get('confidence') is not None else None
        except Exception:
            body['eligibility_confidence'] = None
        # store raw JSON; PostgREST will accept JSON string for jsonb
        try:
            body['eligibility_raw'] = json.dumps(eligibility.get('raw')) if eligibility.get('raw') is not None else json.dumps(eligibility)
        except Exception:
            body['eligibility_raw'] = None
    # include case_id if provided (nullable uuid FK to cases.id)
    # Note: case_id column may not exist in older schemas
    if case_id:
        body['case_id'] = case_id

    logger.debug(f"Inserting user_eligibility with body keys: {list(body.keys())}, user_id={user_id}, case_id={case_id}")

    try:
        resp = requests.post(url, headers=_postgrest_headers(), json=body, timeout=15)
        if not resp.ok:
            # If error mentions case_id column not found, try without it (backwards compatibility)
            if 'case_id' in resp.text and 'case_id' in body:
                logger.warning(f"case_id column not found in user_eligibility table, retrying without it")
                body_without_case_id = {k: v for k, v in body.items() if k != 'case_id'}
                resp = requests.post(url, headers=_postgrest_headers(), json=body_without_case_id, timeout=15)
                if resp.ok:
                    logger.info(f"Inserted user_eligibility row for user_id={user_id} (without case_id)")
                    return resp.json()
            
            logger.error(f"Failed to insert user_eligibility. Status: {resp.status_code}, Response: {resp.text}")
            logger.error(f"Request body: {json.dumps(body, indent=2)}")
        resp.raise_for_status()
        logger.info(f"Inserted user_eligibility row for user_id={user_id}")
        return resp.json()
    except Exception:
        logger.exception('Failed to insert user_eligibility')
        raise


def get_user_eligibility(user_id: str = None, case_id: str = None) -> list:
    """
    Retrieve eligibility records from user_eligibility table.
    Can filter by user_id, case_id, or both.
    
    Args:
        user_id: Filter by user ID (optional)
        case_id: Filter by case ID (optional)
    
    Returns:
        list: Eligibility records ordered by processed_at descending
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_eligibility"
    # Try to order by timestamp column (could be processed_at or uploaded_at depending on schema version)
    # If that fails, just order by id
    params = {}
    
    if user_id:
        params['user_id'] = f'eq.{user_id}'
    if case_id:
        params['case_id'] = f'eq.{case_id}'
    
    try:
        if _has_supabase_py and _supabase_admin is not None:
            try:
                query = _supabase_admin.table('user_eligibility').select('*')
                if user_id:
                    query = query.eq('user_id', user_id)
                if case_id:
                    query = query.eq('case_id', case_id)
                # Try ordering - if column doesn't exist, just return unordered
                try:
                    res = query.order('processed_at', desc=True).execute()
                except Exception:
                    try:
                        res = query.order('uploaded_at', desc=True).execute()
                    except Exception:
                        res = query.execute()
                return res.data if hasattr(res, 'data') else (res if isinstance(res, list) else [])
            except Exception:
                logger.debug('supabase-py query failed; falling back to HTTP')
        
        # HTTP fallback - try without ordering first to avoid column errors
        resp = requests.get(url, params=params, headers=_postgrest_headers(), timeout=10)
        
        # If error mentions case_id or we get 400, retry without case_id filter (backwards compatibility)
        if not resp.ok and case_id:
            logger.warning(f"Query with case_id failed (status={resp.status_code}), retrying without case_id filter. Response: {resp.text[:200]}")
            params_without_case_id = {k: v for k, v in params.items() if k != 'case_id'}
            resp = requests.get(url, params=params_without_case_id, headers=_postgrest_headers(), timeout=10)
        
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception(f'Failed to get user_eligibility records')
        return []


def update_user_eligibility(record_id: str, fields: dict) -> dict:
    """
    Update a user_eligibility record with new field values.
    
    Args:
        record_id: The UUID of the record to update
        fields: Dictionary of fields to update (e.g., {'eligibility_raw': {...}})
    
    Returns:
        dict: Updated record
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_eligibility"
    params = {'id': f'eq.{record_id}'}
    
    # Convert eligibility_raw to JSON string if it's a dict
    body = {}
    for key, value in fields.items():
        if key == 'eligibility_raw' and isinstance(value, dict):
            body[key] = json.dumps(value)
        else:
            body[key] = value
    
    try:
        if _has_supabase_py and _supabase_admin is not None:
            try:
                res = _supabase_admin.table('user_eligibility').update(body).eq('id', record_id).execute()
                return res.data[0] if hasattr(res, 'data') and res.data else {}
            except Exception:
                logger.debug('supabase-py update failed; falling back to HTTP')
        
        # HTTP fallback
        resp = requests.patch(url, params=params, headers=_postgrest_headers(), json=body, timeout=10)
        resp.raise_for_status()
        result = resp.json()
        return result[0] if isinstance(result, list) and result else result
    except Exception:
        logger.exception(f'Failed to update user_eligibility record {record_id}')
        raise


def create_case(user_id: str, title: str = None, description: str = None, metadata: dict = None) -> dict:
    """Create a new case row for the given user_id.
    Returns the created row representation.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
    body = {'user_id': user_id, 'title': title, 'description': description}
    if metadata is not None:
        try:
            body['metadata'] = json.dumps(metadata)
        except Exception:
            body['metadata'] = None
    # Prefer supabase-py admin client if available (gives cleaner SDK experience)
    if _has_supabase_py and _supabase_admin is not None:
        try:
            logger.debug('Creating case via supabase-py admin client')
            tbl = getattr(_supabase_admin, 'table', None)
            if callable(tbl):
                # supabase-py insert interface: client.table('cases').insert(body).execute()
                res = _supabase_admin.table('cases').insert(body).execute()
                return _normalize_sdk_response(res)
        except Exception:
            logger.exception('supabase-py create_case failed, falling back to HTTP')

    try:
        resp = requests.post(url, headers=_postgrest_headers(), json=body, timeout=15)
        resp.raise_for_status()
        logger.info(f"Created case for user_id={user_id}")
        return resp.json()
    except Exception:
        logger.exception('Failed to create case')
        raise


def get_case(case_id: str) -> list:
    """Fetch a case by id. Returns list (PostgREST returns array)."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
    params = {'id': f'eq.{case_id}'}
    # Prefer supabase-py admin client when available
    if _has_supabase_py and _supabase_admin is not None:
        try:
            logger.debug('Fetching case via supabase-py admin client')
            tbl = getattr(_supabase_admin, 'table', None)
            if callable(tbl):
                res = _supabase_admin.table('cases').select('*').eq('id', case_id).execute()
                return _normalize_sdk_response(res)
        except Exception:
            logger.exception('supabase-py get_case failed, falling back to HTTP')

    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        # If the cases table does not exist on the remote (404), return empty list
        try:
            if resp is not None and getattr(resp, 'status_code', None) == 404:
                logger.warning(f'cases table not found (404) when fetching case_id={case_id}; returning empty list')
                return []
        except Exception:
            pass
        logger.exception('Failed to fetch case')
        raise


def list_cases_for_user(user_id: str) -> list:
    """List case rows for a given user_id."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
    params = {'user_id': f'eq.{user_id}'}
    # Prefer supabase-py admin client if available
    if _has_supabase_py and _supabase_admin is not None:
        try:
            logger.debug('Listing cases via supabase-py admin client')
            tbl = getattr(_supabase_admin, 'table', None)
            if callable(tbl):
                res = _supabase_admin.table('cases').select('*').eq('user_id', user_id).execute()
                return _normalize_sdk_response(res)
        except Exception:
            logger.exception('supabase-py list_cases_for_user failed, falling back to HTTP')

    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        # If the cases table does not exist on the remote (404), return empty list
        try:
            if resp is not None and getattr(resp, 'status_code', None) == 404:
                logger.warning(f'cases table not found (404) when listing cases for user_id={user_id}; returning empty list')
                return []
        except Exception:
            pass
        logger.exception('Failed to list cases for user')
        raise


def list_all_cases_paginated(limit: int = 10, offset: int = 0, filters: dict = None, search: str = None) -> dict:
    """List all cases with pagination and filters."""
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
    
    # Build params for pagination
    params = {
        'limit': str(limit),
        'offset': str(offset),
        'order': 'created_at.desc'
    }
    
    # Add filters
    if filters:
        for key, value in filters.items():
            params[key] = value
    
    # Add search filter (search in title)
    if search:
        params['or'] = f'title.ilike.*{search}*,id.ilike.*{search}*'
    
    headers = _postgrest_headers()
    headers['Prefer'] = 'count=exact'
    
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        
        # Get total count from Content-Range header
        total = 0
        content_range = resp.headers.get('Content-Range')
        if content_range:
            # Format: "0-9/100" or "*/0"
            parts = content_range.split('/')
            if len(parts) > 1:
                try:
                    total = int(parts[1])
                except (ValueError, IndexError):
                    pass
        
        cases = resp.json()
        return {'cases': cases, 'total': total}
    except Exception:
        logger.exception('Failed to list all cases paginated')
        return {'cases': [], 'total': 0}


def update_case(case_id: str, fields: dict) -> dict:
    """Update a case row by id with provided fields."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    # Try using Supabase Python client first (handles JSON better)
    if _has_supabase_py and _supabase_admin is not None:
        try:
            logger.debug(f"Using Supabase Python client to update case {case_id}")
            res = _supabase_admin.table('cases').update(fields).eq('id', case_id).execute()
            if res.data:
                return res.data[0] if isinstance(res.data, list) and len(res.data) > 0 else res.data
            return {}
        except Exception as e:
            logger.warning(f"Supabase Python client failed, falling back to REST API: {e}")
    
    # Fallback to REST API
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases?id=eq.{case_id}"
    try:
        resp = requests.patch(url, headers=_postgrest_headers(), json=fields, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to update case')
        raise


def delete_case(case_id: str) -> dict:
    """Delete a case by id."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases?id=eq.{case_id}"
    try:
        resp = requests.delete(url, headers=_postgrest_headers(), timeout=15)
        resp.raise_for_status()
        return {'status': 'ok'}
    except Exception:
        logger.exception('Failed to delete case')
        raise


def admin_list_profiles(limit: int = 100) -> list:
    """Return up to `limit` user_profile rows for admin dashboards."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    params = {'select': '*', 'order': 'created_at.desc', 'limit': limit}
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to list profiles for admin')
        # Return empty list instead of raising to allow best-effort dashboards
        return []


def admin_list_cases(limit: int = 100) -> list:
    """Return up to `limit` cases for admin dashboards."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/cases"
    params = {'select': '*', 'order': 'created_at.desc', 'limit': limit}
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to list cases for admin')
        return []


def admin_count_profiles() -> int:
    """Best-effort count of profiles. May be expensive for very large tables."""
    try:
        rows = admin_list_profiles(limit=100000)
        return len(rows) if rows else 0
    except Exception:
        logger.exception('Failed to count profiles')
        return 0


def admin_list_users(limit: int = 100) -> list:
    """List regular users (exclude admin/superadmin/subadmin)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    # Use PostgREST filter to exclude roles we consider admin-level
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    # Include profiles where role is NULL (regular users) OR role not in admin/subadmin list.
    # PostgREST `or` syntax: or=(role.is.null,role.not.in.(admin,superadmin,subadmin))
    params = {'select': '*', 'or': '(role.is.null,role.not.in.(admin,superadmin,subadmin))', 'limit': limit}
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to list regular users')
        return []


def admin_list_subadmins(limit: int = 100) -> list:
    """List subadmin profiles (role = 'subadmin')."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    params = {'select': '*', 'role': 'eq.subadmin', 'limit': limit}
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to list subadmins')
        return []


def admin_create_subadmin(email: str, name: str = None, phone: str = None, password: str = None, permissions: dict = None) -> dict:
    """Create an auth user and insert/patch a profile with role='subadmin'. Returns created profile or error."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    # Validate email
    if not email or '@' not in email:
        raise ValueError('Invalid email address')
    
    # create auth user (service role required)
    try:
        # If password not supplied, generate a random one
        if not password:
            import secrets as _secrets
            password = _secrets.token_urlsafe(16)
        
        # Ensure password meets minimum requirements
        if len(password) < 6:
            raise ValueError('Password must be at least 6 characters')
        
        auth_res = create_auth_user(email=email, password=password, phone=phone, email_confirm=True)
        # extract user id
        user_id = auth_res.get('id') or auth_res.get('user', {}).get('id') or auth_res.get('aud')
        
        if not user_id:
            raise ValueError('Failed to get user ID from auth response')
            
    except ValueError as e:
        logger.exception(f'Validation error creating auth user: {str(e)}')
        raise
    except Exception:
        logger.exception('Failed to create auth user for subadmin')
        raise

    try:
        # upsert profile with admin_permissions JSONB column
        body = {
            'user_id': str(user_id),
            'full_name': name or '',
            'email': email.lower(),  # Normalize email to lowercase
            'phone': (phone or '').strip(),
            'role': 'subadmin',
            'is_subadmin': True,
            'verified': True,
            'admin_permissions': permissions or {},
            'created_at': datetime.utcnow().isoformat()
        }
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
        resp = requests.post(url, headers=_postgrest_headers(), json=body, timeout=15)
        resp.raise_for_status()
        profile_data = resp.json()
        return profile_data
    except Exception:
        logger.exception('Failed to insert subadmin profile')
        raise


def admin_update_profile(user_id: str, fields: dict) -> dict:
    """Patch the user_profile row for a given user_id."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?user_id=eq.{user_id}"
    try:
        resp = requests.patch(url, headers=_postgrest_headers(), json=fields, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to update profile')
        raise


def admin_upsert_profile(user_id: str, fields: dict) -> dict:
    """Upsert a user_profile row by updating the existing record.
    Performs a PATCH request filtered by user_id to safely update or insert via merge.
    Returns the resulting row(s).
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    # First, try to update the existing record
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    body = {**fields, 'user_id': user_id}
    headers = _postgrest_headers().copy()
    headers['Prefer'] = 'return=representation'
    
    try:
        # Use PATCH with user_id filter to update existing record
        # This avoids 409 Conflict errors from unique constraint violations
        query = f"user_id=eq.{user_id}"
        patch_url = f"{url}?{query}"
        resp = requests.patch(patch_url, headers=headers, json=fields, timeout=15)
        
        # If record exists, patch will return 200 with updated rows
        if resp.status_code == 200:
            result = resp.json()
            if result and len(result) > 0:
                return result
        
        # If no rows were updated (404 or empty result), insert a new record
        if resp.status_code == 200 and (not result or len(result) == 0):
            resp = requests.post(url, headers=headers, json=body, timeout=15)
            resp.raise_for_status()
            return resp.json()
        
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to upsert user_profile')
        raise


def admin_delete_auth_user(user_id: str) -> dict:
    """Delete an auth user directly by user_id."""
    try:
        if _has_supabase_py and _supabase_admin:
            # Use the supabase-py client for proper admin deletion
            logger.info(f'Deleting auth user {user_id} using supabase-py admin client')
            try:
                response = _supabase_admin.auth.admin.delete_user(user_id)
                logger.info(f'Successfully deleted auth user {user_id}')
                return {'status': 'ok', 'data': response}
            except Exception as e:
                # If user not found, that's OK (already deleted)
                if 'not found' in str(e).lower():
                    logger.info(f'User {user_id} not found in auth (already deleted)')
                    return {'status': 'ok', 'note': 'user_already_deleted'}
                raise
        else:
            # Fallback to HTTP requests if supabase-py is not available
            if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
                raise RuntimeError('Supabase config missing')
            
            url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{user_id}"
            resp = requests.delete(url, headers=_admin_headers(), timeout=15)
            
            if resp.status_code in [200, 204]:
                logger.info(f'Successfully deleted auth user {user_id} via HTTP')
                return {'status': 'ok'}
            elif resp.status_code == 404:
                logger.info(f'User {user_id} not found (already deleted)')
                return {'status': 'ok', 'note': 'user_already_deleted'}
            else:
                logger.error(f'Delete failed with status {resp.status_code}: {resp.text}')
                resp.raise_for_status()
                
    except Exception as e:
        logger.exception(f'Failed to delete auth user {user_id}: {e}')
        raise


def delete_user_profile(user_id: str) -> dict:
    """Delete a user profile from user_profile table."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?user_id=eq.{user_id}"
    try:
        resp = requests.delete(url, headers=_postgrest_headers(), timeout=15)
        # 404 or 0 rows deleted is fine - just means user doesn't exist
        if resp.status_code in [200, 204, 404]:
            logger.info(f'User profile deleted for {user_id}')
            return {'status': 'ok'}
        resp.raise_for_status()
        return {'status': 'ok'}
    except Exception:
        logger.exception('Failed to delete user profile')
        raise


# Notification helpers
def create_notification(user_id: str, notification_type: str, title: str, message: str = '', data: dict = None) -> dict:
    """Create a notification for a user."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
    body = {
        'user_id': user_id,
        'type': notification_type,
        'title': title,
        'message': message or '',
        'data': data or {},
        'read': False
    }
    try:
        resp = requests.post(url, headers=_postgrest_headers(), json=body, timeout=15)
        resp.raise_for_status()
        result = resp.json()
        return result[0] if isinstance(result, list) and len(result) > 0 else result
    except Exception:
        logger.exception('Failed to create notification')
        raise


def list_notifications(user_id: str, limit: int = 50, unread_only: bool = False) -> list:
    """List notifications for a user."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
    params = {
        'select': '*',
        'user_id': f'eq.{user_id}',
        'order': 'created_at.desc',
        'limit': limit
    }
    if unread_only:
        params['read'] = 'eq.false'
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception('Failed to list notifications')
        return []


def mark_notification_read(notification_id: str, read: bool = True) -> dict:
    """Mark a notification as read/unread."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/notifications?id=eq.{notification_id}"
    try:
        resp = requests.patch(url, headers=_postgrest_headers(), json={'read': read}, timeout=15)
        resp.raise_for_status()
        result = resp.json()
        return result[0] if isinstance(result, list) and len(result) > 0 else result
    except Exception:
        logger.exception('Failed to mark notification read')
        raise


def get_admin_user_ids() -> list:
    """Get all admin/superadmin user_ids for notifications."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile"
    params = {
        'select': 'user_id',
        'or': '(role.eq.admin,role.eq.superadmin,is_admin.eq.true,is_superadmin.eq.true)',
        'limit': 100
    }
    try:
        resp = requests.get(url, headers=_postgrest_headers(), params=params, timeout=15)
        resp.raise_for_status()
        rows = resp.json()
        return [row['user_id'] for row in rows if row.get('user_id')]
    except Exception:
        logger.exception('Failed to get admin user_ids')
        return []


def storage_upload_file(bucket: str, path: str, file_bytes: bytes, content_type: str = 'application/octet-stream', upsert: bool = True) -> dict:
    """Upload a file to Supabase Storage using the service role key.
    Returns a dict with at least `public_url` on success.

    Attempts to use `supabase-py` admin client when available; otherwise falls
    back to the REST storage upload endpoint. The returned public URL follows
    the Supabase storage public object URL pattern.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase storage config missing')

    # Normalize path: remove leading slash
    norm_path = path.lstrip('/')

    # First try supabase-py admin client if present
    if _has_supabase_py and _supabase_admin is not None:
        try:
            logger.debug(f'Uploading to supabase storage via supabase-py: bucket={bucket} path={norm_path}')
            storage = getattr(_supabase_admin, 'storage', None)
            if storage is not None:
                # supabase-py exposes `.from_` or `from_` depending on version
                try:
                    bucket_client = _supabase_admin.storage.from_(bucket)
                except Exception:
                    bucket_client = _supabase_admin.storage().from_(bucket) if callable(getattr(_supabase_admin, 'storage', None)) else None

                if bucket_client is not None:
                    # Many client versions accept either a local file path or bytes.
                    # Try common upload signatures; if they fail, write a temp file and pass its path.
                    try:
                        # First: try uploading raw bytes (some clients accept bytes)
                        res = bucket_client.upload(norm_path, file_bytes, {'content-type': content_type})
                        data = _normalize_sdk_response(res)
                        public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{urllib.parse.quote(norm_path)}"
                        return {'public_url': public_url, 'sdk_response': data}
                    except Exception as e1:
                        logger.debug('supabase-py upload with raw bytes failed; attempting temp-file fallback', exc_info=True)
                        # If bucket does not exist, raise a clear error to caller
                        try:
                            msg = str(e1)
                            if 'Bucket not found' in msg or 'bucket not found' in msg:
                                raise RuntimeError('bucket_not_found')
                        except Exception:
                            pass
                        # Temp-file fallback: write bytes to a temporary file and pass the filename
                        try:
                            import tempfile, io, os
                            # Derive a suffix from the requested path
                            suf = os.path.splitext(norm_path)[1] or ''
                            # On Windows storage3 may need a real file path that is closed.
                            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suf)
                            try:
                                tmp.write(file_bytes)
                                tmp.flush()
                                tmp.close()
                                # Some clients expect a file path string
                                res2 = bucket_client.upload(norm_path, tmp.name, {'content-type': content_type})
                                data2 = _normalize_sdk_response(res2)
                                public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{urllib.parse.quote(norm_path)}"
                                return {'public_url': public_url, 'sdk_response': data2}
                            finally:
                                try:
                                    os.unlink(tmp.name)
                                except Exception:
                                    pass
                        except Exception:
                            logger.exception('supabase-py storage upload attempted with temp-file but failed; falling back to HTTP')
        except Exception:
            logger.exception('supabase-py storage upload failed; falling back to HTTP')

    # Fallback: use HTTP PUT to storage REST endpoint
    try:
        upsert_qs = 'true' if upsert else 'false'
        url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{norm_path}?upsert={upsert_qs}"
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': content_type,
        }
        logger.debug(f'Uploading to supabase storage via HTTP PUT: {url}')
        resp = requests.put(url, headers=headers, data=file_bytes, timeout=30)
        # Supabase may return 200/201/204 on success; raise otherwise
        if resp.status_code not in (200, 201, 204):
            logger.warning(f'storage upload HTTP status={resp.status_code} text={resp.text}')
            # If the bucket does not exist, respond with a clear runtime error
            try:
                body = resp.json()
                if isinstance(body, dict) and ('Bucket not found' in str(body.get('message')) or body.get('error') == 'Bucket not found'):
                    raise RuntimeError('bucket_not_found')
            except Exception:
                pass
            resp.raise_for_status()
        public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{urllib.parse.quote(norm_path)}"
        return {'public_url': public_url, 'http_status': resp.status_code}
    except Exception:
        logger.exception('Failed to upload file to Supabase Storage')
        raise


# ========================================
# Case Document Management
# ========================================

def insert_case_document(case_id: str, file_path: str, file_name: str, file_type: str = None, 
                        file_size: int = None, document_type: str = 'general', 
                        uploaded_by: str = None, metadata: dict = None) -> dict:
    """
    Insert a document record into case_documents table.
    
    Args:
        case_id: UUID of the case
        file_path: Path in storage (e.g., 'cases/{case_id}/documents/{filename}')
        file_name: Original filename
        file_type: MIME type (e.g., 'application/pdf')
        file_size: Size in bytes
        document_type: Category (medical_report, pay_slip, identity, general)
        uploaded_by: User ID who uploaded
        metadata: Additional JSON metadata
    
    Returns:
        dict: Created document record
    """
    from datetime import datetime, timezone
    
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/case_documents"
    body = {
        'case_id': case_id,
        'file_path': file_path,
        'file_name': file_name,
        'file_type': file_type,
        'file_size': file_size,
        'document_type': document_type,
        'uploaded_by': uploaded_by,
        'uploaded_at': datetime.now(timezone.utc).isoformat(),
        'metadata': metadata or {}
    }
    
    headers = _postgrest_headers()
    headers['Prefer'] = 'return=representation'
    
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data[0] if isinstance(data, list) and len(data) > 0 else data
    except requests.exceptions.HTTPError as e:
        error_detail = ''
        try:
            error_detail = resp.text
        except:
            pass
        logger.error(f'Failed to insert case document for case_id={case_id}, status={resp.status_code}, error={error_detail}, body={body}')
        raise
    except Exception:
        logger.exception(f'Failed to insert case document for case_id={case_id}')
        raise


def get_case_documents(case_id: str) -> list:
    """
    Retrieve all documents for a specific case.
    
    Args:
        case_id: UUID of the case
    
    Returns:
        list: All document records for the case, ordered by upload date descending
    """
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/case_documents"
    params = {
        'case_id': f'eq.{case_id}',
        'order': 'uploaded_at.desc'
    }
    
    try:
        if _has_supabase_py and _supabase_admin is not None:
            try:
                res = _supabase_admin.table('case_documents').select('*').eq('case_id', case_id).order('uploaded_at', desc=True).execute()
                return res.data if hasattr(res, 'data') else (res if isinstance(res, list) else [])
            except Exception:
                logger.debug('supabase-py query failed; falling back to HTTP')
        
        # HTTP fallback
        resp = requests.get(url, params=params, headers=_postgrest_headers(), timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception(f'Failed to get case documents for case_id={case_id}')
        return []


def delete_case_document(document_id: str) -> dict:
    """
    Delete a document record from case_documents table.
    Does NOT delete the actual file from storage - that should be done separately.
    
    Args:
        document_id: UUID of the document record
    
    Returns:
        dict: Response from delete operation
    """
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/case_documents?id=eq.{document_id}"
    
    try:
        resp = requests.delete(url, headers=_postgrest_headers(), timeout=10)
        resp.raise_for_status()
        return {'status': 'deleted', 'document_id': document_id}
    except Exception:
        logger.exception(f'Failed to delete case document document_id={document_id}')
        raise


def storage_delete_file(bucket: str, path: str) -> dict:
    """
    Delete a file from Supabase Storage.
    
    Args:
        bucket: Storage bucket name
        path: File path within the bucket
    
    Returns:
        dict: Response from delete operation
    """
    norm_path = path.lstrip('/')
    
    try:
        if _has_supabase_py and _supabase_admin is not None:
            try:
                bucket_client = _supabase_admin.storage.from_(bucket)
                res = bucket_client.remove([norm_path])
                return {'status': 'deleted', 'path': norm_path, 'sdk_response': res}
            except Exception:
                logger.debug('supabase-py delete failed; falling back to HTTP')
        
        # HTTP fallback
        url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{norm_path}"
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'apikey': SUPABASE_SERVICE_ROLE_KEY
        }
        resp = requests.delete(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return {'status': 'deleted', 'path': norm_path, 'http_status': resp.status_code}
    except Exception:
        logger.exception(f'Failed to delete file from storage: {bucket}/{path}')
        raise


# Permission management for subadmins
def update_subadmin_permissions(user_id: str, permissions: dict) -> dict:
    """Update subadmin permissions in admin_permissions JSONB column."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError('Supabase config missing')
    
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_profile?user_id=eq.{user_id}"
        body = {'admin_permissions': permissions}
        headers = _postgrest_headers().copy()
        headers['Prefer'] = 'return=representation'
        resp = requests.patch(url, headers=headers, json=body, timeout=15)
        resp.raise_for_status()
        return {'status': 'ok'}
    except Exception:
        logger.exception(f'Failed to update subadmin permissions for {user_id}')
        raise


# Agent prompt management
_agent_cache = {}  # Cache for agent prompts to reduce DB calls

def get_agent_prompt(agent_name: str, fallback_prompt: str = None) -> dict:
    """
    Fetch agent configuration from database by name.
    Returns dict with: prompt, model, output_schema
    Uses in-memory cache to reduce DB calls.
    Falls back to provided fallback_prompt if agent not found or DB unavailable.
    """
    # Check cache first
    if agent_name in _agent_cache:
        logger.debug(f"Using cached prompt for agent: {agent_name}")
        return _agent_cache[agent_name]
    
    try:
        if not _has_supabase_py or not _supabase_admin:
            logger.warning(f"Supabase not configured, using fallback prompt for {agent_name}")
            return {
                'prompt': fallback_prompt,
                'model': 'gpt-4o',
                'output_schema': None
            }
        
        # Fetch from database
        response = _supabase_admin.table('agents').select('*').eq('name', agent_name).eq('is_active', True).execute()
        
        if response.data and len(response.data) > 0:
            agent = response.data[0]
            result = {
                'prompt': agent.get('prompt'),
                'model': agent.get('model', 'gpt-4o'),
                'output_schema': agent.get('output_schema')
            }
            # Cache the result
            _agent_cache[agent_name] = result
            logger.info(f"Loaded agent '{agent_name}' from database (model: {result['model']})")
            return result
        else:
            logger.warning(f"Agent '{agent_name}' not found in database, using fallback")
            return {
                'prompt': fallback_prompt,
                'model': 'gpt-4o',
                'output_schema': None
            }
    except Exception as e:
        logger.exception(f"Failed to fetch agent '{agent_name}' from database: {e}")
        return {
            'prompt': fallback_prompt,
            'model': 'gpt-4o',
            'output_schema': None
        }


def clear_agent_cache():
    """Clear the agent prompt cache. Useful after updating agents in the database."""
    global _agent_cache
    _agent_cache = {}
    logger.info("Agent prompt cache cleared")
