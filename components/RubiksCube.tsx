// Fixed Rubik's Cube component (full file)
// Original uploaded file: /mnt/data/014cbeff-90c7-4ce9-b42a-00f9c19078a8.tsx

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
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
  D: '#FFD700',    // Up - Bright Yellow (国际规则：上黄)
  U: '#FFFFFF',    // Down - Pure White
  R: '#FF0000',    // Right - Bright Red (国际规则：右红)
  B: '#0000FF',    // Left - Bright Blue (国际规则：左蓝)
  F: '#00FF00',    // Front - Bright Green
  L: '#FFA500',    // Back - Bright Orange
};

interface RubiksCubeProps {
  onMoveComplete?: () => void;
  onMoveStart?: () => void;
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

const RubiksCube = forwardRef<RubiksCubeRef, RubiksCubeProps>(({ onMoveComplete, onMoveStart }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  
  // We need a persistent reference to the 27 meshes to manipulate them
  // We initialize them in a 3x3x3 grid
  const cubiesRef = useRef<THREE.Mesh[]>([]);
  const pivotRef = useRef<THREE.Object3D>(new THREE.Object3D());
  
  // State for queueing moves
  const moveQueue = useRef<any[]>([]);
  const isAnimating = useRef(false);
  const currentMove = useRef<{
    move: any;
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
      const sequence: any[] = [];
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

  const parseMove = (moveName: string, isReverse: boolean, speed: number) => {
    // 解析移动名称，支持完整魔方标记法
    const move = moveName.trim();
    const is180Degree = move.includes('2'); // 检查是否是180度转动
    const baseMove = is180Degree ? move.replace('2', '') : move;
    const baseChar = baseMove.toUpperCase();
    const isLowercase = baseMove === baseMove.toLowerCase(); // 检查是否是小写（两层或宽带转动）
    
    let axis: 'x'|'y'|'z' = 'x';
    let slices: number[] = [];
    let dirMult = 1;
    let degrees = is180Degree ? Math.PI : Math.PI / 2; // 180度或90度
    let isMiddleLayer = false; // 标记是否是中层转动
    let isWholeCube = false;   // 标记是否是整体转动

    // 处理单层转动和两层转动（小写表示两层/宽带转动）
    if (['R', 'L', 'U', 'D', 'F', 'B'].includes(baseChar)) {
      switch (baseChar) {
        case 'R':
          axis = 'x';
          // R = outer right layer (x=1). r (lowercase) means right two layers: x=1 and x=0
          slices = isLowercase ? [1, 0] : [1];
          dirMult = -1;
          break;
        case 'L':
          axis = 'x';
          // L = outer left (x=-1). l = left two layers: x=-1 and x=0
          slices = isLowercase ? [-1, 0] : [-1];
          dirMult = 1;
          break;
        case 'U':
          axis = 'y';
          slices = isLowercase ? [1, 0] : [1];
          dirMult = -1;
          break;
        case 'D':
          axis = 'y';
          slices = isLowercase ? [-1, 0] : [-1];
          dirMult = 1;
          break;
        case 'F':
          axis = 'z';
          // Front is -1 (toward camera). f lowercase includes front middle (z=-1 and z=0)
          slices = isLowercase ? [-1, 0] : [-1];
          dirMult = -1;
          break;
        case 'B':
          axis = 'z';
          // Back is +1. b lowercase includes back middle (z=1 and z=0)
          slices = isLowercase ? [1, 0] : [1];
          dirMult = 1;
          break;
      }
    } else {
      // 处理中层转动和整体转动
      switch (baseChar) {
        // 中层转动
        case 'E': axis = 'y'; slices = [0]; dirMult = 1; isMiddleLayer = true; break;  // 中层水平转动
        case 'M': axis = 'x'; slices = [0]; dirMult = -1; isMiddleLayer = true; break; // 中层垂直转动
        case 'S': axis = 'z'; slices = [0]; dirMult = -1; isMiddleLayer = true; break; // 中层前后转动
        
        // 整体转动
        case 'Z': axis = 'z'; slices = [0]; dirMult = -1; isWholeCube = true; break; // 整体Z轴转动
        case 'Y': axis = 'y'; slices = [0]; dirMult = -1; isWholeCube = true; break; // 整体Y轴转动
        case 'X': axis = 'x'; slices = [0]; dirMult = -1; isWholeCube = true; break; // 整体X轴转动
        
        default: return null;
      }
    }

    return {
      axis,
      slices,
      direction: (dirMult * (isReverse ? -1 : 1)) as 1 | -1,
      speed,
      degrees,
      isMiddleLayer,
      isWholeCube
    } as any;
  };

  // Animation Loop
  useFrame((state, delta) => {
    if (!currentMove.current && moveQueue.current.length > 0) {
      const move = moveQueue.current.shift()!;
      isAnimating.current = true;
      
      // Play sound when move starts
      if (onMoveStart) onMoveStart();
      
      const activeCubies: THREE.Mesh[] = [];
      
      // 选择要转动的方块
      cubiesRef.current.forEach(mesh => {
        const pos = mesh.position;
        let matches = false;
        
        // 整体转动
        if (move.isWholeCube) {
          matches = true;
        }
        // 中层转动
        else if (move.isMiddleLayer) {
          // 中层转动：选择中间层的方块
          if (move.axis === 'x' && Math.abs(pos.x) < 0.1) matches = true;  // M: 中层垂直
          if (move.axis === 'y' && Math.abs(pos.y) < 0.1) matches = true;  // E: 中层水平
          if (move.axis === 'z' && Math.abs(pos.z) < 0.1) matches = true;  // S: 中层前后
        }
        // 单层转动 (slices array contains one or more slice coordinates)
        else {
          if (move.axis === 'x' && Array.isArray(move.slices) && move.slices.some((s: number) => Math.abs(pos.x - s) < 0.1)) matches = true;
          if (move.axis === 'y' && Array.isArray(move.slices) && move.slices.some((s: number) => Math.abs(pos.y - s) < 0.1)) matches = true;
          if (move.axis === 'z' && Array.isArray(move.slices) && move.slices.some((s: number) => Math.abs(pos.z - s) < 0.1)) matches = true;
        }
        
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
        targetRotation: move.degrees * move.direction
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
            ref={(el) => { if (el) cubiesRef.current[index] = el as any; }}
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
