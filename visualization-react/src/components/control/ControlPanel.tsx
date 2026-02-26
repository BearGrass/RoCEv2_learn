import { PlaybackControls } from './PlaybackControls';
import { ProgressBar } from './ProgressBar';
import { SpeedSelector } from './SpeedSelector';
import { PhaseIndicator } from './PhaseIndicator';

interface ControlPanelProps {
  isPlaying: boolean;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  speed: number;
  currentPhase: number;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onStepClick: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function ControlPanel({
  isPlaying,
  currentStepIndex,
  totalSteps,
  progress,
  speed,
  currentPhase,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onReset,
  onStepClick,
  onSpeedChange,
  canGoPrev,
  canGoNext,
}: ControlPanelProps) {
  return (
    <div className="h-[70px] bg-white border-b border-slate-200 px-6 flex items-center gap-6 shadow-sm">
      <PlaybackControls
        isPlaying={isPlaying}
        onPlay={onPlay}
        onPause={onPause}
        onPrev={onPrev}
        onNext={onNext}
        onReset={onReset}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
      />

      <ProgressBar
        currentStep={currentStepIndex}
        totalSteps={totalSteps}
        progress={progress}
        onStepClick={onStepClick}
      />

      <SpeedSelector speed={speed} onSpeedChange={onSpeedChange} />

      <PhaseIndicator currentPhase={currentPhase} />
    </div>
  );
}
