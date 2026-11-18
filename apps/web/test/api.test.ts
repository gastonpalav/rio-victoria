import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import type { Db } from "@rio/core";
import { createTestDb } from "@rio/core/testing";
import { runScrape } from "@rio/scraper/jobs";
import { buildStationsPayload, buildReadingsPayload } from "@/lib/api";
import { checkSecret } from "@/lib/secret";

const mainHtml = readFileSync(new URL("../../../packages/core/test/fixtures/main.html", import.meta.url), "utf8");
const NOW = new Date("2026-11-18T19:40:00Z");
let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await runScrape(db, async () => mainHtml);
});

describe("GET /api/stations", () => {
  it("incluye Victoria en alerta y creciendo", async () => {
    const p = await buildStationsPayload(db, NOW);
    const v = p.stations.find((s) => s.slug === "victoria")!;
    expect(v).toMatchObject({ name: "Victoria", river: "PARANA", heightM: 4.85, level: "alerta", trend: "crece", alertM: 4.6, evacuationM: 4.9, stale: false, ts: "2026-11-18T19:00:00.000Z" });
  });
  it("no incluye puertos ocultos", async () => {
    const p = await buildStationsPayload(db, NOW);
    expect(p.stations.some((s) => s.slug.includes("brasil"))).toBe(false);
  });
  it("updatedAt es la lectura más nueva, no la hora del scrape", async () => {
    const p = await buildStationsPayload(db, NOW);
    expect(p.updatedAt).toBe("2026-11-18T19:00:00.000Z");
  });
});

describe("GET /api/stations/{slug}/readings", () => {
  it("por defecto devuelve los últimos 7 días", async () => {
    const r = await buildReadingsPayload(db, "victoria", null, null, NOW);
    expect(r.status).toBe(200);
    if (r.status !== 200) return;
    expect(r.body.readings.map((x) => x.heightM)).toEqual([4.84, 4.85]);
    expect(r.body.station.slug).toBe("victoria");
  });
  it("slug inexistente → 404", async () => {
    expect((await buildReadingsPayload(db, "no-existe", null, null, NOW)).status).toBe(404);
  });
  it("puerto oculto → 404", async () => {
    expect((await buildReadingsPayload(db, "represa-itaipu-brasil", null, null, NOW)).status).toBe(404);
  });
  it("fecha inválida → 400", async () => {
    expect((await buildReadingsPayload(db, "victoria", "basura", null, NOW)).status).toBe(400);
  });
  it("rango mayor a 3 años → 400", async () => {
    expect((await buildReadingsPayload(db, "victoria", "2020-01-01", "2026-01-01", NOW)).status).toBe(400);
  });
});

describe("checkSecret", () => {
  it("acepta solo el Bearer correcto", () => {
    expect(checkSecret("Bearer s3cr3t", "s3cr3t")).toBe(true);
    expect(checkSecret("Bearer otra", "s3cr3t")).toBe(false);
    expect(checkSecret(null, "s3cr3t")).toBe(false);
    expect(checkSecret("Bearer ", "")).toBe(false);
  });
});
