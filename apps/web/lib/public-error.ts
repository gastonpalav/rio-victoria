/** Mensaje de error apto para mostrar en /estado: nunca detalles internos (host, usuario, SQL). */
export function publicError(raw: string | null): string | null {
  if (raw === null) return null;
  const status = /Prefectura respondió (\d{3})/.exec(raw);
  if (status) return `Prefectura respondió ${status[1]}`;
  if (/timeout|timed out|aborted/i.test(raw)) return "Prefectura no respondió a tiempo";
  if (/ParseError|cambió (el formato|la estructura)|Falta la columna|Se saltearon/i.test(raw)) {
    return "cambió el formato de la página de Prefectura";
  }
  if (/fetch failed|ECONNRESET|ENOTFOUND/i.test(raw) && !/5432|postgres|query/i.test(raw)) return "no se pudo conectar con Prefectura";
  return "error interno";
}
