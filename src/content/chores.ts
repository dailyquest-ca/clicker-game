import type { ChoreDef, ChoreId } from '../core/types';

export const CHORES: ChoreDef[] = [
  {
    id: 'hay',
    name: 'Haul Hay',
    stat: 'power',
    perLevel: 1,
    baseCost: 4,
    flavor: 'Lift with your back. Everyone here does. Nobody here is over forty.',
  },
  {
    id: 'dodge',
    name: 'Dodge the Steward',
    stat: 'guard',
    perLevel: 1,
    baseCost: 4,
    flavor: 'He has a stick and a quota.',
  },
  {
    id: 'goat',
    name: 'Wrestle the Goat',
    stat: 'power',
    perLevel: 6,
    baseCost: 150,
    unlock: { chore: 'hay', level: 10 },
    flavor: 'The goat has never lost. The goat is not humble about it.',
  },
  {
    id: 'punch',
    name: 'Take a Punch',
    stat: 'guard',
    perLevel: 6,
    baseCost: 150,
    unlock: { chore: 'dodge', level: 10 },
    flavor: "Your brother volunteered to help. He's been waiting years for this.",
  },
];

export const CHORE_IDS: ChoreId[] = CHORES.map((c) => c.id);

export function chore(id: ChoreId): ChoreDef {
  const def = CHORES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown chore ${id}`);
  return def;
}
