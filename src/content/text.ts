// The quirk layer. Cheap to write, and roughly half of why NGU keeps people around.

export const DEATH_CAUSES = [
  'a bad turnip',
  'excessive opinions from a rooster',
  'falling into the moat (there is no moat)',
  'a cold he insisted was nothing',
  'laughing at the Bailiff, out loud',
  'an argument with a goose about property rights',
  'eating the Mushroom of Questionable Origin, fully',
  'old age, which was considered greedy',
  'trying to lift a hay bale and a grudge at once',
  'a sudden and total lack of luck',
];

export const AMBIENT_LINES = [
  'A pig looks at you with something like respect.',
  'Gerald walks past and writes something down.',
  'It rains. Of course it rains.',
  'You find a coin. It is a button.',
  'The hens are holding a meeting. You are not invited.',
  'A travelling monk tells you to work harder. Then he leaves.',
  'Somewhere, a Lord sneezes. You feel this is your fault.',
  'The hay is damp again. The hay is always damp.',
  'A child asks if you are a knight. You are not. You say yes.',
  'Someone mentions the goat. Everyone goes quiet.',
];

export const PRACTICE_LINES: Record<string, string[]> = {
  hay: ['Your arms remember hay.', 'You can cut hay in your sleep. You have.', 'The hay fears you.'],
  eggs: ['The hens trust you now.', 'You can tell the hens apart. They can’t tell you apart.', 'An egg lands in your hand before it lands at all.'],
  logs: ['The axe feels lighter. You feel heavier.', 'Trees flinch when you pass.', 'You split a log by looking at it. Nearly.'],
  rummage: ['You know where the good dung is.', 'You can smell a boot at forty paces.', 'The heap respects you.'],
};

export const HEIR_NAMES = ['Hob', 'Hob the Younger', 'Hob the Even Younger', 'Young Hob', 'Hob (Again)', 'Hob the Persistent', 'Hob the Sixth-ish', 'Hob the Hopeful', 'Hob the Nearly Free', 'Hob the Tired'];

export function epitaph(cause: string, age: number, paid: number): string {
  if (paid >= 2000) return `Paid ${paid} pennies of the goat debt. The village will sing of it (badly). Died of ${cause} at ${age}.`;
  if (paid >= 500) return `Chipped ${paid} pennies off the goat debt. Died of ${cause} at ${age}.`;
  if (paid > 0) return `Paid ${paid} pennies toward the goat. Died of ${cause} at ${age}.`;
  return `Paid nothing toward the goat. Gerald has noted this. Died of ${cause} at ${age}.`;
}
