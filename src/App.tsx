import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { SearchUI } from './components/SearchUI';
import { CityScene } from './components/CityScene';
import { EnvironmentCycle } from './components/EnvironmentCycle';
import { TimeSlider } from './components/TimeSlider';
import { InfoBox } from './components/InfoBox';
import { ViewModeToggle } from './components/ViewModeToggle';
import { CustomControls } from './components/CustomControls';
import { CarDriveControls } from './components/CarDriveControls';
import { MiniMap } from './components/MiniMap';
import { MapEngineToggle, MapEngineType } from './components/MapEngineToggle';
import { MapLibreMap } from './components/MapLibreMap';
import { fetchOSM, CityData, LocationData } from './lib/osm';
import { AlertCircle } from 'lucide-react';

const DEFAULT_LOCATION: LocationData = {
  lat: 59.3280, 
  lon: 18.0728,
  displayName: "Stockholm"
};

export default function App() {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapEngine, setMapEngine] = useState<MapEngineType>('3d');
  const [isDriveMode, setIsDriveMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadCity = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchOSM(location.lat, location.lon);
        if (mounted) {
          setCityData(data);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load map data');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (mapEngine === '3d') {
      loadCity();
    } else {
      setIsLoading(false);
    }
    return () => { mounted = false; };
  }, [location.lat, location.lon, mapEngine]);

  return (
    <div className="w-full h-screen bg-slate-900 overflow-hidden relative font-sans">
      <SearchUI 
        onLocationSelect={setLocation} 
        isLoading={isLoading} 
        currentLocName={location.displayName} 
      />
      {mapEngine === '3d' && <ViewModeToggle />}
      <MapEngineToggle 
        currentEngine={mapEngine} 
        onEngineSelect={setMapEngine} 
        isDriveMode={isDriveMode}
        onDriveToggle={() => setIsDriveMode(!isDriveMode)}
      />
      
      {isDriveMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none drop-shadow-lg">
          <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl flex items-center gap-3">
             <div className="flex gap-1">
               <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs font-mono font-bold">W</kbd>
               <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs font-mono font-bold">A</kbd>
               <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs font-mono font-bold">S</kbd>
               <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs font-mono font-bold">D</kbd>
             </div>
             <span className="text-white font-medium">to Drive</span>
          </div>
        </div>
      )}

      {mapEngine === '3d' && <TimeSlider />}
      {mapEngine === '3d' && <InfoBox />}
      <MiniMap currentLocation={location} onLocationSelect={setLocation} />

      {error && mapEngine === '3d' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20 px-6">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2 text-center">Connection Error</h2>
          <p className="text-slate-300 text-center max-w-md">{error}</p>
          <button 
            onClick={() => setLocation({...location})} 
            className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {mapEngine === '3d' ? (
        <div className="absolute inset-0 z-0 bg-[#0f172a]">
          <Canvas shadows camera={{ position: [0, 400, 600], fov: 45, near: 10, far: 3000 }}>
            <EnvironmentCycle />
            <fog attach="fog" args={['#0f172a', 200, 1500]} />
            <CityScene data={cityData} />
            {isDriveMode ? <CarDriveControls /> : <CustomControls />}
          </Canvas>
        </div>
      ) : (
        <MapLibreMap currentLocation={location} onLocationSelect={setLocation} show3DBuildings={mapEngine === 'maplibre-3d'} isDriveMode={isDriveMode} />
      )}
    </div>
  );
}
