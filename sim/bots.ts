// Bot strategies that play the real rules. They exist to answer one question:
// do smart choices actually beat naive ones, and is any single strategy "solved"?

import { BOSSES } from '../src/content/bosses';
import { CHORES } from '../src/content/chores';
import { itemDef } from '../src/content/items';
import { PERKS, UPGRADES } from '../src/content/upgrades';
import { ZONES } from '../src/content/zones';
import {
  buyPerk,
  buyUpgrade,
  discard,
  dismissFight,
  equip,
  mergeAll,
  rebirth,
  setSplit,
  setZone,
  startFight,
  zoneUnlocked,
} from '../src/core/actions';
import { BALANCE } from '../src/core/balance';
import {
  canRebirth,
  choreCost,
  choreEfficiency,
  choreUnlocked,
  computeStats,
  damageTaken,
  inventorySize,
  memoryRate,
  perkCost,
  predictFight,
  previewStats,
  scaledItemStats,
  upgradeCost,
  type Stats,
} from '../src/core/formulas';
import type { ChoreId, GameState, PerkId, Stat, UpgradeId } from '../src/core/types';

export interface Bot {
  name: string;
  act(state: GameState): void;
}

// ---------- shared helpers ----------

function bestChoreFor(state: GameState, stat: Stat): ChoreId | null {
  let best: ChoreId | null = null;
  let bestEff = -1;
  for (const def of CHORES) {
    if (def.stat !== stat || !choreUnlocked(state, def)) continue;
    const eff = choreEfficiency(state, def);
    if (eff > bestEff) {
      bestEff = eff;
      best = def.id;
    }
  }
  return best;
}

function splitByStat(state: GameState, powerShare: number): void {
  const p = bestChoreFor(state, 'power');
  const g = bestChoreFor(state, 'guard');
  const fractions: Partial<Record<ChoreId, number>> = {};
  if (p) fractions[p] = powerShare;
  if (g) fractions[g] = (fractions[g] ?? 0) + (1 - powerShare);
  setSplit(state, fractions);
}

/** log(time-to-die / time-to-kill) for the next boss: positive means you'd win. */
function bossMargin(stats: Stats, state: GameState): number {
  const boss = BOSSES[state.bossesBeaten];
  if (!boss) return 0;
  const p = predictFight(stats, boss);
  const timeoutPenalty = p.ttk > BALANCE.fightTimeout ? Math.log(BALANCE.fightTimeout / p.ttk) : 0;
  return Math.log(Math.max(1e-9, p.ttd) / Math.max(1e-9, p.ttk)) + timeoutPenalty;
}

function tryFight(state: GameState): void {
  if (state.fight?.result) dismissFight(state);
  const boss = BOSSES[state.bossesBeaten];
  if (!boss || state.fight) return;
  if (predictFight(computeStats(state), boss).win) startFight(state);
}

function zoneGoldRate(zone: number, stats: Stats): number {
  const z = ZONES[zone];
  if (!z) return 0;
  const net = damageTaken(z.atk, stats.guard) - (BALANCE.adventureRegenPct / 100) * stats.maxHp;
  let alive = 1;
  if (net > 0) {
    const aliveTime = stats.maxHp / net;
    alive = aliveTime / (aliveTime + stats.recovery);
  }
  const kps = (alive * stats.power) / z.hp;
  const dropValue = Math.min(0.95, z.dropChance * stats.dropMult) * (zone + 1) * 40;
  return kps * (z.gold * stats.goldMult + dropValue);
}

function aliveFraction(zone: number, stats: Stats): number {
  const z = ZONES[zone];
  if (!z) return 0;
  const net = damageTaken(z.atk, stats.guard) - (BALANCE.adventureRegenPct / 100) * stats.maxHp;
  if (net <= 0) return 1;
  const aliveTime = stats.maxHp / net;
  return aliveTime / (aliveTime + stats.recovery);
}

function itemScoreFlat(id: string, level: number): number {
  const s = scaledItemStats({ uid: 0, id, level });
  return (s.powerFlat ?? 0) + (s.guardFlat ?? 0);
}

function manageItemsSimple(state: GameState): void {
  mergeAll(state);
  for (const item of [...state.inventory]) {
    const slot = itemDef(item.id).slot;
    const cur = state.equipped[slot];
    if (!cur || itemScoreFlat(item.id, item.level) > itemScoreFlat(cur.id, cur.level)) equip(state, item.uid);
  }
  while (state.inventory.length >= inventorySize(state) - 1) {
    const worst = [...state.inventory].sort((a, b) => itemScoreFlat(a.id, a.level) - itemScoreFlat(b.id, b.level))[0];
    if (!worst) break;
    discard(state, worst.uid);
  }
}

