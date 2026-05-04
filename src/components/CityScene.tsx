import { memo, useMemo, useRef, useLayoutEffect, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ParsedWay, CityData } from '../lib/osm';
import { Line, useCursor } from '@react-three/drei';
import { timeState } from '../lib/time';

const getAsphaltTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // High frequency noise for realistic asphalt
  for (let i = 0; i < 60000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = Math.floor(200 + Math.random() * 55);
    const a = Math.random() * 0.15 + 0.05;
    const size = Math.random() * 1.5 + 0.5;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, ${a})`;
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  return texture;
};

const asphaltTexture = getAsphaltTexture();

interface CitySceneProps {
  data: CityData | null;
}

function useInteraction(way: ParsedWay) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useCursor(hovered, 'pointer', 'auto');

  const onPointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    window.dispatchEvent(new CustomEvent('map-hover', { detail: { way } }));
  }, [way]);

  const onPointerOut = useCallback((e: any) => {
    setHovered(false);
    window.dispatchEvent(new CustomEvent('map-hover', { detail: { way: null } }));
  }, []);

  const onClick = useCallback((e: any) => {
    e.stopPropagation();
    setClicked(true);
    window.dispatchEvent(new CustomEvent('map-click', { detail: { way } }));
    setTimeout(() => {
      setClicked(false);
    }, 5000);
  }, [way]);

  return { 
    isHighlighted: hovered || clicked, 
    handlers: { onPointerOver, onPointerOut, onClick } 
  };
}

const Building = memo(({ way }: { way: ParsedWay }) => {
  const { isHighlighted, handlers } = useInteraction(way);

  const { shape, height, extrudeArgs, matProps } = useMemo(() => {
    if (way.points.length < 3) return { shape: null, height: 0, extrudeArgs: null, matProps: null };
    
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

    // Realistic variations
    let baseCols = ["#0f172a", "#1e293b", "#020617", "#111827", "#1e1e1e"];
    let rMin = 0.5, rMax = 0.9;
    let mMin = 0.1, mMax = 0.6;
    
    const bType = way.tags.building;
    const aType = way.tags.amenity;
    
    if (aType === 'hospital' || bType === 'hospital' || aType === 'clinic') {
      baseCols = ["#f8fafc", "#e2e8f0", "#cbd5e1"]; // White/light gray for hospitals
      rMin = 0.2; rMax = 0.4;
      mMin = 0.1; mMax = 0.3;
    } else if (aType === 'school' || aType === 'college' || aType === 'university' || bType === 'school') {
      baseCols = ["#78350f", "#92400e", "#b45309", "#854d0e"]; // Brick colors
      rMin = 0.8; rMax = 1.0;
      mMin = 0.0; mMax = 0.1;
    } else if (bType === 'commercial' || bType === 'retail' || bType === 'office') {
      baseCols = ["#0c4a6e", "#075985", "#0369a1", "#0f172a"]; // Glassy / dark blueish
      rMin = 0.1; rMax = 0.3;
      mMin = 0.7; mMax = 1.0; 
    } else if (bType === 'industrial' || bType === 'warehouse') {
      baseCols = ["#475569", "#334155", "#64748b"]; // Gray metallic
      rMin = 0.6; rMax = 0.8;
      mMin = 0.5; mMax = 0.7;
    } else if (bType === 'residential' || bType === 'apartments' || bType === 'house') {
      baseCols = ["#1e293b", "#0f172a", "#27272a", "#3f3f46"]; // Muted varied
    }
    
    const hash = (way.id * 137) % 100;
    const col = new THREE.Color(baseCols[way.id % baseCols.length]);
    
    // Slight randomization in hsl
    col.offsetHSL(
      (hash / 100) * 0.04 - 0.02, 
      (hash / 100) * 0.1 - 0.05, 
      (hash / 100) * 0.1 - 0.02
    );
    
    const rough = rMin + (hash / 100) * (rMax - rMin);
    const met = mMin + (hash / 100) * (mMax - mMin);
    
    const lineCol = new THREE.Color(baseCols[way.id % baseCols.length]).offsetHSL(0, 0, 0.15);

    return { shape, height, extrudeArgs, matProps: { color: col, roughness: rough, metalness: met, lineCol } };
  }, [way]);

  // Create the Edge geometry explicitly so we don't instantiate new Geometries in args every render
  const edgesGeometry = useMemo(() => {
    if (!shape || !extrudeArgs) return null;
    const baseGeom = new THREE.ExtrudeGeometry(extrudeArgs[0], extrudeArgs[1]);
    return new THREE.EdgesGeometry(baseGeom);
  }, [shape, extrudeArgs]);

  if (!shape || !extrudeArgs || !edgesGeometry || !matProps) return null;

  return (
    <mesh 
      position={[0, 0, 0]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      castShadow 
      receiveShadow
      {...handlers}
    >
      <extrudeGeometry args={extrudeArgs} />
      <meshStandardMaterial 
        color={isHighlighted ? "#818cf8" : matProps.color} 
        roughness={matProps.roughness}
        metalness={isHighlighted ? 0.8 : matProps.metalness}
        emissive={isHighlighted ? "#4f46e5" : "#000000"}
        emissiveIntensity={isHighlighted ? 0.4 : 0}
      />
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={isHighlighted ? "#c7d2fe" : matProps.lineCol} opacity={isHighlighted ? 1 : 0.6} transparent />
      </lineSegments>
    </mesh>
  );
});

const Park = memo(({ way }: { way: ParsedWay }) => {
  const { isHighlighted, handlers } = useInteraction(way);

  const { shape, color, extrudeArgs, yOffset } = useMemo(() => {
    if (way.points.length < 3) return { shape: null, color: new THREE.Color(), extrudeArgs: null, yOffset: 0 };
    const s = new THREE.Shape();
    way.points.forEach((p, i) => {
      if (i === 0) s.moveTo(p.x, p.y);
      else s.lineTo(p.x, p.y);
    });
    
    const firstP = way.points[0];
    const lastP = way.points[way.points.length - 1];
    if (firstP.x !== lastP.x || firstP.y !== lastP.y) {
      s.lineTo(firstP.x, firstP.y);
    }
    
    let baseColors = ["#022c22", "#064e3b", "#065f46", "#14532d", "#0f3f26"];
    const n = way.tags.natural;
    if (n === 'beach' || n === 'sand') {
      baseColors = ["#713f12", "#854d0e", "#a16207", "#78350f"];
    } else if (n === 'bare_rock' || n === 'cliff') {
      baseColors = ["#475569", "#334155", "#64748b"];
    }

    const color = new THREE.Color(baseColors[way.id % baseColors.length]);
    
    const hash = (way.id * 137) % 100;
    color.offsetHSL((hash / 100) * 0.06 - 0.03, 0, (hash / 100) * 0.04 - 0.02);
    
    let area = 0;
    for (let i = 0; i < way.points.length; i++) {
        const j = (i + 1) % way.points.length;
        area += way.points[i].x * way.points[j].y;
        area -= way.points[j].x * way.points[i].y;
    }
    area = Math.abs(area / 2);

    const size = Math.sqrt(area);
    const heightFactor = Math.max(0, 1 - (size / 150));
    
    let depth = 0.02 + heightFactor * 0.06;
    let bEnabled = false;
    let bSegments = 0;
    let bSize = 0;
    let bThickness = 0;

    if (way.tags.natural === 'wood' || way.tags.landuse === 'forest') {
       depth = 0.1 + heightFactor * 0.4;
    } else if (way.tags.natural === 'cliff' || way.tags.natural === 'bare_rock') {
       depth = 0.2 + heightFactor * 0.6;
    } else if (way.tags.natural === 'hill' || way.tags.natural === 'ridge') {
       depth = 0.3 + heightFactor * 1.5; // much taller for hills, but low enough to avoid extreme clipping
       bEnabled = true;
       bSegments = 3;
       bSize = Math.max(1, size / 8); 
       bThickness = depth * 0.5;
       depth = depth * 0.5; // remaining half is the flat top
    }

    const extrudeArgs: [THREE.Shape, any] = [s, { 
      depth: depth, 
      bevelEnabled: bEnabled,
      bevelSegments: bSegments,
      bevelSize: bSize,
      bevelThickness: bThickness,
    }];


    // Smooth rise for smaller parks, plus a tiny random offset to prevent Z-fighting
    const yOffset = 0.01 + heightFactor * 0.04 + ((way.id * 137) % 1000) / 1000 * 0.02;

    return { shape: s, color, extrudeArgs, yOffset };
  }, [way]);

  if (!shape || !extrudeArgs) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]} receiveShadow {...handlers}>
      <extrudeGeometry args={extrudeArgs} />
      <meshStandardMaterial 
        color={isHighlighted ? "#34d399" : color} 
        roughness={isHighlighted ? 0.4 : 1} 
        metalness={isHighlighted ? 0.3 : 0.1}
        emissive={isHighlighted ? "#059669" : "#000000"}
        emissiveIntensity={isHighlighted ? 0.3 : 0} 
      />
    </mesh>
  );
});

const Water = memo(({ way }: { way: ParsedWay }) => {
  const { isHighlighted, handlers } = useInteraction(way);

  const { isLine, linePoints, lineWidth, shape, extrudeArgs, color, yOffset } = useMemo(() => {
    const isLinear = way.tags.waterway && way.tags.waterway !== 'riverbank';
    
    if (isLinear) {
      if (way.points.length < 2) return { isLine: true, linePoints: null, lineWidth: 0, shape: null, extrudeArgs: null, color: null, yOffset: 0 };
      const pts = way.points.map(p => new THREE.Vector3(p.x, 0.1, -p.y)); // above LandArea
      let lw = 4;
      if (way.tags.waterway === 'river') lw = 16;
      else if (way.tags.waterway === 'stream' || way.tags.waterway === 'ditch') lw = 3;
      else if (way.tags.waterway === 'canal') lw = 10;
      
      return { isLine: true, linePoints: pts, lineWidth: lw, shape: null, extrudeArgs: null, color: null, yOffset: 0 };
    }

    if (way.points.length < 3) return { isLine: false, linePoints: null, lineWidth: 0, shape: null, extrudeArgs: null, color: null, yOffset: 0 };
    
    const s = new THREE.Shape();
    way.points.forEach((p, i) => {
      if (i === 0) s.moveTo(p.x, p.y);
      else s.lineTo(p.x, p.y);
    });
    
    const firstP = way.points[0];
    const lastP = way.points[way.points.length - 1];
    if (firstP.x !== lastP.x || firstP.y !== lastP.y) {
      s.lineTo(firstP.x, firstP.y);
    }
    
    const baseColors = ["#020617", "#0f172a", "#1e293b", "#082f49", "#0369a1"]; // Add some deep blues
    const color = new THREE.Color(baseColors[way.id % baseColors.length]);
    const hash = (way.id * 137) % 100;
    color.offsetHSL(0, 0, (hash / 100) * 0.05 - 0.025);

    const extrudeArgs: [THREE.Shape, any] = [s, { 
      depth: 0.02, 
      bevelEnabled: false
    }];

    const yOffset = -0.1 + ((way.id * 137) % 1000) / 1000 * 0.03;

    return { isLine: false, linePoints: null, lineWidth: 0, shape: s, extrudeArgs, color, yOffset };
  }, [way]);

  if (isLine && linePoints) {
    return (
      <group {...handlers}>
        <Line 
          points={linePoints}
          color={isHighlighted ? "#38bdf8" : "#0ea5e9"} // nice bright blue for rivers
          lineWidth={isHighlighted ? lineWidth + 4 : lineWidth}
          transparent
          opacity={0.85}
        />
      </group>
    );
  }

  if (!shape || !extrudeArgs) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]} receiveShadow {...handlers}>
      <extrudeGeometry args={extrudeArgs} />
      <meshPhysicalMaterial 
        color={isHighlighted ? "#7dd3fc" : (color || "#0369a1")} 
        roughness={isHighlighted ? 0 : 0.05} 
        metalness={0.1}
        transmission={0.8}
        ior={1.33}
        thickness={1.5}
        emissive={isHighlighted ? "#0284c7" : "#000000"}
        emissiveIntensity={isHighlighted ? 0.4 : 0} 
        transparent
      />
    </mesh>
  );
});

const Road = memo(({ way }: { way: ParsedWay }) => {
  const { isHighlighted, handlers } = useInteraction(way);

  const type = way.tags.highway;
  const isBridge = way.tags.bridge === 'yes' || way.tags.bridge === 'true' || way.tags.bridge === '1' || way.tags.bridge === 'viaduct' || way.tags.bridge === 'suspension';

  const points = useMemo(() => {
    if (way.points.length < 2) return [];
    // slightly raise lines to avoid Z-fighting, closer to ground now
    const baseHeight = isBridge ? 4.5 : 0.05;
    return way.points.map(p => new THREE.Vector3(p.x, baseHeight, -p.y));
  }, [way, isBridge]);

  const dashedPoints = useMemo(() => {
    if (way.points.length < 2) return [];
    const baseHeight = isBridge ? 4.6 : 0.06;
    return way.points.map(p => new THREE.Vector3(p.x, baseHeight, -p.y));
  }, [way, isBridge]);

  const shadowPoints = useMemo(() => {
    if (way.points.length < 2 || !isBridge) return [];
    return way.points.map(p => new THREE.Vector3(p.x, 0.5, -p.y));
  }, [way, isBridge]);

  if (points.length === 0) return null;

  let color = "#64748b";
  let hasDashedCenter = false;
  let defaultBaseLanes = 1;

  if (['motorway', 'trunk'].includes(type)) {
    color = "#2a2a30"; // dark asphalt
    hasDashedCenter = true;
    defaultBaseLanes = 3; // 3 lanes per direction if not specified
  } else if (['primary', 'secondary'].includes(type)) {
    color = "#35353c"; // slightly worn dark asphalt
    hasDashedCenter = true;
    defaultBaseLanes = 2;
  } else if (['tertiary'].includes(type)) {
    color = "#42424b"; // medium asphalt
    hasDashedCenter = true;
    defaultBaseLanes = 1;
  } else if (['residential', 'pedestrian', 'living_street', 'unclassified', 'service'].includes(type)) {
    color = "#585863"; // lighter, older asphalt
    hasDashedCenter = false; // often no center lines on small residential streets
    defaultBaseLanes = 1;
  } else if (['footway', 'path', 'cycleway', 'track', 'steps'].includes(type)) {
    color = type === 'cycleway' ? "#a43333" : type === 'track' ? "#6b5d4f" : "#afb1b6"; // Dark red for cycleway, dirt for track, concrete for footway
    defaultBaseLanes = 0.5; // ~1.75m width
  }

  const parsedLanes = parseInt(way.tags.lanes);
  let lanes = !isNaN(parsedLanes) && parsedLanes > 0 ? parsedLanes : defaultBaseLanes;
  const isOneWay = way.tags.oneway === 'yes' || way.tags.oneway === 'true' || way.tags.oneway === '1' || type === 'motorway' || type === 'trunk';

  // Calculate total lanes based on directionality
  let totalLaneUnits = lanes;
  if (!isOneWay && !['footway', 'path', 'cycleway', 'track', 'steps'].includes(type) && isNaN(parsedLanes)) {
     // If not explicitly one way, and we used default lanes, double it for bidirectional
     totalLaneUnits *= 2; 
  }
  
  const laneMultiplier = 3.2; // World units scale for lanes (~3.2m per lane makes it look balanced)
  const lineWidth = Math.max(totalLaneUnits * laneMultiplier, 1.2);

  // Calculate length for texture repeating
  const roadLength = useMemo(() => {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
        len += points[i].distanceTo(points[i - 1]);
    }
    return Math.max(len, 1);
  }, [points]);

  // Texture should repeat every ~10 units of length
  const repeatX = roadLength / 10;

  // Additional detail: Some roads might have special surface colors
  if (way.tags.surface === 'unpaved' || way.tags.surface === 'dirt' || way.tags.surface === 'gravel') {
    color = "#78350f"; // brownish
  } else if (way.tags.surface === 'cobblestone' || way.tags.surface === 'paving_stones') {
    color = "#9ca3af"; // lighter grey
  }

  return (
    <group {...handlers}>
      {isBridge && (
        <Line 
          points={shadowPoints}
          color="#000000"
          lineWidth={lineWidth * 1.5}
          transparent
          opacity={0.3}
          worldUnits
        />
      )}
      <Line 
        points={points}
        color={isHighlighted ? "#cbd5e1" : color}
        lineWidth={isHighlighted ? lineWidth + 1 : lineWidth}
        worldUnits
        map={asphaltTexture}
        useMap={true}
        repeat={[repeatX, 1]}
      />
      {hasDashedCenter && !isOneWay && (
        <Line 
          points={dashedPoints}
          color={isHighlighted ? "#ffffff" : "#f1f5f9"}
          lineWidth={0.3}
          dashed
          dashSize={3}
          dashScale={1}
          dashOffset={0}
          gapSize={4}
          worldUnits
        />
      )}
    </group>
  );
});

const StreetLights = memo(({ roads }: { roads: ParsedWay[] }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lightPositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    roads.forEach(way => {
      const type = way.tags.highway;
      if (['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential'].includes(type)) {
        const interval = ['motorway', 'trunk', 'primary'].includes(type) ? 35 : 20;
        
        let accumulatedDistance = 0;
        for (let i = 0; i < way.points.length - 1; i++) {
          const p1 = new THREE.Vector3(way.points[i].x, 2.0, -way.points[i].y);
          const p2 = new THREE.Vector3(way.points[i+1].x, 2.0, -way.points[i+1].y);
          const segmentLength = p1.distanceTo(p2);
          
          let dist = interval - accumulatedDistance;
          while (dist <= segmentLength) {
            const interp = p1.clone().lerp(p2, dist / segmentLength);
            positions.push(interp);
            dist += interval;
          }
          accumulatedDistance = segmentLength - (dist - interval);
        }
      }
    });
    return positions;
  }, [roads]);

  useLayoutEffect(() => {
    if (meshRef.current && lightPositions.length > 0) {
      lightPositions.forEach((pos, i) => {
        dummy.position.copy(pos);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [lightPositions, dummy]);

  useFrame(() => {
    if (meshRef.current) {
      // Fade lights in at night (when daylightRatio is small)
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      const opacity = Math.max(0, 1 - timeState.daylightRatio * 2);
      
      // We don't want to continually reassign transparent unless needed, 
      // but modifying opacity works fine if transparent is true.
      material.opacity = opacity;
    }
  });

  if (lightPositions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, lightPositions.length]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial color="#fcd34d" transparent opacity={1} />
    </instancedMesh>
  );
});

const Trees = memo(({ parks }: { parks: ParsedWay[] }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const benchRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const treeData = useMemo(() => {
    const positions: { pos: THREE.Vector3, scale: number, rot: number, isBench: boolean, parkHeight: number }[] = [];
    parks.forEach(way => {
      if(way.points.length < 3) return;

      let area = 0;
      for (let i = 0; i < way.points.length; i++) {
        const j = (i + 1) % way.points.length;
        area += way.points[i].x * way.points[j].y;
        area -= way.points[j].x * way.points[i].y;
      }
      area = Math.abs(area / 2);

      const size = Math.sqrt(area);
      const heightFactor = Math.max(0, 1 - (size / 150));
      
      let depth = 0.02 + heightFactor * 0.06;
      if (way.tags.natural === 'wood' || way.tags.landuse === 'forest') {
         depth = 0.1 + heightFactor * 0.4;
      } else if (way.tags.natural === 'cliff' || way.tags.natural === 'bare_rock') {
         depth = 0.2 + heightFactor * 0.6;
      }

      const yOffset = 0.01 + heightFactor * 0.04 + ((way.id * 137) % 1000) / 1000 * 0.02;
      const parkHeight = depth + yOffset;
      
      let cx = 0, cy = 0;
      way.points.forEach(p => { cx += p.x; cy += p.y; });
      cx /= way.points.length;
      cy /= way.points.length;

      way.points.forEach((p, idx) => {
        // Randomly place trees and occasionally a bench
        const r = Math.random();
        if (r > 0.4) return;
        
        const t = 0.1 + Math.random() * 0.4; // 10% to 50% towards center
        const tx = p.x + (cx - p.x) * t;
        const ty = p.y + (cy - p.y) * t;
        
        positions.push({
          pos: new THREE.Vector3(tx, parkHeight, -ty),
          scale: 0.5 + Math.random() * 0.7,
          rot: Math.random() * Math.PI,
          isBench: r < 0.05, // Tiny chance for a bench
          parkHeight
        });
      });
    });
    return positions;
  }, [parks]);

  useLayoutEffect(() => {
    if (meshRef.current && canopyRef.current && benchRef.current && treeData.length > 0) {
      let treeIdx = 0;
      let benchIdx = 0;
      
      treeData.forEach((data) => {
        dummy.position.copy(data.pos);
        dummy.rotation.set(0, data.rot, 0);
        
        if (data.isBench) {
          dummy.scale.set(1.5, 0.5, 0.8);
          dummy.position.y = data.parkHeight + 0.25; // on top of park elevation
          dummy.updateMatrix();
          benchRef.current!.setMatrixAt(benchIdx++, dummy.matrix);
        } else {
          // Trunk
          dummy.scale.set(data.scale * 0.5, data.scale * 1.5, data.scale * 0.5);
          dummy.position.y = data.parkHeight + (data.scale * 1.5) / 2;
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(treeIdx, dummy.matrix);

          // Canopy
          dummy.position.copy(data.pos);
          dummy.position.y = data.parkHeight + data.scale * 1.5; 
          dummy.scale.set(data.scale * 1.5, data.scale * 2.0, data.scale * 1.5);
          dummy.updateMatrix();
          canopyRef.current!.setMatrixAt(treeIdx++, dummy.matrix);
        }
      });
      
      meshRef.current.count = treeIdx;
      canopyRef.current.count = treeIdx;
      benchRef.current.count = benchIdx;
      
      meshRef.current.instanceMatrix.needsUpdate = true;
      canopyRef.current.instanceMatrix.needsUpdate = true;
      benchRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [treeData, dummy]);

  if (treeData.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, treeData.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.4, 1, 5]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, treeData.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#065f46" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={benchRef} args={[undefined, undefined, treeData.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </instancedMesh>
    </group>
  );
});

const LandArea = memo(({ way }: { way: ParsedWay }) => {
  const { isHighlighted, handlers } = useInteraction(way);

  const { shape, color, extrudeArgs, yOffset } = useMemo(() => {
    if (way.points.length < 3) return { shape: null, color: new THREE.Color(), extrudeArgs: null, yOffset: 0 };
    const s = new THREE.Shape();
    way.points.forEach((p, i) => {
      if (i === 0) s.moveTo(p.x, p.y);
      else s.lineTo(p.x, p.y);
    });
    
    const firstP = way.points[0];
    const lastP = way.points[way.points.length - 1];
    if (firstP.x !== lastP.x || firstP.y !== lastP.y) {
      s.lineTo(firstP.x, firstP.y);
    }

    const tags = way.tags;
    let baseColStr = "#1e293b"; // Default dark
    
    if (tags.amenity === 'parking') {
      baseColStr = "#334155";
    } else if (tags.landuse === 'commercial' || tags.landuse === 'retail') {
      baseColStr = "#0f172a";
    } else if (tags.landuse === 'industrial') {
      baseColStr = "#1e1e1e";
    } else if (tags.landuse === 'residential') {
      baseColStr = "#0f172a";
    } else if (tags.amenity) {
      baseColStr = "#1e293b";
    }

    const color = new THREE.Color(baseColStr);
    
    const hash = (way.id * 137) % 100;
    color.offsetHSL(0, 0, (hash / 100) * 0.04 - 0.02);
    
    let area = 0;
    for (let i = 0; i < way.points.length; i++) {
        const j = (i + 1) % way.points.length;
        area += way.points[i].x * way.points[j].y;
        area -= way.points[j].x * way.points[i].y;
    }
    area = Math.abs(area / 2);

    const size = Math.sqrt(area);
    const heightFactor = Math.max(0, 1 - (size / 150));
    
    const depth = 0.02 + heightFactor * 0.04;

    const extrudeArgs: [THREE.Shape, any] = [s, { 
      depth: depth, 
      bevelEnabled: false
    }];

    const yOffset = -0.02 + heightFactor * 0.03 + ((way.id * 137) % 1000) / 1000 * 0.02;

    return { shape: s, color, extrudeArgs, yOffset };
  }, [way]);

  if (!shape || !extrudeArgs) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]} receiveShadow {...handlers}>
      <extrudeGeometry args={extrudeArgs} />
      <meshStandardMaterial 
        color={isHighlighted ? "#cbd5e1" : color} 
        roughness={0.9} 
        metalness={0.1}
        emissive={isHighlighted ? "#475569" : "#000000"}
        emissiveIntensity={isHighlighted ? 0.2 : 0} 
      />
    </mesh>
  );
});

const TerrainGround = memo(({ data }: { data: CityData }) => {
  const boundingBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let hasPoints = false;
    const processWay = (way: ParsedWay) => {
      for (const p of way.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        hasPoints = true;
      }
    };
    
    data.buildings.forEach(processWay);
    data.roads.forEach(processWay);
    data.parks.forEach(processWay);
    data.water.forEach(processWay);
    data.landuse.forEach(processWay);
    data.amenities.forEach(processWay);

    if (!hasPoints) return null;
    return { minX, maxX, minY, maxY };
  }, [data]);

  if (boundingBox) {
    const width = boundingBox.maxX - boundingBox.minX + 150; // Buffer padding
    const height = boundingBox.maxY - boundingBox.minY + 150;
    const cx = (boundingBox.minX + boundingBox.maxX) / 2;
    const cy = (boundingBox.minY + boundingBox.maxY) / 2;
    
    const shape = new THREE.Shape();
    const w = width / 2;
    const h = height / 2;
    const r = 40; // Corner radius

    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);

    const extrudeArgs = {
      depth: 2.0,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 2,
      bevelThickness: 0.1,
    };

    return (
      <group>
        {/* The generated map ground layer */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -2.1, -cy]} receiveShadow>
          <extrudeGeometry args={[shape, extrudeArgs]} />
          <meshStandardMaterial 
            color="#141a18" // Very dark subtle earth tone
            roughness={0.9} 
            metalness={0.1} 
          />
        </mesh>
        
        {/* Infinite fallback void / grid */}
        <group position={[0, -2.1, 0]}>
          <gridHelper args={[8000, 800, "#1e293b", "#0f172a"]} position={[0, 0.01, 0]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[8000, 8000]} />
            <meshBasicMaterial color="#050505" />
          </mesh>
        </group>
      </group>
    );
  }

  // Pure fallback if no data
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[4000, 4000, 1, 1]} />
        <meshStandardMaterial 
          color="#151b18" 
          roughness={1.0} 
          metalness={0.05} 
        />
      </mesh>
      <gridHelper args={[4000, 400, "#1e293b", "#0f172a"]} position={[0, -0.04, 0]} />
    </group>
  );
});

export function CityScene({ data }: CitySceneProps) {
  if (!data) return null;

  return (
    <group>
      <TerrainGround data={data} />

      {data.landuse.map(way => <LandArea key={way.id} way={way} />)}
      {data.amenities.map(way => <LandArea key={way.id} way={way} />)}
      {data.parks.map(way => <Park key={way.id} way={way} />)}
      {data.water.map(way => <Water key={way.id} way={way} />)}
      {data.buildings.map(way => <Building key={way.id} way={way} />)}
      {data.roads.map(way => <Road key={way.id} way={way} />)}
      <Trees parks={data.parks.filter(p => !['beach', 'sand', 'bare_rock', 'cliff'].includes(p.tags.natural || ''))} />
      <StreetLights roads={data.roads} />
    </group>
  );
}
