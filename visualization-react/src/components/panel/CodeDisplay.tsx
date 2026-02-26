import { motion, AnimatePresence } from 'framer-motion';
import { SyntaxHighlighter } from './SyntaxHighlighter';

interface CodeDisplayProps {
  code: string;
  location?: string;
}

export function CodeDisplay({ code, location }: CodeDisplayProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={code}
        className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {location && (
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 0111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-mono text-blue-400">{location}</span>
          </div>
        )}
        <pre className="p-4 font-mono text-sm overflow-x-auto bg-slate-950">
          <SyntaxHighlighter code={code} />
        </pre>
      </motion.div>
    </AnimatePresence>
  );
}
