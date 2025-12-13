from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from datetime import datetime


class UserProfileRow(BaseModel):
    id: Optional[str]
    user_id: Optional[str]
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    identity_code: Optional[str]
    email_otp: Optional[str]
    otp_expires_at: Optional[datetime]
    verified: Optional[bool] = False
    eligibility_rating: Optional[int]
    eligibility_title: Optional[str]
    eligibility_message: Optional[str]
    eligibility_confidence: Optional[int]
    eligibility_raw: Optional[Dict[str, Any]]
    created_at: Optional[datetime]


class UserEligibilityRow(BaseModel):
    id: Optional[str]
    user_id: Optional[str]
    uploaded_file: Optional[str]
    eligibility_rating: Optional[int]
    eligibility_title: Optional[str]
    eligibility_message: Optional[str]
    eligibility_confidence: Optional[int]
    eligibility_raw: Optional[Dict[str, Any]]
    processed_at: Optional[datetime]


# SQL for reference (also stored under db/migrations)
CREATE_USER_TABLES_SQL = '''
-- create user_profile and user_eligibility tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  full_name text,
  email text UNIQUE,
  phone text,
  identity_code text,
  email_otp text,
  otp_expires_at timestamptz,
  verified boolean DEFAULT false,
  eligibility_rating integer,
  eligibility_title text,
  eligibility_message text,
  eligibility_confidence integer,
  eligibility_raw jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.user_profile(user_id) ON DELETE SET NULL,
  uploaded_file text,
  eligibility_rating integer,
  eligibility_title text,
  eligibility_message text,
  eligibility_confidence integer,
  eligibility_raw jsonb,
  processed_at timestamptz DEFAULT now()
);
'''
