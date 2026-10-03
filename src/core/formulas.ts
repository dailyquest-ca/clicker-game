// Read-only maths over the game state. Everything the UI shows and the simulator reasons about comes from here,
// so a number on screen is always the number the rules use.

import { BALANCE } from './balance';
import { CHORES, GOODS, chore, good } from '../content/chores';
import { HEAP_LOOT, ITEMS, PEDDLER_STOCK, SETS, itemDef } from '../content/items';
import { MILESTONES, type Milestone, titheFor } from '../content/manor';
import { SHOP, TRADITIONS, shopDef, traditionDef } from '../content/shop';
import { STORY } from '../content/story';
import { CONTESTS, DEMANDS, type ContestDef, type DemandDef } from '../content/village';
import type { Bonuses, ChoreId, GameState, GoodId, ItemInstance, SetDef, ShopId, Slot, TraditionId } from './types';

export const SLOTS: Slot[] = ['head', 'body', 'hands', 'feet', 'trinket'];

export function emptyBonuses(): Bonuses {
  return { hayPct: 0, eggPct: 0, logPct: 0, rummagePct: 0, workPct: 0, pricePct: 0, luckPct: 0, pips: 0, barn: 0 };
}

function addInto(target: Bonuses, src: Partial<Bonuses>, times = 1): void {
  for (const key of Object.keys(src) as (keyof Bonuses)[]) target[key] += (src[key] ?? 0) * times;
}

// ---------- Belongings ----------

export function scaledItemStats(item: ItemInstance): Partial<Bonuses> {
  const def = itemDef(item.id);
  const mult = 1 + (BALANCE.itemLevelPct / 100) * item.level;
  const out: Partial<Bonuses> = {};
  for (const key of Object.keys(def.stats) as (keyof Bonuses)[]) {
    const v = def.stats[key] ?? 0;
    // Downsides don't grow with level, and a pip is a pip.
    out[key] = v > 0 && key !== 'pips' ? v * mult : v;
  }
  return out;
}

export function activeSets(equipped: Record<Slot, ItemInstance | null>): SetDef[] {
  const ids = new Set(SLOTS.map((s) => equipped[s]?.id).filter((x): x is string => !!x));
  return SETS.filter((set) => set.items.every((i) => ids.has(i)));
}

export function gearBonuses(state: GameState): Bonuses {
  const b = emptyBonuses();
  for (const slot of SLOTS) {
    const item = state.equipped[slot];
    if (item) addInto(b, scaledItemStats(item));
  }
  for (const set of activeSets(state.equipped)) addInto(b, set.bonus);
  return b;
}

export function milestoneBonuses(state: GameState): Bonuses {
  const b = emptyBonuses();
  for (const i of state.milestones) {
    const m = MILESTONES[i];
    if (m?.bonus) addInto(b, m.bonus);
  }
  return b;
}

export function itemSaleValue(item: ItemInstance): number {
  return itemDef(item.id).value * (1 + item.level);
}

export function allItems(state: GameState): ItemInstance[] {
  return [...SLOTS.map((s) => state.equipped[s]).filter((i): i is ItemInstance => !!i), ...state.inventory];
}

export function heirloomSlots(state: GameState): number {
  let n = BALANCE.heirloomSlots + state.traditions.sentimental;
  for (const i of state.milestones) n += MILESTONES[i]?.heirlooms ?? 0;
  return n;
}

export function luck(state: GameState): number {
  return gearBonuses(state).luckPct + 20 * state.owned.rake;
}

// ---------- Stamina pips ----------

export function totalPips(state: GameState): number {
  const pips = BALANCE.startPips + state.owned.porridge + state.traditions.shoulders + milestoneBonuses(state).pips + Math.round(gearBonuses(state).pips);
  return Math.max(1, pips);
}

export function assignedPips(state: GameState): number {
  return CHORES.reduce((s, c) => s + state.pips[c.id], 0);
}

export function idlePips(state: GameState): number {
  return Math.max(0, totalPips(state) - assignedPips(state));
}

