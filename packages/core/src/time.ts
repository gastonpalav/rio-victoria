/** Prefectura publica en hora argentina (UTC−3 fijo, sin horario de verano). */
const ART_OFFSET_HOURS = 3;

const MONTHS: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5, JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
};

function artToUtc(y: number, mo: number, d: number, h: number, mi: number): Date {
  return new Date(Date.UTC(y, mo, d, h + ART_OFFSET_HOURS, mi));
}

/** "18/NOV/26 - 1600" → Date (UTC). */
export function parsePrefecturaDateTime(s: string): Date {
  const m = /^\s*(\d{1,2})\/([A-Z]{3})\/(\d{2})\s*-\s*(\d{2})(\d{2})\s*$/i.exec(s);
  const month = m ? MONTHS[m[2]!.toUpperCase()] : undefined;
  if (!m || month === undefined) throw new Error(`Fecha de Prefectura inválida: "${s}"`);
  return artToUtc(2000 + Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]));
}

/** "2026-11-18 06:00" → Date (UTC). */
export function parseHistoryDateTime(s: string): Date {
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})\s*$/.exec(s);
  if (!m) throw new Error(`Fecha de historial inválida: "${s}"`);
  return artToUtc(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

/** Date → "18/11 16:00" en hora argentina. */
export function formatArt(d: Date): string {
  const a = new Date(d.getTime() - ART_OFFSET_HOURS * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(a.getUTCDate())}/${p(a.getUTCMonth() + 1)} ${p(a.getUTCHours())}:${p(a.getUTCMinutes())}`;
}
