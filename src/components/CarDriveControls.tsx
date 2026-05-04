import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function CarDriveControls() {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const carPosition = useRef(new THREE.Vector3(0, 0.5, 0));
  const carRotation = useRef(0);
  const carSpeed = useRef(0);
  
  const carMeshRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keys.current[e.key.toLowerCase()] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = false; 
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const k = keys.current;

    // Acceleration & Braking
    const maxSpeed = 40.0;
    const acceleration = 20.0;
    const deceleration = 15.0; // engine braking
    const friction = 5.0;
    const brakeForce = 40.0;

    let isAccelerating = false;
    
    if (k['w'] || k['arrowup']) {
      carSpeed.current += acceleration * dt;
      isAccelerating = true;
    }
    if (k['s'] || k['arrowdown']) {
       if (carSpeed.current > 0) {
         carSpeed.current -= brakeForce * dt; // brake
       } else {
         carSpeed.current -= acceleration * dt; // reverse
       }
       isAccelerating = true;
    }

    if (!isAccelerating) {
      if (carSpeed.current > 0) {
        carSpeed.current -= deceleration * dt;
        if (carSpeed.current < 0) carSpeed.current = 0;
      } else if (carSpeed.current < 0) {
        carSpeed.current += deceleration * dt;
        if (carSpeed.current > 0) carSpeed.current = 0;
      }
    }

    // Clamp speed
    if (carSpeed.current > maxSpeed) carSpeed.current = maxSpeed;
    if (carSpeed.current < -maxSpeed / 2) carSpeed.current = -maxSpeed / 2;

    // Steering
    const steeringFactor = Math.min(Math.abs(carSpeed.current) / maxSpeed, 1.0); 
    // allow steering even at low speeds but less sharply
    const effectiveSteeringFactor = Math.max(0.2, steeringFactor);
    const turnSpeed = 2.0 * dt * effectiveSteeringFactor;

    if (Math.abs(carSpeed.current) > 0.1) {
       const turnDirection = carSpeed.current > 0 ? 1 : -1; // Reverse steering when reversing
       if (k['a'] || k['arrowleft']) carRotation.current += turnSpeed * turnDirection;
       if (k['d'] || k['arrowright']) carRotation.current -= turnSpeed * turnDirection;
    }

    // Update position
    const dx = Math.sin(carRotation.current) * carSpeed.current * dt;
    const dz = Math.cos(carRotation.current) * carSpeed.current * dt;

    carPosition.current.x += dx;
    carPosition.current.z += dz;
    
    // Update car mesh
    if (carMeshRef.current) {
      carMeshRef.current.position.copy(carPosition.current);
      carMeshRef.current.rotation.y = carRotation.current;
    }

    // Update camera to follow car behind and slightly above
    const cameraOffset = new THREE.Vector3(0, 10, -20);
    // Apply car rotation to camera offset
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carRotation.current);
    
    const targetCameraPos = carPosition.current.clone().add(cameraOffset);
    camera.position.lerp(targetCameraPos, dt * 5); // Smooth followup
    
    // Look ahead of the car somewhat
    const lookAtPos = carPosition.current.clone().add(
       new THREE.Vector3(Math.sin(carRotation.current) * 10, 0, Math.cos(carRotation.current) * 10)
    );
    // Also smoothly look at
    
    // Simple lookAt
    camera.lookAt(lookAtPos);
  });

  return (
    <group ref={carMeshRef}>
      {/* Simple car model */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.25, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.8, 2]} />
        <meshStandardMaterial color="#1f2937" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Headlights */}
      <mesh position={[0.7, 0.5, 2.01]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.7, 0.5, 2.01]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Tail lights */}
      <mesh position={[0.7, 0.5, -2.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[-0.7, 0.5, -2.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <pointLight position={[0, 1.5, 2.5]} intensity={2} distance={30} color="#ffffff" />
      <pointLight position={[0, 1.5, -2.5]} intensity={0.5} distance={10} color="#ef4444" />
    </group>
  );
}
