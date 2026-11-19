/** Viento de Open-Meteo (gratis, sin clave). Solo para la costa baja, donde la sudestada mueve el río. */

const COORDS: Record<string, [number, number]> = {
  victoria: [-32.62, -60.15],
  diamante: [-32.07, -60.64],
  parana: [-31.73, -60.53],
  "santa-fe": [-31.65, -60.7],
  "san-lorenzo": [-32.75, -60.73],
  rosario: [-32.95, -60.64],
  "villa-constitucion": [-33.23, -60.33],
  "san-nicolas": [-33.33, -60.21],
  ramallo: [-33.49, -60.01],
};

export function windUrl(slug: string): string | null {
  const c = COORDS[slug];
  if (!c) return null;
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${c[0]}&longitude=${c[1]}` +
    "&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
    "&hourly=wind_speed_10m,wind_direction_10m&forecast_hours=24&timezone=America%2FArgentina%2FBuenos_Aires"
  );
}

export type Wind = { speedKmh: number; gustKmh: number | null; dirDeg: number; sudestadaNow: boolean; sudestadaSoon: boolean };

const NAMES = ["norte", "noreste", "este", "sudeste", "sur", "sudoeste", "oeste", "noroeste"];
export const windFrom = (deg: number) => `del ${NAMES[Math.round((((deg % 360) + 360) % 360) / 45) % 8]}`;

/** Viento del sudeste sostenido: frena la salida del agua por el Delta. */
export const isSudestada = (dirDeg: number, speedKmh: number) => dirDeg >= 100 && dirDeg <= 170 && speedKmh >= 25;

type Raw = {
  current?: { wind_speed_10m?: number | null; wind_direction_10m?: number | null; wind_gusts_10m?: number | null };
  hourly?: { wind_speed_10m?: (number | null)[]; wind_direction_10m?: (number | null)[] };
};

export function parseWind(raw: unknown): Wind | null {
  const r = raw as Raw;
  const speed = r?.current?.wind_speed_10m;
  const dir = r?.current?.wind_direction_10m;
  if (typeof speed !== "number" || typeof dir !== "number") return null;
  const hs = r.hourly?.wind_speed_10m ?? [];
  const hd = r.hourly?.wind_direction_10m ?? [];
  const sudestadaSoon = hs.some((s, i) => typeof s === "number" && typeof hd[i] === "number" && isSudestada(hd[i]!, s));
  return {
    speedKmh: Math.round(speed),
    gustKmh: typeof r.current?.wind_gusts_10m === "number" ? Math.round(r.current.wind_gusts_10m) : null,
    dirDeg: dir,
    sudestadaNow: isSudestada(dir, speed),
    sudestadaSoon,
  };
}

export function windSentence(w: Wind): string {
  const base = `Viento ${windFrom(w.dirDeg)} a ${w.speedKmh} km/h${w.gustKmh !== null && w.gustKmh > w.speedKmh ? `, ráfagas de ${w.gustKmh}` : ""}.`;
  if (w.sudestadaNow)
    return `${base} Hay sudestada: frena la salida del agua por el Delta y el río puede subir más de lo que marca la tendencia.`;
  if (w.sudestadaSoon)
    return `${base} Se espera sudestada en las próximas 24 horas: puede frenar la bajada del agua por el Delta.`;
  return base;
}

export async function fetchWind(slug: string): Promise<Wind | null> {
  const url = windUrl(slug);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return parseWind(await res.json());
  } catch {
    return null;
  }
}
