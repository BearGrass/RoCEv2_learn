import { useState, useCallback } from 'react';
import type { QPState, HostId } from '../types';

interface UseQPStateMachineReturn {
  hostAState: QPState;
  hostBState: QPState;
  updateState: (host: HostId, newState: QPState) => void;
  reset: () => void;
}

export function useQPStateMachine(): UseQPStateMachineReturn {
  const [hostAState, setHostAState] = useState<QPState>(null);
  const [hostBState, setHostBState] = useState<QPState>(null);

  const updateState = useCallback((host: HostId, newState: QPState) => {
    if (host === 'A') {
      setHostAState(newState);
    } else {
      setHostBState(newState);
    }
  }, []);

  const reset = useCallback(() => {
    setHostAState(null);
    setHostBState(null);
  }, []);

  return {
    hostAState,
    hostBState,
    updateState,
    reset,
  };
}
