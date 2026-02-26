
interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  onStepClick: (index: number) => void;
}

export function ProgressBar({ currentStep, totalSteps, progress, onStepClick }: ProgressBarProps) {
  return (
    <div className="flex-1 flex items-center gap-4">
      <div className="flex-1 relative">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* 可点击的步骤点 */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="flex-1 cursor-pointer group"
              onClick={() => onStepClick(i)}
            >
              <div className="relative h-2 flex items-center justify-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 transition-all ${
                    i < currentStep
                      ? 'bg-green-500 border-green-500'
                      : i === currentStep
                      ? 'bg-blue-500 border-blue-500 scale-125'
                      : 'bg-white border-slate-300 group-hover:border-blue-400'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="text-sm font-medium text-slate-600 min-w-[80px] text-right">
        {currentStep + 1} / {totalSteps}
      </span>
    </div>
  );
}
