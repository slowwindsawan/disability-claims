from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime

class EligibilityAnswers(BaseModel):
    # Flexible structure — keys correspond to questionnaire ids
    answers: Dict[str, Any]

class EligibilityRequest(BaseModel):
    user_id: Optional[str]
    answers: Dict[str, Any]

class RuleReference(BaseModel):
    section_id: str
    quote: Optional[str]

class EligibilityResult(BaseModel):
    eligibility: str = Field(..., description='eligible|likely|needs_manual_review|not_eligible')
    reason_summary: str
    confidence: int = Field(..., ge=0, le=100)
    rule_references: List[RuleReference] = []
    required_next_steps: List[str] = []
    raw_score: Optional[float]
    raw_response: Optional[Dict[str, Any]]


# Advanced Filtering Schemas
class CaseFilterRequest(BaseModel):
    """Schema for advanced case filtering"""
    status: Optional[List[str]] = Field(None, description="Filter by case statuses")
    min_ai_score: Optional[int] = Field(None, ge=0, le=100, description="Minimum AI eligibility score")
    max_ai_score: Optional[int] = Field(None, ge=0, le=100, description="Maximum AI eligibility score")
    min_income_potential: Optional[float] = Field(None, description="Minimum income potential (from estimated_claim_amount)")
    max_income_potential: Optional[float] = Field(None, description="Maximum income potential")
    start_date: Optional[datetime] = Field(None, description="Filter cases created after this date")
    end_date: Optional[datetime] = Field(None, description="Filter cases updated before this date (last updated)")
    search_query: Optional[str] = Field(None, description="Search by client name, email, or case ID")
    limit: int = Field(100, ge=1, le=500, description="Number of results to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")


class SavedFilter(BaseModel):
    """Schema for saved filter"""
    id: Optional[str] = None
    admin_id: str
    name: str
    description: Optional[str] = None
    status: Optional[List[str]] = None
    min_ai_score: Optional[int] = None
    max_ai_score: Optional[int] = None
    min_income_potential: Optional[float] = None
    max_income_potential: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search_query: Optional[str] = None
    is_default: bool = Field(False, description="Whether this is the default filter")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SavedFilterCreate(BaseModel):
    """Schema for creating a saved filter"""
    name: str
    description: Optional[str] = None
    status: Optional[List[str]] = None
    min_ai_score: Optional[int] = None
    max_ai_score: Optional[int] = None
    min_income_potential: Optional[float] = None
    max_income_potential: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search_query: Optional[str] = None
    is_default: bool = False


class FilteredCaseResponse(BaseModel):
    """Schema for filtered case response"""
    case_id: str
    user_id: str
    client_name: Optional[str]
    client_email: Optional[str]
    client_phone: Optional[str]
    status: str
    ai_score: int
    eligibility_status: str
    estimated_claim_amount: float
    created_at: datetime
    updated_at: datetime
    products: List[str] = []
    risk_assessment: Optional[str] = None
