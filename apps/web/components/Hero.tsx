"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { formatArt } from "@rio/core/pure";
import type { StationDto } from "@/lib/api";
import { RANGES, rangeHeadline, type SeriesPoint } from "@/lib/chart";
import { TREND_LABEL, changeSentence, fmtM, levelSentence } from "@/lib/copy";
import { heroScale } from "@/lib/scale";
import { buildSurface } from "@/lib/surface";
import { ReadingMeta, StaleBanner } from "./Freshness";
import { ShareImage } from "./ShareImage";
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
  const inflight = useRef(new Map<string, Promise<boolean>>());
  const wallRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  // Rótulos de nivel que, en esta pantalla, quedarían encima del texto del agua (río muy alto): se ocultan
  // (sin dejar de ocupar lugar, así la medición no oscila) y sus valores se escriben en el agua.
  const [covered, setCovered] = useState<string[]>([]);
  useLayoutEffect(() => {
    const check = () => {
      const text = textRef.current?.getBoundingClientRect();
      const wall = wallRef.current;
      if (!text || !wall) return;
      const hit = [...wall.querySelectorAll<HTMLElement>("[data-level-label]")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.bottom > text.top - 6 && r.top < text.bottom && r.right > text.left && r.left < text.right;
        })
        .map((el) => el.dataset.levelLabel!);
      setCovered((prev) => (prev.join("|") === hit.join("|") ? prev : hit));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  });
  const end = to ?? s.ts ?? "";

  /** Trae un período. `from` va redondeado al día: la misma URL para todos → la sirve la caché de Vercel. */
  function load(i: number): Promise<boolean> {
    const r = RANGES[i]!;
    const pending = inflight.current.get(r.key);
    if (pending) return pending;
    const day = new Date(new Date(end).getTime() - r.days * 86_400_000).toISOString().slice(0, 10);
    const f = `${day}T00:00:00.000Z`;
    const p = fetch(`/api/stations/${s.slug}/readings?from=${day}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { readings: SeriesPoint[] };
        setCache((c) => ({ ...c, [r.key]: { from: f, points: body.readings } }));
        return true;
      })
      .catch(() => {
        inflight.current.delete(r.key);
        return false;
      });
    inflight.current.set(r.key, p);
    return p;
  }

  // Precarga los otros períodos en segundo plano, de a uno, así el botón responde al instante.
  useEffect(() => {
    if (!from || !end) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      for (let i = 1; i < RANGES.length && !cancelled; i++) await load(i);
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.slug]);

  if (s.heightM === null || s.ts === null) {
    return (
      <section className="wall wall-empty">
        <p>Todavía no hay lecturas de este puerto. Prefectura puede tardar en publicarlas.</p>
      </section>
    );
  }
  const heightM = s.heightM;
  const ts = s.ts;
  const range = RANGES[rangeIdx]!;
  const current = cache[range.key] ?? cache[RANGES[0]!.key] ?? { from: ts, points: [] };

  async function pick(i: number) {
    setRangeIdx(i);
    setError(null);
    if (cache[RANGES[i]!.key]) return;
    setLoading(true);
    const ok = await load(i);
    setLoading(false);
    if (!ok) setError("No se pudo cargar ese período. Probá de nuevo en un rato.");
  }

  // La escala incluye lo más bajo del período para que la superficie no se salga de la pared.
  const lowest = Math.min(heightM, ...current.points.map((p) => p.heightM));
  const sc = heroScale(heightM, s.alertM, s.evacuationM, lowest);
  const { surface, water } = buildSurface({
    points: current.points,
    from: current.from,
    to: end,
    now: { ts, heightM },
    yOf: (h) => (1 - sc.pos(h)) * 1000,
    width: 1000,
    height: 1060, // el fondo sigue debajo de la pared: el vaivén no deja ver el borde
  });

  const level = levelSentence(s);
  const change = changeSentence(s);
  const shownRange = cache[range.key] ? range : RANGES[0]!;
  const headline = current.points.length ? rangeHeadline(current.points, shownRange) : null;
  const showMax = yearMax !== null && Math.abs(yearMax.heightM - heightM) >= 0.02;
  // En el celular, justo encima del agua está el número grande: si la línea del máximo cae ahí, su rótulo quedaría
  // detrás de la cifra. En ese caso (solo en pantallas angostas) el dato va escrito en el agua.
  const maxBehindNumber = showMax && sc.pos(yearMax.heightM) > sc.level && sc.pos(yearMax.heightM) - sc.level < 0.32;
  const maxText = yearMax ? `Máximo del año ${fmtM(yearMax.heightM)}, ${formatArt(new Date(yearMax.ts)).split(" ")[0]}` : "";

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
    <section className="wall" ref={wallRef} style={{ "--level": sc.level } as CSSProperties}>
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
        <defs>
          {/* Más claro y verdoso arriba, donde pega la luz; cargado de sedimento abajo. */}
          <linearGradient id="agua-color" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--river-top)" />
            <stop offset="0.35" stopColor="var(--river)" />
            <stop offset="1" stopColor="var(--river-deep)" />
          </linearGradient>
          {/* Vetas de corriente: se repiten cada 240 unidades y corren con el río. */}
          {/* Vetas largas y desparejas en un módulo grande: que no se lea la grilla del patrón. */}
          <pattern id="corriente" width="720" height="260" patternUnits="userSpaceOnUse">
            <path
              d="M14 22h150M300 58h62M470 31h190M90 104h44M228 127h170M560 150h80M30 188h120M352 205h36M430 236h210M650 92h50"
              className="river-streak"
            />
          </pattern>
          <clipPath id="agua-forma">
            <polygon points={water} />
          </clipPath>
        </defs>
        <g className="river-bob">
          <polygon points={water} className="river-body" />
          <g clipPath="url(#agua-forma)">
            <rect x="-720" y="0" width="2440" height="1000" fill="url(#corriente)" className="river-current" />
          </g>
          <polyline points={surface} className="river-surface" vectorEffect="non-scaling-stroke" />
          <polyline points={surface} className="river-glint" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      {sc.evacuation !== null && s.evacuationM !== null && (
        <div className="threshold threshold-evac" style={{ bottom: `${sc.evacuation * 100}%` }}>
          <span data-level-label={`evacuación ${fmtM(s.evacuationM)}`} className={covered.includes(`evacuación ${fmtM(s.evacuationM)}`) ? "covered" : undefined}>
            Evacuación {fmtM(s.evacuationM)}
          </span>
        </div>
      )}
      {sc.alert !== null && s.alertM !== null && (
        <div className="threshold threshold-alert" style={{ bottom: `${sc.alert * 100}%` }}>
          <span data-level-label={`alerta ${fmtM(s.alertM)}`} className={covered.includes(`alerta ${fmtM(s.alertM)}`) ? "covered" : undefined}>
            Alerta {fmtM(s.alertM)}
          </span>
        </div>
      )}
      {showMax && (
        <div className="threshold threshold-max" style={{ bottom: `${sc.pos(yearMax.heightM) * 100}%` }}>
          <span className={maxBehindNumber ? "only-wide" : undefined}>{maxText}</span>
        </div>
      )}

      <div className="reading">
        <StaleBanner ts={ts} periodHours={s.periodHours} initialStale={s.stale} />
        <span className="unit">metros en {s.name}</span>
        <span className="big-number">{fmtM(heightM)}</span>
      </div>

      <div className="water-text" ref={textRef}>
        {headline && <p className="headline">{headline}</p>}
        {s.trend && (
          <div className="trend">
            <TrendIcon trend={s.trend} size={22} />
            <span>{TREND_LABEL[s.trend]}</span>
          </div>
        )}
        {(change || level) && <p className="sentence">{[change, level].filter(Boolean).join(" ")}</p>}
        {covered.length > 0 && <p className="meta">Bajo el agua, las líneas de Prefectura: {covered.join(" y ")}.</p>}
        {maxBehindNumber && <p className="meta only-narrow">{maxText} (la línea azul).</p>}
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
        <ShareImage slug={s.slug} name={s.name} />
      </div>
    </section>
  );
}
