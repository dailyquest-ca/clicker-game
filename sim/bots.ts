// Simulated players. They use only the public actions and formulas, so they play by the same rules as a person.

import { BALANCE } from '../src/core/balance';
import { CHORES, GOOD_IDS, chore } from '../src/content/chores';
import { itemDef } from '../src/content/items';
import { TRADITIONS } from '../src/content/shop';
import {
  assign,
  buy,
  buyTradition,
  deliver,
  enterFair,
  equip,
  mergeAll,
  passOn,
  payDebt,
  sell,
  sellAllSpare,
  setPips,
  setSavingFor,
  setStanding,
} from '../src/core/actions';
import {
  SLOTS,
  activeDemands,
  allItems,
  barnCap,
  bestSplit,
  canDeliver,
  canRetire,
  choreVisible,
  contestDef,
  contestScore,
  contestTarget,
  entryFee,
  goodsCount,
  hasBadBack,
  workingLeft,
  heirloomSlots,
  itemSaleValue,
  lifespan,
  reserve,
  scaledItemStats,
  shopCost,
  shopPreview,
  shopStock,
  standingUnlocked,
  titheDue,
  toMichaelmas,
  totalPips,
  traditionCost,
  winChance,
  workMult,
  yearTime,
} from '../src/core/formulas';
import type { Bonuses, ChoreId, GameState, GoodId, ItemInstance, ShopId, TraditionId } from '../src/core/types';

export interface Bot {
  name: string;
  /** Seconds of game time between decisions. */
  interval: number;
  act(state: GameState): void;
  /** The shop item the bot is saving for right now, if any (for the drowning metric). */
  target?: ShopId | null;
}

const SMART_TRADITIONS: TraditionId[] = ['knack', 'gab', 'familyHen', 'shoulders', 'contacts', 'hardy', 'sentimental'];
const GOOD_CHORE: Record<GoodId, ChoreId> = { hay: 'hay', egg: 'eggs', log: 'logs' };

// ---------- shared helpers ----------

/** Rough income value of an item's stats, for picking what to wear. */
function itemScore(state: GameState, item: ItemInstance): number {
  const s = scaledItemStats(item) as Partial<Bonuses>;
  const split = bestSplit(state);
  const pips = totalPips(state) || 1;
  const share = (c: ChoreId) => split[c] / pips;
  return (
    (s.hayPct ?? 0) * share('hay') +
    (s.eggPct ?? 0) * share('eggs') * 2 +
    (s.logPct ?? 0) * share('logs') * 3 +
    (s.workPct ?? 0) * 1.5 +
    (s.pricePct ?? 0) * 1.5 +
    (s.pips ?? 0) * 25 +
    (s.luckPct ?? 0) * 0.1 +
    (s.barn ?? 0) * 0.1 +
    (s.rummagePct ?? 0) * 0.05
  );
}

function wearBest(state: GameState): void {
  mergeAll(state);
  for (const slot of SLOTS) {
    const candidates = allItems(state).filter((i) => itemDef(i.id).slot === slot);
    if (candidates.length === 0) continue;
    const best = candidates.reduce((a, b) => (itemScore(state, b) > itemScore(state, a) ? b : a));
    if (state.equipped[slot]?.uid !== best.uid) equip(state, best.uid);
  }
}

/** Goods to stockpile for villagers' demands, skipping any that won't fit in the barn alongside the tithe. */
function demandNeeds(state: GameState): Record<GoodId, number> {
  const need: Record<GoodId, number> = { hay: 0, egg: 0, log: 0 };
  const tithe = Object.values(titheDue(state)).reduce((s, n) => s + (n ?? 0), 0);
  let room = barnCap(state) - tithe - 5;
  for (const d of activeDemands(state)) {
    const total = Object.values(d.wants).reduce((s, n) => s + (n ?? 0), 0);
    if (total > room) continue;
    room -= total;
    for (const [g, n] of Object.entries(d.wants) as [GoodId, number][]) need[g] += n;
  }
  return need;
}

function bestHeirlooms(state: GameState): number[] {
  return allItems(state)
    .sort((a, b) => itemScore(state, b) - itemScore(state, a) || itemSaleValue(b) - itemSaleValue(a))
    .slice(0, heirloomSlots(state))
    .map((i) => i.uid);
}

function spendLore(state: GameState, order: TraditionId[]): void {
  for (let guard = 0; guard < 50; guard++) {
    const affordable = order.filter((id) => {
      const def = TRADITIONS.find((t) => t.id === id)!;
      return state.traditions[id] < def.max && traditionCost(state, id) <= state.lore;
    });
    const pickId = affordable[0];
    if (!pickId || !buyTradition(state, pickId)) return;
  }
}

