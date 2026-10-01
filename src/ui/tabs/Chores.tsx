import { useState } from 'preact/hooks';
import { CHORES } from '../../content/chores';
import { assign, unassignAll } from '../../core/actions';
import { BALANCE } from '../../core/balance';
import { choreCost, choreUnlocked, computeStats } from '../../core/formulas';
import type { ChoreDef } from '../../core/types';
import { Bar, Btn } from '../bits';
import { num, secs } from '../format';
import { act, useGame } from '../store';

const AMOUNTS = ['1', '10', '25%', '50%', 'All'] as const;
type Amount = (typeof AMOUNTS)[number];

function resolve(amount: Amount, pool: number): number {
  if (amount === 'All') return pool;
  if (amount.endsWith('%')) return (pool * Number(amount.slice(0, -1))) / 100;
  return Number(amount);
}

export function ChoresTab() {
  const g = useGame();
  const stats = computeStats(g);
  const [amount, setAmount] = useState<Amount>('10');
  const assignedTotal = CHORES.reduce((s, c) => s + g.stamina.assigned[c.id], 0);

  return (
    <div class="panel">
      <h2>Chores</h2>
      <p class="hint">
        Stamina refills on its own. Assign it to chores: it isn't used up, it just makes the chore's bar fill. You can move it
        whenever you like.
      </p>
      <div class="stamina">
        <div class="row space">
          <strong>Stamina</strong>
          <span>
            {num(g.stamina.idle)} idle · {num(assignedTotal)} working · cap {num(stats.cap)} · +{num(stats.regen)}/s
          </span>
        </div>
        <Bar value={assignedTotal + g.stamina.idle} max={stats.cap} kind="stamina" label={`${num(assignedTotal + g.stamina.idle)} / ${num(stats.cap)}`} />
        <div class="row gap amounts">
          <span class="muted">Move:</span>
          {AMOUNTS.map((a) => (
            <button class={`chip ${amount === a ? 'on' : ''}`} onClick={() => setAmount(a)}>
              {a}
            </button>
          ))}
          <span class="grow" />
          <Btn onClick={() => act(unassignAll)} kind="ghost">
            Unassign all
          </Btn>
        </div>
      </div>

      {CHORES.map((def) => (
        <ChoreRow def={def} amount={amount} />
      ))}

      {g.rebirths > 0 && (
        <p class="hint">
          Muscle memory: chores cost {Math.round((1 - Math.pow(BALANCE.muscleMemory, g.rebirths)) * 100)}% less than in your
          first life.
        </p>
      )}
    </div>
  );
}

function ChoreRow(props: { def: ChoreDef; amount: Amount }) {
  const g = useGame();
  const { def } = props;
  const c = g.chores[def.id];
  const unlocked = choreUnlocked(g, def);
  if (!unlocked) {
    const req = def.unlock!;
    const reqName = CHORES.find((d) => d.id === req.chore)?.name;
    if (g.chores[req.chore].level < req.level / 2) return null;
    return (
      <div class="chore locked">
        <div class="row space">
          <strong>???</strong>
          <span class="muted">
            Reach level {req.level} in {reqName}
          </span>
        </div>
      </div>
    );
  }
  const cost = choreCost(def, c.level, g.rebirths);
  const assigned = g.stamina.assigned[def.id];
  const eta = assigned > 0 ? (cost - c.progress) / assigned : Infinity;
  // Stat gained per stamina, per minute. This is the number a clever player compares between chores.
  const efficiency = (def.perLevel / cost) * 60;
  const plus = resolve(props.amount, g.stamina.idle);
  const minus = props.amount === 'All' ? assigned : props.amount.endsWith('%') ? resolve(props.amount, assigned) : Number(props.amount);

  return (
    <div class="chore" data-testid={`chore-${def.id}`}>
      <div class="row space">
        <span title={def.flavor}>
          <strong>{def.name}</strong> <span class={`tag ${def.stat}`}>+{def.perLevel} {def.stat === 'power' ? 'Power' : 'Guard'}/lvl</span>
        </span>
        <span>
          Lv <strong data-testid={`chore-${def.id}-level`}>{c.level}</strong>
        </span>
      </div>
      <Bar value={c.progress} max={cost} kind={def.stat} label={assigned > 0 ? `next level in ${secs(eta)}` : 'no stamina assigned'} />
      <div class="row space">
        <span class="muted small" title="How much stat one point of stamina earns per minute at this chore's current level.">
          {efficiency >= 0.01 ? efficiency.toFixed(2) : efficiency.toExponential(1)} {def.stat === 'power' ? 'Power' : 'Guard'} per stamina-minute
        </span>
        <span class="row gap">
          <Btn onClick={() => act((s) => assign(s, def.id, -minus))} disabled={assigned <= 0} testid={`minus-${def.id}`}>
            −
          </Btn>
          <span class="assigned">{num(assigned)}</span>
          <Btn onClick={() => act((s) => assign(s, def.id, plus))} disabled={g.stamina.idle <= 0} testid={`plus-${def.id}`}>
            +
          </Btn>
        </span>
      </div>
    </div>
  );
}
