# Prototype v1: "Serf Economy"

v1 replaces the v0 loop. It answers the v0 playtest feedback:

- **What worked, and is kept:** the humour, the odd belongings and hidden sets, smooth bars, things being easy to find, and stamina that isn't NGU's energy bar.
- **What didn't, and is replaced:** it felt like a copy of NGU (power/guard, bosses, adventure zones); it was far too fast ("loaded with cash and just buying things"); and there was no introduction or reason to be there.

## The pitch

In 1302, Grandad Hob "borrowed" the Lord's goat. With a century of the Steward's interest, the family now owes **£150 (36,000 pennies)**. You are Hob, aged 30. You work the Lord's land for about nine years, until your back gives out, then hand the pitchfork and the debt to your heir. When the debt is paid, the family is free and Era 1 ends.

Prestige is a death and an inheritance, so it makes sense in the story.

## How to play it

```bash
npm install
npm run dev        # open the printed URL
```

To fast-forward, add `?debug=1` to the URL and run `__advance(60)` in the console. A fresh save is created under a new key; old v0 saves are retired with a note.

## The systems, in the order you meet them

Each system arrives with a **story card**: what it is, why it matters, and "What you control". The clock stops while a card is open. A **To do** panel always shows at most three next steps, worked out from the game state.

| When | System | How it works | Your decision |
|---|---|---|---|
| 0:00 | **Stamina pips** | 3 pips. Each does 1 work a second on its chore. Porridge adds pips. | How to split pips between chores. |
| 0:00 | **Chores → goods** | Cut Hay (8 work → 1 hay, 1d). Collect Eggs (6 work → 1 egg, 2d), but **each hen keeps exactly one pip busy**. Chop Firewood (10 work → 1 log, 3d) needs the axe and no hens. **Practice** levels come from pip-seconds worked (+6% each); family **know-how** carries the best level to heirs. | Hens set a ceiling that pips fill; firewood has no ceiling but pays less per pip. |
| ~0:20 | **Market** | Sell by hand. The barn holds 30; anything over is sold at half price. After 40 sales, **standing orders** ("keep N, sell the rest"). | Sell now, or keep goods for the tithe and villagers. |
| ~0:25 | **Village shop** | Hen 20d (×1.75 each), Porridge 30d (×2.3), Basket, Whetstone (year 2), Henhouse, Axe (year 3), Bow Saw, Barn. Each item shows **"+X d a second, pays for itself in M:SS"**, and warns if that is after your back goes. One item can be pinned as "saving for". | What to buy next, and when to stop buying. |
| ~0:45 | **The Steward's tithe** | At every Michaelmas (each 2-minute year) Gerald takes goods on a **fixed, published curve**: from 8 hay in year 1 to 18 hay, 13 eggs and 5 logs in year 9. The tithe basket keeps them from being sold. A miss costs **2× the shortfall** in pennies, and anything you can't pay is added to the debt. Nothing is confiscated, and next year's tithe never rises because of a miss. | Plan production around it. |
| Year 2 | **The family debt** | Pay any amount, any time. Paid stays paid forever. **Pennies don't survive you**: at death the Lord takes half of what you leave (the heriot), and the other half pays the debt. Milestones at 1, 2.5, 5, 10, 20, 35, 50, 75 and 100% give permanent rewards: a starting hen, +10% prices, an heirloom slot, a starting basket, +1 pip, a starting axe, +25% work, +15% prices. | Invest in the farm, or pay the debt. |
| Year 2 | **Villagers' requests** | Mother Agnes wants 6 eggs for a peace cake and pays in headwear. Six requests in all, each once per family; they are the quest chain. | Whether to stockpile for a reward. |
| First item | **Belongings** | The v0 items, now with production stats: hay/egg/firewood speed, prices, luck, pips, barn space. Merge duplicates; 5 hidden sets. | What to wear, merge and keep. |
| ~13:30 | **Bad back** | From 75% of your lifespan, all work is 30% slower. You can retire at any time after your first Michaelmas. | Work on, or retire. Lore is timing-proof, so this is a time trade, not an exploit. |
| 18:00 | **The heir** | Choose heirlooms (1 slot to start); everything else is sold toward the debt. **Lore = ⌊√(total paid ÷ 12)⌋** minus Lore already granted, so it doesn't matter how you split payments across lives. Lore buys **Traditions**: Family Knack (×1.15 work, compounding), Gift of the Gab (+10% prices), Family Hen, Broad Shoulders (+1 pip), Market Contacts, Hardy Folk (+1 year), Sentimental (+1 heirloom). | What the family invests in. |
| Life 2+ | **The dung heap** | A rummage chore that finds belongings and the odd penny. Luck unlocks better finds. | A pip for loot, or for pennies. |
| Life 2+ | **The Lammas Fair** | One contest a year at the end of Summer: hay-tossing, egg-rolling, log-splitting, heap-diving, or out-arguing Gerald. The tab shows your expected score, the champion's score and your chance to win, and there is an entry fee. Winning gives prizes and titles. | Pay to enter, or not. |
| Life 2+ | **Price rumours** | One good's price changes each year (×0.7 to ×1.4). The peddler tells you a full year ahead. | Plan hens and pips around it. |
| Life 2+ | **The peddler** | One belonging a year, at 6× its value. | Pennies now versus kit. |

