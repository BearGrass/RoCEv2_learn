import { useState, useCallback, useEffect, useRef } from 'react';
import type { AnimationState, QPState, AnimationStep } from '../types';
import { animationSteps } from '../data/animationSteps';

interface UseAnimationControllerReturn {
  state: AnimationState;
  currentStep: AnimationStep | null;
  play: () => void;
  pause: () => void;
  reset: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  setSpeed: (speed: number) => void;
  totalSteps: number;
}

export function useAnimationController(
  updateHostState: (host: 'A' | 'B', state: QPState) => void,
  addResource: (host: 'A' | 'B', resource: 'PD' | 'CQ' | 'MR') => void,
  resetResources: () => void
): UseAnimationControllerReturn {
  const [state, setState] = useState<AnimationState>({
    currentStepIndex: -1,
    isPlaying: false,
    speed: 1,
    hostAState: null,
    hostBState: null,
    hostAResources: [],
    hostBResources: [],
    activeElements: [],
    showConnection: false,
    connectionStyle: 'none',
    dataType: null,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = state.currentStepIndex >= 0
    ? animationSteps[state.currentStepIndex]
    : null;

  const totalSteps = animationSteps.length;

  const processStepActions = useCallback((step: AnimationStep) => {
    step.actions.forEach(action => {
      switch (action.type) {
        case 'createResource':
          if (action.resource) {
            const host = action.target === 'hostA' ? 'A' : 'B';
            addResource(host, action.resource);
          }
          break;
        case 'showConnection':
          setState(prev => ({
            ...prev,
            showConnection: true,
            connectionStyle: action.style || 'dashed',
          }));
          break;
        case 'dataExchange':
          // 设置数据类型：QP 信息交换或数据传输
          // QP-INFO 或包含 QP/GID/LID 的是 QP 信息交换，包含 RDMA/DATA 的是数据传输
          {
            const isQPInfo = action.data?.includes('QP-INFO') ||
                            action.data?.includes('QPN') ||
                            action.data?.includes('GID') ||
                            action.data?.includes('QP Info');
            const isDataTransfer = action.data?.includes('RDMA') || action.data?.includes('DATA');
            setState(prev => ({
              ...prev,
              dataType: isQPInfo ? 'qp-info' : isDataTransfer ? 'data' : prev.dataType,
            }));
          }
          break;
      }
    });
  }, [addResource]);

  const executeStep = useCallback((index: number, skipResources: boolean = false) => {
    if (index < 0 || index >= animationSteps.length) return;

    const step = animationSteps[index];

    // 重置数据类型，除非当前 step 有 dataExchange 动作
    const hasDataExchange = step.actions.some(a => a.type === 'dataExchange');

    // 更新状态变更
    if (step.stateChange) {
      const { host, to } = step.stateChange;
      updateHostState(host, to);
      setState(prev => ({
        ...prev,
        hostAState: host === 'A' ? to : prev.hostAState,
        hostBState: host === 'B' ? to : prev.hostBState,
      }));
    }

    // 执行动作（如果不需要跳过资源创建）
    if (!skipResources) {
      processStepActions(step);
    }

    setState(prev => ({
      ...prev,
      currentStepIndex: index,
      dataType: hasDataExchange ? prev.dataType : null,
    }));
  }, [updateHostState, processStepActions]);

  const play = useCallback(() => {
    if (state.currentStepIndex >= totalSteps - 1) return;

    // 如果还没有开始，先执行第一步
    if (state.currentStepIndex < 0) {
      executeStep(0);
    }

    setState(prev => ({ ...prev, isPlaying: true }));
  }, [state.currentStepIndex, totalSteps, executeStep]);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    pause();
    setState(prev => ({
      ...prev,
      currentStepIndex: -1,
      hostAState: null,
      hostBState: null,
      hostAResources: [],
      hostBResources: [],
      activeElements: [],
      showConnection: false,
      connectionStyle: 'none',
      dataType: null,
    }));
  }, [pause]);

  const nextStep = useCallback(() => {
    if (state.currentStepIndex < totalSteps - 1) {
      executeStep(state.currentStepIndex + 1);
    } else {
      pause();
    }
  }, [state.currentStepIndex, totalSteps, executeStep, pause]);

  const prevStep = useCallback(() => {
    if (state.currentStepIndex > 0) {
      // 需要回滚到上一步的状态
      executeStep(state.currentStepIndex - 1);
    } else if (state.currentStepIndex === 0) {
      reset();
    }
  }, [state.currentStepIndex, executeStep, reset]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < totalSteps) {
      // 直接跳转到指定步骤时，需要累积执行从 0 到该步骤的所有 createResource 动作
      // 重置资源状态
      resetResources();

      // 累积执行从 0 到 index 的所有步骤的资源创建动作
      for (let i = 0; i <= index; i++) {
        const step = animationSteps[i];
        step.actions.forEach(action => {
          if (action.type === 'createResource' && action.resource) {
            const host = action.target === 'hostA' ? 'A' : 'B';
            addResource(host, action.resource);
          }
        });
      }

      // 执行目标步骤的其他动作（状态变更等）- executeStep 会调用 processStepActions
      // 但由于 addResource 有去重检查，资源不会被重复添加
      executeStep(index);
    }
  }, [totalSteps, executeStep, addResource, resetResources]);

  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed }));
  }, []);

  // 自动播放逻辑
  useEffect(() => {
    if (state.isPlaying && currentStep) {
      timerRef.current = setTimeout(() => {
        nextStep();
      }, currentStep.duration / state.speed);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state.isPlaying, currentStep, state.speed, nextStep]);

  return {
    state,
    currentStep,
    play,
    pause,
    reset,
    nextStep,
    prevStep,
    goToStep,
    setSpeed,
    totalSteps,
  };
}
