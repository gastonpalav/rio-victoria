/** Un día (en hora argentina) de una estación: promedio y máximo de sus lecturas. */
export type Daily = { day: number; meanM: number; maxM: number };

const DAY_MS = 86_400_000;
const ART_OFFSET_MS = 3 * 3_600_000;

/** Número de día en hora argentina (UTC−3). */
export const dayOf = (ts: Date) => Math.floor((ts.getTime() - ART_OFFSET_MS) / DAY_MS);

const SMOOTH = 1; // ±1 día
const CHANGE_DAYS = 7; // se compara el cambio semanal, no el diario: el diario es puro viento
const MAX_LAG = 20;
const MIN_PAIRS = 120;
const MIN_R = 0.5;
const PLATEAU = 0.02; // lags casi tan buenos como el mejor forman el rango
const MAX_WIDTH = 6;

/** Cambio semanal de la serie suavizada, por día. */
function weeklyChange(d: Daily[]): Map<number, number> {
  const mean = new Map(d.map((x) => [x.day, x.meanM]));
  const smooth = (day: number) => {
    let s = 0;
    let n = 0;
    for (let k = -SMOOTH; k <= SMOOTH; k++) {
      const v = mean.get(day + k);
      if (v !== undefined) {
        s += v;
        n++;
      }
    }
    return n ? s / n : undefined;
  };
  const out = new Map<number, number>();
  for (const { day } of d) {
    const a = smooth(day);
    const b = smooth(day - CHANGE_DAYS);
    if (a !== undefined && b !== undefined) out.set(day, a - b);
  }
  return out;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let s = 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    s += (a[i]! - ma) * (b[i]! - mb);
    sa += (a[i]! - ma) ** 2;
    sb += (b[i]! - mb) ** 2;
  }
  return sa && sb ? s / Math.sqrt(sa * sb) : 0;
}

/**
 * Cuántos días suele tardar lo que pasa en un puerto de arriba en notarse acá, según el último año.
 * Devuelve un rango (el pico de la correlación es chato) o null si la relación es floja o el rango muy ancho.
 */
export function travelDays(up: Daily[], here: Daily[]): { minDays: number; maxDays: number; r: number } | null {
  const U = weeklyChange(up);
  const H = weeklyChange(here);
  const rs: number[] = [];
  for (let lag = 0; lag <= MAX_LAG; lag++) {
    const a: number[] = [];
    const b: number[] = [];
    for (const [day, h] of H) {
      const u = U.get(day - lag);
      if (u !== undefined) {
        a.push(u);
        b.push(h);
      }
    }
    rs.push(a.length >= MIN_PAIRS ? pearson(a, b) : -1);
  }
  const best = Math.max(...rs);
  if (best < MIN_R) return null;
  const at = rs.indexOf(best);
  let lo = at;
  let hi = at;
  while (lo > 0 && rs[lo - 1]! >= best - PLATEAU) lo--;
  while (hi < MAX_LAG && rs[hi + 1]! >= best - PLATEAU) hi++;
  if (hi - lo > MAX_WIDTH) return null;
  return { minDays: lo, maxDays: hi, r: best };
}

type Reading = { ts: string; heightM: number };

/** Metros por día en los últimos ~3 días (null si no hay una lectura de hace 2,5 a 4 días). */
export function ratePerDay(series: Reading[], now: Reading, days = 3): number | null {
  const t = new Date(now.ts).getTime();
  const target = t - days * DAY_MS;
  let best: Reading | null = null;
  for (const p of series) {
    const dt = t - new Date(p.ts).getTime();
    if (dt < 2.5 * DAY_MS || dt > 4 * DAY_MS) continue;
    if (!best || Math.abs(new Date(p.ts).getTime() - target) < Math.abs(new Date(best.ts).getTime() - target)) best = p;
  }
  if (!best) return null;
  return (now.heightM - best.heightM) / ((t - new Date(best.ts).getTime()) / DAY_MS);
}

/** Días en que el río llegó (al menos una lectura) al nivel dado. */
export const daysAbove = (d: Daily[], levelM: number) => d.filter((x) => x.maxM >= levelM).length;

/** El promedio de hace 365 días; si falta ese día, el más cercano a un día de distancia. */
export function sameDayLastYear(d: Daily[], today: number): number | null {
  const target = today - 365;
  for (const k of [0, -1, 1]) {
    const x = d.find((y) => y.day === target + k);
    if (x) return x.meanM;
  }
  return null;
}
