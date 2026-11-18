"use client";
import { useState } from "react";
import { RANGES, type SeriesPoint, layoutSeries, rangeHeadline } from "@/lib/chart";
import { fmtM } from "@/lib/copy";

type Props = {
  slug: string;
  initial: SeriesPoint[];
  initialFrom: string;
  to: string;
  alertM: number | null;
  evacuationM: number | null;
};

const W = 600;
const H = 220;
const fmtDay = (iso: string) => {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
};

export function HeightChart({ slug, initial, initialFrom, to, alertM, evacuationM }: Props) {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [cache, setCache] = useState<Record<string, { from: string; points: SeriesPoint[] }>>({
    [RANGES[0]!.key]: { from: initialFrom, points: initial },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = RANGES[rangeIdx]!;
  const current = cache[range.key] ?? cache[RANGES[0]!.key]!;

  async function pick(i: number) {
    setRangeIdx(i);
    setError(null);
    const r = RANGES[i]!;
    if (cache[r.key]) return;
    const from = new Date(new Date(to).getTime() - r.days * 86_400_000).toISOString();
    setLoading(true);
    try {
      const res = await fetch(`/api/stations/${slug}/readings?from=${encodeURIComponent(from)}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { readings: SeriesPoint[] };
      setCache((c) => ({ ...c, [r.key]: { from, points: body.readings } }));
    } catch {
      setError("No se pudo cargar ese período. Probá de nuevo en un rato.");
    } finally {
      setLoading(false);
    }
  }

  const l = layoutSeries(current.points, { width: W, height: H, alertM, evacuationM, from: current.from, to });
  const line = l.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = l.points.length ? `${l.points[0]!.x.toFixed(1)},${H} ${line} ${l.points.at(-1)!.x.toFixed(1)},${H}` : "";
  const last = l.points.at(-1);
  const mid = new Date((new Date(current.from).getTime() + new Date(to).getTime()) / 2).toISOString();
  const shown = cache[range.key] ? range : RANGES[0]!;

  return (
    <>
      <h2>{rangeHeadline(current.points, shown)}</h2>
      <div className="range-buttons" role="group" aria-label="Período de la gráfica">
        {RANGES.map((r, i) => (
          <button key={r.key} type="button" aria-pressed={i === rangeIdx} onClick={() => pick(i)}>
            {r.label}
          </button>
        ))}
      </div>
      {error && <p className="chart-error">{error}</p>}
      <svg
        className={loading ? "chart chart-loading" : "chart"}
        viewBox={`-4 -8 ${W + 8} ${H + 34}`}
        role="img"
        aria-label={`Altura del río en ${shown.phrase}: ${current.points.length} lecturas${last ? `, la última ${fmtM(current.points.at(-1)!.heightM)} m` : ""}.`}
      >
        {area && <polygon points={area} fill="var(--water)" opacity={0.3} />}
        {line && <polyline points={line} fill="none" stroke="var(--water)" strokeWidth={3} strokeLinejoin="round" />}
        {evacuationM !== null && (
          <line x1={0} x2={W} y1={l.yOf(evacuationM)} y2={l.yOf(evacuationM)} stroke="var(--evac)" strokeWidth={2} />
        )}
        {alertM !== null && (
          <line x1={0} x2={W} y1={l.yOf(alertM)} y2={l.yOf(alertM)} stroke="var(--alert)" strokeWidth={2} strokeDasharray="7 4" />
        )}
        {last && <circle cx={last.x} cy={last.y} r={6} fill="var(--ink)" />}
        <text x={0} y={H + 22} fontSize={14} fill="var(--muted)">{fmtDay(current.from)}</text>
        <text x={W / 2} y={H + 22} fontSize={14} fill="var(--muted)" textAnchor="middle">{fmtDay(mid)}</text>
        <text x={W} y={H + 22} fontSize={14} fill="var(--muted)" textAnchor="end">hoy</text>
      </svg>
    </>
  );
}