/** Pips needed on a chore to make `n` more goods in `seconds`. */
function pipsFor(state: GameState, c: ChoreId, n: number, seconds: number): number {
  if (n <= 0) return 0;
  const perPip = (BALANCE.pipWork * workMult(state, c)) / chore(c).work;
  return Math.ceil(n / (perPip * Math.max(10, seconds)));
}

// ---------- the bots ----------

export interface SmartOptions {
  /** Hold all pennies till death and let the heriot pay (an exploit to check). */
  hoard?: boolean;
  /** Never sell goods (another exploit to check). */
  neverSell?: boolean;
  /** Retire as soon as the back goes. */
  retireEarly?: boolean;
  /** Sell everything just before this Michaelmas (1-based) to force a missed tithe. */
  forceMissYear?: number;
}

/** Plays like a thoughtful person: plans for the tithe, buys what pays back fastest, pays the debt late. */
export function smartBot(opts: SmartOptions = {}): Bot {
  const bot: Bot = {
    name: opts.hoard ? 'hoarder' : opts.neverSell ? 'never-sell' : opts.retireEarly ? 'retire-early' : opts.forceMissYear ? 'forced-miss' : 'smart',
    interval: 1,
    target: null,
    act(state) {
      if (state.dead || (opts.retireEarly && hasBadBack(state) && canRetire(state))) {
        if (!state.dead) payDebt(state, state.pennies);
        passOn(state, bestHeirlooms(state));
        spendLore(state, SMART_TRADITIONS);
        return;
      }
      wearBest(state);
      for (const d of activeDemands(state)) if (canDeliver(state, d)) deliver(state, d.id);

      // Pips: cover the tithe and any demands first, then chase income.
      const due = titheDue(state);
      const demand = demandNeeds(state);
      const split = { hay: 0, eggs: 0, logs: 0, rummage: 0 } as Record<ChoreId, number>;
      let free = totalPips(state);
      for (const g of GOOD_IDS) {
        const c = GOOD_CHORE[g];
        if (!choreVisible(state, c)) continue;
        const short = Math.max(0, (due[g] ?? 0) - state.goods[g]);
        const extra = Math.max(0, demand[g] - Math.max(0, state.goods[g] - (due[g] ?? 0)));
        let n = Math.max(pipsFor(state, c, short * 1.15, toMichaelmas(state) - 5), pipsFor(state, c, extra, 150));
        if (c === 'eggs') n = Math.min(n, state.owned.hen);
        n = Math.min(n, free);
        split[c] += n;
        free -= n;
      }
      const best = bestSplit({ ...state, owned: { ...state.owned } });
      for (const c of CHORES.map((x) => x.id)) {
        const want = Math.max(0, best[c] - split[c]);
        const room = c === 'eggs' ? Math.max(0, state.owned.hen - split.eggs) : want;
        const n = Math.min(want, room, free);
        split[c] += n;
        free -= n;
      }
      if (free > 0 && state.life > 1) split.rummage += Math.min(free, 1);
      if (free > 0) split.hay += free;
      setPips(state, split);

      // Selling.
      if (opts.forceMissYear && state.yearsPaid === opts.forceMissYear - 1 && toMichaelmas(state) < 3) {
        for (const g of GOOD_IDS) setStanding(state, g, null);
        state.basket = false;
        sellAllSpare(state);
        state.basket = true;
      } else if (!opts.neverSell) {
        if (standingUnlocked(state)) for (const g of GOOD_IDS) setStanding(state, g, demand[g]);
        else for (const g of GOOD_IDS) if (state.goods[g] > (due[g] ?? 0) + demand[g]) sellSpareKeeping(state, g, demand[g]);
      }

      // The fair.
      if (state.fairContest && !state.fairEntered && yearTime(state) < BALANCE.fairAt) {
        const c = contestDef(state.fairContest);
        if (winChance(contestScore(state, c), contestTarget(state, c)) >= 0.6 && state.pennies >= entryFee(state, c) * 3) enterFair(state);
      }

      // Spending: the best payback that will repay well before the end of this life, else the debt.
      const left = lifespan(state) - state.lifeTime;
      let bestId: ShopId | null = null;
      let bestPayback = Infinity;
      for (const id of shopStock(state)) {
        const p = shopPreview(state, id);
        let payback = p.payback;
        if (id === 'basket' || id === 'barn') payback = goodsCount(state) >= barnCap(state) * 0.8 ? shopCost(state, id) / 0.3 : Infinity;
        if (payback < bestPayback) {
          bestPayback = payback;
          bestId = id;
        }
      }
      if (bestId && bestPayback < left) {
        bot.target = bestId;
        setSavingFor(state, bestId);
        if (buy(state, bestId)) bot.target = null;
      } else {
        bot.target = null;
        if (!opts.hoard) payDebt(state, Math.max(0, state.pennies - 30));
      }
      // The last year: everything goes to the debt (the heriot only pays half).
      if (!opts.hoard && left < BALANCE.yearSeconds) payDebt(state, state.pennies);
    },
  };
  return bot;
}

