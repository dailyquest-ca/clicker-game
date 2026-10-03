import { BALANCE } from '../../core/balance';
import { itemDef } from '../../content/items';
import { CONTESTS } from '../../content/village';
import { enterFair } from '../../core/actions';
import { contestBeaten, contestDef, contestScore, contestTarget, entryFee, winChance, yearTime } from '../../core/formulas';
import { Btn } from '../bits';
import { num, pct, time } from '../format';
import { act, useGame } from '../store';

export function FairTab() {
  const g = useGame();
  const c = g.fairContest ? contestDef(g.fairContest) : null;
  const before = yearTime(g) < BALANCE.fairAt;
  return (
    <div class="panel">
      <h2>The Lammas Fair</h2>
      <p class="hint">One contest a year, held at the end of Summer. The contest changes every year.</p>
      {c ? (
        <div class="contest" data-testid="contest">
          <h3>
            This year: {c.name} {before ? <span class="muted small">(in {time(BALANCE.fairAt - yearTime(g))})</span> : null}
          </h3>
          <p class="taunt">{c.flavor}</p>
          <p>
            Champion: <strong>{c.champion}</strong>, who scores about <strong>{contestTarget(g, c)}</strong>.
          </p>
          <p>
            Your score: about <strong>{num(contestScore(g, c))}</strong> (±20% on the day). Chance to win:{' '}
            <strong>{pct(winChance(contestScore(g, c), contestTarget(g, c)))}</strong>.
          </p>
          <p class="small muted">
            {c.skill === 'tithes'
              ? 'Comes from how many tithes your family has paid in full, and how persuasive your prices are.'
              : 'Comes from your practice at the chore, the family know-how, and the kit you wear for it.'}{' '}
            Prize: {c.prize.pennies}d{c.prize.item ? `, ${itemDef(c.prize.item).name}` : ''}, and the title “{c.prize.title}”.
          </p>
          {g.fairEntered ? (
            <p class="good">You're entered. Fingers crossed.</p>
          ) : (
            <Btn onClick={() => act(enterFair)} disabled={!before || g.pennies < entryFee(g, c)} kind="primary" testid="enter-fair">
              Enter ({entryFee(g, c)}d)
            </Btn>
          )}
        </div>
      ) : (
        <p class="muted">No contest this year. The champions are resting. Next year's is announced at Michaelmas.</p>
      )}
      {g.lastFair && (
        <p class="small">
          Last fair: you scored {num(g.lastFair.score)} against {g.lastFair.target}. {g.lastFair.won ? <span class="good">You won!</span> : <span class="bad">You lost.</span>}
        </p>
      )}
      <h3>Champions</h3>
      <ul class="small">
        {CONTESTS.map((x) => (
          <li>
            {x.name}: {contestBeaten(g, x) ? 'beaten at every level. Legend.' : `beaten ${g.contestWins[x.id] ?? 0} of ${x.scores.length} times`}
          </li>
        ))}
      </ul>
    </div>
  );
}
