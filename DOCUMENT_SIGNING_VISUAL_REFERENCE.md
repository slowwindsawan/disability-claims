# Document Signing - Visual & Flow Reference

## UI State Diagrams

### DocumentSigningIframe Component States

```
┌─────────────────────────────────────────────────────────┐
│                    Component Mounted                      │
│              documentType: "powerOfAttorney"              │
│                    disabled: false                        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        v                         v
    ┌─────────┐            ┌────────────┐
    │ LOADING │            │   ERROR    │
    │         │            │ (Retry)    │
    └────┬────┘            └────┬───────┘
         │                      │
         │ API Success          │ Click Retry
         │                      │
         v                      v
    ┌──────────────────────────────────┐
    │    IFRAME LOADED & SIGNING       │
    │   "Waiting for signing to       │
    │    complete..."                  │
    └────────────┬─────────────────────┘
                 │
         (User signs in iframe)
                 │
         postMessage event received
                 │
                 v
    ┌──────────────────────────────────┐
    │    SIGNED STATE DETECTED         │
    │   "Confirm Signature" button     │
    │   (User clicks button)            │
    └────────────┬─────────────────────┘
                 │
         API: signature-complete
                 │
                 v
    ┌──────────────────────────────────┐
    │        COMPLETED                 │
    │  ✓ Document Signed Successfully  │
    └──────────────────────────────────┘
```

### Checkout Page Document Signing Flow

```
PAYMENT STEP                          SIGNATURE STEP
─────────────                         ──────────────

[Payment Form]                        [Payment Confirmed ✓]
    ↓                                        ↓
[Make Payment]          ──────→        [Documents to Sign]
    ↓                                        ↓
[Loading...]                           ┌────────────────────┐
    ↓                                   │ Power of Attorney  │
[Success ✓]                            │ ☐ I agree          │
                                       └────────────────────┘
                                                ↓
                                       ☑ Checked by User
                                                ↓
                                       ┌────────────────────┐
                                       │ BoldSign Iframe    │
                                       │ [Loading...]       │
                                       └────────────────────┘
                                                ↓
                                       User Signs Document
                                                ↓
                                       ┌────────────────────┐
                                       │ [Confirm Signature]│
                                       │ (button appears)   │
                                       └────────────────────┘
                                                ↓
                                       User Clicks Button
                                                ↓
                                       ✓ Document Signed
                                                ↓
                                       [Next Document...]
                                                ↓
                                       (Repeat for all 4 docs)
                                                ↓
                                       All Documents Signed
                                                ↓
                                       [Sign and Continue ✓]
                                       (button enabled)
```

## Component Hierarchy

```
Checkout Page
│
├── Header (Progress Steps)
│   ├── Step 1: Payment ✓
│   └── Step 2: Signing
│
├── Payment Step (Conditional)
│   ├── Order Summary
│   │   ├── Base Item (₪800)
│   │   ├── Mobility Add-on (₪150)
│   │   └── Special Services (₪150)
│   ├── Payment Form
│   │   ├── Card Number Input
│   │   ├── Expiry Input
│   │   ├── CVV Input
│   │   ├── ID Number Input
│   │   ├── Email Input
│   │   ├── Security Notice
│   │   └── Legal Disclaimer
│   └── [Make Secure Payment] Button
│
└── Signature Step (Conditional)
    ├── Success Message
    ├── Documents to Sign Card
    │   ├── Document Section 1: Power of Attorney
    │   │   ├── Checkbox
    │   │   ├── Title & Description
    │   │   └── DocumentSigningIframe (Conditional)
    │   │       ├── Loading State
    │   │       ├── Error State
    │   │       ├── Iframe Container
    │   │       └── Confirmation Button
    │   │
    │   ├── Document Section 2: Medical Records
    │   │   ├── Checkbox
    │   │   ├── Title & Description
    │   │   └── DocumentSigningIframe (Conditional)
    │   │
    │   ├── Document Section 3: Terms & Conditions
    │   │   ├── Checkbox
    │   │   ├── Title & Description
    │   │   └── DocumentSigningIframe (Conditional)
    │   │
    │   └── Document Section 4: Confidentiality Waiver
    │       ├── Green Path Badge
    │       ├── Checkbox
    │       ├── Title & Description
    │       ├── Important Notice
    │       └── DocumentSigningIframe (Conditional)
    │
    ├── Legal Notice
    └── [Sign and Continue] Button
```

## API Request/Response Flow

### Create Signing Link

```
Frontend                                Backend

GET /me
  │
  ├─ Extract user data ──────────────→ Parse JWT
                                         │
                                         v
                                      Return user data
  │
  └─ Prepare payload
       {
         userId: "...",
         name: "...",
         email: "...",
         documentType: "powerOfAttorney"
       }
       │
       v
POST /boldsign/create-embed-link
  │
  ├─ With Bearer token ──────────────→ Validate token
                                         │
                                         v
                                      Create case if needed
                                         │
                                         v
                                      Call BoldSign API
                                         │
                                         v
                                      Get signing link
  │
  └─ Response: ◄──────────────────────
       {
         signingLink: "https://...",
         documentId: "doc-123",
         caseId: "case-456"
       }
  │
  v
Set state & render iframe
```

### Complete Signing

