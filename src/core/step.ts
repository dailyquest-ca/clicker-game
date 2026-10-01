import { BALANCE } from './balance';
import { BOSSES } from '../content/bosses';
import { CHORES } from '../content/chores';
import { AMBIENT_LINES, CHORE_MILESTONE_LINES } from '../content/text';
import { ZONES } from '../content/zones';
import { checkAchievements, unlockAchievement } from './achievements';
import { onBossDefeated, receiveItem } from './actions';
import { choreCost, choreUnlocked, computeStats, damageTaken, memoryRate } from './formulas';
import { nextRandom, pick, pickWeighted } from './rng';
import { pushLog } from './state';
import type { GameState } from './types';

const MILESTONES = [10, 25, 50, 100, 200];

/** Advance the game by dt seconds. Pure rules: no browser, no wall clock. */
export function step(state: GameState, dt: number): void {
  state.totalTime += dt;
  state.lifeTime += dt;
  const stats = computeStats(state);

  // Stamina: the idle pool refills until idle + assigned reaches the cap.
  const assignedTotal = CHORES.reduce((s, c) => s + state.stamina.assigned[c.id], 0);
  const room = Math.max(0, stats.cap - assignedTotal - state.stamina.idle);
  state.stamina.idle += Math.min(room, stats.regen * dt);

  // Creature of Habit: new stamina follows your current split.
  if (state.perks.habit > 0 && assignedTotal > 0 && state.stamina.idle > 0) {
    const pool = state.stamina.idle;
    for (const def of CHORES) {
      const share = state.stamina.assigned[def.id] / assignedTotal;
      state.stamina.assigned[def.id] += pool * share;
    }
    state.stamina.idle = 0;
  }

  // Chores: assigned stamina is work per second.
  for (const def of CHORES) {
    const assigned = state.stamina.assigned[def.id];
    if (assigned <= 0 || !choreUnlocked(state, def)) continue;
    const c = state.chores[def.id];
    c.progress += assigned * dt;
    let guard = 0;
    while (guard++ < 1000) {
      const cost = choreCost(def, c.level, state.rebirths);
      if (c.progress < cost) break;
      c.progress -= cost;
      c.level++;
      if (MILESTONES.includes(c.level)) {
        const lines = CHORE_MILESTONE_LINES[def.id] ?? [];
        const line = lines[MILESTONES.indexOf(c.level) % Math.max(1, lines.length)];
        pushLog(state, `${def.name} reached level ${c.level}. ${line ?? ''}`, 'info');
      }
      const unlocked = CHORES.find((d) => d.unlock?.chore === def.id && d.unlock.level === c.level);
      if (unlocked) pushLog(state, `New chore: ${unlocked.name}. ${unlocked.flavor}`, 'good');
    }
  }

  stepFight(state, dt);
  stepAdventure(state, dt);

  // Track the best Memories-per-minute this life, so "when to rebirth" is a decision you can reason about.
  if (state.lifeTime > 30) {
    const rate = memoryRate(state);
    if (rate > state.life.peakRate) {
      state.life.peakRate = rate;
      state.life.peakRateAt = state.lifeTime;
    }
  }

  // The occasional bit of village life.
  if (nextRandom(state) < dt / 75) pushLog(state, pick(state, AMBIENT_LINES), 'info');

  checkAchievements(state);
}

function stepFight(state: GameState, dt: number): void {
  const fight = state.fight;
  if (!fight || fight.result !== null) return;
  const boss = BOSSES[fight.boss];
  if (!boss) return;
  const stats = computeStats(state);
  const hit = Math.min(fight.bossHp, stats.power * dt);
  fight.bossHp -= hit;
  fight.dealt += hit;
  fight.hp -= damageTaken(boss.atk, stats.guard) * dt;
  fight.t += dt;
  if (fight.bossHp <= 0) {
    fight.result = 'win';
    onBossDefeated(state, fight.boss);
  } else if (fight.hp <= 0 || fight.t >= BALANCE.fightTimeout) {
    fight.result = 'lose';
    pushLog(state, fight.hp <= 0 ? boss.victory : `${boss.name} got bored and left. That counts as a loss.`, 'bad');
    if (fight.dealt < boss.hp * 0.1) unlockAchievement(state, 'optimist');
  }
}

function stepAdventure(state: GameState, dt: number): void {
  const adv = state.adventure;
  if (adv.zone === null) return;
  const zone = ZONES[adv.zone];
  if (!zone) return;
  const stats = computeStats(state);

  if (adv.deadFor > 0) {
    adv.deadFor -= dt;
    if (adv.deadFor <= 0) {
      adv.deadFor = 0;
      adv.hp = stats.maxHp;
    }
    return;
  }

  // Your health drifts with (regen − damage); enemies fall to your Power.
  const regen = (BALANCE.adventureRegenPct / 100) * stats.maxHp;
  adv.hp = Math.min(stats.maxHp, adv.hp + (regen - damageTaken(zone.atk, stats.guard)) * dt);

  let damage = stats.power * dt;
  let kills = 0;
  if (damage >= adv.enemyHp) {
    damage -= adv.enemyHp;
    kills = 1 + Math.floor(damage / zone.hp);
    adv.enemyHp = zone.hp - (damage % zone.hp);
    adv.enemy = pick(state, zone.enemies);
  } else {
    adv.enemyHp -= damage;
  }

  if (kills > 0) {
    const gold = kills * zone.gold * stats.goldMult;
    state.gold += gold;
    state.records.totalGold += gold;
    state.records.totalKills += kills;
    adv.kills += kills;
    const p = Math.min(0.95, zone.dropChance * stats.dropMult);
    // Roll each kill when there are few; approximate when offline catch-up produces thousands.
    const drops = kills <= 50 ? countHits(state, kills, p) : Math.round(kills * p + (nextRandom(state) - 0.5));
    for (let i = 0; i < Math.min(drops, 200); i++) receiveItem(state, pickWeighted(state, zone.loot).item);
  }

  if (adv.hp <= 0) {
    adv.hp = 0;
    adv.deadFor = stats.recovery;
    if (nextRandom(state) < 0.25) pushLog(state, `Knocked flat in ${zone.name}. Recovering for ${stats.recovery.toFixed(1)}s.`, 'bad');
  }
}

function countHits(state: GameState, n: number, p: number): number {
  let hits = 0;
  for (let i = 0; i < n; i++) if (nextRandom(state) < p) hits++;
  return hits;
}

/** Run time forward in coarse steps (offline progress). Fights in progress resolve first. */
export function advance(state: GameState, seconds: number, chunk = 1): void {
  let left = seconds;
  while (left > 0) {
    const dt = Math.min(chunk, left);
    step(state, dt);
    left -= dt;
  }
}
