import { motion, AnimatePresence } from 'framer-motion';
import type { AnimationStep } from '../../types';

interface FloatingInfoCardProps {
  step: AnimationStep | null;
  isPlaying: boolean;
}

export function FloatingInfoCard({ step, isPlaying }: FloatingInfoCardProps) {
  if (!step) {
    return null;
  }

  const codeAction = step.actions.find(a => a.type === 'showCode');
  const code = codeAction?.code || '';
  const location = codeAction?.location || '';

  // 检查是否是网络相关的步骤
  const networkActions = step.actions.filter(a => a.target === 'network');
  const isNetworkStep = networkActions.length > 0;

  // 检查是否是双方都有的步骤
  const hostAActions = step.actions.filter(a => a.target === 'hostA');
  const hostBActions = step.actions.filter(a => a.target === 'hostB');
  const isBothHosts = hostAActions.length > 0 && hostBActions.length > 0;

  if (!isNetworkStep && !isBothHosts) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[400px] px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* 半透明信息卡片 */}
        <div className="bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* 顶部标题栏 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
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

            {/* 代码显示 - 自动换行 */}
            {code && (
              <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                {location && (
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800">
                    <span className="text-xs font-mono text-blue-400">{location}</span>
                  </div>
                )}
                <pre className="text-green-400 p-4 font-mono text-xs overflow-hidden whitespace-pre-wrap break-all">
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
