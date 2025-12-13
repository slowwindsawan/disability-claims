import React, { useState } from 'react';
import LandingScreen from './screens/LandingScreen';
import EligibilityQuestionnaireScreen from './screens/EligibilityQuestionnaireScreen';
import UploadDocumentScreen from './screens/UploadDocumentScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import EligibilityResultScreen from './screens/EligibilityResultScreen';
import SignupFlow from './screens/SignupFlow';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import VapiVoiceAgentScreen from './screens/VapiVoiceAgentScreen';
import ESignatureScreen from './screens/ESignatureScreen';
import AnalysisPaymentScreen from './screens/AnalysisPaymentScreen';
import PostPaymentQuestionnaire from './screens/PostPaymentQuestionnaire';
import MedicalDocumentsUpload from './screens/MedicalDocumentsUpload';
import CaseDocumentUploadScreen from './screens/CaseDocumentUploadScreen';
import SubmissionScreen from './screens/SubmissionScreen';
import SuccessScreen from './screens/SuccessScreen';

export type OnboardingStep = 
  | 'landing' 
  | 'questionnaire'
  | 'upload' 
  | 'processing' 
  | 'eligibility' 
  | 'signup' 
  | 'verify-email'
  | 'voice' 
  | 'esignature'
  | 'analysis' 
  | 'payment' 
  | 'post-payment' 
  | 'medical-documents'
  | 'case-documents'
  | 'submission' 
  | 'success';

export interface OnboardingContextType {
  currentStep: OnboardingStep;
  goToStep: (step: OnboardingStep) => void;
  
  // Eligibility questionnaire data
  eligibilityAnswers: Record<string, string>;
  setEligibilityAnswers: (answers: Record<string, string>) => void;
  
  // Form data
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  eligibilityRating: number;
  setEligibilityRating: (rating: number) => void;
  eligibilityTitle: string;
  setEligibilityTitle: (title: string) => void;
  eligibilityMessage: string;
  setEligibilityMessage: (message: string) => void;
  confidence: number;
  setConfidence: (confidence: number) => void;
  
  // Signup form
  formData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    ssn: string;
    identityCode?: string;
  };
  setFormData: (data: any) => void;
  // Registration helpers
  pendingUserId: string | null;
  setPendingUserId: (id: string | null) => void;
  registrationDebugOtp: string | null;
  setRegistrationDebugOtp: (otp: string | null) => void;
  
  // Voice agent
  voiceResponses: string[];
  setVoiceResponses: (responses: string[]) => void;
  
  // Payment
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  postPaymentAnswers: Record<string, string>;
  setPostPaymentAnswers: (answers: Record<string, string>) => void;
}

const OnboardingContext = React.createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingFlowProvider');
  }
  return context;
};

