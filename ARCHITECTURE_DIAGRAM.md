# Onboarding Flow Architecture & Data Model

## 🔄 Complete User Journey

```
START
  ↓
┌─────────────────────────────────────┐
│ 1. LANDING SCREEN                   │  ~1 min
│ "Check eligibility in minutes"      │  User: Click "Start"
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 2. UPLOAD DOCUMENT SCREEN           │  1-2 min
│ Select medical document             │  User: Upload file
│ Allowed: PDF, JPG, PNG, DOCX        │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 3. PROCESSING SCREEN                │  ~10 sec
│ 🔄 Analyzing document…              │  Auto-transition
│ (Uploading → Analyzing → Scoring)   │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 4. ELIGIBILITY RESULT SCREEN        │  1-2 min
│ ⭐⭐⭐⭐⭐ (1-5 stars)               │  User: Review + decide
│ Confidence: 95%                     │  Action: Proceed or Retry
│ Details: Collapsible findings       │
└─────────────────────────────────────┘
  ↓ [Proceed with assessment]
┌─────────────────────────────────────┐
│ 5. SIGNUP FLOW (6 MICRO-STEPS)      │  2-3 min total
├─────────────────────────────────────┤
│ Step 1/6: Name                      │
│ → Name field                        │
│                                     │
│ Step 2/6: Email                     │
│ → Email field                       │
│                                     │
│ Step 3/6: Password                  │
│ → Password + strength meter         │
│                                     │
│ Step 4/6: Phone                     │
│ → Phone number field                │
│                                     │
│ Step 5/6: SSN/ID                    │
│ → SSN input OR ID upload            │
│ → Consent checkbox                  │
│                                     │
│ Step 6/6: Confirmation              │
│ → Review summary                    │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 6. VOICE AGENT SCREEN               │  5-10 min
│ (5 medical questions)               │  User: Speak or type
│ Question 1/5 → Question 5/5         │  Actions: Record, Edit, Upload
│ Live transcript (editable)          │
│ Audio playback option               │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 7. ANALYSIS SCREEN                  │  ~30 sec
│ 🔄 Analyzing core medical docs…     │  Auto-transition
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 8. PAYMENT SCREEN                   │  1-2 min
│ Fee: $299                           │  User: Select method + Pay
│ Methods: Credit Card, PayPal        │  Actions: Pay or Back
│ 🔒 Secure (Stripe)                  │
│ Terms & Privacy                     │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 9. POST-PAYMENT QUESTIONNAIRE       │  1-2 min
│ (5 quick follow-up questions)       │  User: Select answers
│ - Support type needed               │  Action: Complete
│ - Timeline urgency                  │
│ - Contact preference                │
│ - Follow-up resources               │
│ - Experience feedback               │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 10. SUBMISSION SCREEN               │  ~4 sec
│ ✓ Eligibility assessment completed  │  Auto-transition
│ ✓ Payment processed                 │
│ ⟳ Submitting your application…      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 11. SUCCESS SCREEN                  │  ~2 min
│ ✓ Application submitted             │  User: Review + Navigate
│ Application ID: APP-1234567         │  Action: Go to Dashboard
│ What happens next: 3-step timeline  │
│ Support contact                     │
└─────────────────────────────────────┘
  ↓
  DASHBOARD (or end)

TOTAL TIME: ~15-20 minutes
```

---

## 📊 State Management (Context API)

