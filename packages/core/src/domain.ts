export type Level = "normal" | "alerta" | "evacuacion" | "sin-umbral";
export type Trend = "crece" | "baja" | "estable";

export function levelOf(heightM: number, alertM: number | null, evacuationM: number | null): Level {
  if (alertM === null || evacuationM === null) return "sin-umbral";
  if (heightM >= evacuationM) return "evacuacion";
  if (heightM >= alertM) return "alerta";
  return "normal";
}

export function trendOf(heightM: number, prevHeightM: number | null): Trend {
  if (prevHeightM === null) return "estable";
  const d = heightM - prevHeightM;
  if (Math.abs(d) < 0.005) return "estable";
  return d > 0 ? "crece" : "baja";
}

const DEFAULT_PERIOD_HOURS = 12;

/** Un dato está viejo si pasó más de 3 veces el período de reporte del puerto (mínimo 6 h). */
export function staleness(ts: Date, periodHours: number | null, now: Date) {
  const limitHours = Math.max(3 * (periodHours ?? DEFAULT_PERIOD_HOURS), 6);
  const ageMs = now.getTime() - ts.getTime();
  return { stale: ageMs > limitHours * 3600_000, ageMs, limitHours };
}

/** Positivo = falta para llegar; negativo = ya se pasó. */
export function thresholdsProgress(heightM: number, alertM: number, evacuationM: number) {
  return { toAlertM: alertM - heightM, toEvacuationM: evacuationM - heightM };
}

type RiverStation = { river: string; riverOrder: number; hidden: boolean };

export function upstreamOf<T extends RiverStation>(station: T, all: T[], n = 3): T[] {
  return all
    .filter((s) => !s.hidden && s.river === station.river && s.riverOrder < station.riverOrder)
    .sort((a, b) => b.riverOrder - a.riverOrder)
    .slice(0, n);
}

const TREND_TEXT: Record<Trend, string> = { crece: "Creciendo", baja: "Bajando", estable: "Estable" };
const cm = (m: number) => `${Math.round(Math.abs(m) * 100)} cm`;

export function describeState(s: { heightM: number; prevHeightM: number | null; alertM: number | null; evacuationM: number | null }): string {
  const trend = TREND_TEXT[trendOf(s.heightM, s.prevHeightM)];
  if (s.alertM === null || s.evacuationM === null) return trend;
  const { toAlertM, toEvacuationM } = thresholdsProgress(s.heightM, s.alertM, s.evacuationM);
  if (toEvacuationM <= 0) return `${trend} · ${cm(toEvacuationM)} por encima del nivel de evacuación de Prefectura`;
  if (toAlertM <= 0) return `${trend} · faltan ${cm(toEvacuationM)} para el nivel de evacuación de Prefectura`;
  return `${trend} · faltan ${cm(toAlertM)} para el nivel de alerta de Prefectura`;
}