// ---------- Chores ----------

/** Chores appear one at a time: eggs once there's a hen, firewood with the axe, the heap from the second Hob. */
export function choreVisible(state: GameState, c: ChoreId): boolean {
  if (c === 'eggs') return state.owned.hen > 0 || state.life > 1;
  if (c === 'logs') return state.owned.axe > 0;
  if (c === 'rummage') return state.life > 1;
  return true;
}

/** Pips that actually work. Each hen keeps exactly one pip busy; spare egg pips stand about. */
export function effectivePips(state: GameState, c: ChoreId): number {
  if (!choreVisible(state, c)) return 0;
  const p = state.pips[c];
  return c === 'eggs' ? Math.min(p, state.owned.hen) : p;
}

/** Pip-seconds of work a chore needs to reach a practice level. */
export function practiceForLevel(level: number): number {
  return BALANCE.practiceCurve * level * level * level;
}

export function practiceLevel(pipSeconds: number): number {
  let level = 0;
  while (practiceForLevel(level + 1) <= pipSeconds) level++;
  return level;
}

const TOOLS: Partial<Record<ChoreId, { id: ShopId; pct: number }>> = {
  hay: { id: 'whetstone', pct: 25 },
  eggs: { id: 'henhouse', pct: 20 },
  logs: { id: 'saw', pct: 20 },
  rummage: { id: 'rake', pct: 30 },
};

export interface WorkBreakdown {
  /** Practice this life plus family know-how, added together. */
  skill: number;
  /** Tools from the shop plus what you're wearing, added together. */
  kit: number;
  /** Traditions and milestones: these multiply, and they last forever. */
  family: number;
  back: number;
  total: number;
}

/** Bonuses add within a group; the groups multiply. Shown in the UI as-is. */
export function workBreakdown(state: GameState, c: ChoreId): WorkBreakdown {
  const def = chore(c);
  const gear = gearBonuses(state);
  const ms = milestoneBonuses(state);
  const tool = TOOLS[c];
  const toolPct = tool ? tool.pct * state.owned[tool.id] : 0;
  const parts = {
    skill: 1 + BALANCE.practicePerLevel * practiceLevel(state.practice[c]) + BALANCE.knowHowPerLevel * state.knowHow[c],
    kit: Math.max(0.1, 1 + (toolPct + gear[def.bonus] + gear.workPct) / 100),
    family: Math.pow(1.15, state.traditions.knack) * (1 + ms.workPct / 100),
    back: hasBadBack(state) ? BALANCE.badBackMult : 1,
  };
  return { ...parts, total: parts.skill * parts.kit * parts.family * parts.back };
}

export function workMult(state: GameState, c: ChoreId): number {
  return workBreakdown(state, c).total;
}

/** Batches finished per second at the current pip split. */
export function batchRate(state: GameState, c: ChoreId): number {
  return (effectivePips(state, c) * BALANCE.pipWork * workMult(state, c)) / chore(c).work;
}

// ---------- Market ----------

export function priceMult(state: GameState): number {
  const pct = gearBonuses(state).pricePct + milestoneBonuses(state).pricePct + 10 * state.traditions.gab;
  return Math.max(0.1, 1 + pct / 100);
}

export function price(state: GameState, g: GoodId): number {
  return good(g).price * priceMult(state) * (state.prices[g] ?? 1);
}

export function goodsCount(state: GameState): number {
  return GOODS.reduce((s, g) => s + state.goods[g.id], 0);
}

export function barnCap(state: GameState): number {
  return BALANCE.barnBase + 30 * state.owned.basket + 60 * state.owned.barn + Math.floor(gearBonuses(state).barn);
}

export function standingUnlocked(state: GameState): boolean {
  return state.records.soldTotal >= BALANCE.standingUnlock || state.traditions.contacts > 0;
}

