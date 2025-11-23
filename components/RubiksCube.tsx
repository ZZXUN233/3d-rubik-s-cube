import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import { CubeMove } from '../types';

// Standard Rubik's Cube color scheme:
// White opposite Yellow, Green opposite Blue, Red opposite Orange.
// With White Up and Green Front:
// U: White, D: Yellow, F: Green, B: Blue, R: Red, L: Orange
// Note: In Three.js default coordinate system with camera looking at -Z:
// +X: Right, -X: Left, +Y: Up, -Y: Down, +Z: Back (away from camera), -Z: Front (toward camera)
const COLORS = {
  base: '#1F2937', // Dark Gray/Black Plastic (Tailwind gray-800)
  U: '#FFFFFF',    // Up - Pure White
  D: '#FFD700',    // Down - Bright Yellow
  R: '#FF0000',    // Right - Bright Red
  L: '#FFA500',    // Left - Bright Orange
  F: '#00FF00',    // Front - Bright Green
  B: '#0000FF',    // Back - Bright Blue
};

interface RubiksCubeProps {
  onMoveComplete?: () => void;
}

export interface RubiksCubeRef {
  performMove: (moveName: string, isReverse: boolean, speed?: number) => void;
  scramble: () => void;
  reset: () => void;
  isAnimating: boolean;
}

// Helper to determine initial face colors based on position
const getFaceColors = (x: number, y: number, z: number) => {
  return {
    // Three.js BoxGeometry material order (standard):
    // 0: Right (+x), 1: Left (-x), 2: Up (+y), 3: Down (-y), 4: Front (+z), 5: Back (-z)
    // But in Three.js with camera looking at -Z, +Z is away from camera (back), -Z is toward camera (front)
    // So we need to swap front and back materials
    right: x === 1 ? COLORS.R : COLORS.base,
    left: x === -1 ? COLORS.L : COLORS.base,
    up: y === 1 ? COLORS.U : COLORS.base,
    down: y === -1 ? COLORS.D : COLORS.base,
    front: z === -1 ? COLORS.F : COLORS.base,   // -Z is front (toward camera)
    back: z === 1 ? COLORS.B : COLORS.base,     // +Z is back (away from camera)
  };
};

// Constants for animation
const PI_2 = Math.PI / 2;
const DEFAULT_SPEED = 0.15; // Radians per frame approx

