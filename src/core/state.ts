import { BALANCE } from './balance';
import type { ChoreId, GameState, LogKind, PerkId, Slot, UpgradeId } from './types';

export const SAVE_VERSION = 1;

const zeroChores = (): Record<ChoreId, { level: number; progress: number }> => ({
  hay: { level: 0, progress: 0 },
  dodge: { level: 0, progress: 0 },
  goat: { level: 0, progress: 0 },
  punch: { level: 0, progress: 0 },
});

const zeroAssigned = (): Record<ChoreId, number> => ({ hay: 0, dodge: 0, goat: 0, punch: 0 });

const zeroUpgrades = (): Record<UpgradeId, number> => ({ porridge: 0, bucket: 0, whetstone: 0, padding: 0, haggle: 0, eyes: 0 });

const zeroPerks = (): Record<PerkId, number> => ({
  habit: 0,
  strongBack: 0,
  thickSkin: 0,
  secondWind: 0,
  deepLungs: 0,
  packMule: 0,
  magpie: 0,
  autoMerge: 0,
  connections: 0,
});

const emptyEquipped = (): Record<Slot, null> => ({ head: null, body: null, weapon: null, feet: null, trinket: null });

export function newGame(seed: number, now: number): GameState {
  return {
    v: SAVE_VERSION,
    rngState: seed | 0,
    nextUid: 1,
    lastSeen: now,
    totalTime: 0,
    lifeTime: 0,
    rebirths: 0,
    stamina: { idle: 0, assigned: zeroAssigned() },
    chores: zeroChores(),
    gold: 0,
    bossesBeaten: 0,
    fight: null,
    adventure: { zone: null, enemy: '', enemyHp: 0, hp: BALANCE.baseHp, deadFor: 0, kills: 0 },
    inventory: [],
    equipped: emptyEquipped(),
    upgrades: zeroUpgrades(),
    memories: 0,
    perks: zeroPerks(),
    unlocked: { market: false, adventure: false, rebirth: false },
    discoveredSets: [],
    seenItems: [],
    achievements: [],
    life: { bossTimes: [], peakRate: 0, peakRateAt: 0, fightsStarted: 0 },
    records: { bestBossEver: 0, firstReach: [], totalKills: 0, totalGold: 0, itemsFound: 0, memoriesEarned: 0 },
    chronicle: [],
    log: [
      { t: 0, text: 'You are Hob, a serf. You own a shovel. The shovel belongs to the Lord.', kind: 'info' },
      { t: 0, text: 'Assign stamina to a chore. Get stronger. Show that rooster.', kind: 'info' },
    ],
  };
}

/** Clears everything that belongs to a single life. Items, perks, memories and records survive. */
export function resetLife(state: GameState, startingGold: number): void {
  state.lifeTime = 0;
  state.stamina = { idle: 0, assigned: zeroAssigned() };
  state.chores = zeroChores();
  state.gold = startingGold;
  state.bossesBeaten = 0;
  state.fight = null;
  state.adventure = { zone: null, enemy: '', enemyHp: 0, hp: BALANCE.baseHp, deadFor: 0, kills: 0 };
  state.upgrades = zeroUpgrades();
  state.life = { bossTimes: [], peakRate: 0, peakRateAt: 0, fightsStarted: 0 };
}

export function pushLog(state: GameState, text: string, kind: LogKind = 'info'): void {
  state.log.push({ t: state.totalTime, text, kind });
  if (state.log.length > BALANCE.logSize) state.log.splice(0, state.log.length - BALANCE.logSize);
}
