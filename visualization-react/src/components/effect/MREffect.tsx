import { motion, AnimatePresence } from 'framer-motion';

interface MREffectProps {
  isVisible: boolean;
  hostId: 'A' | 'B';
}

export function MREffect({ isVisible, hostId }: MREffectProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`mr-effect-${hostId}`}
          className="absolute inset-0 z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 放大高亮效果 */}
          <motion.div
            className={`absolute inset-0 border-4 ${
              hostId === 'A' ? 'left-0 right-1/2' : 'left-1/2 right-0'
            }`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              border: 'none',
              background: `radial-gradient(ellipse at center, ${
                hostId === 'A'
                  ? 'rgba(34, 197, 94, 0.3) 0%, transparent 70%'
                  : 'rgba(168, 85, 247, 0.3) 0%, transparent 70%'
              }`,
            }}
          />

          {/* MR 图标放大动画 */}
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
              stroke={hostId === 'A' ? '#22c55e' : '#a855f7'}
              strokeWidth="1"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
              <path d="M12 15.5L12 8.5M8 13L8 10M16 13L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>

          {/* MR 说明文字 */}
          <motion.div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[80px] text-center`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-slate-900/95 backdrop-blur px-6 py-4 rounded-xl border border-green-500/50 shadow-2xl">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <span className="text-green-400 font-bold text-lg">MR 注册完成</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                内存区域已注册到 RDMA<br/>
                支持远程直接访问
              </p>
            </div>
          </motion.div>

          {/* 粒子效果 */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{
                backgroundColor: hostId === 'A' ? '#22c55e' : '#a855f7',
              }}
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
