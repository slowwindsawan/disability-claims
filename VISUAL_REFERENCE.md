# Onboarding Flow - Visual Reference Guide

## Screen-by-Screen Breakdown

### 1. Landing Screen
```
┌─────────────────────────────────────┐
│                                     │
│  Check eligibility in minutes       │
│                                     │
│  Upload one basic medical           │
│  document to get an initial         │
│  eligibility rating.                │
│                                     │
│  ⚡ Fast & secure  📊 Instant rating │
│  🔒 Your data is safe               │
│                                     │
│  [Start eligibility test]           │
│  [Learn more]                       │
│                                     │
│  🔒 Your information is encrypted   │
│                                     │
└─────────────────────────────────────┘

Navigation: Landing → Upload
Time: Instant (button click)
Interaction: Click button
```

### 2. Upload Document Screen
```
┌─────────────────────────────────────┐
│ Upload medical document             │
│                                     │
│ We only need one basic document...  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  📁 Drag & drop or choose file  │ │
│ │  [Choose file]                  │ │
│ │  PDF, JPG, PNG, DOCX (max 10MB) │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🔒 Files encrypted in transit      │
│                                     │
│ 📋 Upload one clear page...        │
│                                     │
│ [Back] [Upload & check eligibility]│
│                                     │
└─────────────────────────────────────┘

Navigation: Upload → Processing
Time: Variable (file size dependent)
Interaction: File drop or browse
```

### 3. Processing Screen
```
┌─────────────────────────────────────┐
│                                     │
│     ⭕ Uploading                    │
│     → Analyzing                     │
│     → Scoring                       │
│                                     │
│         ⟳ (spinning)                │
│                                     │
│  Checking your eligibility…         │
│  this usually takes <10s            │
│                                     │
│  We extract only the medical data   │
│  required. This happens automatically│
│                                     │
│  ⏱️ Estimated: 7 seconds remaining  │
│                                     │
│  [← Cancel]                         │
│                                     │
└─────────────────────────────────────┘

Navigation: Processing → Eligibility
Time: 3-10 seconds (auto-transition)
Interaction: None (wait)
```

### 4. Eligibility Result Screen
```
┌─────────────────────────────────────┐
│                                     │
│          ELIGIBLE                   │
│          (in green)                 │
│                                     │
│     ⭐ ⭐ ⭐ ⭐ ⭐                      │
│     Confidence: 95%                 │
│                                     │
│  Based on your medical document,   │
│  you're currently eligible for X.   │
│                                     │
│  Rating meaning: Strong eligibility │
│                                     │
│  [▼ Show analysis details]          │
│    ✓ Medical diagnosis identified   │
│    ✓ Duration: >12 months           │
│    ✓ Functional limitation found    │
│    ✓ Currently receiving treatment  │
│                                     │
│  [Proceed with medical assessment]  │
│  [Retake test / Upload document]    │
│                                     │
└─────────────────────────────────────┘

Navigation: Eligibility → Signup or Upload
Time: User-paced (read + decide)
Interaction: Expand details, choose action
```

