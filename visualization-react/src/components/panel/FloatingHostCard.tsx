import { motion } from 'framer-motion';
import type { AnimationStep } from '../../types';

interface FloatingHostCardProps {
  step: AnimationStep | null;
  isPlaying: boolean;
  showOnHost: 'A' | 'B' | null;  // 显示在哪个 Host 上方
}

export function FloatingHostCard({ step, isPlaying, showOnHost }: FloatingHostCardProps) {
  if (!step || !showOnHost) return null;

  // 检查是否是这个 Host 的步骤
  const isTargetHost = step.actions.some(a => a.target === `host${showOnHost}`);
  if (!isTargetHost) return null;

  const codeAction = step.actions.find(a => a.type === 'showCode');
  const code = codeAction?.code || '';
  const location = codeAction?.location || '';

  // 检查资源创建类型
  const createResourceAction = step.actions.find(a => a.type === 'createResource');
  const resourceType = createResourceAction?.resource;
  const isPDCreate = resourceType === 'PD';
  const isCQCreate = resourceType === 'CQ';
  const isMRCreate = resourceType === 'MR';

  // 根据资源类型获取样式
  const getResourceStyles = () => {
    if (isPDCreate) return {
      gradient: 'from-blue-600 to-blue-700',
      ring: 'ring-blue-400',
      icon: 'bg-blue-400/20',
      highlight: 'from-blue-500/20 to-blue-600/20',
      border: 'border-blue-400/30',
      text: 'text-blue-300',
      title: 'PD - 保护域',
      desc: 'RDMA 资源管理的基本单位，所有 MR、CQ、QP 都必须属于某个 PD。'
    };
    if (isCQCreate) return {
      gradient: 'from-purple-600 to-purple-700',
      ring: 'ring-purple-400',
      icon: 'bg-purple-400/20',
      highlight: 'from-purple-500/20 to-purple-600/20',
      border: 'border-purple-400/30',
      text: 'text-purple-300',
      title: 'CQ - 完成队列',
      desc: '用于接收工作请求完成通知，应用通过轮询 CQ 获取操作结果。'
    };
    // MR
    return {
      gradient: 'from-green-600 to-green-700',
      ring: 'ring-green-400',
      icon: 'bg-green-400/20',
      highlight: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-400/30',
      text: 'text-green-300',
      title: 'MR - 内存区域',
      desc: '注册后的内存可被 RDMA 网卡直接访问，支持远程读写操作。'
    };
  };

  const styles = getResourceStyles();
  const isResourceCreate = isPDCreate || isCQCreate || isMRCreate;

  return (
    <motion.div
      key={step.id}
      className="w-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* 半透明信息卡片 */}
      <div className={`bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden ${
        isResourceCreate ? `ring-2 ${styles.ring} ring-offset-2 ring-offset-slate-900/50` : ''
      }`}>
        {/* 顶部标题栏 */}
        <div className={`bg-gradient-to-r px-4 py-2 ${styles.gradient}`}>
          <div className="flex items-center gap-2">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${styles.icon}`}>
              <span className="text-white font-bold text-xs">{step.phase}</span>
            </div>
            <h3 className="text-white font-bold text-sm flex-1 truncate">
              {step.title}
            </h3>
            {isPlaying && (
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-3">
          {/* 步骤描述 */}
          <p className="text-slate-100 text-xs leading-relaxed mb-2 line-clamp-2">
            {step.description}
          </p>

          {/* 资源创建特效说明 */}
          {isResourceCreate && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mb-2 p-2 bg-gradient-to-r ${styles.highlight} border ${styles.border} rounded-lg`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`${styles.text} font-bold text-xs`}>{styles.title}</span>
              </div>
              <p className="text-slate-300 text-[10px] leading-relaxed">
                {styles.desc}
              </p>
            </motion.div>
          )}

          {/* 代码显示 */}
          {code && (
            <div className="bg-slate-950 rounded overflow-hidden border border-slate-800">
              {location && (
                <div className="bg-slate-900 px-2 py-1 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-blue-400 truncate block">{location}</span>
                </div>
              )}
              <pre className="text-green-400 p-2 font-mono text-[10px] whitespace-pre-wrap break-all">
                {code}
              </pre>
            </div>
          )}

          {/* 额外提示信息 */}
          {step.actions.find(a => a.type === 'showInfo') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded"
            >
              <p className="text-blue-300 text-[10px]">
                💡 {step.actions.find(a => a.type === 'showInfo')?.text}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
