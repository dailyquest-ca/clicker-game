// Everything the player (or a simulator bot) can do. Each action validates itself and returns
// whether it did anything, so the UI and bots can call them freely.

import { BALANCE } from './balance';
import { CHORE_IDS, GOOD_IDS, good } from '../content/chores';
import { itemDef } from '../content/items';
import { MILESTONES } from '../content/manor';
import { shopDef, traditionDef } from '../content/shop';
import { DEATH_CAUSES, HEIR_NAMES, epitaph } from '../content/text';
import { CONTESTS, DEMANDS } from '../content/village';
import {
  SLOTS,
  activeSets,
  age,
  allItems,
  assignedPips,
  canDeliver,
  canRetire,
  contestAvailable,
  choreVisible,
  contestDef,
  contestScore,
  contestTarget,
  debtFraction,
  debtLeft,
  entryFee,
  heirloomSlots,
  idlePips,
  passOnPreview,
  practiceLevel,
  price,
  reserve,
  shopAvailable,
  shopCost,
  standingUnlocked,
  totalPips,
  traditionCost,
  yearTime,
} from './formulas';
import { pick } from './rng';
import { pushLog, resetLife, startingAssets } from './state';
import type { ChoreId, GameState, GoodId, ItemInstance, ShopId, Slot, TraditionId } from './types';

// ---------- Stamina pips ----------

export function assign(state: GameState, c: ChoreId, delta: number): boolean {
  if (delta > 0) {
    if (!choreVisible(state, c)) return false;
    const n = Math.min(Math.floor(delta), idlePips(state));
    if (n <= 0) return false;
    state.pips[c] += n;
    return true;
  }
  const n = Math.min(Math.floor(-delta), state.pips[c]);
  if (n <= 0) return false;
  state.pips[c] -= n;
  return true;
}

/** Put a whole pip split in place at once. Used by bots and the quick buttons. */
export function setPips(state: GameState, split: Partial<Record<ChoreId, number>>): void {
  for (const c of CHORE_IDS) state.pips[c] = 0;
  for (const c of CHORE_IDS) assign(state, c, split[c] ?? 0);
}

/** If you lose a pip (took off the millstone), the last-assigned chores give one back. */
export function clampPips(state: GameState): void {
  let over = assignedPips(state) - totalPips(state);
  for (const c of [...CHORE_IDS].reverse()) {
    if (over <= 0) break;
    const n = Math.min(over, state.pips[c]);
    state.pips[c] -= n;
    over -= n;
  }
}

// ---------- Market ----------

export function earn(state: GameState, pennies: number): void {
  state.pennies += pennies;
  state.earnedThisLife += pennies;
  state.records.earnedTotal += pennies;
}

export function sell(state: GameState, g: GoodId, qty: number): number {
  const n = Math.min(Math.floor(qty), state.goods[g]);
  if (n <= 0) return 0;
  const earned = n * price(state, g);
  state.goods[g] -= n;
  state.soldThisLife += n;
  state.records.soldTotal += n;
  earn(state, earned);
  return earned;
}

/** Sell everything except what the tithe basket is keeping back. */
export function sellSpare(state: GameState, g: GoodId): number {
  return sell(state, g, state.goods[g] - reserve(state, g));
}

export function sellAllSpare(state: GameState): number {
  return GOOD_IDS.reduce((s, g) => s + sellSpare(state, g), 0);
}

export function setStanding(state: GameState, g: GoodId, keep: number | null): boolean {
  if (!standingUnlocked(state)) return false;
  state.standing[g] = keep === null ? null : Math.max(0, Math.floor(keep));
  return true;
}

export function setBasket(state: GameState, on: boolean): void {
  state.basket = on;
}

// ---------- Shop ----------

export function buy(state: GameState, id: ShopId): boolean {
  if (!shopAvailable(state, id)) return false;
  const cost = shopCost(state, id);
  if (state.pennies < cost) return false;
  state.pennies -= cost;
  state.owned[id]++;
  state.records.purchases++;
  if (state.savingFor === id) state.savingFor = null;
  const def = shopDef(id);
  pushLog(state, `Bought: ${def.name}. ${def.flavor}`, 'good');
  return true;
}

export function setSavingFor(state: GameState, id: ShopId | null): void {
  state.savingFor = id;
}

// ---------- The debt ----------

export function payDebt(state: GameState, amount: number): number {
  const n = Math.min(amount, state.pennies, debtLeft(state));
  if (n <= 0) return 0;
  state.pennies -= n;
  state.debtPaid += n;
  state.paidThisLife += n;
  checkMilestones(state);
  return n;
}

