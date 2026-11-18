import Link from "next/link";
import type { StationDto } from "@/lib/api";
import { fmtM, upstreamNote } from "@/lib/copy";
import { StaleTag } from "./Freshness";
import { TrendIcon } from "./TrendIcon";

/** El río como una línea que baja: de los puertos de arriba hasta el que estás mirando. */
export function Upstream({ stations, here }: { stations: StationDto[]; here?: StationDto }) {
  if (stations.length === 0) return null;
  const fromFar = [...stations].reverse();
  return (
    <section className="depth depth-2">
      <div className="inner">
        <h2>Lo que viene de arriba</h2>
        <p className="lead">El agua que pasa por estos puertos llega aguas abajo en los días siguientes.</p>
        <ol className="river-line">
          {fromFar.map((u) => {
            const note = upstreamNote(u);
            const over = u.level === "evacuacion" || u.level === "alerta";
            return (
              <li key={u.slug}>
                <Link href={`/${u.slug}`} className="river-stop">
                  <span className="stop-dot" aria-hidden="true" />
                  <span className="stop-name">
                    <strong>{u.name}</strong>
                    {note && <span className={over ? "note note-over" : "note"}>{note}</span>}
                  </span>
                  <span className="stop-value">
                    <span className="mid-number">{u.heightM === null ? "—" : fmtM(u.heightM)}</span>
                    <span className="trend-short">
                      {u.trend && <TrendIcon trend={u.trend} size={16} />}
                      {u.ts && <StaleTag ts={u.ts} periodHours={u.periodHours} initialStale={u.stale} />}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          {here && here.heightM !== null && (
            <li className="river-here" aria-current="location">
              <span className="river-stop">
                <span className="stop-dot" aria-hidden="true" />
                <span className="stop-name">
                  <strong>{here.name}</strong>
                  <span className="note">acá</span>
                </span>
                <span className="stop-value">
                  <span className="mid-number">{fmtM(here.heightM)}</span>
                </span>
              </span>
            </li>
          )}
        </ol>
      </div>
    </section>
  );
}
