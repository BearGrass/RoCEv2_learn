
interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
  onStepClick: (index: number) => void;
  stepLabels?: string[];
}

export function ProgressBar({ currentStep, totalSteps, progress, onStepClick, stepLabels = [] }: ProgressBarProps) {
  // 生成步骤标签（如果没有传入）
  const labels = stepLabels.length > 0 ? stepLabels :
    Array.from({ length: totalSteps }, (_, i) => `步骤 ${i + 1}`);

  return (
    <div className="flex-1 flex items-center gap-4">
      <div className="flex-1 relative">
        {/* 进度条背景 */}
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          {/* 进度条填充 - 使用线性过渡 */}
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            style={{
              width: `${progress}%`,
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
        {/* 可点击的步骤点 */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="flex-1 cursor-pointer group"
              onClick={() => onStepClick(i)}
              title={labels[i]}
            >
              <div className="relative h-2 flex items-center justify-center">
                {/* 步骤点 */}
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < currentStep
                      ? 'bg-green-500 border-green-500 shadow-sm shadow-green-300'
                      : i === currentStep
                      ? 'bg-blue-500 border-blue-500 scale-150 shadow-md shadow-blue-300'
                      : 'bg-white border-slate-300 group-hover:border-blue-400 group-hover:scale-110'
                  }`}
                />
                {/* 当前步骤的脉冲效果 */}
                {i === currentStep && (
                  <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30" />
                )}
              </div>
            </div>
          ))}
        </div>
        {/* 步骤标签行 */}
        <div className="absolute inset-0 flex pointer-events-none">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 flex justify-center">
              <span className={`text-[9px] mt-3 transition-colors ${
                i === currentStep ? 'text-blue-600 font-semibold' : 'text-slate-400'
              }`}>
                {i + 1}
              </span>
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
