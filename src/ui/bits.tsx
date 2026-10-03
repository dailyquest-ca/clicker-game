import type { ComponentChildren } from 'preact';
import type { Bonuses } from '../core/types';
import { num } from './format';

export function Bar(props: { value: number; max: number; kind?: string; label?: ComponentChildren }) {
  const p = props.max > 0 ? Math.max(0, Math.min(1, props.value / props.max)) : 0;
  return (
    <div class={`bar ${props.kind ?? ''}`}>
      <div class="bar-fill" style={{ width: `${p * 100}%` }} />
      {props.label !== undefined && <div class="bar-label">{props.label}</div>}
    </div>
  );
}

export function Btn(props: { onClick: () => void; disabled?: boolean; children: ComponentChildren; kind?: string; title?: string; testid?: string }) {
  return (
    <button
      class={`btn ${props.kind ?? ''}`}
      disabled={props.disabled}
      title={props.title}
      data-testid={props.testid}
      onClick={() => !props.disabled && props.onClick()}
    >
      {props.children}
    </button>
  );
}

const LABELS: Record<keyof Bonuses, [string, boolean]> = {
  hayPct: ['hay speed', true],
  eggPct: ['egg speed', true],
  logPct: ['firewood speed', true],
  rummagePct: ['rummaging speed', true],
  workPct: ['all work', true],
  pricePct: ['sell prices', true],
  luckPct: ['luck', false],
  pips: ['stamina pip', false],
  barn: ['barn space', false],
};

export function bonusText(b: Partial<Bonuses>): string {
  const parts: string[] = [];
  for (const key of Object.keys(b) as (keyof Bonuses)[]) {
    const v = b[key] ?? 0;
    if (v === 0) continue;
    const [label, isPct] = LABELS[key];
    const sign = v > 0 ? '+' : '−';
    parts.push(isPct ? `${sign}${Math.abs(Math.round(v))}% ${label}` : `${sign}${num(Math.abs(v))} ${label}`);
  }
  return parts.join(', ');
}

/** Pennies, written the old way. */
export function d(x: number): string {
  return `${num(x)}d`;
}

export function Pips(props: { used: number; total: number }) {
  return (
    <span class="pips" aria-label={`${props.used} of ${props.total} pips busy`}>
      {Array.from({ length: props.total }, (_, i) => (
        <span class={`pip ${i < props.used ? 'on' : ''}`} />
      ))}
    </span>
  );
}
