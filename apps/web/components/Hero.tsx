import { formatArt } from "@rio/core";
import type { StationDto } from "@/lib/api";
import { TREND_LABEL, changeSentence, fmtM, levelSentence } from "@/lib/copy";
import { LevelGauge } from "./LevelGauge";
import { RelativeTime } from "./RelativeTime";
import { TrendIcon } from "./TrendIcon";

export function Hero({ station: s }: { station: StationDto }) {
  if (s.heightM === null || s.ts === null) {
    return (
      <section className="hero hero-empty">
        <p>Todavía no hay lecturas de este puerto. Prefectura puede tardar en publicarlas.</p>
      </section>
    );
  }
  const when = formatArt(new Date(s.ts));
  const level = levelSentence(s);
  const change = changeSentence(s);
  const hasGauge = s.alertM !== null && s.evacuationM !== null;

  return (
    <section className={hasGauge ? "hero" : "hero hero-nogauge"}>
      <LevelGauge heightM={s.heightM} alertM={s.alertM} evacuationM={s.evacuationM} />
      <div className="hero-text">
        {s.stale && (
          <p className="stale" role="status">
            Prefectura no publicó datos nuevos desde {when}. Esta es la última lectura disponible.
          </p>
        )}
        <div className="reading">
          <span className="big-number">{fmtM(s.heightM)}</span>
          <span className="unit">metros en {s.name}</span>
        </div>
        {s.trend && (
          <div className="trend">
            <TrendIcon trend={s.trend} />
            <span>{TREND_LABEL[s.trend]}</span>
          </div>
        )}
        {(change || level) && <p className="sentence">{[change, level].filter(Boolean).join(" ")}</p>}
        {hasGauge && (
          <ul className="legend">
            <li>
              <span className="swatch swatch-evac" aria-hidden="true" />
              Evacuación <strong>{fmtM(s.evacuationM!)}</strong>
            </li>
            <li>
              <span className="swatch swatch-alert" aria-hidden="true" />
              Alerta <strong>{fmtM(s.alertM!)}</strong>
            </li>
          </ul>
        )}
        {!s.stale && (
          <p className="meta">
            Lectura de Prefectura del {when} (<RelativeTime iso={s.ts} />).
            {s.periodHours ? ` ${s.name} informa cada ${s.periodHours} h.` : ""}
          </p>
        )}
      </div>
    </section>
  );
}
