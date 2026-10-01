// The quirk layer. Cheap to write, and roughly half of why NGU keeps people around.

export const DEATH_CAUSES = [
  'a bad turnip',
  'excessive opinions from a rooster',
  'falling into the moat (there is no moat)',
  'a cold you insisted was nothing',
  'laughing at the Bailiff, out loud',
  'an argument with a goose about property rights',
  'eating the Mushroom of Questionable Origin, fully',
  'old age, at 31, which was normal at the time',
  'trying to lift the goat instead of wrestling it',
  'a sudden and total lack of luck',
];

export const AMBIENT_LINES = [
  'A pig looks at you with something like respect.',
  'Gerald walks past and writes something down.',
  'It rains. Of course it rains.',
  'You find a coin. It is a button.',
  'The goat is watching. The goat is always watching.',
  'A travelling monk tells you to work harder. Then he leaves.',
  'Somewhere, a Lord sneezes. You feel this is your fault.',
  'The hay is damp again. The hay is always damp.',
  'A child asks if you are a knight. You are not. You say yes.',
  'You stub your toe on destiny. It is a rock.',
];

export const CHORE_MILESTONE_LINES: Record<string, string[]> = {
  hay: ['Your arms remember hay.', 'You can now carry hay and a grudge.', 'The hay fears you.'],
  dodge: ['Gerald misses. Gerald is furious.', 'You dodge a stick, a fine and a responsibility.', 'You are a blur. A muddy blur.'],
  goat: ['The goat respects you now.', 'The goat taught you a move. You will not repeat it.', 'You and the goat are rivals. Maybe friends.'],
  punch: ['Your brother tires before you do.', 'You took a punch and gave a look.', 'Your face has achieved a kind of peace.'],
};

export function epitaph(cause: string, ageYears: number, bosses: number): string {
  if (bosses >= 10) return `Toppled the Bailiff, then died of ${cause} at ${ageYears}. Legend.`;
  if (bosses >= 6) return `Feared by tax collectors. Died of ${cause} at ${ageYears}.`;
  if (bosses >= 3) return `Got the better of Gerald. Died of ${cause} at ${ageYears}.`;
  return `Lost an argument with poultry. Died of ${cause} at ${ageYears}.`;
}
