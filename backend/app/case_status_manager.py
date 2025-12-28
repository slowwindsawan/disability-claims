"""
Case status management utilities.
Provides helper functions for managing case statuses throughout the application.
"""

from typing import Optional, Dict, Any
from .constants import CaseStatusConstants
import logging

logger = logging.getLogger(__name__)


class CaseStatusManager:
    """Manages case status updates and transitions."""
    
    @staticmethod
    def should_update_to_questionnaire_completed(case_data: Dict[str, Any]) -> bool:
        """
        Check if case should be updated to "Initial questionnaire" status.
        Returns True if questionnaire summary has just been generated.
        """
        return bool(case_data.get('call_summary'))
    
    @staticmethod
    def should_update_to_document_submission(case_data: Dict[str, Any]) -> bool:
        """
        Check if case should be updated to "Document submission" status.
        Returns True if questionnaire is complete but no documents uploaded yet.
        """
        has_questionnaire = bool(case_data.get('call_summary'))
        has_documents = bool(case_data.get('document_summaries'))
        current_status = case_data.get('status')
        
        return (
            has_questionnaire and 
            not has_documents and 
            current_status != CaseStatusConstants.SUBMISSION_PENDING and
            current_status != CaseStatusConstants.SUBMITTED
        )
    
    @staticmethod
    def should_update_to_submission_pending(case_data: Dict[str, Any], required_docs: Optional[list] = None) -> bool:
        """
        Check if case should be updated to "Submission pending" status.
        Returns True if all required documents have been uploaded.
        
        Args:
            case_data: The case data dictionary
            required_docs: List of required document types. If None, any documents trigger this status.
        """
        has_questionnaire = bool(case_data.get('call_summary'))
        document_summaries = case_data.get('document_summaries', {})
        
        if not has_questionnaire:
            return False
        
        # If no specific required docs, just check if any documents exist
        if required_docs is None:
            return bool(document_summaries)
        
        # Check if all required documents are present
        uploaded_doc_types = set(document_summaries.keys()) if isinstance(document_summaries, dict) else set()
        required_doc_types = set(required_docs)
        
        return required_doc_types.issubset(uploaded_doc_types)
    
    @staticmethod
    def get_status_for_case(case_data: Dict[str, Any], required_docs: Optional[list] = None) -> str:
        """
        Determine the appropriate status for a case based on its data.
        
        Args:
            case_data: The case data dictionary
            required_docs: List of required document types
            
        Returns:
            The appropriate status string
        """
        has_questionnaire = bool(case_data.get('call_summary'))
        document_summaries = case_data.get('document_summaries', {})
        has_documents = bool(document_summaries)
        
        # Check if already submitted
        if case_data.get('status') == CaseStatusConstants.SUBMITTED:
            return CaseStatusConstants.SUBMITTED
        
        # Determine status based on progress
        if has_questionnaire and has_documents:
            if required_docs is None:
                return CaseStatusConstants.SUBMISSION_PENDING
            
            # Check if all required documents are uploaded
            uploaded_doc_types = set(document_summaries.keys()) if isinstance(document_summaries, dict) else set()
            required_doc_types = set(required_docs)
            
            if required_doc_types.issubset(uploaded_doc_types):
                return CaseStatusConstants.SUBMISSION_PENDING
            else:
                return CaseStatusConstants.DOCUMENT_SUBMISSION
        
        elif has_questionnaire:
            return CaseStatusConstants.DOCUMENT_SUBMISSION
        
        else:
            return CaseStatusConstants.INITIAL_QUESTIONNAIRE
    
    @staticmethod
    def validate_status_transition(current_status: str, new_status: str) -> bool:
        """
        Validate if a status transition is allowed.
        Currently allows all valid statuses, but can be restricted if needed.
        
        Args:
            current_status: The current status
            new_status: The desired new status
            
        Returns:
            True if transition is valid, False otherwise
        """
        if not CaseStatusConstants.is_valid_status(new_status):
            logger.warning(f"Invalid status: {new_status}")
            return False
        
        # Allow any transition between valid statuses for flexibility
        # Can be made more restrictive if needed
        return True
    
    @staticmethod
    def format_status_for_display(status: str) -> str:
        """Format status string for user-facing display."""
        return status if CaseStatusConstants.is_valid_status(status) else "Unknown"
    
    @staticmethod
    def get_progress_percentage(status: str) -> int:
        """
        Get the progress percentage based on status.
        
        Returns:
            Progress percentage (0-100)
        """
        progress_map = {
            CaseStatusConstants.INITIAL_QUESTIONNAIRE: 25,
            CaseStatusConstants.DOCUMENT_SUBMISSION: 50,
            CaseStatusConstants.SUBMISSION_PENDING: 75,
            CaseStatusConstants.SUBMITTED: 100,
        }
        return progress_map.get(status, 0)
