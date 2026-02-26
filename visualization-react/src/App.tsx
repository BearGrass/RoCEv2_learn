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
import { ResourceEffect } from './components/effect/ResourceEffect';
import { useAnimationController } from './hooks/useAnimationController';
import { useQPStateMachine } from './hooks/useQPStateMachine';

function App() {
  const [hostAResources, setHostAResources] = useState<('PD' | 'CQ' | 'MR')[]>([]);
  const [hostBResources, setHostBResources] = useState<('PD' | 'CQ' | 'MR')[]>([]);
  const [showResourceEffect, setShowResourceEffect] = useState<{
    visible: boolean;
    host: 'A' | 'B';
    type: 'PD' | 'CQ' | 'MR';
  }>({
    visible: false,
    host: 'A',
    type: 'PD',
  });

  const { hostAState, hostBState, updateState, reset: resetQPStates } = useQPStateMachine();

  const addResource = useCallback((host: 'A' | 'B', resource: 'PD' | 'CQ' | 'MR') => {
    if (host === 'A') {
      setHostAResources(prev =>
        prev.includes(resource) ? prev : [...prev, resource]
      );
      // 资源创建时显示特效
      if (resource === 'PD' || resource === 'CQ' || resource === 'MR') {
        setShowResourceEffect({ visible: true, host, type: resource });
        setTimeout(() => setShowResourceEffect({ visible: false, host, type: resource }), 2000);
      }
    } else {
      setHostBResources(prev =>
        prev.includes(resource) ? prev : [...prev, resource]
      );
      // 资源创建时显示特效
      if (resource === 'PD' || resource === 'CQ' || resource === 'MR') {
        setShowResourceEffect({ visible: true, host, type: resource });
        setTimeout(() => setShowResourceEffect({ visible: false, host, type: resource }), 2000);
      }
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
        <div className="flex-1 flex items-center justify-center gap-8 p-8 min-h-0 relative">
          {/* 中间悬浮信息卡片（网络相关/双方步骤） */}
          <FloatingInfoCard step={currentStep} isPlaying={state.isPlaying} />

          {/* 资源创建特效层 */}
          <ResourceEffect
            isVisible={showResourceEffect.visible}
            hostId={showResourceEffect.host}
            resourceType={showResourceEffect.type}
          />

          {/* Host A 区域 */}
          <div className="relative w-72">
            {/* Host A 信息卡片 */}
            <div className="absolute bottom-full left-0 right-0 mb-4 z-20">
              <FloatingHostCard
                step={currentStep}
                isPlaying={state.isPlaying}
                showOnHost="A"
              />
            </div>
            <HostNode
              hostId="A"
              qpState={hostAState}
              resources={hostAResources}
              isHighlighted={state.isPlaying && currentStep?.actions.some(a => a.target === 'hostA')}
            />
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

          {/* Host B 区域 */}
          <div className="relative w-72">
            {/* Host B 信息卡片 */}
            <div className="absolute bottom-full left-0 right-0 mb-4 z-20">
              <FloatingHostCard
                step={currentStep}
                isPlaying={state.isPlaying}
                showOnHost="B"
              />
            </div>
            <HostNode
              hostId="B"
              qpState={hostBState}
              resources={hostBResources}
              isHighlighted={state.isPlaying && currentStep?.actions.some(a => a.target === 'hostB')}
            />
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
