import { createContext, type ReactNode, type RefObject, useContext, useEffect, useRef } from 'react';
import { Game, Turn } from '@/lib/game';

type Context = RefObject<Game>;

const Context = createContext<Context | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const gameRef = useRef(new Game());

  useEffect(() => {
    const controller = new AbortController();
    // biome-ignore format: no
    document.addEventListener('keydown', (event) => {
      if (event.key === 'a' || event.key === 'ArrowLeft') gameRef.current.turn = Turn.Left;
      else if (event.key === 'd' || event.key === 'ArrowRight') gameRef.current.turn = Turn.Right;
      else if (event.key === 'f') gameRef.current.addFood();
      else if (event.key === 'u') console.info(gameRef.current.dump());
      else if (event.key === '+') ++gameRef.current.speed
      else if (event.key === '-') --gameRef.current.speed
      else if (event.key === 'p' || event.key === 'Enter') gameRef.current.paused = !gameRef.current.paused;
      else if (event.key === 'r') gameRef.current.reset();
      else if (event.key === 'w') gameRef.current.wrap = !gameRef.current.wrap;
      else if (event.key === '*') ++gameRef.current.size;
    }, { signal: controller.signal });
    return () => controller.abort();
  }, []);

  return <Context value={gameRef}>{children}</Context>;
}

export function useGame() {
  const context = useContext(Context);
  if (context === null) throw new Error('useGame must be used underneath a GameProvider');
  return context;
}
