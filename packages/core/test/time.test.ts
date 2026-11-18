import { describe, it, expect } from "vitest";
import { parsePrefecturaDateTime, parseHistoryDateTime, formatArt } from "../src/time";

describe("fechas de Prefectura", () => {
  it("convierte '18/NOV/26 - 1600' (ART) a UTC", () => {
    expect(parsePrefecturaDateTime("18/NOV/26 - 1600").toISOString()).toBe("2026-11-18T19:00:00.000Z");
  });
  it("cruza el año al pasar a UTC", () => {
    expect(parsePrefecturaDateTime("31/DIC/26 - 2200").toISOString()).toBe("2027-01-01T01:00:00.000Z");
  });
  it("convierte el formato del historial", () => {
    expect(parseHistoryDateTime("2026-11-18 06:00").toISOString()).toBe("2026-11-18T09:00:00.000Z");
  });
  it("lanza con texto no fecha", () => {
    expect(() => parsePrefecturaDateTime("S/D")).toThrow();
    expect(() => parseHistoryDateTime("ayer")).toThrow();
  });
  it("formatea en hora argentina", () => {
    expect(formatArt(new Date("2026-11-18T19:00:00Z"))).toBe("18/11 16:00");
  });
});
