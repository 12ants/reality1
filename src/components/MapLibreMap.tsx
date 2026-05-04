import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LocationData } from '../lib/osm';

interface MapLibreMapProps {
  currentLocation: LocationData;
  onLocationSelect: (loc: LocationData) => void;
  show3DBuildings?: boolean;
  isDriveMode?: boolean;
}

export function MapLibreMap({ currentLocation, onLocationSelect, show3DBuildings, isDriveMode }: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mainMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (mapRef.current) {
        if (!isDriveMode) {
            mapRef.current.jumpTo({
                center: [currentLocation.lon, currentLocation.lat]
            });
            if (mainMarkerRef.current) {
                mainMarkerRef.current.setLngLat([currentLocation.lon, currentLocation.lat]);
            }
        }
        return;
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // standard dark mode basemap
      center: [currentLocation.lon, currentLocation.lat],
      zoom: 15,
      pitch: 45,
    });

    map.addControl(new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
    }), 'top-left');

    const marker = new maplibregl.Marker()
        .setLngLat([currentLocation.lon, currentLocation.lat])
        .addTo(map);
    mainMarkerRef.current = marker;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mainMarkerRef.current = null;
    };
  }, [currentLocation, isDriveMode]);

  useEffect(() => {
    if (!isDriveMode || !mapRef.current) {
       if (!isDriveMode && mapRef.current) {
         mapRef.current.jumpTo({
            center: [currentLocation.lon, currentLocation.lat],
            bearing: 0,
            pitch: 45
         });
         if (mainMarkerRef.current) {
             mainMarkerRef.current.getElement().style.display = 'block';
         }
       }
       return;
    }

    const map = mapRef.current;
    if (mainMarkerRef.current) {
        mainMarkerRef.current.getElement().style.display = 'none';
    }

    let animationFrameId: number;
    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => { 
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        keys[e.key.toLowerCase()] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const center = map.getCenter();
    let carLng = center.lng;
    let carLat = center.lat;
    let carBearing = map.getBearing() || 0;
    let carSpeed = 0;
    
    let lastTime = performance.now();

    const el = document.createElement('div');
    el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
    el.style.transform = 'translate(-50%, -50%)';
    el.style.width = '32px';
    el.style.height = '32px';

    const carMarker = new maplibregl.Marker({ element: el })
       .setLngLat([carLng, carLat])
       .addTo(map);

    const update = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const maxSpeed = 40.0;
      const acceleration = 20.0;
      const deceleration = 15.0;
      const brakeForce = 40.0;

      let isAccelerating = false;
      if (keys['w'] || keys['arrowup']) { carSpeed += acceleration * dt; isAccelerating = true; }
      if (keys['s'] || keys['arrowdown']) {
         if (carSpeed > 0) carSpeed -= brakeForce * dt;
         else carSpeed -= acceleration * dt;
         isAccelerating = true;
      }

      if (!isAccelerating) {
        if (carSpeed > 0) {
          carSpeed -= deceleration * dt;
          if (carSpeed < 0) carSpeed = 0;
        } else if (carSpeed < 0) {
          carSpeed += deceleration * dt;
          if (carSpeed > 0) carSpeed = 0;
        }
      }

      if (carSpeed > maxSpeed) carSpeed = maxSpeed;
      if (carSpeed < -maxSpeed / 2) carSpeed = -maxSpeed / 2;

      const steeringFactor = Math.min(Math.abs(carSpeed) / maxSpeed, 1.0);
      const effectiveSteeringFactor = Math.max(0.2, steeringFactor);
      
      const turnSpeed = 90.0 * dt * effectiveSteeringFactor;

      if (Math.abs(carSpeed) > 0.1) {
         const turnDirection = carSpeed > 0 ? 1 : -1;
         if (keys['a'] || keys['arrowleft']) carBearing -= turnSpeed * turnDirection;
         if (keys['d'] || keys['arrowright']) carBearing += turnSpeed * turnDirection;
      }

      const latConversion = 111320;
      const lngConversion = 111320 * Math.cos(carLat * Math.PI / 180);

      const bearingRad = carBearing * Math.PI / 180;
      const dy = Math.cos(bearingRad) * carSpeed * dt;
      const dx = Math.sin(bearingRad) * carSpeed * dt;

      carLat += dy / latConversion;
      carLng += dx / lngConversion;

      if (carMarker) {
         carMarker.setLngLat([carLng, carLat]);
         carMarker.setRotation(carBearing);
      }
      
      map.jumpTo({
        center: [carLng, carLat],
        bearing: carBearing,
        pitch: 60,
      });

      animationFrameId = requestAnimationFrame(update);
    }
    
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
      carMarker.remove();
    }
  }, [isDriveMode, currentLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const toggle3DBuildings = () => {
      if (!map.getSource('carto')) return;
      
      const layerId = '3d-buildings';
      
      if (show3DBuildings) {
        if (!map.getLayer(layerId)) {
          // Find first label layer to insert buildings beneath
          let labelLayerId;
          const layers = map.getStyle()?.layers || [];
          for (let i = 0; i < layers.length; i++) {
              if (layers[i].type === 'symbol' && layers[i].layout?.['text-field']) {
                  labelLayerId = layers[i].id;
                  break;
              }
          }

          map.addLayer(
            {
              'id': layerId,
              'source': 'carto',
              'source-layer': 'building',
              'filter': ['!=', ['get', 'render_height'], null],
              'type': 'fill-extrusion',
              'minzoom': 14,
              'paint': {
                  'fill-extrusion-color': '#111827',
                  'fill-extrusion-height': ['get', 'render_height'],
                  'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                  'fill-extrusion-opacity': 0.8
              }
            },
            labelLayerId
          );
        }
      } else {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }
    };

    if (map.isStyleLoaded()) {
      toggle3DBuildings();
    } else {
      map.on('load', toggle3DBuildings);
    }

    return () => {
      map.off('load', toggle3DBuildings);
    };
  }, [show3DBuildings]);

  return <div ref={mapContainer} className="w-full h-full absolute inset-0 z-0 bg-[#0f172a]" />;
}
