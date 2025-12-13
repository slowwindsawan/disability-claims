import { useState } from 'react';
import { useOnboarding } from '../OnboardingFlow';
import { AlertCircle, ChevronRight, ChevronLeft, Upload, X } from 'lucide-react';
import { getApiUrl } from '../../../config/api';

interface QuestionData {
  id: string;
  question: string;
  type: 'yes-no' | 'yes-no-partial' | 'date' | 'radio' | 'text' | 'file';
  options?: string[];
  required: boolean;
  helpText?: string;
  followUp?: string; // ID of next question if "Yes" is selected
  stopIfNo?: boolean; // If true, user cannot proceed if "No" is selected
}

const questions: QuestionData[] = [
  {
    id: 'work_related',
    question: 'Did the injury happen at work or while performing work duties?',
    type: 'yes-no',
    required: true,
    helpText: 'This is essential to establish if your claim qualifies under work-related injury rules.',
    stopIfNo: true,
  },
  {
    id: 'injury_date',
    question: 'Date of injury or date you first noticed the condition',
    type: 'date',
    required: true,
    helpText: 'Used to establish filing date and benefit start date.',
  },
  {
    id: 'medical_treatment',
    question: 'Are you currently receiving any medical treatment or were you hospitalized for this injury?',
    type: 'radio',
    options: ['Hospitalised', 'Outpatient care', 'No treatment'],
    required: true,
    helpText: 'Hospitalisation can change effective dates and retrospective evaluations.',
  },
  {
    id: 'unable_to_work',
    question: 'Are you currently unable to work because of this injury?',
    type: 'radio',
    options: ['Yes', 'No', 'Partially'],
    required: true,
    helpText: 'Determines loss-of-earnings and whether urgent/temporary 100% status may apply.',
  },
  {
    id: 'has_medical_reports',
    question: 'Do you have any medical reports, test results, or discharge summaries related to this injury?',
    type: 'yes-no',
    required: true,
    helpText: 'Committee may decide based on documents alone if available.',
  },
  {
    id: 'can_attend_appointment',
    question: 'Can you attend a medical committee appointment in person if required?',
    type: 'radio',
    options: ['Yes', 'No', 'Only at home due to health reasons'],
    required: true,
    helpText: 'If unable to attend, committee can examine at the patient\'s location with medical certification.',
  },
  {
    id: 'previous_rating',
    question: 'Have you previously had a disability rating for the same condition or a related injury?',
    type: 'yes-no',
    required: true,
    helpText: 'Prior ratings affect cumulative calculations and re-evaluation rules.',
  },
  {
    id: 'upload_docs',
    question: 'Optional: Do you have any medical reports or documents you can upload now?',
    type: 'file',
    required: false,
    helpText: 'If you have any PDFs, photos, or reports, you can attach them here to help the review. This is optional.',
  },
];

