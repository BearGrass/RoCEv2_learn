import { motion, AnimatePresence } from 'framer-motion';
import type { QPState } from '../../types';
import { COLORS } from '../../constants/colors';

interface HostNodeProps {
  hostId: 'A' | 'B';
  qpState: QPState;
  resources: ('PD' | 'CQ' | 'MR')[];
  isHighlighted?: boolean;
}

// 资源图标组件
function ResourceIcon({ type }: { type: 'PD' | 'CQ' | 'MR' }) {
  const icons = {
    PD: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M5 21V7l8-4 8 4v14M9 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
      </svg>
    ),
    CQ: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    ),
    MR: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
      </svg>
    ),
  };

  const labels = {
    PD: { text: 'PD', sub: '保护域' },
    CQ: { text: 'CQ', sub: '完成队列' },
    MR: { text: 'MR', sub: '内存区域' },
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: -10 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
      className={`relative flex flex-col items-center p-2 rounded-lg ${
        type === 'PD' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
        type === 'CQ' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
        'bg-gradient-to-br from-green-500 to-green-600'
      } text-white shadow-lg`}
    >
      <div className="flex items-center gap-1 mb-0.5">
        {icons[type]}
        <span className="text-xs font-bold">{labels[type].text}</span>
      </div>
      <span className="text-[9px] opacity-80">{labels[type].sub}</span>
    </motion.div>
  );
}

export function HostNode({ hostId, qpState, resources, isHighlighted }: HostNodeProps) {
  const hostColors = COLORS.host[hostId];

  // 检查资源是否存在
  const hasResource = (type: 'PD' | 'CQ' | 'MR') => resources.includes(type);

  return (
    <motion.div
      className={`w-72 relative bg-white rounded-xl shadow-xl border-4 overflow-hidden ${
        isHighlighted ? 'border-yellow-400 shadow-yellow-200 scale-105' : 'border-slate-300'
      }`}
      style={{
        boxShadow: isHighlighted ? `0 0 30px ${hostColors.primary}60` : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 标题栏 */}
      <div
        className="px-4 py-3 text-white font-bold text-lg"
        style={{ backgroundColor: hostColors.primary }}
      >
        Host {hostId}
      </div>

      {/* 主体内容区 */}
      <div className="p-4 bg-slate-50">

        {/* 应用层 */}
        <motion.div
          className="bg-white rounded-lg p-2 text-center border border-slate-200 mb-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-slate-700 font-medium text-sm">Application</span>
        </motion.div>

        {/* 资源分层区域 */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border-2 border-slate-700">
          <div className="text-white text-sm font-bold mb-3 text-center tracking-wide">
            RNIC - {hostId === 'A' ? 'rxe0' : 'rxe1'}
          </div>

          {/* 资源层：MR, CQ, QP */}
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-2 text-center uppercase tracking-wider">
              资源层
            </div>
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {hasResource('MR') && (
                  <ResourceIcon type="MR" />
                )}
                {hasResource('CQ') && (
                  <ResourceIcon type="CQ" />
                )}
              </AnimatePresence>

              {/* QP 始终显示 */}
              <motion.div
                className={`p-2 rounded-lg text-center border-2 ${
                  qpState === 'RTS' ? 'border-green-400 bg-green-900/30' :
                  qpState === 'RTR' ? 'border-blue-400 bg-blue-900/30' :
                  qpState === 'INIT' ? 'border-yellow-400 bg-yellow-900/30' :
                  'border-slate-500 bg-slate-700/50'
                }`}
                initial={{ scale: 0.9 }}
                animate={{ scale: isHighlighted ? 1.1 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs text-white font-medium mb-0.5">QP</div>
                <div className={`text-xs font-bold ${
                  qpState === 'RTS' ? 'text-green-400' :
                  qpState === 'RTR' ? 'text-blue-400' :
                  qpState === 'INIT' ? 'text-yellow-400' :
                  'text-slate-400'
                }`}>{qpState || '-'}</div>
              </motion.div>
            </div>
          </div>

          {/* 连接线动画 */}
          <AnimatePresence>
            {hasResource('PD') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 16, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center justify-center"
              >
                <div className="w-px h-4 bg-gradient-to-b from-slate-400 to-blue-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 基础层：PD */}
          <div className="mt-2">
            <div className="text-xs text-slate-400 mb-2 text-center uppercase tracking-wider">
              基础层
            </div>
            <AnimatePresence>
              {hasResource('PD') ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-center shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21h18M5 21V7l8-4 8 4v14M9 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                    <span className="text-white font-bold text-sm">PD - 保护域</span>
                  </div>
                  <p className="text-xs text-blue-100">
                    所有资源的管理基础
                  </p>
                </motion.div>
              ) : (
                <div className="p-3 border-2 border-dashed border-slate-600 rounded-lg text-center">
                  <span className="text-xs text-slate-500 italic">等待 PD 创建...</span>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* 资源依赖关系说明 */}
          <AnimatePresence>
            {hasResource('PD') && hasResource('MR') && hasResource('CQ') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-2 bg-slate-700/50 rounded-lg"
              >
                <div className="text-[10px] text-slate-400 text-center">
                  ✓ MR 和 CQ 都属于 PD 管理
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