### 5. Signup Flow - 6 Micro-Steps
```
Step 1/6: Name
┌─────────────────────────────────────┐
│ What's your name?                   │
│ We use this to personalize...       │
│                                     │
│ ◼ Progress bar (16%)                │
│                                     │
│ [Full name]                         │
│                                     │
│ [Back] [Continue]                   │
└─────────────────────────────────────┘

Step 2/6: Email
┌─────────────────────────────────────┐
│ What's your email?                  │
│ We'll send you updates and...       │
│                                     │
│ ◼◼ Progress bar (33%)               │
│                                     │
│ [you@example.com]                   │
│ Verification code will be sent      │
│                                     │
│ [Back] [Continue]                   │
└─────────────────────────────────────┘

Step 3/6: Password
┌─────────────────────────────────────┐
│ Create a password                   │
│ Use a strong, unique password       │
│                                     │
│ ◼◼◼ Progress bar (50%)              │
│                                     │
│ [••••••••]                          │
│                                     │
│ Strength: GOOD ◼◼◼○○                │
│ ✓ 8+ characters                     │
│ ✓ Number                            │
│ ✓ Uppercase                         │
│ ○ Lowercase                         │
│ ○ Special char                      │
│                                     │
│ [Back] [Continue]                   │
└─────────────────────────────────────┘

Step 4/6: Phone
┌─────────────────────────────────────┐
│ What's your phone number?           │
│ SMS verification code will be sent  │
│                                     │
│ ◼◼◼◼ Progress bar (67%)             │
│                                     │
│ [(555) 000-0000]                    │
│                                     │
│ [Back] [Continue]                   │
└─────────────────────────────────────┘

Step 5/6: SSN
┌─────────────────────────────────────┐
│ Identity verification               │
│ We need your SSN to verify...       │
│                                     │
│ ◼◼◼◼◼ Progress bar (83%)            │
│                                     │
│ 🔒 Why we need this: encrypted...   │
│ [###-##-####]                       │
│                                     │
│ ☑ I consent to secure storage...   │
│                                     │
│ Prefer to upload ID instead?        │
│                                     │
│ [Back] [Continue]                   │
└─────────────────────────────────────┘

Step 6/6: Confirmation
┌─────────────────────────────────────┐
│ Review your information             │
│                                     │
│ ◼◼◼◼◼◼ Progress bar (100%)          │
│                                     │
│ Name: John Doe                      │
│ Email: john@example.com             │
│ Phone: (555) 000-0000               │
│ ✓ All set                           │
│                                     │
│ [Back] [Continue to assessment]    │
│                                     │
└─────────────────────────────────────┘

Navigation: Signup → Voice Agent
```

### 6. Voice Agent Screen
```
┌─────────────────────────────────────┐
│ Voice assessment                    │
│ Answer questions. Speak or type.    │
│                                     │
│ Question 1/5                        │
│ ◼○○○○ Progress (20%)                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Can you describe your primary   │ │
│ │ medical condition?              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Play question] 🔊                  │
│                                     │
│         ◯ (large mic)               │
│    Click to record                  │
│                                     │
│ Your response:                      │
│ "I have chronic back pain..."       │
│ [X] (edit/delete)                   │
│                                     │
│ [Upload documents]                  │
│                                     │
│ [Back] [Next question]              │
│                                     │
└─────────────────────────────────────┘

Navigation: Voice → Analysis
Time: 5-10 minutes (5 questions × 1-2 min each)
```

### 7. Analysis Screen
```
┌─────────────────────────────────────┐
│                                     │
│      ⟳ (spinning)                   │
│                                     │
│  Analyzing core medical             │
│  documents…                         │
│                                     │
│  This usually takes <30 seconds     │
│                                     │
│                                     │
│  (Auto-transitions to Payment)      │
│                                     │
└─────────────────────────────────────┘

Navigation: Analysis → Payment
Time: 3 seconds (auto-transition)
```

### 8. Payment Screen
```
┌─────────────────────────────────────┐
│ Complete your assessment            │
│ Proceed with payment to finalize    │
│                                     │
│ ┌─ Fee Breakdown ────────────────┐ │
│ │ Comprehensive medical          │ │
│ │ assessment.............$299.00 │ │
│ │ Processing fee.....Included    │ │
│ │ Secured by............Stripe   │ │
│ │                                │ │
│ │ TOTAL.........$299.00           │ │
│ └────────────────────────────────┘ │
│                                     │
│ 🔒 Secure payment by Stripe        │
│ You'll receive receipt at email    │
│                                     │
│ Payment method:                     │
│ ◉ Credit/Debit Card                │
│ ○ PayPal                           │
│                                     │
│ By clicking Pay, you agree to      │
│ Terms and Privacy Policy           │
│                                     │
│ [Back] [Pay $299.00 & continue]    │
│                                     │
└─────────────────────────────────────┘

Navigation: Payment → Post-Payment
Time: User-paced
Interaction: Select payment method, confirm
```

