import { createContext, type ReactNode, type RefObject, useContext, useMemo, useRef } from 'react';
import { Game } from '@/lib/game';

interface Context {
  gameRef: RefObject<Game>;
}

const Context = createContext<Context | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const gameRef = useRef(new Game(24, 24));

  const contextValue: Context = useMemo(() => ({ gameRef }), []);

  return <Context value={contextValue}>{children}</Context>;
}

export function useGame() {
  const context = useContext(Context);
  if (context === null) throw new Error('useGame must be used underneath a GameProvider');
  return context;
}
