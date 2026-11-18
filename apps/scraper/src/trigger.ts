export type TriggerMode = "scrape" | "gapfill";

/** A las 06:00–06:29 UTC rellena huecos con el historial de 7 días; el resto del día, lectura normal. */
export function modeForNow(now: Date): TriggerMode {
  return now.getUTCHours() === 6 && now.getUTCMinutes() < 30 ? "gapfill" : "scrape";
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
  return body;
}
