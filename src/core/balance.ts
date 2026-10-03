// Every tuning knob lives here, so the simulator can be used to adjust pacing without touching logic.
export const BALANCE = {
  tickSeconds: 0.1,

  /** One in-game year. The tithe falls due at Michaelmas, the end of each year. */
  yearSeconds: 120,
  /** The manorial year runs Michaelmas to Michaelmas, so it starts in Winter and ends after the harvest. */
  seasonNames: ['Winter', 'Spring', 'Summer', 'Autumn'],
  /** The Lammas Fair is held at the end of Summer (seconds into the year). */
  fairAt: 90,
  startAge: 30,
  /** Years a Hob lives before Traditions extend it. */
  lifeYears: 9,
  /** From this fraction of a lifespan, Bad Back slows all work. */
  badBackAt: 0.75,
  badBackMult: 0.7,

  startPips: 3,
  /** Work units per second from one stamina pip. */
  pipWork: 1,

  /** Practice: level L needs practiceCurve·L³ pip-seconds of work on a chore (20, 160, 540, 1280...). Each level adds this much speed. */
  practiceCurve: 20,
  practicePerLevel: 0.06,
  /** Know-how: each level of the best practice any Hob reached adds this much speed for heirs. */
  knowHowPerLevel: 0.02,

  barnBase: 30,
  /** Goods that don't fit in the barn are sold off at this fraction of their price. */
  overflowPrice: 0.5,

  /** £150 (the goat, plus a century of Gerald's interest). */
  debtTotal: 36000,
  /** At death, leftover pennies and goods pay the debt at this rate (the heriot). */
  heriot: 0.5,
  /** A missed tithe is fined at this multiple of the shortfall's value. */
  titheFine: 2,

  /** Standing orders unlock after selling this many goods by hand. */
  standingUnlock: 40,
  inventorySize: 12,
  /** Each item level adds this % to the item's positive stats. */
  itemLevelPct: 20,
  maxItemLevel: 10,
  heirloomSlots: 1,
  /** The peddler asks this multiple of an item's value. */
  peddlerMarkup: 6,

  /** Lore granted so far = floor(sqrt(total debt paid / this)). Timing-proof. */
  loreDivisor: 12,

  offlineCapSeconds: 8 * 3600,
  logSize: 60,
};
