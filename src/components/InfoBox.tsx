import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ParsedWay } from '../lib/osm';

export function InfoBox() {
  const [hoveredWay, setHoveredWay] = useState<ParsedWay | null>(null);
  const [clickedWay, setClickedWay] = useState<ParsedWay | null>(null);

  useEffect(() => {
    const handleHover = (e: any) => setHoveredWay(e.detail.way);
    
    let timer: any;
    const handleClick = (e: any) => {
      setClickedWay(e.detail.way);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setClickedWay(null), 5000);
    };

    window.addEventListener('map-hover', handleHover);
    window.addEventListener('map-click', handleClick);
    return () => {
      window.removeEventListener('map-hover', handleHover);
      window.removeEventListener('map-click', handleClick);
    };
  }, []);

  const activeWay = clickedWay || hoveredWay;

  return (
    <AnimatePresence>
      {activeWay && activeWay.tags && (
        <motion.div 
          initial={{ opacity: 0, y: 20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 20, x: "-50%" }}
          className="absolute bottom-24 left-1/2 z-10 pointer-events-auto bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-2xl p-5 border border-white/10 min-w-[300px] max-w-sm max-h-[50vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3 shrink-0">
             <h3 className="text-white font-semibold text-lg capitalize truncate">
                {activeWay.tags.name || activeWay.tags.building || activeWay.tags.leisure || activeWay.tags.natural || activeWay.tags.highway || 'Map Object'}
              </h3>
              {clickedWay && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  Pinned
                </span>
              )}
          </div>
         
          <div className="flex flex-col gap-2">
            {Object.entries(activeWay.tags).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm items-start gap-4 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-400 capitalize shrink-0">{k.replace(/:/g, ' ')}</span>
                <span className="text-slate-200 font-medium text-right break-words">{String(v)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
