import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import RubiksCube, { RubiksCubeRef } from './components/RubiksCube';
import { GameState } from './types';

const App = () => {
  const cubeRef = useRef<RubiksCubeRef>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [moveCount, setMoveCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [cubeKey, setCubeKey] = useState(0); // State for re-mounting the cube

  // Timer Logic
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'scrambling') {
      timerRef.current = window.setInterval(() => {
        if (gameState === 'playing') {
          setTimeElapsed((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'scrambling') return;

      const key = e.key.toUpperCase();
      const validKeys = ['R', 'L', 'U', 'D', 'F', 'B'];
      
      if (validKeys.includes(key)) {
        if (gameState === 'idle') {
          setGameState('playing');
        }
        
        const isPrime = e.shiftKey;
        // Trigger visual move
        cubeRef.current?.performMove(key, isPrime);
        // Update stats
        if (gameState === 'playing' || gameState === 'idle') {
            setMoveCount(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const handleScramble = () => {
    setGameState('scrambling');
    setMoveCount(0);
    setTimeElapsed(0);
    
    // Wait a bit then start scramble
    setTimeout(() => {
        cubeRef.current?.scramble();
        
        // We estimate scramble time or wait for a callback
        // Since our scramble is instant in queue but takes time to animate (~20 moves * 0.05s approx if fast)
        // Let's just set playing after a timeout for simplicity, or rely on user input to start 'playing' state
        // But a better UX is to wait for the queue to empty.
        // For now, let's set it to idle after a safe duration, allowing user to start playing.
        setTimeout(() => {
            setGameState('playing');
        }, 2000); 
    }, 100);
  };

  const handleReset = () => {
    setGameState('idle');
    setMoveCount(0);
    setTimeElapsed(0);
    // By changing the key, we force React to unmount the old cube and mount a new one,
    // effectively resetting its state completely. This is cleaner than a page reload.
    setCubeKey(prevKey => prevKey + 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 font-sans overflow-hidden select-none">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [5, 4, 5], fov: 50 }}>
          <color attach="background" args={['#111827']} />
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <RubiksCube 
            key={cubeKey}
            ref={cubeRef} 
            onMoveComplete={() => {
               // Could check for win condition here if we tracked logic state strictly
            }}
          />
          
          <OrbitControls 
            enablePan={false} 
            minDistance={3} 
            maxDistance={15} 
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start z-10">
        <div className="bg-black/30 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            React Cube
          </h1>
          <p className="text-xs text-gray-400 mt-1">Press keys to rotate faces</p>
        </div>

        <div className="flex gap-4">
           <div className="bg-black/30 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Time</span>
              <span className="text-2xl font-mono font-bold text-yellow-400">{formatTime(timeElapsed)}</span>
           </div>
           <div className="bg-black/30 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-xl flex flex-col items-center min-w-[100px]">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Moves</span>
              <span className="text-2xl font-mono font-bold text-blue-400">{moveCount}</span>
           </div>
        </div>
      </div>

      {/* Controls / Help */}
      <div className="absolute bottom-8 left-8 z-10 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md p-5 rounded-xl border border-white/10 text-white max-w-xs">
           <h3 className="font-bold mb-2 border-b border-white/10 pb-1">Controls</h3>
           <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-300">
             <span><kbd className="bg-white/10 px-1 rounded">R</kbd> Right Face</span>
             <span><kbd className="bg-white/10 px-1 rounded">L</kbd> Left Face</span>
             <span><kbd className="bg-white/10 px-1 rounded">U</kbd> Up Face</span>
             <span><kbd className="bg-white/10 px-1 rounded">D</kbd> Down Face</span>
             <span><kbd className="bg-white/10 px-1 rounded">F</kbd> Front Face</span>
             <span><kbd className="bg-white/10 px-1 rounded">B</kbd> Back Face</span>
             <span className="col-span-2 text-xs mt-2 text-gray-500">Hold <kbd className="bg-white/10 px-1 rounded">Shift</kbd> to reverse rotation (e.g. R')</span>
           </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-8 right-8 z-10 flex gap-3 pointer-events-auto">
        <button 
          onClick={handleScramble}
          disabled={gameState === 'scrambling'}
          className={`px-6 py-3 rounded-lg font-bold transition-all shadow-lg
            ${gameState === 'scrambling' 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95'}`}
        >
          {gameState === 'scrambling' ? 'Scrambling...' : 'Scramble'}
        </button>
        
        <button 
          onClick={handleReset}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default App;