import {
  type Db,
  type StationWithLatest,
  dayOf,
  daysAbove,
  getDailyStats,
  isHidden,
  sameDayLastYear,
  travelDays,
} from "@rio/core";

export type Travel = { minDays: number; maxDays: number };
export type Extras = {
  /** slug del puerto de arriba → cuántos días tarda en notarse acá (solo si la relación es clara). */
  travel: Record<string, Travel>;
  /** Puertos de arriba a mostrar, del más cercano al más lejano. */
  upstreamSlugs: string[];
  daysAboveAlert: number | null;
  lastYearM: number | null;
};

const DAY = 86_400_000;
const NEAREST = 3;
const CANDIDATES = 8;

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
  const lastYear = mine.filter((d) => d.day > today - 365);
  return {
    travel,
    upstreamSlugs,
    daysAboveAlert: here.alertM === null || lastYear.length === 0 ? null : daysAbove(lastYear, here.alertM),
    lastYearM: sameDayLastYear(mine, today),
  };
}