export function checkMilestones(state: GameState): void {
  const pct = debtFraction(state) * 100;
  MILESTONES.forEach((m, i) => {
    if (state.milestones.includes(i) || pct < m.pct) return;
    state.milestones.push(i);
    pushLog(state, `Milestone: ${m.name}! ${m.desc}`, 'secret');
    // Starting assets arrive now, too: Gerald sends them round.
    const start = startingAssets(state);
    if (!state.dead) {
      state.owned.hen = Math.max(state.owned.hen, start.hens);
      if (start.basket) state.owned.basket = Math.max(state.owned.basket, 1);
      if (start.axe) state.owned.axe = Math.max(state.owned.axe, 1);
    }
    if (m.pct >= 100) state.flags.free = true;
  });
}

// ---------- Village ----------

export function deliver(state: GameState, id: string): boolean {
  const d = DEMANDS.find((x) => x.id === id);
  if (!d || state.demandsDone.includes(id) || !d.when(state) || !canDeliver(state, d)) return false;
  for (const [g, n] of Object.entries(d.wants) as [GoodId, number][]) state.goods[g] -= n;
  state.demandsDone.push(id);
  pushLog(state, `${d.from}: ${d.thanks}`, 'good');
  if (d.reward.pennies) earn(state, d.reward.pennies);
  if (d.reward.item) receiveItem(state, d.reward.item);
  if (d.reward.flag) state.flags[d.reward.flag] = true;
  return true;
}

export function buyPeddler(state: GameState): boolean {
  const p = state.peddler;
  if (!p || state.pennies < p.price) return false;
  if (state.inventory.length >= BALANCE.inventorySize) return false;
  state.pennies -= p.price;
  state.peddler = null;
  receiveItem(state, p.item);
  pushLog(state, 'The peddler bites your penny, nods, and is gone before you can change your mind.', 'info');
  return true;
}

export function enterFair(state: GameState): boolean {
  if (!state.fairContest || state.fairEntered || yearTime(state) >= BALANCE.fairAt) return false;
  const fee = entryFee(state, contestDef(state.fairContest));
  if (state.pennies < fee) return false;
  state.pennies -= fee;
  state.fairEntered = true;
  return true;
}

export function makeRumour(state: GameState): void {
  const g = pick(state, GOOD_IDS.filter((x) => x !== 'log' || state.owned.axe > 0));
  const mult = pick(state, [0.7, 0.8, 1.25, 1.4]);
  state.rumour = { good: g, mult };
}

export function pickContest(state: GameState): void {
  const open = CONTESTS.filter((c) => contestAvailable(state, c) && (state.contestWins[c.id] ?? 0) < c.scores.length);
  // Prefer a contest you could plausibly win this year with some practice.
  const fair = open.filter((c) => contestScore(state, c) * 1.5 + 8 >= contestTarget(state, c));
  const pool = fair.length > 0 ? fair : open;
  state.fairContest = pool.length > 0 ? pick(state, pool).id : null;
  state.fairEntered = false;
}

// ---------- Belongings ----------

function findItem(state: GameState, uid: number): { item: ItemInstance; where: 'inventory' | Slot } | null {
  const inv = state.inventory.find((i) => i.uid === uid);
  if (inv) return { item: inv, where: 'inventory' };
  for (const slot of SLOTS) {
    const eq = state.equipped[slot];
    if (eq && eq.uid === uid) return { item: eq, where: slot };
  }
  return null;
}

function discoverSets(state: GameState): void {
  for (const set of activeSets(state.equipped)) {
    if (!state.discoveredSets.includes(set.id)) {
      state.discoveredSets.push(set.id);
      pushLog(state, `Hidden set discovered: ${set.name}! ${set.flavor}`, 'secret');
    }
  }
}

export function equip(state: GameState, uid: number): boolean {
  const idx = state.inventory.findIndex((i) => i.uid === uid);
  if (idx < 0) return false;
  const item = state.inventory[idx]!;
  const slot = itemDef(item.id).slot;
  state.inventory.splice(idx, 1);
  const old = state.equipped[slot];
  if (old) state.inventory.push(old);
  state.equipped[slot] = item;
  discoverSets(state);
  clampPips(state);
  return true;
}

export function unequip(state: GameState, slot: Slot): boolean {
  const item = state.equipped[slot];
  if (!item || state.inventory.length >= BALANCE.inventorySize) return false;
  state.equipped[slot] = null;
  state.inventory.push(item);
  clampPips(state);
  return true;
}

/** Merge src into dst: dst gains src's levels + 1. */
export function merge(state: GameState, srcUid: number, dstUid: number): boolean {
  if (srcUid === dstUid) return false;
  const src = findItem(state, srcUid);
  const dst = findItem(state, dstUid);
  if (!src || !dst || src.item.id !== dst.item.id) return false;
  if (dst.item.level >= BALANCE.maxItemLevel) return false;
  dst.item.level = Math.min(BALANCE.maxItemLevel, dst.item.level + src.item.level + 1);
  if (src.where === 'inventory') state.inventory = state.inventory.filter((i) => i.uid !== srcUid);
  else state.equipped[src.where] = null;
  clampPips(state);
  return true;
}

