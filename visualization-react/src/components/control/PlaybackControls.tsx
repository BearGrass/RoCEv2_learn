import { Play, Pause, StepBack, StepForward, RotateCcw } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function PlaybackControls({
  isPlaying,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onReset,
  canGoPrev,
  canGoNext,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="上一步"
      >
        <StepBack className="w-5 h-5 text-slate-700" />
      </button>

      {!isPlaying ? (
        <button
          onClick={onPlay}
          className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          title="播放"
        >
          <Play className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={onPause}
          className="p-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          title="暂停"
        >
          <Pause className="w-5 h-5" />
        </button>
      )}

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="下一步"
      >
        <StepForward className="w-5 h-5 text-slate-700" />
      </button>

      <button
        onClick={onReset}
        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        title="重置"
      >
        <RotateCcw className="w-5 h-5 text-slate-700" />
      </button>
    </div>
  );
}
