import { UPGRADES } from '../../content/upgrades';
import { buyUpgrade } from '../../core/actions';
import { previewStats, upgradeCost, type Stats } from '../../core/formulas';
import type { UpgradeDef } from '../../core/types';
import { Btn, bonusText } from '../bits';
import { num, signedPct } from '../format';
import { act, useGame } from '../store';

function mainEffect(def: UpgradeDef, before: Stats, after: Stats): string {
  const key = Object.keys(def.perLevel)[0];
  const show = (label: string, a: number, b: number, fmt = num) => `${label} ${fmt(a)} → ${fmt(b)} (${signedPct(b / a - 1)})`;
  const mult = (x: number) => `×${x.toFixed(2)}`;
  switch (key) {
    case 'powerPct':
      return show('Power', before.power, after.power);
    case 'guardPct':
      return show('Guard', before.guard, after.guard);
    case 'regenPct':
      return show('Regen', before.regen, after.regen);
    case 'capPct':
      return show('Cap', before.cap, after.cap);
    case 'goldPct':
      return show('Gold', before.goldMult, after.goldMult, mult);
    case 'dropPct':
      return show('Drops', before.dropMult, after.dropMult, mult);
    default:
      return '';
  }
}

export function MarketTab() {
  const g = useGame();
  return (
    <div class="panel">
      <h2>Market</h2>
      <p class="hint">
        Upgrades last until you die. Bonuses from the same source add up, but different sources (gear, market, perks) multiply each
        other, so the biggest number isn't always the biggest gain. Check the actual change.
      </p>
      {UPGRADES.map((def) => {
        const level = g.upgrades[def.id];
        const cost = upgradeCost(def, level);
        const { before, after } = previewStats(g, (s) => {
          s.upgrades[def.id]++;
        });
        return (
          <div class="upgrade" data-testid={`upgrade-${def.id}`}>
            <div class="row space">
              <span title={def.flavor}>
                <strong>{def.name}</strong> <span class="muted">Lv {level}</span>
                <div class="small">{bonusText(def.perLevel)} per level</div>
                <div class="small muted">Next level: {mainEffect(def, before, after)}</div>
              </span>
              <Btn onClick={() => act((s) => buyUpgrade(s, def.id))} disabled={g.gold < cost} testid={`buy-${def.id}`}>
                {num(cost)} gold
              </Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}
