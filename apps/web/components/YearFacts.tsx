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

const H = 300; // alto mínimo de la regla en px
const MAX_H = 520; // si el río cambió mucho en el año, no se estira más que esto (los rótulos se corren)
const LABEL_H = 58; // alto de un rótulo (título + detalle) más aire
const STAFF_W = 44;

type Kind = "now" | "year" | "alert";
type Mark = { key: Kind; m: number; title: string; detail: string | null };

/**
 * Una regla chica con el agua de hoy y dos marcas pintadas a su altura: dónde estaba hace un año y el nivel
 * de alerta. Como en la pantalla principal: se ve de un vistazo si el agua está por encima o por debajo.
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

  // La frase que explica el dibujo.
  let lede: string | null = null;
  if (lastYearM !== null) {
    const d = nowM - lastYearM;
    lede =
      Math.abs(d) < 0.005
        ? "Hoy el río está igual que hace un año."
        : `Hoy el río está ${cm(d)} más ${d > 0 ? "alto" : "bajo"} que hace un año.`;
  }

  const marks: Mark[] = [
    { key: "now", m: nowM, title: `Hoy ${fmtM(nowM)}`, detail: rateFact ? `${rateFact.figure} ${rateFact.rest}` : null },
  ];
  if (lastYearM !== null) marks.push({ key: "year", m: lastYearM, title: `Hace un año ${fmtM(lastYearM)}`, detail: null });
  if (alertM !== null) marks.push({ key: "alert", m: alertM, title: `Alerta ${fmtM(alertM)}`, detail: daysText });
  if (marks.length === 1 && !daysText && !rateFact) return null;

  // Escala: lugar arriba para el rótulo de hoy, y estirada para que dos rótulos no se pisen.
  const top = Math.max(...marks.map((k) => k.m));
  const lo = Math.min(...marks.map((k) => k.m)) - 0.3;
  const hi = top + 0.05;
  const ms = marks.map((k) => k.m).sort((a, b) => b - a);
  const minGap = Math.min(Infinity, ...ms.slice(1).map((m, i) => ms[i]! - m).filter((g) => g > 0.01));
  const ppm = Math.min(MAX_H / (hi - lo), Math.max(H / (hi - lo), LABEL_H / minGap));
  // Arriba de la marca más alta queda lugar fijo (en px) para su rótulo.
  const yOf = (m: number) => LABEL_H + (hi - m) * ppm;
  const height = LABEL_H + (hi - lo) * ppm;
  const waterTop = yOf(nowM);

  // Hoy va rotulado arriba de su línea (sobre la pared); las demás marcas, debajo de la suya.
  // Si un rótulo pisaría al anterior, baja; si el de hoy no entra arriba, pasa abajo.
  const sorted = [...marks].sort((a, b) => b.m - a.m);
  const placed: (Mark & { line: number; label: number })[] = [];
  for (const k of sorted) {
    const line = yOf(k.m);
    const prevEnd = placed.length ? placed.at(-1)!.label + LABEL_H : -Infinity;
    let label = k.key === "now" ? line - LABEL_H + 4 : line + 6;
    if (label < prevEnd) label = Math.max(line + 6, prevEnd);
    placed.push({ ...k, line, label });
  }
  const tallest = Math.max(height, placed.at(-1)!.label + LABEL_H);

  // Regla: una marca cada 10 cm y el número cada 50 cm (cada 20 si la regla es corta).
  const step = ppm / 10 < 9 ? 5 : 2; // con menos de 9 px cada 10 cm, el número va cada medio metro
  const ticks: { y: number; label: string | null }[] = [];
  const staffTop = hi + LABEL_H / ppm;
  for (let d = Math.ceil(lo * 10); d <= Math.floor(staffTop * 10); d++) {
    ticks.push({ y: yOf(d / 10), label: d % step === 0 ? (d / 10).toFixed(1).replace(".", ",") : null });
  }

  return (
    <section className="year">
      <h2>Para comparar</h2>
      {lede && <p className="year-lede">{lede}</p>}
      <div className="marks" style={{ height: tallest, "--staff-w": `${STAFF_W}px` } as CSSProperties}>
        <div className="marks-staff" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t.y} className={t.label ? "tick tick-major" : "tick"} style={{ top: t.y }}>
              {t.label && <b>{t.label}</b>}
            </span>
          ))}
        </div>
        <div className="marks-water" style={{ top: waterTop }} aria-hidden="true" />
        {placed.map((k) => {
          const underwater = k.key !== "now" && k.line > waterTop + 2;
          const labelInWater = k.label > waterTop;
          return (
            <div key={k.key} className={`mark mark-${k.key}${underwater ? " mark-under" : ""}`}>
              <div className="mark-line" style={{ top: k.line }} aria-hidden="true" />
              <p className={labelInWater ? "mark-label mark-label-water" : "mark-label"} style={{ top: k.label }}>
                <span className="mark-title">{k.title}</span>
                {k.detail && <span className="mark-detail">{k.detail}</span>}
              </p>
            </div>
          );
        })}
      </div>
      {alertM === null && daysText && <p className="marks-extra">Nivel de alerta: {daysText.toLowerCase()}.</p>}
    </section>
  );
}
