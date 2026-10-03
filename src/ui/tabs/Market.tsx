import { BALANCE } from '../../core/balance';
import { GOODS, good } from '../../content/chores';
import { itemDef } from '../../content/items';
import { deliver, sell, sellSpare, setBasket, setStanding } from '../../core/actions';
import { activeDemands, barnCap, canDeliver, choreVisible, goodsCount, price, reserve, standingUnlocked } from '../../core/formulas';
import { goodsText } from '../../core/goals';
import type { ChoreId, GoodId } from '../../core/types';
import { Bar, Btn } from '../bits';
import { num } from '../format';
import { act, useGame } from '../store';

const CHORE_FOR: Record<GoodId, ChoreId> = { hay: 'hay', egg: 'eggs', log: 'logs' };

export function MarketTab() {
  const g = useGame();
  const cap = barnCap(g);
  const held = goodsCount(g);
  const goods = GOODS.filter((x) => choreVisible(g, CHORE_FOR[x.id]) || g.goods[x.id] > 0);
  const standing = standingUnlocked(g);
  const demands = activeDemands(g);
  return (
    <div class="panel">
      <h2>Market</h2>
      <Bar value={held} max={cap} kind={held >= cap ? 'full' : 'barn'} label={`Barn: ${held} / ${cap} goods`} />
      <p class="hint">
        {held >= cap ? <span class="warn">Full! </span> : null}
        Anything that doesn't fit is sold to passers-by at {Math.round(BALANCE.overflowPrice * 100)}% of the price.
      </p>
      {g.tabs.includes('manor') && (
        <label class="row gap small">
          <input type="checkbox" checked={g.basket} onChange={(e) => act((s) => setBasket(s, (e.target as HTMLInputElement).checked))} />
          Tithe basket: keep back what Gerald wants
        </label>
      )}

      {goods.map((x) => {
        const keep = reserve(g, x.id);
        const spare = Math.max(0, g.goods[x.id] - keep);
        const mult = g.prices[x.id];
        return (
          <div class="good-row" data-testid={`good-${x.id}`}>
            <div class="row space">
              <div>
                <strong>{x.name}</strong> <span class="big">{g.goods[x.id]}</span>{' '}
                <span class="muted small">
                  at {num(price(g, x.id))}d each
                  {mult && mult !== 1 ? <span class={mult > 1 ? 'good' : 'bad'}> (×{mult} this year)</span> : null}
                  {keep > 0 ? ` · keeping ${Math.min(keep, g.goods[x.id])}/${keep} for Gerald` : ''}
                </span>
              </div>
              <div class="row gap">
                <Btn onClick={() => act((s) => sell(s, x.id, 1))} disabled={g.goods[x.id] < 1} kind="ghost">
                  Sell 1
                </Btn>
                <Btn onClick={() => act((s) => sellSpare(s, x.id))} disabled={spare < 1} testid={`sell-${x.id}`}>
                  Sell {spare > 0 ? spare : ''} for {num(spare * price(g, x.id))}d
                </Btn>
              </div>
            </div>
            {standing && <Standing id={x.id} />}
          </div>
        );
      })}

      {!standing && g.records.soldTotal > 0 && (
        <p class="muted small">
          Sell {BALANCE.standingUnlock - g.records.soldTotal} more by hand and the market woman will start taking standing orders.
        </p>
      )}

      {g.rumour && g.life > 1 && (
        <p class="small">
          <strong>Peddler's rumour:</strong> next year {good(g.rumour.good).plural} sell at ×{g.rumour.mult}.
        </p>
      )}

      {demands.length > 0 && (
        <>
          <h3>Requests from the village</h3>
          {demands.map((d) => (
            <div class="demand" data-testid={`demand-${d.id}`}>
              <div class="row space">
                <div>
                  <strong>{d.from}:</strong> <span class="taunt">“{d.ask}”</span>
                  <StandingHint wants={d.wants} />
                  <div class="small muted">
                    Wants {goodsText(d.wants)}.{' '}
                    {d.reward.item ? `Offers something to wear (${itemDef(d.reward.item).slot})` : ''}
                    {d.reward.item && d.reward.pennies ? ' and ' : ''}
                    {d.reward.pennies ? `${d.reward.pennies}d` : ''}.
                  </div>
                </div>
                <Btn onClick={() => act((s) => deliver(s, d.id))} disabled={!canDeliver(g, d)} kind="primary" testid={`deliver-${d.id}`}>
                  Give
                </Btn>
              </div>
            </div>
          ))}
          <p class="muted small">Requests don't expire. Gerald's tithe comes out of the same barn, so plan ahead.</p>
        </>
      )}
    </div>
  );
}

function Standing(props: { id: GoodId }) {
  const g = useGame();
  const keep = g.standing[props.id];
  const on = keep !== null;
  const set = (n: number | null) => act((s) => setStanding(s, props.id, n));
  return (
    <div class="row gap small standing">
      <label class="row gap">
        <input type="checkbox" checked={on} onChange={(e) => set((e.target as HTMLInputElement).checked ? 0 : null)} data-testid={`standing-${props.id}`} />
        Standing order: keep
      </label>
      <Btn onClick={() => set(Math.max(0, (keep ?? 0) - 5))} disabled={!on || keep === 0} kind="ghost">
        −5
      </Btn>
      <span class="assigned">{on ? keep : '—'}</span>
      <Btn onClick={() => set((keep ?? 0) + 5)} disabled={!on} kind="ghost">
        +5
      </Btn>
      <span class="muted">and sell the rest{g.basket && reserve(g, props.id) > 0 ? ` (plus Gerald's ${reserve(g, props.id)})` : ''}</span>
    </div>
  );
}

/** A nudge when a standing order would sell the goods a villager is waiting for. */
function StandingHint(props: { wants: Partial<Record<GoodId, number>> }) {
  const g = useGame();
  const clash = (Object.entries(props.wants) as [GoodId, number][]).find(([gd, n]) => {
    const keep = g.standing[gd];
    return keep !== null && keep < n && g.goods[gd] < n;
  });
  if (!clash) return null;
  const [gd, n] = clash;
  return (
    <div class="small warn">
      Your standing order sells {good(gd).plural} past {g.standing[gd]}. Keep at least {n} to save up for this.
    </div>
  );
}
