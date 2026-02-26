import { motion, AnimatePresence } from 'framer-motion';

interface CodeDisplayProps {
  code: string;
  location?: string;
}

export function CodeDisplay({ code, location }: CodeDisplayProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={code}
        className="bg-slate-900 rounded-lg overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {location && (
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
            <span className="text-xs font-mono text-blue-400">{location}</span>
          </div>
        )}
        <pre className="text-green-400 p-4 font-mono text-sm overflow-x-auto">
          {code}
        </pre>
      </motion.div>
    </AnimatePresence>
  );
}
