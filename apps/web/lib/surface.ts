import type { SeriesPoint } from "./chart";

type Args = {
  points: SeriesPoint[];
  from: string;
  to: string;
  /** La lectura actual: siempre es el último punto del borde derecho. */
  now: SeriesPoint;
  /** Altura en metros → coordenada y (0 arriba). */
  yOf: (h: number) => number;
  width: number;
  height?: number;
};

/**
 * La superficie del agua es la serie del período: x por tiempo, y por altura.
 * Devuelve la línea de la superficie y el polígono del agua (cerrado contra el fondo).
 */
export function buildSurface({ points, from, to, now, yOf, width, height = 1000 }: Args) {
  const t0 = new Date(from).getTime();
  // Si la lectura actual es posterior al período (caché vieja), el período se estira hasta ella.
  const t1 = Math.max(new Date(to).getTime(), new Date(now.ts).getTime(), t0 + 1);
  const pts = [...points, now]
    .map((p) => ({ x: ((new Date(p.ts).getTime() - t0) / (t1 - t0)) * width, y: yOf(p.heightM) }))
    .filter((p) => p.x >= 0 && p.x <= width)
    .sort((a, b) => a.x - b.x);
  if (pts.length === 0) pts.push({ x: width, y: yOf(now.heightM) });
  if (pts[0]!.x > 0) pts.unshift({ x: 0, y: pts[0]!.y });
  if (pts.at(-1)!.x < width) pts.push({ x: width, y: pts.at(-1)!.y });
  const surface = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return { surface, water: `0,${height} ${surface} ${width},${height}` };
}
