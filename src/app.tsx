import { useCallback, useEffect, useRef, useState } from 'react';
import { MobileControls } from '@/components/mobile-controls';
import { useGame } from '@/hooks/game';
import { colourSchemes, type Game, Heading } from '@/lib/game';
import { lerp } from '@/lib/utils';

function drawFood(context: CanvasRenderingContext2D, game: Game, scale: number): void {
  context.lineWidth = scale / 20;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = scale / 10;
  context.shadowBlur = scale / 4;
  for (const [{ x, y }, type] of game
    .food()
    .toArray()
    .toSorted(([a], [b]) => a.y - b.y || a.x - b.x)) {
    const gradient = context.createLinearGradient(x * scale, y * scale, (x + 1) * scale, (y + 1) * scale);
    let alpha = 45;
    let beta = 75;
    if (typeof type === 'number') {
      const colours = colourSchemes[type];
      const width = 0.7 / colours.length;
      for (const [i, colour] of colours.entries()) {
        gradient.addColorStop(i * width + 0.15, `lab(${colour[0]} ${colour[1]} ${colour[2]})`);
        gradient.addColorStop((i + 1) * width + 0.15, `lab(${colour[0]} ${colour[1]} ${colour[2]})`);
      }
      [, alpha, beta] = colours[0];
      context.strokeStyle = `lab(25 ${alpha} ${beta})`;
    } else {
      gradient.addColorStop(0, `lab(68 ${alpha} ${beta})`);
      gradient.addColorStop(1, `lab(40 ${alpha} ${beta})`);
      context.strokeStyle = `lab(25 ${alpha} ${beta})`;
    }
    context.fillStyle = gradient;
    context.shadowColor = `lab(50 ${alpha} ${beta} / 50%)`;

    // main
    context.beginPath();
    context.arc((x + 0.5) * scale, (y + 0.5) * scale, scale * 0.5, 0, Math.PI * 2, false);
    context.fill();
    context.stroke();

    // dots
    context.fillStyle = `lab(25 ${alpha} ${beta} / 50%)`;
    context.beginPath();
    context.arc((x + 0.33) * scale, (y + 0.33) * scale, scale * 0.08, 0, Math.PI * 2, false);
    context.fill();
    context.stroke();

    context.beginPath();
    context.arc((x + 0.45) * scale, (y + 0.7) * scale, scale * 0.07, 0, Math.PI * 2, false);
    context.fill();
    context.stroke();

    context.beginPath();
    context.arc((x + 0.7) * scale, (y + 0.4) * scale, scale * 0.05, 0, Math.PI * 2, false);
    context.fill();
    context.stroke();
  }
}

function drawText(context: CanvasRenderingContext2D, text: string[], size: string, scale: number, x: number, y: number): void {
  context.fillStyle = '#fff';
  context.shadowColor = 'lab(60 94 -61 / 50%)';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = scale / 10;
  context.shadowBlur = scale / 4;
  context.font = `bold ${size} system-ui`;
  context.textBaseline = 'middle';
  const textWithMetrics = text.map((item) => ({ text: item, metrics: context.measureText(item) }));
  const [maxAscent, maxDescent] = textWithMetrics.reduce(
    (acc, item) => {
      acc[0] = Math.max(acc[0], item.metrics.fontBoundingBoxAscent);
      acc[1] = Math.max(acc[1], item.metrics.fontBoundingBoxDescent);
      return acc;
    },
    [0, 0]
  );
  const lineHeight = (maxAscent + maxDescent) * 0.8;
  const centerX = (x + 0.5) * scale;
  const centerY = (y + 0.5) * scale;
  const startY = centerY - ((textWithMetrics.length - 1) * lineHeight) / 2;
  for (const [i, item] of textWithMetrics.entries()) context.fillText(item.text, centerX - item.metrics.width / 2, startY + i * lineHeight);
}

function drawGrid(context: CanvasRenderingContext2D, game: Game, scale: number): void {
  const gradient = context.createLinearGradient(0, 0, 0, game.size * scale);
  gradient.addColorStop(0, 'lab(39 75 -95 / 50%)');
  gradient.addColorStop(1, 'lab(56 83 6 / 50%)');
  context.strokeStyle = gradient;
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 1; x < game.size; ++x) {
    context.moveTo(x * scale, 0);
    context.lineTo(x * scale, game.size * scale);
  }
  for (let y = 1; y < game.size; ++y) {
    context.moveTo(0, y * scale);
    context.lineTo(game.size * scale, y * scale);
  }
  context.stroke();
}

