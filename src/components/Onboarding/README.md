# Disability Claims Onboarding Flow

A comprehensive, user-friendly onboarding flow for disability benefits assessment with accessibility and security best practices.

## Overview

The onboarding system guides users through a complete disability benefits eligibility assessment in 10 screens, with micro-steps for data collection, voice-based assessment, and secure payment processing.

## Screen Flow

### 1. **Landing Screen** (`LandingScreen.tsx`)
- Large headline: "Check eligibility in minutes"
- Feature highlights
- Primary CTA: "Start eligibility test"
- Security reassurance badge

### 2. **Upload Document** (`UploadDocumentScreen.tsx`)
- Drag-and-drop file upload
- Supported formats: PDF, JPG, PNG, DOCX
- File preview with security notice
- Lock icon + "Secure upload" messaging

### 3. **Processing** (`ProcessingScreen.tsx`)
- Full-screen spinner with animated steps (Uploading → Analyzing → Scoring)
- Estimated time: ~10 seconds
- Cancel option to upload different document
- Progress indicator

### 4. **Eligibility Result** (`EligibilityResultScreen.tsx`)
- Large, colorful result card (Eligible/Not eligible)
- 5-star rating system (1-5 stars)
- Confidence percentage display
- Collapsible details with findings
- Two action buttons: Proceed vs. Retake test

### 5. **Signup Flow** (`SignupFlow.tsx`)
Stepper with 6 micro-steps (one input per screen):

#### Step 1: Full Name
- Simple text input
- Progress bar shows 1/6

#### Step 2: Email
- Email validation
- Message: "Verification code will be sent"
- Progress bar shows 2/6

#### Step 3: Password
- Password strength meter with 5-point validation
- Real-time feedback
- Progress bar shows 3/6

#### Step 4: Phone
- Phone number input
- Message: "SMS verification code will be sent"
- Progress bar shows 4/6

#### Step 5: SSN / Identity
- **Option A**: SSN input with security explanation
  - Lock icon + compliance messaging
  - Consent checkbox required
- **Option B**: Upload government ID
- Toggle between options
- Progress bar shows 5/6

#### Step 6: Confirmation
- Review all entered information
- Final CTA: "Continue to assessment"

### 6. **Voice Agent** (`VoiceAgentScreen.tsx`)
- Welcome screen: "Now the voice assistant will ask a few questions"
- 5 predefined medical questions
- Large microphone button
- Fallback: Type-your-answer text input
- Optional: Upload additional documents mid-conversation
- Live transcript display (editable)
- Question-by-question flow with confirmations
- Audio playback of question before answering
- Progress indicator: Question X of 5

### 7. **Analysis** (`AnalysisPaymentScreen.tsx`)
- Animated loading screen
- Message: "Analyzing core medical documents…"
- Estimated time: <30 seconds
- Auto-transition to payment screen

### 8. **Payment** (`AnalysisPaymentScreen.tsx` - `showPayment=true`)
- Fee breakdown card
- Payment method selection (Credit Card, PayPal)
- Secure badge with Stripe branding
- Terms & Privacy links
- Primary CTA: "Pay & continue"
- Amount: $299 (customizable via `paymentAmount` state)

### 9. **Post-Payment Questionnaire** (`PostPaymentQuestionnaire.tsx`)
- 5 quick follow-up questions
  1. Type of support needed
  2. Timeline urgency
  3. Contact preference
  4. Follow-up resources preference
  5. Experience feedback
- All dropdowns with predefined options
- Completion indicator
- Primary CTA: "Complete assessment"

### 10. **Submission** (`SubmissionScreen.tsx`)
- Animated checkmark icon
- Message: "All set — submitting your application…"
- Submission progress steps:
  - ✓ Eligibility assessment completed
  - ✓ Payment processed
  - (spinning) Submitting your application
- Auto-transition to success screen

### 11. **Success** (`SuccessScreen.tsx`)
- Large success icon
- Application submitted confirmation
- Email confirmation message
- "What happens next" timeline (3 steps)
- Application summary box
- Support contact CTA
- Primary CTA: "Go to your dashboard"
- Unique Application ID
- Auto-generated (or navigates to `/dashboard`)

## State Management

Uses React Context API (`OnboardingContext`) to manage:

