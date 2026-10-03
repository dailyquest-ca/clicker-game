import { BALANCE } from './balance';
import { CHORES, GOOD_IDS, good } from '../content/chores';
import { HEAP_LOOT, PEDDLER_STOCK, itemDef } from '../content/items';
import { STORY } from '../content/story';
import { AMBIENT_LINES, PRACTICE_LINES } from '../content/text';
import { earn, makeRumour, pickContest, receiveItem, sell } from './actions';
import {
  barnCap,
  batchRate,
  contestDef,
  contestScore,
  contestTarget,
  effectivePips,
  goodsCount,
  hasBadBack,
  lifespan,
  luck,
  practiceLevel,
  price,
  reserve,
  standingUnlocked,
  titheDue,
} from './formulas';
import { nextRandom, pick, pickWeighted } from './rng';
import { pushLog } from './state';
import type { ChoreId, GameState, GoodId } from './types';

/** Advance the game by dt seconds. Pure rules: no browser, no wall clock. Story cards pause time in the UI, not here. */
export function step(state: GameState, dt: number): void {
  if (state.dead) return;
  const before = state.lifeTime;
  state.totalTime += dt;
  state.lifeTime += dt;

  produce(state, dt);
  standingOrders(state);
  calendar(state, before);
  checkCards(state);

  if (nextRandom(state) < dt / 90) pushLog(state, pick(state, AMBIENT_LINES), 'info');
}

/** Run time forward in coarse steps (offline progress). A Hob never dies while you're away: he waits for you. */
export function advance(state: GameState, seconds: number, chunk = 1): void {
  let left = seconds;
  while (left > 0 && !state.dead) {
    const dt = Math.min(chunk, left);
    step(state, dt);
    left -= dt;
  }
}

// ---------- Production ----------

function produce(state: GameState, dt: number): void {
  for (const def of CHORES) {
    const rate = batchRate(state, def.id);
    if (rate <= 0) continue;
    practise(state, def.id, effectivePips(state, def.id) * dt);
    state.progress[def.id] += rate * dt;
    let guard = 0;
    while (state.progress[def.id] >= 1 && guard++ < 10_000) {
      state.progress[def.id] -= 1;
      finishBatch(state, def.id);
    }
  }
}

function practise(state: GameState, c: ChoreId, pipSeconds: number): void {
  const before = practiceLevel(state.practice[c]);
  state.practice[c] += pipSeconds;
  const level = practiceLevel(state.practice[c]);
  if (level > before) {
    const lines = PRACTICE_LINES[c] ?? [];
    pushLog(state, `${choreName(c)} practice ${level}: ${Math.round(level * BALANCE.practicePerLevel * 100)}% faster. ${lines[(level - 1) % Math.max(1, lines.length)] ?? ''}`, 'info');
  }
}

function finishBatch(state: GameState, c: ChoreId): void {
  state.batches[c]++;
  if (c === 'rummage') {
    rummage(state);
    return;
  }
  const g = goodFor(c);
  if (goodsCount(state) < barnCap(state)) {
    state.goods[g]++;
  } else {
    // No room: it goes to the first passer-by, cheap.
    state.wastedGoods++;
    earn(state, price(state, g) * BALANCE.overflowPrice);
    if (!state.flags.barnFullNoticed) {
      state.flags.barnFullNoticed = true;
      pushLog(state, 'Your barn is full. Anything more gets sold off at half price to whoever is passing.', 'bad');
    }
  }
}

function goodFor(c: ChoreId): GoodId {
  return c === 'eggs' ? 'egg' : c === 'logs' ? 'log' : 'hay';
}

function choreName(c: ChoreId): string {
  return CHORES.find((d) => d.id === c)?.name ?? c;
}

/** The dung heap: mostly dung, sometimes a penny, now and then a thing worth wearing. */
function rummage(state: GameState): void {
  const l = luck(state);
  const findChance = Math.min(0.6, 0.12 * (1 + l / 100));
  const roll = nextRandom(state);
  if (roll < findChance) {
    const pool = HEAP_LOOT.filter((x) => x.luck <= l);
    receiveItem(state, pickWeighted(state, pool).item);
  } else if (roll < findChance + 0.3) {
    earn(state, 1);
  }
}

function standingOrders(state: GameState): void {
  if (!standingUnlocked(state)) return;
  for (const g of GOOD_IDS) {
    const keep = state.standing[g];
    if (keep === null) continue;
    const excess = state.goods[g] - Math.max(keep, reserve(state, g));
    if (excess > 0) sell(state, g, excess);
  }
}

// ---------- The calendar ----------

