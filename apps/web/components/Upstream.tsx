import Link from "next/link";
import type { StationDto } from "@/lib/api";
import { fmtM, travelShort, upstreamDelta, upstreamNote } from "@/lib/copy";
import type { Travel } from "@/lib/extras";
import { StaleTag } from "./Freshness";

const H = 260; // alto de cada regla en px
const PX_PER_M = 80;
const EVAC_Y = 100; // todas las reglas alinean su línea de evacuación a esta altura (1,25 m de regla por encima)

/**
 * Una regla por puerto. Las columnas van pegadas y el agua ocupa todo su ancho:
 * el río forma un perfil escalonado de un puerto al siguiente, cortado por una sola línea roja.
 */
function MiniStaff({ s }: { s: StationDto }) {
  if (s.heightM === null || s.evacuationM === null || s.alertM === null) return <div className="mini mini-empty" />;
  const y = (h: number) => EVAC_Y + (s.evacuationM! - h) * PX_PER_M;
  const water = Math.max(0, Math.min(H, y(s.heightM)));
  const marks = [];
  const top = s.evacuationM + EVAC_Y / PX_PER_M;
  for (let d = Math.floor((top - H / PX_PER_M) * 10); d <= Math.ceil(top * 10); d++) {
    const yy = y((d + 1) / 10);
    if (yy < -10 || yy > H) continue;
    marks.push(
      <g key={d}>
        <rect x={34} y={yy} width={5} height={PX_PER_M * 0.05} />
        <rect x={39} y={yy} width={22} height={PX_PER_M * 0.01} />
        <rect x={39} y={yy + PX_PER_M * 0.02} width={22} height={PX_PER_M * 0.01} />
        <rect x={39} y={yy + PX_PER_M * 0.04} width={22} height={PX_PER_M * 0.01} />
      </g>,
    );
  }
  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="mini" aria-hidden="true">
      <rect x={32} y={0} width={36} height={H} className="staff-enamel" />
      <g className="staff-marks">{marks}</g>
      <rect x={0} y={water} width={100} height={H - water} className="mini-water" />
      <rect x={0} y={water} width={100} height={3} className="mini-surface" />
      <line x1={0} x2={100} y1={y(s.alertM)} y2={y(s.alertM)} className="mini-alert" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** El río baja de izquierda a derecha: los puertos de arriba y, al final, el que estás mirando. */
export function Upstream({ stations, here, travel = {} }: { stations: StationDto[]; here?: StationDto; travel?: Record<string, Travel> }) {
  if (stations.length === 0) return null;
  const row = [...stations].reverse().map((s) => ({ s, here: false }));
  if (here) row.push({ s: here, here: true });
  return (
    <section className="upstream">
      <h2>Lo que viene de arriba</h2>
      <p className="upstream-note">
        La línea roja es el nivel de evacuación de cada puerto. Los días, lo que suele tardar en notarse en{" "}
        {here?.name ?? "este puerto"}, según el último año de lecturas.
      </p>
      <div className="staffs-wrap">
        <ol className="staffs" style={{ "--evac-y": `${EVAC_Y}px`, "--staff-h": `${H}px` } as React.CSSProperties}>
          {row.map(({ s, here: isHere }) => {
            const delta = upstreamDelta(s);
            const note = upstreamNote(s);
            const t = travel[s.slug];
            const body = (
              <>
                <MiniStaff s={s} />
                <span className="staff-name">{s.name}</span>
                <span className="staff-value">{s.heightM === null ? "—" : fmtM(s.heightM)}</span>
                {delta && (
                  <span className={`staff-delta staff-delta-${delta.tone}`} aria-hidden="true">
                    <b>{delta.figure}</b> {delta.label}
                  </span>
                )}
                {note && <span className="sr-only">{note}.</span>}
                {!isHere && t && (
                  <span className="staff-travel">
                    <span className="sr-only">llega acá en </span>
                    {travelShort(t)}
                  </span>
                )}
                {s.ts && (
                  <span className="staff-stale">
                    <StaleTag ts={s.ts} periodHours={s.periodHours} initialStale={s.stale} />
                  </span>
                )}
              </>
            );
            return (
              <li key={s.slug} aria-current={isHere ? "location" : undefined} className={isHere ? "staff-here" : undefined}>
                {isHere && <span className="here-tag">acá</span>}
                {isHere ? <div className="staff-cell">{body}</div> : <Link href={`/${s.slug}`} className="staff-cell">{body}</Link>}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
