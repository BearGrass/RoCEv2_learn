import { motion, AnimatePresence } from 'framer-motion';
import type { AnimationStep } from '../../types';

interface StatePanelProps {
  step: AnimationStep | null;
}

export function StatePanel({ step }: StatePanelProps) {
  if (!step) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="text-slate-400 text-center py-8">
          点击播放按钮开始演示
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">{step.phase}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {step.title}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
