import { motion } from 'framer-motion';
import type { QPState } from '../../types';
import { COLORS } from '../../constants/colors';

interface HostNodeProps {
  hostId: 'A' | 'B';
  qpState: QPState;
  resources: ('PD' | 'CQ' | 'MR')[];
  isHighlighted?: boolean;
}

export function HostNode({ hostId, qpState, resources, isHighlighted }: HostNodeProps) {
  const hostColors = COLORS.host[hostId];
  const qpColor = qpState ? COLORS.qpState[qpState] : COLORS.qpState.RESET;

  return (
    <motion.div
      className={`w-64 relative bg-white rounded-xl shadow-xl border-4 overflow-hidden ${
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

      {/* 应用层 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
          <span className="text-slate-700 font-medium">Application</span>
        </div>
      </div>

      {/* RNIC 卡 */}
      <div className="p-4" data-element="rnic">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border-2 border-slate-700">
          <div className="text-white text-sm font-bold mb-3 text-center tracking-wide">RNIC</div>

          {/* QP */}
          <motion.div
            className="mb-3 p-4 rounded-lg text-center border-2 border-white/20"
            style={{ backgroundColor: qpColor.bg }}
            initial={{ scale: 0.9 }}
            animate={{ scale: isHighlighted ? 1.1 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-xs text-white font-medium mb-1 uppercase tracking-wider">QP State</div>
            <div className="text-white font-bold text-base">{qpColor.label}</div>
            <div className="text-white/70 text-xs mt-1">{qpState || 'null'}</div>
          </motion.div>

          {/* 资源徽章 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {resources.length === 0 ? (
              <span className="text-xs text-white/50 italic">暂无资源</span>
            ) : (
              <>
                {resources.includes('PD') && (
                  <span
                    className="px-3 py-1.5 rounded-md text-xs font-bold text-white shadow-md"
                    style={{ backgroundColor: COLORS.resources.PD.bg }}
                  >
                    PD
                  </span>
                )}
                {resources.includes('CQ') && (
                  <span
                    className="px-3 py-1.5 rounded-md text-xs font-bold text-white shadow-md"
                    style={{ backgroundColor: COLORS.resources.CQ.bg }}
                  >
                    CQ
                  </span>
                )}
                {resources.includes('MR') && (
                  <span
                    className="px-3 py-1.5 rounded-md text-xs font-bold text-white shadow-md"
                    style={{ backgroundColor: COLORS.resources.MR.bg }}
                  >
                    MR
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
