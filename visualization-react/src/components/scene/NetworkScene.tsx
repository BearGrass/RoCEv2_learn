import { motion } from 'framer-motion';

interface NetworkSceneProps {
  showConnection: boolean;
  connectionStyle: 'none' | 'dashed' | 'solid';
  isAnimating?: boolean;
  dataType?: 'qp-info' | 'data' | null;
}

export function NetworkScene({ showConnection, connectionStyle, isAnimating, dataType }: NetworkSceneProps) {
  const isDataTransfer = dataType === 'data';
  const isQPInfo = dataType === 'qp-info';

  return (
    <div className="relative w-full h-48 flex flex-col items-center justify-center gap-2">
      {/* 连接线 */}
      {showConnection && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 100">
          {/* 虚线连接 - QP 信息交换阶段 */}
          {connectionStyle === 'dashed' && (
            <>
              <motion.line
                x1="50"
                y1="50"
                x2="350"
                y2="50"
                stroke="#F59E0B"
                strokeWidth="4"
                strokeDasharray="8,4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />
              {/* QP 信息交换：有来有回 - 双向同时动画 */}
              {isAnimating && isQPInfo && (
                <g>
                  {/* Host A → Host B (上方箭头) - 第一趟 */}
                  <motion.g
                    initial={{ x: 0, opacity: 0 }}
                    animate={{
                      x: [0, 280],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      ease: "easeInOut",
                      times: [0, 0.2, 0.8, 1]
                    }}
                  >
                    <circle cx="70" cy="35" r="6" fill="#F59E0B" />
                  </motion.g>
                  {/* Host B → Host A (下方箭头) - 同时反向 */}
                  <motion.g
                    initial={{ x: 280, opacity: 0 }}
                    animate={{
                      x: [280, 0],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      ease: "easeInOut",
                      times: [0, 0.2, 0.8, 1]
                    }}
                  >
                    <circle cx="70" cy="65" r="6" fill="#8B5CF6" />
                  </motion.g>
                  {/* Host A → Host B - 第二趟（延迟） */}
                  <motion.g
                    initial={{ x: 0, opacity: 0 }}
                    animate={{
                      x: [0, 280],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      ease: "easeInOut",
                      times: [0, 0.2, 0.8, 1],
                      delay: 1.5
                    }}
                  >
                    <circle cx="70" cy="35" r="6" fill="#F59E0B" />
                  </motion.g>
                  {/* Host B → Host A - 第二趟（延迟） */}
                  <motion.g
                    initial={{ x: 280, opacity: 0 }}
                    animate={{
                      x: [280, 0],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      ease: "easeInOut",
                      times: [0, 0.2, 0.8, 1],
                      delay: 1.5
                    }}
                  >
                    <circle cx="70" cy="65" r="6" fill="#8B5CF6" />
                  </motion.g>
                </g>
              )}
            </>
          )}
          {connectionStyle === 'solid' && (
            <>
              <line
                x1="50"
                y1="50"
                x2="350"
                y2="50"
                stroke={isDataTransfer ? "#10B981" : "#3B82F6"}
                strokeWidth="4"
              />
              {/* 数据传输：持续单向流动 - 多个数据包从左到右 */}
              {isAnimating && isDataTransfer && (
                <g>
                  {/* 数据包 1 */}
                  <motion.g
                    initial={{ x: 0, opacity: 0 }}
                    animate={{
                      x: [0, 280],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                      times: [0, 0.1, 0.9, 1]
                    }}
                  >
                    <rect x="60" y="42" width="20" height="16" rx="3" fill="#10B981" />
                    <text x="70" y="54" fontSize="8" fill="white" fontWeight="bold">DATA</text>
                  </motion.g>
                  {/* 数据包 2 - 延迟出发 */}
                  <motion.g
                    initial={{ x: 0, opacity: 0 }}
                    animate={{
                      x: [0, 280],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                      times: [0, 0.1, 0.9, 1],
                      delay: 0.3
                    }}
                  >
                    <rect x="60" y="42" width="20" height="16" rx="3" fill="#10B981" />
                    <text x="70" y="54" fontSize="8" fill="white" fontWeight="bold">DATA</text>
                  </motion.g>
                  {/* 数据包 3 - 再延迟 */}
                  <motion.g
                    initial={{ x: 0, opacity: 0 }}
                    animate={{
                      x: [0, 280],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                      times: [0, 0.1, 0.9, 1],
                      delay: 0.6
                    }}
                  >
                    <rect x="60" y="42" width="20" height="16" rx="3" fill="#10B981" />
                    <text x="70" y="54" fontSize="8" fill="white" fontWeight="bold">DATA</text>
                  </motion.g>
                </g>
              )}
            </>
          )}
        </svg>
      )}

      {/* 交换机 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className={`w-24 h-14 rounded-xl flex items-center justify-center shadow-2xl border-2 ${
          isDataTransfer
            ? 'bg-gradient-to-br from-green-700 to-green-900 border-green-600'
            : isQPInfo
            ? 'bg-gradient-to-br from-amber-700 to-amber-900 border-amber-600'
            : 'bg-gradient-to-br from-slate-700 to-slate-900 border-slate-600'
        }`}>
          <span className="text-white text-sm font-bold tracking-wide">Switch</span>
        </div>
      </div>

      {/* 数据传输标签 */}
      {isAnimating && isDataTransfer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 rounded-full"
        >
          <span className="text-white text-xs font-bold">RDMA WRITE →</span>
        </motion.div>
      )}

      {/* QP 信息交换标签 */}
      {isAnimating && isQPInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-600 rounded-full"
        >
          <span className="text-white text-xs font-bold">QP Info ⇄</span>
        </motion.div>
      )}
    </div>
  );
}