**Never drowning in pennies.** Several things keep money tight:

- costs grow 1.75–2.3× per purchase;
- hens and pips depend on each other;
- the shop grows its stock by year;
- the barn has a cap;
- the debt is a sink that is always useful.

The shop's payback note tells you when buying stops making sense.

## What the simulator says

`npm run sim`. Bots play the real rules (3 seeds). Each check ran against the current numbers.

**Life 1, smart bot**

| Measure | Result |
|---|---|
| First purchase | 1:10 |
| Median gap between purchases | 79 s |
| Purchases | 8 (hen, hen, porridge, hen, henhouse, hen, porridge, basket) |
| Income | 0.6 → 2.2 pennies/s |
| Paid toward the debt | 916d |
| Tithes met | 8/9 |
| Goods wasted at the barn cap | 0% |

**Debt paid per life, smart bot**

| Life | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Paid | 0.9k | 3.7k | 5.4k | 6.8k | 11.0k |
| Change | | ×4.0 | ×1.5 | ×1.3 | ×1.6 |

**Time to clear the debt**

| Bot | Time |
|---|---|
| Smart bot | **101–107 min** (6 lives) |
| Casual bot: uses the best pip split and the shop's payback hints, pays the debt only when nothing is worth buying | **154–156 min** |
| Naive bot: buys the cheapest thing every time | nowhere near |

**Money pressure**

| Measure | Result |
|---|---|
| Pennies held ÷ cost of the item being saved for | median 0.52, p90 0.87 |
| A once-a-minute visitor can afford | median 1 purchase per visit, p90 1 |

**Exploits** (debt paid by 60 min, compared with the smart bot)

| Strategy | Result |
|---|---|
| Hoarding for the heriot | −56% |
| Never selling | −89% |
| Retiring as soon as the back goes | +9% |

Retiring early is a legitimate choice by design, and the allowed margin for it is 10%.

### Failed checks, and checks that prove little

- **FAIL: the casual bot takes about 155 min,** against a target of ≤ 150. A thoughtful human should land between the smart and casual bots.
- **The smart bot's last shop purchase in life 1 is at about 11:20.** For the last ~6.5 minutes of that life, it only pays the debt. This cuts against "a purchase every 1–2 minutes". Paying the debt and watching the milestone bar is meant to be the late-life activity, but it may feel flat. **Watch for this in the playtest.**
- **Life 2 pays about 4× life 1.** Life 1 is a slow learning life. The first inheritance brings a hen, +10% prices, Lore and know-how all at once. After that, growth settles at about 1.3–1.6× per life.
- **Two checks pass by construction:**
  - "First life 15–20 min" holds because lives are a fixed 9 years.
  - "Income recovers after a missed tithe" holds because a missed tithe costs pennies, not assets.

## What changed from v0, and why

| v0 | v1 | Why |
|---|---|---|
| Power/Guard chores, bosses, zones, Memories | Goods economy, tithe, debt, Lore | v0 was "a carbon copy of NGU". |
| Gold flowed freely | Costs grow 1.75–2.3× per purchase; the barn has a cap; the shop gates stock by year; there is always the debt | "Never be drowning in currency." |
| Everything visible early | 14 story cards, a To do panel, tabs that appear as you meet each system | "Introduce things slower and more noticeably, with the why." |
| Rebirth whenever you like, Memories ripen | Lives end with your back; Lore = √(total paid), timing-proof | Prestige should make story sense and must not be farmed. |
| Multipliers stacked many ways | Within a life, bonuses add inside two groups (skill, kit); only Traditions and milestones multiply | The first v1 tuning pass ran away: life 2 earned 10× life 1. |

Other fixes: save loading now fills missing fields at every depth, and story cards appear the moment an action unlocks them.

## Questions for the next playtest

1. Do the story cards land, or do they get in the way? Is "time stands still while you read" noticeable?
2. Hens versus pips: is "each hen keeps one pip busy" clear from the Work tab?
3. Does the shop's "pays for itself in M:SS" make buying feel like a decision, or does it make the choice for you?
4. The last ~6 minutes of life 1: flat, or a satisfying "pay off the debt" phase?
5. Does retiring early ever feel right?
6. Is the tithe a fun planning constraint or a chore?

## Known gaps

- Offline progress stops when a Hob dies. You return to the heir screen, so leaving overnight gives at most one life's worth of progress. This is deliberate, because the heir choice is the point, but it caps idle play.
- No sound and no art beyond the text UI.
- The fair has 5 contests with 4 tiers each. Rumours, the peddler and the heap need more content before they stay interesting across many lives.
- Era 2 doesn't exist. Clearing the debt shows the ending card.
