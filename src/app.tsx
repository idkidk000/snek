import { useEffect, useRef } from 'react';
import { useGame } from '@/hooks/game';
import { ObjectType, Turn } from '@/lib/game';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameRef } = useGame();
  const intervalRef = useRef<number | null>(null);
  const turnRef = useRef<Turn>(Turn.None);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const nextTickRef = useRef(0);
  const debugElemRef = useRef<HTMLDivElement>(null);
  const scoreElemRef = useRef<HTMLDivElement>(null);
  const lengthElemRef = useRef<HTMLDivElement>(null);
  const speedElemRef = useRef<HTMLDivElement>(null);
  const pausedElemRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies(gameRef.current.move): ref object
  useEffect(() => {
    const controller = new AbortController();
    if (!canvasRef.current) throw new Error('oh no');
    canvasRef.current.width = gameRef.current.width;
    canvasRef.current.height = gameRef.current.height;
    const context = canvasRef.current.getContext('2d');
    if (!context) throw new Error('oh no');

    // key listener
    document.addEventListener(
      'keydown',
      (event) => {
        console.debug(event.key);
        if (event.key === 'a' || event.key === 'ArrowLeft') turnRef.current = Turn.Left;
        else if (event.key === 'd' || event.key === 'ArrowRight') turnRef.current = Turn.Right;
        else if (event.key === 'f') gameRef.current.addFood();
        else if (event.key === 'u') console.info(gameRef.current.dump());
        else if (event.key === '+') speedRef.current = Math.max(1, speedRef.current + 1);
        else if (event.key === '-') speedRef.current = Math.min(10, speedRef.current - 1);
        else if (event.key === 'p' || event.key === 'Enter') pausedRef.current = !pausedRef.current;
      },
      { signal: controller.signal }
    );

    // render
    function render(time: number) {
      if (!controller.signal.aborted) requestAnimationFrame(render);
      if (!context) return;
      if (pausedRef.current) {
        if (pausedElemRef.current && pausedElemRef.current?.innerText !== 'Paused') pausedElemRef.current.innerText = 'Paused';
        return;
      }
      const stepTime = 50 * (10 - speedRef.current + 1);
      if (time < nextTickRef.current) return;
      nextTickRef.current = nextTickRef.current > time - stepTime * 1.5 ? nextTickRef.current + stepTime : time + stepTime;
      try {
        gameRef.current.move(turnRef.current, speedRef.current);
      } catch (err) {
        console.error(err);
        gameRef.current.reset();
      }
      turnRef.current = Turn.None;
      context.fillStyle = '#000';
      context.fillRect(0, 0, gameRef.current.width, gameRef.current.height);
      for (const [{ x, y }, type] of gameRef.current.values()) {
        context.fillStyle = type === ObjectType.Food ? '#0f0' : type === ObjectType.Player ? '#f00' : '#00f';
        context.fillRect(x, y, 1, 1);
      }
      if (debugElemRef.current) debugElemRef.current.innerText = JSON.stringify(gameRef.current.dump());
      if (scoreElemRef.current) scoreElemRef.current.innerText = gameRef.current.score.toLocaleString();
      if (lengthElemRef.current) lengthElemRef.current.innerText = gameRef.current.length.toLocaleString();
      if (speedElemRef.current) speedElemRef.current.innerText = speedRef.current.toLocaleString();
      if (pausedElemRef.current) pausedElemRef.current.innerText = pausedRef.current ? 'Paused' : '';
    }
    requestAnimationFrame(render);

    // teardown
    controller.signal.addEventListener('abort', () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    });
    return () => controller.abort();
  }, []);

  return (
    <div className='grid grid-cols-[1fr_auto_1fr] gap-4 p-4 size-full text-center'>
      <div ref={debugElemRef} className='whitespace-pre-wrap my-auto'></div>
      <canvas className='aspect-square overflow-hidden pixel size-full border-4 border-white' ref={canvasRef} />
      <div className='grid grid-cols-[auto_auto] gap-4 my-auto'>
        <div className='col-span-2 animate-pulse text-lg font-bold' ref={pausedElemRef}></div>
        <div className='contents'>
          <h3 className='font-semibold'>Score</h3>
          <div ref={scoreElemRef}></div>
        </div>
        <div className='contents'>
          <h3 className='font-semibold'>Length</h3>
          <div ref={lengthElemRef}></div>
        </div>
        <div className='contents'>
          <h3 className='font-semibold'>Speed</h3>
          <div ref={speedElemRef}></div>
        </div>
      </div>
    </div>
  );
}