function manageItemsSmart(state: GameState): void {
  mergeAll(state);
  // Equip whatever improves the next-boss margin (plus a little credit for gold and drops).
  const value = (s: Stats) => bossMargin(s, state) + 0.15 * Math.log(s.goldMult) + 0.05 * Math.log(s.dropMult);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 20) {
    improved = false;
    const baseValue = value(computeStats(state));
    let bestUid = -1;
    let bestGain = 1e-6;
    for (const item of state.inventory) {
      const { after } = previewStats(state, (s) => {
        s.equipped[itemDef(item.id).slot] = item;
      });
      const gain = value(after) - baseValue;
      if (gain > bestGain) {
        bestGain = gain;
        bestUid = item.uid;
      }
    }
    if (bestUid >= 0) {
      equip(state, bestUid);
      improved = true;
    }
  }
  while (state.inventory.length >= inventorySize(state) - 1) {
    const worst = [...state.inventory].sort((a, b) => itemScoreFlat(a.id, a.level) - itemScoreFlat(b.id, b.level))[0];
    if (!worst) break;
    discard(state, worst.uid);
  }
}

function buyCheapestUpgrade(state: GameState): void {
  let bought = true;
  while (bought) {
    bought = false;
    const sorted = [...UPGRADES].sort((a, b) => upgradeCost(a, state.upgrades[a.id]) - upgradeCost(b, state.upgrades[b.id]));
    for (const up of sorted) if (buyUpgrade(state, up.id)) bought = true;
  }
}

function buyCheapestPerks(state: GameState): void {
  let bought = true;
  while (bought) {
    bought = false;
    const sorted = [...PERKS]
      .filter((p) => state.perks[p.id] < p.maxLevel)
      .sort((a, b) => perkCost(a, state.perks[a.id]) - perkCost(b, state.perks[b.id]));
    const first = sorted[0];
    if (first && buyPerk(state, first.id)) bought = true;
  }
}

class StuckTimer {
  private lastBosses = -1;
  private since = 0;
  stuckFor(state: GameState): number {
    if (state.bossesBeaten !== this.lastBosses || state.lifeTime < this.since) {
      this.lastBosses = state.bossesBeaten;
      this.since = state.lifeTime;
    }
    return state.lifeTime - this.since;
  }
}

// ---------- bots ----------

/** Puts everything in whichever chore is cheapest right now; buys whatever is cheapest; rebirths only when stuck for 10 minutes. */
export function naiveBot(): Bot {
  const stuck = new StuckTimer();
  return {
    name: 'naive',
    act(state) {
      const cheapest = CHORES.filter((d) => choreUnlocked(state, d)).sort(
        (a, b) => choreCost(a, state.chores[a.id].level, state.rebirths) - choreCost(b, state.chores[b.id].level, state.rebirths),
      )[0];
      if (cheapest) setSplit(state, { [cheapest.id]: 1 });
      tryFight(state);
      const top = [2, 1, 0].find((z) => zoneUnlocked(state, z));
      if (top !== undefined) setZone(state, top);
      buyCheapestUpgrade(state);
      manageItemsSimple(state);
      if (canRebirth(state) && stuck.stuckFor(state) > 600) {
        rebirth(state);
        buyCheapestPerks(state);
      }
    },
  };
}

/** Fixed Power/Guard split forever. Used to check that no single split is best for every boss. */
export function fixedSplitBot(powerShare: number): Bot {
  const stuck = new StuckTimer();
  return {
    name: `fixed ${Math.round(powerShare * 100)}/${Math.round((1 - powerShare) * 100)}`,
    act(state) {
      splitByStat(state, powerShare);
      tryFight(state);
      const top = [2, 1, 0].find((z) => zoneUnlocked(state, z));
      if (top !== undefined) setZone(state, top);
      buyCheapestUpgrade(state);
      manageItemsSimple(state);
      if (canRebirth(state) && stuck.stuckFor(state) > 300) {
        rebirth(state);
        buyCheapestPerks(state);
      }
    },
  };
}

/** Reads the numbers the UI shows: targets the next boss's weakness, farms the best zone, buys the best value, rebirths near peak Memories/min. */
export interface SmartOptions {
  split: 'archetype' | number;
  upgrades: 'value' | 'cheapest';
  items: 'smart' | 'simple';
  zone: 'rate' | 'top' | 'topSafe';
  /** Rebirth when Memories/min has fallen this far below its peak this life. */
  rebirthBelowPeak: number;
}

