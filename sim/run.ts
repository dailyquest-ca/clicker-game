// Pacing simulator: `npm run sim`. Bots play the real rules and the pacing targets are checked.
// Options: --seeds=3 --minutes=240 --strict (exit 1 if a check fails) --verbose

import { dismissCard } from '../src/core/actions';
import { bestIncomeRate, debtLeft, shopCost } from '../src/core/formulas';
import { newGame } from '../src/core/state';
import { step } from '../src/core/step';
import type { GameState, ShopId } from '../src/core/types';
import { casualBot, lazyBot, naiveBot, smartBot, type Bot } from './bots';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const SEEDS = Number(args.seeds ?? 3);
const MINUTES = Number(args.minutes ?? 240);
const STRICT = args.strict === 'true';
const VERBOSE = args.verbose === 'true';
const DT = 0.5;

export interface LifeStats {
  life: number;
  seconds: number;
  earned: number;
  paid: number;
  made: number;
  wasted: number;
  tithesMet: number;
  tithesMissed: number;
  purchases: { t: number; id: ShopId; cost: number }[];
  drown: number[];
  incomeAtYear: number[];
}

export interface RunResult {
  bot: string;
  lives: LifeStats[];
  /** The life still in progress when the run ended. */
  current: LifeStats;
  clearedAt: number | undefined;
  paidAt: Record<number, number>;
  state: GameState;
}

export function runBot(bot: Bot, seed: number, minutes = MINUTES): RunResult {
  const state = newGame(seed, 0);
  const lives: LifeStats[] = [];
  const fresh = (): LifeStats => ({ life: state.life, seconds: 0, earned: 0, paid: 0, made: 0, wasted: 0, tithesMet: 0, tithesMissed: 0, purchases: [], drown: [], incomeAtYear: [] });
  let cur = fresh();
  let met0 = 0;
  let missed0 = 0;
  let clearedAt: number | undefined;
  const paidAt: Record<number, number> = {};
  let next = 0;
  let nextSample = 0;
  let lastYear = 0;
  const snapshot = () => {
    cur.seconds = state.lifeTime;
    cur.earned = state.earnedThisLife;
    cur.made = state.batches.hay + state.batches.eggs + state.batches.logs;
    cur.wasted = state.wastedGoods;
    cur.tithesMet = state.records.tithesMet - met0;
    cur.tithesMissed = state.records.tithesMissed - missed0;
  };
  while (state.totalTime < minutes * 60) {
    while (state.cardQueue.length > 0) dismissCard(state);
    if (state.totalTime >= next || state.dead) {
      const life = state.life;
      const purchases = state.records.purchases;
      const pennies = state.pennies;
      if (state.dead) snapshot();
      bot.act(state);
      if (state.life !== life) {
        cur.paid = state.chronicle[0]?.paid ?? 0;
        lives.push(cur);
        cur = fresh();
        met0 = state.records.tithesMet;
        missed0 = state.records.tithesMissed;
        lastYear = 0;
      } else if (state.records.purchases > purchases) {
        // Find what was bought by the drop in pennies (one purchase per act for the smart bot).
        cur.purchases.push({ t: state.lifeTime, id: lastBought(state), cost: Math.round(pennies - state.pennies) });
      }
      next = state.totalTime + bot.interval;
    }
    step(state, DT);
    if (state.totalTime >= nextSample) {
      nextSample += 5;
      if (bot.target) cur.drown.push(state.pennies / shopCost(state, bot.target));
    }
    if (state.yearsPaid > lastYear) {
      lastYear = state.yearsPaid;
      cur.incomeAtYear.push(bestIncomeRate(state));
    }
    if (!state.dead) snapshot();
    for (const m of [30, 60, 90, 120, 150, 180]) if (paidAt[m] === undefined && state.totalTime >= m * 60) paidAt[m] = state.debtPaid;
    if (clearedAt === undefined && debtLeft(state) <= 0) {
      clearedAt = state.totalTime;
      break;
    }
  }
  snapshot();
  cur.paid = state.paidThisLife;
  return { bot: bot.name, lives, current: cur, clearedAt, paidAt, state };
}

function lastBought(state: GameState): ShopId {
  const line = [...state.log].reverse().find((l) => l.text.startsWith('Bought: '));
  const name = line?.text.slice(8).split('.')[0] ?? '';
  const ids: Record<string, ShopId> = {
    'A Hen': 'hen',
    'Porridge Rations': 'porridge',
    'Wicker Basket': 'basket',
    Whetstone: 'whetstone',
    'A Proper Henhouse': 'henhouse',
    'An Axe': 'axe',
    'A Bow Saw': 'saw',
    'Barn Extension': 'barn',
    'A Long Rake': 'rake',
  };
  return ids[name] ?? 'hen';
}

