"""
Migration to populate case statuses based on case data.
This migration sets status based on:
- Documents uploaded
- Initial questionnaire completion
- Overall submission status
"""

def migrate_case_statuses(supabase_client):
    """
    Migrate existing cases to have proper status values.
    
    Status logic:
    - If case has no documents and no questionnaire: "Initial questionnaire"
    - If case has questionnaire but no documents: "Document submission"
    - If case has documents but not submitted: "Submission pending"
    - If case is marked as submitted: "Submitted"
    """
    from backend.app.constants import CaseStatusConstants
    from backend.app.supabase_client import update_case
    
    try:
        # Get all cases
        url = f"{supabase_client.SUPABASE_URL.rstrip('/')}/rest/v1/cases"
        import requests
        headers = supabase_client._postgrest_headers()
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        cases = resp.json()
        
        updated_count = 0
        
        for case in cases:
            case_id = case.get('id')
            current_status = case.get('status')
            
            # Skip if already has a valid status
            if current_status in CaseStatusConstants.ALL_STATUSES:
                continue
            
            # Determine appropriate status
            has_documents = bool(case.get('document_summaries'))
            has_questionnaire = bool(case.get('call_summary'))
            
            if has_documents and has_questionnaire:
                new_status = CaseStatusConstants.SUBMISSION_PENDING
            elif has_questionnaire:
                new_status = CaseStatusConstants.DOCUMENT_SUBMISSION
            else:
                new_status = CaseStatusConstants.INITIAL_QUESTIONNAIRE
            
            # Update case
            try:
                update_case(case_id, {'status': new_status})
                updated_count += 1
                print(f"Updated case {case_id} to status: {new_status}")
            except Exception as e:
                print(f"Failed to update case {case_id}: {e}")
        
        print(f"Migration complete: Updated {updated_count} cases")
        return updated_count
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
