# Document Signing Component - Code Structure

## New Component: DocumentSigningIframe

### Location
`frontend/components/document-signing-iframe.tsx`

### Component Props
```typescript
interface DocumentSigningIframeProps {
  onSigningComplete?: (documentId: string) => void
  onSigningStart?: () => void
  documentType?: "powerOfAttorney" | "medicalRecords" | "terms" | "confidentialityWaiver"
  disabled?: boolean
}
```

### State Management
```typescript
const [signingLink, setSigningLink] = useState<string | null>(null)
const [documentId, setDocumentId] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [signStatus, setSignStatus] = useState<"idle" | "in-progress" | "signed" | "completed">("idle")
const [showFinishButton, setShowFinishButton] = useState(false)
```

### Key Functions

#### initSigning()
Initializes the signing session:
1. Fetches user data from `/me` endpoint
2. Creates BoldSign signing link via `/boldsign/create-embed-link`
3. Sets up event listeners for iframe completion
4. Handles errors with user-friendly messages

#### markAsCompleted()
Finalizes the signing:
1. Calls `/boldsign/signature-complete` endpoint
2. Updates signing status to "completed"
3. Triggers `onSigningComplete` callback
4. Handles errors gracefully

#### handleMessage()
Listens for postMessage events from BoldSign iframe:
- Detects `onDocumentSigned` action
- Shows "Confirm Signature" button
- Updates status to "signed"

### Rendering Logic

**3 Main States:**

1. **Loading/Initializing**
   - Shows spinner
   - Text: "Preparing signing..."

2. **Error State**
   - Red alert box
   - "Try Again" button
   - Error message display

3. **Ready State**
   - BoldSign iframe
   - Waiting indicator → Finish button (after signing)
   - Success state (after confirmed)

## Updated Checkout Page

### Location
`frontend/app/checkout/page.tsx`

### Component Structure

```
Checkout Page
├── Header with progress steps
├── Payment Step
│   └── Order summary + payment form
└── Signature Step
    ├── Success message (payment confirmed)
    ├── Documents to Sign section
    │   ├── Power of Attorney
    │   │   ├── Checkbox + description
    │   │   └── DocumentSigningIframe (conditional)
    │   ├── Medical Records
    │   │   ├── Checkbox + description
    │   │   └── DocumentSigningIframe (conditional)
    │   ├── Terms & Conditions
    │   │   ├── Checkbox + description
    │   │   └── DocumentSigningIframe (conditional)
    │   └── Confidentiality Waiver
    │       ├── Checkbox + description
    │       └── DocumentSigningIframe (conditional)
    └── Sign and Continue button
```

### State Structure

```typescript
// Agreement checkboxes
agreements: {
  powerOfAttorney: boolean
  medicalRecords: boolean
  terms: boolean
  confidentialityWaiver: boolean
}

// Signing completion tracking
signedDocuments: {
  powerOfAttorney: boolean
  medicalRecords: boolean
  terms: boolean
  confidentialityWaiver: boolean
}
```

### Conditional Rendering Pattern

Each document section uses this pattern:

```tsx
{/* Document Section */}
<div className="border border-slate-200 rounded-lg p-5">
  {/* Checkbox + Description */}
  <div className="flex items-start gap-3 mb-4">
    <Checkbox
      checked={agreements.documentType}
      onCheckedChange={(checked) =>
        setAgreements(prev => ({
          ...prev,
          documentType: checked
        }))
      }
    />
    <label>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-600">{description}</p>
    </label>
  </div>

  {/* Conditionally Show Signing Iframe */}
  {agreements.documentType && (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
      <DocumentSigningIframe
        documentType="documentType"
        disabled={!agreements.documentType}
        onSigningComplete={(docId) =>
          setSignedDocuments(prev => ({
            ...prev,
            documentType: true,
          }))
        }
      />
      {signedDocuments.documentType && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>Document Signed</span>
        </div>
      )}
    </motion.div>
  )}
</div>
```

## Data Flow

### Signing Flow

