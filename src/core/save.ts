import { BALANCE } from './balance';
import { newGame, pushLog, SAVE_VERSION } from './state';
import { advance } from './step';
import type { GameState } from './types';

export const SAVE_KEY = 'serf-v1';
/** Saves from the first prototype. Different game; they are retired, not migrated. */
export const OLD_SAVE_KEYS = ['serf-proto-v0'];

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Ordered migrations: MIGRATIONS[v - SAVE_VERSION_BASE] upgrades a save from version v to v+1. Empty until the format changes. */
const SAVE_VERSION_BASE = 2;
const MIGRATIONS: ((raw: Record<string, unknown>) => void)[] = [];

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Fill in any fields (at any depth) added since the save was written, so old saves keep loading. */
function fillDefaults(target: Record<string, unknown>, defaults: Record<string, unknown>): void {
  for (const key of Object.keys(defaults)) {
    const d = defaults[key];
    if (!(key in target) || target[key] === undefined) target[key] = d;
    else if (isPlainObject(d) && isPlainObject(target[key])) fillDefaults(target[key] as Record<string, unknown>, d);
  }
}

export function deserialize(text: string): GameState {
  const raw = JSON.parse(text) as unknown;
  if (!isPlainObject(raw) || typeof raw.v !== 'number') throw new Error('Not a save file');
  let v = raw.v;
  if (v > SAVE_VERSION) throw new Error(`Save is from a newer version (${v})`);
  if (v < SAVE_VERSION_BASE) throw new Error('Save is from the old prototype');
  while (v < SAVE_VERSION) {
    const migrate = MIGRATIONS[v - SAVE_VERSION_BASE];
    if (!migrate) throw new Error(`No migration from version ${v}`);
    migrate(raw);
    v++;
    raw.v = v;
  }
  fillDefaults(raw, newGame(0, 0) as unknown as Record<string, unknown>);
  return raw as unknown as GameState;
}

export interface OfflineSummary {
  seconds: number;
  earned: number;
  made: number;
  tithes: number;
  died: boolean;
}

/** Simulate time spent away, capped at 8 hours. If Hob's time comes, he waits on his deathbed for you. */
export function catchUp(state: GameState, nowMs: number): OfflineSummary | null {
  const away = Math.min(BALANCE.offlineCapSeconds, Math.max(0, (nowMs - state.lastSeen) / 1000));
  state.lastSeen = nowMs;
  if (away < 5 || state.dead) return null;
  const before = {
    earned: state.records.earnedTotal,
    made: state.batches.hay + state.batches.eggs + state.batches.logs,
    tithes: state.yearsPaid,
  };
  advance(state, away, away > 600 ? 2 : 0.5);
  const summary: OfflineSummary = {
    seconds: away,
    earned: state.records.earnedTotal - before.earned,
    made: state.batches.hay + state.batches.eggs + state.batches.logs - before.made,
    tithes: state.yearsPaid - before.tithes,
    died: state.dead,
  };
  pushLog(state, `While you were away (${Math.round(away / 60)} min): made ${summary.made} goods, earned ${Math.round(summary.earned)}d, ${summary.tithes} Michaelmas${summary.tithes === 1 ? '' : 'es'} passed.`, 'good');
  return summary;
}
