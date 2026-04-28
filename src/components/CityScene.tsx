import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { ParsedWay, CityData } from '../lib/osm';
import { Line } from '@react-three/drei';

interface CitySceneProps {
  data: CityData | null;
}

const Building = memo(({ way }: { way: ParsedWay }) => {
  const { shape, height, extrudeArgs } = useMemo(() => {
    if (way.points.length < 3) return { shape: null, height: 0, extrudeArgs: null };
    
    const shape = new THREE.Shape();
    way.points.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    });
    
    const firstP = way.points[0];
    const lastP = way.points[way.points.length - 1];
    if (firstP.x !== lastP.x || firstP.y !== lastP.y) {
      shape.lineTo(firstP.x, firstP.y);
    }

    const levels = way.tags['building:levels'] ? parseInt(way.tags['building:levels']) : 1;
    const height = (levels * 4) + (Math.random() * 2);

    const extrudeArgs: [THREE.Shape, any] = [shape, { depth: height, bevelEnabled: false }];

    return { shape, height, extrudeArgs };
  }, [way]);

  // Create the Edge geometry explicitly so we don't instantiate new Geometries in args every render
  const edgesGeometry = useMemo(() => {
    if (!shape || !extrudeArgs) return null;
    const baseGeom = new THREE.ExtrudeGeometry(extrudeArgs[0], extrudeArgs[1]);
    return new THREE.EdgesGeometry(baseGeom);
  }, [shape, extrudeArgs]);

  if (!shape || !extrudeArgs || !edgesGeometry) return null;

  return (
    <mesh 
      position={[0, 0, 0]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      castShadow 
      receiveShadow
    >
      <extrudeGeometry args={extrudeArgs} />
      <meshStandardMaterial 
        color="#ffffff" 
        roughness={0.8}
        metalness={0.1}
      />
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color="#e2e8f0" opacity={0.85} transparent />
      </lineSegments>
    </mesh>
  );
});

const Park = memo(({ way }: { way: ParsedWay }) => {
  const shape = useMemo(() => {
    if (way.points.length < 3) return null;
    const s = new THREE.Shape();
    way.points.forEach((p, i) => {
      if (i === 0) s.moveTo(p.x, p.y);
      else s.lineTo(p.x, p.y);
    });
    return s;
  }, [way]);

  if (!shape) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#dcfce7" roughness={0.9} />
    </mesh>
  );
});

const Water = memo(({ way }: { way: ParsedWay }) => {
  const shape = useMemo(() => {
    if (way.points.length < 3) return null;
    const s = new THREE.Shape();
    way.points.forEach((p, i) => {
      if (i === 0) s.moveTo(p.x, p.y);
      else s.lineTo(p.x, p.y);
    });
    return s;
  }, [way]);

  if (!shape) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#bae6fd" roughness={0.2} metalness={0.6} />
    </mesh>
  );
});

const Road = memo(({ way }: { way: ParsedWay }) => {
  const points = useMemo(() => {
    if (way.points.length < 2) return [];
    // slightly raise lines to avoid Z-fighting
    return way.points.map(p => new THREE.Vector3(p.x, 0.02, -p.y));
  }, [way]);

  if (points.length === 0) return null;

  const type = way.tags.highway;
  let color = "#cbd5e1";
  let lineWidth = 1;
  let opacity = 0.5;

  if (['motorway', 'trunk'].includes(type)) {
    color = "#475569";
    lineWidth = 4;
    opacity = 0.8;
  } else if (['primary', 'secondary'].includes(type)) {
    color = "#64748b";
    lineWidth = 3;
    opacity = 0.7;
  } else if (['tertiary'].includes(type)) {
    color = "#94a3b8";
    lineWidth = 2;
    opacity = 0.6;
  } else if (['residential', 'pedestrian', 'living_street'].includes(type)) {
    color = "#cbd5e1";
    lineWidth = 1;
    opacity = 0.5;
  }

  return (
    <Line 
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
});

export function CityScene({ data }: CitySceneProps) {
  if (!data) return null;

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#f8fafc" roughness={1} />
      </mesh>

      {data.parks.map(way => <Park key={way.id} way={way} />)}
      {data.water.map(way => <Water key={way.id} way={way} />)}
      {data.buildings.map(way => <Building key={way.id} way={way} />)}
      {data.roads.map(way => <Road key={way.id} way={way} />)}
    </group>
  );
}
