"use client";
import { useEffect, useRef, useState } from "react";

type State = "idle" | "working" | "ready" | "error";

/**
 * Arma la imagen vertical de la pared y abre el menú de compartir del teléfono (WhatsApp, Instagram…).
 * Donde no se pueden compartir archivos (la compu), la descarga.
 *
 * Safari solo abre el menú de compartir justo después de un toque: por eso la imagen se precarga, y si igual
 * no llegó a tiempo, el botón queda listo para un segundo toque.
 */
export function ShareImage({ slug, name }: { slug: string; name: string }) {
  const [state, setState] = useState<State>("idle");
  const file = useRef<Promise<File> | null>(null);

  function load(): Promise<File> {
    file.current ??= fetch(`/${slug}/historia`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return new File([await res.blob()], `rio-${slug}.png`, { type: "image/png" });
      })
      .catch((e) => {
        file.current = null;
        throw e;
      });
    return file.current;
  }

  useEffect(() => {
    const t = setTimeout(() => load().catch(() => {}), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function share() {
    setState("working");
    let f: File;
    try {
      f = await load();
    } catch {
      setState("error");
      return;
    }
    const url = slug === "victoria" ? location.origin : `${location.origin}/${slug}`;
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], title: `El río en ${name}`, text: url });
        setState("idle");
      } catch (e) {
        const n = (e as Error).name;
        // Cerrar el menú no es un error; NotAllowedError = se venció el toque mientras bajaba la imagen.
        setState(n === "AbortError" ? "idle" : n === "NotAllowedError" ? "ready" : "error");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    setState("idle");
  }

  const label =
    state === "working" ? "Armando la imagen…" : state === "ready" ? "Imagen lista: tocá para compartir" : "Compartir imagen";
  // Arriba, al lado del puerto: un ícono cuadrado para no agrandar el texto que va dentro del agua.
  return (
    <div className="share">
      <button
        type="button"
        onClick={share}
        disabled={state === "working"}
        aria-busy={state === "working"}
        aria-label={label}
        title={label}
        className={state === "ready" ? "is-ready" : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15V3M7 8l5-5 5 5" />
          <path d="M5 12v9h14v-9" />
        </svg>
      </button>
      {state === "error" && (
        <p className="share-msg" role="alert">
          No se pudo armar la imagen. Probá de nuevo en un rato.
        </p>
      )}
      {state === "ready" && (
        <p className="share-msg" role="status">
          Imagen lista: tocá de nuevo para compartir.
        </p>
      )}
    </div>
  );
}