function drawBg(context: CanvasRenderingContext2D, game: Game, scale: number): void {
  const gradient = context.createLinearGradient(0, 0, 0, game.size * scale);
  gradient.addColorStop(0, '#000');
  gradient.addColorStop(1, '#002');
  context.fillStyle = gradient;
  context.fillRect(0, 0, game.size * scale, game.size * scale);
}

function headingLabel(heading: Heading | null): string {
  return heading === Heading.North ? 'N' : heading === Heading.East ? 'E' : heading === Heading.South ? 'S' : heading === Heading.West ? 'W' : '';
}

function drawSnake(context: CanvasRenderingContext2D, game: Game, scale: number): void {
  const snake = [...game.snake()];
  context.shadowOffsetX = 0;
  context.shadowOffsetY = scale / 5;

  context.shadowBlur = scale / 4;
  context.lineWidth = scale / 20;
  const eyes = [new Path2D(), new Path2D()];
  const outlines: Path2D[] = [];
  const fills: [fillStyle: string, path: Path2D][] = [];

  const tailColour = game.colourScheme[game.colourScheme.length - 1];
  context.strokeStyle = `lab(40 ${tailColour[1]} ${tailColour[2]})`;

  function lerpColour(segment: number): [l: number, a: number, b: number] {
    const index = Math.min(game.colourScheme.length - 1, (segment / (snake.length - 1)) * (game.colourScheme.length - 1));
    const prevStop = game.colourScheme[Math.floor(index)];
    const nextStop = game.colourScheme[Math.ceil(index)];
    const mix = index % 1;
    const colour = [lerp(prevStop[0], nextStop[0], 1, mix), lerp(prevStop[1], nextStop[1], 1, mix), lerp(prevStop[2], nextStop[2], 1, mix)];
    return colour as [l: number, a: number, b: number];
  }

  for (let i = 0; i < snake.length; ++i) {
    const [{ x, y }, heading] = snake[i];
    const [, prevHeading] = i > 0 ? snake[i - 1] : [null, null];
    const fill = new Path2D();
    const colour = lerpColour(i);
    // shadow pass requires an opaque fill
    context.fillStyle = '#000';
    context.shadowColor = `lab(${colour[0]} ${colour[1]} ${colour[2]} / 50%)`;
    if (i === 0) {
      // head
      if (heading === Heading.North) {
        fill.moveTo(x * scale, (y + 1) * scale);
        fill.arc(x * scale + scale / 2, y * scale + scale / 2, scale / 2, Math.PI * 1.0, Math.PI * 2.0, false);
        fill.lineTo((x + 1) * scale, (y + 1) * scale);
        eyes[0].arc((x + 0.25) * scale, (y + 0.33) * scale, scale / 10, 0, Math.PI * 2, false);
        eyes[1].arc((x + 0.75) * scale, (y + 0.33) * scale, scale / 10, 0, Math.PI * 2, false);
      } else if (heading === Heading.East) {
        fill.moveTo(x * scale, y * scale);
        fill.arc(x * scale + scale / 2, y * scale + scale / 2, scale / 2, Math.PI * 1.5, Math.PI * 2.5, false);
        fill.lineTo(x * scale, (y + 1) * scale);
        eyes[0].arc((x + 0.67) * scale, (y + 0.25) * scale, scale / 10, 0, Math.PI * 2, false);
        eyes[1].arc((x + 0.67) * scale, (y + 0.75) * scale, scale / 10, 0, Math.PI * 2, false);
      } else if (heading === Heading.South) {
        fill.moveTo((x + 1) * scale, y * scale);
        fill.arc(x * scale + scale / 2, y * scale + scale / 2, scale / 2, Math.PI * 0.0, Math.PI, false);
        fill.lineTo(x * scale, y * scale);
        eyes[0].arc((x + 0.25) * scale, (y + 0.67) * scale, scale / 10, 0, Math.PI * 2, false);
        eyes[1].arc((x + 0.75) * scale, (y + 0.67) * scale, scale / 10, 0, Math.PI * 2, false);
      } else if (heading === Heading.West) {
        fill.moveTo((x + 1) * scale, (y + 1) * scale);
        fill.arc(x * scale + scale / 2, y * scale + scale / 2, scale / 2, Math.PI * 0.5, Math.PI * 1.5, false);
        fill.lineTo((x + 1) * scale, y * scale);
        eyes[0].arc((x + 0.33) * scale, (y + 0.25) * scale, scale / 10, 0, Math.PI * 2, false);
        eyes[1].arc((x + 0.33) * scale, (y + 0.75) * scale, scale / 10, 0, Math.PI * 2, false);
      }
      outlines.push(fill);
    } else if (i === snake.length - 1) {
      // tail
      if (prevHeading === Heading.North) {
        fill.moveTo(x * scale, y * scale);
        fill.lineTo((x + 0.5) * scale, (y + 1) * scale);
        fill.lineTo((x + 1) * scale, y * scale);
      } else if (prevHeading === Heading.East) {
        fill.moveTo((x + 1) * scale, (y + 1) * scale);
        fill.lineTo(x * scale, (y + 0.5) * scale);
        fill.lineTo((x + 1) * scale, y * scale);
      } else if (prevHeading === Heading.South) {
        fill.moveTo(x * scale, (y + 1) * scale);
        fill.lineTo((x + 0.5) * scale, y * scale);
        fill.lineTo((x + 1) * scale, (y + 1) * scale);
      } else if (prevHeading === Heading.West) {
        fill.moveTo(x * scale, y * scale);
        fill.lineTo((x + 1) * scale, (y + 0.5) * scale);
        fill.lineTo(x * scale, (y + 1) * scale);
      }
      outlines.push(fill);
    } else {
      // body
      const outline = new Path2D();
      if ((prevHeading === Heading.North && heading === Heading.North) || (prevHeading === Heading.South && heading === Heading.South)) {
        fill.rect(x * scale, y * scale - 1, scale, scale + 2);
        outline.moveTo(x * scale, y * scale - 1);
        outline.lineTo(x * scale, (y + 1) * scale + 1);
        outline.moveTo((x + 1) * scale, (y + 1) * scale + 1);
        outline.lineTo((x + 1) * scale, y * scale - 1);
      } else if ((prevHeading === Heading.East && heading === Heading.East) || (prevHeading === Heading.West && heading === Heading.West)) {
        fill.rect(x * scale - 1, y * scale, scale + 2, scale);
        outline.moveTo(x * scale - 1, y * scale);
        outline.lineTo((x + 1) * scale + 1, y * scale);
        outline.moveTo(x * scale - 1, (y + 1) * scale);
        outline.lineTo((x + 1) * scale + 1, (y + 1) * scale);
      } else if ((prevHeading === Heading.North && heading === Heading.East) || (prevHeading === Heading.West && heading === Heading.South)) {
        fill.arc(x * scale - 1, y * scale - 1, scale + 1, Math.PI * 0.0, Math.PI * 0.5, false);
        fill.lineTo(x * scale - 1, y * scale - 1);
        outline.arc(x * scale, y * scale, scale, Math.PI * 0.0, Math.PI * 0.5, false);
      } else if ((prevHeading === Heading.North && heading === Heading.West) || (prevHeading === Heading.East && heading === Heading.South)) {
        fill.arc((x + 1) * scale + 1, y * scale - 1, scale + 1, Math.PI * 0.5, Math.PI * 1.0, false);
        fill.lineTo((x + 1) * scale + 1, y * scale - 1);
        outline.arc((x + 1) * scale, y * scale, scale, Math.PI * 0.5, Math.PI * 1.0, false);
      } else if ((prevHeading === Heading.East && heading === Heading.North) || (prevHeading === Heading.South && heading === Heading.West)) {
        fill.arc((x + 1) * scale + 1, (y + 1) * scale + 1, scale + 1, Math.PI * 1.0, Math.PI * 1.5, false);
        fill.lineTo((x + 1) * scale + 1, (y + 1) * scale + 1);
        outline.arc((x + 1) * scale, (y + 1) * scale, scale, Math.PI * 1.0, Math.PI * 1.5, false);
      } else if ((prevHeading === Heading.South && heading === Heading.East) || (prevHeading === Heading.West && heading === Heading.North)) {
        fill.arc(x * scale - 1, (y + 1) * scale + 1, scale + 1, Math.PI * 1.5, Math.PI * 2.0, false);
        fill.lineTo(x * scale - 1, (y + 1) * scale + 1);
        outline.arc(x * scale, (y + 1) * scale, scale, Math.PI * 1.5, Math.PI * 2.0, false);
      }
      outlines.push(outline);
    }
    context.fill(fill);
    fills.push([`lab(${colour[0]} ${colour[1]} ${colour[2]})`, fill]);
    if (game.labels)
      drawText(
        context,
        [headingLabel(prevHeading), headingLabel(heading)].filter((item) => item.length),
        '20px',
        scale,
        x,
        y
      );
  }

  // draw fills on top of all shadows
  context.shadowColor = '#0000';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;
  for (const [fillStyle, fill] of fills) {
    context.fillStyle = fillStyle;
    context.fill(fill);
  }

  for (const outline of outlines) context.stroke(outline);

  context.fillStyle = `lab(20 ${tailColour[1]} ${tailColour[2]})`;
  for (const eye of eyes) {
    context.fill(eye);
    context.stroke(eye);
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useGame();
  const nextTickRef = useRef(0);
  const scoreElemRef = useRef<HTMLDivElement>(null);
  const lengthElemRef = useRef<HTMLDivElement>(null);
  const speedElemRef = useRef<HTMLDivElement>(null);
  const wrapElemRef = useRef<HTMLDivElement>(null);
  const sizeElemRef = useRef<HTMLDivElement>(null);
  const autoElemRef = useRef<HTMLDivElement>(null);
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

      drawBg(context, gameRef.current, scale);
      drawGrid(context, gameRef.current, scale);
      drawFood(context, gameRef.current, scale);
      drawSnake(context, gameRef.current, scale);

      if (gameRef.current.dead || gameRef.current.paused)
        drawText(
          context,
          [gameRef.current.dead ? 'Game over' : 'Paused', 'Score', gameRef.current.score.toLocaleString(), `Speed ${gameRef.current.speed}`],
          `${2 * scale}px`,
          scale,
          gameRef.current.size / 2 - 0.5,
          gameRef.current.size / 2 - 0.5
        );
      if (scoreElemRef.current) scoreElemRef.current.innerText = gameRef.current.score.toLocaleString();
      if (lengthElemRef.current) lengthElemRef.current.innerText = gameRef.current.length.toLocaleString();
      if (speedElemRef.current) speedElemRef.current.innerText = gameRef.current.speed.toLocaleString();
      if (sizeElemRef.current) sizeElemRef.current.innerText = gameRef.current.size.toLocaleString();
      if (autoElemRef.current) autoElemRef.current.innerText = gameRef.current.auto ? 'Auto' : 'Manual';
      if (wrapElemRef.current) wrapElemRef.current.innerText = gameRef.current.wrap ? 'Wrap' : 'Limit';
    }
    requestAnimationFrame(step);

    return () => controller.abort();
  }, [reload]);

  const handleClick = useCallback(() => setReload(Math.random()), []);

  return (
    <div className='flex flex-col lg:flex-row gap-4 lg:p-4 size-full lg:size-auto'>
      <div className='hidden lg:grid grid-cols-[auto,auto] gap-4 my-auto overflow-hidden grow basis-0 order-12 lg:order-1'>
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
            <kbd>q</kbd>
          </span>
          <span>Add special food</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>g</kbd>
          </span>
          <span>Grow</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>c</kbd>
          </span>
          <span>Next colour</span>
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
            <kbd>t</kbd>
          </span>
          <span>Toggle auto</span>
        </div>
        <div className='contents'>
          <span>
            <kbd>l</kbd>
          </span>
          <span>Toggle labels</span>
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
      <canvas
        className='aspect-square overflow-hidden size-[100vmin] lg:size-[min(calc(100vmin-2em),calc(100dvw-30em))] border-4 border-white order-1 lg:order-2 shrink-0'
        ref={canvasRef}
      />
      <div className='hidden lg:flex flex-col gap-4 my-auto text-2xl overflow-hidden grow basis-0 order-12 lg:order-3 *:flex *:flex-wrap *:gap-x-4 **:overflow-hidden **:wrap-normal'>
        <div>
          <h3 className='font-semibold'>Score</h3>
          <div ref={scoreElemRef}></div>
        </div>
        <div>
          <h3 className='font-semibold'>Length</h3>
          <div ref={lengthElemRef}></div>
        </div>
        <div>
          <h3 className='font-semibold'>Speed</h3>
          <div ref={speedElemRef}></div>
        </div>
        <div>
          <h3 className='font-semibold'>Size</h3>
          <div ref={sizeElemRef}></div>
        </div>
        <div>
          <h3 className='font-semibold'>Auto</h3>
          <div ref={autoElemRef}></div>
        </div>
        <div>
          <h3 className='font-semibold'>Wrap</h3>
          <div ref={wrapElemRef}></div>
        </div>
      </div>
      <MobileControls className='order-1 lg:order-12 grow' />
    </div>
  );
}
