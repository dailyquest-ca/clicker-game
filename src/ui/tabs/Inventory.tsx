import { ITEMS, MAX_ITEM_LEVEL, SETS, itemDef } from '../../content/items';
import { discard, equip, merge, mergeAll, unequip } from '../../core/actions';
import { SLOTS, inventorySize, previewStats, scaledItemStats } from '../../core/formulas';
import type { GameState, ItemInstance } from '../../core/types';
import { Btn, bonusText } from '../bits';
import { num } from '../format';
import { act, useGame } from '../store';

const SLOT_NAMES = { head: 'Head', body: 'Body', weapon: 'Weapon', feet: 'Feet', trinket: 'Trinket' } as const;

function allCopies(g: GameState, id: string): ItemInstance[] {
  return [...SLOTS.map((s) => g.equipped[s]).filter((i): i is ItemInstance => !!i && i.id === id), ...g.inventory.filter((i) => i.id === id)];
}

export function InventoryTab() {
  const g = useGame();
  const size = inventorySize(g);
  const hasDuplicates = g.inventory.some((i) => allCopies(g, i.id).length > 1);
  const hiddenSets = SETS.length - g.discoveredSets.length;

  return (
    <div class="panel">
      <h2>Inventory</h2>
      <h3>Wearing</h3>
      <div class="equipped">
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
      </div>

      <div class="row space">
        <h3>
          Sack {g.inventory.length}/{size}
        </h3>
        <Btn onClick={() => act(mergeAll)} disabled={!hasDuplicates} testid="merge-all">
          Merge all duplicates
        </Btn>
      </div>
      {g.inventory.length === 0 && <p class="muted">Empty. Go adventuring.</p>}
      <div class="items">
        {groups(g).map((copies) => (
          <ItemGroup copies={copies} />
        ))}
      </div>

      <h3>Hidden sets</h3>
      {g.discoveredSets.map((id) => {
        const set = SETS.find((s) => s.id === id)!;
        return (
          <div class="set">
            <strong>{set.name}</strong>: {set.items.map((i) => itemDef(i).name).join(' + ')} → {bonusText(set.bonus)}
          </div>
        );
      })}
      <p class="muted small">
        {hiddenSets > 0 ? `${hiddenSets} sets still hidden. Some things are better worn together.` : 'You found every set. Fashion icon.'}
      </p>
      <p class="muted small">
        Collection: {g.seenItems.length}/{ITEMS.length} items found.
      </p>
    </div>
  );
}

function Level(props: { item: ItemInstance }) {
  const lvl = props.item.level;
  if (lvl === 0) return null;
  return <span class="tag">{lvl >= MAX_ITEM_LEVEL ? 'MAX' : `+${lvl}`}</span>;
}

/** Inventory copies grouped by item, best copy first. */
function groups(g: GameState): ItemInstance[][] {
  const byId = new Map<string, ItemInstance[]>();
  for (const item of g.inventory) byId.set(item.id, [...(byId.get(item.id) ?? []), item]);
  return [...byId.values()]
    .map((list) => list.sort((a, b) => b.level - a.level))
    .sort((a, b) => SLOTS.indexOf(itemDef(a[0]!.id).slot) - SLOTS.indexOf(itemDef(b[0]!.id).slot) || a[0]!.id.localeCompare(b[0]!.id));
}

function mergeGroup(s: GameState, id: string): void {
  const copies = allCopies(s, id);
  const best = copies.reduce((a, b) => (b.level > a.level ? b : a));
  for (const c of copies) if (c.uid !== best.uid) merge(s, c.uid, best.uid);
}

function ItemGroup(props: { copies: ItemInstance[] }) {
  const g = useGame();
  const item = props.copies[0]!;
  const def = itemDef(item.id);
  const mergeable = allCopies(g, item.id).filter((c) => c.level < MAX_ITEM_LEVEL).length > 1;
  const worst = props.copies[props.copies.length - 1]!;
  const { before, after } = previewStats(g, (s) => {
    s.equipped[def.slot] = item;
  });
  const dP = after.power - before.power;
  const dG = after.guard - before.guard;
  const dGold = after.goldMult / before.goldMult - 1;
  const dDrop = after.dropMult / before.dropMult - 1;
  const parts: string[] = [];
  if (Math.abs(dP) >= 0.05) parts.push(`${dP > 0 ? '+' : ''}${num(dP)} Power`);
  if (Math.abs(dG) >= 0.05) parts.push(`${dG > 0 ? '+' : ''}${num(dG)} Guard`);
  if (Math.abs(dGold) >= 0.005) parts.push(`${dGold > 0 ? '+' : ''}${Math.round(dGold * 100)}% gold`);
  if (Math.abs(dDrop) >= 0.005) parts.push(`${dDrop > 0 ? '+' : ''}${Math.round(dDrop * 100)}% drops`);

  return (
    <div class="item">
      <div class="row space">
        <span title={def.flavor}>
          <strong>{def.name}</strong> <Level item={item} />
          {props.copies.length > 1 && <span class="tag">×{props.copies.length}</span>} <span class="muted small">{SLOT_NAMES[def.slot]}</span>
          <div class="small">{bonusText(scaledItemStats(item))}</div>
          <div class="small muted">If worn instead: {parts.length ? parts.join(', ') : 'no change'}</div>
        </span>
        <span class="row gap">
          <Btn onClick={() => act((s) => equip(s, item.uid))}>Wear</Btn>
          {mergeable && <Btn onClick={() => act((s) => mergeGroup(s, item.id))}>Merge</Btn>}
          <Btn onClick={() => act((s) => discard(s, worst.uid))} kind="ghost" title="Bin one copy (the weakest)">
            Bin
          </Btn>
        </span>
      </div>
    </div>
  );
}