/** Pennies per second if everything made right now were sold. */
export function incomeRate(state: GameState): number {
  let r = 0;
  for (const c of CHORES) if (c.good) r += batchRate(state, c.id) * price(state, c.good);
  return r;
}

/** What one pip earns on a chore, in pennies per second. */
export function pipValue(state: GameState, c: ChoreId): number {
  const def = chore(c);
  if (!def.good || !choreVisible(state, c)) return 0;
  return (BALANCE.pipWork * workMult(state, c) * price(state, def.good)) / def.work;
}

/** The best pip split for income alone (ignores the tithe): fill the hens, then the best-paying chore. */
export function bestSplit(state: GameState): Record<ChoreId, number> {
  const split: Record<ChoreId, number> = { hay: 0, eggs: 0, logs: 0, rummage: 0 };
  let free = totalPips(state);
  const order = CHORES.filter((c) => c.good).map((c) => c.id).sort((a, b) => pipValue(state, b) - pipValue(state, a));
  for (const c of order) {
    if (free <= 0 || pipValue(state, c) <= 0) continue;
    const n = c === 'eggs' ? Math.min(free, state.owned.hen) : free;
    split[c] += n;
    free -= n;
  }
  return split;
}

export function bestIncomeRate(state: GameState): number {
  const split = bestSplit(state);
  let r = 0;
  for (const c of CHORES) r += split[c.id] * pipValue(state, c.id);
  return r;
}

// ---------- Shop ----------

export function shopCost(state: GameState, id: ShopId): number {
  const def = shopDef(id);
  return Math.ceil(def.cost * Math.pow(def.growth, state.owned[id]));
}

/** The shop only stocks a few things, and new stock arrives as each life's years go by. */
export function shopAvailable(state: GameState, id: ShopId): boolean {
  if (state.owned[id] >= shopDef(id).max) return false;
  const later = state.life > 1;
  switch (id) {
    case 'hen':
    case 'basket':
      return true;
    case 'porridge':
      return state.owned.hen > 0 || later;
    case 'whetstone':
      return state.yearsPaid >= 1;
    case 'henhouse':
      return state.owned.hen >= 2;
    case 'axe':
      return state.yearsPaid >= 2;
    case 'saw':
      return state.owned.axe > 0;
    case 'barn':
      return state.owned.basket > 0;
    case 'rake':
      return later;
  }
}

export function shopStock(state: GameState): ShopId[] {
  return SHOP.map((s) => s.id)
    .filter((id) => shopAvailable(state, id))
    .sort((a, b) => shopCost(state, a) - shopCost(state, b));
}

export interface ShopPreview {
  /** Best-case income before and after, in pennies per second. */
  before: number;
  after: number;
  /** Seconds until the extra income repays the cost (Infinity if it adds none). */
  payback: number;
  /** A plain-words note about what else it needs, e.g. "needs a free pip". */
  note: string;
}

export function shopPreview(state: GameState, id: ShopId): ShopPreview {
  const before = bestIncomeRate(state);
  const copy: GameState = { ...state, owned: { ...state.owned, [id]: state.owned[id] + 1 } };
  const after = bestIncomeRate(copy);
  const gain = after - before;
  let note = '';
  if (id === 'hen' && state.owned.hen >= totalPips(state)) note = 'Needs a free pip to tend her.';
  else if (id === 'hen') note = 'Takes a pip off Cut Hay.';
  else if (id === 'porridge') note = 'One more pair of hands.';
  else if (id === 'basket' || id === 'barn') note = `Barn: ${barnCap(state)} → ${barnCap(copy)}.`;
  else if (id === 'rake') note = `Luck ${luck(state)} → ${luck(copy)}.`;
  else if (gain <= 0.0001) note = 'Only helps if you put pips on it.';
  return { before, after, payback: gain > 0.0001 ? shopCost(state, id) / gain : Infinity, note };
}

// ---------- Calendar & life ----------

export function yearIndex(state: GameState): number {
  return Math.floor(state.lifeTime / BALANCE.yearSeconds);
}

