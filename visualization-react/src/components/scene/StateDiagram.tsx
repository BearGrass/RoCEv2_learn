import { motion } from 'framer-motion';
import type { QPState } from '../../types';
import { COLORS } from '../../constants/colors';

interface StateDiagramProps {
  currentState: QPState;
  hostLabel: string;
}

export function StateDiagram({ currentState, hostLabel }: StateDiagramProps) {
  const states: NonNullable<QPState>[] = ['RESET', 'INIT', 'RTR', 'RTS'];
  const stateLabels = {
    RESET: '重置',
    INIT: '初始化',
    RTR: '接收就绪',
    RTS: '发送就绪',
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Host {hostLabel} 状态</h4>
      <div className="flex gap-2">
        {states.map((state) => {
          const isActive = currentState === state;
          const color = COLORS.qpState[state];
          return (
            <motion.div
              key={state}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive ? 'ring-2 ring-offset-1 ring-slate-400 scale-105' : 'opacity-50'
              }`}
              style={{
                backgroundColor: color.bg,
                color: color.text,
              }}
              initial={{ scale: 0.9 }}
              animate={{ scale: isActive ? 1.05 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {state}
            </motion.div>
          );
        })}
      </div>
      {currentState && (
        <motion.div
          className="mt-2 text-xs text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          当前状态：<span className="font-medium">{stateLabels[currentState]}</span>
        </motion.div>
      )}
    </div>
  );
}
