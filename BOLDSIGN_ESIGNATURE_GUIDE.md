# BoldSign E-Signature Integration Guide

## Overview
After the voice interview, users are required to sign a disability claim agreement using BoldSign's embedded signing feature.

## Flow
1. User completes voice interview with Vapi AI
2. User clicks "Continue" 
3. **E-Signature Screen** loads with embedded BoldSign iframe
4. User reviews and signs the document
5. User clicks "I've finished signing"
6. Document ID is saved to case metadata
7. User proceeds to payment

## Backend Setup

### 1. Environment Variable
Add your BoldSign API key to `backend/.env`:
```env
BOLDSIGN_API_KEY=your_actual_boldsign_api_key_here
```

### 2. Install Dependencies
```bash
cd backend
pip install httpx==0.24.1
```

### 3. Run Migration
```bash
cd backend/db
./run_migration.ps1
```

This adds the following fields to `cases` table:
- `boldsign_document_id` - Stores BoldSign document ID
- `signature_status` - 'pending', 'completed', or 'declined'
- `signature_completed_at` - Timestamp when signed

## API Endpoints

### POST /boldsign/create-embed-link
Creates a BoldSign document and returns embedded signing link.

**Request:**
```json
{
  "userId": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "caseId": "uuid"
}
```

**Response:**
```json
{
  "signingLink": "https://app.boldsign.com/...",
  "documentId": "abc-123-xyz"
}
```

### GET /boldsign/document-status/{document_id}
Get current status of a document.

**Response:**
```json
{
  "documentId": "abc-123-xyz",
  "status": "Completed",
  "signers": [...]
}
```

### POST /boldsign/signature-complete
Mark signature as complete in case metadata.

**Request:**
```json
{
  "caseId": "uuid",
  "documentId": "abc-123-xyz"
}
```

## Frontend Components

### ESignatureScreen.tsx
Located in `src/components/Onboarding/screens/ESignatureScreen.tsx`

**Props:**
- `userId` - User UUID
- `name` - User's full name
- `email` - User's email
- `caseId` - Case UUID to associate with signature
- `onSigned` - Optional callback when signature is completed

**Features:**
- Embedded BoldSign iframe for seamless signing
- Loading state while preparing document
- Error handling with retry
- Completion confirmation screen
- Automatic navigation to payment after signing

## BoldSign Document Setup

### Creating a Template (Recommended)
1. Go to [BoldSign Dashboard](https://app.boldsign.com)
2. Navigate to **Templates**
3. Click **Create Template**
4. Upload your disability claim agreement PDF
5. Add signature fields, text fields, checkboxes as needed
6. Save the template and copy the Template ID
7. Update `backend/app/boldsign.py` to use template:

```python
# In create_embedded_sign_link function
send_payload = {
    "templateId": "your-template-id",
    "title": f"Disability Claim Agreement - Case #{case_id[:8]}",
    "signers": [...],
    ...
}
```

### Using Direct Upload (Current Implementation)
The current implementation sends documents directly without a template. This requires you to:
1. Upload the document file during the send request
2. Define form fields programmatically

## Testing

### Test Flow
1. Complete eligibility questionnaire
2. Complete voice interview
3. Click "Continue" after voice interview ends
4. E-signature screen should load
5. Sign the document in the iframe
6. Click "I've finished signing"
7. Should see completion screen with document ID
8. Should navigate to payment

### Debug Mode
Check browser console for:
- `Iframe loaded` - BoldSign iframe loaded successfully
- Errors during API calls to `/boldsign/create-embed-link`

Check backend logs for:
- BoldSign API responses
- Case metadata updates

## Security Notes

1. **API Key Security**: Never expose `BOLDSIGN_API_KEY` in frontend code
2. **Authentication**: All endpoints require valid JWT token
3. **User Verification**: Backend verifies user owns the case before creating signature
4. **CORS**: Ensure BoldSign domain is allowed in iframe if CSP is enabled

## Webhooks (Optional Enhancement)

BoldSign can send webhooks on document events. To implement:

1. Create webhook endpoint in `main.py`:
```python
@app.post('/webhooks/boldsign')
async def boldsign_webhook(request: Request):
    payload = await request.json()
    event_type = payload.get('event')
    
    if event_type == 'DocumentSigned':
        document_id = payload['documentId']
        # Update case metadata automatically
        ...
```

2. Configure webhook in BoldSign Dashboard
3. Add webhook secret validation

## Troubleshooting

### Signature link not loading
- Check BOLDSIGN_API_KEY is valid
- Verify BoldSign account has credits
- Check backend logs for API errors

### "Failed to create signing link" error
- Ensure user has valid email
- Check case_id exists in database
- Verify httpx is installed: `pip list | grep httpx`

### Document not showing in iframe
- Check browser console for CSP errors
- Verify BoldSign domain is allowed
- Try disabling browser extensions

## Next Steps

1. **Add Document Template**: Upload your actual disability agreement to BoldSign
2. **Customize Fields**: Add required signature/initial fields
3. **Enable Webhooks**: Automatic status updates
4. **Add Reminder Emails**: BoldSign can send reminders to signers
5. **Download Signed Docs**: Store signed PDFs in Supabase Storage