function sellSpareKeeping(state: GameState, g: GoodId, keep: number): void {
  sell(state, g, state.goods[g] - reserve(state, g) - keep);
}

/** Plays like someone who doesn't read: even pip split, buys the cheapest thing, sells everything now and then. */
export function naiveBot(): Bot {
  let lastSell = 0;
  return {
    name: 'naive',
    interval: 2,
    act(state) {
      if (state.dead) {
        passOn(state, []);
        spendLore(state, TRADITIONS.map((t) => t.id).sort((a, b) => traditionCost(state, a) - traditionCost(state, b)));
        return;
      }
      const visible = CHORES.filter((c) => choreVisible(state, c.id) && c.good).map((c) => c.id);
      const each = Math.floor(totalPips(state) / visible.length);
      const split: Partial<Record<ChoreId, number>> = {};
      for (const c of visible) split[c] = each;
      setPips(state, split);
      assign(state, 'hay', totalPips(state));
      if (state.totalTime - lastSell >= 20) {
        sellAllSpare(state);
        lastSell = state.totalTime;
      }
      for (const d of activeDemands(state)) if (canDeliver(state, d)) deliver(state, d.id);
      for (const e of allItems(state)) if (!state.equipped[itemDef(e.id).slot]) equip(state, e.uid);
      // Follows the story cards' advice: once the back goes, everything goes to the debt.
      if (hasBadBack(state)) {
        payDebt(state, state.pennies);
        return;
      }
      const cheapest = shopStock(state)[0];
      if (cheapest) buy(state, cheapest);
    },
  };
}

/**
 * Plays like an attentive person who trusts the UI: uses the best pip split, buys whatever the shop says pays back fastest,
 * relies on the tithe basket instead of planning, and pays everything once the back goes.
 */
export function casualBot(): Bot {
  return {
    name: 'casual',
    interval: 5,
    act(state) {
      if (state.dead) {
        passOn(state, bestHeirlooms(state));
        spendLore(state, TRADITIONS.map((t) => t.id).sort((a, b) => traditionCost(state, a) - traditionCost(state, b)));
        return;
      }
      wearBest(state);
      const split = bestSplit(state);
      // Keep one pip on hay for Gerald.
      if (split.hay === 0) {
        const from = split.logs > 0 ? 'logs' : 'eggs';
        if (split[from] > 0) {
          split[from]--;
          split.hay++;
        }
      }
      setPips(state, split);
      if (standingUnlocked(state)) for (const g of GOOD_IDS) setStanding(state, g, 0);
      else sellAllSpare(state);
      for (const d of activeDemands(state)) if (canDeliver(state, d)) deliver(state, d.id);
      if (hasBadBack(state)) {
        payDebt(state, state.pennies);
        return;
      }
      // The shop says whether something pays for itself before the back goes; if nothing does, pay the debt.
      const options = shopStock(state)
        .map((id) => ({ id, payback: shopPreview(state, id).payback }))
        .filter((o) => o.payback < workingLeft(state))
        .sort((a, b) => a.payback - b.payback);
      if (options[0]) buy(state, options[0].id);
      else payDebt(state, state.pennies);
    },
  };
}

/** Checks in once a minute and buys whatever it can. Used to measure "drowning": how much is affordable at each visit. */
export function lazyBot(visits: number[]): Bot {
  return {
    name: 'lazy',
    interval: 60,
    act(state) {
      if (state.dead) {
        passOn(state, []);
        return;
      }
      setPips(state, bestSplit(state));
      if (standingUnlocked(state)) for (const g of GOOD_IDS) setStanding(state, g, 0);
      sellAllSpare(state);
      for (const d of activeDemands(state)) if (canDeliver(state, d)) deliver(state, d.id);
      let bought = 0;
      for (let guard = 0; guard < 20; guard++) {
        const cheapest = shopStock(state)[0];
        if (!cheapest || !buy(state, cheapest)) break;
        bought++;
      }
      visits.push(bought);
    },
  };
}