export function yearTime(state: GameState): number {
  return state.lifeTime - yearIndex(state) * BALANCE.yearSeconds;
}

export function season(state: GameState): string {
  const n = BALANCE.seasonNames.length;
  return BALANCE.seasonNames[Math.min(n - 1, Math.floor((yearTime(state) / BALANCE.yearSeconds) * n))] ?? '';
}

export function toMichaelmas(state: GameState): number {
  return BALANCE.yearSeconds - yearTime(state);
}

export function lifespan(state: GameState): number {
  return (BALANCE.lifeYears + state.traditions.hardy) * BALANCE.yearSeconds;
}

export function age(state: GameState): number {
  return BALANCE.startAge + yearIndex(state);
}

/** Seconds until the back goes (or until death, once it has). What the shop's "pays for itself in time?" hint uses. */
export function workingLeft(state: GameState): number {
  const backAt = BALANCE.badBackAt * lifespan(state);
  return Math.max(0, (state.lifeTime < backAt ? backAt : lifespan(state)) - state.lifeTime);
}

export function hasBadBack(state: GameState): boolean {
  return state.lifeTime >= BALANCE.badBackAt * lifespan(state);
}

export function canRetire(state: GameState): boolean {
  return !state.dead && state.yearsPaid >= 1;
}

// ---------- The Steward ----------

export function titheDue(state: GameState): Partial<Record<GoodId, number>> {
  return titheFor(state.yearsPaid, state.owned.axe > 0);
}

/** Goods the tithe basket keeps back from selling (only once you've met Gerald). */
export function reserve(state: GameState, g: GoodId): number {
  return state.basket && state.tabs.includes('manor') ? titheDue(state)[g] ?? 0 : 0;
}

export function titheProgress(state: GameState): { have: number; need: number } {
  let have = 0;
  let need = 0;
  for (const [g, n] of Object.entries(titheDue(state)) as [GoodId, number][]) {
    need += n;
    have += Math.min(n, state.goods[g]);
  }
  return { have, need };
}

/** What missing the tithe right now would cost, in pennies. */
export function titheShortfallFine(state: GameState): number {
  let fine = 0;
  for (const [g, n] of Object.entries(titheDue(state)) as [GoodId, number][]) {
    fine += Math.max(0, n - state.goods[g]) * good(g).price * BALANCE.titheFine;
  }
  return fine;
}

// ---------- The debt ----------

export function debtOwedTotal(state: GameState): number {
  return BALANCE.debtTotal + state.debtExtra;
}

export function debtLeft(state: GameState): number {
  return Math.max(0, debtOwedTotal(state) - state.debtPaid);
}

export function debtFraction(state: GameState): number {
  return Math.min(1, state.debtPaid / debtOwedTotal(state));
}

export function nextMilestone(state: GameState): { index: number; milestone: Milestone; at: number } | null {
  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i]!;
    if (!state.milestones.includes(i)) return { index: i, milestone: m, at: (m.pct / 100) * debtOwedTotal(state) };
  }
  return null;
}

/** Total Lore a family has earned for paying this much. A square root, so every penny counts but nothing snowballs. */
export function loreForPaid(paid: number): number {
  return Math.floor(Math.sqrt(Math.max(0, paid) / BALANCE.loreDivisor));
}

export function goodsBaseValue(state: GameState): number {
  return GOODS.reduce((s, g) => s + state.goods[g.id] * g.price, 0);
}

export interface PassOnPreview {
  heriot: number;
  itemSales: number;
  toDebt: number;
  lore: number;
}

/** What happens to what you leave behind: the Lord takes his heriot, and unkept belongings are sold toward the debt. */
export function passOnPreview(state: GameState, heirloomUids: number[]): PassOnPreview {
  const keep = new Set(heirloomUids.slice(0, heirloomSlots(state)));
  const heriot = BALANCE.heriot * (state.pennies + goodsBaseValue(state));
  const itemSales = allItems(state)
    .filter((i) => !keep.has(i.uid))
    .reduce((s, i) => s + itemSaleValue(i), 0);
  const toDebt = Math.min(debtLeft(state), heriot + itemSales);
  const lore = loreForPaid(state.debtPaid + toDebt) - state.loreGranted;
  return { heriot, itemSales, toDebt, lore: Math.max(0, lore) };
}

