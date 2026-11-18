"use client";
import { useEffect, useState } from "react";
import { formatArt, staleness } from "@rio/core/pure";
import { RelativeTime } from "./RelativeTime";

/**
 * La frescura se calcula en el navegador con la hora actual: la página viene de una caché del servidor
 * y el flag `stale` que trae puede haber quedado congelado. El valor del servidor es solo el inicial.
 */
export function useStale(ts: string, periodHours: number | null, initial: boolean): boolean {
  const [stale, setStale] = useState(initial);
  useEffect(() => {
    const check = () => setStale(staleness(new Date(ts), periodHours, new Date()).stale);
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [ts, periodHours]);
  return stale;
}

type Props = { ts: string; periodHours: number | null; initialStale: boolean; name: string };

export function StaleBanner({ ts, periodHours, initialStale }: Omit<Props, "name">) {
  const stale = useStale(ts, periodHours, initialStale);
  if (!stale) return null;
  return (
    <p className="stale" role="status">
      Prefectura no publicó datos nuevos desde {formatArt(new Date(ts))}. Esta es la última lectura disponible.
    </p>
  );
}

export function ReadingMeta({ ts, periodHours, initialStale, name }: Props) {
  const stale = useStale(ts, periodHours, initialStale);
  if (stale) return null;
  return (
    <p className="meta">
      Lectura de Prefectura del {formatArt(new Date(ts))} (<RelativeTime iso={ts} />).
      {periodHours ? ` ${name} informa cada ${periodHours} h.` : ""}
    </p>
  );
}

export function StaleTag({ ts, periodHours, initialStale }: Omit<Props, "name">) {
  const stale = useStale(ts, periodHours, initialStale);
  return stale ? <>dato viejo</> : null;
}
