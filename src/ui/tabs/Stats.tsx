import { useState } from 'preact/hooks';
import { BOSSES } from '../../content/bosses';
import { ACHIEVEMENTS } from '../../content/upgrades';
import { computeStats } from '../../core/formulas';
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
  const stats = computeStats(g);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div class="panel">
      <h2>Stats</h2>
      <table class="kv">
        <tbody>
          <tr><td>Time played</td><td>{time(g.totalTime)}</td></tr>
          <tr><td>This life</td><td>{time(g.lifeTime)}</td></tr>
          <tr><td>Rebirths</td><td>{g.rebirths}</td></tr>
          <tr><td>Furthest boss</td><td>{g.records.bestBossEver ? BOSSES[g.records.bestBossEver - 1]?.name : '—'}</td></tr>
          <tr><td>Power / Guard</td><td>{num(stats.power)} / {num(stats.guard)} (×{stats.powerMult.toFixed(2)} / ×{stats.guardMult.toFixed(2)} from bonuses)</td></tr>
          <tr><td>Gold / drop multipliers</td><td>×{stats.goldMult.toFixed(2)} / ×{stats.dropMult.toFixed(2)}</td></tr>
          <tr><td>Things knocked out</td><td>{num(g.records.totalKills)}</td></tr>
          <tr><td>Gold earned, all lives</td><td>{num(g.records.totalGold)}</td></tr>
          <tr><td>Items found</td><td>{num(g.records.itemsFound)}</td></tr>
          <tr><td>Memories earned, all lives</td><td>{num(g.records.memoriesEarned)}</td></tr>
        </tbody>
      </table>

      <h3>Achievements ({g.achievements.length}/{ACHIEVEMENTS.length})</h3>
      <p class="muted small">Each one adds 3% to Power and Guard.</p>
      <ul class="achievements">
        {ACHIEVEMENTS.map((a) => {
          const got = g.achievements.includes(a.id);
          return (
            <li class={got ? 'got' : ''}>
              {got || !a.secret ? (
                <>
                  <strong>{a.name}</strong>: {a.desc}
                </>
              ) : (
                <span class="muted">??? (secret)</span>
              )}
            </li>
          );
        })}
      </ul>

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
