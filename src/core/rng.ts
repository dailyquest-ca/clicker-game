// Seeded RNG (mulberry32). The state lives in the save, so reloading can't reroll drops.

export function nextRandom(holder: { rngState: number }): number {
  let t = (holder.rngState = (holder.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pick<T>(holder: { rngState: number }, list: readonly T[]): T {
  const item = list[Math.floor(nextRandom(holder) * list.length)];
  if (item === undefined) throw new Error('pick from empty list');
  return item;
}

export function pickWeighted<T extends { weight: number }>(holder: { rngState: number }, list: readonly T[]): T {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let roll = nextRandom(holder) * total;
  for (const x of list) {
    roll -= x.weight;
    if (roll < 0) return x;
  }
  const last = list[list.length - 1];
  if (!last) throw new Error('pickWeighted from empty list');
  return last;
}