```
1. User checks agreement checkbox
   ↓
2. Document section expands (motion animation)
   ↓
3. DocumentSigningIframe component mounts
   ↓
4. initSigning() called
   - Fetch user data from /me
   - Create BoldSign link
   ↓
5. iframe loads with signing link
   ↓
6. User signs document in iframe
   ↓
7. iframe sends postMessage event
   ↓
8. Component shows "Confirm Signature" button
   ↓
9. User clicks "Confirm Signature"
   ↓
10. markAsCompleted() called
    - POST to /boldsign/signature-complete
    - Trigger onSigningComplete callback
    ↓
11. Checkbox shows green checkmark
    ↓
12. User repeats for other documents
    ↓
13. All documents signed → Enable "Sign and Continue" button
```

### API Communication

**Create Signing Link:**
```
Frontend
  ↓
POST /boldsign/create-embed-link
  ↓ (user data + documentType)
Backend
  ↓
Create case if needed
  ↓
Request BoldSign API
  ↓
Return signingLink + documentId
  ↓
Frontend (iframe loads with link)
```

**Complete Signing:**
```
Frontend (after user signs in iframe)
  ↓
POST /boldsign/signature-complete
  ↓ (documentId + documentType)
Backend
  ↓
Update case metadata
  ↓
Set signature_status to "completed"
  ↓
Return success
  ↓
Frontend (show green checkmark)
```

## Styling & Animations

### Colors Used
- **Blue**: Primary action, borders (hover: blue-300)
- **Green**: Success states, waiver section
- **Red**: Error states
- **Slate**: Neutral backgrounds, text

### Animations
- **Expand/Collapse**: Framer Motion, 0.3s opacity + height
- **Hover**: Border color change, 0.2s transition
- **Success**: Fade in checkmark

### Responsive
- Full width on mobile
- Padding: 5 units (20px)
- Borders: 1px slate-200
- Border radius: lg (8px)
- min-height for iframe: 500px

## Error Handling Strategy

```
1. Signing initialization fails
   → Show error message
   → Provide "Try Again" button
   → User can retry without re-checking checkbox

2. Network error during signing
   → Display friendly error message
   → Suggest retry or skip option

3. Signature completion fails
   → Show error state
   → Don't clear signing session
   → Allow user to retry confirmation

4. Missing user data
   → Use fallback values
   → Continue with defaults
   → Log warnings for debugging
```

## RTL (Right-to-Left) Support

All text uses `{isRTL ? "Hebrew" : "English"}` pattern:
```tsx
<p>
  {isRTL ? "טקסט בעברית" : "English text"}
</p>
```

Main container has `dir={isRTL ? "rtl" : "ltr"}`

## Validation Logic

```typescript
// Payment complete
const paymentComplete = true // Set by handlePayment

// All agreements checked
const allAgreementsChecked =
  agreements.powerOfAttorney &&
  agreements.medicalRecords &&
  agreements.terms &&
  agreements.confidentialityWaiver

// All documents signed
const allDocumentsSigned =
  signedDocuments.powerOfAttorney &&
  signedDocuments.medicalRecords &&
  signedDocuments.terms &&
  signedDocuments.confidentialityWaiver

// Button enabled only if all conditions met
<Button disabled={!allAgreementsChecked || !allDocumentsSigned}>
```

## Integration Points

### With Existing Systems
- Uses existing `/me` endpoint for user data
- Stores data in existing case system via metadata
- Maintains existing RTL language support
- Uses existing UI component library
- Compatible with existing authentication (Bearer token)

### With BoldSign
- Receives embedded signing link from backend
- Listens for iframe postMessage events
- Sends completion confirmation to backend
- No direct API calls to BoldSign (all via backend)

## Performance Considerations

- **Lazy Loading**: iframe loads only when checkbox checked
- **Event Delegation**: Single postMessage listener per component
- **Memoization**: Could optimize with React.memo if needed
- **User Data Fetch**: Fetched once per component mount
- **Animation Performance**: Using Framer Motion (GPU accelerated)

## Security

- Bearer token in Authorization header
- API base URL from environment variable
- iframe sandbox restrictions:
  - allow-same-origin (for auth)
  - allow-scripts (for BoldSign)
  - allow-forms (for signing)
  - allow-popups (for external links)
