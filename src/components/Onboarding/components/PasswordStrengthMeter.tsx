import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const checks = {
    minLength: password.length >= 8,
    hasNumber: /[0-9]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
  };

  const passCount = Object.values(checks).filter(Boolean).length;
  const strength = passCount <= 2 ? 'weak' : passCount <= 3 ? 'fair' : passCount <= 4 ? 'good' : 'strong';

  const strengthColor = {
    weak: 'text-red-600 bg-red-100',
    fair: 'text-yellow-600 bg-yellow-100',
    good: 'text-blue-600 bg-blue-100',
    strong: 'text-green-600 bg-green-100',
  };

  return (
    <div className="mt-4">
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Password strength:</span>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${strengthColor[strength]}`}>
            {strength}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              strength === 'weak' ? 'w-1/4 bg-red-600' :
              strength === 'fair' ? 'w-2/4 bg-yellow-600' :
              strength === 'good' ? 'w-3/4 bg-blue-600' :
              'w-full bg-green-600'
            }`}
          />
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          {checks.minLength ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <X size={16} className="text-gray-400" />
          )}
          <span className={checks.minLength ? 'text-green-700' : 'text-gray-600'}>
            At least 8 characters
          </span>
        </div>
        <div className="flex items-center gap-2">
          {checks.hasNumber ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <X size={16} className="text-gray-400" />
          )}
          <span className={checks.hasNumber ? 'text-green-700' : 'text-gray-600'}>
            One number
          </span>
        </div>
        <div className="flex items-center gap-2">
          {checks.hasUppercase ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <X size={16} className="text-gray-400" />
          )}
          <span className={checks.hasUppercase ? 'text-green-700' : 'text-gray-600'}>
            One uppercase letter
          </span>
        </div>
        <div className="flex items-center gap-2">
          {checks.hasLowercase ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <X size={16} className="text-gray-400" />
          )}
          <span className={checks.hasLowercase ? 'text-green-700' : 'text-gray-600'}>
            One lowercase letter
          </span>
        </div>
        <div className="flex items-center gap-2">
          {checks.hasSpecial ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <X size={16} className="text-gray-400" />
          )}
          <span className={checks.hasSpecial ? 'text-green-700' : 'text-gray-600'}>
            One special character (!@#$%^&*)
          </span>
        </div>
      </div>
    </div>
  );
}
