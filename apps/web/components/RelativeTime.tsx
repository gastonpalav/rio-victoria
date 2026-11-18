"use client";
import { useEffect, useState } from "react";
import { relativeAge } from "@/lib/copy";

/** "hace 40 min", calculado en el navegador con la hora de la lectura (no la del scrape). */
export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setText(relativeAge(iso, new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return text ? <span>{text}</span> : null;
}
