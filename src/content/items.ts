import type { ItemDef, SetDef } from '../core/types';

export const MAX_ITEM_LEVEL = 10;

export const ITEMS: ItemDef[] = [
  // The Barnyard
  { id: 'bucketHat', name: 'Upside-Down Bucket', slot: 'head', stats: { guardFlat: 2 }, flavor: 'Echoes when you think.' },
  { id: 'usedBucket', name: 'Slightly Used Bucket', slot: 'body', stats: { guardFlat: 3 }, flavor: 'Worn as armour. Used for... other things. Previously.' },
  { id: 'pitchfork', name: 'Pitchfork (Bent)', slot: 'weapon', stats: { powerFlat: 4 }, flavor: 'Three prongs. Two of them agree on a direction.' },
  { id: 'leftBoot', name: 'Left Boot', slot: 'feet', stats: { powerFlat: 1, guardFlat: 1 }, flavor: 'Just the one.' },
  { id: 'rightBoot', name: 'Right Boot (Different Size)', slot: 'trinket', stats: { powerFlat: 2 }, flavor: "Worn on a string round your neck. Don't ask." },
  { id: 'luckyFeather', name: 'Lucky Feather', slot: 'trinket', stats: { dropPct: 15 }, flavor: 'The hen it came from was not lucky.' },
  { id: 'hayHat', name: 'Damp Hay Hat', slot: 'head', stats: { guardFlat: 1, regenPct: 10 }, flavor: 'Smells like home. Home smells bad.' },
  // The Woods
  { id: 'badgerHat', name: 'Badger Hat', slot: 'head', stats: { powerFlat: 6, guardFlat: 3 }, flavor: "It's still alive. It's fine. It's fine." },
  { id: 'barkVest', name: 'Bark Vest', slot: 'body', stats: { guardFlat: 8 }, flavor: 'Splinters are a form of armour if you think about it.' },
  { id: 'sharpStick', name: 'Sharpened Stick', slot: 'weapon', stats: { powerFlat: 12 }, flavor: 'Humanity\'s first idea, and still a good one.' },
  { id: 'squelchyBoots', name: 'Squelchy Boots', slot: 'feet', stats: { powerFlat: 3, guardFlat: 4 }, flavor: 'They announce you. Loudly. Wetly.' },
  { id: 'mushroom', name: 'Mushroom of Questionable Origin', slot: 'trinket', stats: { regenPct: 40, guardPct: -10 }, flavor: 'You feel energised. The trees feel watched.' },
  { id: 'turnip', name: 'Turnip of Moderate Luck', slot: 'trinket', stats: { goldPct: 25, dropPct: 10 }, flavor: 'Not lucky. Not unlucky. Moderately.' },
  // The Old Mill
  { id: 'potHelm', name: 'Helmet (Mostly Pot)', slot: 'head', stats: { powerFlat: 8, guardFlat: 10 }, flavor: 'Still has some stew in it. Bonus.' },
  { id: 'flourTunic', name: 'Flour Sack Tunic', slot: 'body', stats: { guardFlat: 20 }, flavor: 'You leave a little cloud wherever you go.' },
  { id: 'rustySword', name: 'Rusty Sword', slot: 'weapon', stats: { powerFlat: 40 }, flavor: 'A real sword. Serfs are not allowed swords. Act casual.' },
  { id: 'highwayBoots', name: "Highwayman's Boots", slot: 'feet', stats: { powerFlat: 15, goldPct: 15 }, flavor: 'They walk faster near other people\'s purses.' },
  { id: 'millstone', name: 'Millstone Necklace', slot: 'trinket', stats: { guardFlat: 30, powerPct: -15 }, flavor: 'Excellent protection. Terrible for your neck.' },
  { id: 'goldenTurnip', name: 'Golden Turnip', slot: 'trinket', stats: { goldPct: 60, dropPct: 25, powerPct: 10 }, flavor: 'The rarest vegetable. Do not eat.' },
];

// Hidden until you equip the full combination. Discovering them is half the fun.
export const SETS: SetDef[] = [
  { id: 'pair', name: 'Technically a Pair', items: ['leftBoot', 'rightBoot'], bonus: { powerPct: 15, guardPct: 15 }, flavor: 'Two boots. Both worn. Nobody said where.' },
  { id: 'bucketKnight', name: 'Bucket Knight', items: ['bucketHat', 'usedBucket'], bonus: { guardPct: 30 }, flavor: 'Clank.' },
  { id: 'forager', name: 'Forager (The Badger Is Calmer Now)', items: ['badgerHat', 'mushroom'], bonus: { dropPct: 40 }, flavor: 'The badger ate some of the mushroom. You both see more now.' },
  { id: 'miller', name: 'Honest Miller', items: ['potHelm', 'flourTunic', 'millstone'], bonus: { goldPct: 50, guardPct: 20 }, flavor: 'Nobody suspects a man covered in flour.' },
  { id: 'highway', name: 'Highway Robbery', items: ['highwayBoots', 'rustySword'], bonus: { powerPct: 30, goldPct: 20 }, flavor: 'Stand and deliver. Mostly stand.' },
];

export function itemDef(id: string): ItemDef {
  const def = ITEMS.find((i) => i.id === id);
  if (!def) throw new Error(`Unknown item ${id}`);
  return def;
}

export function setDef(id: string): SetDef {
  const def = SETS.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown set ${id}`);
  return def;
}
