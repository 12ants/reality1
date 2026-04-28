import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Map as MapIcon, Maximize2, Minimize2, MapPin } from 'lucide-react';
import { LocationData } from '../lib/osm';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MiniMapProps {
  currentLocation: LocationData;
  onLocationSelect: (loc: LocationData) => void;
}

function MapEvents({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function MiniMap({ currentLocation, onLocationSelect }: MiniMapProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<L.LatLng | null>(null);
  const [locInfo, setLocInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMapClick = async (latlng: L.LatLng) => {
    setSelectedLoc(latlng);
    setIsLoading(true);
    setLocInfo('Fetching details...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
      const data = await res.json();
      if (data && data.display_name) {
        setLocInfo(data.display_name);
      } else {
        setLocInfo('Unknown Location');
      }
    } catch (e) {
      setLocInfo('Error fetching location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHere = () => {
    if (selectedLoc) {
      onLocationSelect({
        lat: selectedLoc.lat,
        lon: selectedLoc.lng,
        displayName: locInfo || "Selected Location"
      });
      setSelectedLoc(null);
      setExpanded(false);
    }
  };

  const center: [number, number] = [currentLocation.lat, currentLocation.lon];

  return (
    <div 
      className={`absolute bottom-4 right-4 z-20 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ease-in-out ${
        expanded ? 'w-80 h-96 sm:w-96 sm:h-[28rem]' : 'w-48 h-32 hover:scale-105'
      }`}
    >
      <div className="absolute top-2 right-2 z-[1000] flex gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg backdrop-blur shadow-sm transition-colors"
          title={expanded ? "Minimize map" : "Expand map"}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div className={`w-full h-full ${!expanded ? 'pointer-events-none' : ''}`}>
        <MapContainer 
          center={center} 
          zoom={13} 
          scrollWheelZoom={expanded}
          dragging={expanded}
          doubleClickZoom={expanded}
          className="w-full h-full"
          zoomControl={expanded}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater center={center} />
          {expanded && <MapEvents onMapClick={handleMapClick} />}
          
          <Marker position={center} opacity={0.5}>
            <Popup>Current Rendered Area</Popup>
          </Marker>

          {selectedLoc && (
            <Marker position={selectedLoc}>
              <Popup autoPan={false}>
                <div className="flex flex-col gap-2 max-w-[200px]">
                  <p className="text-sm text-slate-800 font-medium leading-tight">
                    {locInfo}
                  </p>
                  <button 
                    onClick={handleGoHere}
                    disabled={isLoading}
                    className="flex justify-center items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <MapPin size={14} />
                    {isLoading ? 'Loading...' : 'Render Here'}
                  </button>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      
      {!expanded && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 to-transparent pt-8 pb-2 px-3 pointer-events-none flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-300 drop-shadow-md flex items-center gap-1">
            <MapIcon size={10} /> Expand Map
          </span>
        </div>
      )}
    </div>
  );
}
