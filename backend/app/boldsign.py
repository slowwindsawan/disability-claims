import os
import boldsign
from fastapi import HTTPException
from typing import Dict, Any

BOLDSIGN_API_KEY = os.getenv("BOLDSIGN_API_KEY")
BOLDSIGN_TEMPLATE_ID = os.getenv("BOLDSIGN_TEMPLATE_ID")


async def create_embedded_sign_link(
    user_id: str,
    name: str,
    email: str,
    case_id: str,
    redirect_url: str = None
) -> Dict[str, Any]:
    """
    Create a BoldSign document from template and generate an embedded signing link.
    
    Args:
        user_id: User ID from database
        name: Signer's full name
        email: Signer's email
        case_id: Case ID to associate with the signature
        redirect_url: URL to redirect after signing (optional)
    
    Returns:
        Dict with signingLink and documentId
    """
    if not BOLDSIGN_API_KEY:
        raise HTTPException(status_code=500, detail="BOLDSIGN_API_KEY not configured")
    
    if not BOLDSIGN_TEMPLATE_ID:
        raise HTTPException(status_code=500, detail="BOLDSIGN_TEMPLATE_ID not configured. Please add it to .env file")
    
    try:
        # Configure BoldSign SDK
        configuration = boldsign.Configuration(api_key=BOLDSIGN_API_KEY)
        
        with boldsign.ApiClient(configuration) as api_client:
            template_api = boldsign.TemplateApi(api_client)
            document_api = boldsign.DocumentApi(api_client) # Required for Step 2

            # -----------------------------------------------------------
            # STEP 1: Create the Document (Send Logic)
            # -----------------------------------------------------------
            from boldsign.models.role import Role
            from boldsign.models.send_for_sign_from_template_form import SendForSignFromTemplateForm
            role = Role(
                role_index=1,
                signer_name=name,
                signer_email=email,
                signer_type="Signer"
            )

            # Use 'SendForSignFromTemplateForm', NOT 'EmbeddedSendTemplateFormRequest'
            send_form = SendForSignFromTemplateForm(
                template_id=BOLDSIGN_TEMPLATE_ID,
                roles=[role],
                disable_emails=True  # Keeps the process strictly inside your iframe
            )

            # This creates the document ID immediately
            # ✅ Correct: specific arguments for ID and Form
            document_response = template_api.send_using_template(
                template_id=BOLDSIGN_TEMPLATE_ID, 
                send_for_sign_from_template_form=send_form
            )
            document_id = document_response.document_id

            if not document_id:
                raise HTTPException(status_code=500, detail="Failed to create document")

            # -----------------------------------------------------------
            # STEP 2: Generate the Signing Link (Sign Logic)
            # -----------------------------------------------------------
            # Now we ask for the specific link for this user to sign that document
            link_response = document_api.get_embedded_sign_link(
                document_id=document_id,
                signer_email=email, 
                redirect_url="https://yourapp.com/callback" # Optional
            )

            signing_link = link_response.sign_link

            return {
                "signingLink": signing_link, # Contains '/document/sign/'
                "documentId": document_id
            } 
    except boldsign.ApiException as e:
        raise HTTPException(
            status_code=e.status if hasattr(e, 'status') else 500,
            detail=f"BoldSign API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error creating signing link: {str(e)}"
        )


async def get_document_status(document_id: str) -> Dict[str, Any]:
    """
    Get the status of a BoldSign document.
    
    Args:
        document_id: BoldSign document ID
    
    Returns:
        Document status information
    """
    if not BOLDSIGN_API_KEY:
        raise HTTPException(status_code=500, detail="BOLDSIGN_API_KEY not configured")
    
    try:
        configuration = boldsign.Configuration(api_key=BOLDSIGN_API_KEY)
        
        with boldsign.ApiClient(configuration) as api_client:
            document_api = boldsign.DocumentApi(api_client)
            
            # Get document properties
            document_properties = document_api.get_properties(document_id=document_id)
            
            # Convert to dict for consistent return type
            return {
                "documentId": document_properties.document_id,
                "status": document_properties.status,
                "signers": [
                    {
                        "name": signer.signer_name,
                        "email": signer.signer_email,
                        "status": signer.sign_status
                    }
                    for signer in (document_properties.document_signers or [])
                ]
            }
            
    except boldsign.ApiException as e:
        raise HTTPException(
            status_code=e.status if hasattr(e, 'status') else 500,
            detail=f"BoldSign API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error getting document status: {str(e)}"
        )
