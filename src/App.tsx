import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { SearchUI } from './components/SearchUI';
import { CityScene } from './components/CityScene';
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

    loadCity();
    return () => { mounted = false; };
  }, [location.lat, location.lon]);

  return (
    <div className="w-full h-screen bg-slate-50 overflow-hidden relative font-sans">
      <SearchUI 
        onLocationSelect={setLocation} 
        isLoading={isLoading} 
        currentLocName={location.displayName} 
      />

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-20 px-6">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2 text-center">Connection Error</h2>
          <p className="text-slate-600 text-center max-w-md">{error}</p>
          <button 
            onClick={() => setLocation({...location})} 
            className="mt-6 px-6 py-2.5 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30"
          >
            Try Again
          </button>
        </div>
      ) : null}

      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 400, 600], fov: 45 }}>
          
          <ambientLight intensity={0.5} />
          <directionalLight
            castShadow
            position={[500, 1000, 200]}
            intensity={1.5}
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={1}
            shadow-camera-far={2000}
            shadow-camera-left={-800}
            shadow-camera-right={800}
            shadow-camera-top={800}
            shadow-camera-bottom={-800}
          />
          <directionalLight position={[-500, 400, -200]} intensity={0.3} color="#bae6fd" />
          
          <Sky 
            sunPosition={[500, 200, 200]} 
            turbidity={0.2}
            rayleigh={0.1}
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
          />
          
          <Environment preset="city" />
          <fog attach="fog" args={['#e2e8f0', 200, 1500]} />

          <CityScene data={cityData} />
          
          <OrbitControls 
            makeDefault
            enableDamping 
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2 - 0.05} 
            minDistance={50}
            maxDistance={1500}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>
    </div>
  );
}
