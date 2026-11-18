import { cacheLife, cacheTag } from "next/cache";
import { type Db, createDb, upstreamOf } from "@rio/core";
import { buildReadingsPayload, buildStationsPayload } from "./api";

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
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  cacheTag(READINGS_TAG);
  return buildStationsPayload(getDb(), new Date());
}

export async function getReadingsData(slug: string, from: string | null, to: string | null, nowIso: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  cacheTag(READINGS_TAG, `readings-${slug}`);
  return buildReadingsPayload(getDb(), slug, from, to, new Date(nowIso));
}

/** Todo lo que necesita la página de un puerto, en una sola entrada de caché. null si no existe. */
export async function getStationPage(slug: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  cacheTag(READINGS_TAG, `readings-${slug}`);
  const now = new Date();
  const { stations } = await buildStationsPayload(getDb(), now);
  const station = stations.find((s) => s.slug === slug);
  if (!station) return null;
  const upstream = upstreamOf(
    { ...station, hidden: false },
    stations.map((s) => ({ ...s, hidden: false })),
  );
  const to = now.toISOString();
  const from = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const r = await buildReadingsPayload(getDb(), slug, from, to, now);
  return {
    station,
    upstream,
    options: stations.map((s) => ({ slug: s.slug, name: s.name, river: s.river })),
    series: r.status === 200 ? r.body.readings : [],
    from,
    to,
  };
}

/** "Ahora" redondeado a 5 minutos, para que la caché se comparta entre pedidos. */
export function roundedNowIso(): string {
  const step = 5 * 60_000;
  return new Date(Math.floor(Date.now() / step) * step).toISOString();
}
