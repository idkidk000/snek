import { useCallback } from 'react';
import { useGame } from '@/hooks/game';
import { Turn } from '@/lib/game';

export function MobileControls({ className }: { className: string }) {
  const gameRef = useGame();

  // biome-ignore format: no
  const handleLeftClick = useCallback(() => { gameRef.current.turn = Turn.Left; }, []);
  // biome-ignore format: no
  const handleRightClick = useCallback(() => { gameRef.current.turn = Turn.Right; }, []);
  // biome-ignore format: no
  const handleSpeedDownClick = useCallback(() => { --gameRef.current.speed; }, []);
  // biome-ignore format: no
  const handleSpeedUpClick = useCallback(() => { ++gameRef.current.speed; }, []);
  const handlePauseClick = useCallback(() => {
    if (gameRef.current.dead) gameRef.current.reset();
    else gameRef.current.paused = !gameRef.current.paused;
  }, []);

  return (
    <div className={`grid lg:hidden grid-cols-2 gap-4 p-4 pt-0 ${className}`}>
      <button type='button' onClick={handleLeftClick}>
        Left
      </button>
      <button type='button' onClick={handleRightClick}>
        Right
      </button>
      <button type='button' onClick={handleSpeedDownClick}>
        - Speed
      </button>
      <button type='button' onClick={handleSpeedUpClick}>
        + Speed
      </button>
      <button type='button' onClick={handlePauseClick} className='col-span-2'>
        Pause
      </button>
    </div>
  );
}
