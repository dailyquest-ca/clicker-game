import { useState } from 'preact/hooks';
import { STORY } from '../content/story';
import { dismissCard } from '../core/actions';
import { age, assignedPips, idlePips, incomeRate, season, shopCost, toMichaelmas, totalPips, yearIndex } from '../core/formulas';
import { currentGoals } from '../core/goals';
import type { OfflineSummary } from '../core/save';
import type { GameState, TabId } from '../core/types';
import { Bar, Btn, Pips } from './bits';
import { num, time } from './format';
import { Heir } from './Heir';
import { act, useGame } from './store';
import { BelongingsTab } from './tabs/Belongings';
import { FairTab } from './tabs/Fair';
import { FamilyTab } from './tabs/Family';
import { ManorTab } from './tabs/Manor';
import { MarketTab } from './tabs/Market';
import { ShopTab } from './tabs/Shop';
import { StatsTab } from './tabs/Stats';
import { WorkTab } from './tabs/Work';

const TAB_ORDER: TabId[] = ['work', 'market', 'shop', 'manor', 'belongings', 'family', 'fair', 'stats'];
const TAB_LABELS: Record<TabId, string> = {
  work: 'Work',
  market: 'Market',
  shop: 'Shop',
  manor: 'Steward & Debt',
  belongings: 'Belongings',
  family: 'Family',
  fair: 'Fair',
  stats: 'Stats',
};

/** A little "!" on a tab when something there wants attention. */
function tabAlert(g: GameState, tab: TabId): boolean {
  switch (tab) {
    case 'work':
      return idlePips(g) > 0;
    case 'shop':
      return g.savingFor !== null && g.pennies >= shopCost(g, g.savingFor);
    case 'family':
      return g.lore >= 2;
    case 'fair':
      return g.fairContest !== null && !g.fairEntered;
    default:
      return false;
  }
}

export function App(props: { offline: OfflineSummary | null; notice: string | null }) {
  const g = useGame();
  const [tab, setTab] = useState<TabId>('work');
  const [offline, setOffline] = useState(props.offline);
  const [notice, setNotice] = useState(props.notice);
  const [retiring, setRetiring] = useState(false);
  const visible = TAB_ORDER.filter((t) => g.tabs.includes(t));
  const active = visible.includes(tab) ? tab : 'work';
  const card = STORY.find((c) => c.id === g.cardQueue[0]);
  const goals = currentGoals(g);
  const showMoney = g.tabs.includes('market');

  return (
    <div class="app">
      <header class="top">
        <div class="title">
          <strong>{g.name}</strong>{' '}
          <span class="muted">{g.dead ? ` · died aged ${age(g)}` : ` · age ${age(g)} · Year ${yearIndex(g) + 1}, ${season(g)}`}</span>
        </div>
        <div class="resources">
          {g.tabs.includes('manor') && !g.dead && (
            <span title="Gerald collects the tithe at Michaelmas">
              Michaelmas in <b>{time(toMichaelmas(g))}</b>
            </span>
          )}
          <span title="Stamina pips busy / total">
            <Pips used={assignedPips(g)} total={totalPips(g)} />
          </span>
          {showMoney && (
            <span data-testid="pennies">
              <b>{num(g.pennies)}d</b> <span class="muted small">+{num(incomeRate(g))}/s</span>
            </span>
          )}
        </div>
      </header>

      <nav class="tabs">
        {visible.map((t) => (
          <button class={`tab ${active === t ? 'on' : ''}`} onClick={() => setTab(t)} data-testid={`tab-${t}`}>
            {TAB_LABELS[t]}
            {tabAlert(g, t) && <span class="dot">!</span>}
          </button>
        ))}
      </nav>

      <main class="main">
        {active === 'work' && <WorkTab />}
        {active === 'market' && <MarketTab />}
        {active === 'shop' && <ShopTab />}
        {active === 'manor' && <ManorTab />}
        {active === 'belongings' && <BelongingsTab />}
        {active === 'family' && <FamilyTab onRetire={() => setRetiring(true)} />}
        {active === 'fair' && <FairTab />}
        {active === 'stats' && <StatsTab />}
      </main>

      <aside class="side">
        <section class="goals" data-testid="goals">
          <h3>To do</h3>
          {goals.map((goal) => (
            <div class="goal">
              <div class="small">{goal.text}</div>
              {goal.need !== undefined && goal.have !== undefined && (
                <Bar value={goal.have} max={goal.need} kind="goal" label={`${num(Math.min(goal.have, goal.need))} / ${num(goal.need)}`} />
              )}
            </div>
          ))}
        </section>
        <section class="log" aria-live="polite">
          <h3>Village gossip</h3>
          {[...g.log]
            .reverse()
            .slice(0, 40)
            .map((e) => (
              <div class={`log-line ${e.kind}`}>
                <span class="muted small">{time(e.t)}</span> {e.text}
              </div>
            ))}
        </section>
      </aside>

      {card && (
        <div class="modal" role="dialog" data-testid="story">
          <div class="modal-box story">
            <h2>{card.title}</h2>
            {card.body.map((p) => (
              <p>{p}</p>
            ))}
            {card.levers && (
              <>
                <h3>What you control</h3>
                <ul>
                  {card.levers.map((l) => (
                    <li>{l}</li>
                  ))}
                </ul>
              </>
            )}
            <p class="muted small">Time stands still while you read.</p>
            <Btn
              onClick={() => {
                act(dismissCard);
                if (card.opens?.[0] && card.id !== 'intro') setTab(card.opens[0]);
              }}
              kind="primary"
              testid="story-ok"
            >
              {card.opens?.[0] && card.id !== 'intro' ? `Right then (open ${TAB_LABELS[card.opens[0]]})` : 'Right then'}
            </Btn>
          </div>
        </div>
      )}

      {!card && (g.dead || retiring) && <Heir retiring={!g.dead} onClose={() => setRetiring(false)} />}

      {!card && !g.dead && !retiring && (offline || notice) && (
        <div class="modal" role="dialog">
          <div class="modal-box">
            {notice && <p>{notice}</p>}
            {offline && (
              <>
                <h3>While you were away ({time(offline.seconds)})</h3>
                <ul>
                  <li>{num(offline.made)} goods made</li>
                  <li>{num(offline.earned)}d earned</li>
                  <li>{offline.tithes} Michaelmas{offline.tithes === 1 ? '' : 'es'} passed</li>
                </ul>
                <p class="muted small">Away time is capped at 8 hours. Hob never dies while you're away; he waits for you.</p>
              </>
            )}
            <Btn
              onClick={() => {
                setOffline(null);
                setNotice(null);
              }}
              kind="primary"
            >
              Back to work
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
