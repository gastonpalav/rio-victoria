import Link from "next/link";
import type { StationDto } from "@/lib/api";
import { fmtM, travelNote, upstreamNote } from "@/lib/copy";
import type { Travel } from "@/lib/extras";
import { StaleTag } from "./Freshness";

const H = 220; // alto de cada regla en px
const PX_PER_M = 80;
const EVAC_Y = 60; // todas las reglas alinean su línea de evacuación a esta altura

/** Una regla chica por puerto, con la línea de evacuación de cada uno a la misma altura: se ve cuál está pasada. */
function MiniStaff({ s, here }: { s: StationDto; here: boolean }) {
  if (s.heightM === null || s.evacuationM === null || s.alertM === null) return null;
  const y = (h: number) => EVAC_Y + (s.evacuationM! - h) * PX_PER_M;
  const water = Math.max(0, Math.min(H, y(s.heightM)));
  const marks = [];
  const top = s.evacuationM + EVAC_Y / PX_PER_M;
  for (let d = Math.floor((top - H / PX_PER_M) * 10); d <= Math.ceil(top * 10); d++) {
    const yy = y((d + 1) / 10);
    if (yy < -10 || yy > H) continue;
    marks.push(
      <g key={d}>
        <rect x={0} y={yy} width={5} height={PX_PER_M * 0.05} />
        <rect x={5} y={yy} width={14} height={PX_PER_M * 0.01} />
        <rect x={5} y={yy + PX_PER_M * 0.02} width={14} height={PX_PER_M * 0.01} />
        <rect x={5} y={yy + PX_PER_M * 0.04} width={14} height={PX_PER_M * 0.01} />
      </g>,
    );
  }
  return (
    <svg width={56} height={H} viewBox={`0 0 56 ${H}`} className={here ? "mini mini-here" : "mini"} aria-hidden="true">
      <rect x={0} y={0} width={34} height={H} className="staff-enamel" />
      <g className="staff-marks">{marks}</g>
      <rect x={0} y={water} width={56} height={H - water} className="mini-water" />
      <line x1={0} x2={56} y1={y(s.evacuationM)} y2={y(s.evacuationM)} className="mini-evac" />
      <line x1={0} x2={56} y1={y(s.alertM)} y2={y(s.alertM)} className="mini-alert" />
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
        Las reglas están alineadas en su línea de evacuación (la roja). Debajo de cada puerto, cuánto suele tardar en
        notarse en {here?.name ?? "este puerto"} lo que pasa allá, según el último año de lecturas.
      </p>
      <ol className="staffs">
        {row.map(({ s, here: isHere }) => {
          const note = upstreamNote(s);
          const body = (
            <>
              <MiniStaff s={s} here={isHere} />
              <span className="staff-name">{isHere ? `${s.name} (acá)` : s.name}</span>
              <span className="staff-value">{s.heightM === null ? "—" : fmtM(s.heightM)}</span>
              {!isHere && travel[s.slug] && <span className="staff-travel">{travelNote(travel[s.slug]!)}</span>}
              {note && <span className={s.level === "evacuacion" ? "staff-note staff-note-over" : "staff-note"}>{note}</span>}
              {s.ts && (
                <span className="staff-note">
                  <StaleTag ts={s.ts} periodHours={s.periodHours} initialStale={s.stale} />
                </span>
              )}
            </>
          );
          return (
            <li key={s.slug} aria-current={isHere ? "location" : undefined}>
              {isHere ? <div className="staff-cell">{body}</div> : <Link href={`/${s.slug}`} className="staff-cell">{body}</Link>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