/** Merge every duplicate into the best copy (equipped copies win ties). */
export function mergeAll(state: GameState): number {
  let merges = 0;
  const ids = new Set(state.inventory.map((i) => i.id));
  for (const id of ids) {
    const copies = allItems(state).filter((i) => i.id === id);
    if (copies.length < 2) continue;
    const best = copies.reduce((a, b) => (b.level > a.level ? b : a));
    for (const c of copies) {
      if (c.uid !== best.uid && best.level < BALANCE.maxItemLevel && merge(state, c.uid, best.uid)) merges++;
    }
  }
  return merges;
}

export function discard(state: GameState, uid: number): boolean {
  const before = state.inventory.length;
  state.inventory = state.inventory.filter((i) => i.uid !== uid);
  return state.inventory.length < before;
}

/** A new item arrives. Returns false if the sack was full and it was lost. */
export function receiveItem(state: GameState, id: string): boolean {
  const def = itemDef(id);
  state.records.itemsFound++;
  const firstTime = !state.seenItems.includes(id);
  if (firstTime) state.seenItems.push(id);
  if (state.inventory.length >= BALANCE.inventorySize) {
    pushLog(state, `Your sack is full, so the ${def.name} goes back on the heap. (Merge or bin things.)`, 'bad');
    return false;
  }
  state.inventory.push({ uid: state.nextUid++, id, level: 0 });
  pushLog(state, firstTime ? `New find: ${def.name}. "${def.flavor}"` : `Another ${def.name}. Two of a thing can be merged.`, 'loot');
  return true;
}

// ---------- Story ----------

export function dismissCard(state: GameState): boolean {
  const id = state.cardQueue.shift();
  if (!id) return false;
  if (!state.cardsSeen.includes(id)) state.cardsSeen.push(id);
  return true;
}

// ---------- The family ----------

export function buyTradition(state: GameState, id: TraditionId): boolean {
  const def = traditionDef(id);
  if (state.traditions[id] >= def.max) return false;
  const cost = traditionCost(state, id);
  if (state.lore < cost) return false;
  state.lore -= cost;
  state.traditions[id]++;
  pushLog(state, `New family tradition: ${def.name}.`, 'good');
  // The family hen turns up straight away, not just for the next Hob.
  if (id === 'familyHen' && !state.dead) state.owned.hen++;
  return true;
}

export interface PassOnResult {
  toDebt: number;
  lore: number;
}

/** Death or retirement: settle with the Lord, write the chronicle, and hand the pitchfork on. */
export function passOn(state: GameState, heirloomUids: number[]): PassOnResult | null {
  if (!state.dead && !canRetire(state)) return null;
  const retired = !state.dead;
  const preview = passOnPreview(state, heirloomUids);
  const keepIds = new Set(heirloomUids.slice(0, heirloomSlots(state)));
  const kept = allItems(state).filter((i) => keepIds.has(i.uid));

  state.debtPaid += preview.toDebt;
  state.paidThisLife += preview.toDebt;
  state.lore += preview.lore;
  state.loreGranted += preview.lore;
  for (const c of CHORE_IDS) state.knowHow[c] = Math.max(state.knowHow[c], practiceLevel(state.practice[c]));

  const finalAge = age(state);
  const line = retired
    ? epitaph('retirement, which he enjoyed for nearly a week', finalAge, Math.round(state.paidThisLife))
    : epitaph(pick(state, DEATH_CAUSES), finalAge, Math.round(state.paidThisLife));
  state.chronicle.unshift({ life: state.life, name: state.name, seconds: state.lifeTime, paid: state.paidThisLife, heriot: preview.toDebt, epitaph: line });
  if (state.chronicle.length > 40) state.chronicle.length = 40;

  checkMilestones(state);
  state.life++;
  state.name = HEIR_NAMES[Math.min(HEIR_NAMES.length - 1, state.life - 1)] ?? 'Hob';
  resetLife(state);
  for (const item of kept) {
    const slot = itemDef(item.id).slot;
    if (!state.equipped[slot]) state.equipped[slot] = item;
    else state.inventory.push(item);
  }
  if (state.life >= 2) {
    pickContest(state);
    if (!state.rumour) makeRumour(state);
  }
  // A sensible start: tend the hens, cut hay with the rest.
  const eggPips = Math.min(state.owned.hen, totalPips(state));
  setPips(state, { eggs: eggPips, hay: totalPips(state) - eggPips });
  pushLog(state, `${state.name} picks up the pitchfork. (${Math.round(preview.toDebt)}d went to the debt; +${preview.lore} Lore.)`, 'story');
  return { toDebt: preview.toDebt, lore: preview.lore };
}

export function goodName(g: GoodId, n: number): string {
  const def = good(g);
  return n === 1 ? def.name.toLowerCase() : def.plural;
}
