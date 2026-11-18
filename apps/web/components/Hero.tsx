"use client";
import { useState, type CSSProperties } from "react";
import { formatArt } from "@rio/core/pure";
import type { StationDto } from "@/lib/api";
import { RANGES, rangeHeadline, type SeriesPoint } from "@/lib/chart";
import { TREND_LABEL, changeSentence, fmtM, levelSentence } from "@/lib/copy";
import { heroScale } from "@/lib/scale";
import { ReadingMeta, StaleBanner } from "./Freshness";
import { TrendIcon } from "./TrendIcon";

type Props = {
  station: StationDto;
  series?: SeriesPoint[];
  from?: string;
  to?: string;
  yearMax?: { ts: string; heightM: number } | null;
};

/**
 * Una pared de la costanera con las marcas pintadas. El agua llega hasta la altura real
 * y su superficie es la serie de los últimos días: a la izquierda el río de antes, a la derecha el de hoy.
 */
export function Hero({ station: s, series = [], from, to, yearMax = null }: Props) {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [cache, setCache] = useState<Record<string, { from: string; points: SeriesPoint[] }>>(
    from ? { [RANGES[0]!.key]: { from, points: series } } : {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (s.heightM === null || s.ts === null) {
    return (
      <section className="wall wall-empty">
        <p>Todavía no hay lecturas de este puerto. Prefectura puede tardar en publicarlas.</p>
      </section>
    );
  }
  const heightM = s.heightM;
  const ts = s.ts;
  const end = to ?? ts;
  const range = RANGES[rangeIdx]!;
  const current = cache[range.key] ?? cache[RANGES[0]!.key] ?? { from: ts, points: [] };

  async function pick(i: number) {
    setRangeIdx(i);
    setError(null);
    const r = RANGES[i]!;
    if (cache[r.key]) return;
    const f = new Date(new Date(end).getTime() - r.days * 86_400_000).toISOString();
    setLoading(true);
    try {
      const res = await fetch(`/api/stations/${s.slug}/readings?from=${encodeURIComponent(f)}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { readings: SeriesPoint[] };
      setCache((c) => ({ ...c, [r.key]: { from: f, points: body.readings } }));
    } catch {
      setError("No se pudo cargar ese período. Probá de nuevo en un rato.");
    } finally {
      setLoading(false);
    }
  }

  // La escala incluye lo más bajo del período para que la superficie no se salga de la pared.
  const lowest = Math.min(heightM, ...current.points.map((p) => p.heightM));
  const sc = heroScale(heightM, s.alertM, s.evacuationM, lowest);
  const yOf = (h: number) => (1 - sc.pos(h)) * 1000;
  const t0 = new Date(current.from).getTime();
  const t1 = Math.max(new Date(end).getTime(), t0 + 1);
  const pts = [...current.points, { ts, heightM }]
    .map((p) => ({ x: ((new Date(p.ts).getTime() - t0) / (t1 - t0)) * 1000, y: yOf(p.heightM) }))
    .filter((p) => p.x >= 0 && p.x <= 1000)
    .sort((a, b) => a.x - b.x);
  if (pts[0]!.x > 0) pts.unshift({ x: 0, y: pts[0]!.y });
  if (pts.at(-1)!.x < 1000) pts.push({ x: 1000, y: pts.at(-1)!.y });
  const surface = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const water = `0,1000 ${surface} 1000,1000`;

  const level = levelSentence(s);
  const change = changeSentence(s);
  const shownRange = cache[range.key] ? range : RANGES[0]!;
  const headline = current.points.length ? rangeHeadline(current.points, shownRange) : null;
  const showMax = yearMax !== null && Math.abs(yearMax.heightM - heightM) >= 0.02;

  const marks = [];
  const labels = [];
  for (let d = Math.round(sc.bottom * 10); d < Math.round(sc.top * 10); d++) {
    const top = (sc.top - (d + 1) / 10) * 100;
    marks.push(
      <g key={d}>
        <rect x={0} y={top} width={9} height={5} />
        <rect x={9} y={top} width={22} height={1} />
        <rect x={9} y={top + 2} width={22} height={1} />
        <rect x={9} y={top + 4} width={22} height={1} />
      </g>,
    );
    if (d % 2 === 0) {
      labels.push(
        <span key={d} className="staff-label" style={{ bottom: `${sc.pos(d / 10) * 100}%` }}>
          {(d / 10).toFixed(1).replace(".", ",")}
        </span>,
      );
    }
  }

  return (
    <section className="wall" style={{ "--level": sc.level } as CSSProperties}>
      <svg className="paint-filter" aria-hidden="true" width="0" height="0">
        <filter id="pintado">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.5" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
      </svg>

      <div
        className="staff"
        role="img"
        aria-label={`Regla: el agua marca ${fmtM(heightM)} metros en ${s.name}.${s.alertM !== null && s.evacuationM !== null ? ` Nivel de alerta ${fmtM(s.alertM)}, nivel de evacuación ${fmtM(s.evacuationM)}.` : ""}`}
      >
        <svg viewBox={`0 0 58 ${sc.span * 100}`} preserveAspectRatio="none" aria-hidden="true">
          <rect x={0} y={0} width={58} height={sc.span * 100} className="staff-enamel" />
          <g className="staff-marks">{marks}</g>
        </svg>
        {labels}
      </div>

      <svg
        className={loading ? "river river-loading" : "river"}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points={water} className="river-body" />
        <polyline points={surface} className="river-surface" vectorEffect="non-scaling-stroke" />
      </svg>

      {sc.evacuation !== null && s.evacuationM !== null && (
        <div className="threshold threshold-evac" style={{ bottom: `${sc.evacuation * 100}%` }}>
          <span>Evacuación {fmtM(s.evacuationM)}</span>
        </div>
      )}
      {sc.alert !== null && s.alertM !== null && (
        <div className="threshold threshold-alert" style={{ bottom: `${sc.alert * 100}%` }}>
          <span>Alerta {fmtM(s.alertM)}</span>
        </div>
      )}
      {showMax && (
        <div className="threshold threshold-max" style={{ bottom: `${sc.pos(yearMax.heightM) * 100}%` }}>
          <span>
            Máximo del año {fmtM(yearMax.heightM)}, {formatArt(new Date(yearMax.ts)).split(" ")[0]}
          </span>
        </div>
      )}

      <div className="reading">
        <StaleBanner ts={ts} periodHours={s.periodHours} initialStale={s.stale} />
        <span className="unit">metros en {s.name}</span>
        <span className="big-number">{fmtM(heightM)}</span>
      </div>

      <div className="water-text">
        {headline && <p className="headline">{headline}</p>}
        {s.trend && (
          <div className="trend">
            <TrendIcon trend={s.trend} size={22} />
            <span>{TREND_LABEL[s.trend]}</span>
          </div>
        )}
        {(change || level) && <p className="sentence">{[change, level].filter(Boolean).join(" ")}</p>}
        <ReadingMeta ts={ts} periodHours={s.periodHours} initialStale={s.stale} name={s.name} />
        {from && (
          <div className="range" role="group" aria-label="Período que muestra la superficie del agua">
            {RANGES.map((r, i) => (
              <button key={r.key} type="button" aria-pressed={i === rangeIdx} onClick={() => pick(i)}>
                {r.label}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="range-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
