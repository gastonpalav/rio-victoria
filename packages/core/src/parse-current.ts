import * as cheerio from "cheerio";
import { ParseError } from "./errors";
import { parsePrefecturaDateTime } from "./time";

export type CurrentRow = {
  prefecturaId: number;
  name: string;
  river: string;
  heightM: number;
  variationM: number | null;
  periodHours: number | null;
  ts: Date;
  stateText: string;
  prevHeightM: number | null;
  prevTs: Date | null;
  alertM: number | null;
  evacuationM: number | null;
};

export type SkippedRow = { name: string; reason: string };

function num(s: string | undefined): number | null {
  if (s === undefined) return null;
  const t = s.replace(/mts/i, "").replace(",", ".").trim();
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

function dateOrNull(s: string | undefined): Date | null {
  if (!s) return null;
  try {
    return parsePrefecturaDateTime(s);
  } catch {
    return null;
  }
}

/** Lee la tabla principal de https://contenidosweb.prefecturanaval.gob.ar/alturas/ */
export function parseCurrentTable(html: string): { rows: CurrentRow[]; skipped: SkippedRow[] } {
  const $ = cheerio.load(html);
  const trs = $("tr").filter((_, tr) => $(tr).find('th[data-label="Puerto:"]').length > 0);
  if (trs.length === 0) throw new ParseError("No se encontraron filas de puertos en la tabla de Prefectura");

  const rows: CurrentRow[] = [];
  const skipped: SkippedRow[] = [];
  let sawHeightColumn = false;

  trs.each((_, tr) => {
    const $tr = $(tr);
    const cell = (label: string) => {
      const td = $tr.find(`td[data-label="${label}"]`);
      return td.length ? td.text().replace(/\s+/g, " ").trim() : undefined;
    };
    const name = $tr.find('th[data-label="Puerto:"]').text().replace(/\s+/g, " ").trim();
    const rawHeight = cell("Ultimo Registro:");
    if (rawHeight !== undefined) sawHeightColumn = true;

    const href = $tr.find('a[href*="historico"]').attr("href") ?? "";
    const idMatch = /[?&]id=(\d+)/.exec(href);
    const heightM = num(rawHeight);
    const ts = dateOrNull(cell("Fecha Hora:"));

    if (!idMatch) return void skipped.push({ name, reason: "sin id de historial" });
    if (heightM === null) return void skipped.push({ name, reason: `altura no numérica: ${rawHeight ?? "(falta)"}` });
    if (ts === null) return void skipped.push({ name, reason: `fecha inválida: ${cell("Fecha Hora:") ?? "(falta)"}` });

    rows.push({
      prefecturaId: Number(idMatch[1]),
      name,
      river: cell("Río:") ?? "",
      heightM,
      variationM: num(cell("Variacion")),
      periodHours: num(cell("Periodo")),
      ts,
      stateText: cell("Estado:") ?? "",
      prevHeightM: num(cell("Registro Anterior:")),
      prevTs: dateOrNull(cell("Fecha Anterior:")),
      alertM: num(cell("Alerta:")),
      evacuationM: num(cell("Evacuación:")),
    });
  });

  if (!sawHeightColumn) throw new ParseError('Falta la columna "Ultimo Registro:" — cambió la estructura de la página');
  return { rows, skipped };
}
