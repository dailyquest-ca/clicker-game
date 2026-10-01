// Everything the player (or a simulator bot) can do. Each action validates itself and returns
// whether it did anything, so the UI and bots can call them freely.

import { BALANCE } from './balance';
import { BOSSES } from '../content/bosses';
import { CHORES, chore } from '../content/chores';
import { MAX_ITEM_LEVEL, itemDef } from '../content/items';
import { DEATH_CAUSES, epitaph } from '../content/text';
import { PERKS, UPGRADES, perkDef, upgradeDef } from '../content/upgrades';
import { ZONES } from '../content/zones';
import { checkAchievements, unlockAchievement } from './achievements';
import {
  SLOTS,
  activeSets,
  ageYears,
  canRebirth,
  choreUnlocked,
  computeStats,
  connectionsGold,
  inventorySize,
  memoriesIfRebirth,
  perkCost,
  upgradeCost,
} from './formulas';
import { pick } from './rng';
import { pushLog, resetLife } from './state';
import type { ChoreId, GameState, ItemInstance, PerkId, Slot, UpgradeId } from './types';

// ---------- Stamina ----------

export function assign(state: GameState, id: ChoreId, amount: number): boolean {
  const def = chore(id);
  if (amount > 0) {
    if (!choreUnlocked(state, def)) return false;
    const moved = Math.min(amount, state.stamina.idle);
    if (moved <= 0) return false;
    state.stamina.idle -= moved;
    state.stamina.assigned[id] += moved;
    return true;
  }
  const moved = Math.min(-amount, state.stamina.assigned[id]);
  if (moved <= 0) return false;
  state.stamina.assigned[id] -= moved;
  state.stamina.idle += moved;
  return true;
}

export function unassignAll(state: GameState): void {
  for (const def of CHORES) assign(state, def.id, -state.stamina.assigned[def.id]);
}

/** Put a whole stamina split in place at once (fractions of total stamina). Used by bots and the quick-split buttons. */
export function setSplit(state: GameState, fractions: Partial<Record<ChoreId, number>>): void {
  unassignAll(state);
  const total = state.stamina.idle;
  for (const def of CHORES) {
    const f = fractions[def.id] ?? 0;
    if (f > 0 && choreUnlocked(state, def)) assign(state, def.id, total * f);
  }
}

// ---------- Fights ----------

export function startFight(state: GameState): boolean {
  if (state.fight && state.fight.result === null) return false;
  const boss = BOSSES[state.bossesBeaten];
  if (!boss) return false;
  const stats = computeStats(state);
  state.fight = { boss: state.bossesBeaten, bossHp: boss.hp, hp: stats.maxHp, maxHp: stats.maxHp, t: 0, result: null, dealt: 0 };
  state.life.fightsStarted++;
  return true;
}

export function dismissFight(state: GameState): void {
  if (state.fight && state.fight.result !== null) state.fight = null;
}

export function onBossDefeated(state: GameState, index: number): void {
  const boss = BOSSES[index];
  if (!boss) return;
  const stats = computeStats(state);
  const gold = boss.gold * stats.goldMult;
  state.gold += gold;
  state.records.totalGold += gold;
  state.bossesBeaten = index + 1;
  state.life.bossTimes[index] = state.lifeTime;
  const firstTimeEver = state.records.firstReach[index] === undefined;
  if (firstTimeEver) state.records.firstReach[index] = state.totalTime;
  state.records.bestBossEver = Math.max(state.records.bestBossEver, index + 1);
  pushLog(state, `You beat ${boss.name}! ${boss.defeat} (+${Math.round(gold)} gold)`, 'good');

  const unlockFeature = (key: 'market' | 'adventure' | 'rebirth', text: string) => {
    if (!state.unlocked[key]) {
      state.unlocked[key] = true;
      pushLog(state, text, 'good');
    }
  };
  if (index === 0) unlockFeature('market', 'New: the Market. Spend gold on upgrades (they reset when you die).');
  if (index === 1) unlockFeature('adventure', 'New: Adventure. Fight things in the Barnyard for gold and loot.');
  if (index === 2) unlockFeature('rebirth', 'New: Rebirth. Die on purpose, keep Memories, come back stronger.');
  for (const zone of ZONES) {
    if (firstTimeEver && zone.unlockBoss === index + 1 && index > 1) pushLog(state, `New zone open: ${zone.name}.`, 'good');
  }
  if (index === 2 && state.lifeTime <= 180) unlockAchievement(state, 'speedrun');
  if (index === BOSSES.length - 1) unlockAchievement(state, 'bailiff');
}

// ---------- Adventure ----------

export function zoneUnlocked(state: GameState, zone: number): boolean {
  const def = ZONES[zone];
  return !!def && state.unlocked.adventure && state.bossesBeaten >= def.unlockBoss;
}

export function setZone(state: GameState, zone: number | null): boolean {
  if (zone === null) {
    state.adventure.zone = null;
    return true;
  }
  if (!zoneUnlocked(state, zone)) return false;
  const def = ZONES[zone];
  if (!def) return false;
  if (state.adventure.zone === zone) return false;
  state.adventure.zone = zone;
  state.adventure.enemy = pick(state, def.enemies);
  state.adventure.enemyHp = def.hp;
  return true;
}

// ---------- Items ----------

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
  return true;
}

