import React from 'react';
import { Layers, Map as MapIcon, Building2, Car } from 'lucide-react';
import { motion } from 'motion/react';

export type MapEngineType = '3d' | 'maplibre-2d' | 'maplibre-3d';

interface MapEngineToggleProps {
  currentEngine: MapEngineType;
  onEngineSelect: (engine: MapEngineType) => void;
  isDriveMode: boolean;
  onDriveToggle: () => void;
}

export function MapEngineToggle({ currentEngine, onEngineSelect, isDriveMode, onDriveToggle }: MapEngineToggleProps) {
  return (
    <div className="absolute top-24 right-6 z-10 pointer-events-auto flex flex-col gap-2">
      <div className="flex flex-col gap-2 bg-slate-900/50 backdrop-blur-md p-2 rounded-3xl shadow-xl border border-white/5">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onEngineSelect('3d')}
          className={`flex items-center gap-2 rounded-2xl p-3 transition-colors ${
            currentEngine === '3d' 
              ? 'bg-indigo-600/90 text-white shadow-md' 
              : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-sm font-medium pr-1 hidden md:block">3D City Builder</span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onEngineSelect('maplibre-2d')}
          className={`flex items-center gap-2 rounded-2xl p-3 transition-colors ${
            currentEngine === 'maplibre-2d' 
              ? 'bg-sky-600/90 text-white shadow-md' 
              : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <MapIcon className="w-5 h-5" />
          <span className="text-sm font-medium pr-1 hidden md:block">MapLibre GL</span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onEngineSelect('maplibre-3d')}
          className={`flex items-center gap-2 rounded-2xl p-3 transition-colors ${
            currentEngine === 'maplibre-3d' 
              ? 'bg-teal-600/90 text-white shadow-md' 
              : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-sm font-medium pr-1 hidden md:block">MapLibre 3D Buildings</span>
        </motion.button>
      </div>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onDriveToggle}
        className={`flex items-center gap-2 backdrop-blur-xl shadow-xl border rounded-2xl p-3 mt-2 transition-colors ${
          isDriveMode 
            ? 'bg-rose-600/90 text-white border-rose-500/50 shadow-rose-900/20 shadow-lg' 
            : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
        }`}
      >
        <Car className="w-5 h-5" />
        <span className="text-sm font-medium pr-1">{isDriveMode ? 'Exit Drive Mode' : 'Enter Drive Mode'}</span>
      </motion.button>
    </div>
  );
}
