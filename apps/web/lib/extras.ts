import {
  type Db,
  type StationWithLatest,
  dayOf,
  daysAbove,
  displayName,
  forecast,
  getDailyStats,
  getWindowStats,
  isHidden,
  sameDayLastYear,
  staleness,
  travelDays,
} from "@rio/core";

export type Travel = { minDays: number; maxDays: number };
/** Un día estimado, listo para mostrar: siempre un rango. */
export type ForecastDayView = {
  date: string;
  ahead: number;
  loM: number;
  hiM: number;
  /** Error medio de toda la prueba, y el de sus últimas semanas. */
  maeM: number;
  recentMaeM: number;
};
export type ForecastView = {
  days: ForecastDayView[];
  /** Fracción de las veces que el río quedó dentro del rango en la prueba. */
  coverage: number | null;
  /** Cuántas estimaciones pasadas se compararon con lo que después pasó. */
  tested: number;
  /** Nombres de los puertos de arriba que se usaron. */
  from: string[];
};
export type Extras = {
  /** slug del puerto de arriba → cuántos días tarda en notarse acá (solo si la relación es clara). */
  travel: Record<string, Travel>;
  /** Puertos de arriba a mostrar, del más cercano al más lejano. */
  upstreamSlugs: string[];
  daysAboveAlert: number | null;
  lastYearM: number | null;
  /** Cómo puede estar en unos días; null si no hay con qué estimarlo o el método no pasa su propia prueba. */
  forecast: ForecastView | null;
};

const DAY = 86_400_000;
const NEAREST = 3;
const CANDIDATES = 8;
const AHEADS = [1, 3, 5]; // a cuántos días de hoy se estima
const dateOf = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);

/**
 * Lo que sale del último año de lecturas: cuándo llega el agua de arriba, cuántos días estuvo en alerta,
 * y cómo estaba el río hace un año.
 */
export async function buildExtras(db: Db, here: StationWithLatest, all: StationWithLatest[], now: Date): Promise<Extras> {
  const candidates = all
    .filter((s) => s.river === here.river && s.riverOrder < here.riverOrder && !isHidden(s.name))
    .sort((a, b) => b.riverOrder - a.riverOrder)
    .slice(0, CANDIDATES);
  const daily = await getDailyStats(db, [here.id, ...candidates.map((c) => c.id)], new Date(now.getTime() - 366 * DAY));
  const mine = daily.get(here.id) ?? [];

  const travel: Record<string, Travel> = {};
  for (const c of candidates) {
    const t = travelDays(daily.get(c.id) ?? [], mine);
    if (t) travel[c.slug] = { minDays: t.minDays, maxDays: t.maxDays };
  }

  // Los 3 más cercanos siempre; además, el más lejano del que se sabe cuánto tarda.
  const upstreamSlugs = candidates.slice(0, NEAREST).map((c) => c.slug);
  const far = candidates.slice(NEAREST).reverse().find((c) => travel[c.slug]);
  if (far) upstreamSlugs.push(far.slug);

  const today = dayOf(now);

  // La estimación: con los puertos de arriba cuya relación es clara, y solo si el dato de acá está al día.
  const near = candidates.filter((c) => travel[c.slug]).slice(0, NEAREST);
  const forecastView = await buildForecast(db, here, near, now);

  const lastYear = mine.filter((d) => d.day > today - 365);
  return {
    travel,
    upstreamSlugs,
    daysAboveAlert: here.alertM === null || lastYear.length === 0 ? null : daysAbove(lastYear, here.alertM),
    lastYearM: sameDayLastYear(mine, today),
    forecast: forecastView,
  };
}

/**
 * Qué tramos de 24 h (contados desde el que termina en la última lectura) caen en cada día a estimar.
 * El centro de las últimas 24 h cae hoy si la última lectura es de la tarde, y ayer si es de la mañana:
 * en ese caso el día de mañana queda un tramo más lejos. null si la última lectura es demasiado vieja.
 */
export function forecastTargets(latestTs: Date, now: Date, aheads: number[] = AHEADS): { date: string; ahead: number; horizon: number }[] | null {
  const today = dayOf(now);
  const shift = today - dayOf(new Date(latestTs.getTime() - DAY / 2));
  if (shift < 0 || shift > 1) return null;
  return aheads.map((ahead) => ({ date: dateOf(today + ahead), ahead, horizon: ahead + shift }));
}

/**
 * La estimación parte de las últimas 24 h hasta la última lectura, no del día de calendario: con el río
 * moviéndose rápido, el promedio de ayer ya es viejo. Cada rango es el promedio de 24 h centrado en ese día.
 */
async function buildForecast(db: Db, here: StationWithLatest, near: StationWithLatest[], now: Date): Promise<ForecastView | null> {
  const latest = here.latest;
  if (!latest || near.length === 0 || staleness(latest.ts, here.periodHours, now).stale) return null;
  const targets = forecastTargets(latest.ts, now);
  if (!targets) return null;
  const windows = await getWindowStats(db, [here.id, ...near.map((c) => c.id)], new Date(now.getTime() - 366 * DAY), latest.ts);
  const f = forecast(windows.get(here.id) ?? [], near.map((c) => windows.get(c.id) ?? []), 0, targets.map((t) => t.horizon));
  if (!f) return null;
  return {
    days: f.days.map((d) => {
      const t = targets.find((x) => x.horizon === d.ahead)!;
      return { date: t.date, ahead: t.ahead, loM: d.loM, hiM: d.hiM, maeM: d.maeM, recentMaeM: d.recentMaeM };
    }),
    coverage: f.coverage,
    tested: Math.min(...f.days.map((d) => d.tested)),
    from: f.used.map((i) => displayName(near[i]!.name)),
  };
}
