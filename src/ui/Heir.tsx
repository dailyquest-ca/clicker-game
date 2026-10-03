import { useState } from 'preact/hooks';
import { CHORES } from '../content/chores';
import { itemDef } from '../content/items';
import { passOn } from '../core/actions';
import { allItems, heirloomSlots, itemSaleValue, passOnPreview, practiceLevel } from '../core/formulas';
import { Btn } from './bits';
import { num } from './format';
import { act, useGame } from './store';

/** The heir screen: shown when Hob dies, or when you choose to retire. Nothing changes until you confirm. */
export function Heir(props: { retiring: boolean; onClose: () => void }) {
  const g = useGame();
  const items = allItems(g);
  const slots = heirloomSlots(g);
  const [keep, setKeep] = useState<number[]>(() =>
    [...items]
      .sort((a, b) => itemSaleValue(b) - itemSaleValue(a))
      .slice(0, slots)
      .map((i) => i.uid),
  );
  const preview = passOnPreview(g, keep);
  const toggle = (uid: number) =>
    setKeep((k) => (k.includes(uid) ? k.filter((x) => x !== uid) : k.length < slots ? [...k, uid] : [...k.slice(1), uid]));
  const gains = CHORES.filter((c) => practiceLevel(g.practice[c.id]) > g.knowHow[c.id]);

  return (
    <div class="modal" role="dialog" data-testid="heir">
      <div class="modal-box wide">
        <h2>{props.retiring ? `${g.name} retires` : `${g.name}'s time has come`}</h2>
        <p>
          {props.retiring
            ? 'He hands over the pitchfork and settles into a chair by the fire. The Lord still takes his due.'
            : 'The village gathers. Gerald brings his ledger, out of respect, and also because he needs it.'}
        </p>
        <h3>What's left behind</h3>
        <p class="small">
          Pennies and goods: the Lord takes half as heriot, and the other half pays toward the debt: <strong>{num(preview.heriot)}d</strong>.
          {g.pennies > 20 && props.retiring ? ' (Paying the debt yourself first would count in full.)' : ''}
        </p>
        <h3>
          Heirlooms ({keep.length}/{slots})
        </h3>
        {items.length === 0 ? (
          <p class="muted small">Nothing to pass on but the pitchfork, and that belongs to the Lord.</p>
        ) : (
          <>
            <p class="hint">Kept things go to the heir. Everything else is sold toward the debt.</p>
            {items.map((i) => (
              <label class="row gap small heirloom">
                <input type="checkbox" checked={keep.includes(i.uid)} onChange={() => toggle(i.uid)} />
                {itemDef(i.id).name}
                {i.level > 0 ? ` +${i.level}` : ''} <span class="muted">(sells for {itemSaleValue(i)}d)</span>
              </label>
            ))}
            <p class="small">Sold toward the debt: {num(preview.itemSales)}d.</p>
          </>
        )}
        <h3>For the next Hob</h3>
        <ul class="small">
          <li>
            {num(preview.toDebt)}d more off the debt, and <strong>+{preview.lore} Lore</strong> to spend on Traditions.
          </li>
          {gains.map((c) => (
            <li>
              {c.name} know-how: {g.knowHow[c.id]} → {practiceLevel(g.practice[c.id])}
            </li>
          ))}
          <li>Pennies, goods, hens and shop things start again. The debt, Lore, Traditions, milestones and anything the village has done for you stay.</li>
        </ul>
        <div class="row gap">
          <Btn
            onClick={() => {
              act((s) => passOn(s, keep));
              props.onClose();
            }}
            kind="primary"
            testid="pass-on"
          >
            Pass on the pitchfork
          </Btn>
          {props.retiring && (
            <Btn onClick={props.onClose} kind="ghost">
              Not yet
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
