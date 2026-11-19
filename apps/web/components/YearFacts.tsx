import type { CSSProperties } from "react";
import { cm, fmtM, rateText } from "@/lib/copy";

type Props = {
  rate: number | null;
  daysAboveAlert: number | null;
  lastYearM: number | null;
  nowM: number | null;
  alertM?: number | null;
  evacuationM?: number | null;
};

const H = 300; // alto de la pared en px
const LABEL_GAP = 74; // alto de un rótulo (título + detalle) más aire: entre dos marcas, como mínimo
const MAX_PX_PER_M = 520;
const MAX_H = 500; // si el río cambió mucho en el año, la pared no se estira más que esto (los rótulos se corren)

type Mark = { key: string; m: number; kind: "now" | "year" | "alert"; title: string; detail: string | null };

/**
 * Como las marcas de las crecientes en las paredes del Litoral: hoy, hace un año y el nivel de alerta,
 * pintados a su altura real. Las cifras van siempre en texto nítido sobre la cal.
 */
export function YearFacts({ rate, daysAboveAlert, lastYearM, nowM, alertM = null }: Props) {
  if (nowM === null) return null;
  const rateFact = rate !== null ? rateText(rate) : null;
  const daysText =
    daysAboveAlert === null
      ? null
      : daysAboveAlert === 0
        ? "Ningún día por encima en los últimos 12 meses"
        : `${daysAboveAlert} día${daysAboveAlert === 1 ? "" : "s"} por encima en los últimos 12 meses`;

  const marks: Mark[] = [
    {
      key: "now",
      m: nowM,
      kind: "now",
      title: `Hoy ${fmtM(nowM)}`,
      detail: rateFact ? `${rateFact.figure} ${rateFact.rest}` : null,
    },
  ];
  if (lastYearM !== null) {
    const d = nowM - lastYearM;
    marks.push({
      key: "year",
      m: lastYearM,
      kind: "year",
      title: `Hace un año ${fmtM(lastYearM)}`,
      detail: Math.abs(d) < 0.005 ? "igual que hoy" : `hoy está ${cm(d)} más ${d > 0 ? "alto" : "bajo"}`,
    });
  }
  if (alertM !== null) marks.push({ key: "alert", m: alertM, kind: "alert", title: `Alerta ${fmtM(alertM)}`, detail: daysText });

  // Sin dibujo posible (solo el dato de hoy y nada para comparar): no se muestra la sección.
  if (marks.length === 1 && !daysText && !rateFact) return null;

  // Escala: al menos H px de alto, y estirada lo necesario para que el rótulo de una marca no pise la línea siguiente.
  const hi = Math.max(...marks.map((k) => k.m)) + 0.08;
  const lo = Math.min(...marks.map((k) => k.m)) - 0.3;
  const ms = marks.map((k) => k.m).sort((a, b) => b - a);
  const minGap = Math.min(Infinity, ...ms.slice(1).map((m, i) => ms[i]! - m).filter((g) => g > 0.01));
  const ppm = Math.min(MAX_PX_PER_M, MAX_H / (hi - lo), Math.max(H / (hi - lo), LABEL_GAP / minGap));
  const yOf = (m: number) => (hi - m) * ppm;
  const height = (hi - lo) * ppm;

  // Rótulos debajo de su línea; si dos quedan muy cerca, el de abajo se corre (la línea no se mueve).
  const sorted = [...marks].sort((a, b) => b.m - a.m);
  const placed: (Mark & { line: number; label: number })[] = [];
  for (const k of sorted) {
    const line = yOf(k.m);
    const prev = placed.at(-1)?.label ?? -Infinity;
    placed.push({ ...k, line, label: Math.max(line + 8, prev + LABEL_GAP) });
  }
  const tallest = Math.max(height, placed.at(-1)!.label + LABEL_GAP);

  const year = placed.find((k) => k.kind === "year");
  const now = placed.find((k) => k.kind === "now")!;

  return (
    <section className="year">
      <h2>Para comparar</h2>
      <div className="marks" style={{ height: tallest } as CSSProperties}>
        {year && Math.abs(year.line - now.line) > 30 && (
          <div
            className="marks-gap"
            style={{ top: Math.min(year.line, now.line), height: Math.abs(year.line - now.line) } as CSSProperties}
            aria-hidden="true"
          >
            <span>
              {nowM >= year.m ? "+" : "−"}
              {cm(nowM - year.m)}
            </span>
          </div>
        )}
        {placed.map((k) => (
          <div key={k.key} className={`mark mark-${k.kind}`}>
            <div className="mark-line" style={{ top: k.line }} aria-hidden="true" />
            <p className="mark-label" style={{ top: k.label }}>
              <span className="mark-title">{k.title}</span>
              {k.detail && <span className="mark-detail">{k.detail}</span>}
            </p>
          </div>
        ))}
      </div>
      {alertM === null && daysText && <p className="marks-extra">Nivel de alerta: {daysText.toLowerCase()}.</p>}
    </section>
  );
}
