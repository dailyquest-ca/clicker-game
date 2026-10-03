import type { GameState, TabId } from '../core/types';

// Story cards: each new system arrives with a short scene that says what it is, why it matters, and what you control.
// The clock pauses while a card is open.
export interface StoryCard {
  id: string;
  title: string;
  body: string[];
  /** Your levers, in plain words. */
  levers?: string[];
  opens?: TabId[];
  when: (g: GameState) => boolean;
}

export const STORY: StoryCard[] = [
  {
    id: 'intro',
    title: 'The Ledger',
    body: [
      'In the year 1302, your grandad "borrowed" the Lord’s goat. The goat was never returned. Nobody will say what happened to it.',
      'The family has owed the Lord £50 ever since. With a century of Gerald’s “interest”, it’s now £150. That’s 36,000 pennies. And one goat.',
      'Your father died this morning, which makes the debt yours. So is his pitchfork. And his hat. And the debt.',
      'You are Hob. You are 30. You have three pips of stamina and a field of hay. Time to work.',
    ],
    levers: ['Your stamina pips are already cutting hay. Each pip does a steady amount of work.', 'Hay is worth a penny. It is a start.', 'The goals list on the right always says what to do next.'],
    opens: ['work'],
    when: () => true,
  },
  {
    id: 'market',
    title: 'Market Day',
    body: ['You have a respectable pile of hay. The market will buy it. The market will buy almost anything.'],
    levers: ['Sell goods for pennies whenever you like.', 'Your barn only holds so much. Anything that doesn’t fit gets sold off cheap.'],
    opens: ['market'],
    when: (g) => g.goods.hay + g.soldThisLife >= 8 || g.life > 1,
  },
  {
    id: 'shop',
    title: 'The Village Shop',
    body: ['With pennies in your pocket, the village shop suddenly remembers your name.', 'It only ever has a few things worth buying. Choose well; prices go up.'],
    levers: ['Each item shows what it would earn you, and whether it pays for itself before your back gives out.', 'Pin something to save for, and watch the bar fill.'],
    opens: ['shop', 'stats'],
    when: (g) => g.records.earnedTotal >= 8 || g.life > 1,
  },
  {
    id: 'hen',
    title: 'A Hen!',
    body: ['She looks at you. You look at her. An understanding is reached.', 'Eggs sell for two pennies. But a hen needs tending: one stamina pip per hen. Pips without hens collect nothing.'],
    levers: ['Move a pip onto Collect Eggs.', 'More hens need more pips. More pips need porridge.'],
    when: (g) => g.owned.hen >= 1 && g.life === 1,
  },
  {
    id: 'tithe',
    title: 'Steward Gerald',
    body: [
      'A man with a ledger and no sense of humour is at the gate. This is Gerald, the Lord’s Steward.',
      'Every Michaelmas, the end of the year, Gerald collects the Lord’s tithe: goods, not pennies. He will tell you what he wants well in advance.',
      'Miss it, and he fines you double what you were short, or writes it into the family debt.',
    ],
    levers: ['The tithe basket sets aside what Gerald wants, so you don’t sell it by accident.', 'Watch the countdown. Plan your chores around it.'],
    opens: ['manor'],
    when: (g) => g.lifeTime >= 45 || g.owned.hen >= 1 || g.life > 1,
  },
  {
    id: 'debt',
    title: 'The Family Debt',
    body: [
      'Gerald shows you the family’s page in his ledger. It is a long page.',
      'You can pay toward the debt at any time. Every penny paid stays paid, forever, for every Hob who comes after you.',
      'But pennies in your pocket do not survive you. When you die, the Lord takes half of whatever you leave behind. Spend wisely: grow your farm, or pay down the debt.',
    ],
    levers: ['Pay any amount, any time.', 'Milestones along the way give the family permanent help.'],
    when: (g) => g.yearsPaid >= 1 || g.life > 1,
  },
  {
    id: 'equipment',
    title: 'Belongings',
    body: ['You now own a thing that is not a pitchfork. It is worn on the head. It helps, somehow.', 'Odd things turn up: from neighbours, from the peddler, from places you’d rather not rummage.'],
    levers: ['Wear one thing per slot.', 'Two of the same thing can be merged into a better one.', 'Some things work better together. Nobody will tell you which.'],
    opens: ['belongings'],
    when: (g) => g.inventory.length > 0 || Object.values(g.equipped).some(Boolean),
  },
  {
    id: 'standing',
    title: 'A Regular at the Market',
    body: ['The market woman knows your face now. "Just tell me what to keep, love, and I’ll sell the rest."'],
    levers: ['Standing orders: keep a number of each good, sell the rest automatically.'],
    when: (g) => g.records.soldTotal >= 40 || g.traditions.contacts > 0,
  },
  {
    id: 'oldage',
    title: 'Hob’s Back',
    body: [
      'You are getting on. Your back makes a noise when you stand up. The noise has opinions.',
      'From now on, all your work is slower. You can keep going, or retire and hand the pitchfork to your heir.',
    ],
    levers: ['Retire any time from the Family tab.', 'Before you go: pay what you can. The Lord takes half of what you leave.'],
    opens: ['family'],
    when: (g) => g.flags.badBack === true,
  },
  {
    id: 'heir',
    title: 'The Heir',
    body: [
      'A new Hob picks up the pitchfork. Same field, same goat debt, slightly better at everything.',
      'Family know-how makes every chore you’ve practised faster. Lore, earned from the debt your family has paid, buys Traditions that help every Hob to come.',
    ],
    levers: ['Spend Lore on Traditions in the Family tab.', 'Choose your heirlooms carefully next time.'],
    opens: ['family'],
    when: (g) => g.life >= 2,
  },
  {
    id: 'heap',
    title: 'The Dung Heap',
    body: ['Your father’s will mentions "the heap". Every family has one. Yours is enormous.', 'Things turn up in it. Boots. Hats. Once, a sword. Nobody knows how.'],
    levers: ['Put a pip on Rummage to find odd belongings.', 'Luck makes the good stuff turn up.'],
    when: (g) => g.life >= 2,
  },
  {
    id: 'fair',
    title: 'The Lammas Fair',
    body: ['Once a year, at the end of Summer, the village holds a fair with one contest. Champions are local legends. Beating them makes you one.'],
    levers: ['Pay the entry fee before the fair if you fancy your chances.', 'Your score comes from practice at the matching chore (yours and your family’s), plus your gear.', 'Each win earns a prize and a title, and the champion trains harder for next time.'],
    opens: ['fair'],
    when: (g) => g.life >= 2,
  },
  {
    id: 'rumour',
    title: 'Market Rumours',
    body: ['The peddler hears things. "Next year," he says, tapping his nose, "something will be dear. Or cheap. One of those." He is usually right about which.'],
    levers: ['One good’s price changes each year. The Market tab shows next year’s rumour a whole year ahead.', 'Plan your hens and pips around it.'],
    when: (g) => g.life >= 2 && g.rumour !== null,
  },
  {
    id: 'free',
    title: 'Free',
    body: [
      'Gerald turns the ledger round so you can see it. The family’s page has a line through it. A long line. He used a ruler.',
      'The goat debt is paid. After all these years, and all these Hobs, the family is free.',
      'Gerald clears his throat. "About the goat itself," he says. That is a story for another era.',
    ],
    levers: ['That’s the end of Era 1 in this prototype. Thank you for playing.'],
    when: (g) => g.flags.free === true,
  },
];
