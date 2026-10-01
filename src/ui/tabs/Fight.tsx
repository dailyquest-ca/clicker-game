import { BOSSES } from '../../content/bosses';
import { dismissFight, startFight } from '../../core/actions';
import { BALANCE } from '../../core/balance';
import { computeStats, damageTaken, predictFight } from '../../core/formulas';
import { Bar, Btn } from '../bits';
import { num, secs, time } from '../format';
import { act, useGame } from '../store';

export function FightTab() {
  const g = useGame();
  const stats = computeStats(g);
  const fight = g.fight;
  const boss = BOSSES[fight ? fight.boss : g.bossesBeaten];

  return (
    <div class="panel">
      <h2>Fight</h2>
      {!boss && (
        <p>
          You have beaten everyone this prototype has to offer. Somewhere, a Lord is getting nervous. (Rebirth and do it faster,
          if you like.)
        </p>
      )}
      {boss && (
        <div class="boss">
          <div class="row space">
            <h3>
              #{(fight ? fight.boss : g.bossesBeaten) + 1} {boss.name}
            </h3>
            <span class={`tag arch ${boss.archetype.replace(' ', '-').toLowerCase()}`}>{boss.archetype}</span>
          </div>
          <p class="taunt">"{boss.taunt}"</p>
          <div class="grid2">
            <div>
              <div class="muted small">Boss</div>
              <div>Health {num(boss.hp)}</div>
              <div>Attack {num(boss.atk)}</div>
            </div>
            <div>
              <div class="muted small">You</div>
              <div>
                Power {num(stats.power)} · Guard {num(stats.guard)}
              </div>
              <div>
                Health {num(stats.maxHp)} · you'd take {num(damageTaken(boss.atk, stats.guard))}/s
              </div>
            </div>
          </div>

          {!fight && <Prediction />}

          {fight && (
            <div class="duel">
              <div class="muted small">{boss.name}</div>
              <Bar value={fight.bossHp} max={boss.hp} kind="enemy" label={`${num(fight.bossHp)} / ${num(boss.hp)}`} />
              <div class="muted small">You</div>
              <Bar value={fight.hp} max={fight.maxHp} kind="hp" label={`${num(Math.max(0, fight.hp))} / ${num(fight.maxHp)}`} />
              <div class="muted small">{fight.t.toFixed(1)}s</div>
            </div>
          )}

          <div class="row gap">
            {!fight && (
              <Btn onClick={() => act(startFight)} kind="primary" testid="fight">
                Fight!
              </Btn>
            )}
            {fight?.result && (
              <>
                <span class={fight.result === 'win' ? 'good' : 'bad'} data-testid="fight-result">
                  {fight.result === 'win' ? `You won in ${fight.t.toFixed(1)}s!` : 'You lost. Nothing is lost except pride.'}
                </span>
                <Btn onClick={() => act(dismissFight)} testid="fight-ok">
                  OK
                </Btn>
              </>
            )}
          </div>
        </div>
      )}

      {g.bossesBeaten > 0 && (
        <div class="beaten">
          <h3>Beaten this life</h3>
          <ol>
            {BOSSES.slice(0, g.bossesBeaten).map((b, i) => (
              <li>
                {b.name} <span class="muted">at {time(g.life.bossTimes[i] ?? 0)}</span>
              </li>
            ))}
          </ol>
          <p class="muted small">{BOSSES.length - g.bossesBeaten} more ahead.</p>
        </div>
      )}
    </div>
  );
}

function Prediction() {
  const g = useGame();
  const stats = computeStats(g);
  const boss = BOSSES[g.bossesBeaten];
  if (!boss) return null;
  const p = predictFight(stats, boss);
  let advice: string;
  if (p.win) advice = 'Looks winnable.';
  else if (p.ttk > BALANCE.fightTimeout && p.ttk < p.ttd) advice = `Too slow: it gets bored after ${BALANCE.fightTimeout}s. You need more Power.`;
  else advice = 'It would beat you first.';
  return (
    <div class={`prediction ${p.win ? 'good' : 'bad'}`} data-testid="prediction">
      <div>You'd beat it in {secs(p.ttk)}.</div>
      <div>It would beat you in {secs(p.ttd)}.</div>
      <div>
        <strong>{advice}</strong>
      </div>
    </div>
  );
}
