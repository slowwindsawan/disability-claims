# Eligibility Questionnaire Implementation

## Overview
The eligibility questionnaire has been integrated into the onboarding flow as a dedicated step that comes **before** document upload. This ensures we collect critical information to properly assess the user's eligibility before they invest time in gathering documents.

## Flow Order
1. **Landing Screen** - Welcome and introduction
2. **Eligibility Questionnaire** ⭐ NEW - 11 screening questions
3. **Upload Document** - Medical document upload
4. **Processing** - AI analysis of document
5. **Eligibility Result** - Rating and results
6. **Signup** - Account creation
7. Continue with remaining steps...

## Questions Included

### Required Questions (8)
1. **Work-related injury** (Yes/No)
   - *Critical*: If "No", user is marked as ineligible with explanation
   - Purpose: Establish if claim qualifies under work-related rules

2. **Injury date** (Date picker)
   - Purpose: Establish filing date and benefit start date

3. **Medical treatment status** (Radio: Hospitalized/Outpatient/No treatment)
   - Purpose: Affects effective dates and retrospective evaluations

4. **Unable to work** (Radio: Yes/No/Partially)
   - Purpose: Determines loss-of-earnings and temporary 100% status eligibility

5. **Has medical reports** (Yes/No)
   - Purpose: Committee may decide based on documents alone

6. **Can attend appointment** (Radio: Yes/No/Only at home)
   - Purpose: Committee can examine at patient's location if needed

7. **Previous disability rating** (Yes/No)
   - *Conditional*: If "Yes", shows follow-up for details
   - Purpose: Affects cumulative calculations and re-evaluation rules

8. **Has income** (Yes/No)
   - *Conditional*: If "Yes", shows follow-up for amount
   - Purpose: Relevant for temporary 100% status and benefit calculation

9. **Has lawyer/agent** (Yes/No)
   - *Conditional*: If "Yes", shows follow-up for contact info
   - Purpose: Routing of communications and hearing preparation

10. **Condition worsened** (Radio: Yes/No/Not previously rated)
    - Purpose: Trigger for re-evaluation request

### Optional Questions (3)
11. **Previous rating details** (Text area)
    - Only shown if question #7 is "Yes"
    - Collects details about prior rating

12. **Income amount** (Text input)
    - Only shown if question #9 is "Yes"
    - Helps calculate potential benefits

13. **Lawyer contact info** (Text area)
    - Only shown if question #10 is "Yes"
    - Collects representative contact details

14. **Other injuries** (Yes/No)
    - Purpose: Compute combined/cumulative disability

15. **Other injury details** (Text area)
    - Only shown if question #14 is "Yes"
    - Details about other injuries to same limb/organ

## Key Features

### Smart Navigation
- **Conditional questions**: Follow-up questions only appear if parent question is answered appropriately
- **Skip logic**: Optional questions can be skipped
- **Back navigation**: Properly handles skipped questions when going back

### Progress Tracking
- Visual progress bar showing completion percentage
- Question counter (e.g., "Question 3 of 11")
- Required vs optional badges

### User Experience
- Large, easy-to-tap buttons for answers
- Clear help text explaining why each question matters
- Error messages for required fields
- Smooth transitions between questions

### Ineligibility Handling
- If user answers "No" to work-related injury question
- Shows clear warning message
- Prevents further progression
- Offers option to return home

### Visual Design
- Consistent with existing onboarding design system
- Orange accent color (#EA580C) for CTAs and progress
- Clean, modern card-based layout
- Responsive design for mobile and desktop

## Technical Implementation

### State Management
```typescript
// Added to OnboardingFlow context
eligibilityAnswers: Record<string, string>;
setEligibilityAnswers: (answers: Record<string, string>) => void;
```

### Data Structure
```typescript
interface QuestionData {
  id: string;              // Unique identifier
  question: string;        // Question text
  type: 'yes-no' | 'radio' | 'date' | 'text';
  options?: string[];      // For radio buttons
  required: boolean;       // Whether answer is required
  helpText?: string;       // Explanation of why we ask
  stopIfNo?: boolean;      // Stop flow if "No" is selected
}
```

### Answer Storage
All answers are stored in a flat object:
```typescript
{
  "work_related": "Yes",
  "injury_date": "2024-01-15",
  "medical_treatment": "Outpatient care",
  "unable_to_work": "Partially",
  // ... etc
}
```

## Integration Points

### From Landing Screen
```typescript
goToStep('questionnaire')  // Instead of 'upload'
```

### To Document Upload
After completing all questions:
```typescript
goToStep('upload')  // Proceeds to document upload
```

### Data Usage
The `eligibilityAnswers` object is available throughout the flow and can be:
- Sent to backend for claim creation
- Used to customize document requirements
- Included in AI analysis prompts
- Referenced in eligibility scoring

## Future Enhancements

### Potential Additions
1. **Save progress** - Allow users to resume later
2. **Pre-fill from documents** - If user uploads first, pre-populate answers
3. **Dynamic question generation** - AI suggests additional questions based on answers
4. **Validation** - Date range validation, income format checking
5. **Multi-language** - Hebrew translations for all questions
6. **Analytics** - Track completion rates and drop-off points

### Backend Integration
When connecting to real backend:
1. Save answers after each question (auto-save)
2. Retrieve saved answers on return
3. Include answers in eligibility analysis API call
4. Use answers to customize document checklist
5. Store in claim record for future reference

## Testing Checklist

- [ ] All required questions prevent progression if unanswered
- [ ] Optional questions can be skipped
- [ ] Conditional questions appear/hide correctly
- [ ] Back button handles skipped questions properly
- [ ] Progress bar updates accurately
- [ ] Ineligibility warning shows for work-related "No"
- [ ] Date picker doesn't allow future dates
- [ ] Text areas accept sufficient length
- [ ] Mobile responsive design works correctly
- [ ] Data persists when navigating back/forward

## Files Modified

1. **Created**: `EligibilityQuestionnaireScreen.tsx`
   - New questionnaire component with all 11 questions
   - Smart navigation and conditional logic
   - Full UI implementation

2. **Modified**: `OnboardingFlow.tsx`
   - Added 'questionnaire' step type
   - Added eligibilityAnswers state
   - Integrated questionnaire screen into flow

3. **Modified**: `LandingScreen.tsx`
   - Changed CTA to navigate to questionnaire
   - Updated description to mention questions

## BTL Integration Notes

All questions align with BTL (Bituach Leumi) disability assessment requirements:
- Work-related injury verification
- Timing and documentation requirements
- Medical committee preparation
- Previous rating considerations
- Income and loss-of-earnings calculation
- Re-evaluation triggers per Section 71 regulations

The answers collected provide the essential information needed for accurate BTL claim processing and compliance with Israeli disability insurance law.