export default function EligibilityQuestionnaireScreen() {
  const { 
    goToStep, 
    eligibilityAnswers, 
    setEligibilityAnswers, 
    uploadedFile, 
    setUploadedFile,
    setEligibilityRating,
    setEligibilityTitle,
    setEligibilityMessage,
    setConfidence
  } = useOnboarding();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isIneligible, setIsIneligible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Determine which questions to show based on previous answers
  const getNextQuestionIndex = (currentIndex: number): number => {
    return currentIndex + 1;
  };

  const getPreviousQuestionIndex = (currentIndex: number): number => {
    return currentIndex - 1;
  };

  const handleAnswer = (value: string) => {
    setEligibilityAnswers({ ...eligibilityAnswers, [currentQuestion.id]: value });
    setShowError(false);

    // Check if this answer makes them ineligible
    if (currentQuestion.stopIfNo && value === 'No') {
      setIsIneligible(true);
    }
  };

  const handleNext = async () => {
    const answer = eligibilityAnswers[currentQuestion.id];

    // Validate required questions
    if (currentQuestion.required && !answer) {
      setShowError(true);
      return;
    }

    // If ineligible, don't proceed
    if (isIneligible) {
      return;
    }

    const nextIndex = getNextQuestionIndex(currentQuestionIndex);

    if (nextIndex >= questions.length) {
      // All questions completed - submit to backend
      await handleSubmitEligibility();
    } else {
      setCurrentQuestionIndex(nextIndex);
      setShowError(false);
    }
  };

  const handleSubmitEligibility = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get user_id from localStorage if available
      let user_id = null;
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          user_id = payload.sub;
        }
      } catch (e) {
        console.log('No user_id found, proceeding anonymously');
      }

      // Add user_id to answers if available
      const answersWithUser = {
        ...eligibilityAnswers,
        ...(user_id && { user_id })
      };

      const formData = new FormData();
      formData.append('answers', JSON.stringify(answersWithUser));
      
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      const response = await fetch(getApiUrl('/eligibility-submit'), {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to submit eligibility');
      }

      const data = result.data;

      // Store document analysis for result screen if present
      if (data.document_analysis) {
        try {
          localStorage.setItem('eligibility_document_analysis', JSON.stringify(data.document_analysis));
        } catch (e) {
          console.warn('Failed to store document analysis', e);
        }
      }

      // Store results in onboarding context
      setEligibilityRating(data.eligibility_score || 0);
      setEligibilityTitle(data.eligibility_status || 'needs_review');
      setEligibilityMessage(data.reason_summary || '');
      setConfidence(data.confidence || 0);

      // Store full document analysis for analysis screen
      const analysisData = {
        document_analysis: data.document_analysis || null,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        required_next_steps: data.required_next_steps || [],
        case_id: data.case_id
      };
      localStorage.setItem('eligibility_analysis', JSON.stringify(analysisData));

      // Navigate to analysis screen
      goToStep('analysis');
    } catch (error) {
      console.error('Eligibility submission error:', error);
      setSubmitError('Failed to submit eligibility. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = getPreviousQuestionIndex(currentQuestionIndex);
      setCurrentQuestionIndex(prevIndex);
      setShowError(false);
      setIsIneligible(false);
    } else {
      goToStep('landing');
    }
  };

  const currentAnswer = eligibilityAnswers[currentQuestion.id] || '';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-xs font-semibold text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          {/* Required Badge */}
          {currentQuestion.required && (
            <div className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded mb-3">
              Required
            </div>
          )}

          {/* Question */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">{currentQuestion.question}</h2>

          {/* Help Text */}
          {currentQuestion.helpText && (
            <p className="text-sm text-gray-600 mb-4">{currentQuestion.helpText}</p>
          )}

          {/* Answer Options */}
          <div className="space-y-3 mt-4">
            {currentQuestion.type === 'yes-no' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleAnswer('Yes')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition ${
                    currentAnswer === 'Yes'
                      ? 'border-orange-600 bg-orange-50 text-orange-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => handleAnswer('No')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition ${
                    currentAnswer === 'No'
                      ? 'border-orange-600 bg-orange-50 text-orange-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  No
                </button>
              </div>
            )}

            {currentQuestion.type === 'radio' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`w-full py-3 px-4 rounded-lg border-2 font-semibold text-left transition ${
                      currentAnswer === option
                        ? 'border-orange-600 bg-orange-50 text-orange-900'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'date' && (
              <input
                type="date"
                value={currentAnswer}
                onChange={(e) => handleAnswer(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full py-3 px-4 rounded-lg border-2 border-gray-300 focus:border-orange-600 focus:outline-none"
              />
            )}

            {currentQuestion.type === 'text' && (
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                className="w-full py-3 px-4 rounded-lg border-2 border-gray-300 focus:border-orange-600 focus:outline-none resize-none"
              />
            )}

            {currentQuestion.type === 'file' && (
              <div>
                {!uploadedFile ? (
                  <div className="text-center">
                    <input
                      id="elig-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null
                        if (f) {
                          setUploadedFile(f)
                          setEligibilityAnswers({ ...eligibilityAnswers, [currentQuestion.id]: f.name })
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="elig-file-input" className="cursor-pointer">
                      <span className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-5 rounded-lg transition inline-block text-sm">
                        Choose file
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-3">Optional: PDF or image files (JPG, PNG, etc.) - max 10MB</p>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Upload size={20} className="text-orange-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-600">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null)
                          setEligibilityAnswers({ ...eligibilityAnswers, [currentQuestion.id]: '' })
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label="Remove file"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {showError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">
                This question is required. Please provide an answer to continue.
              </p>
            </div>
          )}

          {/* Ineligibility Warning */}
          {isIneligible && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2 mb-2">
                <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-yellow-900">
                  Non-work-related injury
                </p>
              </div>
              <p className="text-sm text-yellow-800 mb-3">
                Based on your answer, this may not qualify as a work-related claim under disability insurance rules.
                However, you may still be eligible under other programs or circumstances.
              </p>
              <button
                onClick={() => goToStep('landing')}
                className="text-sm text-yellow-900 underline font-semibold"
              >
                Return to home and explore other options
              </button>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {submitError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {submitError}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {!isIneligible && (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold transition ${
                isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : currentQuestionIndex === questions.length - 1 ? (
                <>
                  Continue to Interview
                  <ChevronRight size={18} />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          )}
        </div>

        {/* Skip for Optional */}
        {!currentQuestion.required && !isIneligible && (
          <button
            onClick={handleNext}
            className="w-full mt-2 text-center text-sm text-gray-500 hover:text-gray-700 font-medium transition"
          >
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}