export function unequip(state: GameState, slot: Slot): boolean {
  const item = state.equipped[slot];
  if (!item || state.inventory.length >= inventorySize(state)) return false;
  state.equipped[slot] = null;
  state.inventory.push(item);
  return true;
}

/** Merge src into dst. Levels stack (NGU-style): dst gains src's levels + 1. */
export function merge(state: GameState, srcUid: number, dstUid: number): boolean {
  if (srcUid === dstUid) return false;
  const src = findItem(state, srcUid);
  const dst = findItem(state, dstUid);
  if (!src || !dst || src.item.id !== dst.item.id) return false;
  if (dst.item.level >= MAX_ITEM_LEVEL) return false;
  dst.item.level = Math.min(MAX_ITEM_LEVEL, dst.item.level + src.item.level + 1);
  if (src.where === 'inventory') state.inventory = state.inventory.filter((i) => i.uid !== srcUid);
  else state.equipped[src.where] = null;
  return true;
}

/** Merge every duplicate into the best copy (equipped copies win ties). */
export function mergeAll(state: GameState): number {
  let merges = 0;
  const ids = new Set(state.inventory.map((i) => i.id));
  for (const id of ids) {
    const copies = [
      ...SLOTS.map((s) => state.equipped[s]).filter((i): i is ItemInstance => !!i && i.id === id),
      ...state.inventory.filter((i) => i.id === id),
    ];
    if (copies.length < 2) continue;
    const best = copies.reduce((a, b) => (b.level > a.level ? b : a));
    for (const c of copies) {
      if (c.uid !== best.uid && best.level < MAX_ITEM_LEVEL && merge(state, c.uid, best.uid)) merges++;
    }
  }
  return merges;
}

export function discard(state: GameState, uid: number): boolean {
  const before = state.inventory.length;
  state.inventory = state.inventory.filter((i) => i.uid !== uid);
  return state.inventory.length < before;
}

/** A new item arrives (loot drop). Returns false if the sack was full and it was lost. */
export function receiveItem(state: GameState, id: string): boolean {
  const def = itemDef(id);
  state.records.itemsFound++;
  const fresh: ItemInstance = { uid: state.nextUid++, id, level: 0 };
  const firstTime = !state.seenItems.includes(id);
  if (firstTime) state.seenItems.push(id);

  if (state.perks.autoMerge > 0) {
    const copies = [
      ...SLOTS.map((s) => state.equipped[s]).filter((i): i is ItemInstance => !!i && i.id === id),
      ...state.inventory.filter((i) => i.id === id),
    ].filter((i) => i.level < MAX_ITEM_LEVEL);
    const best = copies.sort((a, b) => b.level - a.level)[0];
    if (best) {
      best.level = Math.min(MAX_ITEM_LEVEL, best.level + 1);
      return true;
    }
  }
  if (state.inventory.length >= inventorySize(state)) {
    const last = state.life.sackFullNotice ?? -Infinity;
    if (state.totalTime - last >= 60) {
      state.life.sackFullNotice = state.totalTime;
      pushLog(state, `Your sack is full. ${state.adventure.enemy || 'Something'} keeps the ${def.name}. (Merge or bin things.)`, 'bad');
    }
    return false;
  }
  state.inventory.push(fresh);
  if (firstTime) pushLog(state, `New find: ${def.name}. "${def.flavor}"`, 'loot');
  return true;
}

// ---------- Market & perks ----------

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (!state.unlocked.market) return false;
  const cost = upgradeCost(upgradeDef(id), state.upgrades[id]);
  if (state.gold < cost) return false;
  state.gold -= cost;
  state.upgrades[id]++;
  return true;
}

export function buyPerk(state: GameState, id: PerkId): boolean {
  const def = perkDef(id);
  const level = state.perks[id];
  if (level >= def.maxLevel) return false;
  const cost = perkCost(def, level);
  if (state.memories < cost) return false;
  state.memories -= cost;
  state.perks[id]++;
  return true;
}

// ---------- Rebirth ----------

export function rebirth(state: GameState): number {
  if (!canRebirth(state)) return 0;
  const gain = memoriesIfRebirth(state);
  const cause = pick(state, DEATH_CAUSES);
  const age = ageYears(state.lifeTime);
  const finalStats = computeStats(state);
  state.chronicle.unshift({
    life: state.rebirths + 1,
    seconds: state.lifeTime,
    bosses: state.bossesBeaten,
    memories: gain,
    power: finalStats.power,
    guard: finalStats.guard,
    epitaph: epitaph(cause, age, state.bossesBeaten),
  });
  if (state.chronicle.length > 30) state.chronicle.length = 30;
  state.memories += gain;
  state.records.memoriesEarned += gain;
  state.rebirths++;
  const gold = connectionsGold(state.perks.connections);
  resetLife(state, gold);
  pushLog(state, `You died of ${cause}, aged ${age}. You are born again, a serf, but you remember things. (+${gain} Memories)`, 'good');
  pushLog(state, `Muscle memory: chores now cost ${Math.round((1 - Math.pow(BALANCE.muscleMemory, state.rebirths)) * 100)}% less.`, 'info');
  checkAchievements(state);
  return gain;
}

export const ALL_UPGRADES = UPGRADES.map((u) => u.id);
export const ALL_PERKS = PERKS.map((p) => p.id);
