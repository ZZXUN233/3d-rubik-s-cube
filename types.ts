import { Vector3 } from 'three';

export type MoveType = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';

export interface CubeMove {
  axis: 'x' | 'y' | 'z';
  slice: number; // -1, 0, 1
  direction: 1 | -1; // 1 = counter-clockwise relative to axis, -1 = clockwise
  speed?: number; // animation speed multiplier
}

export interface CubieData {
  id: number;
  position: [number, number, number];
}

export type GameState = 'idle' | 'playing' | 'scrambling' | 'solved';