import type { GameState, GoodId } from '../core/types';

// Demands: villagers (and the Lord) want things. They are the quest chain, the story, and the unlock order.
export interface DemandDef {
  id: string;
  from: string;
  ask: string;
  wants: Partial<Record<GoodId, number>>;
  reward: { item?: string; pennies?: number; flag?: string };
  thanks: string;
  /** When it appears. Done demands never come back, in any life. */
  when: (g: GameState) => boolean;
}

export const DEMANDS: DemandDef[] = [
  {
    id: 'agnes',
    from: 'Mother Agnes',
    ask: 'Six eggs for a cake, dear. It’s for the Steward. It’s a peace cake.',
    wants: { egg: 6 },
    reward: { item: 'bucketHat' },
    thanks: 'She gives you a bucket to wear. "It suited your grandad. Nothing else did."',
    when: (g) => g.yearsPaid >= 1 && g.owned.hen >= 1,
  },
  {
    id: 'wat',
    from: 'Old Wat the Thatcher',
    ask: 'Twenty hay. My roof has gone sideways again.',
    wants: { hay: 20 },
    reward: { item: 'pitchfork', pennies: 15 },
    thanks: 'Wat pays you and throws in a pitchfork. "Bent. Like me. Still works. Unlike me."',
    when: (g) => g.yearsPaid >= 2,
  },
  {
    id: 'cuthbert',
    from: 'Brother Cuthbert',
    ask: 'The abbey requires twelve eggs. For research. Do not ask about the research.',
    wants: { egg: 12 },
    reward: { item: 'luckyFeather', pennies: 20 },
    thanks: 'Cuthbert blesses you, then your hens, then, nervously, your bucket.',
    when: (g) => g.life >= 2 || g.yearsPaid >= 4,
  },
  {
    id: 'reginald',
    from: 'Sir Reginald the Moderately Brave',
    ask: 'Ten logs for a bonfire. A moderately brave bonfire.',
    wants: { log: 10 },
    reward: { item: 'barkVest', pennies: 40 },
    thanks: 'Sir Reginald knights a nearby log. He gives you his old vest. It is made of bark.',
    when: (g) => g.owned.axe >= 1,
  },
  {
    id: 'kitchen',
    from: 'The Lord’s Kitchen',
    ask: 'Thirty eggs and twenty logs for the Lord’s birthday. He is turning 9.',
    wants: { egg: 30, log: 20 },
    reward: { item: 'potHelm', pennies: 120 },
    thanks: 'The cook gives you a pot. You put it on your head. Promotion, of sorts.',
    when: (g) => g.life >= 2 && g.owned.axe >= 1,
  },
  {
    id: 'gerald',
    from: 'Steward Gerald',
    ask: 'Forty hay. Not for the tithe. For… personal reasons. Don’t write that down.',
    wants: { hay: 40 },
    reward: { item: 'flourTunic', pennies: 60 },
    thanks: 'Gerald does not explain. Gerald gives you a flour sack. Gerald walks away briskly.',
    when: (g) => g.life >= 3,
  },
];

// The Michaelmas Fair: one contest a year, from the second generation on.
export interface ContestDef {
  id: string;
  name: string;
  skill: 'hay' | 'eggs' | 'logs' | 'rummage' | 'tithes';
  champion: string;
  /** The champion's score at each tier; beat it to move up. */
  scores: number[];
  prize: { item?: string; pennies: number; title: string };
  flavor: string;
}

export const CONTESTS: ContestDef[] = [
  { id: 'hayToss', name: 'Hay-Tossing', skill: 'hay', champion: 'Big Wat', scores: [40, 90, 180, 320], prize: { item: 'pitchfork', pennies: 30, title: 'Hay-Tosser' }, flavor: 'Throw a bale over the bailiff. The bailiff is not consulted.' },
  { id: 'eggRoll', name: 'Egg-Rolling', skill: 'eggs', champion: 'Mother Agnes (undefeated since 1290)', scores: [40, 90, 180, 320], prize: { item: 'usedBucket', pennies: 40, title: 'Egg Roller' }, flavor: 'Roll an egg down Gibbet Hill. Do not think about the name.' },
  { id: 'argue', name: 'Out-Argue Gerald', skill: 'tithes', champion: 'Steward Gerald', scores: [30, 70, 140, 260], prize: { item: 'turnip', pennies: 50, title: 'Barrack-Room Lawyer' }, flavor: 'The crowd loves it. Gerald does not.' },
  { id: 'logSplit', name: 'Log-Splitting', skill: 'logs', champion: 'Sir Reginald’s Squire', scores: [40, 90, 180, 320], prize: { item: 'rustySword', pennies: 50, title: 'Log Splitter' }, flavor: 'Split a log in one blow. Or many blows. Style points apply.' },
  { id: 'heapDive', name: 'Dung Heap Diving', skill: 'rummage', champion: 'A Pig Named Gloria', scores: [40, 90, 180, 320], prize: { item: 'squelchyBoots', pennies: 40, title: 'Heap Diver' }, flavor: 'Find the most in one minute. Gloria has trained her whole life.' },
];
