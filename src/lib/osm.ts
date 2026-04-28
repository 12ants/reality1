import * as THREE from 'three';

export interface LocationData {
  lat: number;
  lon: number;
  displayName: string;
}

export interface ParsedWay {
  id: number;
  tags: Record<string, string>;
  points: { x: number; y: number }[];
}

export interface CityData {
  buildings: ParsedWay[];
  roads: ParsedWay[];
  parks: ParsedWay[];
  water: ParsedWay[];
}

export async function geocode(address: string): Promise<LocationData> {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };
  }
  throw new Error('Location not found');
}

export async function fetchOSM(lat: number, lon: number): Promise<CityData> {
  const radius = 0.004; // roughly 400m radius
  const s = lat - radius;
  const w = lon - radius;
  const n = lat + radius;
  const e = lon + radius;
  const bbox = `${s},${w},${n},${e}`;

  const query = `
    [out:json][timeout:25];
    (
      way["building"](${bbox});
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|pedestrian|living_street)$"](${bbox});
      way["leisure"~"^(park|garden|pitch)$"](${bbox});
      way["natural"~"^(water|wood|scrub|beach)$"](${bbox});
      way["waterway"](${bbox});
      way["landuse"~"^(grass|forest|recreation_ground)$"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!res.ok) throw new Error('Failed to fetch OSM data. Overpass API might be busy.');
  const data = await res.json();

  return parseOSM(data, lat, lon);
}

function parseOSM(data: any, centerLat: number, centerLon: number): CityData {
  const result: CityData = {
    buildings: [],
    roads: [],
    parks: [],
    water: []
  };

  if (!data || !data.elements) return result;

  const nodeMap = new Map<number, { x: number; y: number }>();
  const ways: any[] = [];

  // Approximate scales to convert lat/lon to meters locally
  const scaleZ = 111320; 
  const scaleX = 40075000 * Math.cos(centerLat * Math.PI / 180) / 360; 

  for (const el of data.elements) {
    if (el.type === 'node') {
      nodeMap.set(el.id, {
        x: (el.lon - centerLon) * scaleX,
        y: -(el.lat - centerLat) * scaleZ 
      });
    } else if (el.type === 'way') {
      ways.push(el);
    }
  }

  for (const way of ways) {
    if (!way.nodes) continue;
    
    // Create local coordinate points
    const points = way.nodes
      .map((id: number) => nodeMap.get(id))
      .filter((p: any) => p !== undefined);

    if (points.length < 2) continue;

    const parsedWay: ParsedWay = {
      id: way.id,
      tags: way.tags || {},
      points
    };

    if (parsedWay.tags.building) {
      result.buildings.push(parsedWay);
    } else if (parsedWay.tags.highway) {
      result.roads.push(parsedWay);
    } else if (parsedWay.tags.natural === 'water' || parsedWay.tags.waterway) {
      result.water.push(parsedWay);
    } else if (
      parsedWay.tags.leisure || 
      parsedWay.tags.landuse || 
      parsedWay.tags.natural === 'wood' || 
      parsedWay.tags.natural === 'scrub'
    ) {
      result.parks.push(parsedWay);
    }
  }

  return result;
}