export function smartBot(opts: Partial<SmartOptions> = {}): Bot {
  const o: SmartOptions = { split: 'archetype', upgrades: 'cheapest', items: 'smart', zone: 'topSafe', rebirthBelowPeak: 0.95, ...opts };
  const PERK_ORDER: PerkId[] = ['habit', 'strongBack', 'thickSkin', 'secondWind', 'deepLungs', 'autoMerge', 'magpie', 'packMule', 'connections'];
  return {
    name: `smart ${JSON.stringify(o)}`,
    act(state) {
      const stats = computeStats(state);

      // 1. Stamina: read the next boss's archetype (the UI shows it) and lean that way.
      const next = BOSSES[state.bossesBeaten];
      const share =
        typeof o.split === 'number' ? o.split : !next ? 0.55 : next.archetype === 'Tanky' ? 0.68 : next.archetype === 'Hard hitter' ? 0.42 : 0.55;
      splitByStat(state, share);

      tryFight(state);

      // 2. Adventure: farm the zone with the best gold-and-loot rate, not just the hardest one.
      let bestZone: number | null = null;
      let bestRate = 0;
      for (let z = 0; z < ZONES.length; z++) {
        if (!zoneUnlocked(state, z)) continue;
        const rate = zoneGoldRate(z, stats);
        if (rate > bestRate) {
          bestRate = rate;
          bestZone = z;
        }
      }
      if (o.zone === 'top') bestZone = [2, 1, 0].find((z) => zoneUnlocked(state, z)) ?? null;
      // Loot is the real prize: farm the hardest zone you can stay alive in most of the time.
      if (o.zone === 'topSafe') bestZone = [2, 1, 0].find((z) => zoneUnlocked(state, z) && aliveFraction(z, stats) >= 0.5) ?? ([0].find((z) => zoneUnlocked(state, z)) ?? null);
      if (bestZone !== null) setZone(state, bestZone);

      // 3. Market: best value per gold.
      if (o.upgrades === 'cheapest') buyCheapestUpgrade(state);
      for (let i = 0; i < 20 && o.upgrades === 'value'; i++) {
        let pick: UpgradeId | null = null;
        let pickScore = 0;
        for (const up of UPGRADES) {
          const cost = upgradeCost(up, state.upgrades[up.id]);
          if (cost > state.gold) continue;
          const { before, after } = previewStats(state, (s) => {
            s.upgrades[up.id]++;
          });
          let value = Math.max(0, bossMargin(after, state) - bossMargin(before, state));
          value += 0.6 * Math.log(after.cap / before.cap);
          value += (state.lifeTime < 180 ? 0.5 : 0.1) * Math.log(after.regen / before.regen);
          if (state.adventure.zone !== null) value += 0.3 * Math.log(after.goldMult / before.goldMult) + 0.1 * Math.log(after.dropMult / before.dropMult);
          const score = value / cost;
          if (score > pickScore) {
            pickScore = score;
            pick = up.id;
          }
        }
        if (!pick || !buyUpgrade(state, pick)) break;
      }

      if (o.items === 'smart') manageItemsSmart(state);
      else manageItemsSimple(state);

      // 4. Rebirth once Memories per minute (after the age factor) has clearly peaked and the next boss isn't close.
      if (canRebirth(state) && state.lifeTime > 60) {
        const rate = memoryRate(state);
        const nb = BOSSES[state.bossesBeaten];
        const p = nb ? predictFight(stats, nb) : null;
        const close = p ? p.ttk < p.ttd * 1.25 && p.ttk < BALANCE.fightTimeout * 1.25 : false;
        if (rate < state.life.peakRate * o.rebirthBelowPeak && !close) {
          rebirth(state);
          for (let i = 0; i < 50; i++) {
            const affordable = PERK_ORDER.filter((id) => {
              const def = PERKS.find((p) => p.id === id)!;
              return state.perks[id] < def.maxLevel && perkCost(def, state.perks[id]) <= state.memories;
            });
            const first = affordable.find((id) => id === 'habit' || id === 'autoMerge') ??
              affordable.sort((a, b) => perkCost(PERKS.find((p) => p.id === a)!, state.perks[a]) - perkCost(PERKS.find((p) => p.id === b)!, state.perks[b]))[0];
            if (!first || !buyPerk(state, first)) break;
          }
        }
      }
    },
  };
}
