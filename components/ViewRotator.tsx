import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ViewRotatorProps {
  controlsRef: React.RefObject<any>;
}

const ViewRotator: React.FC<ViewRotatorProps> = ({ controlsRef }) => {
  const { camera } = useThree();
  const isAnimating = useRef(false);
  const targetRotation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const currentRotation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // Function to rotate view around world axis
  const rotateView = (axis: 'x' | 'y' | 'z', angle: number) => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;
    const rotationAxis = new THREE.Vector3();
    
    switch (axis) {
      case 'x': rotationAxis.set(1, 0, 0); break;
      case 'y': rotationAxis.set(0, 1, 0); break;
      case 'z': rotationAxis.set(0, 0, 1); break;
    }

    // Store current rotation
    currentRotation.current = {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z
    };

    // Calculate target rotation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(rotationAxis, angle);
    
    // Apply rotation to camera
    camera.quaternion.multiplyQuaternions(quaternion, camera.quaternion);
    camera.updateMatrixWorld(true);

    // Update controls target if they exist
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    isAnimating.current = false;
  };

  // Function to reset view to standard perspective (blue, yellow, red)
  const resetView = () => {
    if (controlsRef.current) {
      // Reset camera to standard position
      camera.position.set(5, 4, 5);
      camera.lookAt(0, 0, 0);
      controlsRef.current.reset();
      controlsRef.current.update();
    }
  };

  // Expose functions to parent
  useEffect(() => {
    // @ts-ignore
    window.rotateView = rotateView;
    // @ts-ignore
    window.resetView = resetView;
    
    return () => {
      // @ts-ignore
      delete window.rotateView;
      // @ts-ignore
      delete window.resetView;
    };
  }, [camera, controlsRef]);

  return null;
};

export default ViewRotator;