```
OnboardingContext
│
├── currentStep: OnboardingStep
│   "landing" | "upload" | "processing" | "eligibility" 
│   "signup" | "voice" | "analysis" | "payment" 
│   "post-payment" | "submission" | "success"
│
├── goToStep(step): Function
│   Navigate to any step
│
├── formData: {
│   ├── name: string           (from Step 1)
│   ├── email: string          (from Step 2)
│   ├── password: string       (from Step 3)
│   ├── phone: string          (from Step 4)
│   ├── ssn: string            (from Step 5)
│   └── identityCode?: string  (from Step 5)
│ }
│
├── setFormData(data): Function
│   Update form data
│
├── uploadedFile: File | null
│   Medical document from upload screen
│
├── setUploadedFile(file): Function
│   Update uploaded file
│
├── eligibilityRating: 1-5
│   Star rating from processing
│
├── setEligibilityRating(rating): Function
│   Set rating
│
├── eligibilityTitle: string
│   "Eligible" or "Not eligible"
│
├── setEligibilityTitle(title): Function
│   Set title
│
├── eligibilityMessage: string
│   Summary explanation
│
├── setEligibilityMessage(msg): Function
│   Set message
│
├── confidence: 0-100
│   Confidence percentage
│
├── setConfidence(confidence): Function
│   Set confidence
│
├── voiceResponses: string[]
│   5 voice agent responses
│
├── setVoiceResponses(responses): Function
│   Set responses
│
├── paymentAmount: number
│   Default: 299 (in cents or dollars)
│
├── setPaymentAmount(amount): Function
│   Set amount
│
├── postPaymentAnswers: {
│   ├── support: string
│   ├── timeline: string
│   ├── contact: string
│   ├── follow: string
│   └── feedback: string
│ }
│
└── setPostPaymentAnswers(answers): Function
    Set answers
```

---

## 🎯 Component Hierarchy

```
OnboardingFlow (Context Provider)
│
├── LandingScreen
│   └── Buttons (navigation)
│
├── UploadDocumentScreen
│   ├── Drag-drop area
│   ├── File browser
│   ├── File preview
│   └── Buttons (upload/back)
│
├── ProcessingScreen
│   ├── LoadingSpinner
│   ├── ProgressSteps
│   └── Cancel button
│
├── EligibilityResultScreen
│   ├── Star rating (1-5)
│   ├── Confidence % badge
│   ├── Result message
│   ├── Collapsible details
│   └── Buttons (proceed/retry)
│
├── SignupFlow (Multi-step)
│   ├── Step indicator + progress bar
│   ├── Form fields (varies per step)
│   ├── PasswordStrengthMeter (step 3)
│   └── Buttons (back/continue)
│
├── VoiceAgentScreen
│   ├── Question display
│   ├── Microphone button
│   ├── Text input fallback
│   ├── Live transcript
│   ├── File upload option
│   └── Buttons (back/next)
│
├── AnalysisPaymentScreen (mode: analysis)
│   ├── LoadingSpinner
│   └── Auto-transition
│
├── AnalysisPaymentScreen (mode: payment)
│   ├── Fee breakdown
│   ├── Payment methods
│   ├── Secure badge
│   ├── Terms/Privacy
│   └── Buttons (back/pay)
│
├── PostPaymentQuestionnaire
│   ├── 5 select dropdowns
│   ├── Form validation
│   └── Buttons (back/complete)
│
├── SubmissionScreen
│   ├── LoadingSpinner
│   ├── Progress steps
│   └── Auto-transition
│
└── SuccessScreen
    ├── Success icon (animated)
    ├── Confirmation message
    ├── Timeline (3 steps)
    ├── Summary box
    ├── Support section
    ├── Application ID
    └── Button (dashboard)
```

---

## 🔄 Data Flow

```
User Input
  ↓
Component State Update
  ↓
Context State Update (via setFormData, etc.)
  ↓
Component Re-render
  ↓
User Sees Updated UI
  ↓
Validation Check
  ├─ If invalid: Show error
  └─ If valid: Enable next button
  ↓
User Clicks Next
  ↓
goToStep('next-step')
  ↓
Context updates currentStep
  ↓
OnboardingFlow renders new screen
  ↓
Process repeats until success
```

---

## 💾 Data Collection Journey

```
Screen 1 (Landing)
  └─ No data collected

Screen 2 (Upload)
  └─ uploadedFile: File

Screen 3 (Processing)
  └─ eligibilityRating: 1-5
  └─ eligibilityTitle: string
  └─ eligibilityMessage: string
  └─ confidence: number

Screen 4 (Eligibility)
  └─ No new data (display only)

Screen 5 (Signup - 6 steps)
  ├─ formData.name: string
  ├─ formData.email: string
  ├─ formData.password: string
  ├─ formData.phone: string
  └─ formData.ssn: string

Screen 6 (Voice)
  └─ voiceResponses: string[] (5 items)

Screen 7 (Analysis)
  └─ No new data (processing)

Screen 8 (Payment)
  └─ paymentAmount: number (display)

Screen 9 (Post-Payment)
  └─ postPaymentAnswers: {
       support: string,
       timeline: string,
       contact: string,
       follow: string,
       feedback: string
     }

Screen 10 (Submission)
  └─ No new data

Screen 11 (Success)
  └─ All data available for display
```

