import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../src/testing";
import {
  upsertStations, upsertReadings, getStationBySlug, getStations, getSeries, startRun, finishRun, getLastRuns, getMaxSince, getDailyStats, getWindowStats,
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

describe("repo: lecturas duplicadas", () => {
  it("dos puntos con la misma hora en un mismo insert no rompen el upsert", async () => {
    const n = await upsertReadings(db, 260, [{ ts: T, heightM: 4.84 }, { ts: T, heightM: 4.85 }], "tabla");
    expect(n).toBe(1);
    expect((await getSeries(db, 260, T0, T1))[0]!.heightM).toBeCloseTo(4.85);
  });
});

describe("repo: máximo en un período", () => {
  it("devuelve la lectura más alta desde una fecha, o null si no hay", async () => {
    await upsertReadings(db, 260, [
      { ts: new Date("2026-03-01T12:00:00Z"), heightM: 3.1 },
      { ts: new Date("2026-11-18T17:00:00Z"), heightM: 4.84 },
      { ts: new Date("2026-11-18T19:00:00Z"), heightM: 4.85 },
      { ts: new Date("2025-06-01T12:00:00Z"), heightM: 5.5 },
    ], "tabla");
    expect(await getMaxSince(db, 260, new Date("2025-11-18T00:00:00Z"))).toEqual({ ts: new Date("2026-11-18T19:00:00Z"), heightM: 4.85 });
    expect(await getMaxSince(db, 280, new Date("2025-11-18T00:00:00Z"))).toBeNull();
  });

  it("getDailyStats agrupa por día argentino, con promedio y máximo, por estación", async () => {
    await upsertReadings(db, 260, [
      { ts: new Date("2026-11-17T12:00:00Z"), heightM: 4.0 },
      { ts: new Date("2026-11-18T02:00:00Z"), heightM: 4.2 }, // 23 h del 17 en Argentina
      { ts: new Date("2026-11-18T12:00:00Z"), heightM: 4.5 },
    ], "tabla");
    await upsertReadings(db, 230, [{ ts: new Date("2026-11-18T12:00:00Z"), heightM: 5.0 }], "tabla");
    const m = await getDailyStats(db, [260, 230], new Date("2026-11-01T00:00:00Z"));
    const v = m.get(260)!;
    expect(v).toHaveLength(2);
    expect(v[0]!.meanM).toBeCloseTo(4.1, 5);
    expect(v[0]!.maxM).toBe(4.2);
    expect(v[1]!.day).toBe(v[0]!.day + 1);
    expect(m.get(230)).toHaveLength(1);
  });

  it("getWindowStats agrupa en tramos de 24 h que terminan en la última lectura", async () => {
    await upsertReadings(db, 270, [
      { ts: new Date("2026-11-16T12:00:00Z"), heightM: 3.0 }, // exactamente 48 h antes: cierra el tramo −1
      { ts: new Date("2026-11-17T12:00:00Z"), heightM: 4.0 }, // exactamente 24 h antes: cierra el tramo −1
      { ts: new Date("2026-11-17T12:00:01Z"), heightM: 4.2 },
      { ts: new Date("2026-11-18T12:00:00Z"), heightM: 4.6 }, // la última: cierra el tramo 0
      { ts: new Date("2026-11-18T15:00:00Z"), heightM: 9.9 }, // posterior: tramo 1
    ], "tabla");
    const m = await getWindowStats(db, [270], new Date("2026-11-01T00:00:00Z"), new Date("2026-11-18T12:00:00Z"));
    const byDay = new Map(m.get(270)!.map((d) => [d.day, d]));
    expect([...byDay.keys()]).toEqual([-2, -1, 0, 1]);
    expect(byDay.get(-2)!.meanM).toBeCloseTo(3.0, 5);
    expect(byDay.get(-1)!.meanM).toBeCloseTo(4.0, 5);
    expect(byDay.get(0)!.meanM).toBeCloseTo(4.4, 5);
    expect(byDay.get(0)!.maxM).toBeCloseTo(4.6, 5);
  });
});
