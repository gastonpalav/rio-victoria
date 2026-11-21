import type { StationDto } from "./api";

export const fmtM = (m: number) => m.toFixed(2).replace(".", ",");
/** Distancia legible: "5 cm" o, desde un metro, "1,40 m". */
export const cm = (m: number) => {
  const c = Math.round(Math.abs(m) * 100);
  return c >= 100 ? `${(c / 100).toFixed(2).replace(".", ",")} m` : `${c} cm`;
};

export const TREND_LABEL = { crece: "Creciendo", baja: "Bajando", estable: "Estable" } as const;

type Levels = Pick<StationDto, "heightM" | "alertM" | "evacuationM">;

/** Frase sobre los niveles de Prefectura. Nunca imperativa: son umbrales, no órdenes. */
export function levelSentence(s: Levels): string | null {
  if (s.heightM === null || s.alertM === null || s.evacuationM === null) return null;
  const toEvac = s.evacuationM - s.heightM;
  const toAlert = s.alertM - s.heightM;
  if (toEvac <= 0) return `Está ${cm(toEvac)} por encima del nivel de evacuación de Prefectura.`;
  if (toAlert <= 0) return `Faltan ${cm(toEvac)} para el nivel de evacuación de Prefectura.`;
  return `Faltan ${cm(toAlert)} para el nivel de alerta de Prefectura.`;
}

export function upstreamNote(s: Levels): string | null {
  if (s.heightM === null || s.alertM === null || s.evacuationM === null) return null;
  if (s.heightM >= s.evacuationM) return `${cm(s.heightM - s.evacuationM)} sobre su nivel de evacuación`;
  if (s.heightM >= s.alertM) return `${cm(s.heightM - s.alertM)} sobre su nivel de alerta`;
  return `a ${cm(s.alertM - s.heightM)} de su nivel de alerta`;
}

export function changeSentence(s: Pick<StationDto, "heightM" | "prevHeightM">): string | null {
  if (s.heightM === null || s.prevHeightM === null) return null;
  const d = s.heightM - s.prevHeightM;
  if (Math.abs(d) < 0.005) return "Sin cambios desde la lectura anterior.";
  return `${d > 0 ? "Sube" : "Baja"} ${cm(d)} desde la lectura anterior.`;
}

