import { describe, it, expect } from "vitest";
import { heroScale, SPAN_M } from "@/lib/scale";

describe("heroScale", () => {
  it("Victoria: el agua ocupa cerca del 60% y los niveles quedan por encima de la mitad", () => {
    const s = heroScale(4.85, 4.6, 4.9);
    expect(s.span).toBeCloseTo(SPAN_M);
    expect(s.level).toBeGreaterThan(0.5);
    expect(s.level).toBeLessThan(0.7);
    expect(s.evacuation!).toBeGreaterThan(s.level);
    expect(s.alert!).toBeLessThan(s.level);
  });
  it("muy por encima de evacuación, la superficie sigue entrando en pantalla", () => {
    const s = heroScale(6.5, 4.6, 4.9);
    expect(s.level).toBeLessThan(0.8);
    expect(s.evacuation!).toBeGreaterThanOrEqual(0);
  });
  it("sin umbrales no hay líneas", () => {
    const s = heroScale(1.2, null, null);
    expect(s.alert).toBeNull();
    expect(s.evacuation).toBeNull();
    expect(s.level).toBeGreaterThan(0.5);
  });
});

describe("heroScale: río muy por debajo de los niveles", () => {
  it("Campana 0,80 con alerta 2,20: el agua se ve y las líneas siguen en pantalla", () => {
    const s = heroScale(0.8, 2.2, 2.45);
    expect(s.level).toBeGreaterThanOrEqual(0.25);
    expect(s.evacuation!).toBeLessThanOrEqual(1);
    expect(s.alert!).toBeGreaterThan(s.level);
  });
});
