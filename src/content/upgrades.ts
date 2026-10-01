import type { AchievementDef, PerkDef, PerkId, UpgradeDef, UpgradeId } from '../core/types';

// Market upgrades: bought with gold, reset every life.
export const UPGRADES: UpgradeDef[] = [
  { id: 'porridge', name: 'Porridge Subscription', perLevel: { regenPct: 25 }, baseCost: 15, growth: 1.7, flavor: 'Grey. Warm. Technically food.' },
  { id: 'bucket', name: 'Bigger Water Bucket', perLevel: { capPct: 20 }, baseCost: 30, growth: 1.8, flavor: 'Carry more, sweat more.' },
  { id: 'whetstone', name: 'Whetstone', perLevel: { powerPct: 10 }, baseCost: 25, growth: 1.6, flavor: 'For your pitchfork. And your attitude.' },
  { id: 'padding', name: 'Padded Tunic', perLevel: { guardPct: 10 }, baseCost: 25, growth: 1.6, flavor: 'Stuffed with straw from the floor. Your floor.' },
  { id: 'haggle', name: 'Haggling Lessons', perLevel: { goldPct: 15 }, baseCost: 40, growth: 1.75, flavor: 'Lesson one: never pay for lessons.' },
  { id: 'eyes', name: 'Squinting Practice', perLevel: { dropPct: 12 }, baseCost: 60, growth: 1.8, flavor: 'You see shiny things. You also see Gerald. Constantly.' },
];

// Perks: bought with Memories, kept forever.
export const PERKS: PerkDef[] = [
  { id: 'habit', name: 'Creature of Habit', desc: 'New stamina is assigned automatically, using your current split.', baseCost: 2, growth: 1, maxLevel: 1 },
  { id: 'strongBack', name: 'Strong Back', desc: '×1.12 Power per level (compounds).', perLevel: { powerPct: 12 }, baseCost: 2, growth: 2, maxLevel: 25 },
  { id: 'thickSkin', name: 'Thick Skin', desc: '×1.12 Guard per level (compounds).', perLevel: { guardPct: 12 }, baseCost: 2, growth: 2, maxLevel: 25 },
  { id: 'secondWind', name: 'Second Wind', desc: '×1.2 stamina regen per level (compounds).', perLevel: { regenPct: 20 }, baseCost: 2, growth: 2, maxLevel: 25 },
  { id: 'deepLungs', name: 'Deep Lungs', desc: '×1.15 stamina cap per level (compounds).', perLevel: { capPct: 15 }, baseCost: 3, growth: 2, maxLevel: 25 },
  { id: 'packMule', name: 'Pack Mule', desc: '+4 inventory slots per level.', baseCost: 2, growth: 1.8, maxLevel: 5 },
  { id: 'magpie', name: 'Magpie Instinct', desc: '×1.15 drop chance per level (compounds).', perLevel: { dropPct: 15 }, baseCost: 3, growth: 1.7, maxLevel: 15 },
  { id: 'autoMerge', name: 'Sorting Hat (It Is a Bucket)', desc: 'Duplicate loot merges into your best copy automatically.', baseCost: 5, growth: 1, maxLevel: 1 },
  { id: 'connections', name: 'Family Connections', desc: 'Start each life with gold: 60, 240, 960... per level.', baseCost: 3, growth: 2, maxLevel: 5 },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'optimist', name: 'Optimist', desc: 'Lose a boss fight having dealt less than 10% of its health.', secret: true },
  { id: 'pacifist', name: 'Conscientious Objector', desc: 'Spend 5 minutes of a life without starting a single fight.', secret: true },
  { id: 'hoarder', name: 'Hoarder', desc: 'Fill your sack to the brim.', secret: true },
  { id: 'goatWhisperer', name: 'Goat Whisperer', desc: 'Wrestle the Goat to level 25.', secret: true },
  { id: 'speedrun', name: 'Somebody Is In A Hurry', desc: 'Beat Steward Gerald within 3 minutes of being born.', secret: true },
  { id: 'setCollector', name: 'Fashion Victim', desc: 'Discover 3 hidden sets.', secret: false },
  { id: 'reborn5', name: 'Frequent Flyer', desc: 'Be reborn 5 times.', secret: false },
  { id: 'bailiff', name: 'Upwardly Mobile', desc: 'Defeat the Bailiff.', secret: false },
];

/** Each achievement adds this % to Power and Guard. Small, but it rewards poking around. */
export const ACHIEVEMENT_BONUS_PCT = 3;

export function upgradeDef(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Unknown upgrade ${id}`);
  return def;
}

export function perkDef(id: PerkId): PerkDef {
  const def = PERKS.find((p) => p.id === id);
  if (!def) throw new Error(`Unknown perk ${id}`);
  return def;
}
