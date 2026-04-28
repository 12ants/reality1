import React, { useState } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { geocode, LocationData } from '../lib/osm';
import { motion, AnimatePresence } from 'motion/react';

interface SearchUIProps {
  onLocationSelect: (loc: LocationData) => void;
  isLoading: boolean;
  currentLocName: string;
}

export function SearchUI({ onLocationSelect, isLoading, currentLocName }: SearchUIProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const loc = await geocode(query);
      onLocationSelect(loc);
      setQuery('');
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Could not find location');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="absolute top-6 left-6 z-10 flex flex-col items-start gap-3 pointer-events-none">
      
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto bg-slate-900/60 backdrop-blur-xl p-3.5 rounded-full text-white hover:bg-slate-900/80 border border-white/10 transition-colors shadow-2xl"
          >
            <Search className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="w-full max-w-sm pointer-events-auto flex flex-col gap-2 origin-top-left"
          >
            <form 
              onSubmit={handleSearch} 
              className="bg-slate-900/80 backdrop-blur-2xl shadow-2xl rounded-3xl p-1.5 flex items-center border border-white/20 transition-all focus-within:border-white/40 focus-within:shadow-indigo-500/10"
            >
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2.5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a city, place..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-400 text-base px-2 font-medium"
                disabled={isSearching || isLoading}
                autoFocus
              />
              <button 
                type="submit" 
                className="p-3 text-slate-400 hover:text-indigo-400 transition-colors rounded-full hover:bg-white/5 mr-1" 
                disabled={isSearching || isLoading}
              >
                {isSearching || isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </form>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-300 text-sm font-medium bg-red-950/80 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-lg border border-red-500/20"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent minimalistic location badge */}
      <motion.div 
        layout
        className="pointer-events-auto flex items-center gap-2 bg-slate-900/40 hover:bg-slate-900/60 transition-colors backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer" 
        onClick={() => setIsOpen(true)}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
        ) : (
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
        )}
        <span className="text-xs font-semibold tracking-wide text-slate-200 truncate max-w-[180px]">
          {isLoading ? 'Generating reality...' : currentLocName}
        </span>
      </motion.div>
    </div>
  );
}
