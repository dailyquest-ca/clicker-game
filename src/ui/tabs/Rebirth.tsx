import { useState } from 'preact/hooks';
import { PERKS } from '../../content/upgrades';
import { buyPerk, rebirth } from '../../core/actions';
import { BALANCE } from '../../core/balance';
import { canRebirth, memoriesIfRebirth, memoryRate, perkCost, rawMemories, ripeness } from '../../core/formulas';
import { Btn } from '../bits';
import { num, pct, time } from '../format';
import { act, useGame } from '../store';

export function RebirthTab() {
  const g = useGame();
  const [confirming, setConfirming] = useState(false);
  const gain = memoriesIfRebirth(g);
  const raw = rawMemories(g);
  const ripe = ripeness(g.lifeTime);
  const rate = memoryRate(g);
  const ok = canRebirth(g);
  const sincePeak = g.lifeTime - g.life.peakRateAt;
  const nextDiscount = Math.round((1 - Math.pow(BALANCE.muscleMemory, g.rebirths + 1)) * 100);

  return (
    <div class="panel">
      <h2>Rebirth</h2>
      <p class="hint">
        Die on purpose. You lose gold, chore levels, upgrades and boss progress. You keep your items, perks and Memories, and
        chores get 10% cheaper every life. Memories ripen with age: a life cut short keeps only some of them.
      </p>

      <div class="rebirth-box">
        <div class="big" data-testid="memories-now">
          {num(gain)} Memories if you die now
        </div>
        <div class="small">
          {num(raw)} earned × {pct(ripe)} ripeness {ripe < 1 && <span class="muted">(fully ripe at {time(BALANCE.memoryRipenSeconds)})</span>}
        </div>
        <div class="small">
          Right now: {rate.toFixed(2)} Memories/min · best this life: {g.life.peakRate.toFixed(2)}/min at {time(g.life.peakRateAt)}
          {g.life.peakRate > 0 && sincePeak > 30 && rate < g.life.peakRate * 0.95 && (
            <span class="warn"> (peaked {time(sincePeak)} ago)</span>
          )}
        </div>
        <div class="row gap">
          {!confirming ? (
            <Btn onClick={() => setConfirming(true)} disabled={!ok} kind="primary" testid="rebirth">
              Rebirth
            </Btn>
          ) : (
            <>
              <span>Really? Your next life starts in the mud.</span>
              <Btn
                onClick={() => {
                  act(rebirth);
                  setConfirming(false);
                }}
                kind="primary"
                testid="rebirth-confirm"
              >
                Yes, die
              </Btn>
              <Btn onClick={() => setConfirming(false)} kind="ghost">
                Not yet
              </Btn>
            </>
          )}
          {!ok && <span class="muted small">Beat {BALANCE.rebirthMinBosses} bosses this life first.</span>}
        </div>
        <div class="muted small">Next life, chores cost {nextDiscount}% less than in your first life.</div>
      </div>

      <h3>
        Perks <span class="muted small">({num(g.memories)} Memories to spend)</span>
      </h3>
      {PERKS.map((def) => {
        const level = g.perks[def.id];
        const maxed = level >= def.maxLevel;
        const cost = perkCost(def, level);
        return (
          <div class="perk" data-testid={`perk-${def.id}`}>
            <div class="row space">
              <span>
                <strong>{def.name}</strong>{' '}
                <span class="muted">
                  {def.maxLevel === 1 ? (level ? 'owned' : '') : `Lv ${level}/${def.maxLevel}`}
                </span>
                <div class="small">{def.desc}</div>
              </span>
              <Btn onClick={() => act((s) => buyPerk(s, def.id))} disabled={maxed || g.memories < cost} testid={`buy-perk-${def.id}`}>
                {maxed ? 'Maxed' : `${num(cost)} Memories`}
              </Btn>
            </div>
          </div>
        );
      })}

      {g.chronicle.length > 0 && (
        <>
          <h3>The Chronicle of Hob</h3>
          <table class="chronicle">
            <thead>
              <tr>
                <th>Life</th>
                <th>Length</th>
                <th>Bosses</th>
                <th>Memories</th>
                <th>Epitaph</th>
              </tr>
            </thead>
            <tbody>
              {g.chronicle.map((c) => (
                <tr>
                  <td>{c.life}</td>
                  <td>{time(c.seconds)}</td>
                  <td>{c.bosses}</td>
                  <td>{num(c.memories)}</td>
                  <td class="small">{c.epitaph}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
