import { BALANCE } from './balance';
import { MILESTONES } from '../content/manor';
import type { ChoreId, GameState, GoodId, LogKind, ShopId, Slot, TraditionId } from './types';

export const SAVE_VERSION = 2;

export const zeroGoods = (): Record<GoodId, number> => ({ hay: 0, egg: 0, log: 0 });
export const zeroChores = (): Record<ChoreId, number> => ({ hay: 0, eggs: 0, logs: 0, rummage: 0 });
export const zeroOwned = (): Record<ShopId, number> => ({ hen: 0, porridge: 0, whetstone: 0, basket: 0, axe: 0, saw: 0, henhouse: 0, barn: 0, rake: 0 });
const zeroTraditions = (): Record<TraditionId, number> => ({ shoulders: 0, knack: 0, gab: 0, hardy: 0, sentimental: 0, familyHen: 0, contacts: 0 });
export const emptyEquipped = (): Record<Slot, null> => ({ head: null, body: null, hands: null, feet: null, trinket: null });

export function newGame(seed: number, now: number): GameState {
  const state: GameState = {
    v: SAVE_VERSION,
    rngState: seed | 0,
    nextUid: 1,
    lastSeen: now,
    totalTime: 0,
    lifeTime: 0,
    life: 1,
    name: 'Hob',
    dead: false,

    pennies: 0,
    goods: zeroGoods(),
    owned: zeroOwned(),
    pips: { hay: BALANCE.startPips, eggs: 0, logs: 0, rummage: 0 },
    progress: zeroChores(),
    batches: zeroChores(),
    practice: zeroChores(),
    yearsPaid: 0,
    paidThisLife: 0,
    soldThisLife: 0,
    earnedThisLife: 0,
    savingFor: null,
    standing: { hay: null, egg: null, log: null },
    basket: true,
    inventory: [],
    equipped: emptyEquipped(),
    peddler: null,
    fairContest: null,
    fairEntered: false,
    lastFair: null,
    lastTithe: null,
    wastedGoods: 0,

    debtPaid: 0,
    debtExtra: 0,
    lore: 0,
    loreGranted: 0,
    traditions: zeroTraditions(),
    knowHow: zeroChores(),
    milestones: [],
    demandsDone: [],
    cardsSeen: [],
    cardQueue: ['intro'],
    tabs: ['work'],
    discoveredSets: [],
    seenItems: [],
    contestWins: {},
    titles: [],
    rumour: null,
    prices: {},
    flags: {},
    chronicle: [],
    records: { soldTotal: 0, earnedTotal: 0, tithesMet: 0, tithesMissed: 0, itemsFound: 0, purchases: 0 },
    log: [{ t: 0, text: 'Your father has died. You have inherited his pitchfork, his hat, and his debt.', kind: 'story' }],
  };
  return state;
}

/** What every new Hob starts with, from milestones and Traditions. */
export function startingAssets(state: GameState): { hens: number; basket: boolean; axe: boolean } {
  let hens = state.traditions.familyHen;
  let basket = false;
  let axe = false;
  for (const i of state.milestones) {
    const start = MILESTONES[i]?.start;
    if (!start) continue;
    hens += start.hens ?? 0;
    basket = basket || !!start.basket;
    axe = axe || !!start.axe;
  }
  return { hens, basket, axe };
}

/** Clears everything that belongs to a single life. The family's progress (debt, Lore, unlocks, cards) survives. */
export function resetLife(state: GameState): void {
  state.lifeTime = 0;
  state.dead = false;
  state.pennies = 0;
  state.goods = zeroGoods();
  state.owned = zeroOwned();
  const start = startingAssets(state);
  state.owned.hen = start.hens;
  state.owned.basket = start.basket ? 1 : 0;
  state.owned.axe = start.axe ? 1 : 0;
  state.pips = zeroChores();
  state.progress = zeroChores();
  state.batches = zeroChores();
  state.practice = zeroChores();
  state.yearsPaid = 0;
  state.paidThisLife = 0;
  state.soldThisLife = 0;
  state.earnedThisLife = 0;
  state.savingFor = null;
  state.basket = true;
  state.inventory = [];
  state.equipped = emptyEquipped();
  state.peddler = null;
  state.fairContest = null;
  state.fairEntered = false;
  state.lastFair = null;
  state.lastTithe = null;
  state.wastedGoods = 0;
  state.prices = {};
  state.flags.badBack = false;
}

export function pushLog(state: GameState, text: string, kind: LogKind = 'info'): void {
  state.log.push({ t: state.totalTime, text, kind });
  if (state.log.length > BALANCE.logSize) state.log.splice(0, state.log.length - BALANCE.logSize);
}
