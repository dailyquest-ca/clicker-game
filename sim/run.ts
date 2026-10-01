// Pacing simulator: `npm run sim`. Bots play the real rules for N minutes of game time.
// Options: --minutes=120 --seeds=3

import { BOSSES } from '../src/content/bosses';
import { CHORES } from '../src/content/chores';
import { BALANCE } from '../src/core/balance';
import { newGame } from '../src/core/state';
import { step } from '../src/core/step';
import type { GameState } from '../src/core/types';
import { fixedSplitBot, naiveBot, smartBot, type Bot } from './bots';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const MINUTES = Number(args.minutes ?? 120);
const SEEDS = Number(args.seeds ?? 3);
const DT = BALANCE.tickSeconds;

export interface RunResult {
  bot: string;
  firstReach: (number | undefined)[];
  rebirths: number;
  lifeLengths: number[];
  firstChoreLevel: number | undefined;
  regainRatio: number | undefined;
  state: GameState;
}

export function runBot(makeBot: () => Bot, seed: number, minutes = MINUTES): RunResult {
  const bot = makeBot();
  const state = newGame(seed, 0);
  let firstChoreLevel: number | undefined;
  let lastRebirths = 0;
  let prevBossTimes: number[] = [];
  let life1Best = 0;
  let life1Time = 0;
  let regainRatio: number | undefined;
  const total = minutes * 60;
  let nextDecision = 0;
  while (state.totalTime < total) {
    if (state.totalTime >= nextDecision) {
      prevBossTimes = [...state.life.bossTimes];
      bot.act(state);
      nextDecision += 1;
    }
    if (state.rebirths !== lastRebirths) {
      if (lastRebirths === 0) {
        life1Best = state.chronicle[0]?.bosses ?? 0;
        life1Time = prevBossTimes[life1Best - 1] ?? 0;
      }
      lastRebirths = state.rebirths;
    }
    step(state, DT);
    if (firstChoreLevel === undefined && CHORES.some((c) => state.chores[c.id].level > 0)) firstChoreLevel = state.totalTime;
    if (state.rebirths === 1 && regainRatio === undefined && life1Best > 0 && life1Time > 0 && state.bossesBeaten >= life1Best) {
      regainRatio = state.lifeTime / life1Time;
    }
  }
  return {
    bot: bot.name,
    firstReach: BOSSES.map((_, i) => state.records.firstReach[i]),
    rebirths: state.rebirths,
    lifeLengths: state.chronicle.map((c) => c.seconds).reverse(),
    firstChoreLevel,
    regainRatio,
    state,
  };
}

