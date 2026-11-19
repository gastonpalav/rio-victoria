import { type Wind, windSentence } from "@/lib/wind";

/**
 * El viento ahora, como una manga de viento vista desde arriba (norte arriba): la manga apunta hacia donde sopla
 * y se infla con la velocidad. Con sudestada la franja se pinta de ocre.
 */
export function WindBand({ wind, name }: { wind: Wind | null; name: string }) {
  if (!wind) return null;
  const sudestada = wind.sudestadaNow || wind.sudestadaSoon;
  // Con poco viento la manga cae (se ve corta desde arriba); desde ~30 km/h queda estirada.
  const stretch = 0.6 + 0.4 * Math.min(1, wind.speedKmh / 30);
  const seg = 7 * stretch;
  const stripes = [0, 1, 2, 3, 4].map((i) => {
    const x0 = 6 + i * seg;
    const x1 = x0 + seg;
    const w0 = 7 - i * 0.9;
    const w1 = 7 - (i + 1) * 0.9;
    return (
      <polygon
        key={i}
        points={`${x0},${-w0} ${x1},${-w1} ${x1},${w1} ${x0},${w0}`}
        className={i % 2 === 0 ? "sock-red" : "sock-white"}
      />
    );
  });
  return (
    <section className={sudestada ? "wind wind-sudestada" : "wind"} aria-label={`Viento en ${name}`}>
      <svg className="windsock" viewBox="-50 -50 100 100" width="96" height="96" aria-hidden="true">
        <circle r="46" className="sock-ring" />
        <text y="-34" className="sock-n">
          N
        </text>
        {/* dirDeg es de dónde viene; la manga apunta hacia donde va (x positivo = este antes de rotar). */}
        <g transform={`rotate(${wind.dirDeg + 90})`}>
          {stripes}
          <rect x="4" y="-8.5" width="2.5" height="17" className="sock-ring-hoop" />
        </g>
        <circle r="4" className="sock-pole" />
      </svg>
      <p>{windSentence(wind)}</p>
    </section>
  );
}
