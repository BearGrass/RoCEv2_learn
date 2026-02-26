import { motion, AnimatePresence } from 'framer-motion';

interface ResourceEffectProps {
  isVisible: boolean;
  hostId: 'A' | 'B';
  resourceType: 'PD' | 'CQ' | 'MR';
}

const resourceConfig = {
  PD: {
    color: '#3b82f6',
    colorName: 'blue',
    gradient: 'rgba(59, 130, 246, 0.3)',
    title: 'PD 创建完成',
    desc: '保护域已分配\n所有资源的管理基础'
  },
  CQ: {
    color: '#a855f7',
    colorName: 'purple',
    gradient: 'rgba(168, 85, 247, 0.3)',
    title: 'CQ 创建完成',
    desc: '完成队列已创建\n用于接收操作完成通知'
  },
  MR: {
    color: '#22c55e',
    colorName: 'green',
    gradient: 'rgba(34, 197, 94, 0.3)',
    title: 'MR 注册完成',
    desc: '内存区域已注册\n支持远程直接访问'
  }
};

export function ResourceEffect({ isVisible, hostId, resourceType }: ResourceEffectProps) {
  if (!isVisible) return null;

  const config = resourceConfig[resourceType];
  const isLeft = hostId === 'A';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`resource-effect-${hostId}-${resourceType}`}
          className="absolute inset-0 z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 放大高亮效果 */}
          <motion.div
            className={`absolute inset-0 ${isLeft ? 'left-0 right-1/2' : 'left-1/2 right-0'}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              border: 'none',
              background: `radial-gradient(ellipse at center, ${config.gradient} 0%, transparent 70%)`,
            }}
          />

          {/* 资源图标放大动画 */}
          <motion.div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1.5, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.2
            }}
          >
            <svg
              className="w-32 h-32 drop-shadow-2xl"
              viewBox="0 0 24 24"
              fill="none"
              stroke={config.color}
              strokeWidth="1"
            >
              {resourceType === 'PD' && (
                <>
                  <path d="M3 21h18M5 21V7l8-4 8 4v14M9 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                </>
              )}
              {resourceType === 'CQ' && (
                <>
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M8 12h8M12 8v8" />
                </>
              )}
              {resourceType === 'MR' && (
                <>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                </>
              )}
              <path d="M12 15.5V8.5M8 13V10M16 13V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>

          {/* 说明文字 */}
          <motion.div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[80px] text-center`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-slate-900/95 backdrop-blur px-6 py-4 rounded-xl border border-slate-700 shadow-2xl">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <span className="font-bold text-lg" style={{ color: config.color }}>{config.title}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                {config.desc}
              </p>
            </div>
          </motion.div>

          {/* 粒子效果 */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{
                x: Math.cos((i / 6) * Math.PI * 2) * 150,
                y: Math.sin((i / 6) * Math.PI * 2) * 150,
                opacity: 0,
                scale: 1,
              }}
              transition={{
                duration: 1,
                delay: 0.3 + (i * 0.1),
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
