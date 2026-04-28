import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
import { timeState } from '../lib/time';

export function EnvironmentCycle() {
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const skyRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (timeState.autoCycle) {
      // 1 cycle every 45 seconds
      timeState.timeOfDay = (timeState.timeOfDay + delta * 0.022) % 1; 
    }
    
    // theta goes from -PI/2 (midnight) to 3PI/2 (next midnight)
    const theta = (timeState.timeOfDay * 2 * Math.PI) - Math.PI / 2;
    
    // Sun position
    const sunY = Math.sin(theta);
    const sunX = Math.cos(theta);
    const sunZ = Math.cos(theta) * 0.3; // slight tilt
    
    const d = new THREE.Vector3(sunX, sunY, sunZ).normalize();
    
    // Map sunY (-1 to 1) to daylight ratio (0 to 1)
    const daylightRatio = Math.max(0, Math.min(1, sunY * 3)); 
    timeState.daylightRatio = daylightRatio;
    
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(d).multiplyScalar(1000);
      sunLightRef.current.intensity = daylightRatio * 2.5 + 0.1; // Make it significantly lighter
    }
    
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.3 + (daylightRatio * 0.9); // Brighter ambient
      
      // Shift from deep night blue to daylight white
      ambientLightRef.current.color.setHSL(
        0.6, 
        0.5 * (1 - daylightRatio), 
        0.2 + daylightRatio * 0.8 // Lighter base
      );
    }
    
    if (skyRef.current) {
      const material = skyRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.sunPosition) {
        material.uniforms.sunPosition.value.copy(d).multiplyScalar(1000);
      }
    }
    
    if (state.scene.fog && state.scene.fog instanceof THREE.Fog) {
      const nightColor = new THREE.Color("#0f172a");
      const dayColor = new THREE.Color("#f0f9ff");
      state.scene.fog.color.lerpColors(nightColor, dayColor, daylightRatio);
      state.scene.background = state.scene.fog.color;
    }
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.3} color="#64748b" />
      <directionalLight
        ref={sunLightRef}
        castShadow
        intensity={0}
        color="#fffbeb"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={2000}
        shadow-camera-left={-800}
        shadow-camera-right={800}
        shadow-camera-top={800}
        shadow-camera-bottom={-800}
        shadow-bias={-0.0005}
      />
      
      {/* Secondary fill light for night visibility, made lighter */}
      <directionalLight position={[-500, 400, -200]} intensity={0.15} color="#e0f2fe" />
      
      <Sky 
        ref={skyRef}
        sunPosition={[0, -100, 0]} 
        turbidity={0.2}
        rayleigh={0.25}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
    </>
  );
}
