import { render } from 'preact';
import { BALANCE } from './core/balance';
import { OLD_SAVE_KEYS, SAVE_KEY, catchUp, deserialize, serialize } from './core/save';
import { newGame } from './core/state';
import { advance, step } from './core/step';
import type { GameState } from './core/types';
import { App } from './ui/App';
import { emit, store } from './ui/store';
import './styles.css';

let notice: string | null = null;

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return deserialize(raw);
  } catch (e) {
    console.warn('Could not load save, starting fresh.', e);
  }
  for (const key of OLD_SAVE_KEYS) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      notice = 'The game has changed a lot since you last played, so your old save was retired. Welcome to the new village.';
    }
  }
  return newGame(Date.now() & 0x7fffffff, Date.now());
}

function save(): void {
  try {
    store.game.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, serialize(store.game));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

store.game = load();
const offline = catchUp(store.game, Date.now());

render(<App offline={offline} notice={notice} />, document.getElementById('app')!);

/** Time stands still while a story card is open, and after Hob dies (until you pass the pitchfork on). */
function paused(): boolean {
  return store.game.dead || store.game.cardQueue.length > 0;
}

// Fixed 10 Hz simulation. If the tab slept for a while, catch up in coarse steps instead.
let last = performance.now();
let acc = 0;
setInterval(() => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  if (paused()) {
    acc = 0;
  } else if (dt > 5) {
    advance(store.game, Math.min(dt, BALANCE.offlineCapSeconds), 1);
  } else {
    acc += dt;
    while (acc >= BALANCE.tickSeconds && !paused()) {
      step(store.game, BALANCE.tickSeconds);
      acc -= BALANCE.tickSeconds;
    }
  }
  store.game.lastSeen = Date.now();
  emit();
}, 100);

setInterval(save, 10_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('beforeunload', save);

// Playtest helper: add ?debug=1 to the URL to fast-forward time from the console: __advance(60).
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  const w = window as unknown as Record<string, unknown>;
  w.__game = () => store.game;
  w.__advance = (seconds: number) => {
    advance(store.game, seconds, BALANCE.tickSeconds);
    emit();
  };
}
