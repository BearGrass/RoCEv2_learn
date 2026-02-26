import { useState, useCallback } from 'react';
import { DemoContainer } from './components/layout/DemoContainer';
import { HostNode } from './components/scene/HostNode';
import { NetworkScene } from './components/scene/NetworkScene';
import { StateDiagram } from './components/scene/StateDiagram';
import { ControlPanel } from './components/control/ControlPanel';
import { StatePanel } from './components/panel/StatePanel';
import { CodeDisplay } from './components/panel/CodeDisplay';
import { FloatingInfoCard } from './components/panel/FloatingInfoCard';
import { FloatingHostCard } from './components/panel/FloatingHostCard';
import { useAnimationController } from './hooks/useAnimationController';
import { useQPStateMachine } from './hooks/useQPStateMachine';

function App() {
  const [hostAResources, setHostAResources] = useState<('PD' | 'CQ' | 'MR')[]>([]);
  const [hostBResources, setHostBResources] = useState<('PD' | 'CQ' | 'MR')[]>([]);

  const { hostAState, hostBState, updateState, reset: resetQPStates } = useQPStateMachine();

  const addResource = useCallback((host: 'A' | 'B', resource: 'PD' | 'CQ' | 'MR') => {
    if (host === 'A') {
      setHostAResources(prev =>
        prev.includes(resource) ? prev : [...prev, resource]
      );
    } else {
      setHostBResources(prev =>
        prev.includes(resource) ? prev : [...prev, resource]
      );
    }
  }, []);

  const resetResources = useCallback(() => {
    setHostAResources([]);
    setHostBResources([]);
  }, []);

  const {
    state,
    currentStep,
    play,
    pause,
    reset: resetAnimation,
    nextStep,
    prevStep,
    goToStep,
    setSpeed,
    totalSteps,
    isTransitioning,
  } = useAnimationController(updateState, addResource, resetResources);

  const progress = state.currentStepIndex >= 0
    ? ((state.currentStepIndex + 1) / totalSteps) * 100
    : 0;

  const currentPhase = currentStep?.phase || 1;

  // 同步重置功能
  const handleReset = useCallback(() => {
    resetAnimation();
    resetQPStates();
    setHostAResources([]);
    setHostBResources([]);
  }, [resetAnimation, resetQPStates]);

  return (
    <DemoContainer>
      <ControlPanel
        isPlaying={state.isPlaying}
        currentStepIndex={state.currentStepIndex}
        totalSteps={totalSteps}
        progress={progress}
        speed={state.speed}
        currentPhase={currentPhase}
        onPlay={play}
        onPause={pause}
        onPrev={prevStep}
        onNext={nextStep}
        onReset={handleReset}
        onStepClick={goToStep}
        onSpeedChange={setSpeed}
        canGoPrev={state.currentStepIndex > 0}
        canGoNext={state.currentStepIndex < totalSteps - 1 || state.isPlaying}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* 主场景区域 */}
        <div className={`flex-1 flex items-center justify-center gap-12 p-8 min-h-0 relative transition-opacity duration-200 ${
          isTransitioning ? 'opacity-50' : 'opacity-100'
        }`}>
          {/* 中间悬浮信息卡片（网络相关/双方步骤） */}
          <FloatingInfoCard step={currentStep} isPlaying={state.isPlaying} />

          {/* Host A 区域 - 信息框在左侧 */}
          <div className="flex flex-row gap-4 items-start flex-shrink-0">
            {/* Host A 信息卡片 - 在左侧 */}
            <div className="w-[320px] flex-shrink-0">
              <FloatingHostCard
                step={currentStep}
                isPlaying={state.isPlaying}
                showOnHost="A"
              />
            </div>
            {/* Host A 节点 */}
            <div className="w-72 flex-shrink-0">
              <HostNode
                hostId="A"
                qpState={hostAState}
                resources={hostAResources}
                isHighlighted={state.isPlaying && currentStep?.actions.some(a => a.target === 'hostA')}
              />
            </div>
          </div>

          {/* Network Scene */}
          <div className="w-64 flex-shrink-0">
            <NetworkScene
              showConnection={state.showConnection}
              connectionStyle={state.connectionStyle}
              isAnimating={state.isPlaying}
              dataType={state.dataType}
            />
          </div>

          {/* Host B 区域 - 信息框在右侧 */}
          <div className="flex flex-row gap-4 items-start flex-shrink-0">
            {/* Host B 节点 */}
            <div className="w-72 flex-shrink-0">
              <HostNode
                hostId="B"
                qpState={hostBState}
                resources={hostBResources}
                isHighlighted={state.isPlaying && currentStep?.actions.some(a => a.target === 'hostB')}
              />
            </div>
            {/* Host B 信息卡片 - 在右侧 */}
            <div className="w-[320px] flex-shrink-0">
              <FloatingHostCard
                step={currentStep}
                isPlaying={state.isPlaying}
                showOnHost="B"
              />
            </div>
          </div>
        </div>

        {/* 右侧信息面板 - 保留作为参考 */}
        <div className="w-[400px] border-l border-slate-200 p-6 overflow-y-auto bg-slate-50">
          <div className="space-y-4">
            <StateDiagram currentState={hostAState} hostLabel="A" />
            <StateDiagram currentState={hostBState} hostLabel="B" />

            <StatePanel step={currentStep} />

            {currentStep?.actions.find(a => a.type === 'showCode')?.code && (
              <CodeDisplay
                code={currentStep.actions.find(a => a.type === 'showCode')?.code || ''}
                location={currentStep.actions.find(a => a.type === 'showCode')?.location}
              />
            )}
          </div>
        </div>
      </div>
    </DemoContainer>
  );
}

export default App;
