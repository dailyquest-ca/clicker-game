import { ACHIEVEMENTS } from '../content/upgrades';
import { inventorySize } from './formulas';
import { pushLog } from './state';
import type { GameState } from './types';

export function unlockAchievement(state: GameState, id: string): void {
  if (state.achievements.includes(id)) return;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return;
  state.achievements.push(id);
  pushLog(state, `Achievement: ${def.name}. ${def.desc} (+3% Power and Guard)`, def.secret ? 'secret' : 'good');
}

/** Cheap checks that run every tick. Event-driven ones (e.g. Optimist) are unlocked where they happen. */
export function checkAchievements(state: GameState): void {
  if (state.lifeTime >= 300 && state.life.fightsStarted === 0) unlockAchievement(state, 'pacifist');
  if (state.inventory.length >= inventorySize(state)) unlockAchievement(state, 'hoarder');
  if (state.chores.goat.level >= 25) unlockAchievement(state, 'goatWhisperer');
  if (state.discoveredSets.length >= 3) unlockAchievement(state, 'setCollector');
  if (state.rebirths >= 5) unlockAchievement(state, 'reborn5');
}
