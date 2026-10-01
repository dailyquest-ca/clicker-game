import { BOSSES } from '../../content/bosses';
import { ZONES } from '../../content/zones';
import { setZone, zoneUnlocked } from '../../core/actions';
import { computeStats, damageTaken, inventorySize, zoneForecast } from '../../core/formulas';
import { Bar, Btn } from '../bits';
import { num, pct } from '../format';
import { act, useGame } from '../store';

export function AdventureTab() {
  const g = useGame();
  const stats = computeStats(g);
  const adv = g.adventure;
  const zone = adv.zone !== null ? ZONES[adv.zone] : null;

  return (
    <div class="panel">
      <h2>Adventure</h2>
      <p class="hint">Pick a place. You fight whatever lives there, on your own, for gold and loot. Harder places drop better things.</p>

      {zone && (
        <div class="current-zone">
          <div class="row space">
            <h3>{zone.name}</h3>
            <Btn onClick={() => act((s) => setZone(s, null))} kind="ghost">
              Go home
            </Btn>
          </div>
          {adv.deadFor > 0 ? (
            <p class="bad">Knocked flat. Recovering… {adv.deadFor.toFixed(1)}s</p>
          ) : (
            <>
              <div class="muted small">{adv.enemy}</div>
              <Bar value={adv.enemyHp} max={zone.hp} kind="enemy" label={`${num(adv.enemyHp)} / ${num(zone.hp)}`} />
            </>
          )}
          <div class="muted small">You</div>
          <Bar value={adv.hp} max={stats.maxHp} kind="hp" label={`${num(Math.max(0, adv.hp))} / ${num(stats.maxHp)}`} />
          {g.inventory.length >= inventorySize(g) && <p class="warn small">Your sack is full: new loot is being lost. Merge or bin things in Inventory.</p>}
          <div class="row space small">
            <span data-testid="kills">Kills this life: {num(adv.kills)}</span>
            <span>Recovery after a knockout: {stats.recovery.toFixed(1)}s</span>
          </div>
        </div>
      )}

      <div class="zones">
        {ZONES.map((z, i) => {
          const unlocked = zoneUnlocked(g, i);
          if (!unlocked) {
            return (
              <div class="zone locked">
                <strong>???</strong> <span class="muted">Beat {BOSSES[z.unlockBoss - 1]?.name} this life.</span>
              </div>
            );
          }
          const f = zoneForecast(stats, z);
          const here = adv.zone === i;
          return (
            <div class={`zone ${here ? 'here' : ''}`} data-testid={`zone-${i}`}>
              <div class="row space">
                <strong title={z.flavor}>{z.name}</strong>
                {here ? (
                  <span class="tag">You are here</span>
                ) : (
                  <Btn onClick={() => act((s) => setZone(s, i))} testid={`go-zone-${i}`}>
                    Go
                  </Btn>
                )}
              </div>
              <div class="muted small">
                Enemies: {num(z.hp)} health, {num(z.atk)} attack (you'd take {num(damageTaken(z.atk, stats.guard))}/s) · {num(z.gold)} gold each ·{' '}
                {pct(z.dropChance)} base drop chance
              </div>
              <div class="small">
                On your feet {pct(f.alive)} of the time · ~{num(f.killsPerMin)} kills/min · ~{num(f.goldPerMin)} gold/min · ~
                {f.dropsPerMin.toFixed(2)} drops/min
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
