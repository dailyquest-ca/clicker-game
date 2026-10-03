import type { Bonuses, GoodId } from '../core/types';

/** What the Steward wants each Michaelmas, by year of a Hob's life. Fixed, so you can plan; it always fits a barn with a basket. */
const TITHES: Partial<Record<GoodId, number>>[] = [
  { hay: 8 },
  { hay: 12, egg: 2 },
  { hay: 12, egg: 5 },
  { hay: 10, egg: 8, log: 2 },
  { hay: 12, egg: 9, log: 3 },
  { hay: 14, egg: 10, log: 3 },
  { hay: 15, egg: 11, log: 4 },
  { hay: 16, egg: 12, log: 4 },
  { hay: 18, egg: 13, log: 5 },
];

/** The Steward's demand for year y of a Hob's life (0-based). Hardy Hobs who outlive the table pay 10% more each extra year. */
export function titheFor(year: number, hasAxe: boolean): Partial<Record<GoodId, number>> {
  const last = TITHES[TITHES.length - 1]!;
  const base = year < TITHES.length ? TITHES[year]! : scale(last, Math.pow(1.1, year - TITHES.length + 1));
  if (!hasAxe && base.log) {
    // No axe, no logs: Gerald sighs and lets the firewood go. He writes something down.
    const { log: _log, ...rest } = base;
    return rest;
  }
  return base;
}

function scale(t: Partial<Record<GoodId, number>>, f: number): Partial<Record<GoodId, number>> {
  const out: Partial<Record<GoodId, number>> = {};
  for (const [k, v] of Object.entries(t) as [GoodId, number][]) out[k] = Math.round(v * f);
  return out;
}

export interface Milestone {
  pct: number;
  name: string;
  desc: string;
  bonus?: Partial<Bonuses>;
  /** Extra starting assets for every future Hob. */
  start?: { hens?: number; basket?: boolean; axe?: boolean };
  heirlooms?: number;
}

// Paying the debt is permanent progress; these are the family's rewards along the way.
export const MILESTONES: Milestone[] = [
  { pct: 1, name: 'Gerald Stops Sighing', desc: 'Every Hob starts with a hen (this one included).', start: { hens: 1 } },
  { pct: 2.5, name: 'A Good Name', desc: 'Sell prices +10%, forever.', bonus: { pricePct: 10 } },
  { pct: 5, name: 'Family Heirloom Chest', desc: '+1 heirloom slot.', heirlooms: 1 },
  { pct: 10, name: 'Aunt’s Basket', desc: 'Every Hob starts with the Wicker Basket.', start: { basket: true } },
  { pct: 20, name: 'Well Fed', desc: '+1 stamina pip, forever.', bonus: { pips: 1 } },
  { pct: 35, name: 'Grandad’s Axe (Found It)', desc: 'Every Hob starts with an axe.', start: { axe: true } },
  { pct: 50, name: 'Pride of the Village', desc: 'All work +25%, forever.', bonus: { workPct: 25 } },
  { pct: 75, name: 'The Lord’s Nod', desc: 'Sell prices +15%, forever.', bonus: { pricePct: 15 } },
  { pct: 100, name: 'FREE', desc: 'The goat debt is paid. The family is free.' },
];
