import { cacheLife, cacheTag } from "next/cache";
import { type Db, createDb, getMaxSince, getStations } from "@rio/core";
import { buildReadingsPayload, buildStationsPayload, toDto } from "./api";
import { buildExtras } from "./extras";
import { fetchInaRun, fetchInaStations, inaFor } from "./ina";
import { fetchWind } from "./wind";

export const READINGS_TAG = "readings";

let db: Db | undefined;
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  return (db ??= createDb(url, { max: 3 }));
}

/** Estaciones con su última lectura. Caché de 5 min; la ruta de scrape la invalida al guardar. */
export async function getStationsData() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(READINGS_TAG);
  return buildStationsPayload(getDb(), new Date());
}

export async function getReadingsData(slug: string, from: string | null, to: string | null, nowIso: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(READINGS_TAG, `readings-${slug}`);
  return buildReadingsPayload(getDb(), slug, from, to, new Date(nowIso));
}

/** Todo lo que necesita la página de un puerto, en una sola entrada de caché. null si no existe. */
export async function getStationPage(slug: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag(READINGS_TAG, `readings-${slug}`);
  const now = new Date();
  const raw = await getStations(getDb());
  const stations = raw.map((s) => toDto(s, now));
  const station = stations.find((s) => s.slug === slug);
  const here = raw.find((s) => s.slug === slug);
  if (!station || !here) return null;
  const to = now.toISOString();
  const from = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [r, max, extras] = await Promise.all([
    buildReadingsPayload(getDb(), slug, from, to, now),
    getMaxSince(getDb(), here.id, new Date(now.getTime() - 365 * 86_400_000)),
    buildExtras(getDb(), here, raw, now),
  ]);
  const upstream = extras.upstreamSlugs.flatMap((u) => stations.filter((s) => s.slug === u));
  return {
    prefectureId: here.id,
    yearMax: max ? { ts: max.ts.toISOString(), heightM: max.heightM } : null,
    station,
    upstream,
    travel: extras.travel,
    daysAboveAlert: extras.daysAboveAlert,
    lastYearM: extras.lastYearM,
    forecast: extras.forecast,
    options: stations.map((s) => ({ slug: s.slug, name: s.name, river: s.river })),
    series: r.status === 200 ? r.body.readings : [],
    from,
    to,
  };
}

/** Viento del puerto, de Open-Meteo. Caché de 30 min; si falla, no se muestra. */
export async function getWind(slug: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 7200 });
  return fetchWind(slug);
}

/** Si el INA falla, se vuelve a probar en 5 min y no en horas: un error no tiene que esconder la sección. */
const INA_RETRY = { stale: 60, revalidate: 300, expire: 600 } as const;

/** Qué puertos de Prefectura conoce el INA. Una entrada de caché para todos; cambia casi nunca. */
export async function getInaStations() {
  "use cache";
  const map = await fetchInaStations();
  cacheLife(map ? { stale: 3600, revalidate: 86_400, expire: 172_800 } : INA_RETRY);
  return map;
}

/**
 * El pronóstico del INA para un puerto (por id de Prefectura), ya recortado a lo que se muestra.
 * Caché de 1 h: el INA corre su modelo una o dos veces por semana. Es un solo pedido por puerto (la lista de
 * puertos está en su propia caché), con timeout de 4 s; si falla, no se muestra y se reintenta en 5 min.
 */
export async function getInaForecast(prefectureId: number) {
  "use cache";
  const stations = await getInaStations();
  const inaId = stations?.[prefectureId];
  if (stations && inaId === undefined) {
    cacheLife("hours"); // el INA no cubre este puerto
    return null;
  }
  const run = inaId === undefined ? null : await fetchInaRun(inaId);
  cacheLife(run ? { stale: 300, revalidate: 3600, expire: 7200 } : INA_RETRY);
  return inaFor(run, new Date());
}

/** "Ahora" redondeado a 5 minutos, para que la caché se comparta entre pedidos. */
export function roundedNowIso(): string {
  const step = 5 * 60_000;
  return new Date(Math.floor(Date.now() / step) * step).toISOString();
}