### 9. Post-Payment Questionnaire
```
┌─────────────────────────────────────┐
│ Quick follow-up questions           │
│ Help us better serve you            │
│                                     │
│ 1. What type of support needed?    │
│    [Financial assistance ▼]        │
│                                     │
│ 2. When do you need assistance?    │
│    [Immediate (within 2 weeks) ▼]  │
│                                     │
│ 3. Best way to contact you?        │
│    [Phone call ▼]                  │
│                                     │
│ 4. Would you like follow-up?       │
│    [Yes, send information ▼]       │
│                                     │
│ 5. How was your experience?        │
│    [Very helpful ▼]                │
│                                     │
│ ℹ️ These answers help us customize │
│                                     │
│ [Back] [Complete assessment]       │
│                                     │
└─────────────────────────────────────┘

Navigation: Post-Payment → Submission
Time: 1-2 minutes (quick selections)
```

### 10. Submission Screen
```
┌─────────────────────────────────────┐
│                                     │
│  ✓ (in circle)                      │
│                                     │
│  All set — submitting your         │
│  application…                       │
│                                     │
│  Just a moment                      │
│                                     │
│  ✓ Eligibility assessment completed │
│  ✓ Payment processed                │
│  ⟳ Submitting your application     │
│                                     │
│  You'll be redirected shortly…     │
│                                     │
└─────────────────────────────────────┘

Navigation: Submission → Success
Time: 3-4 seconds (auto-transition)
Interaction: None (wait)
```

### 11. Success Screen
```
┌─────────────────────────────────────┐
│                                     │
│  ✓ (large, bouncing)                │
│                                     │
│  Your application is submitted      │
│                                     │
│  Confirmation sent to:              │
│  john@example.com                   │
│                                     │
│  What happens next:                 │
│  1. Review by medical team (3-5 d)  │
│  2. Determination decision (email)  │
│  3. Next steps (benefits info)      │
│                                     │
│  ┌─ Application Summary ──────────┐ │
│  │ Name: John Doe                 │ │
│  │ Email: john@example.com        │ │
│  │ Phone: (555) 000-0000          │ │
│  │ Responses: 5 answered          │ │
│  └────────────────────────────────┘ │
│                                     │
│  💬 Support team ready to help.     │
│     [Contact us]                    │
│                                     │
│  [Go to your dashboard] →           │
│                                     │
│  Application ID: APP-1234567        │
│                                     │
└─────────────────────────────────────┘

Navigation: Success → Dashboard
Time: User-paced (final screen)
Interaction: Click dashboard CTA
```

## Color Scheme

- **Primary**: Blue (#2563EB)
- **Success**: Green (#16A34A)
- **Warning**: Yellow (#EAB308)
- **Error**: Red (#DC2626)
- **Eligible (5-4 stars)**: Green
- **Possible (3 stars)**: Yellow
- **Not Eligible (2-1 stars)**: Red

## Typography

- **Headline (H1)**: 2.25rem - 3rem, Bold (800)
- **Heading (H2)**: 1.5rem - 2rem, Bold (700)
- **Body**: 1rem, Regular (400)
- **Small**: 0.875rem, Regular (400)
- **Buttons**: Bold (600), All caps action verbs

## Spacing

- **Large gaps**: 2rem (between sections)
- **Medium gaps**: 1rem (between elements)
- **Small gaps**: 0.5rem (between text)
- **Padding**: 1.5rem - 2rem (cards)

## Interactive Elements

- **Buttons**: Min 48px height (accessibility)
- **Input fields**: Clear focus ring (2px blue)
- **Progress bars**: Smooth animation (300ms)
- **Spinners**: Continuous rotation animation
- **Animations**: Smooth, 200-300ms transitions

## Accessibility Markers

- 🔒 Lock icons for sensitive data
- ⏱️ Time estimates
- ℹ️ Info/Help text
- ✓ Success indicators
- ⭘ Progress indicators
- 🔊 Audio controls

---

**Total Flow Time**: ~15-20 minutes (subject to user input speed)
- Landing: <1 min
- Upload: 1-2 min
- Processing: ~10 sec (auto)
- Eligibility: 1-2 min
- Signup: 2-3 min
- Voice: 5-10 min
- Analysis: ~30 sec (auto)
- Payment: 1-2 min
- Post-Payment: 1 min
- Submission: ~4 sec (auto)
- Success: Read + navigate

**Mobile Considerations**: All screens responsive, touch-friendly buttons
