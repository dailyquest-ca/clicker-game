import { describe, expect, it } from 'vitest';
import {
  assign,
  buy,
  deliver,
  dismissCard,
  enterFair,
  equip,
  merge,
  passOn,
  payDebt,
  receiveItem,
  sell,
  sellSpare,
  setPips,
  setStanding,
} from '../src/core/actions';
import { BALANCE } from '../src/core/balance';
import {
  barnCap,
  batchRate,
  canRetire,
  contestDef,
  effectivePips,
  loreForPaid,
  practiceLevel,
  price,
  reserve,
  shopAvailable,
  shopCost,
  titheDue,
  validateContent,
  workMult,
} from '../src/core/formulas';
import { currentGoals } from '../src/core/goals';
import { catchUp, deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';
import { advance, step } from '../src/core/step';
import type { GameState } from '../src/core/types';

/** A fresh game with the intro read, so time can pass. */
function fresh(seed = 1): GameState {
  const s = newGame(seed, 0);
  while (s.cardQueue.length) dismissCard(s);
  return s;
}

function run(s: GameState, seconds: number, dt = 0.5): void {
  for (let t = 0; t < seconds; t += dt) {
    step(s, dt);
    while (s.cardQueue.length) dismissCard(s);
  }
}

describe('content', () => {
  it('has no broken references', () => {
    expect(validateContent()).toEqual([]);
  });
});

describe('chores and goods', () => {
  it('three pips cut hay at 1 work per pip per second (8 work a bale)', () => {
    const s = fresh();
    expect(s.pips.hay).toBe(BALANCE.startPips);
    run(s, 16, 0.1);
    // 3 pips × 16 s = 48 work = 6 hay (practice level 1 kicks in at 20 pip-seconds, so a little more).
    expect(s.goods.hay).toBeGreaterThanOrEqual(6);
    expect(s.goods.hay).toBeLessThanOrEqual(7);
  });

  it('each hen keeps exactly one pip busy', () => {
    const s = fresh();
    s.owned.hen = 1;
    setPips(s, { eggs: 3 });
    expect(effectivePips(s, 'eggs')).toBe(1);
    s.owned.hen = 2;
    expect(effectivePips(s, 'eggs')).toBe(2);
  });

  it('practice levels come from pip-seconds worked, and speed the chore up', () => {
    expect(practiceLevel(0)).toBe(0);
    expect(practiceLevel(BALANCE.practiceCurve)).toBe(1);
    expect(practiceLevel(BALANCE.practiceCurve * 8 - 1)).toBe(1);
    expect(practiceLevel(BALANCE.practiceCurve * 8)).toBe(2);
    const s = fresh();
    const before = workMult(s, 'hay');
    s.practice.hay = BALANCE.practiceCurve * 27;
    expect(workMult(s, 'hay')).toBeCloseTo(before * (1 + 3 * BALANCE.practicePerLevel), 10);
  });

  it('firewood needs an axe', () => {
    const s = fresh();
    expect(assign(s, 'logs', 1)).toBe(false);
    s.owned.axe = 1;
    setPips(s, { logs: 1 });
    expect(batchRate(s, 'logs')).toBeGreaterThan(0);
  });

  it('goods past the barn cap are sold off at half price and counted as waste', () => {
    const s = fresh();
    s.goods.hay = barnCap(s);
    const pennies = s.pennies;
    run(s, 30, 0.1);
    expect(s.goods.hay).toBe(barnCap(s));
    expect(s.wastedGoods).toBeGreaterThan(0);
    expect(s.pennies - pennies).toBeCloseTo(s.wastedGoods * price(s, 'hay') * BALANCE.overflowPrice, 6);
  });
});

describe('market', () => {
  it('selling spare keeps back what Gerald wants when the basket is on', () => {
    const s = fresh();
    s.goods.hay = 20;
    expect(reserve(s, 'hay')).toBe(0); // not before you've met him
    s.tabs.push('manor');
    const due = titheDue(s).hay ?? 0;
    expect(reserve(s, 'hay')).toBe(due);
    sellSpare(s, 'hay');
    expect(s.goods.hay).toBe(due);
    expect(s.pennies).toBeCloseTo((20 - due) * price(s, 'hay'), 10);
    s.basket = false;
    sellSpare(s, 'hay');
    expect(s.goods.hay).toBe(0);
  });

  it('standing orders unlock after enough sales, then sell the excess every tick', () => {
    const s = fresh();
    expect(setStanding(s, 'hay', 0)).toBe(false);
    s.goods.hay = BALANCE.standingUnlock;
    sell(s, 'hay', BALANCE.standingUnlock);
    expect(setStanding(s, 'hay', 5)).toBe(true);
    s.goods.hay = 25;
    step(s, 0.1);
    expect(s.goods.hay).toBe(Math.max(5, reserve(s, 'hay')));
  });
});

describe('shop', () => {
  it('prices grow with each purchase, and stock arrives over time', () => {
    const s = fresh();
    expect(shopAvailable(s, 'porridge')).toBe(false);
    expect(shopAvailable(s, 'axe')).toBe(false);
    s.pennies = 1000;
    const first = shopCost(s, 'hen');
    expect(buy(s, 'hen')).toBe(true);
    expect(shopCost(s, 'hen')).toBeGreaterThan(first);
    expect(s.pennies).toBe(1000 - first);
    expect(shopAvailable(s, 'porridge')).toBe(true);
    s.yearsPaid = 2;
    expect(shopAvailable(s, 'axe')).toBe(true);
    expect(buy(s, 'axe')).toBe(true);
    expect(buy(s, 'axe')).toBe(false); // max 1
  });
});

describe('the tithe', () => {
  it('takes goods at Michaelmas when you have them', () => {
    const s = fresh();
    s.pips.hay = 0;
    s.goods.hay = 10;
    run(s, BALANCE.yearSeconds + 1);
    expect(s.goods.hay).toBe(2);
    expect(s.records.tithesMet).toBe(1);
    expect(s.yearsPaid).toBe(1);
  });

  it('fines double the shortfall, books the rest into the debt, and never spirals', () => {
    const s = fresh();
    s.pips.hay = 0;
    s.goods.hay = 3; // 5 short of 8
    s.pennies = 4;
    run(s, BALANCE.yearSeconds + 1);
    const fine = 5 * 1 * BALANCE.titheFine;
    expect(s.pennies).toBe(0);
    expect(s.lastTithe).toEqual({ year: 1, met: false, fine: 4, booked: fine - 4 });
    expect(s.debtExtra).toBe(fine - 4);
    // Next year's demand is the normal curve, not raised by the miss.
    expect(titheDue(s)).toEqual({ hay: 12, egg: 2 });
  });
});

describe('the debt and the heir', () => {
  it('Lore depends only on the total paid, however it is split across lives', () => {
    const a = loreForPaid(800);
    const b = loreForPaid(400 + 400);
    expect(a).toBe(b);
    // A Hob who pays 400 twice ends with the same Lore as one who pays 800 once.
    const one = fresh();
    one.yearsPaid = 1;
    one.pennies = 800;
    payDebt(one, 800);
    passOn(one, []);
    const two = fresh();
    two.yearsPaid = 1;
    two.pennies = 400;
    payDebt(two, 400);
    passOn(two, []);
    two.yearsPaid = 1;
    two.pennies = 400;
    payDebt(two, 400);
    passOn(two, []);
    expect(one.loreGranted).toBe(two.loreGranted);
    expect(one.loreGranted).toBe(loreForPaid(800));
  });

  it('the Lord takes half of what is left behind (the heriot)', () => {
    const s = fresh();
    s.yearsPaid = 1;
    s.pennies = 100;
    s.goods.egg = 10; // 20d at base price
    passOn(s, []);
    expect(s.debtPaid).toBeCloseTo((100 + 20) * BALANCE.heriot, 10);
    expect(s.chronicle[0]?.heriot).toBeCloseTo(60, 10);
  });

  it('a new Hob starts over but the family keeps its progress and heirlooms', () => {
    const s = fresh();
    s.yearsPaid = 1;
    s.owned.hen = 3;
    s.pennies = 50;
    s.practice.eggs = BALANCE.practiceCurve * 64; // level 4
    s.demandsDone.push('agnes');
    receiveItem(s, 'bucketHat');
    receiveItem(s, 'leftBoot');
    const keep = s.inventory[0]!.uid;
    const cards = [...s.cardsSeen];
    passOn(s, [keep]);
    expect(s.life).toBe(2);
    expect(s.pennies).toBe(0);
    expect(s.owned.hen).toBe(0);
    expect(s.knowHow.eggs).toBe(4);
    expect(s.demandsDone).toContain('agnes');
    expect(s.cardsSeen).toEqual(expect.arrayContaining(cards));
    expect(s.equipped.head?.uid).toBe(keep);
    expect(s.inventory.length).toBe(0); // the left boot was sold toward the debt
    expect(s.chronicle.length).toBe(1);
  });

  it('cannot retire before the first Michaelmas', () => {
    const s = fresh();
    expect(canRetire(s)).toBe(false);
    expect(passOn(s, [])).toBeNull();
  });

  it('Hob dies at the end of his years and time stops until you pass on', () => {
    const s = fresh();
    advance(s, BALANCE.lifeYears * BALANCE.yearSeconds + 500, 1);
    expect(s.dead).toBe(true);
    expect(s.lifeTime).toBeLessThanOrEqual(BALANCE.lifeYears * BALANCE.yearSeconds + 1);
    const t = s.totalTime;
    step(s, 1);
    expect(s.totalTime).toBe(t);
    expect(currentGoals(s)[0]?.id).toBe('heir');
  });

  it('milestones reward the family straight away', () => {
    const s = fresh();
    s.pennies = BALANCE.debtTotal * 0.011;
    payDebt(s, s.pennies);
    expect(s.milestones).toContain(0);
    expect(s.owned.hen).toBe(1);
  });
});

describe('the village', () => {
  it("Mother Agnes's eggs earn the bucket, which opens Belongings", () => {
    const s = fresh();
    s.owned.hen = 1;
    s.yearsPaid = 1;
    expect(deliver(s, 'agnes')).toBe(false);
    s.goods.egg = 6;
    expect(deliver(s, 'agnes')).toBe(true);
    expect(s.goods.egg).toBe(0);
    expect(s.inventory.map((i) => i.id)).toEqual(['bucketHat']);
    step(s, 0.1);
    expect(s.cardQueue).toContain('equipment');
    expect(s.tabs).toContain('belongings');
    expect(deliver(s, 'agnes')).toBe(false);
  });

  it('a well-practised Hob beats the champion at the fair', () => {
    const s = fresh();
    s.life = 2;
    s.fairContest = 'hayToss';
    s.knowHow.hay = 20;
    s.pennies = 100;
    expect(enterFair(s)).toBe(true);
    run(s, BALANCE.fairAt + 1);
    expect(s.contestWins.hayToss).toBe(1);
    expect(s.titles).toContain(contestDef('hayToss').prize.title);
  });
});

describe('belongings', () => {
  it('merging stacks levels, and wearing a pair discovers a hidden set', () => {
    const s = fresh();
    receiveItem(s, 'leftBoot');
    receiveItem(s, 'leftBoot');
    const [a, b] = s.inventory;
    expect(merge(s, a!.uid, b!.uid)).toBe(true);
    expect(s.inventory.length).toBe(1);
    expect(s.inventory[0]!.level).toBe(1);
    receiveItem(s, 'rightBoot');
    for (const i of [...s.inventory]) equip(s, i.uid);
    expect(s.discoveredSets).toContain('pair');
  });
});

describe('story and goals', () => {
  it('opens with the intro, then teaches one thing at a time', () => {
    const s = newGame(1, 0);
    expect(s.cardQueue).toEqual(['intro']);
    expect(s.tabs).toEqual(['work']);
    dismissCard(s);
    expect(currentGoals(s)[0]?.id).toBe('hay');
    run(s, 25, 0.1);
    expect(s.cardsSeen).toContain('market');
    expect(s.tabs).toContain('market');
  });
});

describe('saves', () => {
  it('round-trip', () => {
    const s = fresh(42);
    run(s, 60);
    const copy = deserialize(serialize(s));
    expect(copy).toEqual(s);
  });

  it('fill in nested fields missing from older saves', () => {
    const s = fresh();
    const raw = JSON.parse(serialize(s));
    delete raw.records.purchases;
    delete raw.owned.rake;
    delete raw.flags;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.records.purchases).toBe(0);
    expect(loaded.owned.rake).toBe(0);
    expect(loaded.flags).toEqual({});
  });

  it('refuse the old prototype and newer versions', () => {
    expect(() => deserialize(JSON.stringify({ v: 1 }))).toThrow();
    expect(() => deserialize(JSON.stringify({ v: 99 }))).toThrow();
  });

  it('catch up offline time, capped at 8 hours', () => {
    const s = fresh();
    s.lastSeen = 0;
    const summary = catchUp(s, 10 * 3600 * 1000);
    expect(summary?.seconds).toBe(BALANCE.offlineCapSeconds);
    // He waits on his deathbed rather than dying away from you.
    expect(s.dead).toBe(true);
  });
});
