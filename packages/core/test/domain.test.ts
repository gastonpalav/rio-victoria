import { describe, it, expect } from "vitest";
import { levelOf, trendOf, staleness, thresholdsProgress, upstreamOf, describeState } from "../src/domain";

describe("levelOf", () => {
  it("clasifica según los umbrales de Prefectura", () => {
    expect(levelOf(4.5, 4.6, 4.9)).toBe("normal");
    expect(levelOf(4.85, 4.6, 4.9)).toBe("alerta");
    expect(levelOf(4.9, 4.6, 4.9)).toBe("evacuacion");
  });
  it("sin umbrales no inventa un nivel", () => {
    expect(levelOf(1.2, null, null)).toBe("sin-umbral");
    expect(levelOf(1.2, 1.0, null)).toBe("sin-umbral");
  });
});

describe("trendOf", () => {
  it("crece, baja o estable", () => {
    expect(trendOf(4.85, 4.84)).toBe("crece");
    expect(trendOf(4.83, 4.84)).toBe("baja");
    expect(trendOf(4.84, 4.84)).toBe("estable");
    expect(trendOf(4.84, null)).toBe("estable");
  });
});

describe("staleness", () => {
  const now = new Date("2026-11-18T19:40:00Z");
  it("dato reciente de un puerto de 2 h no está viejo", () => {
    expect(staleness(new Date("2026-11-18T19:00:00Z"), 2, now).stale).toBe(false);
  });
  it("más de 6 h sin datos en un puerto de 2 h está viejo", () => {
    const s = staleness(new Date("2026-11-18T13:00:00Z"), 2, now);
    expect(s.stale).toBe(true);
    expect(s.limitHours).toBe(6);
  });
  it("un puerto de 12 h tiene 36 h de margen", () => {
    expect(staleness(new Date("2026-11-18T09:00:00Z"), 12, now)).toMatchObject({ stale: false, limitHours: 36 });
  });
  it("un puerto que no reporta hace días está viejo", () => {
    expect(staleness(new Date("2026-11-15T15:00:00Z"), 12, now).stale).toBe(true);
  });
  it("sin período asume 12 h", () => {
    expect(staleness(new Date("2026-11-18T09:00:00Z"), null, now).limitHours).toBe(36);
  });
});

describe("thresholdsProgress", () => {
  it("cuánto falta para cada nivel", () => {
    const p = thresholdsProgress(4.85, 4.6, 4.9);
    expect(p.toAlertM).toBeCloseTo(-0.25);
    expect(p.toEvacuationM).toBeCloseTo(0.05);
  });
});

describe("upstreamOf", () => {
  const st = (slug: string, river: string, riverOrder: number, hidden = false) => ({ slug, river, riverOrder, hidden });
  const all = [
    st("hernandarias", "PARANA", 21), st("parana", "PARANA", 22), st("santa-fe", "PARANA", 23),
    st("diamante", "PARANA", 24), st("victoria", "PARANA", 25), st("rosario", "PARANA", 27),
    st("guayra-brasil", "PARANA", 0, true), st("campana", "DELTA PARANA", 3),
  ];
  it("los 3 visibles más cercanos aguas arriba, el más cercano primero", () => {
    expect(upstreamOf(all.find((s) => s.slug === "victoria")!, all).map((s) => s.slug)).toEqual(["diamante", "santa-fe", "parana"]);
  });
  it("no incluye ocultos ni otros ríos", () => {
    expect(upstreamOf(all.find((s) => s.slug === "hernandarias")!, all)).toEqual([]);
  });
});

describe("describeState", () => {
  it("creciendo cerca de evacuación", () => {
    expect(describeState({ heightM: 4.85, prevHeightM: 4.84, alertM: 4.6, evacuationM: 4.9 }))
      .toBe("Creciendo · faltan 5 cm para el nivel de evacuación de Prefectura");
  });
  it("bajando, por debajo de alerta", () => {
    expect(describeState({ heightM: 4.3, prevHeightM: 4.32, alertM: 4.6, evacuationM: 4.9 }))
      .toBe("Bajando · faltan 30 cm para el nivel de alerta de Prefectura");
  });
  it("por encima de evacuación", () => {
    expect(describeState({ heightM: 5.71, prevHeightM: 5.7, alertM: 4.7, evacuationM: 5.0 }))
      .toBe("Creciendo · 71 cm por encima del nivel de evacuación de Prefectura");
  });
  it("sin umbrales solo la tendencia", () => {
    expect(describeState({ heightM: 1.2, prevHeightM: 1.2, alertM: null, evacuationM: null })).toBe("Estable");
  });
});
