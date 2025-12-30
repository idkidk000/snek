import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/hooks/game';
import { ObjectType } from '@/lib/game';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useGame();
  const nextTickRef = useRef(0);
  const scoreElemRef = useRef<HTMLDivElement>(null);
  const lengthElemRef = useRef<HTMLDivElement>(null);
  const speedElemRef = useRef<HTMLDivElement>(null);
  const wrapElemRef = useRef<HTMLDivElement>(null);
  const [reload, setReload] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies(reload): deliberate
  useEffect(() => {
    const controller = new AbortController();
    if (!canvasRef.current) throw new Error('oh no');
    const context = canvasRef.current.getContext('2d');
    if (!context) throw new Error('oh no');

    function step(time: number) {
      if (!controller.signal.aborted) requestAnimationFrame(step);
      if (!canvasRef.current) return;
      if (!context) return;
      if (time < nextTickRef.current) return;
      nextTickRef.current = (nextTickRef.current > time - gameRef.current.stepTime * 1.5 ? nextTickRef.current : time) + gameRef.current.stepTime;

      if (!gameRef.current.paused && !gameRef.current.dead) gameRef.current.step();

      const rect = canvasRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      const scale = rect.width / gameRef.current.size;
      context.fillStyle = '#002';
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      context.shadowOffsetX = 0;
      context.shadowOffsetY = scale / 10;
      context.shadowBlur = scale / 4;
      let segment = 0;
      const hueStep = Math.min(10, 50 / gameRef.current.length);
      for (const [{ x, y }, type] of gameRef.current.values()) {
        if (type === ObjectType.Food) {
          context.shadowColor = 'hsl(30 100% 50% / 50%)';
          context.fillStyle = 'hsl(30 100% 50%)';
          // context.fillRect(x, y, 1, 1);
          context.arc(x * scale + scale / 2, y * scale + scale / 2, scale / 2, 0, Math.PI * 2, false);
          context.fill();
        }
        if (type === ObjectType.Player) {
          context.shadowColor = `hsl(${250 + hueStep * segment} 100% 50% / 50%)`;
          context.fillStyle = `hsl(${250 + hueStep * segment} 100% 50%)`;
          context.fillRect(x * scale, y * scale, scale, scale);
          ++segment;
        }
      }
      const gradient = context.createLinearGradient(0, 0, 0, canvasRef.current.height);
      gradient.addColorStop(0, 'hsl(270 100% 50% / 50%)');
      gradient.addColorStop(1, 'hsl(330 100% 50% / 50%)');
      context.strokeStyle = gradient;
      context.beginPath();
      for (let x = 1; x < gameRef.current.size; ++x) {
        context.moveTo(x * scale, 0);
        context.lineTo(x * scale, canvasRef.current.height);
      }
      for (let y = 1; y < gameRef.current.size; ++y) {
        context.moveTo(0, y * scale);
        context.lineTo(canvasRef.current.width, y * scale);
      }
      context.stroke();
      if (gameRef.current.dead || gameRef.current.paused) {
        context.fillStyle = '#fff';
        context.font = 'bold 20dvh system-ui';
        const text = gameRef.current.dead ? 'Dead' : 'Paused';
        const metrics = context.measureText(text);
        console.log(metrics);
        context.fillText(
          text,
          (canvasRef.current.width - metrics.width) / 2,
          (canvasRef.current.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2
        );
      }

      if (scoreElemRef.current) scoreElemRef.current.innerText = gameRef.current.score.toLocaleString();
      if (lengthElemRef.current) lengthElemRef.current.innerText = gameRef.current.length.toLocaleString();
      if (speedElemRef.current) speedElemRef.current.innerText = gameRef.current.speed.toLocaleString();
      if (wrapElemRef.current) wrapElemRef.current.innerText = gameRef.current.wrap ? 'Wrap' : 'Limit';
    }
    requestAnimationFrame(step);

    return () => controller.abort();
  }, [reload]);

  const handleClick = useCallback(() => setReload(Math.random()), []);

  return (
    <div className='grid grid-cols-[1fr_auto_1fr] gap-4 p-4 size-full text-center'>
      <div className='grid grid-cols-[auto_auto] gap-4 my-auto overflow-hidden'>
        <div className='contents'>
          <span>
            <kbd>a</kbd> / <kbd>left</kbd>
          </span>
          <span>Left</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>d</kbd> / <kbd>right</kbd>
          </span>
          <span>Right</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>f</kbd>
          </span>
          <span>Add food</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>u</kbd>
          </span>
          <span>Dump to console</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>+</kbd> / <kbd>-</kbd>
          </span>
          <span>Game speed</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>p</kbd> / <kbd>enter</kbd>
          </span>
          <span>Toggle paused</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>r</kbd>
          </span>
          <span>Reset</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>w</kbd>
          </span>
          <span>Toggle wrap</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>*</kbd>
          </span>
          <span>Increase size</span>
        </div>
        <div className='col-span-2'>
          <button type='button' onClick={handleClick}>
            Reload
          </button>
        </div>
      </div>
      <canvas className='aspect-square overflow-hidden size-full border-4 border-white' ref={canvasRef} />
      <div className='grid grid-cols-[auto_auto] gap-4 my-auto text-2xl overflow-hidden'>
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
        <div className='contents'>
          <h3 className='font-semibold'>Wrap</h3>
          <div ref={wrapElemRef}></div>
        </div>
      </div>
    </div>
  );
}
