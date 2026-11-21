/**
 * El pronóstico oficial del INA (Instituto Nacional del Agua): la altura promedio de cada semana, varias semanas
 * adelante, de su modelo semanal (calibrado 434). Se lee de su API pública; si falla o trae algo raro, no se muestra.
 */

export const INA_API = "https://alerta.ina.gob.ar/a5";
export const INA_PAGE = "https://www.ina.gob.ar/alerta/";
const MODEL = 434;
const TIMEOUT_MS = 4000;
const MAX_AGE_MS = 10 * 86_400_000; // una corrida de más de 10 días ya no se muestra
const WEEKS = 4;

/** Una semana: de `start` a `end` (exclusivo), en ISO UTC. */
export type InaWeek = { start: string; end: string; loM: number; hiM: number };
export type InaForecast = { runDate: string; weeks: InaWeek[] };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isDate = (x: unknown): x is string => typeof x === "string" && !Number.isNaN(Date.parse(x));
const toCm = (m: number) => Math.round(m * 100) / 100;

/** El id del INA de un puerto de Prefectura: el INA guarda el id de Prefectura en `id_externo`. */
export function inaStationId(stations: unknown, prefectureId: number): number | null {
  if (!Array.isArray(stations)) return null;
  for (const s of stations) {
    if (!isObj(s) || typeof s.id !== "number" || s.id_externo === null || s.id_externo === undefined) continue;
    if (Number(s.id_externo) === prefectureId) return s.id;
  }
  return null;
}

/**
 * La corrida de un puerto. La API no dice en la serie de qué puerto es: se pide filtrada por puerto y tiene que
 * venir exactamente una serie, si no no se adivina.
 */
export function parseInaRun(run: unknown): InaForecast | null {
  if (!isObj(run) || !isDate(run.forecast_date) || !Array.isArray(run.series) || run.series.length !== 1) return null;
  const serie = run.series[0];
  if (!isObj(serie) || !Array.isArray(serie.pronosticos)) return null;
  const byWeek = new Map<string, { end: string; values: number[] }>();
  for (const x of serie.pronosticos) {
    if (!isObj(x) || !isDate(x.timestart) || !isDate(x.timeend)) continue;
    if (typeof x.valor !== "number" || !Number.isFinite(x.valor)) continue;
    const start = new Date(x.timestart).toISOString();
    const week = byWeek.get(start) ?? { end: new Date(x.timeend).toISOString(), values: [] };
    week.values.push(x.valor);
    byWeek.set(start, week);
  }
  const weeks = [...byWeek.entries()]
    .map(([start, w]) => ({ start, end: w.end, loM: toCm(Math.min(...w.values)), hiM: toCm(Math.max(...w.values)) }))
    .sort((a, b) => a.start.localeCompare(b.start));
  if (weeks.length === 0) return null;
  return { runDate: new Date(run.forecast_date).toISOString(), weeks };
}

/** Lo que se muestra ahora: hasta 4 semanas que no terminaron, y nada si la corrida es vieja. */
export function inaFor(f: InaForecast | null, now: Date): InaForecast | null {
  if (!f || now.getTime() - Date.parse(f.runDate) > MAX_AGE_MS) return null;
  const weeks = f.weeks.filter((w) => Date.parse(w.end) > now.getTime()).slice(0, WEEKS);
  return weeks.length === 0 ? null : { runDate: f.runDate, weeks };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`INA ${res.status}`);
  return res.json();
}

/** La última corrida para un puerto de Prefectura; null si el INA no lo cubre o algo falla. */
export async function fetchIna(prefectureId: number): Promise<InaForecast | null> {
  try {
    const id = inaStationId(await getJson(`${INA_API}/obs/puntual/estaciones?tabla=alturas_prefe`), prefectureId);
    if (id === null) return null;
    return parseInaRun(await getJson(`${INA_API}/sim/calibrados/${MODEL}/corridas/last?includeProno=true&estacion_id=${id}`));
  } catch {
    return null;
  }
}
