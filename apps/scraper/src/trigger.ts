export type TriggerMode = "scrape" | "gapfill";

/** A las 06:00–06:29 UTC rellena huecos con el historial de 7 días; el resto del día, lectura normal. */
export function modeForNow(now: Date): TriggerMode {
  return now.getUTCHours() === 6 && now.getUTCMinutes() < 30 ? "gapfill" : "scrape";
}

/** Modos a correr en este turno del cron: siempre la lectura; a las 06 UTC, además, el relleno de huecos. */
export function modesForNow(now: Date): TriggerMode[] {
  return modeForNow(now) === "gapfill" ? ["scrape", "gapfill"] : ["scrape"];
}

/** Pide a la ruta de Vercel (gru1) que haga la lectura. Prefectura no acepta conexiones desde Railway. */
export async function triggerScrape(url: string, secret: string, mode: TriggerMode, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${url}?mode=${mode}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(290_000),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`La ruta de scrape respondió ${res.status}: ${String(body.error ?? "")}`);
  // 207 = corrió pero con fallas (p. ej. algunas estaciones del gapfill): que el cron lo marque como fallido.
  if (body.ok === false) throw new Error(`La ruta de scrape terminó con fallas (ok:false): ${JSON.stringify(body)}`);
  return body;
}
