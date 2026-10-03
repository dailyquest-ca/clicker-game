// Tiny store: the game state is one mutable object; components re-render on every tick.
import { useEffect, useState } from 'preact/hooks';
import { checkCards } from '../core/step';
import type { GameState } from '../core/types';

type Listener = () => void;
const listeners = new Set<Listener>();

export const store: { game: GameState } = { game: null as unknown as GameState };

export function emit(): void {
  for (const l of listeners) l();
}

export function useGame(): GameState {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return store.game;
}

/** Run an action against the game and re-render. Any story card it unlocks shows straight away. */
export function act<T>(fn: (g: GameState) => T): T {
  const result = fn(store.game);
  checkCards(store.game);
  emit();
  return result;
}
