import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../src/testing";
import {
  upsertStations, upsertReadings, getStationBySlug, getStations, getSeries, startRun, finishRun, getLastRuns,
} from "../src/db/repo";
import type { Db } from "../src/db/client";
import { currentRows } from "./helpers/rows";

const T = new Date("2026-11-18T19:00:00Z");
const T0 = new Date("2026-11-01T00:00:00Z");
const T1 = new Date("2026-12-01T00:00:00Z");

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  await upsertStations(db, currentRows);
});

describe("repo", () => {
  it("guarda estaciones con slug", async () => {
    const v = await getStationBySlug(db, "victoria");
    expect(v).toMatchObject({ id: 260, name: "VICTORIA", river: "PARANA", alertM: 4.6, evacuationM: 4.9, periodHours: 2 });
  });

  it("river_order sigue el orden de la página dentro del río", async () => {
    const parana = (await getStationBySlug(db, "parana"))!;
    const victoria = (await getStationBySlug(db, "victoria"))!;
    expect(parana.riverOrder).toBeLessThan(victoria.riverOrder);
  });

  it("upsert de lecturas es idempotente", async () => {
    expect(await upsertReadings(db, 260, [{ ts: T, heightM: 4.85 }], "tabla")).toBe(1);
    expect(await upsertReadings(db, 260, [{ ts: T, heightM: 4.85 }], "tabla")).toBe(0);
  });

  it("el historial no pisa un valor de la tabla", async () => {
    await upsertReadings(db, 260, [{ ts: T, heightM: 4.85 }], "tabla");
    await upsertReadings(db, 260, [{ ts: T, heightM: 4.7 }], "historial");
    expect((await getSeries(db, 260, T0, T1))[0]!.heightM).toBeCloseTo(4.85);
  });

  it("la tabla sí corrige un valor del historial", async () => {
    await upsertReadings(db, 260, [{ ts: T, heightM: 4.7 }], "historial");
    await upsertReadings(db, 260, [{ ts: T, heightM: 4.85 }], "tabla");
    expect((await getSeries(db, 260, T0, T1))[0]!.heightM).toBeCloseTo(4.85);
  });

  it("getSeries devuelve orden ascendente dentro del rango", async () => {
    await upsertReadings(db, 260, [
      { ts: new Date("2026-11-18T19:00:00Z"), heightM: 4.85 },
      { ts: new Date("2026-11-18T17:00:00Z"), heightM: 4.84 },
      { ts: new Date("2026-10-01T00:00:00Z"), heightM: 4.0 },
    ], "tabla");
    expect((await getSeries(db, 260, T0, T1)).map((p) => p.heightM)).toEqual([4.84, 4.85]);
  });

  it("getStations trae última y anterior lectura, sin los ocultos", async () => {
    await upsertReadings(db, 260, [
      { ts: new Date("2026-11-18T19:00:00Z"), heightM: 4.85 },
      { ts: new Date("2026-11-18T17:00:00Z"), heightM: 4.84 },
      { ts: new Date("2026-11-18T15:00:00Z"), heightM: 4.8 },
    ], "tabla");
    const all = await getStations(db);
    const v = all.find((s) => s.slug === "victoria")!;
    expect(v.latest).toEqual({ ts: new Date("2026-11-18T19:00:00Z"), heightM: 4.85 });
    expect(v.previous).toEqual({ ts: new Date("2026-11-18T17:00:00Z"), heightM: 4.84 });
    expect(all.some((s) => s.slug === "represa-itaipu-brasil")).toBe(false);
    expect(all.find((s) => s.slug === "rosario")!.latest).toBeNull();
  });

  it("registra corridas del scraper", async () => {
    const id = await startRun(db, "scrape");
    await finishRun(db, id, { ok: false, inserted: 0, skipped: 2, error: "timeout" });
    expect((await getLastRuns(db, 1))[0]).toMatchObject({ kind: "scrape", ok: false, error: "timeout", skipped: 2 });
  });
});
