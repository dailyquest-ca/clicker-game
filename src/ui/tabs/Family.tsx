import { BALANCE } from '../../core/balance';
import { CHORES } from '../../content/chores';
import { TRADITIONS } from '../../content/shop';
import { buyTradition } from '../../core/actions';
import { age, canRetire, hasBadBack, lifespan, traditionCost } from '../../core/formulas';
import { Btn } from '../bits';
import { num, time } from '../format';
import { act, useGame } from '../store';

export function FamilyTab(props: { onRetire: () => void }) {
  const g = useGame();
  const span = lifespan(g);
  const backAt = BALANCE.badBackAt * span;
  return (
    <div class="panel">
      <h2>The Family</h2>
      <p>
        <strong>{g.name}</strong>, age {age(g)}. Generation {g.life}.{' '}
        {hasBadBack(g) ? (
          <span class="bad">His back has gone. He has about {time(span - g.lifeTime)} left in him.</span>
        ) : (
          <span class="muted">His back should hold for another {time(backAt - g.lifeTime)}.</span>
        )}
      </p>
      <div class="row gap">
        <Btn onClick={props.onRetire} disabled={!canRetire(g)} testid="retire">
          Retire and pass on the pitchfork
        </Btn>
        <span class="muted small">{canRetire(g) ? 'You choose heirlooms first. Nothing happens until you confirm.' : 'Not before your first Michaelmas.'}</span>
      </div>

      <h3>Traditions</h3>
      <p class="hint">
        Lore comes from the debt your family has paid, across every life. Spend it on Traditions; they last forever. <strong>{g.lore}</strong> Lore to spend.
      </p>
      {TRADITIONS.map((t) => {
        const level = g.traditions[t.id];
        const maxed = level >= t.max;
        const cost = traditionCost(g, t.id);
        return (
          <div class="perk" data-testid={`tradition-${t.id}`}>
            <div class="row space">
              <div>
                <strong>{t.name}</strong> <span class="tag">{level}/{t.max}</span>
                <div class="small">{t.desc}</div>
              </div>
              <Btn onClick={() => act((s) => buyTradition(s, t.id))} disabled={maxed || g.lore < cost} kind="primary">
                {maxed ? 'Done' : `${cost} Lore`}
              </Btn>
            </div>
          </div>
        );
      })}

      <h3>Family know-how</h3>
      <p class="hint">The best practice level any Hob reached at each chore. Each level makes heirs {Math.round(BALANCE.knowHowPerLevel * 100)}% faster at it.</p>
      <p class="small">{CHORES.map((c) => `${c.name} ${g.knowHow[c.id]}`).join(' · ')}</p>

      {g.titles.length > 0 && (
        <>
          <h3>Titles</h3>
          <p class="small">{g.titles.join(', ')}</p>
        </>
      )}

      <h3>The Chronicle</h3>
      {g.chronicle.length === 0 ? (
        <p class="muted small">No Hob has passed on yet. Give it time.</p>
      ) : (
        <table class="chronicle">
          <thead>
            <tr>
              <th>Hob</th>
              <th>Paid</th>
              <th>Epitaph</th>
            </tr>
          </thead>
          <tbody>
            {g.chronicle.map((r) => (
              <tr>
                <td>{r.name}</td>
                <td>{num(r.paid)}d</td>
                <td class="small">{r.epitaph}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
