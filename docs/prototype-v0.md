# Prototype v0: the Era 1 loop

## The question this answers

Is a small NGU-style loop satisfying, and do its few decisions feel smart?

The goal is not content or graphics. It's to find out whether the following, played for 45–90 minutes, makes a player think *"I did something clever and it paid off"*:

- a stamina bar you split between two stats;
- bosses that test different stats;
- loot that stacks;
- a rebirth whose timing you choose.

The setting is a thin skin (Hob, a serf). It's only there to give the jokes something to be about.

## How to play it

```bash
npm install
npm run dev        # open the printed URL
```

To fast-forward while testing, add `?debug=1` to the URL and run `__advance(60)` in the browser console. It skips 60 seconds of game time.

## The loop

| System | What you do | The decision in it |
|---|---|---|
| **Stamina** | It refills on its own. You *assign* it to chores; it isn't used up and you can move it any time. | How to split stamina between Power and Guard. |
| **Chores** | Four chores, two per stat. Tier 2 opens when tier 1 reaches level 10. Every rebirth makes all chores **10% cheaper**, compounding. | Tier 1 vs. tier 2. Each chore shows "stat per stamina-minute" so you can compare them. |
| **Bosses** | 10 bosses, from *A Rooster With Opinions* to *The Bailiff*. A fight is a few-second duel of health bars. The game shows "you'd beat it in Xs / it would beat you in Ys" before you fight. | Bosses alternate between **Tanky** (needs Power), **Hard hitter** (needs Guard) and **Balanced**, so the right split keeps changing. |
| **Adventure** | Three zones, each opened by a boss. You auto-fight enemies for gold and loot. When knocked out, you spend time recovering. | Which zone to farm. The forecast shows time on your feet, kills, gold and drops per minute. |
| **Loot** | 19 quirky items in 5 slots. **Merge duplicates to level them up**, NGU-style. There are 5 **hidden set bonuses** (e.g. *Technically a Pair*). | What to wear, what to merge, what to bin, and which combinations to try. |
| **Market** | 6 gold upgrades that reset when you die. Each shows its exact next-level gain. | What to buy first. Bonuses from the same source add; different sources multiply, so the biggest % isn't always the biggest gain. |
| **Rebirth** | You can rebirth after beating 3 bosses in a life. You keep items, perks and Memories. **Memories ripen with age:** you keep (minutes lived / 6)², up to 100%. The screen shows Memories/min now and its peak this life. | When to die. Rebirth too early and you lose most of your Memories; too late and the rate drops. |
| **Perks** | Spend Memories on permanent perks. They compound per level (×1.12 Power, etc.). Creature of Habit auto-assigns new stamina; the Sorting Hat auto-merges loot. | Which snowball to feed. |
| **Quirk layer** | Village gossip log, boss taunts, item flavour, epitaphs in the Chronicle of past lives, 8 achievements (5 secret, +3% Power/Guard each). | Poking around is rewarded. |
| **Idle** | The game runs offline for up to 8 hours and saves every 10 seconds. You can export and import save codes. | Play actively, or check in. |

## What the simulator says (`npm run sim`, 5 seeds, 120 min)

Bots play the exact game rules. The **smart** bot:

- reads each boss's archetype and leans its stamina that way;
- farms the hardest zone it can survive;
- equips whatever improves its next fight;
- rebirths right after its Memories/min peaks.

Its results:

- **Pacing:**
  - first chore level at 0:03;
  - boss 1 at 0:30;
  - Adventure opens at 1:38;
  - first rebirth at 6:19;
  - **each of the first five lives beats one new boss (5 → 6 → 7 → 8 → 9)**;
  - the Bailiff falls at **63:35**.
- **Smart vs. naive:** the naive bot puts everything into the cheapest chore and only rebirths when stuck. It never beats the Bailiff in 2 hours.
- **The Power/Guard split matters:** no single fixed split is fastest for every boss. The best split changes 4 times across the ladder.
- **How much each decision matters,** measured by changing one of the smart bot's choices (time to the Bailiff):

| Changed decision | Result |
|---|---|
| Farm the best-*gold* zone instead of the hardest survivable one | Never beats the Bailiff (stalls at boss 9). **Loot is the real prize.** |
| Rebirth late (rate down 30% from peak) | 82:13, which is +29% |
| Flat 50/50 split instead of reading archetypes | 71:04, which is +12% |
| Wear by flat stats instead of "what helps the next fight" | 70:03, which is +10% |
| "Best value" upgrades instead of cheapest-first | 64:44, which is +2%. **The market barely matters yet.** |

## Known gaps and what to tune next

- **The market is a weak decision** (2% swing). Ideas:
  - make upgrades conflict, e.g. limited slots or "one per day";
  - tie upgrades to a zone.
- **Lives don't get longer.** The smart bot settles on ~6:20 lives because Memories ripen at 6:00. In NGU, runs lengthen as new systems scale with run time.
  - Fix: add something that keeps growing late in a life (e.g. a slow "wisdom" multiplier, or a system that only pays off in long lives).
- **Regaining is fast.** Life 2 gets back to life 1's best in ~33–40% of the time, against my original 55–75% target. That's the cost of "one new boss per life" with bosses that double in difficulty.
  - Fix, if it feels too generous in play: more bosses with smaller steps.
- **Offline progress** runs the full rules in 0.5–2 s steps. That's fine at this scale; revisit when there are more systems.
- **No sound, no art.** Deliberate for v0.

## Questions for the first playtest

1. Did you ever change your stamina split because of the boss preview? Did it feel clever?
2. Did you find a hidden set or a secret achievement? How did it feel?
3. When did you first rebirth, and why then?
4. Where did you get bored, and what were you waiting for?
5. Would you open it again tomorrow?

## Where things live

| Path | What |
|---|---|
| `src/core/` | Game rules: pure TypeScript with no browser code. A separate tsconfig enforces this. |
| `src/content/` | Chores, bosses, zones, items, sets, upgrades, perks, achievements and jokes, as typed data. |
| `src/core/balance.ts` | Every tuning knob. |
| `src/ui/` | Preact screens. |
| `sim/` | Pacing simulator and bot strategies. |
| `tests/` | Unit tests (Vitest). |
| `scripts/e2e.mjs` | Browser smoke test (Playwright). It plays the loop and saves screenshots to `artifacts/`. |
