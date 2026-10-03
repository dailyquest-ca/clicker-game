// The goals panel: at most three things worth doing next, worked out from the state (never stored).
// It is the onboarding: early goals teach the loop, later ones point at whatever is about to matter.

import { BALANCE } from './balance';
import { good } from '../content/chores';
import { shopDef, TRADITIONS } from '../content/shop';
import {
  activeDemands,
  contestDef,
  effectivePips,
  hasBadBack,
  idlePips,
  nextMilestone,
  shopCost,
  titheDue,
  titheProgress,
  toMichaelmas,
  totalPips,
  traditionCost,
  yearTime,
} from './formulas';
import type { GameState, GoodId } from './types';

export interface Goal {
  id: string;
  text: string;
  have?: number;
  need?: number;
}

const MAX_GOALS = 3;

export function goodsText(wants: Partial<Record<GoodId, number>>): string {
  return (Object.entries(wants) as [GoodId, number][])
    .filter(([, n]) => n > 0)
    .map(([g, n]) => `${n} ${n === 1 ? good(g).name.toLowerCase() : good(g).plural}`)
    .join(', ');
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function currentGoals(g: GameState): Goal[] {
  if (g.dead) return [{ id: 'heir', text: `${g.name}'s time has come. Choose his heirlooms and pass the pitchfork on.` }];
  const out: Goal[] = [];
  const add = (goal: Goal) => {
    if (out.length < MAX_GOALS) out.push(goal);
  };
  const seen = (card: string) => g.cardsSeen.includes(card);

  // Teaching the loop, one step at a time.
  if (!seen('market')) add({ id: 'hay', text: 'Cut 8 hay', have: g.goods.hay, need: 8 });
  if (g.life === 1 && g.owned.hen === 0 && g.tabs.includes('shop')) {
    add({ id: 'firstHen', text: 'Sell hay and save up for a hen', have: g.pennies, need: shopCost(g, 'hen') });
  }
  const untended = Math.min(g.owned.hen, totalPips(g)) - effectivePips(g, 'eggs');
  if (untended > 0 && g.pips.eggs < g.owned.hen) {
    add({ id: 'eggs', text: `${untended} hen${untended === 1 ? ' is' : 's are'} untended. Put a pip on Collect Eggs.` });
  }
  const idle = idlePips(g);
  if (idle > 0) add({ id: 'idle', text: `${idle} pip${idle === 1 ? ' is' : 's are'} standing about. Give ${idle === 1 ? 'it' : 'them'} a chore.` });

  // What's coming up.
  if (g.tabs.includes('manor')) {
    const p = titheProgress(g);
    if (p.have < p.need) add({ id: 'tithe', text: `Michaelmas in ${clock(toMichaelmas(g))}. Gerald wants ${goodsText(titheDue(g))}.`, have: p.have, need: p.need });
  }
  for (const d of activeDemands(g)) {
    const entries = Object.entries(d.wants) as [GoodId, number][];
    add({
      id: `demand-${d.id}`,
      text: `${d.from} wants ${goodsText(d.wants)}.`,
      have: entries.reduce((s, [k, n]) => s + Math.min(n, g.goods[k]), 0),
      need: entries.reduce((s, [, n]) => s + n, 0),
    });
  }
  if (g.savingFor) add({ id: 'saving', text: `Saving for ${shopDef(g.savingFor).name}`, have: g.pennies, need: shopCost(g, g.savingFor) });
  if (TRADITIONS.some((t) => g.traditions[t.id] < t.max && traditionCost(g, t.id) <= g.lore)) add({ id: 'lore', text: 'You have Lore to spend on a family Tradition.' });
  if (g.fairContest && !g.fairEntered && g.tabs.includes('fair') && yearTime(g) < BALANCE.fairAt) {
    add({ id: 'fair', text: `Lammas Fair at the end of Summer: ${contestDef(g.fairContest).name}.` });
  }
  if (hasBadBack(g)) add({ id: 'back', text: 'Your back has gone. Pay what you can toward the debt, then retire or work on.' });
  if (seen('debt')) {
    const m = nextMilestone(g);
    if (m) add({ id: 'milestone', text: `Pay the debt to ${Math.ceil(m.at).toLocaleString('en-GB')}d: "${m.milestone.name}"`, have: g.debtPaid, need: m.at });
  }
  if (out.length === 0 && seen('shop')) add({ id: 'shop', text: 'Pick something in the shop to save for.' });
  return out;
}
