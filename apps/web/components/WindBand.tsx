import { type Wind, windSentence } from "@/lib/wind";

/** El viento ahora. La flecha apunta hacia donde sopla; con sudestada la franja se pinta de ocre. */
export function WindBand({ wind, name }: { wind: Wind | null; name: string }) {
  if (!wind) return null;
  const sudestada = wind.sudestadaNow || wind.sudestadaSoon;
  return (
    <section className={sudestada ? "wind wind-sudestada" : "wind"} aria-label={`Viento en ${name}`}>
      <svg className="wind-arrow" viewBox="-20 -20 40 40" width="44" height="44" aria-hidden="true">
        <g transform={`rotate(${wind.dirDeg + 180})`}>
          <path d="M0 -15 L8 2 L2 0 L2 15 L-2 15 L-2 0 L-8 2 Z" />
        </g>
      </svg>
      <p>{windSentence(wind)}</p>
    </section>
  );
}
