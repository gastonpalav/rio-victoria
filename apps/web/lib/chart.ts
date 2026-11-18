import { cm } from "./copy";

export type SeriesPoint = { ts: string; heightM: number };
export type Range = { key: string; label: string; days: number; phrase: string };

export const RANGES: Range[] = [
  { key: "7d", label: "7 días", days: 7, phrase: "7 días" },
  { key: "1m", label: "1 mes", days: 30, phrase: "1 mes" },
  { key: "6m", label: "6 meses", days: 182, phrase: "6 meses" },
  { key: "1a", label: "1 año", days: 365, phrase: "1 año" },
];

export function rangeHeadline(points: SeriesPoint[], range: Range): string {
  if (points.length < 2) return points.length ? `Una sola lectura en ${range.phrase}` : "Sin lecturas en este período";
  const d = points.at(-1)!.heightM - points[0]!.heightM;
  if (Math.abs(d) < 0.005) return `Sin cambios en ${range.phrase}`;
  return `${d > 0 ? "Subió" : "Bajó"} ${cm(d)} en ${range.phrase}`;
}

type LayoutOpts = { width: number; height: number; alertM: number | null; evacuationM: number | null; from: string; to: string };

/** Escala con eje temporal real: x proporcional a la fecha; y incluye datos y umbrales. */
export function layoutSeries(points: SeriesPoint[], o: LayoutOpts) {
  const t0 = new Date(o.from).getTime();
  const t1 = Math.max(new Date(o.to).getTime(), t0 + 1);
  const values = points.map((p) => p.heightM);
  for (const v of [o.alertM, o.evacuationM]) if (v !== null) values.push(v);
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const pad = Math.max((hi - lo) * 0.12, 0.05);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const xOf = (iso: string) => ((new Date(iso).getTime() - t0) / (t1 - t0)) * o.width;
  const yOf = (h: number) => ((yMax - h) / (yMax - yMin)) * o.height;
  return { points: points.map((p) => ({ x: xOf(p.ts), y: yOf(p.heightM) })), xOf, yOf, yMin, yMax };
}