---

## 🎨 Color & Typography System

```
Colors:
┌─────────────────────────────────┐
│ Primary: #2563EB (Blue)         │ Buttons, headers
│ Success: #16A34A (Green)        │ Eligible, checkmarks
│ Warning: #EAB308 (Yellow)       │ Possible, caution
│ Error: #DC2626 (Red)            │ Not eligible, errors
│ Gray: #6B7280 (Gray-500)        │ Text, disabled
└─────────────────────────────────┘

Typography:
┌─────────────────────────────────┐
│ H1: 2.25rem - 3rem, Bold (800)  │
│ H2: 1.5rem - 2rem, Bold (700)   │
│ Body: 1rem, Regular (400)       │
│ Small: 0.875rem, Regular (400)  │
│ Code: monospace, Regular (400)  │
└─────────────────────────────────┘

Spacing:
┌─────────────────────────────────┐
│ xs: 0.25rem (4px)               │
│ sm: 0.5rem (8px)                │
│ md: 1rem (16px)                 │
│ lg: 1.5rem (24px)               │
│ xl: 2rem (32px)                 │
│ 2xl: 2.5rem (40px)              │
└─────────────────────────────────┘
```

---

## 🔐 Data Security

```
Sensitive Data Handling:
┌────────────────────────────────┐
│ SSN                            │
├────────────────────────────────┤
│ ✓ Encrypted in context         │
│ ✓ Not logged to console        │
│ ✓ Not persisted client-side    │
│ ✓ Only in memory               │
│ ✓ HTTPS in production           │
│ ✓ Server-side encryption       │
└────────────────────────────────┘

Password:
├─ ✓ Strength meter validation
├─ ✓ Min 8 chars + number + upper + lower + special
├─ ✓ Not displayed in plain text
├─ ✓ Not logged anywhere
└─ ✓ HTTPS in production

Payment:
├─ ✓ Handled by Stripe
├─ ✓ No card storage
├─ ✓ PCI-compliant gateway
├─ ✓ HTTPS only
└─ ✓ Secure badge displayed

Consent:
├─ ✓ Explicit checkboxes
├─ ✓ Terms/Privacy links
├─ ✓ Clear messaging
└─ ✓ Logged for compliance
```

---

## 📱 Responsive Breakpoints

```
Mobile (< 640px)
├─ Single column
├─ Full-width inputs
├─ Stacked buttons
└─ Font size: 16px (prevent zoom)

Tablet (640px - 1024px)
├─ Single/double column (flexible)
├─ Proper padding
├─ Readable text
└─ Touch targets: 48px+

Desktop (> 1024px)
├─ Max-width container (2xl: 42rem)
├─ Optimal spacing
├─ Hover states
└─ Full features
```

---

## ♿ Accessibility Map

```
Keyboard Navigation:
Tab → Navigate forward
Shift+Tab → Navigate backward
Space/Enter → Activate buttons
Escape → Close (if modal)
Arrow keys → Radio buttons, selects

Screen Reader:
<label> → Form field labels
<button> → Button purposes
aria-label → Icon buttons
aria-describedby → Help text
aria-live="polite" → Status updates
role="progressbar" → Progress indicators
aria-current="step" → Current step

Focus:
outline: 2px solid #2563EB
outline-offset: 2px
visible on all interactive elements

Color Contrast:
AAA: 7:1 (headings)
AA: 4.5:1 (body text)
No color alone for meaning
```

---

## 🎬 Animation Timelines

```
Spinner: 1s continuous rotation
Pulse: 2s ease-in-out
Bounce: 1s ease-in-out
Slide-in: 0.3s ease-out
Transition: 0.2s ease
All respect prefers-reduced-motion
```

---

## 🚀 Performance Targets

```
First Paint: < 1s
First Contentful Paint: < 1.5s
Time to Interactive: < 2s
Largest Contentful Paint: < 2.5s
Cumulative Layout Shift: < 0.1
First Input Delay: < 100ms
```

---

This architecture ensures:
✅ Clear data flow
✅ Efficient state management
✅ Accessible interactions
✅ Secure data handling
✅ Mobile responsiveness
✅ Fast performance
