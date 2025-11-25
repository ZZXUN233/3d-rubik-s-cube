import { Vector3 } from 'three';

export type MoveType =
  | 'R' | 'L' | 'U' | 'D' | 'F' | 'B'  // 单层转动
  | 'r' | 'l' | 'u' | 'd' | 'f' | 'b'  // 两层转动
  | 'E' | 'M' | 'S'                     // 中层转动
  | 'x' | 'y' | 'z'                     // 整体转动
  | 'R2' | 'L2' | 'U2' | 'D2' | 'F2' | 'B2'  // 180度转动
  | 'r2' | 'l2' | 'u2' | 'd2' | 'f2' | 'b2'  // 两层180度转动
  | 'E2' | 'M2' | 'S2'                       // 中层180度转动
  | 'x2' | 'y2' | 'z2';                      // 整体180度转动

export interface CubeMove {
  axis: 'x' | 'y' | 'z';
  slice: number; // -2, -1, 0, 1, 2 (0=整体, ±1=单层, ±2=两层)
  direction: 1 | -1; // 1 = 逆时针, -1 = 顺时针
  speed?: number; // 动画速度倍数
  degrees: number; // 转动角度 (90度或180度)
  isMiddleLayer?: boolean; // 是否是中层转动
  isWholeCube?: boolean;   // 是否是整体转动
}

export interface CubieData {
  id: number;
  position: [number, number, number];
}

export type GameState = 'idle' | 'playing' | 'scrambling' | 'solved';