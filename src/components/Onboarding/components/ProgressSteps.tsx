interface ProgressStepsProps {
  steps: string[];
  currentStep?: number;
}

export default function ProgressSteps({ steps, currentStep = 0 }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
            idx <= currentStep
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {idx < currentStep ? '✓' : idx + 1}
          </div>
          <p className={`ml-3 font-semibold ${
            idx <= currentStep
              ? 'text-gray-900'
              : 'text-gray-500'
          }`}>
            {step}
          </p>
          {idx < steps.length - 1 && (
            <div className={`w-12 h-1 mx-4 ${
              idx < currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
