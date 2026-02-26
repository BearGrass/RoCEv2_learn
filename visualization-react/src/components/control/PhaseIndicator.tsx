
interface PhaseIndicatorProps {
  currentPhase: number;
}

const phases = [
  { num: 1, name: '资源准备' },
  { num: 2, name: 'QP 创建' },
  { num: 3, name: '状态转换' },
  { num: 4, name: '连接完成' },
];

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">阶段:</span>
      <div className="flex gap-1">
        {phases.map((phase) => (
          <div
            key={phase.num}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              currentPhase === phase.num
                ? 'bg-green-500 text-white shadow-md'
                : currentPhase > phase.num
                ? 'bg-green-200 text-green-800'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {phase.num}
          </div>
        ))}
      </div>
    </div>
  );
}
