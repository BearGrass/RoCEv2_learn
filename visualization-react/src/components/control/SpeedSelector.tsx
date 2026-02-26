
interface SpeedSelectorProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const speeds = [0.5, 1, 1.5, 2];

export function SpeedSelector({ speed, onSpeedChange }: SpeedSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">速度:</span>
      <div className="flex gap-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              speed === s
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
