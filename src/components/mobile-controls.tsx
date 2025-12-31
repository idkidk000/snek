import { useEffect, useRef } from 'react';
import { useGame } from '@/hooks/game';
import { Turn } from '@/lib/game';

export function MobileControls({ className }: { className: string }) {
  const gameRef = useGame();
  const leftRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const speedDownRef = useRef<HTMLButtonElement>(null);
  const speedUpRef = useRef<HTMLButtonElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);

  // biome-ignore format: no
  useEffect(() => {
    if (!leftRef.current) return
    const controller = new AbortController();
    leftRef.current?.addEventListener('click', () => {
      console.debug('leftRef click')
      gameRef.current.turn = Turn.Left;
    }, { signal: controller.signal });
    rightRef.current?.addEventListener('click', () => {
      console.debug('rightRef click')
      gameRef.current.turn = Turn.Right;
    }, { signal: controller.signal });
    speedDownRef.current?.addEventListener('click', () => {
      console.debug('speedDownRef click')
      --gameRef.current.speed;
    }, { signal: controller.signal });
    speedUpRef.current?.addEventListener('click', () => {
      console.debug('speedUpRef click')
      ++gameRef.current.speed;
    }, { signal: controller.signal });
    pauseRef.current?.addEventListener('click', () => {
      console.debug('pauseRef click')
      if (gameRef.current.dead) gameRef.current.reset()
      else gameRef.current.paused = !gameRef.current.paused;
    }, { signal: controller.signal });
    return ()=>controller.abort();
  }, []);

  return (
    <div className={`grid lg:hidden grid-cols-2 gap-4 p-4 pt-0 ${className}`}>
      <button type='button' ref={leftRef}>
        Left
      </button>
      <button type='button' ref={rightRef}>
        Right
      </button>
      <button type='button' ref={speedDownRef}>
        - Speed
      </button>
      <button type='button' ref={speedUpRef}>
        + Speed
      </button>
      <button type='button' ref={pauseRef} className='col-span-2'>
        Pause
      </button>
    </div>
  );
}
