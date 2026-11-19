import { type Daily, travelDays } from "./river-stats";

/** Un día estimado: un rango, nunca un número solo, con lo que se equivocó el método en la prueba. */
export type ForecastDay = {
  /** Tramo estimado: `base + ahead`. */
  day: number;
  /** Cuántos tramos de 24 h después del último completo. */
  ahead: number;
  midM: number;
  loM: number;
  hiM: number;
  /** Error medio absoluto de la prueba a esta distancia, en metros. */
  maeM: number;
  /** El mismo error, solo en las últimas semanas de la prueba: con el río movido suele ser mayor. */
  recentMaeM: number;
  /** El mismo error si se hubiera dicho "queda igual que hoy". */
  sameMaeM: number;
  /** Cuántas estimaciones pasadas se compararon con lo que después pasó. */
  tested: number;
};

export type Forecast = {
  /** Último tramo completo: de ahí sale la estimación. */
  baseDay: number;
  days: ForecastDay[];
  /** Fracción de las veces que el río quedó dentro del rango en la prueba (null si no alcanzó para medirlo). */
  coverage: number | null;
  /** Índices (en `ups`) de los puertos de arriba que se usaron. */
  used: number[];
};

const MAX_GAP = 3; // huecos de hasta 3 días se rellenan en línea recta
const OWN_DAYS = 3; // la tendencia propia se mide en los últimos 3 días
const FIRST = 25; // días de arranque: lo que necesitan las diferencias y el viaje más largo
const MIN_TRAIN = 180; // la prueba empieza cuando ya hay medio año para aprender
const MIN_ROWS = 100;
const MIN_TESTED = 60;
const LAG_EVERY = 7; // el viaje se recalcula cada semana de prueba, siempre con lo anterior
const BAND = 0.08; // el rango va del 8% al 92% de los errores pasados
const MIN_BAND_SAMPLE = 30;
const RECENT = 45; // si el río viene más movido que de costumbre, mandan los errores de las últimas semanas
const MIN_GAIN = 0.9; // tiene que errar al menos 10% menos que "queda igual"

function dense(d: Daily[], first: number, last: number): number[] {
  const out = new Array<number>(last - first + 1).fill(NaN);
  for (const x of d) if (x.day >= first && x.day <= last) out[x.day - first] = x.meanM;
  let prev = -1;
  for (let i = 0; i < out.length; i++) {
    if (Number.isNaN(out[i]!)) continue;
    if (prev >= 0 && i - prev > 1 && i - prev - 1 <= MAX_GAP) {
      for (let k = prev + 1; k < i; k++) out[k] = out[prev]! + ((out[i]! - out[prev]!) * (k - prev)) / (i - prev);
    }
    prev = i;
  }
  return out;
}

/** Mínimos cuadrados sin término independiente (son pocas columnas: eliminación de Gauss con pivoteo). */
function fit(X: number[][], y: number[]): number[] {
  const p = X[0]!.length;
  const A = Array.from({ length: p }, () => new Array<number>(p + 1).fill(0));
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) A[a]![b]! += X[i]![a]! * X[i]![b]!;
      A[a]![p]! += X[i]![a]! * y[i]!;
    }
  }
  for (let a = 0; a < p; a++) A[a]![a]! += 1e-6; // que no explote si dos columnas son casi iguales
  for (let c = 0; c < p; c++) {
    let piv = c;
    for (let r = c + 1; r < p; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[piv]![c]!)) piv = r;
    [A[c], A[piv]] = [A[piv]!, A[c]!];
    for (let r = 0; r < p; r++) {
      if (r === c) continue;
      const f = A[r]![c]! / A[c]![c]!;
      for (let k = c; k <= p; k++) A[r]![k]! -= f * A[c]![k]!;
    }
  }
  return A.map((row, i) => row[p]! / row[i]!);
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]!;
const asc = (xs: number[]) => [...xs].sort((a, b) => a - b);

/** Rango de errores esperable: el más ancho entre toda la prueba y sus últimas semanas. Errores en orden de fecha. */
function band(errors: number[]): { lo: number; hi: number } {
  const all = asc(errors);
  const recent = asc(errors.slice(-RECENT));
  return {
    lo: Math.min(0, quantile(all, BAND), quantile(recent, BAND)),
    hi: Math.max(0, quantile(all, 1 - BAND), quantile(recent, 1 - BAND)),
  };
}
const meanAbs = (xs: number[]) => xs.reduce((s, x) => s + Math.abs(x), 0) / xs.length;

/**
 * Cómo puede estar el río en unos días. Mitad sale de seguir la tendencia propia de los últimos 3 días, y mitad
 * de una regresión con lo que ya pasó en los puertos de arriba y todavía no llegó (según `travelDays`).
 *
 * Antes de decir nada se pone a prueba: para cada día del último medio año se arma la estimación solo con lo
 * que se sabía hasta ese día y se compara con lo que después pasó. De ahí salen el rango y el error publicado.
 * Devuelve null si falta el dato del último tramo, si no hay puertos de arriba con relación clara o si no hay
 * historia suficiente; y descarta cada distancia en la que no le gana a "queda igual" y a seguir la tendencia.
 *
 * Las series son promedios por tramo de 24 h: días de calendario o, mejor, ventanas que terminan en la última
 * lectura (`getWindowStats`), para no arrancar de un promedio viejo cuando el río se mueve rápido.
 *
 * @param ups puertos de arriba, del más cercano al más lejano
 * @param base último tramo completo; lo posterior se ignora
 * @param aheads a cuántos tramos del último completo estimar
 */