export function relativeAge(fromIso: string, now: Date): string {
  const min = Math.round((now.getTime() - new Date(fromIso).getTime()) / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h${min % 60 >= 10 ? ` ${min % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}

/** Cuánto tarda en notarse acá lo que pasa en un puerto de arriba (un rango: es un promedio del último año). */
export function travelNote(t: { minDays: number; maxDays: number }): string {
  if (t.maxDays <= 1) return "llega acá en un día o menos";
  if (t.minDays === t.maxDays) return `llega acá en unos ${t.maxDays} días`;
  if (t.minDays === 0) return `llega acá en hasta ${t.maxDays} días`;
  return `llega acá en ${t.minDays} a ${t.maxDays} días`;
}

/** Versión corta para debajo de las reglas chicas (entra en una columna de celular). */
export function travelShort(t: { minDays: number; maxDays: number }): string {
  if (t.maxDays <= 1) return "1 día o menos";
  if (t.minDays === t.maxDays) return `unos ${t.maxDays} días`;
  if (t.minDays === 0) return `hasta ${t.maxDays} días`;
  return `${t.minDays} a ${t.maxDays} días`;
}

/** Cuánto está un puerto respecto de sus niveles, en dos partes cortas: la cifra pintada y a qué nivel se refiere. */
export function upstreamDelta(s: Levels): { figure: string; label: string; tone: "evac" | "alert" | "ok" } | null {
  if (s.heightM === null || s.alertM === null || s.evacuationM === null) return null;
  if (s.heightM >= s.evacuationM) return { figure: `+${cm(s.heightM - s.evacuationM)}`, label: "sobre evacuación", tone: "evac" };
  if (s.heightM >= s.alertM) return { figure: `+${cm(s.heightM - s.alertM)}`, label: "sobre alerta", tone: "alert" };
  return { figure: `−${cm(s.alertM - s.heightM)}`, label: "bajo alerta", tone: "ok" };
}

export function rateText(mPerDay: number): { figure: string; rest: string } {
  const c = Math.round(mPerDay * 100);
  if (c === 0) return { figure: "Quieto", rest: "en los últimos 3 días" };
  return { figure: `${c > 0 ? "+" : "−"}${Math.abs(c)} cm`, rest: "por día en los últimos 3 días" };
}

export function lastYearText(thenM: number, nowM: number): { figure: string; rest: string } {
  const d = nowM - thenM;
  const figure = `${fmtM(thenM)} m`;
  if (Math.abs(d) < 0.005) return { figure, rest: "marcaba hace un año, igual que hoy." };
  return { figure, rest: `marcaba hace un año. Hoy está ${cm(d)} más ${d > 0 ? "alto" : "bajo"}.` };
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

/** "sábado 21" a partir de "2026-11-21". Nunca "mañana": la página puede quedar abierta de un día para el otro. */
export function dayLabel(date: string): { weekday: string; dayOfMonth: number } {
  const d = new Date(`${date}T00:00:00Z`);
  return { weekday: WEEKDAYS[d.getUTCDay()]!, dayOfMonth: d.getUTCDate() };
}

type Range = { date: string; loM: number; hiM: number };

/**
 * Qué dice el rango estimado sobre los niveles de Prefectura. Describe, nunca ordena: es una estimación propia
 * comparada con un umbral, no un aviso.
 */
export function forecastLevelNote(days: Range[], s: Levels): string | null {
  if (s.heightM === null) return null;
  const levels: [number | null, string][] = [
    [s.evacuationM, "evacuación"],
    [s.alertM, "alerta"],
  ];
  for (const [m, name] of levels) {
    if (m === null) continue;
    const level = `nivel de ${name} de Prefectura (${fmtM(m)} m)`;
    const on = (d: Range) => `${dayLabel(d.date).weekday} ${dayLabel(d.date).dayOfMonth}`;
    if (s.heightM < m) {
      const whole = days.find((d) => d.loM >= m);
      const touch = days.find((d) => d.hiM >= m);
      if (!touch) continue;
      if (whole && whole.date === touch.date) return `El ${on(whole)} el rango queda entero por encima del ${level}.`;
      if (whole) return `El ${on(touch)} el rango ya llega al ${level}; el ${on(whole)} queda entero por encima.`;
      return `El ${on(touch)} el rango llega al ${level}.`;
    } else {
      const below = days.find((d) => d.hiM < m);
      if (below) return `El ${on(below)} el rango queda entero por debajo del ${level}.`;
    }
  }
  return null;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;
const AR_OFFSET_MS = 3 * 3_600_000; // Argentina es UTC−3 todo el año
const ar = (iso: string, minusMs = 0) => new Date(Date.parse(iso) - AR_OFFSET_MS - minusMs);

/** "20 al 26 nov", "27 nov al 3 dic": una semana del INA en hora argentina, con su último día incluido. */
export function inaWeekLabel(w: { start: string; end: string }): string {
  const a = ar(w.start);
  const b = ar(w.end, 1); // `end` es exclusivo: la semana termina el día anterior
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const from = sameMonth ? `${a.getUTCDate()}` : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}`;
  return `${from} al ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}

/** "20/11": el día de la corrida del INA, en hora argentina. */
export function inaRunLabel(runDate: string): string {
  const d = ar(runDate);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** Qué dice una semana del INA sobre los niveles de Prefectura. Describe, nunca ordena. */
export function inaLevelNote(
  w: { loM: number; hiM: number },
  s: { alertM: number | null; evacuationM: number | null },
): string | null {
  const levels: [number | null, string][] = [
    [s.evacuationM, "evacuación"],
    [s.alertM, "alerta"],
  ];
  for (const [m, name] of levels) {
    if (m === null) continue;
    if (w.loM >= m) return `por encima del nivel de ${name} (${fmtM(m)} m)`;
    if (w.hiM >= m) return `llega al nivel de ${name} (${fmtM(m)} m)`;
  }
  return null;
}
