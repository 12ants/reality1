import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function CustomControls() {
  const { camera, gl } = useThree();
  
  const keys = useRef<{ [key: string]: boolean }>({});
  const activePointers = useRef<Map<number, {x: number, y: number}>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isInitialized = useRef(false);
  const targetState = useRef({
    pitch: 0,
    y: 0,
    transitioning: false
  });
  const viewMode = useRef('perspective');

  useEffect(() => {
    const handleModeChange = (e: any) => {
      const mode = e.detail.mode;
      viewMode.current = mode;
      if (mode === 'aerial') {
        targetState.current = {
          pitch: -Math.PI / 2 + 0.05,
          y: Math.max(camera.position.y, 800),
          transitioning: true
        };
      } else {
        targetState.current = {
          pitch: -Math.PI / 4,
          y: Math.min(camera.position.y, 300),
          transitioning: true
        };
      }
    };
    window.addEventListener('map-view-change', handleModeChange);
    return () => window.removeEventListener('map-view-change', handleModeChange);
  }, [camera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keys.current[e.key.toLowerCase()] = true; 
      keys.current[e.key] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
      keys.current[e.key.toLowerCase()] = false; 
      keys.current[e.key] = false; 
    };

    const handlePointerDown = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        gl.domElement.setPointerCapture(e.pointerId);
      } catch(err) {}
      if (activePointers.current.size === 2) {
        const pts = Array.from(activePointers.current.values());
        initialPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!activePointers.current.has(e.pointerId)) return;
      
      const lastPos = activePointers.current.get(e.pointerId)!;
      const deltaX = e.clientX - lastPos.x;
      const deltaY = e.clientY - lastPos.y;
      
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      
      if (activePointers.current.size === 1) {
        // Is it a right click? (buttons === 2)
        if (e.buttons === 2) {
           const panSpeed = 0.5;
           const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
           const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
           
           camera.position.addScaledVector(right, -deltaX * panSpeed);
           camera.position.addScaledVector(up, deltaY * panSpeed);
           targetState.current.transitioning = false;
        } else {
           const sensitivity = 0.005;
           euler.current.y -= deltaX * sensitivity;
           euler.current.x -= deltaY * sensitivity;
           euler.current.x = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, euler.current.x));
           targetState.current.transitioning = false;
        }
      } else if (activePointers.current.size === 2) {
         const pts = Array.from(activePointers.current.values());
         const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
         
         // Panning with 2 fingers
         const avgDeltaX = deltaX; // Using latest pointer's delta for simplicity
         const avgDeltaY = deltaY;
         const panSpeed = 0.25;
         const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
         const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
         camera.position.addScaledVector(right, -avgDeltaX * panSpeed);
         camera.position.addScaledVector(up, avgDeltaY * panSpeed);

         // Pinch zooming
         if (initialPinchDist.current !== null) {
            const pinchDelta = dist - initialPinchDist.current;
            const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const speed = pinchDelta * 1.5; 
            camera.position.addScaledVector(direction, speed);
         }
         initialPinchDist.current = dist;
         targetState.current.transitioning = false;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size < 2) {
        initialPinchDist.current = null;
      }
      try {
        gl.domElement.releasePointerCapture(e.pointerId);
      } catch(err) {}
    };

    const handleWheel = (e: WheelEvent) => {
       e.preventDefault();
       const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
       const speed = e.deltaY * -0.5; 
       camera.position.addScaledVector(direction, speed);
       targetState.current.transitioning = false;
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Attach event listeners explicitly to the canvas
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('pointerup', handlePointerUp);
    gl.domElement.addEventListener('pointercancel', handlePointerUp);
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
    gl.domElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('pointerup', handlePointerUp);
      gl.domElement.removeEventListener('pointercancel', handlePointerUp);
      gl.domElement.removeEventListener('wheel', handleWheel);
      gl.domElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl.domElement, camera]);

  useEffect(() => {
    if (!isInitialized.current) {
      camera.lookAt(0, 0, 0);
      euler.current.setFromQuaternion(camera.quaternion);
      isInitialized.current = true;
    }
  }, [camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    
    if (targetState.current.transitioning) {
      euler.current.x = THREE.MathUtils.lerp(euler.current.x, targetState.current.pitch, dt * 5);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetState.current.y, dt * 5);
      
      if (
        Math.abs(euler.current.x - targetState.current.pitch) < 0.01 &&
        Math.abs(camera.position.y - targetState.current.y) < 2
      ) {
        targetState.current.transitioning = false;
      }
    } else if (viewMode.current === 'aerial' && euler.current.x > -Math.PI / 4) {
      viewMode.current = 'perspective';
      window.dispatchEvent(new CustomEvent('map-view-sync', { detail: { mode: 'perspective' } }));
    }
    
    const speedMultiplier = keys.current['shift'] ? 4 : 1;
    const speed = 400 * dt * speedMultiplier; 
    const turnSpeed = 2.0 * dt;

    const k = keys.current;

    // Look around
    if (k['arrowleft']) euler.current.y += turnSpeed;
    if (k['arrowright']) euler.current.y -= turnSpeed;
    if (k['arrowup']) {
      euler.current.x += turnSpeed;
      targetState.current.transitioning = false;
    }
    if (k['arrowdown']) {
      euler.current.x -= turnSpeed;
      targetState.current.transitioning = false;
    }

    // Clamp pitch
    euler.current.x = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, euler.current.x));
    camera.quaternion.setFromEuler(euler.current);

    // Movement
    if (k['w'] || k['s'] || k['a'] || k['d'] || k['e'] || k['q']) {
      targetState.current.transitioning = false;
    }

    const direction = new THREE.Vector3();
    if (k['w']) direction.z -= 1;
    if (k['s']) direction.z += 1;
    if (k['a']) direction.x -= 1;
    if (k['d']) direction.x += 1;
    
    if (direction.lengthSq() > 0) direction.normalize();
    
    // Apply camera rotation to direction
    direction.applyQuaternion(camera.quaternion);
    
    if (k['e']) camera.position.y += speed;
    if (k['q']) camera.position.y -= speed;

    camera.position.addScaledVector(direction, speed);
  });

  return null;
}
