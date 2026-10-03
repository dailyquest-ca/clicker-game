import type { ChoreDef, ChoreId, GoodDef, GoodId } from '../core/types';

export const GOODS: GoodDef[] = [
  { id: 'hay', name: 'Hay', plural: 'hay', price: 1 },
  { id: 'egg', name: 'Egg', plural: 'eggs', price: 2 },
  { id: 'log', name: 'Log', plural: 'logs', price: 3 },
];

export const GOOD_IDS: GoodId[] = GOODS.map((g) => g.id);

export const CHORES: ChoreDef[] = [
  {
    id: 'hay',
    name: 'Cut Hay',
    good: 'hay',
    work: 8,
    bonus: 'hayPct',
    flavor: 'The Lord owns the field. You own the blisters.',
  },
  {
    id: 'eggs',
    name: 'Collect Eggs',
    good: 'egg',
    work: 6,
    bonus: 'eggPct',
    flavor: 'Each hen needs one pair of hands. Hens are very clear about this.',
  },
  {
    id: 'logs',
    name: 'Chop Firewood',
    good: 'log',
    work: 10,
    bonus: 'logPct',
    flavor: 'Wood is worth more than hay. So is most of the Lord’s furniture, apparently.',
  },
  {
    id: 'rummage',
    name: 'Rummage the Dung Heap',
    good: null,
    work: 14,
    bonus: 'rummagePct',
    flavor: 'Generations of the village’s secrets, lightly composted.',
  },
];

export const CHORE_IDS: ChoreId[] = CHORES.map((c) => c.id);

export function chore(id: ChoreId): ChoreDef {
  const def = CHORES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown chore ${id}`);
  return def;
}

export function good(id: GoodId): GoodDef {
  const def = GOODS.find((g) => g.id === id);
  if (!def) throw new Error(`Unknown good ${id}`);
  return def;
}
