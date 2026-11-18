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