export function forecast(here: Daily[], ups: Daily[][], base: number, aheads: number[] = [1, 3, 5]): Forecast | null {
  const hereDone = here.filter((x) => x.day <= base);
  if (hereDone.length === 0 || hereDone.at(-1)!.day !== base || ups.length === 0) return null;
  const first = hereDone[0]!.day;
  const T = base - first; // índice del último día completo
  if (T < MIN_TRAIN + MIN_TESTED) return null;

  const V = dense(hereDone, first, base);
  const upsDone = ups.map((u) => u.filter((x) => x.day <= base));
  const U = upsDone.map((u) => dense(u, first, base));

  // Cuánto tarda cada puerto de arriba, visto desde el día t (solo con lo anterior).
  const lagsAt = (t: number): number[] => {
    const upTo = first + t;
    const mine = hereDone.filter((x) => x.day <= upTo);
    return upsDone.map((u) => {
      const r = travelDays(u.filter((x) => x.day <= upTo), mine);
      return r ? Math.max(1, Math.round((r.minDays + r.maxDays) / 2)) : NaN;
    });
  };

  const own = (t: number) => V[t]! - V[t - OWN_DAYS]!;
  const trend = (t: number, h: number) => (own(t) / OWN_DAYS) * h;
  /** Columnas: tendencia propia; lo de arriba que todavía no llegó; tendencia reciente de arriba. */
  const features = (t: number, h: number, lags: number[]): number[] | null => {
    let pending = 0;
    let recent = 0;
    let n = 0;
    for (let j = 0; j < lags.length; j++) {
      const L = lags[j]!;
      if (Number.isNaN(L)) continue;
      const a = U[j]![t - Math.max(0, L - h)]! - U[j]![t - L]!;
      const b = U[j]![t]! - U[j]![t - OWN_DAYS]!;
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      pending += a;
      recent += b;
      n++;
    }
    const o = own(t);
    return n === 0 || Number.isNaN(o) ? null : [o, pending / n, recent / n];
  };
  /** Cambio esperado de t a t+h, aprendiendo solo de los días cuyo desenlace ya se conocía en t. */
  const predict = (t: number, h: number, lags: number[]): number | null => {
    const x = features(t, h, lags);
    if (!x) return null;
    const X: number[][] = [];
    const y: number[] = [];
    for (let s = FIRST; s + h <= t; s++) {
      const xs = features(s, h, lags);
      const ys = V[s + h]! - V[s]!;
      if (xs && !Number.isNaN(ys)) {
        X.push(xs);
        y.push(ys);
      }
    }
    if (X.length < MIN_ROWS) return null;
    const b = fit(X, y);
    const reg = x.reduce((s, v, i) => s + v * b[i]!, 0);
    return (trend(t, h) + reg) / 2;
  };

  // Un puerto de arriba sin dato en el último tramo no entra en la cuenta.
  const lagsNow = lagsAt(T).map((L, j) => (Number.isNaN(U[j]![T]!) ? NaN : L));
  const used = lagsNow.flatMap((L, j) => (Number.isNaN(L) ? [] : [j]));
  if (used.length === 0) return null;

  const days: ForecastDay[] = [];
  let inside = 0;
  let checked = 0;
  for (const ahead of aheads) {
    const h = ahead;
    const now = predict(T, h, lagsNow);
    if (now === null) continue;

    // La prueba: una estimación por cada día pasado, con lo que se sabía ese día.
    const errors: { t: number; e: number }[] = [];
    const same: number[] = [];
    const byTrend: number[] = [];
    let lags: number[] = [];
    for (let t = MIN_TRAIN; t + h <= T; t++) {
      if ((t - MIN_TRAIN) % LAG_EVERY === 0) lags = lagsAt(t);
      const actual = V[t + h]! - V[t]!;
      if (Number.isNaN(actual)) continue;
      const p = predict(t, h, lags);
      if (p === null) continue;
      errors.push({ t, e: actual - p });
      same.push(actual);
      byTrend.push(actual - trend(t, h));
    }
    if (errors.length < MIN_TESTED) continue;
    const maeM = meanAbs(errors.map((x) => x.e));
    const sameMaeM = meanAbs(same);
    if (maeM > sameMaeM * MIN_GAIN || maeM > meanAbs(byTrend)) continue;

    // ¿El rango hubiera servido? Cada estimación pasada, con el rango de los errores conocidos hasta entonces.
    for (const { t, e } of errors) {
      const known = errors.filter((x) => x.t + h <= t).map((x) => x.e);
      if (known.length < MIN_BAND_SAMPLE) continue;
      const b = band(known);
      checked++;
      if (e >= b.lo && e <= b.hi) inside++;
    }

    const b = band(errors.map((x) => x.e));
    const midM = V[T]! + now;
    days.push({
      day: base + ahead,
      ahead,
      midM,
      loM: midM + b.lo,
      hiM: midM + b.hi,
      maeM,
      recentMaeM: meanAbs(errors.slice(-RECENT).map((x) => x.e)),
      sameMaeM,
      tested: errors.length,
    });
  }
  if (days.length === 0) return null;
  return { baseDay: base, days, coverage: checked >= MIN_BAND_SAMPLE ? inside / checked : null, used };
}
