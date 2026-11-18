import type { CSSProperties } from "react";
import type { StationDto } from "@/lib/api";
import { TREND_LABEL, changeSentence, fmtM, levelSentence } from "@/lib/copy";
import { heroScale } from "@/lib/scale";
import { ReadingMeta, StaleBanner } from "./Freshness";
import { TrendIcon } from "./TrendIcon";

/**
 * La pantalla es la regla: el agua llena la pantalla hasta la altura real, la escala va pintada
 * sobre el borde izquierdo y los niveles de Prefectura cruzan de lado a lado.
 */
export function Hero({ station: s }: { station: StationDto }) {
  if (s.heightM === null || s.ts === null) {
    return (
      <section className="river-hero river-hero-empty">
        <p>Todavía no hay lecturas de este puerto. Prefectura puede tardar en publicarlas.</p>
      </section>
    );
  }
  const sc = heroScale(s.heightM, s.alertM, s.evacuationM);
  const level = levelSentence(s);
  const change = changeSentence(s);
  const vars = { "--level": sc.level } as CSSProperties;

  const marks = [];
  const labels = [];
  for (let d = Math.round(sc.bottom * 10); d < Math.round(sc.top * 10); d++) {
    const y = (sc.top - (d + 1) / 10) * 100; // en cm desde arriba
    marks.push(
      <g key={d}>
        <rect x={0} y={y} width={9} height={5} />
        <rect x={9} y={y} width={22} height={1} />
        <rect x={9} y={y + 2} width={22} height={1} />
        <rect x={9} y={y + 4} width={22} height={1} />
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
    <section className="river-hero" style={vars}>
      <div className="staff" role="img" aria-label={`Regla: el agua marca ${fmtM(s.heightM)} metros en ${s.name}.${s.alertM !== null && s.evacuationM !== null ? ` Nivel de alerta ${fmtM(s.alertM)}, nivel de evacuación ${fmtM(s.evacuationM)}.` : ""}`}>
        <svg viewBox={`0 0 58 ${sc.span * 100}`} preserveAspectRatio="none" aria-hidden="true">
          <rect x={0} y={0} width={58} height={sc.span * 100} className="staff-enamel" />
          <g className="staff-marks">{marks}</g>
        </svg>
        {labels}
      </div>

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

      <div className="reading">
        <StaleBanner ts={s.ts} periodHours={s.periodHours} initialStale={s.stale} />
        <span className="big-number">{fmtM(s.heightM)}</span>
        <span className="unit">metros en {s.name}</span>
      </div>

      <div className="water">
        <svg className="wave wave-back" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 20 Q 75 6 150 20 T 300 20 T 450 20 T 600 20 T 750 20 T 900 20 T 1050 20 T 1200 20 V40 H0 Z" />
        </svg>
        <svg className="wave wave-front" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 22 Q 100 10 200 22 T 400 22 T 600 22 T 800 22 T 1000 22 T 1200 22 V40 H0 Z" />
        </svg>
        <div className="water-text">
          {s.trend && (
            <div className="trend">
              <TrendIcon trend={s.trend} size={26} />
              <span>{TREND_LABEL[s.trend]}</span>
            </div>
          )}
          {(change || level) && <p className="sentence">{[change, level].filter(Boolean).join(" ")}</p>}
          <ReadingMeta ts={s.ts} periodHours={s.periodHours} initialStale={s.stale} name={s.name} />
        </div>
      </div>
    </section>
  );
}
