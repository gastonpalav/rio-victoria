import {
  type Db, finishRun, getStations, parseCurrentTable, parseHistory, startRun, upsertReadings, upsertStations,
} from "@rio/core";
import { type Fetcher, PREFECTURA_BASE, historyUrl } from "./fetch";

export type RunResult = { ok: boolean; inserted: number; skipped: number };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Lee la tabla principal y guarda estaciones + última y anterior lectura. Todo o nada. */
export async function runScrape(db: Db, fetcher: Fetcher): Promise<RunResult> {
  const runId = await startRun(db, "scrape");
  try {
    const { rows, skipped } = parseCurrentTable(await fetcher(PREFECTURA_BASE));
    let inserted = 0;
    await db.transaction(async (tx) => {
      const t = tx as unknown as Db;
      await upsertStations(t, rows);
      for (const r of rows) {
        const points = [{ ts: r.ts, heightM: r.heightM }];
        if (r.prevTs && r.prevHeightM !== null) points.push({ ts: r.prevTs, heightM: r.prevHeightM });
        inserted += await upsertReadings(t, r.prefecturaId, points, "tabla");
      }
    });
    for (const s of skipped) console.warn(`[scrape] salteado ${s.name}: ${s.reason}`);
    const result = { ok: true, inserted, skipped: skipped.length };
    await finishRun(db, runId, result);
    return result;
  } catch (e) {
    await finishRun(db, runId, { ok: false, inserted: 0, skipped: 0, error: errMsg(e) });
    throw e;
  }
}

export type BackfillOptions = { days: number; stationIds?: number[]; pauseMs?: number };

/** Trae el historial por estación (para la carga inicial o para rellenar huecos). Sigue aunque falle alguna. */
export async function runBackfill(db: Db, fetcher: Fetcher, opts: BackfillOptions): Promise<RunResult> {
  const kind = opts.days >= 30 ? "backfill" : "gapfill";
  const runId = await startRun(db, kind);
  const pauseMs = opts.pauseMs ?? 1000;
  const targets = (await getStations(db)).filter((s) => !opts.stationIds || opts.stationIds.includes(s.id));
  let inserted = 0;
  const failures: string[] = [];

  for (const [i, s] of targets.entries()) {
    try {
      const points = parseHistory(await fetcher(historyUrl(s.id, opts.days)));
      inserted += await upsertReadings(db, s.id, points, "historial");
    } catch (e) {
      failures.push(`${s.name}: ${errMsg(e)}`);
      console.error(`[${kind}] falló ${s.name}: ${errMsg(e)}`);
    }
    if (pauseMs > 0 && i < targets.length - 1) await new Promise((r) => setTimeout(r, pauseMs));
  }
  const result = { ok: failures.length === 0, inserted, skipped: failures.length };
  await finishRun(db, runId, { ...result, error: failures.length ? failures.join("; ") : undefined });
  return result;
}
