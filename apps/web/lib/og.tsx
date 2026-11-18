import { ImageResponse } from "next/og";
import { formatArt } from "@rio/core";
import { fmtM, TREND_LABEL, levelSentence } from "./copy";
import { getStationPage } from "./data";

export const ogSize = { width: 1200, height: 630 };

const C = { bg: "#F3F6F8", ink: "#14212B", muted: "#4F5E69", water: "#8B6640", staff: "#FFFFFF", evac: "#C2182B", alert: "#B86E00" };

/**
 * Fuente estática desde Google Fonts (TTF, lo que acepta ImageResponse; no soporta ejes variables,
 * por eso los números usan Archivo Narrow). Si falla, queda la fuente por defecto.
 */
async function loadFont(family: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}`, { signal: AbortSignal.timeout(4000) })
    ).text();
    const url = /src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
    if (!url) return null;
    return await (await fetch(url, { signal: AbortSignal.timeout(4000) })).arrayBuffer();
  } catch {
    return null;
  }
}

/** Imagen para WhatsApp/redes. Lleva la hora de la lectura para que un link viejo no parezca actual. */
export async function stationOgImage(slug: string) {
  const page = await getStationPage(slug);
  const s = page?.station;
  const height = s?.heightM ?? null;
  const when = s?.ts ? `Lectura de Prefectura del ${formatArt(new Date(s.ts))}` : "Sin lecturas todavía";
  const sentence = s ? levelSentence(s) : null;
  const [display, body] = await Promise.all([loadFont("Archivo+Narrow:wght@700"), loadFont("Archivo:wght@500")]);
  const fonts = [
    ...(display ? [{ name: "ArchivoDisplay", data: display, weight: 700 as const, style: "normal" as const }] : []),
    ...(body ? [{ name: "Archivo", data: body, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const D = display ? { fontFamily: "ArchivoDisplay" } : {};

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.bg, color: C.ink, padding: 64, gap: 56, ...(body ? { fontFamily: "Archivo" } : {}) }}>
        <div style={{ display: "flex", flexDirection: "column", width: 120, height: "100%", background: C.staff, position: "relative", border: `4px solid ${C.ink}` }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ display: "flex", height: 54, alignItems: "flex-start", justifyContent: i % 2 ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", width: 70, height: 27, borderLeft: `14px solid ${C.ink}`, flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ height: 5, background: C.ink, width: 56 }} />
                <div style={{ height: 5, background: C.ink, width: 56 }} />
                <div style={{ height: 5, background: C.ink, width: 56 }} />
              </div>
            </div>
          ))}
          <div style={{ position: "absolute", left: -4, right: -4, bottom: -4, height: "58%", background: C.water, opacity: 0.92 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, ...D }}>regla</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 40, color: C.muted }}>Altura del río en {s?.name ?? "Victoria"}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
              <div style={{ display: "flex", fontSize: 260, fontWeight: 800, letterSpacing: -6, lineHeight: 1, ...D }}>{height === null ? "—" : fmtM(height)}</div>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>m</div>
            </div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, ...D }}>
              {s?.trend ? TREND_LABEL[s.trend] : ""}
            </div>
            {sentence && <div style={{ display: "flex", fontSize: 30, marginTop: 8 }}>{sentence}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: C.muted }}>{when}. Sitio no oficial.</div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  );
}
