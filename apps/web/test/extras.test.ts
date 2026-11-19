import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { type Db, getStations, upsertReadings } from "@rio/core";
import { createTestDb } from "@rio/core/testing";
import { runScrape } from "@rio/scraper/jobs";
import { buildExtras } from "@/lib/extras";

const mainHtml = readFileSync(new URL("../../../packages/core/test/fixtures/main.html", import.meta.url), "utf8");
const NOW = new Date("2026-11-18T19:40:00Z");
const DAY = 86_400_000;
let db: Db;
let victoria: number[] = [];

/** Una creciente que sube y baja, con ruido determinístico. */
function wave(n: number): number[] {
  let x = 11;
  const out = [3];
  for (let i = 1; i < n; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(out[i - 1]! + (x / 2147483648 - 0.5) * 0.08 + Math.sin(i / 20) * 0.02);
  }
  return out;
}

beforeAll(async () => {
  db = await createTestDb();
  await runScrape(db, async () => mainHtml);
  const up = wave(370);
  const start = NOW.getTime() - 369 * DAY;
  // Paraná (230) va 4 días adelante de Victoria (260).
  await upsertReadings(db, 230, up.map((h, i) => ({ ts: new Date(start + i * DAY), heightM: h + 0.5 })), "historial");
  victoria = up.map((_, i) => up[Math.max(0, i - 4)]! + 1.2);
  await upsertReadings(db, 260, victoria.map((h, i) => ({ ts: new Date(start + i * DAY), heightM: h })), "historial");
});

describe("buildExtras", () => {
  it("calcula cuánto tarda en notarse acá lo de un puerto de arriba", async () => {
    const all = await getStations(db);
    const e = await buildExtras(db, all.find((s) => s.slug === "victoria")!, all, NOW);
    const t = e.travel["parana"];
    expect(t).toBeDefined();
    expect(t!.minDays).toBeLessThanOrEqual(4);
    expect(t!.maxDays).toBeGreaterThanOrEqual(4);
  });

  it("muestra siempre los tres puertos de arriba más cercanos, del más cercano al más lejano", async () => {
    const all = await getStations(db);
    const e = await buildExtras(db, all.find((s) => s.slug === "victoria")!, all, NOW);
    expect(e.upstreamSlugs.slice(0, 3)).toEqual(["diamante", "santa-fe", "parana"]);
  });

  it("cuenta los días sobre la alerta en el último año y lo que marcaba hace un año", async () => {
    const all = await getStations(db);
    const e = await buildExtras(db, all.find((s) => s.slug === "victoria")!, all, NOW);
    // días del último año (sin contar hoy) en que la serie llegó a 4,60; hoy la tabla marca 4,85
    const expected = victoria.slice(-365, -1).filter((h) => h >= 4.6).length + 1;
    expect(expected).toBeGreaterThan(1);
    expect(e.daysAboveAlert).toBe(expected);
    expect(e.lastYearM).not.toBeNull();
  });

  it("un puerto sin nada arriba no tiene tiempos de llegada", async () => {
    const all = await getStations(db);
    const first = all.filter((s) => s.river === "PARANA").sort((a, b) => a.riverOrder - b.riverOrder)[0]!;
    const e = await buildExtras(db, first, all, NOW);
    expect(e.travel).toEqual({});
    expect(e.upstreamSlugs).toEqual([]);
  });
});