function calendar(state: GameState, before: number): void {
  const Y = BALANCE.yearSeconds;
  // The Lammas Fair, at the end of Summer.
  if (Math.floor((before - BALANCE.fairAt) / Y) < Math.floor((state.lifeTime - BALANCE.fairAt) / Y) && state.lifeTime >= BALANCE.fairAt) {
    holdFair(state);
  }
  // Michaelmas: the end of the year.
  while (Math.floor(state.lifeTime / Y) > state.yearsPaid) michaelmas(state);

  if (!state.flags.badBack && hasBadBack(state)) {
    state.flags.badBack = true;
    pushLog(state, `${state.name}'s back goes, with a noise like a gate. All work is slower from now on.`, 'bad');
  }
  if (state.lifeTime >= lifespan(state)) {
    state.dead = true;
    pushLog(state, `${state.name}'s time has come. Choose his heirlooms and pass the pitchfork on.`, 'story');
  }
}

function michaelmas(state: GameState): void {
  const due = titheDue(state);
  let fineDue = 0;
  for (const [g, n] of Object.entries(due) as [GoodId, number][]) {
    const given = Math.min(n, state.goods[g]);
    state.goods[g] -= given;
    fineDue += (n - given) * good(g).price * BALANCE.titheFine;
  }
  const year = state.yearsPaid + 1;
  if (fineDue <= 0) {
    state.records.tithesMet++;
    state.lastTithe = { year, met: true, fine: 0, booked: 0 };
    pushLog(state, `Michaelmas. Gerald takes the tithe, counts it twice, and leaves without a word. That's a good sign.`, 'good');
  } else {
    const fine = Math.min(state.pennies, fineDue);
    state.pennies -= fine;
    const booked = fineDue - fine;
    state.debtExtra += booked;
    state.records.tithesMissed++;
    state.lastTithe = { year, met: false, fine, booked };
    pushLog(
      state,
      booked > 0
        ? `Michaelmas. You're short. Gerald fines you ${Math.round(fine)}d and writes ${Math.round(booked)}d more into the family debt.`
        : `Michaelmas. You're short. Gerald fines you ${Math.round(fine)}d, double what you owed, and enjoys it.`,
      'bad',
    );
  }
  state.yearsPaid++;
  if (state.life < 2) return;

  // From the second Hob: prices follow last year's rumour, a new rumour starts, the peddler visits, and a contest is set.
  state.prices = state.rumour ? { [state.rumour.good]: state.rumour.mult } : {};
  if (state.rumour) pushLog(state, `As the peddler said: ${good(state.rumour.good).plural} sell at ×${state.rumour.mult} this year.`, 'info');
  makeRumour(state);
  if (!state.peddler) {
    const unseen = PEDDLER_STOCK.filter((i) => !state.seenItems.includes(i));
    const item = pick(state, unseen.length > 0 ? unseen : PEDDLER_STOCK);
    state.peddler = { item, price: itemDef(item).value * BALANCE.peddlerMarkup };
    pushLog(state, `A peddler arrives with a ${itemDef(item).name}. He'll stay till next Michaelmas.`, 'info');
  }
  pickContest(state);
}

function holdFair(state: GameState): void {
  if (!state.fairContest) return;
  const c = contestDef(state.fairContest);
  if (!state.fairEntered) {
    pushLog(state, `The Lammas Fair: ${c.champion} wins the ${c.name} again. You watched.`, 'info');
    state.lastFair = null;
    return;
  }
  const target = contestTarget(state, c);
  const score = contestScore(state, c) * (0.8 + 0.4 * nextRandom(state));
  const won = score > target;
  state.lastFair = { contest: c.id, score, target, won };
  state.fairEntered = false;
  if (won) {
    state.contestWins[c.id] = (state.contestWins[c.id] ?? 0) + 1;
    if (!state.titles.includes(c.prize.title)) state.titles.push(c.prize.title);
    earn(state, c.prize.pennies);
    if (c.prize.item) receiveItem(state, c.prize.item);
    pushLog(state, `The Lammas Fair: you beat ${c.champion} at ${c.name} (${Math.round(score)} to ${target})! You are now "${c.prize.title}".`, 'good');
  } else {
    pushLog(state, `The Lammas Fair: ${c.champion} beats you at ${c.name}, ${target} to ${Math.round(score)}. ${c.flavor}`, 'bad');
  }
  state.fairContest = null;
}

// ---------- Story cards ----------

export function checkCards(state: GameState): void {
  for (const card of STORY) {
    if (state.cardsSeen.includes(card.id) || state.cardQueue.includes(card.id)) continue;
    if (!card.when(state)) continue;
    state.cardQueue.push(card.id);
    for (const tab of card.opens ?? []) if (!state.tabs.includes(tab)) state.tabs.push(tab);
  }
}
