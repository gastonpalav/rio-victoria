import { describe, it, expect } from "vitest";
import { forecast } from "../src/forecast";
import type { Daily } from "../src/river-stats";

/** Paseo aleatorio determinístico: una "creciente" que sube y baja. */
function walk(seed: number, n: number, wave = 0.02): number[] {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
  const out = [3];
  for (let i = 1; i < n; i++) out.push(out[i - 1]! + rnd() * 0.08 + Math.sin(i / 20) * wave);
  return out;
}
const START = 20000;
const daily = (hs: number[]): Daily[] => hs.map((h, i) => ({ day: START + i, meanM: h, maxM: h + 0.01 }));

const N = 400;
const up = walk(7, N + 10);
/** El puerto de abajo repite al de arriba 4 días después, 50 cm más abajo. */
const here = up.map((_, i) => up[Math.max(0, i - 4)]! - 0.5);
const base = START + N - 1; // el último tramo completo

describe("forecast", () => {
  it("con un puerto de arriba que avisa con 4 días, estima mejor que decir 'queda igual'", () => {
    const f = forecast(daily(here.slice(0, N)), [daily(up.slice(0, N))], base);
    expect(f).not.toBeNull();
    expect(f!.baseDay).toBe(base);
    expect(f!.used).toEqual([0]);
    expect(f!.days.map((d) => d.ahead)).toContain(1);
    for (const d of f!.days) {
      expect(d.day).toBe(base + d.ahead);
      expect(d.loM).toBeLessThanOrEqual(d.midM);
      expect(d.hiM).toBeGreaterThanOrEqual(d.midM);
      expect(d.maeM).toBeLessThan(d.sameMaeM * 0.9);
      expect(d.tested).toBeGreaterThanOrEqual(60);
      expect(d.recentMaeM).toBeGreaterThan(0);
    }
    expect(f!.coverage).toBeGreaterThan(0.6);
  });

  it("lo que después pasó cae cerca del rango", () => {
    const f = forecast(daily(here.slice(0, N)), [daily(up.slice(0, N))], base)!;
    for (const d of f.days) {
      const actual = here[N - 1 + d.ahead]!;
      expect(actual).toBeGreaterThan(d.loM - 0.05);
      expect(actual).toBeLessThan(d.hiM + 0.05);
    }
  });

  it("solo usa el pasado: lo que pase después del último tramo no cambia la estimación", () => {
    const a = forecast(daily(here.slice(0, N)), [daily(up.slice(0, N))], base);
    const b = forecast(daily(here), [daily(up)], base);
    expect(b).toEqual(a);
  });

  it("sin relación con el puerto de arriba no estima nada", () => {
    expect(forecast(daily(walk(99, N, 0)), [daily(walk(7, N, 0))], base)).toBeNull();
  });

  it("sin puertos de arriba no estima nada", () => {
    expect(forecast(daily(here.slice(0, N)), [], base)).toBeNull();
  });

  it("con poca historia no estima nada", () => {
    const n = 200;
    expect(forecast(daily(here.slice(0, n)), [daily(up.slice(0, n))], START + n - 1)).toBeNull();
  });

  it("si falta el dato del último tramo no estima nada", () => {
    expect(forecast(daily(here.slice(0, N - 1)), [daily(up.slice(0, N))], base)).toBeNull();
  });

  it("si el puerto de arriba dejó de reportar no estima nada", () => {
    expect(forecast(daily(here.slice(0, N)), [daily(up.slice(0, N - 6))], base)).toBeNull();
  });

  it("con dos puertos de arriba, usa solo el que sigue reportando", () => {
    const f = forecast(daily(here.slice(0, N)), [daily(up.slice(0, N - 6)), daily(up.slice(0, N))], base);
    expect(f).not.toBeNull();
    expect(f!.used).toEqual([1]);
  });
});
