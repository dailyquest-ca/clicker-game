import { BALANCE } from '../../core/balance';
import { CHORES, good } from '../../content/chores';
import { assign, setPips } from '../../core/actions';
import {
  assignedPips,
  batchRate,
  bestSplit,
  choreVisible,
  effectivePips,
  hasBadBack,
  idlePips,
  practiceForLevel,
  practiceLevel,
  totalPips,
  workBreakdown,
} from '../../core/formulas';
import type { ChoreDef } from '../../core/types';
import { Bar, Btn, Pips } from '../bits';
import { num } from '../format';
import { act, useGame } from '../store';

export function WorkTab() {
  const g = useGame();
  const total = totalPips(g);
  const idle = idlePips(g);
  return (
    <div class="panel">
      <h2>Work</h2>
      <div class="row space">
        <div>
          Stamina pips <Pips used={assignedPips(g)} total={total} />{' '}
          <span class={idle > 0 ? 'warn' : 'muted small'}>{idle > 0 ? `${idle} idle` : 'all busy'}</span>
        </div>
        {g.cardsSeen.includes('shop') && (
          <Btn onClick={() => act((s) => setPips(s, bestSplit(s)))} kind="ghost" title="Every pip on whatever earns most right now. Ignores what Gerald wants.">
            Most pennies
          </Btn>
        )}
      </div>
      <p class="hint">Each pip does {BALANCE.pipWork} work a second on its chore. More pips come from porridge.</p>
      {hasBadBack(g) && <p class="bad small">Bad back: all work is {Math.round((1 - BALANCE.badBackMult) * 100)}% slower.</p>}
      {CHORES.filter((c) => choreVisible(g, c.id)).map((c) => (
        <Chore def={c} />
      ))}
      {!choreVisible(g, 'logs') && g.records.purchases > 0 && <p class="muted small">More chores will turn up as you get on in the world.</p>}
    </div>
  );
}

function Chore(props: { def: ChoreDef }) {
  const g = useGame();
  const c = props.def.id;
  const pips = g.pips[c];
  const working = effectivePips(g, c);
  const rate = batchRate(g, c);
  const level = practiceLevel(g.practice[c]);
  const next = practiceForLevel(level + 1);
  const prev = practiceForLevel(level);
  const parts = workBreakdown(g, c);
  const product = props.def.good ? good(props.def.good) : null;
  const seconds = rate > 0 ? 1 / rate : Infinity;
  return (
    <div class="chore" data-testid={`chore-${c}`}>
      <div class="row space">
        <div>
          <strong>{props.def.name}</strong>{' '}
          <span class="muted small">
            {product ? `${props.def.work} work → 1 ${product.name.toLowerCase()} (${product.price}d)` : `${props.def.work} work → one rummage`}
          </span>
        </div>
        <div class="row gap">
          <Btn onClick={() => act((s) => assign(s, c, -pips))} disabled={pips === 0} kind="ghost" title="Take all pips off">
            0
          </Btn>
          <Btn onClick={() => act((s) => assign(s, c, -1))} disabled={pips === 0} testid={`less-${c}`}>
            −
          </Btn>
          <span class="assigned">{pips}</span>
          <Btn onClick={() => act((s) => assign(s, c, 1))} disabled={idlePips(g) === 0} testid={`more-${c}`}>
            +
          </Btn>
          <Btn onClick={() => act((s) => assign(s, c, idlePips(s)))} disabled={idlePips(g) === 0} kind="ghost" title="All idle pips">
            max
          </Btn>
        </div>
      </div>
      <Bar
        value={rate > 0 ? g.progress[c] : 0}
        max={1}
        kind={c}
        label={
          rate > 0
            ? seconds < 1
              ? `${num(rate)} ${product ? product.plural : 'rummages'} a second`
              : `one every ${num(seconds)}s`
            : pips > 0
              ? 'not working (see below)'
              : 'no pips here'
        }
      />
      {c === 'eggs' && (
        <p class={`small ${pips > g.owned.hen ? 'warn' : 'muted'}`}>
          {g.owned.hen} hen{g.owned.hen === 1 ? '' : 's'}, {working} tended.{' '}
          {pips > g.owned.hen ? `${pips - g.owned.hen} pip${pips - g.owned.hen === 1 ? ' has' : 's have'} no hen to tend.` : 'Each hen needs exactly one pip.'}
        </p>
      )}
      <div class="row space small muted">
        <span title="Practice: pip-seconds spent on this chore this life. Know-how: the family's best.">
          Practice {level}
          {g.knowHow[c] > 0 ? ` · family know-how ${g.knowHow[c]}` : ''}
        </span>
        <span title="Skill (practice + know-how) × Kit (tools + what you wear) × Family (Traditions, milestones)">
          speed ×{parts.total.toFixed(2)}
          {parts.total !== 1 && (
            <>
              {' '}
              (skill ×{parts.skill.toFixed(2)}, kit ×{parts.kit.toFixed(2)}
              {parts.family !== 1 ? `, family ×${parts.family.toFixed(2)}` : ''}
              {parts.back !== 1 ? `, back ×${parts.back}` : ''})
            </>
          )}
        </span>
      </div>
      <Bar value={g.practice[c] - prev} max={next - prev} kind="practice" />
      <p class="muted small flavor">{props.def.flavor}</p>
    </div>
  );
}
