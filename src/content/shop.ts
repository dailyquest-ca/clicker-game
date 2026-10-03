import type { ShopDef, ShopId, TraditionDef, TraditionId } from '../core/types';

// The village shop. Only a few things are ever on offer, so each purchase is something you see coming.
export const SHOP: ShopDef[] = [
  { id: 'hen', name: 'A Hen', desc: 'Lays eggs. Each hen keeps one stamina pip busy.', cost: 20, growth: 1.75, max: 10, flavor: 'She has a name. You will not be told it.' },
  { id: 'porridge', name: 'Porridge Rations', desc: '+1 stamina pip.', cost: 30, growth: 2.3, max: 6, flavor: 'Grey. Warm. Technically food.' },
  { id: 'basket', name: 'Wicker Basket', desc: 'Barn holds 30 more goods.', cost: 25, growth: 1, max: 1, flavor: 'Woven by your aunt, who was paid in eggs and gossip.' },
  { id: 'whetstone', name: 'Whetstone', desc: 'Cut Hay 25% faster.', cost: 40, growth: 1.8, max: 4, flavor: 'For your scythe. And your attitude.' },
  { id: 'henhouse', name: 'A Proper Henhouse', desc: 'Collect Eggs 20% faster.', cost: 90, growth: 2.0, max: 3, flavor: 'The hens finally stop sleeping in your boots.' },
  { id: 'axe', name: 'An Axe', desc: 'Unlocks Chop Firewood (logs sell for 3d, and need no hens).', cost: 150, growth: 1, max: 1, flavor: 'Second-hand. The first hand is a long story.' },
  { id: 'saw', name: 'A Bow Saw', desc: 'Chop Firewood 20% faster.', cost: 200, growth: 2.2, max: 2, flavor: 'It sings when you use it. Badly. The trees hate it.' },
  { id: 'barn', name: 'Barn Extension', desc: 'Barn holds 60 more goods.', cost: 160, growth: 2.2, max: 3, flavor: 'Technically a lean-to. Technically.' },
  { id: 'rake', name: 'A Long Rake', desc: 'Rummage 30% faster and find better things.', cost: 120, growth: 2, max: 2, flavor: 'You could reach the bottom of the heap. Should you?' },
];

export function shopDef(id: ShopId): ShopDef {
  const def = SHOP.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown shop item ${id}`);
  return def;
}

// Traditions: bought with Lore, passed down every generation.
export const TRADITIONS: TraditionDef[] = [
  { id: 'familyHen', name: 'The Family Hen', desc: 'Each Hob starts with one more hen.', cost: 2, growth: 2.5, max: 3 },
  { id: 'knack', name: 'Family Knack', desc: 'All work ×1.15 per level (compounds).', cost: 3, growth: 2, max: 10 },
  { id: 'gab', name: 'Gift of the Gab', desc: 'Sell prices +10% per level.', cost: 3, growth: 2, max: 10 },
  { id: 'shoulders', name: 'Broad Shoulders', desc: '+1 stamina pip per level.', cost: 5, growth: 2.5, max: 4 },
  { id: 'contacts', name: 'Market Contacts', desc: 'Standing orders from day one.', cost: 4, growth: 1, max: 1 },
  { id: 'hardy', name: 'Hardy Folk', desc: '+1 year of life per level.', cost: 6, growth: 2, max: 6 },
  { id: 'sentimental', name: 'Sentimental', desc: '+1 heirloom slot per level.', cost: 6, growth: 3, max: 3 },
];

export function traditionDef(id: TraditionId): TraditionDef {
  const def = TRADITIONS.find((t) => t.id === id);
  if (!def) throw new Error(`Unknown tradition ${id}`);
  return def;
}
