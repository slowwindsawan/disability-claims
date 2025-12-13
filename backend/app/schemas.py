from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

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