export function traditionCost(state: GameState, id: TraditionId): number {
  const def = traditionDef(id);
  return Math.ceil(def.cost * Math.pow(def.growth, state.traditions[id]));
}

// ---------- The village ----------

export function activeDemands(state: GameState): DemandDef[] {
  return DEMANDS.filter((d) => !state.demandsDone.includes(d.id) && d.when(state));
}

export function canDeliver(state: GameState, d: DemandDef): boolean {
  return (Object.entries(d.wants) as [GoodId, number][]).every(([g, n]) => state.goods[g] >= n);
}

export function contestDef(id: string): ContestDef {
  const def = CONTESTS.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown contest ${id}`);
  return def;
}

export function contestAvailable(state: GameState, c: ContestDef): boolean {
  if (c.skill === 'eggs') return state.owned.hen > 0;
  if (c.skill === 'logs') return state.owned.axe > 0;
  if (c.skill === 'tithes') return state.records.tithesMet >= 3;
  return true;
}

/** Your expected score. On the day it varies by ±20%. */
export function contestScore(state: GameState, c: ContestDef): number {
  if (c.skill === 'tithes') return 3 * state.records.tithesMet * priceMult(state);
  const chore = c.skill;
  const levels = practiceLevel(state.practice[chore]) + state.knowHow[chore];
  return 8 * levels * workBreakdown(state, chore).kit;
}

export function contestTier(state: GameState, c: ContestDef): number {
  return Math.min(c.scores.length - 1, state.contestWins[c.id] ?? 0);
}

export function contestTarget(state: GameState, c: ContestDef): number {
  return c.scores[contestTier(state, c)] ?? Infinity;
}

export function contestBeaten(state: GameState, c: ContestDef): boolean {
  return (state.contestWins[c.id] ?? 0) >= c.scores.length;
}

export function entryFee(state: GameState, c: ContestDef): number {
  return 10 * (contestTier(state, c) + 1);
}

/** Chance to beat the target given a uniform ±20% roll on the expected score. */
export function winChance(expected: number, target: number): number {
  if (expected <= 0) return 0;
  const lo = expected * 0.8;
  const hi = expected * 1.2;
  if (target <= lo) return 1;
  if (target >= hi) return 0;
  return (hi - target) / (hi - lo);
}

// ---------- Content sanity ----------

export function validateContent(): string[] {
  const problems: string[] = [];
  const itemIds = new Set(ITEMS.map((i) => i.id));
  for (const set of SETS) {
    for (const i of set.items) if (!itemIds.has(i)) problems.push(`set ${set.id} references ${i}`);
    const slots = set.items.filter((i) => itemIds.has(i)).map((i) => itemDef(i).slot);
    if (new Set(slots).size !== slots.length) problems.push(`set ${set.id} needs two items in one slot`);
  }
  for (const l of HEAP_LOOT) if (!itemIds.has(l.item)) problems.push(`heap loot ${l.item} missing`);
  for (const i of PEDDLER_STOCK) if (!itemIds.has(i)) problems.push(`peddler item ${i} missing`);
  for (const d of DEMANDS) if (d.reward.item && !itemIds.has(d.reward.item)) problems.push(`demand ${d.id} reward ${d.reward.item} missing`);
  for (const c of CONTESTS) if (c.prize.item && !itemIds.has(c.prize.item)) problems.push(`contest ${c.id} prize ${c.prize.item} missing`);
  if (new Set(STORY.map((s) => s.id)).size !== STORY.length) problems.push('duplicate story card id');
  if (new Set(TRADITIONS.map((t) => t.id)).size !== TRADITIONS.length) problems.push('duplicate tradition id');
  return problems;
}
