import { BALANCE } from './balance';
import { CHORES } from '../content/chores';
import { newGame, pushLog, SAVE_VERSION } from './state';
import { advance } from './step';
import type { GameState } from './types';

export const SAVE_KEY = 'serf-proto-v0';

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Ordered migrations: index i upgrades a save from version i+1 to i+2. Empty until the format changes. */
const MIGRATIONS: ((raw: Record<string, unknown>) => void)[] = [];

export function deserialize(text: string): GameState {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (typeof raw !== 'object' || raw === null || typeof raw.v !== 'number') throw new Error('Not a save file');
  let v = raw.v;
  if (v > SAVE_VERSION) throw new Error(`Save is from a newer version (${v})`);
  while (v < SAVE_VERSION) {
    const migrate = MIGRATIONS[v - 1];
    if (!migrate) throw new Error(`No migration from version ${v}`);
    migrate(raw);
    v++;
    raw.v = v;
  }
  // Fill any fields added since the save was written, so old saves keep loading.
  const base = newGame(0, 0) as unknown as Record<string, unknown>;
  for (const key of Object.keys(base)) if (!(key in raw)) raw[key] = base[key];
  return raw as unknown as GameState;
}

export interface OfflineSummary {
  seconds: number;
  gold: number;
  kills: number;
  items: number;
  levels: number;
}

/** Simulate time spent away, capped at 8 hours. */
export function catchUp(state: GameState, nowMs: number): OfflineSummary | null {
  const away = Math.min(BALANCE.offlineCapSeconds, Math.max(0, (nowMs - state.lastSeen) / 1000));
  state.lastSeen = nowMs;
  if (away < 5) return null;
  const before = {
    gold: state.records.totalGold,
    kills: state.records.totalKills,
    items: state.records.itemsFound,
    levels: CHORES.reduce((s, c) => s + state.chores[c.id].level, 0),
  };
  advance(state, away, away > 600 ? 2 : 0.5);
  const summary: OfflineSummary = {
    seconds: away,
    gold: state.records.totalGold - before.gold,
    kills: state.records.totalKills - before.kills,
    items: state.records.itemsFound - before.items,
    levels: CHORES.reduce((s, c) => s + state.chores[c.id].level, 0) - before.levels,
  };
  pushLog(state, `While you were away (${Math.round(away / 60)} min): +${Math.round(summary.gold)} gold, +${summary.levels} chore levels, ${summary.kills} kills, ${summary.items} items.`, 'good');
  return summary;
}
