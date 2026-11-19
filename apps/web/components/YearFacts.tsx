import { fmtM, lastYearText, rateText } from "@/lib/copy";

type Props = { rate: number | null; daysAboveAlert: number | null; lastYearM: number | null; nowM: number | null };

/** Tres datos del último año, escritos como frases: la cifra pintada, el resto en texto. */
export function YearFacts({ rate, daysAboveAlert, lastYearM, nowM }: Props) {
  const facts: { figure: string; rest: string }[] = [];
  if (rate !== null) facts.push(rateText(rate));
  if (daysAboveAlert !== null)
    facts.push(
      daysAboveAlert === 0
        ? { figure: "Ningún", rest: "día sobre el nivel de alerta en los últimos 12 meses." }
        : { figure: String(daysAboveAlert), rest: `día${daysAboveAlert === 1 ? "" : "s"} sobre el nivel de alerta en los últimos 12 meses.` },
    );
  if (lastYearM !== null && nowM !== null) facts.push(lastYearText(lastYearM, nowM));
  if (facts.length === 0) return null;
  return (
    <section className="year">
      <h2>Para comparar</h2>
      <ul className="facts">
        {facts.map((f) => (
          <li key={f.rest}>
            <span className="fact-figure">{f.figure}</span> {f.rest}
          </li>
        ))}
      </ul>
    </section>
  );
}
