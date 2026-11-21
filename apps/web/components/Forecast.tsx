"use client";
import type { CSSProperties } from "react";
import type { StationDto } from "@/lib/api";
import { cm, dayLabel, fmtM, forecastLevelNote } from "@/lib/copy";
import type { ForecastView } from "@/lib/extras";
import { useStale } from "./Freshness";

const H = 240; // alto del dibujo en px
const PAD_M = 0.06; // aire arriba y abajo, en metros
const NEAR_M = 0.35; // un nivel de Prefectura se dibuja si queda a menos de esto del rango

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`);

/**
 * Cómo puede estar el río en unos días: una franja pintada por día, a la misma escala que el agua de hoy.
 * Es una estimación propia: siempre un rango, con lo que se equivocó el método cuando se lo puso a prueba.
 * Si el dato de hoy es viejo no se muestra nada; eso se vuelve a mirar en el navegador, como en el resto de la
 * página, porque la pestaña puede quedar abierta.
 */
export function Forecast({
  forecast,
  station,
  inaShown = false,
}: {
  forecast: ForecastView | null;
  station: StationDto;
  /** Si se muestra el pronóstico del INA debajo, el link al INA ya está ahí. */
  inaShown?: boolean;
}) {
  if (!forecast || forecast.days.length === 0 || station.heightM === null || station.ts === null) return null;
  return <ForecastBody forecast={forecast} station={station} nowM={station.heightM} ts={station.ts} inaShown={inaShown} />;
}

function ForecastBody({
  forecast,
  station,
  nowM,
  ts,
  inaShown,
}: {
  forecast: ForecastView;
  station: StationDto;
  nowM: number;
  ts: string;
  inaShown: boolean;
}) {
  const stale = useStale(ts, station.periodHours, station.stale);
  if (stale) return null;
  const { days } = forecast;

  const min = Math.min(nowM, ...days.map((d) => d.loM));
  const max = Math.max(nowM, ...days.map((d) => d.hiM));
  const levels = [
    { key: "alert", name: "alerta", m: station.alertM },
    { key: "evac", name: "evacuación", m: station.evacuationM },
  ].filter((l): l is { key: string; name: string; m: number } => l.m !== null && l.m > min - NEAR_M && l.m < max + NEAR_M);
  const lo = Math.min(min, ...levels.map((l) => l.m)) - PAD_M;
  const hi = Math.max(max, ...levels.map((l) => l.m)) + PAD_M;
  const y = (m: number) => ((hi - m) / (hi - lo)) * H;

  const note = forecastLevelNote(days, station);
  const errorList = (pick: (d: (typeof days)[number]) => number) =>
    days.map((d) => `a ${d.ahead} día${d.ahead === 1 ? "" : "s"}, ${cm(pick(d))}`).join("; ");
  // Con el río movido le erra más que en el promedio: si en las últimas semanas fue así, se dice.
  const worseLately = days.some((d) => Math.round(d.recentMaeM * 100) > Math.round(d.maeM * 100));

  return (
    <section className="forecast">
      <h2>Cómo puede seguir</h2>
      <p className="forecast-lede">
        Una estimación propia, no oficial, del promedio de cada día. Sale de cómo viene el río acá y de lo que ya pasó en{" "}
        {list(forecast.from)}.
      </p>
      {note && <p className="forecast-note">{note}</p>}
      <div className="fc-wrap">
        <div className="fc" style={{ "--fc-h": `${H}px` } as CSSProperties}>
          <div className="fc-water" aria-hidden="true" style={{ top: y(nowM), height: H - y(nowM) }} />
          {levels.map((l) => (
            <div key={l.key} className={`fc-level fc-level-${l.key}`} aria-hidden="true" style={{ top: y(l.m) }}>
              <span>
                {l.name} {fmtM(l.m)}
              </span>
            </div>
          ))}
          <ol className="fc-cols">
            <li className="fc-col fc-today">
              <div className="fc-plot" aria-hidden="true" />
              <span className="fc-day">Hoy</span>
              <span className="fc-range">{fmtM(nowM)}</span>
            </li>
            {days.map((d) => {
              const { weekday, dayOfMonth } = dayLabel(d.date);
              return (
                <li key={d.date} className="fc-col">
                  <div className="fc-plot" aria-hidden="true">
                    <span className="fc-band" style={{ top: y(d.hiM), height: Math.max(6, y(d.loM) - y(d.hiM)) }} />
                  </div>
                  <span className="fc-day">
                    <span>{weekday}</span> <span>{dayOfMonth}</span>
                  </span>
                  <span className="fc-range">
                    <span className="sr-only">entre </span>
                    {fmtM(d.loM) === fmtM(d.hiM) ? (
                      fmtM(d.loM)
                    ) : (
                      <>
                        <span>{fmtM(d.loM)}</span> <span>a {fmtM(d.hiM)}</span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <p className="forecast-proof">
        <b>Cuánto le erra.</b> Se hizo esta misma cuenta para cada uno de los últimos {forecast.tested} días, usando solo lo que
        se sabía ese día, y se comparó con lo que después pasó. En promedio se equivocó: {errorList((d) => d.maeM)}.
        {worseLately && <> En las últimas semanas, con el río más movido, erró más: {errorList((d) => d.recentMaeM)}.</>}
        {forecast.coverage !== null && <> El río quedó dentro del rango el {Math.round(forecast.coverage * 100)}% de las veces.</>}
      </p>
      <details className="fc-how">
        <summary>Cómo se calcula</summary>
        <p>Es una cuenta simple, mitad y mitad:</p>
        <div className="fc-formula" role="group" aria-label="La fórmula">
          <p>
            <span className="fc-term">cambio</span> = ½ × <span className="fc-term">tendencia</span> + ½ ×{" "}
            <span className="fc-term">lo que viene de arriba</span>
          </p>
        </div>
        <dl className="fc-terms">
          <dt>Tendencia</dt>
          <dd>Cuánto subió o bajó acá en los últimos 3 días, al mismo ritmo. Si subió 30 cm en 3 días, a 5 días suma 50 cm.</dd>
          <dt>Lo que viene de arriba</dt>
          <dd>
            Lo que ya subió o bajó en {list(forecast.from)} y todavía no llegó acá. También mira cómo vienen esos puertos
            y este en los últimos 3 días. Cuánto tarda el agua y cuánto pesa cada dato sale del último año (mínimos
            cuadrados), por separado para 1, 3 y 5 días.
          </dd>
          <dt>El rango</dt>
          <dd>
            Es lo que se equivocó la cuenta cuando se la probó, sin el 8% de errores más grandes de cada lado. Si
            últimamente se equivocó más, el rango se agranda.
          </dd>
        </dl>
        <p>
          Si para algún día no le gana por un 10% a decir “queda igual” o no le gana a seguir la tendencia, ese día no
          aparece. No sabe nada de lluvias ni de represas: solo mira alturas.
        </p>
      </details>
      {!inaShown && (
        <p className="forecast-proof">
          Los pronósticos oficiales del Paraná los publica el{" "}
          <a href="https://www.ina.gob.ar/alerta/" rel="noopener">
            Instituto Nacional del Agua
          </a>
          .
        </p>
      )}
    </section>
  );
}
