import React, { useState, useEffect } from 'react';
import { Plane, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ViewModeToggle() {
  const [mode, setMode] = useState<'perspective' | 'aerial'>('perspective');

  useEffect(() => {
    const handleOverride = (e: any) => {
      if (e.detail.mode !== mode) {
        setMode(e.detail.mode);
      }
    };
    window.addEventListener('map-view-sync', handleOverride);
    return () => window.removeEventListener('map-view-sync', handleOverride);
  }, [mode]);

  const toggleMode = () => {
    const nextMode = mode === 'perspective' ? 'aerial' : 'perspective';
    setMode(nextMode);
    window.dispatchEvent(new CustomEvent('map-view-change', { detail: { mode: nextMode } }));
  };

  return (
    <div className="absolute top-6 right-6 z-10 pointer-events-auto">
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMode}
        className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl shadow-xl border border-white/10 rounded-2xl p-3 text-white hover:bg-slate-800 transition-colors group overflow-hidden relative"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === 'perspective' ? (
            <motion.div 
              key="aerial"
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              className="flex items-center gap-2"
            >
              <Plane className="w-5 h-5 text-sky-400 group-hover:text-sky-300" />
              <span className="text-sm font-medium pr-1">Aerial View</span>
            </motion.div>
          ) : (
            <motion.div 
              key="perspective"
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              className="flex items-center gap-2"
            >
              <Box className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
              <span className="text-sm font-medium pr-1">3D View</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
