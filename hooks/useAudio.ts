import { useRef, useCallback } from 'react';

export const useAudio = (audioPath: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.volume = 1; // 设置音量
    }
    
    // 重置音频到开始位置并播放
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(error => {
      console.warn('Audio playback failed:', error);
    });
  }, [audioPath]);

  return play;
};