import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Db } from "./client";
import { readings, scrapeRuns, stations } from "./schema";
import type { CurrentRow } from "../parse-current";
import { slugify } from "../slug";
import { isHidden } from "../stations";
import type { Daily } from "../river-stats";

export type Station = typeof stations.$inferSelect;
export type Point = { ts: Date; heightM: number };
export type StationWithLatest = Station & { latest: Point | null; previous: Point | null };
export type ReadingSource = "tabla" | "historial";

export async function upsertStations(db: Db, rows: CurrentRow[]): Promise<void> {
  const values = rows.map((r) => {
    return {
      id: r.prefecturaId,
      slug: slugify(r.name),
      name: r.name,
      river: r.river,
      riverOrder: r.riverOrder,
      alertM: r.alertM,
      evacuationM: r.evacuationM,
      periodHours: r.periodHours,
      hidden: isHidden(r.name),
      updatedAt: new Date(),
    };
  });
  if (values.length === 0) return;
  await db
    .insert(stations)
    .values(values)
    .onConflictDoUpdate({
      target: stations.id,
      set: {
        slug: sql`excluded.slug`,
        name: sql`excluded.name`,
        river: sql`excluded.river`,
        riverOrder: sql`excluded.river_order`,
        alertM: sql`excluded.alert_m`,
        evacuationM: sql`excluded.evacuation_m`,
        periodHours: sql`excluded.period_hours`,
        hidden: sql`excluded.hidden`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

const CHUNK = 500;

/**
 * Inserta o actualiza lecturas. Devuelve cuántas filas eran nuevas.
 * La tabla principal siempre gana: el historial solo actualiza filas que también vinieron del historial.
 */
export async function upsertReadings(db: Db, stationId: number, points: Point[], source: ReadingSource): Promise<number> {
  // Postgres no acepta tocar la misma fila dos veces en un mismo INSERT ... ON CONFLICT: dedupe por hora (gana el último).
  const unique = [...new Map(points.map((p) => [p.ts.getTime(), p])).values()];
  let inserted = 0;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const setWhere =
      source === "tabla"
        ? sql`${readings.heightM} <> excluded.height_m or ${readings.source} <> 'tabla'`
        : sql`${readings.source} = 'historial' and ${readings.heightM} <> excluded.height_m`;
    const res = await db
      .insert(readings)
      .values(chunk.map((p) => ({ stationId, ts: p.ts, heightM: p.heightM, source, scrapedAt: new Date() })))
      .onConflictDoUpdate({
        target: [readings.stationId, readings.ts],
        set: { heightM: sql`excluded.height_m`, source: sql`excluded.source`, scrapedAt: sql`excluded.scraped_at` },
        setWhere,
      })
      .returning({ isNew: sql<boolean>`(xmax = 0)` });
    inserted += res.filter((r) => r.isNew).length;
  }
  return inserted;
}

export async function getStationBySlug(db: Db, slug: string): Promise<Station | null> {
  const [s] = await db.select().from(stations).where(eq(stations.slug, slug)).limit(1);
  return s ?? null;
}

export async function getStations(db: Db): Promise<StationWithLatest[]> {
  const all = await db
    .select()
    .from(stations)
    .where(eq(stations.hidden, false))
    .orderBy(asc(stations.river), asc(stations.riverOrder));

  const ranked = db
    .select({
      stationId: readings.stationId,
      ts: readings.ts,
      heightM: readings.heightM,
      rn: sql<number>`row_number() over (partition by ${readings.stationId} order by ${readings.ts} desc)`.as("rn"),
    })
    .from(readings)
    .as("ranked");
  const last2 = await db.select().from(ranked).where(lte(ranked.rn, 2));

  const byStation = new Map<number, Point[]>();
  for (const r of last2) {
    const list = byStation.get(r.stationId) ?? [];
    list[Number(r.rn) - 1] = { ts: new Date(r.ts), heightM: r.heightM };
    byStation.set(r.stationId, list);
  }
  return all.map((s) => {
    const l = byStation.get(s.id) ?? [];
    return { ...s, latest: l[0] ?? null, previous: l[1] ?? null };
  });
}

export async function getSeries(db: Db, stationId: number, from: Date, to: Date): Promise<Point[]> {
  const rows = await db
    .select({ ts: readings.ts, heightM: readings.heightM })
    .from(readings)
    .where(and(eq(readings.stationId, stationId), gte(readings.ts, from), lte(readings.ts, to)))
    .orderBy(asc(readings.ts));
  return rows.map((r) => ({ ts: new Date(r.ts), heightM: r.heightM }));
}

export async function startRun(db: Db, kind: string): Promise<number> {
  const [r] = await db.insert(scrapeRuns).values({ kind }).returning({ id: scrapeRuns.id });
  return r!.id;
}

export async function finishRun(
  db: Db,
  id: number,
  result: { ok: boolean; inserted: number; skipped: number; error?: string },
): Promise<void> {
  await db
    .update(scrapeRuns)
    .set({ ...result, error: result.error ?? null, finishedAt: new Date() })
    .where(eq(scrapeRuns.id, id));
}

export type ScrapeRun = typeof scrapeRuns.$inferSelect;

export async function getLastRuns(db: Db, n: number): Promise<ScrapeRun[]> {
  return db.select().from(scrapeRuns).orderBy(desc(scrapeRuns.id)).limit(n);
}

/** La lectura más alta de una estación desde `since` (la más reciente si hay empate). */
export async function getMaxSince(db: Db, stationId: number, since: Date): Promise<Point | null> {
  const [r] = await db
    .select({ ts: readings.ts, heightM: readings.heightM })
    .from(readings)
    .where(and(eq(readings.stationId, stationId), gte(readings.ts, since)))
    .orderBy(desc(readings.heightM), desc(readings.ts))
    .limit(1);
  return r ? { ts: new Date(r.ts), heightM: r.heightM } : null;
}

/**
 * Como `getDailyStats`, pero en tramos de 24 h que terminan en `endsAt`: el tramo 0 son las últimas 24 h
 * (incluida la lectura de `endsAt`), −1 las 24 anteriores, y así. Lo posterior a `endsAt` queda en tramos positivos.
 */
export async function getWindowStats(db: Db, stationIds: number[], since: Date, endsAt: Date): Promise<Map<number, Daily[]>> {
  const out = new Map<number, Daily[]>();
  if (stationIds.length === 0) return out;
  const end = sql.raw(String(Math.floor(endsAt.getTime() / 1000))); // un entero nuestro: va en la consulta para poder agrupar por la expresión
  const day = sql<number>`ceil((extract(epoch from ${readings.ts}) - ${end}) / 86400.0)::int`;
  const rows = await db
    .select({ stationId: readings.stationId, day, meanM: sql<number>`avg(${readings.heightM})::float8`, maxM: sql<number>`max(${readings.heightM})` })
    .from(readings)
    .where(and(inArray(readings.stationId, stationIds), gte(readings.ts, since)))
    .groupBy(readings.stationId, day)
    .orderBy(readings.stationId, day);
  for (const r of rows) {
    const list = out.get(r.stationId) ?? [];
    list.push({ day: Number(r.day), meanM: Number(r.meanM), maxM: Number(r.maxM) });
    out.set(r.stationId, list);
  }
  return out;
}

/** Promedio y máximo por día argentino (UTC−3) de varias estaciones desde `since`, ordenados por día. */
export async function getDailyStats(db: Db, stationIds: number[], since: Date): Promise<Map<number, Daily[]>> {
  const out = new Map<number, Daily[]>();
  if (stationIds.length === 0) return out;
  const day = sql<number>`floor((extract(epoch from ${readings.ts}) - 10800) / 86400)::int`;
  const rows = await db
    .select({ stationId: readings.stationId, day, meanM: sql<number>`avg(${readings.heightM})::float8`, maxM: sql<number>`max(${readings.heightM})` })
    .from(readings)
    .where(and(inArray(readings.stationId, stationIds), gte(readings.ts, since)))
    .groupBy(readings.stationId, day)
    .orderBy(readings.stationId, day);
  for (const r of rows) {
    const list = out.get(r.stationId) ?? [];
    list.push({ day: Number(r.day), meanM: Number(r.meanM), maxM: Number(r.maxM) });
    out.set(r.stationId, list);
  }
  return out;
}
