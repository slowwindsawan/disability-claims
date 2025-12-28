"""
Application constants and enums for the Disability Claims system.
"""

from enum import Enum
from typing import List


class CaseStatus(str, Enum):
    """
    Case status progression enum.
    
    Status flow:
    1. INITIAL_QUESTIONNAIRE - User completes the initial eligibility questionnaire
    2. DOCUMENT_SUBMISSION - User has completed initial questionnaire but hasn't uploaded all documents
    3. SUBMISSION_PENDING - All required documents have been uploaded, awaiting final submission
    4. SUBMITTED - Case has been fully submitted and is under review
    """
    INITIAL_QUESTIONNAIRE = "Initial questionnaire"
    DOCUMENT_SUBMISSION = "Document submission"
    SUBMISSION_PENDING = "Submission pending"
    SUBMITTED = "Submitted"


class CaseStatusConstants:
    """
    String constants for case statuses.
    Use these constants throughout the app instead of hardcoded strings.
    """
    # Status strings
    INITIAL_QUESTIONNAIRE: str = "Initial questionnaire"
    DOCUMENT_SUBMISSION: str = "Document submission"
    SUBMISSION_PENDING: str = "Submission pending"
    SUBMITTED: str = "Submitted"
    
    # List of all valid statuses in order of progression
    ALL_STATUSES: List[str] = [
        INITIAL_QUESTIONNAIRE,
        DOCUMENT_SUBMISSION,
        SUBMISSION_PENDING,
        SUBMITTED,
    ]
    
    # Status progression mapping
    NEXT_STATUS: dict = {
        INITIAL_QUESTIONNAIRE: DOCUMENT_SUBMISSION,
        DOCUMENT_SUBMISSION: SUBMISSION_PENDING,
        SUBMISSION_PENDING: SUBMITTED,
        SUBMITTED: SUBMITTED,  # Final status
    }
    
    @classmethod
    def is_valid_status(cls, status: str) -> bool:
        """Check if a status string is valid."""
        return status in cls.ALL_STATUSES
    
    @classmethod
    def get_next_status(cls, current_status: str) -> str:
        """Get the next status in the progression."""
        return cls.NEXT_STATUS.get(current_status, current_status)
    
    @classmethod
    def get_status_index(cls, status: str) -> int:
        """Get the progression index of a status (0-3)."""
        try:
            return cls.ALL_STATUSES.index(status)
        except ValueError:
            return -1


# Alias for convenience
CASE_STATUS = CaseStatusConstants
