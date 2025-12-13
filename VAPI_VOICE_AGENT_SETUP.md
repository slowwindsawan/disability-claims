# Vapi Voice Agent Setup Instructions

## Overview
The eligibility questionnaire now uses the Vapi AI voice agent to conduct lawyer-style interviews with users after they complete the initial 7-question eligibility questionnaire.

## Changes Made

### 1. Eligibility Questionnaire Reduced to 7 Questions
The eligibility questionnaire now includes only the 7 most important questions:
1. Work-related injury (Yes/No with ineligibility check)
2. Injury date
3. Medical treatment status
4. Unable to work
5. Has medical reports
6. Can attend appointment
7. Previous rating

### 2. Document Upload Removed from Eligibility Flow
- Document upload is no longer part of the initial eligibility flow
- Users proceed directly from eligibility questions to the voice interview
- Flow: Landing → Eligibility (7 questions) → Voice Interview → Signup

### 3. New Vapi Voice Agent Integration
- **Location**: `src/components/Onboarding/screens/VapiVoiceAgentScreen.tsx`
- **Features**:
  - Real-time voice conversation with AI lawyer
  - Volume level monitoring (console logged for future visualizer)
  - Transcript recording
  - Mute/unmute functionality
  - Professional lawyer persona conducting intake interview
  - Context-aware based on eligibility questionnaire answers

## Setup Instructions

### 1. Install Dependencies
The @vapi-ai/web SDK needs to be installed:

```bash
npm install @vapi-ai/web
```

### 2. Get Your Vapi API Key
1. Sign up at [https://vapi.ai](https://vapi.ai)
2. Go to your dashboard and create a new API key
3. Copy your **Public API Key**

### 3. Configure the API Key
Open `src/components/Onboarding/screens/VapiVoiceAgentScreen.tsx` and replace the placeholder:

```typescript
// Line 14: Replace this:
const vapi = new Vapi('YOUR_VAPI_PUBLIC_KEY');

// With your actual key:
const vapi = new Vapi('pk_your_actual_key_here');
```

### 4. Customize the Voice Agent (Optional)
You can customize the voice agent behavior in the `startCall` function:

#### Change the Voice
```typescript
voice: {
  provider: "11labs",
  voiceId: "paula" // Options: paula, rachel, domi, bella, antoni, etc.
}
```

#### Adjust the System Prompt
Edit the system message content to change the lawyer's interview style and questions.

#### Change the AI Model
```typescript
model: {
  provider: "openai",
  model: "gpt-4" // Options: gpt-4, gpt-3.5-turbo, etc.
}
```

## Features Implemented

### Volume Level Monitoring
The voice agent includes a volume-level event listener that logs audio levels to the console:

```typescript
vapi.on('volume-level', (level: number) => {
  console.log('Volume level:', level);
  setVolumeLevel(level);
});
```

This is displayed as:
- A percentage indicator below the microphone icon
- A visual progress bar
- A pulsing animation around the microphone based on volume

### Frontend-Only Implementation
As requested, the voice agent is completely frontend-based:
- No backend integration
- All conversation happens through Vapi's API
- Transcripts are stored in component state only
- No database storage at this stage

### Professional Lawyer Persona
The AI is configured to:
- Introduce itself as a disability claims lawyer
- Ask relevant follow-up questions based on eligibility answers
- Maintain a professional and empathetic tone
- Focus on gathering information for a strong disability claim

## User Flow

1. **Landing Screen** → User starts onboarding
2. **Eligibility Questionnaire** → 7 critical questions (work-related, injury date, treatment, etc.)
3. **Voice Interview** → AI lawyer conducts detailed intake interview
4. **Signup** → User creates account
5. Continue with remaining onboarding steps...

## Testing

To test the voice agent:
1. Make sure you have a valid Vapi API key configured
2. Start the dev server: `npm run dev`
3. Navigate through the eligibility questionnaire
4. Click "Start Interview" on the voice agent screen
5. Allow microphone permissions when prompted
6. Speak naturally with the AI lawyer
7. Check the browser console for volume level logs

## Future Enhancements

The volume level data is already being captured and can be used to add:
- Real-time audio visualizer
- Waveform display
- Speaking indicator animations
- Voice activity detection UI

## Notes

- The voice agent can be skipped if the user prefers not to do the interview
- The transcript is displayed in real-time during the conversation
- The call can be ended at any time
- Mute functionality is available during the call
- The eligibility questionnaire answers are passed as context to the AI lawyer
