import { describe, expect, it } from 'vitest';
import { BOSSES } from '../src/content/bosses';
import { chore } from '../src/content/chores';
import { ITEMS } from '../src/content/items';
import { ZONES } from '../src/content/zones';
import {
  assign,
  buyPerk,
  equip,
  merge,
  rebirth,
  receiveItem,
  startFight,
} from '../src/core/actions';
import { BALANCE } from '../src/core/balance';
import {
  canRebirth,
  choreCost,
  computeStats,
  memoriesIfRebirth,
  rawMemories,
  ripeness,
  validateContent,
} from '../src/core/formulas';
import { catchUp, deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';
import { advance, step } from '../src/core/step';

describe('chores', () => {
  it('get 10% cheaper with every rebirth (muscle memory)', () => {
    const hay = chore('hay');
    for (const level of [0, 5, 40]) {
      expect(choreCost(hay, level, 1) / choreCost(hay, level, 0)).toBeCloseTo(0.9, 10);
      expect(choreCost(hay, level, 3) / choreCost(hay, level, 0)).toBeCloseTo(0.729, 10);
    }
  });

  it('level up from assigned stamina', () => {
    const s = newGame(1, 0);
    advance(s, 10, 0.1); // fill some stamina
    expect(assign(s, 'hay', 10)).toBe(true);
    advance(s, 5, 0.1);
    expect(s.chores.hay.level).toBeGreaterThan(0);
    expect(computeStats(s).power).toBe(s.chores.hay.level);
  });

  it('tier-2 chores stay locked until the tier-1 chore reaches level 10', () => {
    const s = newGame(1, 0);
    s.stamina.idle = 20;
    expect(assign(s, 'goat', 5)).toBe(false);
    s.chores.hay.level = 10;
    expect(assign(s, 'goat', 5)).toBe(true);
  });
});

describe('items', () => {
  it('merging a duplicate raises the level; levels stack', () => {
    const s = newGame(1, 0);
    receiveItem(s, 'pitchfork');
    receiveItem(s, 'pitchfork');
    const [a, b] = s.inventory;
    expect(merge(s, b!.uid, a!.uid)).toBe(true);
    expect(s.inventory).toHaveLength(1);
    expect(s.inventory[0]!.level).toBe(1);

    receiveItem(s, 'pitchfork');
    receiveItem(s, 'pitchfork');
    const extra = s.inventory.slice(1);
    expect(merge(s, extra[1]!.uid, extra[0]!.uid)).toBe(true); // a fresh level-1 copy
    expect(merge(s, extra[0]!.uid, s.inventory[0]!.uid)).toBe(true); // 1 + 1 + 1
    expect(s.inventory[0]!.level).toBe(3);
  });

  it('refuses to merge different items', () => {
    const s = newGame(1, 0);
    receiveItem(s, 'pitchfork');
    receiveItem(s, 'leftBoot');
    expect(merge(s, s.inventory[0]!.uid, s.inventory[1]!.uid)).toBe(false);
  });

  it('discovers a hidden set when the full combination is equipped', () => {
    const s = newGame(1, 0);
    receiveItem(s, 'leftBoot');
    receiveItem(s, 'rightBoot');
    const before = computeStats(s);
    for (const item of [...s.inventory]) equip(s, item.uid);
    expect(s.discoveredSets).toContain('pair');
    expect(computeStats(s).powerMult).toBeGreaterThan(before.powerMult);
  });

  it('auto-merge perk stacks duplicates on pickup', () => {
    const s = newGame(1, 0);
    s.perks.autoMerge = 1;
    receiveItem(s, 'pitchfork');
    receiveItem(s, 'pitchfork');
    expect(s.inventory).toHaveLength(1);
    expect(s.inventory[0]!.level).toBe(1);
  });
});

describe('memories and rebirth', () => {
  it('memories = bosses beaten + chore levels / 10, ripened by age squared', () => {
    const s = newGame(1, 0);
    s.bossesBeaten = 3;
    s.chores.hay.level = 25;
    s.chores.dodge.level = 15;
    const raw = BOSSES[0]!.memories + BOSSES[1]!.memories + BOSSES[2]!.memories + 4;
    expect(rawMemories(s)).toBe(raw);
    s.lifeTime = BALANCE.memoryRipenSeconds / 2;
    expect(ripeness(s.lifeTime)).toBeCloseTo(0.25);
    expect(memoriesIfRebirth(s)).toBe(Math.floor(raw * 0.25));
    s.lifeTime = BALANCE.memoryRipenSeconds * 3;
    expect(memoriesIfRebirth(s)).toBe(raw);
  });

  it('rebirth needs 3 bosses, resets the life, keeps items and perks', () => {
    const s = newGame(1, 0);
    expect(canRebirth(s)).toBe(false);
    s.bossesBeaten = 3;
    s.lifeTime = 600;
    s.gold = 500;
    s.chores.hay.level = 30;
    s.upgrades.whetstone = 4;
    s.perks.strongBack = 2;
    receiveItem(s, 'pitchfork');
    const expected = memoriesIfRebirth(s);
    expect(rebirth(s)).toBe(expected);
    expect(s.memories).toBe(expected);
    expect(s.rebirths).toBe(1);
    expect(s.gold).toBe(0);
    expect(s.chores.hay.level).toBe(0);
    expect(s.upgrades.whetstone).toBe(0);
    expect(s.bossesBeaten).toBe(0);
    expect(s.perks.strongBack).toBe(2);
    expect(s.inventory).toHaveLength(1);
    expect(s.chronicle).toHaveLength(1);
  });

  it('perks compound per level', () => {
    const s = newGame(1, 0);
    s.memories = 1000;
    buyPerk(s, 'strongBack');
    buyPerk(s, 'strongBack');
    expect(computeStats(s).powerMult).toBeCloseTo(1.12 * 1.12, 10);
  });
});

describe('fights', () => {
  it('a strong enough serf beats the rooster and opens the market', () => {
    const s = newGame(1, 0);
    s.chores.hay.level = 20;
    s.chores.dodge.level = 20;
    expect(startFight(s)).toBe(true);
    for (let i = 0; i < 200 && s.fight?.result === null; i++) step(s, 0.1);
    expect(s.fight?.result).toBe('win');
    expect(s.bossesBeaten).toBe(1);
    expect(s.unlocked.market).toBe(true);
    expect(s.gold).toBeGreaterThan(0);
  });

  it('a power-only serf loses to a hard hitter', () => {
    const s = newGame(1, 0);
    s.bossesBeaten = 3; // next: Gerald's Larger Brother (hard hitter)
    s.chores.hay.level = 60;
    startFight(s);
    for (let i = 0; i < 400 && s.fight?.result === null; i++) step(s, 0.1);
    expect(s.fight?.result).toBe('lose');
  });
});

describe('saves', () => {
  it('round-trips exactly', () => {
    const s = newGame(42, 1000);
    advance(s, 30, 0.1);
    assign(s, 'hay', 5);
    receiveItem(s, 'turnip');
    const copy = deserialize(serialize(s));
    expect(copy).toEqual(s);
  });

  it('fills fields missing from older saves and rejects newer versions', () => {
    const s = newGame(42, 0) as unknown as Record<string, unknown>;
    delete s.chronicle;
    const loaded = deserialize(JSON.stringify(s));
    expect(loaded.chronicle).toEqual([]);
    expect(() => deserialize(JSON.stringify({ ...s, v: 999 }))).toThrow();
  });

  it('offline catch-up is capped at 8 hours', () => {
    const s = newGame(42, 0);
    s.lastSeen = 0;
    const summary = catchUp(s, 24 * 3600 * 1000);
    expect(summary?.seconds).toBe(BALANCE.offlineCapSeconds);
    expect(s.totalTime).toBeCloseTo(BALANCE.offlineCapSeconds, 3);
    expect(s.lastSeen).toBe(24 * 3600 * 1000);
  });
});

describe('content', () => {
  it('has no broken references', () => {
    expect(validateContent()).toEqual([]);
    const ids = new Set(ITEMS.map((i) => i.id));
    for (const zone of ZONES) for (const l of zone.loot) expect(ids.has(l.item)).toBe(true);
  });

  it('alternates boss archetypes so no single split is always right', () => {
    for (let i = 1; i < BOSSES.length; i++) expect(BOSSES[i]!.archetype).not.toBe(BOSSES[i - 1]!.archetype);
  });
});
