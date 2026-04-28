import React, { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { geocode, LocationData } from '../lib/osm';

interface SearchUIProps {
  onLocationSelect: (loc: LocationData) => void;
  isLoading: boolean;
  currentLocName: string;
}

export function SearchUI({ onLocationSelect, isLoading, currentLocName }: SearchUIProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const loc = await geocode(query);
      onLocationSelect(loc);
      setQuery('');
    } catch (err: any) {
      setError(err.message || 'Could not find location');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center p-4 md:p-8 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto">
        <form 
          onSubmit={handleSearch} 
          className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-2 flex items-center border border-white/40 transition-all focus-within:shadow-xl focus-within:bg-white"
        >
          <button type="submit" className="p-3 text-slate-400 hover:text-indigo-500 transition-colors" disabled={isSearching || isLoading}>
            <Search className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Explore the reality..."
            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-lg px-2 font-medium"
            disabled={isSearching || isLoading}
          />
        </form>

        {error && (
          <div className="mt-2 text-red-500 text-sm font-medium bg-red-50/90 backdrop-blur px-4 py-2 rounded-xl text-center shadow-sm">
            {error}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 bg-slate-900/5 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20 shadow-sm">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 text-indigo-500" />
        )}
        <span className="text-sm font-medium text-slate-700 truncate max-w-[250px] md:max-w-md">
          {isLoading ? 'Generating reality...' : currentLocName}
        </span>
      </div>
    </div>
  );
}
