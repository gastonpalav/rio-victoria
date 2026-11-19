import { describe, it, expect } from "vitest";
import { parseWind, windFrom, windSentence, isSudestada, windUrl } from "@/lib/wind";

const sample = (dir: number, speed: number, hourly: [number, number][] = []) => ({
  current: { time: "2026-11-18T18:00", wind_speed_10m: speed, wind_direction_10m: dir, wind_gusts_10m: speed + 15 },
  hourly: {
    time: hourly.map((_, i) => `2026-11-18T${String(19 + i).padStart(2, "0")}:00`),
    wind_speed_10m: hourly.map((h) => h[1]),
    wind_direction_10m: hourly.map((h) => h[0]),
  },
});

describe("windFrom", () => {
  it("nombra de dónde viene el viento", () => {
    expect(windFrom(0)).toBe("del norte");
    expect(windFrom(135)).toBe("del sudeste");
    expect(windFrom(200)).toBe("del sur");
    expect(windFrom(250)).toBe("del oeste");
    expect(windFrom(350)).toBe("del norte");
  });
});

describe("isSudestada", () => {
  it("es viento del sudeste sostenido de 25 km/h o más", () => {
    expect(isSudestada(135, 30)).toBe(true);
    expect(isSudestada(135, 20)).toBe(false);
    expect(isSudestada(60, 40)).toBe(false);
  });
});

describe("parseWind", () => {
  it("toma el viento actual y mira si viene sudestada en las próximas 24 h", () => {
    const w = parseWind(sample(30, 12, [[30, 12], [130, 32]]))!;
    expect(w).toMatchObject({ speedKmh: 12, gustKmh: 27, dirDeg: 30, sudestadaNow: false, sudestadaSoon: true });
  });

  it("devuelve null si la respuesta no trae viento", () => {
    expect(parseWind({})).toBeNull();
    expect(parseWind({ current: { wind_speed_10m: null } })).toBeNull();
  });
});

describe("windSentence", () => {
  it("describe el viento sin dar órdenes", () => {
    expect(windSentence(parseWind(sample(30, 12))!)).toBe("Viento del noreste a 12 km/h, ráfagas de 27.");
  });

  it("explica qué hace la sudestada cuando la hay", () => {
    const s = windSentence(parseWind(sample(140, 35))!);
    expect(s).toContain("Hay sudestada");
    expect(s).not.toMatch(/evacu|salí|retir/i);
  });

  it("avisa si se espera sudestada", () => {
    expect(windSentence(parseWind(sample(30, 12, [[140, 30]]))!)).toContain("Se espera sudestada");
  });
});

describe("windUrl", () => {
  it("solo hay viento para los puertos con coordenadas", () => {
    expect(windUrl("victoria")).toContain("latitude=-32.6");
    expect(windUrl("posadas")).toBeNull();
  });
});
