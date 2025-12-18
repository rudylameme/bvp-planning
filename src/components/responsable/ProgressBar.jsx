import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Import', icon: '📥' },
  { id: 2, label: 'Configuration', icon: '⚙️' },
  { id: 3, label: 'Pilotage CA', icon: '📊' },
  { id: 4, label: 'Promos', icon: '🏷️' },
  { id: 5, label: 'Export', icon: '📤' },
];

export default function ProgressBar({ currentStep }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isLast = index === STEPS.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Cercle de l'étape */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-[#ED1C24] text-white ring-4 ring-[#ED1C24]/20'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      isCurrent
                        ? 'text-[#ED1C24]'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Ligne de connexion */}
                {!isLast && (
                  <div className="flex-1 mx-4">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
