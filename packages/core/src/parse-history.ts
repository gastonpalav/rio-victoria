import * as cheerio from "cheerio";
import { ParseError } from "./errors";
import { parseHistoryDateTime } from "./time";

export type HistoryPoint = { ts: Date; heightM: number };

/** Lee /alturas/?page=historico&tiempo=N&id=ID. Devuelve orden ascendente por fecha. */
export function parseHistory(html: string): HistoryPoint[] {
  const $ = cheerio.load(html);
  const table = $("table.fpTable");
  if (table.length === 0) throw new ParseError("No se encontró la tabla de historial");

  const points: HistoryPoint[] = [];
  table.find("tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    const when = tds.eq(0).text().replace(/\s+/g, " ").trim();
    const raw = tds.eq(1).text().replace(/mts/i, "").replace(",", ".").trim();
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return;
    let ts: Date;
    try {
      ts = parseHistoryDateTime(when);
    } catch {
      return;
    }
    points.push({ ts, heightM: Number(raw) });
  });
  return points.sort((a, b) => a.ts.getTime() - b.ts.getTime());
}
