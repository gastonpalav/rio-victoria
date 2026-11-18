import { fmtM } from "@/lib/copy";

type Props = { heightM: number; alertM: number | null; evacuationM: number | null; height?: number };

/** La regla hidrométrica: marcas "E" cada 10 cm, el agua hasta la altura actual y los niveles de Prefectura. */
export function LevelGauge({ heightM, alertM, evacuationM, height = 440 }: Props) {
  if (alertM === null || evacuationM === null) return null;
  const top = Math.ceil((Math.max(evacuationM, heightM) + 0.3) * 10) / 10;
  const bottom = Math.floor((Math.min(alertM, heightM) - 0.8) * 10) / 10;
  const pad = 10;
  const scale = (height - 2 * pad) / (top - bottom); // px por metro
  const y = (h: number) => (top - h) * scale + pad;
  const unit = scale / 100; // px por cm

  const marks = [];
  for (let d = Math.round(bottom * 10); d < Math.round(top * 10); d++) {
    const yTop = y((d + 1) / 10);
    const left = d % 2 === 0;
    marks.push(
      <g key={d}>
        <rect x={left ? 20 : 57} y={yTop} width={7} height={unit * 5} fill="var(--mark)" />
        {[0, 2, 4].map((c) => (
          <rect key={c} x={left ? 27 : 35} y={yTop + unit * c} width={22} height={unit} fill="var(--mark)" />
        ))}
      </g>,
    );
  }
  const labels = [];
  // Etiquetas cada 20 cm; si la regla abarca más de 2 m, cada 50 cm para que no se amontonen.
  const step = top - bottom > 2 ? 5 : 2;
  for (let d = Math.ceil((bottom * 10) / step) * step; d <= Math.round(top * 10); d += step) {
    labels.push(
      <text key={d} x={70} y={y(d / 10) + 4} fontSize={12} fontWeight={700} fill="var(--muted)">
        {(d / 10).toFixed(1).replace(".", ",")}
      </text>,
    );
  }
  const wY = y(heightM);
  let wave = `M0 ${wY}`;
  for (let x = 0; x <= 132; x += 11) wave += ` Q${x + 5.5} ${wY + (x % 22 === 0 ? -3 : 3)} ${x + 11} ${wY}`;

  return (
    <svg
      className="gauge"
      width={132}
      height={height}
      viewBox={`0 0 132 ${height}`}
      role="img"
      aria-label={`Regla hidrométrica: el agua marca ${fmtM(heightM)} metros. Nivel de alerta ${fmtM(alertM)}, nivel de evacuación ${fmtM(evacuationM)}.`}
    >
      <rect x={20} y={pad} width={44} height={height - 2 * pad} fill="var(--staff)" />
      {marks}
      {labels}
      <rect x={0} y={wY} width={132} height={height - wY} fill="var(--water)" opacity={0.82} />
      <path d={wave} fill="none" stroke="var(--water-top)" strokeWidth={2} />
      <line x1={0} x2={132} y1={y(evacuationM)} y2={y(evacuationM)} stroke="var(--evac)" strokeWidth={3} />
      <line x1={0} x2={132} y1={y(alertM)} y2={y(alertM)} stroke="var(--alert)" strokeWidth={3} strokeDasharray="7 4" />
    </svg>
  );
}