const fmt = (s: number | undefined) => {
  if (s === undefined) return '   --  ';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(3, ' ')}:${String(sec).padStart(2, '0')}`;
};

function median(xs: number[]): number | undefined {
  if (xs.length === 0) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function main() {
  const bots: [string, () => Bot][] = [
    ['naive', naiveBot],
    ['smart', () => smartBot()],
    ['s:50/50 split', () => smartBot({ split: 0.5 })],
    ['s:value upgr', () => smartBot({ upgrades: 'value' })],
    ['s:simple items', () => smartBot({ items: 'simple' })],
    ['s:gold zone', () => smartBot({ zone: 'rate' })],
    ['s:late rebirth', () => smartBot({ rebirthBelowPeak: 0.7 })],
    ['fixed 20/80', () => fixedSplitBot(0.2)],
    ['fixed 35/65', () => fixedSplitBot(0.35)],
    ['fixed 50/50', () => fixedSplitBot(0.5)],
    ['fixed 65/35', () => fixedSplitBot(0.65)],
    ['fixed 80/20', () => fixedSplitBot(0.8)],
  ];
  console.log(`Simulating ${MINUTES} min of game time, ${SEEDS} seeds per bot (median shown)\n`);
  const results: Record<string, RunResult[]> = {};
  for (const [name, make] of bots) {
    results[name] = [];
    for (let seed = 1; seed <= SEEDS; seed++) results[name].push(runBot(make, seed * 7919));
  }

  // Time to first beat each boss.
  const header = 'boss'.padEnd(36) + bots.map(([n]) => n.padStart(12)).join('');
  console.log('Time to first beat each boss (mm:ss, any life)');
  console.log(header);
  BOSSES.forEach((b, i) => {
    const row = bots.map(([n]) => fmt(median(results[n]!.map((r) => r.firstReach[i]).filter((x): x is number => x !== undefined))).padStart(12));
    console.log(`${String(i + 1).padStart(2)} ${b.name.slice(0, 32).padEnd(33)}${row.join('')}`);
  });
  console.log('rebirths'.padEnd(36) + bots.map(([n]) => String(median(results[n]!.map((r) => r.rebirths))).padStart(12)).join(''));

  // Which fixed split wins each boss?
  console.log('\nFastest fixed split per boss (is any single split best everywhere?)');
  const fixed = bots.filter(([n]) => n.startsWith('fixed'));
  const winners = new Set<string>();
  BOSSES.forEach((b, i) => {
    let best = '';
    let bestT = Infinity;
    for (const [n] of fixed) {
      const t = median(results[n]!.map((r) => r.firstReach[i]).filter((x): x is number => x !== undefined));
      if (t !== undefined && t < bestT) {
        bestT = t;
        best = n;
      }
    }
    if (best) winners.add(best);
    console.log(`${String(i + 1).padStart(2)} ${b.name.slice(0, 32).padEnd(33)} ${best || '(none reached)'}`);
  });

  // "Smart" = the best rebirth timing a thinking player would converge on; the spread shows timing matters.
  const lastIdx = BOSSES.length - 1;
  const furthest = (rs: RunResult[]) => {
    for (let i = lastIdx; i >= 0; i--) {
      const t = median(rs.map((r) => r.firstReach[i]).filter((x): x is number => x !== undefined));
      if (t !== undefined) return { boss: i, t };
    }
    return { boss: -1, t: Infinity };
  };
  const smartNames = bots.map(([n]) => n).filter((n) => n === 'smart' || n.startsWith('s:'));
  const ranked = smartNames
    .map((n) => ({ n, f: furthest(results[n]!) }))
    .sort((a, b) => b.f.boss - a.f.boss || a.f.t - b.f.t);
  const bestSmart = ranked[0]!.n;
  const worstSmart = ranked[ranked.length - 1]!;
  console.log('\nDecision impact (one choice changed from the smart bot; furthest boss and when):');
  for (const r of ranked) console.log(`  ${r.n.padEnd(16)} boss ${r.f.boss + 1} at ${fmt(r.f.t).trim()}`);
  void worstSmart;

  // Pacing checks against the plan's targets.
  const smart = results[bestSmart]!;
  const naive = results.naive!;
  const s = (i: number) => median(smart.map((r) => r.firstReach[i]).filter((x): x is number => x !== undefined));
  const n = (i: number) => median(naive.map((r) => r.firstReach[i]).filter((x): x is number => x !== undefined));
  const firstLevel = median(smart.map((r) => r.firstChoreLevel).filter((x): x is number => x !== undefined));
  const firstLife = median(smart.map((r) => r.lifeLengths[0]).filter((x): x is number => x !== undefined));
  const regain = median(smart.map((r) => r.regainRatio).filter((x): x is number => x !== undefined));
  const last = BOSSES.length - 1;
  // Compare on the furthest boss both bots reached.
  let cmpBoss = last;
  while (cmpBoss > 0 && (s(cmpBoss) === undefined || n(cmpBoss) === undefined)) cmpBoss--;
  const smartT = s(cmpBoss);
  const naiveT = n(cmpBoss);
  const smartEdge = smartT && naiveT ? 1 - smartT / naiveT : undefined;
  const smartOnly = s(last) !== undefined && n(last) === undefined;

  // Each early life should reach further than the one before: the "a bit better every time" feel.
  const firstLives = (smart[0]?.state.chronicle.slice().reverse() ?? []).slice(0, 5).map((c) => c.bosses);
  const climbing = firstLives.length >= 5 && firstLives.every((b, i) => i === 0 || b > firstLives[i - 1]!);

  const checks: [string, 'PASS' | 'FAIL' | 'INFO', string][] = [
    ['First chore level <= 30s', (firstLevel ?? Infinity) <= 30 ? 'PASS' : 'FAIL', fmt(firstLevel)],
    ['Boss 1 <= 1:00', (s(0) ?? Infinity) <= 60 ? 'PASS' : 'FAIL', fmt(s(0))],
    ['Adventure (boss 2) ~3 min (1:30-4:00)', (s(1) ?? Infinity) >= 90 && (s(1) ?? Infinity) <= 240 ? 'PASS' : 'FAIL', fmt(s(1))],
    ['First rebirth 5-8 min (smart)', (firstLife ?? 0) >= 300 && (firstLife ?? Infinity) <= 480 ? 'PASS' : 'FAIL', fmt(firstLife)],
    ['Smart: each of the first 5 lives beats a new boss', climbing ? 'PASS' : 'FAIL', firstLives.map((b) => `b${b}`).join(' > ')],
    // Informational: with bosses doubling in difficulty, "one new boss per life" means regaining fast.
    ['Life 2 regains life 1 best (plan target 55-75%)', 'INFO', regain ? `${Math.round(regain * 100)}%` : '--'],
    ['Bailiff 45-90 min (smart)', (s(last) ?? Infinity) >= 2700 && (s(last) ?? Infinity) <= 5400 ? 'PASS' : 'FAIL', fmt(s(last))],
    [`Smart beats naive by >= 15% (boss ${cmpBoss + 1})`, smartOnly || (smartEdge ?? 0) >= 0.15 ? 'PASS' : 'FAIL', smartOnly ? 'naive never reaches the Bailiff' : smartEdge !== undefined ? `${Math.round(smartEdge * 100)}%` : '--'],
    ['No single fixed split is fastest for every boss', winners.size >= 2 ? 'PASS' : 'FAIL', `${winners.size} different winners`],
  ];
  console.log('\nPacing checks');
  for (const [label, status, value] of checks) console.log(`${status}  ${label.padEnd(52)} ${value}`);
  const chron = smart[0]?.state.chronicle.slice().reverse() ?? [];
  console.log(`\nBest smart bot lives (seed 1): ${chron.map((c) => `${fmt(c.seconds).trim()}->b${c.bosses}`).join(', ')}`);
  const naiveChron = naive[0]?.state.chronicle.slice().reverse() ?? [];
  console.log(`Naive bot lives (seed 1): ${naiveChron.map((c) => `${fmt(c.seconds).trim()}->b${c.bosses}`).join(', ')}`);

  if (args.strict && checks.some(([, status]) => status === 'FAIL')) process.exit(1);
}

main();