interface OnboardingFlowProps {
  onComplete?: (data: any) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('landing');
  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [eligibilityRating, setEligibilityRating] = useState(0);
  const [eligibilityTitle, setEligibilityTitle] = useState('');
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    ssn: '',
    identityCode: '',
  });
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [registrationDebugOtp, setRegistrationDebugOtp] = useState<string | null>(null);
  const [voiceResponses, setVoiceResponses] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(299);
  const [postPaymentAnswers, setPostPaymentAnswers] = useState<Record<string, string>>({});

  

  // Load saved onboarding for authenticated user
  React.useEffect(() => {
    (async () => {
      try {
        // If there's a one-time resume payload (set by Add Case), prefer it over server-saved onboarding
        try {
          const resumeRaw = localStorage.getItem('resume_onboarding_step')
          if (resumeRaw) {
            let payload: any = null
            try { payload = JSON.parse(resumeRaw) } catch (e) { payload = resumeRaw }
            let stepValue: string | null = null
            let markEligibility = false
            if (payload && typeof payload === 'object' && payload.step) {
              stepValue = String(payload.step)
              markEligibility = !!payload.markEligibilityDone || !!payload.markEligibility
            } else if (typeof payload === 'string') {
              stepValue = payload
            }
            if (!stepValue) stepValue = 'questionnaire'
            try {
              const { normalizeOnboardingStep } = await import('../../lib/onboardingUtils')
              const n = normalizeOnboardingStep(stepValue)
              if (n) stepValue = n
            } catch (e) {}
            // If signed-in and resume asks for signup/verify, skip to voice
            try { const token = localStorage.getItem('access_token'); if (token && (stepValue === 'signup' || stepValue === 'verify-email')) stepValue = 'voice' } catch (e) {}
            setCurrentStep(stepValue as OnboardingStep)
            if (markEligibility) {
              try {
                setEligibilityRating(100)
                setEligibilityTitle('Completed')
                setEligibilityMessage('Eligibility completed (resumed)')
                setConfidence(100)
              } catch (e) {}
            }
            try { localStorage.removeItem('resume_onboarding_step') } catch (e) {}
            return
          }
        } catch (e) {}

        const token = localStorage.getItem('access_token')
        if (!token) return
        const api = await import('../../lib/api')
        const res = await api.apiLoadOnboarding()
        if (res && res.onboarding_state) {
          const s = res.onboarding_state
          if (s.step) {
            try {
              const norm = (await import('../../lib/onboardingUtils')).normalizeOnboardingStep(s.step)
              if (norm) {
                // If user is already signed-in, skip signup/verify steps
                if (token && (norm === 'signup' || norm === 'verify-email')) {
                  setCurrentStep('voice')
                } else {
                  setCurrentStep(norm as OnboardingStep)
                }
              }
            } catch (e) {
              // fallback: if saved step is signup/verify and user is signed in, skip to voice
              if (token && (s.step === 'signup' || s.step === 'verify-email')) {
                setCurrentStep('voice')
              } else {
                setCurrentStep(s.step as OnboardingStep)
              }
            }
          }
          if (s.eligibilityAnswers) setEligibilityAnswers(s.eligibilityAnswers)
          if (s.voiceResponses) setVoiceResponses(s.voiceResponses)
          if (s.postPaymentAnswers) setPostPaymentAnswers(s.postPaymentAnswers)
          if (s.paymentAmount) setPaymentAmount(s.paymentAmount)
        }
      } catch (e) {
        // ignore load errors
      }
    })()
  }, [])

  // Support quick resume from a case list: read a one-time `resume_onboarding_step` key
  React.useEffect(() => {
    (async () => {
      try {
        const resumeRaw = localStorage.getItem('resume_onboarding_step')
        if (resumeRaw) {
          let payload: any = null
          try { payload = JSON.parse(resumeRaw) } catch (e) { payload = resumeRaw }
          let stepValue: string | null = null
          let markEligibility = false
          if (payload && typeof payload === 'object' && payload.step) {
            stepValue = String(payload.step)
            markEligibility = !!payload.markEligibilityDone || !!payload.markEligibility
          } else if (typeof payload === 'string') {
            stepValue = payload
          }

          if (!stepValue) stepValue = 'voice'

          // Normalize step value using onboardingUtils
          try {
            const { normalizeOnboardingStep } = await import('../../lib/onboardingUtils')
            const n = normalizeOnboardingStep(stepValue)
            if (n) stepValue = n
          } catch (e) {}

          // If signed-in, skip signup/verify steps
          try {
            const token = localStorage.getItem('access_token')
            if (token && (stepValue === 'signup' || stepValue === 'verify-email')) {
              stepValue = 'voice'
            }
          } catch (e) {}

          // Apply resume: set current step and optionally mark eligibility complete
          setCurrentStep(stepValue as OnboardingStep)
          if (markEligibility) {
            try {
              setEligibilityRating(100)
              setEligibilityTitle('Completed')
              setEligibilityMessage('Eligibility completed (resumed)')
              setConfidence(100)
            } catch (e) {}
          }

          try { localStorage.removeItem('resume_onboarding_step') } catch (e) {}
        }
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  // Prevent navigating backwards: set a minimum allowed step index (forward-only progress)
  const stepsOrder: OnboardingStep[] = ['landing','questionnaire','upload','processing','eligibility','signup','verify-email','analysis','voice','esignature','payment','post-payment','medical-documents','case-documents','submission','success']
  const [minAllowedIndex, setMinAllowedIndex] = React.useState<number>(0)

  // update minAllowedIndex whenever currentStep moves forward
  React.useEffect(() => {
    const idx = stepsOrder.indexOf(currentStep)
    if (idx >= 0 && idx > minAllowedIndex) setMinAllowedIndex(idx)
  }, [currentStep])

  const goToStep = (step: OnboardingStep) => {
    const targetIdx = stepsOrder.indexOf(step)
    if (targetIdx < 0) return
    // disallow going to earlier steps
    if (targetIdx < minAllowedIndex) return
    // If user is signed-in, skip signup/verify
    try {
      const token = localStorage.getItem('access_token')
      if (token && (step === 'signup' || step === 'verify-email')) {
        setCurrentStep('voice')
        return
      }
    } catch (e) {}

    setCurrentStep(step)
  };

  const contextValue: OnboardingContextType = {
    currentStep,
    goToStep,
    eligibilityAnswers,
    setEligibilityAnswers,
    uploadedFile,
    setUploadedFile,
    eligibilityRating,
    setEligibilityRating,
    eligibilityTitle,
    setEligibilityTitle,
    eligibilityMessage,
    setEligibilityMessage,
    confidence,
    setConfidence,
    formData,
    setFormData,
    pendingUserId,
    setPendingUserId,
    registrationDebugOtp,
    setRegistrationDebugOtp,
    voiceResponses,
    setVoiceResponses,
    paymentAmount,
    setPaymentAmount,
    postPaymentAnswers,
    setPostPaymentAnswers,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      <div className="onboarding-flow min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {currentStep === 'landing' && <LandingScreen />}
        {currentStep === 'questionnaire' && <EligibilityQuestionnaireScreen />}
        {currentStep === 'upload' && <UploadDocumentScreen />}
        {currentStep === 'processing' && <ProcessingScreen />}
        {currentStep === 'eligibility' && <EligibilityResultScreen />}
        {currentStep === 'signup' && <SignupFlow />}
        {currentStep === 'verify-email' && <VerifyEmailScreen />}
        {currentStep === 'voice' && <VapiVoiceAgentScreen />}
        {currentStep === 'esignature' && <ESignatureScreen />}
        {currentStep === 'analysis' && <AnalysisPaymentScreen />}
        {currentStep === 'payment' && <AnalysisPaymentScreen showPayment={true} />}
        {currentStep === 'post-payment' && <PostPaymentQuestionnaire />}
        {currentStep === 'medical-documents' && <MedicalDocumentsUpload />}
        {currentStep === 'case-documents' && <CaseDocumentUploadScreen />}
        {currentStep === 'submission' && <SubmissionScreen />}
        {currentStep === 'success' && <SuccessScreen onComplete={onComplete} />}
      </div>
    </OnboardingContext.Provider>
  );
}
