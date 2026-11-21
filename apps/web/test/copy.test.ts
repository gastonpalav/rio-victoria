import { describe, it, expect } from "vitest";
import { cm, inaLevelNote, inaRunLabel, inaWeekLabel } from "@/lib/copy";

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

import { travelShort, upstreamDelta } from "@/lib/copy";

describe("travelShort", () => {
  it("entra en una columna de celular", () => {
    expect(travelShort({ minDays: 4, maxDays: 6 })).toBe("4 a 6 días");
    expect(travelShort({ minDays: 3, maxDays: 3 })).toBe("unos 3 días");
    expect(travelShort({ minDays: 0, maxDays: 1 })).toBe("1 día o menos");
    expect(travelShort({ minDays: 0, maxDays: 3 })).toBe("hasta 3 días");
  });
});

describe("upstreamDelta", () => {
  const lv = { alertM: 4.7, evacuationM: 5.0 };
  it("sobre evacuación, sobre alerta o bajo alerta", () => {
    expect(upstreamDelta({ ...lv, heightM: 5.71 })).toEqual({ figure: "+71 cm", label: "sobre evacuación", tone: "evac" });
    expect(upstreamDelta({ ...lv, heightM: 4.8 })).toEqual({ figure: "+10 cm", label: "sobre alerta", tone: "alert" });
    expect(upstreamDelta({ ...lv, heightM: 3.3 })).toEqual({ figure: "−1,40 m", label: "bajo alerta", tone: "ok" });
  });
  it("sin umbrales no dice nada", () => {
    expect(upstreamDelta({ heightM: 3, alertM: null, evacuationM: null })).toBeNull();
  });
});

describe("dayLabel", () => {
  it("nombra el día de la semana sin depender de la zona horaria", async () => {
    const { dayLabel } = await import("@/lib/copy");
    expect(dayLabel("2026-11-21")).toEqual({ weekday: "sábado", dayOfMonth: 21 });
  });
});

describe("forecastLevelNote", () => {
  const days = [
    { date: "2026-11-20", loM: 4.84, hiM: 4.95 },
    { date: "2026-11-22", loM: 4.94, hiM: 5.09 },
  ];
  it("subiendo: dice cuándo el rango llega al nivel y cuándo queda entero por encima", async () => {
    const { forecastLevelNote } = await import("@/lib/copy");
    expect(forecastLevelNote(days, { heightM: 4.85, alertM: 4.6, evacuationM: 4.9 })).toBe(
      "El viernes 20 el rango ya llega al nivel de evacuación de Prefectura (4,90 m); el domingo 22 queda entero por encima.",
    );
    expect(forecastLevelNote(days, { heightM: 4.85, alertM: 4.6, evacuationM: 5.0 })).toBe(
      "El domingo 22 el rango llega al nivel de evacuación de Prefectura (5,00 m).",
    );
    expect(forecastLevelNote(days, { heightM: 4.5, alertM: 4.6, evacuationM: 5.9 })).toBe(
      "El viernes 20 el rango queda entero por encima del nivel de alerta de Prefectura (4,60 m).",
    );
  });
  it("bajando: dice cuándo queda entero por debajo", async () => {
    const { forecastLevelNote } = await import("@/lib/copy");
    expect(forecastLevelNote(days, { heightM: 5.2, alertM: 4.6, evacuationM: 5.1 })).toBe(
      "El viernes 20 el rango queda entero por debajo del nivel de evacuación de Prefectura (5,10 m).",
    );
  });
  it("lejos de los niveles, o sin niveles, no dice nada", async () => {
    const { forecastLevelNote } = await import("@/lib/copy");
    expect(forecastLevelNote(days, { heightM: 4.85, alertM: 6, evacuationM: 6.5 })).toBeNull();
    expect(forecastLevelNote(days, { heightM: 4.85, alertM: null, evacuationM: null })).toBeNull();
  });
});

describe("inaWeekLabel", () => {
  it("en hora argentina y con el último día incluido", () => {
    expect(inaWeekLabel({ start: "2026-11-20T03:00:00.000Z", end: "2026-11-27T03:00:00.000Z" })).toBe("20 al 26 nov");
    expect(inaWeekLabel({ start: "2026-11-27T03:00:00.000Z", end: "2026-12-04T03:00:00.000Z" })).toBe("27 nov al 3 dic");
    expect(inaWeekLabel({ start: "2026-12-25T03:00:00.000Z", end: "2027-01-01T03:00:00.000Z" })).toBe("25 al 31 dic");
  });
});

describe("inaRunLabel", () => {
  it("día y mes en hora argentina", () => {
    expect(inaRunLabel("2026-11-20T03:00:00.000Z")).toBe("20/11");
    expect(inaRunLabel("2026-11-20T02:00:00.000Z")).toBe("19/11");
  });
});

describe("inaLevelNote", () => {
  const s = { alertM: 4.6, evacuationM: 5.9 };
  it("describe sin ordenar, primero evacuación", () => {
    expect(inaLevelNote({ loM: 5.3, hiM: 5.43 }, s)).toBe("por encima del nivel de alerta de Prefectura (4,60 m)");
    expect(inaLevelNote({ loM: 4.5, hiM: 4.7 }, s)).toBe("llega al nivel de alerta de Prefectura (4,60 m)");
    expect(inaLevelNote({ loM: 5.8, hiM: 5.99 }, s)).toBe("llega al nivel de evacuación de Prefectura (5,90 m)");
    expect(inaLevelNote({ loM: 4.0, hiM: 4.2 }, s)).toBeNull();
    expect(inaLevelNote({ loM: 5, hiM: 5 }, { alertM: null, evacuationM: null })).toBeNull();
  });
});
