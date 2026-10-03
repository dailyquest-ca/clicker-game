import { itemDef } from '../../content/items';
import { shopDef } from '../../content/shop';
import { buy, buyPeddler, setSavingFor } from '../../core/actions';
import { incomeRate, scaledItemStats, shopCost, shopPreview, shopStock, workingLeft } from '../../core/formulas';
import type { ShopId } from '../../core/types';
import { Bar, Btn, bonusText } from '../bits';
import { num, secs } from '../format';
import { act, useGame } from '../store';

export function ShopTab() {
  const g = useGame();
  const stock = shopStock(g);
  const pinned = g.savingFor && stock.includes(g.savingFor) ? g.savingFor : null;
  return (
    <div class="panel">
      <h2>Village Shop</h2>
      <p class="hint">Prices go up each time you buy. New stock arrives as the years go by.</p>
      {pinned && <SavingFor id={pinned} />}
      {stock.map((id) => (
        <ShopItem id={id} />
      ))}
      {stock.length === 0 && <p class="muted">Sold out. You have everything the shop will sell you.</p>}
      {g.peddler && <Peddler />}
    </div>
  );
}

function SavingFor(props: { id: ShopId }) {
  const g = useGame();
  const cost = shopCost(g, props.id);
  const rate = incomeRate(g);
  const eta = g.pennies >= cost ? 0 : rate > 0 ? (cost - g.pennies) / rate : Infinity;
  return (
    <div class="saving" data-testid="saving-for">
      <div class="row space">
        <strong>Saving for: {shopDef(props.id).name}</strong>
        <span class="small muted">{eta === 0 ? 'Ready!' : Number.isFinite(eta) ? `about ${secs(eta)} at this rate` : 'nothing coming in'}</span>
      </div>
      <Bar value={g.pennies} max={cost} kind="saving" label={`${num(Math.min(g.pennies, cost))} / ${cost}d`} />
    </div>
  );
}

function ShopItem(props: { id: ShopId }) {
  const g = useGame();
  const def = shopDef(props.id);
  const cost = shopCost(g, props.id);
  const p = shopPreview(g, props.id);
  const gain = p.after - p.before;
  const left = workingLeft(g);
  const pinned = g.savingFor === props.id;
  const inTime = p.payback <= left;
  return (
    <div class={`upgrade ${pinned ? 'pinned' : ''}`} data-testid={`shop-${props.id}`}>
      <div class="row space">
        <div>
          <strong>{def.name}</strong> {g.owned[props.id] > 0 && <span class="tag">have {g.owned[props.id]}</span>}
          <div class="small">{def.desc}</div>
          <div class="small">
            {gain > 0.001 ? (
              <>
                <span class="good">+{num(gain)}d a second</span>
                {' · '}
                <span class={inTime ? '' : 'bad'}>
                  pays for itself in {secs(p.payback)}
                  {inTime ? '' : ', after your back goes'}
                </span>
              </>
            ) : (
              <span class="muted">No extra pennies by itself.</span>
            )}
            {p.note && <span class="muted"> {p.note}</span>}
          </div>
          <div class="muted small flavor">{def.flavor}</div>
        </div>
        <div class="row gap">
          <Btn onClick={() => act((s) => setSavingFor(s, pinned ? null : props.id))} kind="ghost" title="Show progress toward this in the goals list">
            {pinned ? 'Unpin' : 'Save for'}
          </Btn>
          <Btn onClick={() => act((s) => buy(s, props.id))} disabled={g.pennies < cost} kind="primary" testid={`buy-${props.id}`}>
            {cost}d
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Peddler() {
  const g = useGame();
  const p = g.peddler!;
  const def = itemDef(p.item);
  return (
    <>
      <h3>The Peddler</h3>
      <div class="upgrade">
        <div class="row space">
          <div>
            <strong>{def.name}</strong> <span class="muted small">({def.slot})</span>
            <div class="small">{bonusText(scaledItemStats({ uid: 0, id: p.item, level: 0 }))}</div>
            <div class="muted small flavor">“{def.flavor}” He'll be gone at Michaelmas.</div>
          </div>
          <Btn onClick={() => act(buyPeddler)} disabled={g.pennies < p.price} kind="primary">
            {p.price}d
          </Btn>
        </div>
      </div>
    </>
  );
}
