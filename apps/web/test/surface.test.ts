import { describe, expect, it } from "vitest";
import { buildSurface } from "@/lib/surface";

const yOf = (h: number) => 1000 - h * 100; // 1 m = 100 unidades

describe("buildSurface", () => {
  it("mapea la serie al ancho por tiempo y cierra en los bordes", () => {
    const r = buildSurface({
      points: [
        { ts: "2026-11-11T00:00:00.000Z", heightM: 4 },
        { ts: "2026-11-14T12:00:00.000Z", heightM: 4.5 },
      ],
      from: "2026-11-11T00:00:00.000Z",
      to: "2026-11-18T00:00:00.000Z",
      now: { ts: "2026-11-18T00:00:00.000Z", heightM: 5 },
      yOf,
      width: 1000,
    });
    expect(r.surface).toBe("0.0,600.0 500.0,550.0 1000.0,500.0");
    expect(r.water).toBe("0,1000 0.0,600.0 500.0,550.0 1000.0,500.0 1000,1000");
  });

  it("sin serie, la superficie es plana a la altura actual", () => {
    const r = buildSurface({
      points: [],
      from: "2026-11-11T00:00:00.000Z",
      to: "2026-11-18T00:00:00.000Z",
      now: { ts: "2026-11-18T00:00:00.000Z", heightM: 5 },
      yOf,
      width: 1200,
    });
    expect(r.surface).toBe("0.0,500.0 1200.0,500.0");
  });

  it("descarta puntos fuera del período", () => {
    const r = buildSurface({
      points: [{ ts: "2026-11-01T00:00:00.000Z", heightM: 9 }],
      from: "2026-11-11T00:00:00.000Z",
      to: "2026-11-18T00:00:00.000Z",
      now: { ts: "2026-11-18T00:00:00.000Z", heightM: 5 },
      yOf,
      width: 1000,
    });
    expect(r.surface).toBe("0.0,500.0 1000.0,500.0");
  });

  it("la lectura actual queda siempre en el borde derecho, aunque sea posterior al período", () => {
    const r = buildSurface({
      points: [{ ts: "2026-11-17T00:00:00.000Z", heightM: 4.5 }],
      from: "2026-11-11T00:00:00.000Z",
      to: "2026-11-18T00:00:00.000Z",
      now: { ts: "2026-11-18T03:00:00.000Z", heightM: 5 },
      yOf,
      width: 1000,
    });
    expect(r.surface.endsWith("1000.0,500.0")).toBe(true);
  });
});
