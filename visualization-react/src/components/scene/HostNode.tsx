import { motion, AnimatePresence } from 'framer-motion';
import type { QPState } from '../../types';
import { COLORS } from '../../constants/colors';

interface HostNodeProps {
  hostId: 'A' | 'B';
  qpState: QPState;
  resources: ('PD' | 'CQ' | 'MR')[];
  isHighlighted?: boolean;
}

// 资源详细信息
const resourceInfo = {
  PD: {
    text: 'PD',
    sub: '保护域',
    description: '保护域是 RDMA 资源管理的基本单位',
    details: ['所有 MR、CQ、QP 都必须属于某个 PD', '隔离不同应用的资源访问', '提供安全保护机制']
  },
  CQ: {
    text: 'CQ',
    sub: '完成队列',
    description: '用于接收工作请求完成通知',
    details: ['应用通过轮询 CQ 获取操作结果', '支持中断通知机制', '可共享于多个 QP']
  },
  MR: {
    text: 'MR',
    sub: '内存区域',
    description: '注册后的内存可被 RDMA 网卡直接访问',
    details: ['支持远程读写操作', '需要权限控制', '零拷贝数据传输']
  },
};

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

  const info = resourceInfo[type];

  return (
    <div className="relative group">
      <motion.div
        initial={{ scale: 0, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: -10 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25
        }}
        className={`relative flex flex-col items-center p-2 rounded-lg cursor-help ${
          type === 'PD' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
          type === 'CQ' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
          'bg-gradient-to-br from-green-500 to-green-600'
        } text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200`}
      >
        <div className="flex items-center gap-1 mb-0.5">
          {icons[type]}
          <span className="text-xs font-bold">{info.text}</span>
        </div>
        <span className="text-[9px] opacity-80">{info.sub}</span>
      </motion.div>

      {/* 悬浮提示 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 overflow-hidden w-48">
          <div className={`px-3 py-2 text-sm font-bold ${
            type === 'PD' ? 'bg-blue-600' :
            type === 'CQ' ? 'bg-purple-600' :
            'bg-green-600'
          }`}>
            {info.text} - {info.sub}
          </div>
          <div className="p-3 space-y-2">
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {info.description}
            </p>
            <div className="pt-2 border-t border-slate-700">
              {info.details.map((detail, i) => (
                <div key={i} className="flex items-start gap-1.5 mt-1.5 text-[10px] text-slate-400">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 箭头 */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700" />
        </div>
      </div>
    </div>
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
                  <ResourceIcon key="mr" type="MR" />
                )}
                {hasResource('CQ') && (
                  <ResourceIcon key="cq" type="CQ" />
                )}
              </AnimatePresence>

              {/* QP 始终显示 - 带状态转换动画 */}
              <motion.div
                key={qpState}
                className="p-2 rounded-lg text-center border-2"
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{
                  scale: isHighlighted ? 1.1 : 1,
                  opacity: 1
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }}
                style={{
                  borderColor: qpState === 'RTS' ? '#4ade80' :
                    qpState === 'RTR' ? '#60a5fa' :
                    qpState === 'INIT' ? '#facc15' :
                    '#64748b',
                  backgroundColor: qpState === 'RTS' ? 'rgba(34, 197, 94, 0.2)' :
                    qpState === 'RTR' ? 'rgba(59, 130, 246, 0.2)' :
                    qpState === 'INIT' ? 'rgba(234, 179, 8, 0.2)' :
                    'rgba(100, 116, 139, 0.2)'
                }}
              >
                <div className="text-xs text-white font-medium mb-0.5">QP</div>
                <motion.div
                  key={`${qpState}-text`}
                  className={`text-xs font-bold`}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    color: qpState === 'RTS' ? '#4ade80' :
                      qpState === 'RTR' ? '#60a5fa' :
                      qpState === 'INIT' ? '#facc15' :
                      '#94a3b8'
                  }}
                >
                  {qpState || '-'}
                </motion.div>
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
