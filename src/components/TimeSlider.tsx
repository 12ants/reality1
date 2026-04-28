import React, { useState, useEffect } from 'react';
import { timeState } from '../lib/time';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function TimeSlider() {
  const [val, setVal] = useState(timeState.timeOfDay);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let handle: number;
    const update = () => {
      if (timeState.autoCycle) {
        setVal(timeState.timeOfDay);
      }
      handle = requestAnimationFrame(update);
    };
    handle = requestAnimationFrame(update);
    return () => cancelAnimationFrame(handle);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    timeState.autoCycle = false;
    const v = parseFloat(e.target.value);
    setVal(v);
    timeState.timeOfDay = v;
  };

  const isDay = val > 0.25 && val < 0.75;

  return (
    <div className="absolute bottom-6 left-6 z-10 flex flex-col items-start gap-3 pointer-events-none">
       <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto bg-slate-900/60 backdrop-blur-xl p-3.5 rounded-full text-white hover:bg-slate-900/80 border border-white/10 transition-colors shadow-2xl"
          >
            {isDay ? <Sun className="w-5 h-5 text-amber-200" /> : <Moon className="w-5 h-5 text-indigo-300" />}
          </motion.button>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isOpen && (
           <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-full min-w-[240px] pointer-events-auto bg-slate-900/80 backdrop-blur-2xl shadow-2xl rounded-3xl p-5 flex flex-col gap-4 border border-white/20 origin-bottom-left"
          >
            <div className="flex justify-between items-center text-slate-300 text-xs font-semibold uppercase tracking-widest">
              <span 
                onClick={() => {timeState.autoCycle = !timeState.autoCycle}} 
                className={`cursor-pointer hover:text-white transition-colors px-2 py-1 rounded-md ${timeState.autoCycle ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5"}`}
              >
                {timeState.autoCycle ? "Auto" : "Manual"}
              </span>
              <button onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">Close</button>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.001" 
              value={val} 
              onChange={handleChange}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium tracking-wider">
              <span>Midnight</span>
              <span>Noon</span>
              <span>Midnight</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