const RubiksCube = forwardRef<RubiksCubeRef, RubiksCubeProps>(({ onMoveComplete }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  
  // We need a persistent reference to the 27 meshes to manipulate them
  // We initialize them in a 3x3x3 grid
  const cubiesRef = useRef<THREE.Mesh[]>([]);
  const pivotRef = useRef<THREE.Object3D>(new THREE.Object3D());
  
  // State for queueing moves
  const moveQueue = useRef<CubeMove[]>([]);
  const isAnimating = useRef(false);
  const currentMove = useRef<{
    move: CubeMove;
    progress: number;
    activeCubies: THREE.Mesh[];
    targetRotation: number;
  } | null>(null);

  // Initialize the pivot once
  useEffect(() => {
    if (pivotRef.current) {
      pivotRef.current.rotation.set(0, 0, 0);
      scene.add(pivotRef.current);
    }
    return () => {
      if (pivotRef.current) scene.remove(pivotRef.current);
    };
  }, [scene]);

  // Define geometry and positions
  const initialCubies = useMemo(() => {
    const cubes = [];
    let id = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          cubes.push({ id: id++, pos: [x, y, z] as [number, number, number] });
        }
      }
    }
    return cubes;
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    isAnimating: isAnimating.current,
    
    performMove: (moveName: string, isReverse: boolean, speed = DEFAULT_SPEED) => {
      const move = parseMove(moveName, isReverse, speed);
      if (move) {
        moveQueue.current.push(move);
      }
    },

    scramble: () => {
      const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
      const sequence: CubeMove[] = [];
      for (let i = 0; i < 20; i++) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const randomDir = Math.random() > 0.5;
        const move = parseMove(randomMove, randomDir, 0.6); // Faster speed for scramble
        if (move) sequence.push(move);
      }
      moveQueue.current.push(...sequence);
    },

    reset: () => {
      moveQueue.current = [];
      currentMove.current = null;
      isAnimating.current = false;
      
      if (pivotRef.current) {
        pivotRef.current.rotation.set(0,0,0);
        while(pivotRef.current.children.length > 0) {
            scene.attach(pivotRef.current.children[0]);
        }
      }

       cubiesRef.current.forEach(mesh => {
          mesh.position.set(Math.round(mesh.position.x), Math.round(mesh.position.y), Math.round(mesh.position.z));
          mesh.rotation.set(
            Math.round(mesh.rotation.x / PI_2) * PI_2, 
            Math.round(mesh.rotation.y / PI_2) * PI_2, 
            Math.round(mesh.rotation.z / PI_2) * PI_2
          );
          mesh.updateMatrix();
       });
    }
  }));

  const parseMove = (char: string, isReverse: boolean, speed: number): CubeMove | null => {
    const direction = isReverse ? 1 : -1; 
    let axis: 'x'|'y'|'z' = 'x';
    let slice = 0;
    let dirMult = 1; 

    switch (char.toUpperCase()) {
      case 'R': axis = 'x'; slice = 1; dirMult = -1; break;
      case 'L': axis = 'x'; slice = -1; dirMult = 1; break;
      case 'U': axis = 'y'; slice = 1; dirMult = -1; break;
      case 'D': axis = 'y'; slice = -1; dirMult = 1; break;
      case 'F': axis = 'z'; slice = 1; dirMult = -1; break;
      case 'B': axis = 'z'; slice = -1; dirMult = 1; break;
      default: return null;
    }

    return {
      axis,
      slice,
      direction: (dirMult * (isReverse ? -1 : 1)) as 1 | -1,
      speed
    };
  };

  // Animation Loop
  useFrame((state, delta) => {
    if (!currentMove.current && moveQueue.current.length > 0) {
      const move = moveQueue.current.shift()!;
      isAnimating.current = true;
      
      const activeCubies: THREE.Mesh[] = [];
      
      cubiesRef.current.forEach(mesh => {
        const pos = mesh.position;
        let matches = false;
        if (move.axis === 'x' && Math.abs(pos.x - move.slice) < 0.1) matches = true;
        if (move.axis === 'y' && Math.abs(pos.y - move.slice) < 0.1) matches = true;
        if (move.axis === 'z' && Math.abs(pos.z - move.slice) < 0.1) matches = true;
        
        if (matches) {
          activeCubies.push(mesh);
        }
      });

      const pivot = pivotRef.current;
      pivot.rotation.set(0, 0, 0);
      pivot.position.set(0, 0, 0);
      
      activeCubies.forEach(mesh => {
        pivot.attach(mesh);
      });

      currentMove.current = {
        move,
        progress: 0,
        activeCubies,
        targetRotation: (Math.PI / 2) * move.direction
      };
    }

    if (currentMove.current) {
      const { move, targetRotation } = currentMove.current;
      
      const rotateSpeed = 10 * (move.speed || 1); 
      let deltaRot = move.direction * rotateSpeed * delta;
      
      const currentRot = currentMove.current.progress;
      const remaining = targetRotation - currentRot;
      
      if (Math.abs(remaining) < Math.abs(deltaRot)) {
        deltaRot = remaining;
      }
      
      currentMove.current.progress += deltaRot;
      
      const pivot = pivotRef.current;
      if (move.axis === 'x') pivot.rotation.x += deltaRot;
      if (move.axis === 'y') pivot.rotation.y += deltaRot;
      if (move.axis === 'z') pivot.rotation.z += deltaRot;

      if (Math.abs(currentMove.current.progress) >= Math.abs(targetRotation) - 0.001) {
        if (move.axis === 'x') pivot.rotation.x = targetRotation;
        if (move.axis === 'y') pivot.rotation.y = targetRotation;
        if (move.axis === 'z') pivot.rotation.z = targetRotation;
        
        pivot.updateMatrixWorld();

        currentMove.current.activeCubies.forEach(mesh => {
          scene.attach(mesh);
          mesh.position.set(
            Math.round(mesh.position.x),
            Math.round(mesh.position.y),
            Math.round(mesh.position.z)
          );
          mesh.updateMatrix();
        });

        pivot.rotation.set(0,0,0);
        pivot.updateMatrixWorld();

        currentMove.current = null;
        
        if (moveQueue.current.length === 0) {
          isAnimating.current = false;
          if (onMoveComplete) onMoveComplete();
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      {initialCubies.map((data, index) => {
        const { right, left, up, down, front, back } = getFaceColors(data.pos[0], data.pos[1], data.pos[2]);
        return (
          <Box
            key={data.id}
            args={[0.95, 0.95, 0.95]}
            position={data.pos}
            ref={(el) => { if (el) cubiesRef.current[index] = el; }}
          >
            {/*
              Material Order for Three.js BoxGeometry:
              0: Right (+x)
              1: Left (-x)
              2: Up (+y)
              3: Down (-y)
              4: Front (+z)  // Standard Three.js order, but +Z is actually back
              5: Back (-z)   // Standard Three.js order, but -Z is actually front
              So we need to swap material-4 and material-5
            */}
            <meshStandardMaterial attach="material-0" color={right} roughness={0.5} metalness={0.1} />
            <meshStandardMaterial attach="material-1" color={left} roughness={0.5} metalness={0.1} />
            <meshStandardMaterial attach="material-2" color={up} roughness={0.5} metalness={0.1} />
            <meshStandardMaterial attach="material-3" color={down} roughness={0.5} metalness={0.1} />
            <meshStandardMaterial attach="material-4" color={back} roughness={0.5} metalness={0.1} />  {/* +Z is back */}
            <meshStandardMaterial attach="material-5" color={front} roughness={0.5} metalness={0.1} />  {/* -Z is front */}
          </Box>
        );
      })}
    </group>
  );
});

export default RubiksCube;