```
Frontend (After User Signs)          Backend

postMessage from iframe detected
  │
  v
POST /boldsign/signature-complete
  │
  ├─ Payload: ──────────────────────→ Validate request
       {
         documentId: "doc-123",
         documentType: "powerOfAttorney"
       }
                                       │
                                       v
                                      Get case from DB
                                       │
                                       v
                                      Update metadata
                                       {
                                         signature_status: "completed",
                                         signature_completed_at: "..."
                                       }
                                       │
                                       v
                                      Save to DB
  │
  v
Response ◄──────────────────────────
  {
    status: "ok"
  }
  │
  v
Update component state
  - signStatus: "completed"
  - Show green checkmark
  - Call onSigningComplete callback
```

## User Journey Map

```
START: User completes payment
│
├─ SUCCESS MESSAGE
│  "Payment Successfully Completed ✓"
│
├─ DOCUMENTS TO SIGN SECTION
│  "To open the file and begin the claims process,
│   your signature is required on the following documents:"
│
├─ FOR EACH DOCUMENT (4 total):
│  │
│  ├─ STEP 1: Read & Agree
│  │  [ ] I agree to [Document Name]
│  │
│  ├─ STEP 2: Expand Signing Section
│  │  User checks checkbox
│  │  Section animates open → Iframe loads
│  │
│  ├─ STEP 3: Sign Document
│  │  BoldSign iframe opens
│  │  User reviews and signs
│  │  "Waiting for signing to complete..."
│  │
│  ├─ STEP 4: Confirm Signature
│  │  [Confirm Signature] button appears
│  │  User clicks to finalize
│  │
│  └─ STEP 5: Success
│     ✓ Document Signed
│     Green checkmark shows
│
├─ FINAL STATE: All Documents Signed
│  ✓ Power of Attorney
│  ✓ Medical Records
│  ✓ Terms & Conditions
│  ✓ Confidentiality Waiver
│
├─ ACTION: Continue
│  [Sign and Continue] button enabled
│  Navigation to payment-confirmation
│
└─ END: Documents signed and stored
```

## Mobile Responsive Breakpoints

```
Mobile (< 640px)
├─ Single column layout
├─ Full width inputs
├─ Iframe height: 500px
├─ Stacked progress steps
├─ Touch-friendly buttons (min 44px)
└─ RTL-aware padding

Tablet (640px - 1024px)
├─ Single column with padding
├─ Wider form fields
├─ Same iframe height
├─ Adjusted spacing
└─ Better visual hierarchy

Desktop (> 1024px)
├─ Max-width container (2xl)
├─ Better spacing
├─ Hover effects on buttons
├─ Larger fonts for readability
└─ Full feature showcase
```

## Language Support (RTL for Hebrew)

```
English (LTR)              Hebrew (RTL)
───────────────            ──────────────
Left ← → Right            Right ← → Left

Checkbox ─ Label          Label ─ Checkbox
[✓] Power of Attorney     ייפוי כוח [✓]

Document Left-aligned     Document Right-aligned
Sign ─ Continue           Continue ─ Sign

Directional text flows    Directional text flows
left to right             right to left
```

## Error Scenarios & Recovery

```
SCENARIO 1: Network Error Loading iframe
├─ Detect: API call fails
├─ Show: Red error box with message
├─ Offer: [Try Again] button
└─ User: Can retry without rechecking

SCENARIO 2: User Closes iframe Without Signing
├─ Detect: Timeout (configurable)
├─ Show: "Signing session expired"
├─ Offer: [Try Again] button
└─ User: Iframe reinitializes

SCENARIO 3: Signature Completion Fails
├─ Detect: Response error from backend
├─ Show: "Failed to complete signature"
├─ Offer: [Try Again] button
└─ User: Can retry confirmation

SCENARIO 4: Missing User Data
├─ Detect: No email/ID available
├─ Show: Error message (for debugging)
├─ Offer: [Skip for now] or [Try Again]
└─ User: Can proceed or retry

SCENARIO 5: BoldSign Service Down
├─ Detect: Service unavailable response
├─ Show: "Signing service temporarily unavailable"
├─ Offer: [Try Again] button
└─ User: Can wait and retry later
```

## Performance Timeline

```
0ms   - Component mounts
      └─ initSigning() called
      
50ms  - User data fetch started
      └─ GET /me

200ms - User data received
      └─ Prepare BoldSign request

300ms - BoldSign API call sent
      └─ POST /boldsign/create-embed-link

800ms - Signing link received
      └─ iframe src set, starts loading

1200ms - iframe content loads
       └─ BoldSign interface displayed

~10s  - User signs document
      └─ postMessage event sent

10.1s - Confirmation button shown
      └─ Ready for user action

~2s   - User clicks confirm
      └─ signature-complete call sent

500ms - Completion API returns
      └─ Success state shown

Total: ~13-15 seconds (user-dependent)
```

## Data Structure Examples

### Component Props
```typescript
{
  documentType: "powerOfAttorney",
  disabled: false,
  onSigningComplete: (documentId) => {
    setSignedDocuments(prev => ({
      ...prev,
      powerOfAttorney: true
    }))
  },
  onSigningStart: () => {
    console.log("Signing started")
  }
}
```

### State Objects
```typescript
// Agreements
{
  powerOfAttorney: true,
  medicalRecords: false,
  terms: true,
  confidentialityWaiver: false
}

// Signed Documents
{
  powerOfAttorney: true,
  medicalRecords: false,
  terms: true,
  confidentialityWaiver: false
}
```

### API Request
```json
{
  "userId": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "documentType": "powerOfAttorney"
}
```

### API Response
```json
{
  "signingLink": "https://boldsign.com/embed/...",
  "documentId": "doc-abc123",
  "caseId": "case-def456"
}
```
