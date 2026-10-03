import { BALANCE } from '../../core/balance';
import { good } from '../../content/chores';
import { MILESTONES } from '../../content/manor';
import { payDebt, setBasket } from '../../core/actions';
import {
  barnCap,
  debtFraction,
  debtLeft,
  debtOwedTotal,
  loreForPaid,
  nextMilestone,
  titheDue,
  titheShortfallFine,
  toMichaelmas,
  yearIndex,
} from '../../core/formulas';
import type { GoodId } from '../../core/types';
import { Bar, Btn } from '../bits';
import { num, time } from '../format';
import { act, useGame } from '../store';

export function ManorTab() {
  const g = useGame();
  return (
    <div class="panel">
      <h2>Steward & Debt</h2>
      <Tithe />
      {g.cardsSeen.includes('debt') && <Debt />}
    </div>
  );
}

function Tithe() {
  const g = useGame();
  const due = Object.entries(titheDue(g)) as [GoodId, number][];
  const fine = titheShortfallFine(g);
  const last = g.lastTithe;
  const total = due.reduce((s, [, n]) => s + n, 0);
  return (
    <div class="tithe" data-testid="tithe">
      <h3>
        Gerald's tithe: Michaelmas in <span class="big">{time(toMichaelmas(g))}</span> <span class="muted small">(end of year {yearIndex(g) + 1})</span>
      </h3>
      {due.map(([gd, n]) => (
        <Bar value={Math.min(n, g.goods[gd])} max={n} kind={g.goods[gd] >= n ? 'met' : 'tithe'} label={`${good(gd).plural}: ${Math.min(n, g.goods[gd])} / ${n}`} />
      ))}
      <p class="small">
        {fine > 0 ? (
          <span class="bad">
            If Michaelmas came now you'd be fined {num(fine)}d ({BALANCE.titheFine}× what you're short). If you can't pay, it goes in the family debt.
          </span>
        ) : (
          <span class="good">Ready. Gerald will take it from the barn.</span>
        )}
      </p>
      {total > barnCap(g) * 0.8 && (
        <p class="small warn">Your barn holds {barnCap(g)} goods in all. That's tight for {total}. The shop sells baskets.</p>
      )}
      <label class="row gap small">
        <input type="checkbox" checked={g.basket} onChange={(e) => act((s) => setBasket(s, (e.target as HTMLInputElement).checked))} data-testid="basket" />
        Tithe basket: don't sell what Gerald wants
      </label>
      {last && (
        <p class="muted small">
          Last Michaelmas: {last.met ? 'paid in full.' : `short. Fined ${num(last.fine)}d${last.booked > 0 ? `, and ${num(last.booked)}d written into the debt` : ''}.`}
        </p>
      )}
    </div>
  );
}

function Debt() {
  const g = useGame();
  const left = debtLeft(g);
  const next = nextMilestone(g);
  const lore = loreForPaid(g.debtPaid);
  const nextLoreAt = Math.pow(lore + 1, 2) * BALANCE.loreDivisor;
  const pay = (amount: number) => act((s) => payDebt(s, amount));
  return (
    <div class="debt" data-testid="debt">
      <h3>The family debt</h3>
      <Bar value={g.debtPaid} max={debtOwedTotal(g)} kind="debt" label={`${num(g.debtPaid)} of ${num(debtOwedTotal(g))}d paid (${(debtFraction(g) * 100).toFixed(1)}%)`} />
      {g.debtExtra > 0 && <p class="small bad">Includes {num(g.debtExtra)}d Gerald added to the book for missed tithes.</p>}
      <p class="small">
        Paid stays paid, for every Hob to come. Pennies don't: when you die, the Lord takes half of what you leave.
      </p>
      <div class="row gap">
        <Btn onClick={() => pay(10)} disabled={g.pennies < 10 || left <= 0} testid="pay-10">
          Pay 10d
        </Btn>
        <Btn onClick={() => pay(100)} disabled={g.pennies < 100 || left <= 0}>
          Pay 100d
        </Btn>
        <Btn onClick={() => pay(Math.floor(g.pennies / 2))} disabled={g.pennies < 2 || left <= 0} testid="pay-half">
          Pay half
        </Btn>
        <Btn onClick={() => pay(g.pennies)} disabled={g.pennies < 1 || left <= 0} kind="primary" testid="pay-all">
          Pay all ({num(g.pennies)}d)
        </Btn>
      </div>
      {next && (
        <>
          <p class="small">
            Next milestone at {num(next.at)}d: <strong>{next.milestone.name}</strong>. {next.milestone.desc}
          </p>
          <Bar value={g.debtPaid} max={next.at} kind="milestone" label={`${num(Math.max(0, next.at - g.debtPaid))}d to go`} />
        </>
      )}
      {g.life > 1 || lore > 0 ? (
        <p class="small muted">
          Family Lore earned from the debt so far: {lore}. The next point comes at {num(nextLoreAt)}d paid. Lore is given to each new Hob.
        </p>
      ) : (
        <p class="small muted">Paying the debt also earns the family Lore, which the next Hob can use.</p>
      )}
      <h3>Milestones</h3>
      <ul class="milestones">
        {MILESTONES.map((m, i) => {
          const got = g.milestones.includes(i);
          return (
            <li class={got ? 'got' : next?.index === i ? 'next' : 'muted'}>
              {got ? '✓ ' : ''}
              <strong>{m.pct}%</strong> {m.name}: {m.desc}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