```typescript
- currentStep: Current screen in the flow
- uploadedFile: Medical document upload
- eligibilityRating: 1-5 star rating
- eligibilityTitle: "Eligible" or "Not eligible"
- confidence: Percentage confidence score
- formData: Name, email, password, phone, SSN
- voiceResponses: Array of voice agent answers
- paymentAmount: Assessment fee ($299)
- postPaymentAnswers: Follow-up questionnaire responses
```

## Utility Components

### `LoadingSpinner` 
Animated spinner for processing states

### `ProgressSteps` 
Visual step indicator (used in processing screen)

### `PasswordStrengthMeter`
Real-time password validation with 5 checks:
- Minimum 8 characters
- At least one number
- At least one uppercase letter
- At least one lowercase letter
- At least one special character (!@#$%^&*)

## Accessibility Features

- **ARIA labels** on all dynamic elements (file input, microphone, live regions)
- **Keyboard navigation** fully supported
- **Focus management** with visible focus indicators
- **Color contrast** meets WCAG AA standards
- **Captions** for voice UI (live transcript)
- **Reduced motion** support via `prefers-reduced-motion`
- **High contrast** mode support
- **Dark mode** compatible
- **Screen reader** friendly with semantic HTML

## UI/UX Best Practices

### Security Affordances
- Lock icons before sensitive data entry
- Encryption messaging ("files are encrypted in transit")
- Compliance language for SSN collection
- Secure payment badge with provider name
- Terms/Privacy links before payment

### Progressive Disclosure
- Micro-steps: one decision/input per screen
- Explanation for each field ("Why we need this")
- Clear next steps messaging
- Error messages in plain language

### Friendly Microcopy
- "Check eligibility in minutes" (urgency + confidence)
- "Analyzing… we extract only the medical data required" (reassurance)
- "Your number is encrypted and used only for identity verification" (security)
- "~10 seconds" (estimated timing)
- "Contact support" (human touch)

### Visual Feedback
- Animated spinners during processing
- Progress bars for multi-step forms
- Color-coded stars (red/yellow/green)
- Confidence percentages next to ratings
- Success checkmarks with bounce animation

## Styling

- **Framework**: Tailwind CSS
- **Icons**: lucide-react
- **Custom CSS**: `Onboarding.css` for animations and accessibility
- **Gradients**: Blue to indigo theme
- **Responsive**: Mobile-first design

## Files Structure

```
src/components/Onboarding/
├── OnboardingFlow.tsx                          # Main context + router
├── Onboarding.css                              # Styles & animations
├── screens/
│   ├── LandingScreen.tsx
│   ├── UploadDocumentScreen.tsx
│   ├── ProcessingScreen.tsx
│   ├── EligibilityResultScreen.tsx
│   ├── SignupFlow.tsx
│   ├── VoiceAgentScreen.tsx
│   ├── AnalysisPaymentScreen.tsx
│   ├── PostPaymentQuestionnaire.tsx
│   ├── SubmissionScreen.tsx
│   └── SuccessScreen.tsx
└── components/
    ├── LoadingSpinner.tsx
    ├── ProgressSteps.tsx
    └── PasswordStrengthMeter.tsx
```

## Usage

Import and use the `OnboardingFlow` component:

```tsx
import OnboardingFlow from './components/Onboarding/OnboardingFlow';

function App() {
  return (
    <OnboardingFlow 
      onComplete={(data) => {
        console.log('Onboarding complete:', data);
        // Navigate to dashboard or process data
      }}
    />
  );
}
```

## Mock Data

All screens use mock data (no backend required):
- Eligibility rating: Randomly generated (1-5 stars)
- Voice agent: Simulated speech-to-text responses
- Payment: Mock payment processing (no real charges)
- Questionnaire: Predefined option selections
- Database: In-memory state management only

## Customization

### Change Assessment Fee
```tsx
// In OnboardingFlow.tsx
const [paymentAmount, setPaymentAmount] = useState(399); // $3.99 instead of $2.99
```

### Add/Remove Voice Questions
```tsx
// In VoiceAgentScreen.tsx
const VOICE_AGENT_QUESTIONS = [
  "Your questions here...",
  // ...
];
```

### Modify Star Rating Explanations
```tsx
// In EligibilityResultScreen.tsx
const ratingExplanation = {
  5: "Your custom explanation...",
  // ...
};
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- Backend integration for actual document processing
- Real payment gateway integration
- Email verification with OTP
- SMS verification for phone
- Actual speech-to-text API (Google Cloud Speech-to-Text, AWS Transcribe)
- Document storage (AWS S3, Azure Blob)
- Analytics tracking
- A/B testing for UX optimization
- Multi-language support
