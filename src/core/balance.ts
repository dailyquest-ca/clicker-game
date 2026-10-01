// Every tuning knob lives here, so the simulator can be used to adjust pacing without touching logic.
export const BALANCE = {
  tickSeconds: 0.1,

  staminaCap: 20,
  staminaRegen: 2,

  /** Chore level cost = baseCost × (level + 1)^exponent × muscleMemory^rebirths */
  choreCostExponent: 1.4,
  /** NGU's "10% cheaper every rebirth". */
  muscleMemory: 0.9,

  baseHp: 20,
  hpPerGuard: 2,
  fightTimeout: 30,

  /** Adventure: % of max HP regenerated per second while alive. */
  adventureRegenPct: 2,
  /** Recovery after an adventure death = base + extra × scale / (scale + guard). More Guard, shorter naps. */
  recoveryBase: 6,
  recoveryExtra: 24,
  recoveryGuardScale: 30,

  baseInventory: 15,
  packMuleSlots: 4,
  /** Each item level adds this % to the item's positive stats. */
  itemLevelPct: 20,

  rebirthMinBosses: 3,
  /** Memories ripen with age: you keep (seconds lived / this)², up to 100%. Makes rebirth timing a real tradeoff. */
  memoryRipenSeconds: 360,
  choreLevelsPerMemory: 10,
  connectionsGold: 60,

  offlineCapSeconds: 8 * 3600,
  logSize: 60,
  /** Seconds of life per year of age, for flavour. */
  secondsPerYear: 20,
  startAge: 14,
};
