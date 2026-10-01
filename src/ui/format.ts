const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];

export function num(x: number): string {
  if (!Number.isFinite(x)) return '∞';
  const sign = x < 0 ? '-' : '';
  let v = Math.abs(x);
  if (v < 10) return sign + (Math.round(v * 10) / 10).toString();
  if (v < 1000) return sign + Math.floor(v).toString();
  let u = 0;
  while (v >= 1000 && u < UNITS.length - 1) {
    v /= 1000;
    u++;
  }
  return `${sign}${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)}${UNITS[u]}`;
}

export function pct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function signedPct(fraction: number): string {
  const v = fraction * 100;
  return `${v >= 0 ? '+' : ''}${v.toFixed(Math.abs(v) < 10 ? 1 : 0)}%`;
}

export function time(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function secs(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'never';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return time(seconds);
}
