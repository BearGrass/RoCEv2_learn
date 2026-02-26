import { motion, AnimatePresence } from 'framer-motion';
import type { AnimationStep } from '../../types';

interface FloatingInfoCardProps {
  step: AnimationStep | null;
  isPlaying: boolean;
}

// 根据步骤的 target 确定卡片位置
function getCardPosition(step: AnimationStep): 'left' | 'right' | 'center' {
  const hostAActions = step.actions.filter(a => a.target === 'hostA');
  const hostBActions = step.actions.filter(a => a.target === 'hostB');
  const networkActions = step.actions.filter(a => a.target === 'network');

  // 如果是 Host A 相关的步骤
  if (hostAActions.length > 0 && hostBActions.length === 0) {
    return 'left';
  }

  // 如果是 Host B 相关的步骤
  if (hostBActions.length > 0 && hostAActions.length === 0) {
    return 'right';
  }

  // 如果是网络相关或双方都有
  if (networkActions.length > 0 || (hostAActions.length > 0 && hostBActions.length > 0)) {
    return 'center';
  }

  // 默认居中
  return 'center';
}

export function FloatingInfoCard({ step, isPlaying }: FloatingInfoCardProps) {
  if (!step) {
    return null;
  }

  const position = getCardPosition(step);
  const codeAction = step.actions.find(a => a.type === 'showCode');
  const code = codeAction?.code || '';
  const location = codeAction?.location || '';
  const isMRCreate = step.actions.some(a => a.type === 'createResource' && a.resource === 'MR');

  // 根据位置计算卡片的水平偏移
  const positionClasses = {
    left: 'left-0 translate-x-[15%]',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0 -translate-x-[15%]',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        className={`absolute top-4 z-50 w-[380px] px-4 ${positionClasses[position]}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* 半透明信息卡片 */}
        <div className={`bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden ${
          isMRCreate ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-900/50' : ''
        }`}>
          {/* 顶部标题栏 */}
          <div className={`bg-gradient-to-r px-6 py-3 ${
            isMRCreate
              ? 'from-green-600 to-green-700'
              : position === 'left'
                ? 'from-blue-600 to-blue-700'
                : position === 'right'
                  ? 'from-purple-600 to-purple-700'
                  : 'from-blue-600 to-blue-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isMRCreate ? 'bg-green-400/20' : 'bg-white/20'
              }`}>
                <span className="text-white font-bold text-sm">{step.phase}</span>
              </div>
              <h3 className="text-white font-bold text-lg flex-1">
                {step.title}
              </h3>
              {isPlaying && (
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span>播放中</span>
                </div>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6">
            {/* 步骤描述 */}
            <p className="text-slate-100 text-sm leading-relaxed mb-4">
              {step.description}
            </p>

            {/* MR 创建特效说明 */}
            {isMRCreate && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl"
              >
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                  </svg>
                  <span className="text-green-300 font-bold">MR - 内存区域注册</span>
                </div>
                <p className="text-green-200 text-xs leading-relaxed">
                  注册后的内存可被 RDMA 网卡直接访问，支持远程读写操作，实现零拷贝数据传输。
                </p>
              </motion.div>
            )}

            {/* 代码显示 */}
            {code && (
              <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                {location && (
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800">
                    <span className="text-xs font-mono text-blue-400">{location}</span>
                  </div>
                )}
                <pre className="text-green-400 p-4 font-mono text-sm overflow-x-auto">
                  {code}
                </pre>
              </div>
            )}

            {/* 额外提示信息 */}
            {step.actions.find(a => a.type === 'showInfo') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
              >
                <p className="text-blue-300 text-xs">
                  💡 {step.actions.find(a => a.type === 'showInfo')?.text}
                </p>
              </motion.div>
            )}

            {/* 成功提示信息 */}
            {step.actions.find(a => a.type === 'showSuccess') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <p className="text-green-300 text-xs font-medium">
                  ✓ {step.actions.find(a => a.type === 'showSuccess')?.text}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
