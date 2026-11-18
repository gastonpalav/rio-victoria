import Link from "next/link";
import type { StationDto } from "@/lib/api";
import { fmtM, upstreamNote } from "@/lib/copy";
import { StaleTag } from "./Freshness";

const TREND_SHORT = { crece: "sube", baja: "baja", estable: "estable" } as const;

export function Upstream({ stations }: { stations: StationDto[] }) {
  if (stations.length === 0) return null;
  return (
    <section className="block">
      <h2>Lo que viene de arriba</h2>
      <p className="lead">El agua que pasa por estos puertos llega aguas abajo en los días siguientes.</p>
      <ul className="upstream">
        {stations.map((u) => {
          const note = upstreamNote(u);
          const over = u.level === "evacuacion" || u.level === "alerta";
          return (
            <li key={u.slug}>
              <Link href={`/${u.slug}`} className="upstream-row">
                <span className="upstream-name">
                  <strong>{u.name}</strong>
                  {note && <span className={over ? "note note-over" : "note"}>{note}</span>}
                </span>
                <span className="upstream-value">
                  <span className="mid-number">{u.heightM === null ? "—" : fmtM(u.heightM)}</span>
                  <span className="trend-short">
                    {u.trend ? TREND_SHORT[u.trend] : ""}
                    {u.ts && <StaleTag ts={u.ts} periodHours={u.periodHours} initialStale={u.stale} />}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
