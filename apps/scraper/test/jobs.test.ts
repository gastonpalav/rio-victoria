import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getLastRuns, getSeries, getStationBySlug, getStations } from "@rio/core";
import { createTestDb } from "@rio/core/testing";
import { runScrape, runBackfill } from "../src/jobs";

const fx = (f: string) => readFileSync(new URL(`../../../packages/core/test/fixtures/${f}`, import.meta.url), "utf8");
const mainHtml = fx("main.html");
const histHtml = fx("hist-260.html");
const T0 = new Date("2025-01-01T00:00:00Z");
const T1 = new Date("2027-01-01T00:00:00Z");

describe("runScrape", () => {
  it("guarda estaciones y la última lectura", async () => {
    const db = await createTestDb();
    const r = await runScrape(db, async () => mainHtml);
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(2);
    const v = (await getStations(db)).find((s) => s.slug === "victoria")!;
    expect(v.latest).toEqual({ ts: new Date("2026-11-18T19:00:00Z"), heightM: 4.85 });
    expect(v.previous).toEqual({ ts: new Date("2026-11-18T17:00:00Z"), heightM: 4.84 });
    expect((await getLastRuns(db, 1))[0]).toMatchObject({ kind: "scrape", ok: true });
  });

  it("si Prefectura no responde, registra el error y no escribe nada", async () => {
    const db = await createTestDb();
    await expect(runScrape(db, async () => { throw new Error("timeout"); })).rejects.toThrow("timeout");
    expect((await getLastRuns(db, 1))[0]).toMatchObject({ ok: false, error: expect.stringContaining("timeout") });
    expect(await getStationBySlug(db, "victoria")).toBeNull();
  });

  it("si la página cambió, falla sin guardar basura", async () => {
    const db = await createTestDb();
    await expect(runScrape(db, async () => "<html>Mantenimiento</html>")).rejects.toThrow();
    expect((await getLastRuns(db, 1))[0]!.ok).toBe(false);
    expect(await getSeries(db, 260, T0, T1)).toEqual([]);
  });
});

describe("runBackfill", () => {
  it("carga el año de historial sin pisar la tabla", async () => {
    const db = await createTestDb();
    await runScrape(db, async () => mainHtml);
    const urls: string[] = [];
    const r = await runBackfill(db, async (u) => (urls.push(u), histHtml), { days: 365, stationIds: [260], pauseMs: 0 });
    expect(r.ok).toBe(true);
    expect(urls).toEqual(["https://contenidosweb.prefecturanaval.gob.ar/alturas/?page=historico&tiempo=365&id=260"]);
    const series = await getSeries(db, 260, T0, T1);
    expect(series.length).toBeGreaterThanOrEqual(716); // 715 del historial + 16:00 de la tabla
    expect(series.at(-1)).toEqual({ ts: new Date("2026-11-18T19:00:00Z"), heightM: 4.85 });
  });

  it("si falla una estación sigue con las demás y marca el run como no ok", async () => {
    const db = await createTestDb();
    await runScrape(db, async () => mainHtml);
    const r = await runBackfill(
      db,
      async (u) => { if (u.endsWith("id=230")) throw new Error("503"); return histHtml; },
      { days: 7, stationIds: [230, 260], pauseMs: 0 },
    );
    expect(r.ok).toBe(false);
    expect((await getSeries(db, 260, T0, T1)).length).toBeGreaterThan(700);
  });
});