// ---------- reporting ----------

const mmss = (s: number | undefined) => {
  if (s === undefined || !Number.isFinite(s)) return '  --  ';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(3, ' ')}:${String(sec).padStart(2, '0')}`;
};

function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
}
const median = (xs: number[]) => quantile(xs, 0.5);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

interface Check {
  name: string;
  value: string;
  pass: boolean;
}
const checks: Check[] = [];
function check(name: string, value: string, pass: boolean): void {
  checks.push({ name, value, pass });
}

function main(): void {
  const seeds = Array.from({ length: SEEDS }, (_, i) => 1000 + i * 7919);
  const smart = seeds.map((s) => runBot(smartBot(), s));
  const naive = seeds.map((s) => runBot(naiveBot(), s, 61));
  const casual = seeds.map((s) => runBot(casualBot(), s));
  const hoard = seeds.map((s) => runBot(smartBot({ hoard: true }), s, 61));
  const neverSell = seeds.map((s) => runBot(smartBot({ neverSell: true }), s, 61));
  const retire = seeds.map((s) => runBot(smartBot({ retireEarly: true }), s, 61));
  const forced = seeds.map((s) => runBot(smartBot({ forceMissYear: 3 }), s, 18));
  const visits: number[] = [];
  seeds.forEach((s) => runBot(lazyBot(visits), s, 18));

  // Life 1 of the smart bot, first seed, in detail.
  const l1 = smart[0]!.lives[0];
  if (l1) {
    console.log('\nSmart bot, life 1 (seed 1): purchases');
    let prev = 0;
    for (const p of l1.purchases) {
      console.log(`  ${mmss(p.t)}  ${p.id.padEnd(10)} ${String(p.cost).padStart(5)}d   (+${Math.round(p.t - prev)}s)`);
      prev = p.t;
    }
    console.log(`  income by year (d/s): ${l1.incomeAtYear.map((x) => x.toFixed(2)).join(', ')}`);
    console.log(`  earned ${Math.round(l1.earned)}d, paid ${Math.round(l1.paid)}d, wasted ${l1.wasted}/${l1.made} goods, tithes ${l1.tithesMet} met / ${l1.tithesMissed} missed`);
  }
  console.log('\nSmart bot, every life (seed 1)');
  console.log('  life   length    earned     paid   tithes  buys');
  for (const l of smart[0]!.lives) {
    console.log(`  ${String(l.life).padStart(4)}  ${mmss(l.seconds)}  ${String(Math.round(l.earned)).padStart(8)} ${String(Math.round(l.paid)).padStart(8)}   ${l.tithesMet}/${l.tithesMet + l.tithesMissed}    ${l.purchases.length}`);
  }
  if (VERBOSE) {
    const st = smart[0]!.state;
    console.log('  traditions', JSON.stringify(st.traditions), 'knowHow', JSON.stringify(st.knowHow), 'milestones', st.milestones.join(','));
  }

  console.log('\nDebt paid by minute (avg of seeds)');
  const row = (name: string, rs: RunResult[]) =>
    console.log(`  ${name.padEnd(13)} ${[30, 60, 90, 120, 150, 180].map((m) => String(Math.round(avg(rs.map((r) => r.paidAt[m] ?? r.state.debtPaid)))).padStart(7)).join('')}   cleared: ${rs.map((r) => mmss(r.clearedAt)).join(' ')}`);
  console.log(`  ${''.padEnd(13)} ${[30, 60, 90, 120, 150, 180].map((m) => `${m}m`.padStart(7)).join('')}`);
  row('smart', smart);
  row('casual', casual);
  row('naive', naive);
  row('hoarder', hoard);
  row('never-sell', neverSell);
  row('retire-early', retire);

  // ---- checks ----
  const life1 = smart.map((r) => r.lives[0]!).filter(Boolean);
  const firstBuys = life1.map((l) => l.purchases[0]?.t ?? Infinity);
  check('first purchase ≤ 75s', firstBuys.map((t) => mmss(t).trim()).join(', '), firstBuys.every((t) => t <= 75));
  const gaps = life1.flatMap((l) => l.purchases.slice(1).map((p, i) => p.t - l.purchases[i]!.t));
  const gapMed = median(gaps);
  check('median purchase gap 60–120s (life 1)', `${Math.round(gapMed)}s`, gapMed >= 60 && gapMed <= 120);
  const drown = life1.flatMap((l) => l.drown);
  check('drowning ratio (pennies ÷ target cost): median ≤ 1.5, p90 ≤ 3', `${median(drown).toFixed(2)} / ${quantile(drown, 0.9).toFixed(2)}`, median(drown) <= 1.5 && quantile(drown, 0.9) <= 3);
  check('once-a-minute visit can afford: median ≤ 1, p90 ≤ 2', `${median(visits)} / ${quantile(visits, 0.9)}`, median(visits) <= 1 && quantile(visits, 0.9) <= 2);
  const wasted = avg(life1.map((l) => l.wasted / Math.max(1, l.made)));
  check('goods wasted at the barn cap ≤ 5% (smart, life 1)', `${(wasted * 100).toFixed(1)}%`, wasted <= 0.05);
  const naiveMet = naive.flatMap((r) => r.lives.concat([])).reduce((s, l) => s + l.tithesMet, 0);
  const naiveAll = naive.flatMap((r) => r.lives).reduce((s, l) => s + l.tithesMet + l.tithesMissed, 0);
  check('naive bot meets ≥ 80% of tithes', `${naiveMet}/${naiveAll}`, naiveAll > 0 && naiveMet / naiveAll >= 0.8);
  const recov = forced.map((r, i) => {
    const f = (r.lives[0] ?? r.current).incomeAtYear[4] ?? 0;
    const n = smart[i]!.lives[0]?.incomeAtYear[4] ?? 0;
    return n > 0 ? f / n : 0;
  });
  const forcedMissed = forced.map((r) => r.state.records.tithesMissed);
  check('after a forced missed tithe, income 2 years on ≥ 85% of normal', `${recov.map((x) => `${Math.round(x * 100)}%`).join(', ')} (missed: ${forcedMissed.join(',')})`, recov.every((x) => x >= 0.85));
  const len1 = life1.map((l) => l.seconds / 60);
  check('first life 15–20 min', len1.map((x) => x.toFixed(1)).join(', '), len1.every((x) => x >= 15 && x <= 20));
  const cleared = smart.map((r) => (r.clearedAt ?? Infinity) / 60);
  const casualCleared = casual.map((r) => (r.clearedAt ?? Infinity) / 60);
  const fmtMin = (xs: number[]) => xs.map((x) => (Number.isFinite(x) ? x.toFixed(0) : '>' + MINUTES)).join(', ');
  check('debt cleared in 90–150 min (smart bot)', fmtMin(cleared), cleared.every((x) => x >= 90 && x <= 150));
  check('casual bot (trusts the UI hints) clears it within 150 min', fmtMin(casualCleared), casualCleared.every((x) => x <= 150));
  const growth = smart.map((r) => r.lives.slice(0, 4).every((l, i, a) => i === 0 || l.paid > a[i - 1]!.paid));
  check('each of the first 4 lives pays more than the last', growth.map((g) => (g ? 'yes' : 'no')).join(', '), growth.every(Boolean));
  // Compared at 60 minutes: by 90 the good strategies have all cleared the debt, which hides differences.
  const at60 = (rs: RunResult[]) => avg(rs.map((r) => r.paidAt[60] ?? r.state.debtPaid));
  const smart60 = at60(smart);
  const casual60 = at60(casual);
  const naive60 = at60(naive);
  check('smart beats casual by ≥ 15% (paid at 60 min)', `${Math.round(smart60)} vs ${Math.round(casual60)} (+${Math.round((smart60 / casual60 - 1) * 100)}%)`, smart60 >= casual60 * 1.15);
  check('casual beats naive (paid at 60 min)', `${Math.round(casual60)} vs ${Math.round(naive60)}`, casual60 > naive60);
  for (const [name, rs, slack] of [
    ['hoarder', hoard, 1.05],
    ['never-sell', neverSell, 1.05],
    ['retire-early', retire, 1.1],
  ] as const) {
    const v = at60(rs);
    check(`exploit "${name}" ≤ smart + ${Math.round((slack - 1) * 100)}% (paid at 60 min)`, `${Math.round(v)} vs ${Math.round(smart60)} (${v >= smart60 ? '+' : ''}${Math.round((v / smart60 - 1) * 100)}%)`, v <= smart60 * slack);
  }

  console.log('\nChecks');
  for (const c of checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name.padEnd(62)} ${c.value}`);
  const failed = checks.filter((c) => !c.pass).length;
  console.log(failed === 0 ? '\nAll pacing checks pass.' : `\n${failed} check(s) failed.`);
  if (STRICT && failed > 0) process.exit(1);
}

if (process.argv[1]?.endsWith("run.ts")) main();
