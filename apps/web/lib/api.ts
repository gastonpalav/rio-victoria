import {
  type Db, type StationWithLatest, displayName, getSeries, getStationBySlug, getStations, levelOf, staleness, trendOf,
} from "@rio/core";

export type StationDto = {
  slug: string;
  name: string;
  river: string;
  riverOrder: number;
  heightM: number | null;
  prevHeightM: number | null;
  ts: string | null;
  trend: ReturnType<typeof trendOf> | null;
  level: ReturnType<typeof levelOf> | null;
  alertM: number | null;
  evacuationM: number | null;
  periodHours: number | null;
  stale: boolean;
};

export function toDto(s: StationWithLatest, now: Date): StationDto {
  const l = s.latest;
  return {
    slug: s.slug,
    name: displayName(s.name),
    river: s.river,
    riverOrder: s.riverOrder,
    heightM: l?.heightM ?? null,
    prevHeightM: s.previous?.heightM ?? null,
    ts: l ? l.ts.toISOString() : null,
    trend: l ? trendOf(l.heightM, s.previous?.heightM ?? null) : null,
    level: l ? levelOf(l.heightM, s.alertM, s.evacuationM) : null,
    alertM: s.alertM,
    evacuationM: s.evacuationM,
    periodHours: s.periodHours,
    stale: l ? staleness(l.ts, s.periodHours, now).stale : true,
  };
}

export async function buildStationsPayload(db: Db, now: Date) {
  const stations = (await getStations(db)).map((s) => toDto(s, now));
  const updatedAt = stations.reduce<string | null>((m, s) => (s.ts && (!m || s.ts > m) ? s.ts : m), null);
  return { updatedAt, source: "https://contenidosweb.prefecturanaval.gob.ar/alturas/", stations };
}

const DAY = 86_400_000;
const MAX_RANGE = 3 * 366 * DAY;

function parseDate(s: string | null): Date | null | "invalid" {
  if (s === null || s === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

export type ReadingsResult =
  | { status: 200; body: { station: StationDto; from: string; to: string; readings: { ts: string; heightM: number }[] } }
  | { status: 400 | 404; body: { error: string } };

export async function buildReadingsPayload(
  db: Db, slug: string, fromRaw: string | null, toRaw: string | null, now: Date,
): Promise<ReadingsResult> {
  const from = parseDate(fromRaw);
  const to = parseDate(toRaw);
  if (from === "invalid" || to === "invalid") return { status: 400, body: { error: "Fecha inválida: usá ISO 8601, p. ej. 2026-11-01" } };
  const end = to ?? now;
  const start = from ?? new Date(end.getTime() - 7 * DAY);
  if (start > end) return { status: 400, body: { error: "'from' es posterior a 'to'" } };
  if (end.getTime() - start.getTime() > MAX_RANGE) return { status: 400, body: { error: "El rango máximo es de 3 años" } };

  const station = await getStationBySlug(db, slug);
  if (!station || station.hidden) return { status: 404, body: { error: `No existe el puerto '${slug}'` } };
  const all = await getStations(db);
  const withLatest = all.find((s) => s.id === station.id)!;
  const readings = await getSeries(db, station.id, start, end);
  return {
    status: 200,
    body: {
      station: toDto(withLatest, now),
      from: start.toISOString(),
      to: end.toISOString(),
      readings: readings.map((r) => ({ ts: r.ts.toISOString(), heightM: r.heightM })),
    },
  };
}
