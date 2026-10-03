import { BALANCE } from '../../core/balance';
import { ITEMS, SETS, itemDef } from '../../content/items';
import { discard, equip, merge, mergeAll, unequip } from '../../core/actions';
import { SLOTS, allItems, bestIncomeRate, heirloomSlots, itemSaleValue, luck, scaledItemStats } from '../../core/formulas';
import type { GameState, ItemInstance, Slot } from '../../core/types';
import { Btn, bonusText } from '../bits';
import { num } from '../format';
import { act, useGame } from '../store';

const SLOT_NAMES: Record<Slot, string> = { head: 'Head', body: 'Body', hands: 'Hands', feet: 'Feet', trinket: 'Trinket' };

export function BelongingsTab() {
  const g = useGame();
  const hasDuplicates = g.inventory.some((i) => allItems(g).filter((j) => j.id === i.id).length > 1);
  const hiddenSets = SETS.length - g.discoveredSets.length;
  return (
    <div class="panel">
      <h2>Belongings</h2>
      <p class="hint">
        One thing per slot. When {g.name} dies, {heirloomSlots(g)} thing{heirloomSlots(g) === 1 ? '' : 's'} can be kept as heirlooms; the rest are sold toward the debt.
      </p>
      <h3>Wearing</h3>
      {SLOTS.map((slot) => {
        const item = g.equipped[slot];
        return (
          <div class="slot">
            <span class="muted small">{SLOT_NAMES[slot]}</span>
            {item ? (
              <div class="row space" style={{ flexWrap: 'nowrap' }}>
                <span title={itemDef(item.id).flavor}>
                  <strong>{itemDef(item.id).name}</strong> <Level item={item} />
                  <div class="small">{bonusText(scaledItemStats(item))}</div>
                </span>
                <Btn onClick={() => act((s) => unequip(s, slot))} kind="ghost">
                  Take off
                </Btn>
              </div>
            ) : (
              <span class="muted">nothing</span>
            )}
          </div>
        );
      })}
      {g.life > 1 && <p class="small muted">Luck: {num(luck(g))}. Better finds in the dung heap need more luck.</p>}

      <div class="row space">
        <h3>
          Sack {g.inventory.length}/{BALANCE.inventorySize}
        </h3>
        <Btn onClick={() => act(mergeAll)} disabled={!hasDuplicates} testid="merge-all">
          Merge all duplicates
        </Btn>
      </div>
      {g.inventory.length === 0 && <p class="muted">Empty.</p>}
      {groups(g).map((copies) => (
        <ItemGroup copies={copies} />
      ))}

      <h3>Hidden sets</h3>
      {g.discoveredSets.map((id) => {
        const set = SETS.find((s) => s.id === id)!;
        return (
          <div class="set small">
            <strong>{set.name}</strong>: {set.items.map((i) => itemDef(i).name).join(' + ')} → {bonusText(set.bonus)}
          </div>
        );
      })}
      <p class="muted small">
        {hiddenSets > 0 ? `${hiddenSets} sets still hidden. Some things work better together.` : 'You found every set. Fashion icon.'} Collection:{' '}
        {g.seenItems.length}/{ITEMS.length} things found.
      </p>
    </div>
  );
}

function Level(props: { item: ItemInstance }) {
  const lvl = props.item.level;
  if (lvl === 0) return null;
  return <span class="tag">{lvl >= BALANCE.maxItemLevel ? 'MAX' : `+${lvl}`}</span>;
}

function groups(g: GameState): ItemInstance[][] {
  const byId = new Map<string, ItemInstance[]>();
  for (const item of g.inventory) byId.set(item.id, [...(byId.get(item.id) ?? []), item]);
  return [...byId.values()]
    .map((list) => list.sort((a, b) => b.level - a.level))
    .sort((a, b) => SLOTS.indexOf(itemDef(a[0]!.id).slot) - SLOTS.indexOf(itemDef(b[0]!.id).slot) || a[0]!.id.localeCompare(b[0]!.id));
}

function mergeGroup(s: GameState, id: string): void {
  const copies = allItems(s).filter((i) => i.id === id);
  const best = copies.reduce((a, b) => (b.level > a.level ? b : a));
  for (const c of copies) if (c.uid !== best.uid) merge(s, c.uid, best.uid);
}

function ItemGroup(props: { copies: ItemInstance[] }) {
  const g = useGame();
  const item = props.copies[0]!;
  const def = itemDef(item.id);
  const mergeable = allItems(g).filter((c) => c.id === item.id && c.level < BALANCE.maxItemLevel).length > 1;
  const worst = props.copies[props.copies.length - 1]!;
  const before = bestIncomeRate(g);
  const after = bestIncomeRate({ ...g, equipped: { ...g.equipped, [def.slot]: item } });
  const delta = after - before;
  return (
    <div class="item">
      <div class="row space">
        <span title={def.flavor}>
          <strong>{def.name}</strong> <Level item={item} />
          {props.copies.length > 1 && <span class="tag">×{props.copies.length}</span>} <span class="muted small">{SLOT_NAMES[def.slot]}</span>
          <div class="small">{bonusText(scaledItemStats(item))}</div>
          <div class="small muted">
            If worn instead: {Math.abs(delta) >= 0.005 ? <span class={delta > 0 ? 'good' : 'bad'}>{delta > 0 ? '+' : ''}{num(delta)}d a second at best</span> : 'no change to income'} · sells for{' '}
            {itemSaleValue(item)}d when you die
          </div>
        </span>
        <span class="row gap">
          <Btn onClick={() => act((s) => equip(s, item.uid))} testid={`wear-${item.id}`}>
            Wear
          </Btn>
          {mergeable && <Btn onClick={() => act((s) => mergeGroup(s, item.id))}>Merge</Btn>}
          <Btn onClick={() => act((s) => discard(s, worst.uid))} kind="ghost" title="Bin one copy (the weakest)">
            Bin
          </Btn>
        </span>
      </div>
    </div>
  );
}
