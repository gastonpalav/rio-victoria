import { describe, it, expect } from "vitest";
import { cm } from "@/lib/copy";

describe("cm", () => {
  it("menos de un metro en centímetros", () => {
    expect(cm(0.05)).toBe("5 cm");
    expect(cm(-0.71)).toBe("71 cm");
  });
  it("un metro o más en metros, con coma", () => {
    expect(cm(1.4)).toBe("1,40 m");
    expect(cm(-2.05)).toBe("2,05 m");
  });
});

import { travelNote, rateText, lastYearText } from "@/lib/copy";

describe("travelNote", () => {
  it("dice el rango de días", () => {
    expect(travelNote({ minDays: 4, maxDays: 6 })).toBe("llega acá en 4 a 6 días");
    expect(travelNote({ minDays: 3, maxDays: 3 })).toBe("llega acá en unos 3 días");
    expect(travelNote({ minDays: 0, maxDays: 1 })).toBe("llega acá en un día o menos");
    expect(travelNote({ minDays: 0, maxDays: 3 })).toBe("llega acá en hasta 3 días");
  });
});

describe("rateText", () => {
  it("velocidad en cm por día, con signo", () => {
    expect(rateText(0.083)).toEqual({ figure: "+8 cm", rest: "por día en los últimos 3 días" });
    expect(rateText(-0.031)).toEqual({ figure: "−3 cm", rest: "por día en los últimos 3 días" });
    expect(rateText(0.002)).toEqual({ figure: "Quieto", rest: "en los últimos 3 días" });
  });
});

describe("lastYearText", () => {
  it("compara con hace un año", () => {
    expect(lastYearText(2.1, 4.85)).toEqual({ figure: "2,10 m", rest: "marcaba hace un año. Hoy está 2,75 m más alto." });
    expect(lastYearText(5, 4.85)).toEqual({ figure: "5,00 m", rest: "marcaba hace un año. Hoy está 15 cm más bajo." });
    expect(lastYearText(4.85, 4.85)).toEqual({ figure: "4,85 m", rest: "marcaba hace un año, igual que hoy." });
  });
});
