import type { ItemDef, SetDef } from '../core/types';

// Odd things worn as equipment. They come from demands, the dung heap, the peddler and the fair.
export const ITEMS: ItemDef[] = [
  { id: 'bucketHat', name: 'Upside-Down Bucket', slot: 'head', stats: { hayPct: 15 }, value: 8, flavor: 'Keeps the sun off. Echoes when you think.' },
  { id: 'usedBucket', name: 'Slightly Used Bucket', slot: 'body', stats: { eggPct: 15 }, value: 8, flavor: 'Worn as armour. The hens find it reassuring. Don’t ask why.' },
  { id: 'pitchfork', name: 'Pitchfork (Bent)', slot: 'hands', stats: { hayPct: 20 }, value: 10, flavor: 'Three prongs. Two of them agree on a direction.' },
  { id: 'leftBoot', name: 'Left Boot', slot: 'feet', stats: { workPct: 5 }, value: 4, flavor: 'Just the one.' },
  { id: 'rightBoot', name: 'Right Boot (Different Size)', slot: 'trinket', stats: { pricePct: 5 }, value: 4, flavor: 'Worn on a string round your neck. Customers pity you. It works.' },
  { id: 'luckyFeather', name: 'Lucky Feather', slot: 'trinket', stats: { luckPct: 25 }, value: 10, flavor: 'The hen it came from was not lucky.' },
  { id: 'hayHat', name: 'Damp Hay Hat', slot: 'head', stats: { hayPct: 10, barn: 10 }, value: 6, flavor: 'Smells like home. Home smells bad. You can store things in it.' },
  { id: 'badgerHat', name: 'Badger Hat', slot: 'head', stats: { workPct: 10 }, value: 20, flavor: 'It’s still alive. It’s motivating. It’s fine.' },
  { id: 'barkVest', name: 'Bark Vest', slot: 'body', stats: { logPct: 20 }, value: 15, flavor: 'Splinters are a form of armour if you think about it.' },
  { id: 'sharpStick', name: 'Sharpened Stick', slot: 'hands', stats: { logPct: 10, rummagePct: 15 }, value: 12, flavor: 'Humanity’s first idea, and still a good one.' },
  { id: 'squelchyBoots', name: 'Squelchy Boots', slot: 'feet', stats: { rummagePct: 25 }, value: 12, flavor: 'Made for the dung heap. Made OF the dung heap, partly.' },
  { id: 'mushroom', name: 'Mushroom of Questionable Origin', slot: 'trinket', stats: { workPct: 30, pricePct: -10 }, value: 15, flavor: 'You work like a demon. Customers back away slowly.' },
  { id: 'turnip', name: 'Turnip of Moderate Luck', slot: 'trinket', stats: { pricePct: 10, luckPct: 10 }, value: 12, flavor: 'Not lucky. Not unlucky. Moderately.' },
  { id: 'potHelm', name: 'Helmet (Mostly Pot)', slot: 'head', stats: { eggPct: 20 }, value: 18, flavor: 'Still has some stew in it. The hens approve.' },
  { id: 'flourTunic', name: 'Flour Sack Tunic', slot: 'body', stats: { pricePct: 10 }, value: 15, flavor: 'You look like a miller. Millers get better prices. Nobody checks.' },
  { id: 'rustySword', name: 'Rusty Sword', slot: 'hands', stats: { logPct: 25 }, value: 30, flavor: 'Not for chopping. Used for chopping. Serfs may not own swords; it’s an axe now.' },
  { id: 'highwayBoots', name: 'Highwayman’s Boots', slot: 'feet', stats: { pricePct: 15 }, value: 25, flavor: 'They walk faster near other people’s purses.' },
  { id: 'millstone', name: 'Millstone Necklace', slot: 'trinket', stats: { pips: 1, workPct: -15 }, value: 20, flavor: 'You can carry anything now. Slowly.' },
  { id: 'goldenTurnip', name: 'Golden Turnip', slot: 'trinket', stats: { pricePct: 25, luckPct: 25 }, value: 60, flavor: 'The rarest vegetable. Do not eat. Do not let Gerald see.' },
];

// Hidden until you wear the whole combination. Discovering them is half the fun.
export const SETS: SetDef[] = [
  { id: 'pair', name: 'Technically a Pair', items: ['leftBoot', 'rightBoot'], bonus: { workPct: 10, pricePct: 10 }, flavor: 'Two boots. Both worn. Nobody said where.' },
  { id: 'bucketKnight', name: 'Bucket Knight', items: ['bucketHat', 'usedBucket'], bonus: { eggPct: 25, hayPct: 10 }, flavor: 'Clank. The hens salute.' },
  { id: 'forager', name: 'Forager (The Badger Is Calmer Now)', items: ['badgerHat', 'mushroom'], bonus: { luckPct: 40 }, flavor: 'The badger ate some of the mushroom. You both see more now.' },
  { id: 'miller', name: 'Honest Miller', items: ['potHelm', 'flourTunic', 'millstone'], bonus: { pricePct: 20 }, flavor: 'Nobody suspects a man covered in flour.' },
  { id: 'highway', name: 'Highway Robbery', items: ['highwayBoots', 'rustySword'], bonus: { pricePct: 20, logPct: 10 }, flavor: 'Stand and deliver. Mostly stand.' },
];

/** What the dung heap gives up, and how often. Better finds need luck. */
export const HEAP_LOOT: { item: string; weight: number; luck: number }[] = [
  { item: 'leftBoot', weight: 5, luck: 0 },
  { item: 'rightBoot', weight: 4, luck: 0 },
  { item: 'hayHat', weight: 4, luck: 0 },
  { item: 'usedBucket', weight: 3, luck: 0 },
  { item: 'luckyFeather', weight: 3, luck: 0 },
  { item: 'squelchyBoots', weight: 3, luck: 0 },
  { item: 'sharpStick', weight: 2, luck: 10 },
  { item: 'badgerHat', weight: 2, luck: 20 },
  { item: 'mushroom', weight: 2, luck: 20 },
  { item: 'turnip', weight: 2, luck: 30 },
  { item: 'potHelm', weight: 1.5, luck: 40 },
  { item: 'flourTunic', weight: 1.5, luck: 40 },
  { item: 'millstone', weight: 1, luck: 60 },
  { item: 'goldenTurnip', weight: 0.3, luck: 80 },
];

/** Things the peddler hawks once a year. */
export const PEDDLER_STOCK = ['barkVest', 'turnip', 'highwayBoots', 'flourTunic', 'potHelm', 'badgerHat', 'mushroom', 'rustySword'];

export function itemDef(id: string): ItemDef {
  const def = ITEMS.find((i) => i.id === id);
  if (!def) throw new Error(`Unknown item ${id}`);
  return def;
}
