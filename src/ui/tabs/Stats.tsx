import { useState } from 'preact/hooks';
import { deserialize, serialize } from '../../core/save';
import { newGame } from '../../core/state';
import { Btn } from '../bits';
import { num, time } from '../format';
import { emit, store, useGame } from '../store';

function encode(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}
function decode(code: string): string {
  return decodeURIComponent(escape(atob(code.trim())));
}

export function StatsTab() {
  const g = useGame();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const r = g.records;
  return (
    <div class="panel">
      <h2>Stats</h2>
      <table class="kv">
        <tbody>
          <tr><td>Time played</td><td>{time(g.totalTime)}</td></tr>
          <tr><td>This Hob</td><td>{time(g.lifeTime)}</td></tr>
          <tr><td>Generations</td><td>{g.life}</td></tr>
          <tr><td>Goods sold, all lives</td><td>{num(r.soldTotal)}</td></tr>
          <tr><td>Pennies earned, all lives</td><td>{num(r.earnedTotal)}</td></tr>
          <tr><td>Things bought</td><td>{num(r.purchases)}</td></tr>
          <tr><td>Tithes paid / missed</td><td>{r.tithesMet} / {r.tithesMissed}</td></tr>
          <tr><td>Odd things found</td><td>{num(r.itemsFound)}</td></tr>
          <tr><td>Goods sold off cheap (barn full)</td><td>{num(g.wastedGoods)} this life</td></tr>
        </tbody>
      </table>

      <h3>Save</h3>
      <p class="muted small">The game saves itself every few seconds. Export a code to move it or keep a backup.</p>
      <div class="row gap">
        <Btn
          onClick={() => {
            const c = encode(serialize(store.game));
            setCode(c);
            navigator.clipboard?.writeText(c).then(
              () => setMessage('Copied to clipboard.'),
              () => setMessage('Copy the code below.'),
            );
          }}
        >
          Export
        </Btn>
        <Btn
          onClick={() => {
            try {
              store.game = deserialize(decode(code));
              store.game.lastSeen = Date.now();
              emit();
              setMessage('Loaded.');
            } catch (e) {
              setMessage(`That code didn't work: ${(e as Error).message}`);
            }
          }}
          disabled={!code.trim()}
        >
          Import
        </Btn>
        {!confirmReset ? (
          <Btn onClick={() => setConfirmReset(true)} kind="ghost">
            Wipe save
          </Btn>
        ) : (
          <Btn
            onClick={() => {
              store.game = newGame(Date.now() & 0x7fffffff, Date.now());
              setConfirmReset(false);
              emit();
              setMessage('Wiped. Hello again, Hob.');
            }}
            kind="danger"
          >
            Really wipe everything
          </Btn>
        )}
      </div>
      <textarea class="code" value={code} onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)} placeholder="Paste a save code here to import" />
      {message && <p class="small">{message}</p>}
    </div>
  );
}
