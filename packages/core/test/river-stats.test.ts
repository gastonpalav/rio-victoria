import { describe, it, expect } from "vitest";
import { travelDays, ratePerDay, daysAbove, sameDayLastYear, dayOf, type Daily } from "../src/river-stats";

/** Paseo aleatorio determinístico: una "creciente" que sube y baja durante un año. */
function walk(seed: number, n: number, wave = 0.02): number[] {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
  const out = [3];
  for (let i = 1; i < n; i++) out.push(out[i - 1]! + rnd() * 0.08 + Math.sin(i / 20) * wave);
  return out;
}
const daily = (hs: number[], start = 20000): Daily[] => hs.map((h, i) => ({ day: start + i, meanM: h, maxM: h + 0.01 }));

describe("dayOf", () => {
  it("cuenta días en hora argentina (UTC−3)", () => {
    expect(dayOf(new Date("2026-11-18T02:59:00Z"))).toBe(dayOf(new Date("2026-11-17T12:00:00Z")));
    expect(dayOf(new Date("2026-11-18T03:00:00Z"))).toBe(dayOf(new Date("2026-11-17T12:00:00Z")) + 1);
  });
});

describe("travelDays", () => {
  it("encuentra el desfasaje cuando el puerto de abajo repite al de arriba", () => {
    const up = walk(7, 365);
    const here = up.map((_, i) => (i >= 4 ? up[i - 4]! - 0.5 : up[0]! - 0.5)); // 4 días después, 50 cm más abajo
    const r = travelDays(daily(up), daily(here));
    expect(r).not.toBeNull();
    expect(r!.minDays).toBeLessThanOrEqual(4);
    expect(r!.maxDays).toBeGreaterThanOrEqual(4);
    expect(r!.maxDays - r!.minDays).toBeLessThanOrEqual(6);
  });

  it("no inventa un tiempo si los puertos no tienen relación", () => {
    expect(travelDays(daily(walk(7, 365, 0)), daily(walk(99, 365, 0)))).toBeNull();
  });

  it("no calcula con pocos datos", () => {
    const up = walk(7, 60);
    expect(travelDays(daily(up), daily(up))).toBeNull();
  });
});

describe("ratePerDay", () => {
  it("es el cambio promedio por día en los últimos 3 días", () => {
    const now = new Date("2026-11-18T21:00:00Z");
    const series = [
      { ts: "2026-11-15T21:00:00Z", heightM: 4.6 },
      { ts: "2026-11-17T21:00:00Z", heightM: 4.75 },
    ];
    expect(ratePerDay(series, { ts: now.toISOString(), heightM: 4.84 })).toBeCloseTo(0.08, 5);
  });

  it("sin lectura de hace unos 3 días no hay velocidad", () => {
    expect(ratePerDay([{ ts: "2026-11-18T15:00:00Z", heightM: 4.8 }], { ts: "2026-11-18T21:00:00Z", heightM: 4.84 })).toBeNull();
  });
});

describe("daysAbove", () => {
  it("cuenta los días cuyo máximo llegó al nivel", () => {
    const d: Daily[] = [
      { day: 1, meanM: 4.5, maxM: 4.59 },
      { day: 2, meanM: 4.55, maxM: 4.6 },
      { day: 3, meanM: 4.7, maxM: 4.8 },
    ];
    expect(daysAbove(d, 4.6)).toBe(2);
  });
});

describe("sameDayLastYear", () => {
  it("devuelve el promedio de hace 365 días, o del día más cercano", () => {
    const d: Daily[] = [
      { day: 100, meanM: 2.1, maxM: 2.2 },
      { day: 102, meanM: 2.3, maxM: 2.4 },
    ];
    expect(sameDayLastYear(d, 465)).toBe(2.1);
    expect(sameDayLastYear(d, 466)).toBe(2.1);
    expect(sameDayLastYear(d, 470)).toBeNull();
  });
});
