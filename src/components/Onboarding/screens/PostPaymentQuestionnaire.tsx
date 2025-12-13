import { useOnboarding } from '../OnboardingFlow';

const QUESTIONS = [
  {
    id: 'support',
    label: 'What type of support would be most helpful right now?',
    type: 'select',
    options: ['Financial assistance', 'Legal guidance', 'Medical referrals', 'Job accommodation', 'All of the above']
  },
  {
    id: 'timeline',
    label: 'When do you need assistance?',
    type: 'select',
    options: ['Immediate (within 2 weeks)', 'Soon (within 1-3 months)', 'Not urgent', 'Unsure']
  },
  {
    id: 'contact',
    label: "What's the best way to contact you?",
    type: 'select',
    options: ['Phone call', 'Email', 'SMS text message', 'No preference']
  },
  {
    id: 'follow',
    label: 'Would you like follow-up resources?',
    type: 'select',
    options: ['Yes, send me information', 'No, I\'m all set', 'Maybe later']
  },
  {
    id: 'feedback',
    label: 'How was your assessment experience?',
    type: 'select',
    options: ['Very helpful', 'Helpful', 'Neutral', 'Could be better']
  }
];

export default function PostPaymentQuestionnaire() {
  const { goToStep, postPaymentAnswers, setPostPaymentAnswers } = useOnboarding();

  const handleAnswer = (questionId: string, value: string) => {
    setPostPaymentAnswers({
      ...postPaymentAnswers,
      [questionId]: value
    });
  };

  const allAnswered = QUESTIONS.every(q => postPaymentAnswers[q.id]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Quick follow-up questions</h1>
          <p className="text-xs text-gray-600">Help us better serve you with just a few quick answers.</p>
        </div>

        {/* Questions Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {QUESTIONS.map((question, idx) => (
            <div key={question.id}>
              <label className="block font-semibold text-gray-900 mb-2 text-sm">
                <span className="text-orange-600 mr-1">{idx + 1}</span>
                {question.label}
              </label>
              <select
                value={postPaymentAnswers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
              >
                <option value="">Select an option...</option>
                {question.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            ℹ️ These answers help us customize your next steps and provide relevant resources.
          </p>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => goToStep('payment')}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 rounded-lg border border-gray-300 transition text-sm"
          >
            Back
          </button>
          <button
            onClick={() => goToStep('submission')}
            disabled={!allAnswered}
            className={`flex-1 font-semibold py-2 px-3 rounded-lg transition text-sm ${
              allAnswered
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Complete assessment
          </button>
        </div>
      </div>
    </div>
  );
}
