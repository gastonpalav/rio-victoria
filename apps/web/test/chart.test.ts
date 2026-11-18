import { describe, it, expect } from "vitest";
import { rangeHeadline, layoutSeries, RANGES } from "@/lib/chart";

const pts = [
  { ts: "2026-11-11T21:00:00.000Z", heightM: 4.25 },
  { ts: "2026-11-15T09:00:00.000Z", heightM: 4.6 },
  { ts: "2026-11-18T19:00:00.000Z", heightM: 4.85 },
];

describe("rangeHeadline", () => {
  it("resume la subida del período", () => {
    expect(rangeHeadline(pts, RANGES[0]!)).toBe("Subió 60 cm en 7 días");
  });
  it("bajada", () => {
    expect(rangeHeadline([{ ...pts[2]! }, { ts: "2026-11-19T00:00:00.000Z", heightM: 4.7 }], RANGES[1]!)).toBe("Bajó 15 cm en 1 mes");
  });
  it("sin datos", () => {
    expect(rangeHeadline([], RANGES[0]!)).toBe("Sin lecturas en este período");
  });
});

describe("layoutSeries", () => {
  it("ubica los puntos por fecha real, no equiespaciados", () => {
    const l = layoutSeries(pts, { width: 300, height: 100, alertM: 4.6, evacuationM: 4.9, from: pts[0]!.ts, to: pts[2]!.ts });
    expect(l.points[0]!.x).toBeCloseTo(0);
    expect(l.points[2]!.x).toBeCloseTo(300);
    // 15/11 09:00 está a la mitad del período (84 h de 166 h)
    expect(l.points[1]!.x).toBeCloseTo((84 / 166) * 300, 0);
  });
  it("el rango vertical incluye los umbrales", () => {
    const l = layoutSeries(pts, { width: 300, height: 100, alertM: 4.6, evacuationM: 5.5, from: pts[0]!.ts, to: pts[2]!.ts });
    expect(l.yOf(5.5)).toBeGreaterThanOrEqual(0);
    expect(l.yOf(4.25)).toBeLessThanOrEqual(100);
  });
});
