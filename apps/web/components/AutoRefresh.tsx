"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Cada cuánto se vuelven a pedir los datos con la pestaña a la vista. */
export const REFRESH_EVERY_MS = 10 * 60_000;
/** Al volver a la pestaña, se piden de nuevo si pasó al menos esto desde la última vez. */
export const REFRESH_ON_RETURN_AFTER_MS = 60_000;

/**
 * Mantiene la página al día sin recargarla. Un celular deja la pestaña abierta días enteros y,
 * al volver, la restaura tal cual: sin esto mostraba la lectura de cuando se abrió y el aviso de
 * "dato viejo" culpaba a Prefectura de no haber publicado.
 */
export function AutoRefresh({ refresh }: { refresh?: () => void }) {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const doRefresh = () => {
      last.current = Date.now();
      if (refresh) refresh();
      else router.refresh();
    };
    const onReturn = (e?: PageTransitionEvent) => {
      if (document.visibilityState !== "visible") return;
      if (e?.persisted || Date.now() - last.current >= REFRESH_ON_RETURN_AFTER_MS) doRefresh();
    };
    const onVisibility = () => onReturn();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") doRefresh();
    }, REFRESH_EVERY_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("focus", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("focus", onVisibility);
    };
  }, [router, refresh]);

  return null;
}
