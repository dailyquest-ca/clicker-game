import { useState } from 'preact/hooks';
import { BOSSES } from '../content/bosses';
import { itemDef } from '../content/items';
import { SLOTS, ageYears, canRebirth, computeStats, memoryRate, predictFight, ripeness } from '../core/formulas';
import type { GameState } from '../core/types';
import type { OfflineSummary } from '../core/save';
import { Btn } from './bits';
import { num, time } from './format';
import { useGame } from './store';
import { AdventureTab } from './tabs/Adventure';
import { ChoresTab } from './tabs/Chores';
import { FightTab } from './tabs/Fight';
import { InventoryTab } from './tabs/Inventory';
import { MarketTab } from './tabs/Market';
import { RebirthTab } from './tabs/Rebirth';
import { StatsTab } from './tabs/Stats';

type TabId = 'chores' | 'fight' | 'adventure' | 'inventory' | 'market' | 'rebirth' | 'stats';

interface TabInfo {
  id: TabId;
  label: string;
  visible: (g: GameState) => boolean;
  /** A little "!" when something is worth a look. */
  alert?: (g: GameState) => boolean;
}

const TABS: TabInfo[] = [
  { id: 'chores', label: 'Chores', visible: () => true, alert: (g) => g.stamina.idle >= 1 && g.perks.habit === 0 },
  {
    id: 'fight',
    label: 'Fight',
    visible: () => true,
    alert: (g) => {
      const boss = BOSSES[g.bossesBeaten];
      return !g.fight && !!boss && predictFight(computeStats(g), boss).win;
    },
  },
  { id: 'adventure', label: 'Adventure', visible: (g) => g.unlocked.adventure, alert: (g) => g.unlocked.adventure && g.adventure.zone === null },
  {
    id: 'inventory',
    label: 'Inventory',
    visible: (g) => g.unlocked.adventure || g.inventory.length > 0 || SLOTS.some((s) => g.equipped[s]),
    // Something to wear in an empty slot, or duplicates waiting to be merged.
    alert: (g) =>
      g.inventory.some((i) => !g.equipped[itemDef(i.id).slot]) ||
      g.inventory.some((i) => g.inventory.filter((j) => j.id === i.id).length > 1 || SLOTS.some((s) => g.equipped[s]?.id === i.id)),
  },
  { id: 'market', label: 'Market', visible: (g) => g.unlocked.market },
  {
    id: 'rebirth',
    label: 'Rebirth',
    visible: (g) => g.unlocked.rebirth,
    alert: (g) => canRebirth(g) && ripeness(g.lifeTime) >= 1 && g.life.peakRate > 0 && memoryRate(g) < g.life.peakRate * 0.9,
  },
  { id: 'stats', label: 'Stats', visible: () => true },
];

export function App(props: { offline: OfflineSummary | null }) {
  const g = useGame();
  const [tab, setTab] = useState<TabId>('chores');
  const [offline, setOffline] = useState(props.offline);
  const stats = computeStats(g);
  const visible = TABS.filter((t) => t.visible(g));
  const active = visible.some((t) => t.id === tab) ? tab : 'chores';

  return (
    <div class="app">
      <header class="top">
        <div class="title">
          <strong>Hob the Serf</strong> <span class="muted">· Life {g.rebirths + 1} · age {ageYears(g.lifeTime)} · {time(g.lifeTime)}</span>
        </div>
        <div class="resources">
          <span title="Gold">
            <b>{num(g.gold)}</b> gold
          </span>
          {g.records.memoriesEarned > 0 || g.unlocked.rebirth ? (
            <span title="Memories">
              <b>{num(g.memories)}</b> memories
            </span>
          ) : null}
          <span class="power">
            Power <b>{num(stats.power)}</b>
          </span>
          <span class="guard">
            Guard <b>{num(stats.guard)}</b>
          </span>
        </div>
      </header>

      <nav class="tabs">
        {visible.map((t) => (
          <button class={`tab ${active === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
            {t.label}
            {t.alert?.(g) && <span class="dot">!</span>}
          </button>
        ))}
      </nav>

      <main class="main">
        {active === 'chores' && <ChoresTab />}
        {active === 'fight' && <FightTab />}
        {active === 'adventure' && <AdventureTab />}
        {active === 'inventory' && <InventoryTab />}
        {active === 'market' && <MarketTab />}
        {active === 'rebirth' && <RebirthTab />}
        {active === 'stats' && <StatsTab />}
      </main>

      <aside class="log" aria-live="polite">
        <h3>Village gossip</h3>
        {[...g.log]
          .reverse()
          .slice(0, 40)
          .map((e) => (
            <div class={`log-line ${e.kind}`}>
              <span class="muted small">{time(e.t)}</span> {e.text}
            </div>
          ))}
      </aside>

      {offline && (
        <div class="modal" role="dialog">
          <div class="modal-box">
            <h3>While you were away ({time(offline.seconds)})</h3>
            <ul>
              <li>+{num(offline.gold)} gold</li>
              <li>+{offline.levels} chore levels</li>
              <li>{num(offline.kills)} things knocked out</li>
              <li>{offline.items} items found</li>
            </ul>
            <p class="muted small">Away time is capped at 8 hours.</p>
            <Btn onClick={() => setOffline(null)} kind="primary">
              Back to work
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
