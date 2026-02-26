import type { AnimationStep } from '../../types';

interface FloatingHostCardProps {
  step: AnimationStep | null;
  isPlaying: boolean;
  showOnHost: 'A' | 'B' | null;
}

export function FloatingHostCard({ step, isPlaying, showOnHost }: FloatingHostCardProps) {
  if (!step || !showOnHost) return null;

  const isTargetHost = step.actions.some(a => a.target === `host${showOnHost}`);
  if (!isTargetHost) return null;

  const codeAction = step.actions.find(a => a.type === 'showCode');
  const code = codeAction?.code || '';
  const location = codeAction?.location || '';

  const createResourceAction = step.actions.find(a => a.type === 'createResource');
  const resourceType = createResourceAction?.resource;
  const isPDCreate = resourceType === 'PD';
  const isCQCreate = resourceType === 'CQ';
  const isMRCreate = resourceType === 'MR';

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
    <div className="w-[320px] min-h-[200px]">
      <div className={`bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden ${
        isResourceCreate ? `ring-2 ${styles.ring} ring-offset-2 ring-offset-slate-900/50` : ''
      }`}>
        <div className={`bg-gradient-to-r px-4 py-2.5 ${styles.gradient}`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${styles.icon}`}>
              <span className="text-white font-bold text-xs">{step.phase}</span>
            </div>
            <h3 className="text-white font-bold text-sm flex-1 truncate">
              {step.title}
            </h3>
            {isPlaying && (
              <div className="flex items-center gap-1.5 text-white/80 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>播放中</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-3">
          <p className="text-slate-100 text-sm leading-relaxed mb-3 line-clamp-2">
            {step.description}
          </p>

          {isResourceCreate && (
            <div className={`mb-3 p-3 bg-gradient-to-r ${styles.highlight} border-2 ${styles.border} rounded-xl`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${styles.icon}`}>
                  {isPDCreate && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21h18M5 21V7l8-4 8 4v14M9 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                  )}
                  {isCQCreate && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <path d="M8 12h8M12 8v8" />
                    </svg>
                  )}
                  {isMRCreate && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                    </svg>
                  )}
                </div>
                <span className={`${styles.text} font-bold text-sm`}>{styles.title}</span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed">
                {styles.desc}
              </p>
            </div>
          )}

          {code && (
            <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              {location && (
                <div className="bg-slate-900 px-3 py-2 border-b border-slate-800">
                  <span className="text-xs font-mono text-blue-400 truncate block">{location}</span>
                </div>
              )}
              <pre className="text-green-400 p-3 font-mono text-xs whitespace-pre-wrap break-all">
                {code}
              </pre>
            </div>
          )}

          {step.actions.find(a => a.type === 'showInfo') && (
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                💡 {step.actions.find(a => a.type === 'showInfo')?.text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
