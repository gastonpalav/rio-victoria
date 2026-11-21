import type { StationDto } from "@/lib/api";
import { fmtM, inaLevelNote, inaRunLabel, inaWeekLabel } from "@/lib/copy";
import { INA_PAGE, type InaForecast as Ina } from "@/lib/ina";

/**
 * El pronóstico oficial del INA: la altura promedio de las próximas semanas, tal como lo publica, con la fecha de
 * su corrida. Va aparte de la estimación propia porque mide otra cosa (promedio semanal, no rango diario).
 */
export function InaForecast({ ina, station, withEstimate = false }: { ina: Ina | null; station: StationDto; withEstimate?: boolean }) {
  if (!ina || ina.weeks.length === 0) return null;
  return (
    <section className="forecast ina" aria-labelledby="ina-title">
      <h2 id="ina-title">Lo que pronostica el INA</h2>
      <p className="forecast-lede">
        <span className="ina-tag">Oficial</span> Altura promedio de cada semana · corrida del {inaRunLabel(ina.runDate)}
      </p>
      <ol className="ina-weeks">
        {ina.weeks.map((w) => {
          const note = inaLevelNote(w, station);
          return (
            <li key={w.start} className="ina-week">
              <span className="ina-when">{inaWeekLabel(w)}</span>
              <span className="ina-value">
                {fmtM(w.loM) === fmtM(w.hiM) ? `${fmtM(w.loM)} m` : `${fmtM(w.loM)} a ${fmtM(w.hiM)} m`}
              </span>
              {note && <span className="ina-note">{note}</span>}
            </li>
          );
        })}
      </ol>
      <p className="forecast-proof">
        Es el promedio de cada semana, no el pico.
        {withEstimate && " La estimación de arriba es el promedio de cada día."} Pronóstico completo en el{" "}
        <a href={INA_PAGE} rel="noopener">
          Instituto Nacional del Agua
        </a>
        .
      </p>
    </section>
  );
}
