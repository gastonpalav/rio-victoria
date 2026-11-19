import { ImageResponse } from "next/og";
import { formatArt } from "@rio/core";
import { fmtM, TREND_LABEL } from "./copy";
import { getStationPage } from "./data";
import { heroScale } from "./scale";
import { buildSurface } from "./surface";

export const ogSize = { width: 1200, height: 630 };
/** Imagen vertical para estados de WhatsApp e historias: la pared a pantalla completa, como en el celular. */
export const storySize = { width: 1080, height: 1920 };

export type ImageFormat = "card" | "story";

/** Medidas de cada formato: la tarjeta del link (horizontal) y la imagen para compartir (vertical). */
const LAYOUT = {
  card: { ...ogSize, staff: 64, markW: 38, labelX: 40, labelSize: 16, logo: 52, number: 270, unit: 30, lineText: 26, pad: 34 },
  story: { ...storySize, staff: 96, markW: 58, labelX: 62, labelSize: 24, logo: 72, number: 400, unit: 38, lineText: 36, pad: 56 },
};


// Los mismos colores de la pared (ImageResponse no lee variables CSS).
const C = {
  wall: "#E4E8E5",
  paint: "#12283A",
  paintSoft: "#3D5263",
  riverTop: "#A8875A",
  river: "#977046",
  riverDeep: "#6A4A2A",
  riverLine: "#5C3D20",
  glint: "#F6E7CC",
  onRiver: "#FFF8EF",
  evac: "#C0121F",
  alert: "#A85F00",
  staff: "#FFFFFF",
};

/** "x,y x,y …" → trazo de path (el renderizador de la imagen no dibuja bien polygon/polyline). */
const toPath = (pts: string) => "M" + pts.split(" ").join("L");

/** Fuente estática desde Google Fonts (TTF, lo que acepta ImageResponse). Si falla, queda la de por defecto. */
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

/**
 * La pared con el agua de la última semana, en dos formatos: la tarjeta que aparece al compartir el link
 * y la imagen vertical del botón "Compartir imagen".
 * Lleva la hora de la lectura para que una imagen vieja no parezca actual.
 */
export async function stationOgImage(slug: string, format: ImageFormat = "card") {
  const L = LAYOUT[format];
  const W = L.width;
  const H = L.height;
  const STAFF_W = L.staff;
  const size = { width: W, height: H };
  const page = await getStationPage(slug);
  const s = page?.station;
  const [stencil, body] = await Promise.all([
    loadFont("Big+Shoulders+Stencil:wght@800"),
    loadFont("Atkinson+Hyperlegible+Next:wght@700"),
  ]);
  const fonts = [
    ...(stencil ? [{ name: "Stencil", data: stencil, weight: 800 as const, style: "normal" as const }] : []),
    ...(body ? [{ name: "Body", data: body, weight: 700 as const, style: "normal" as const }] : []),
  ];
  const ST = stencil ? { fontFamily: "Stencil" } : {};
  const base = { width: "100%", height: "100%", display: "flex", position: "relative" as const, background: C.wall, color: C.paint, ...(body ? { fontFamily: "Body" } : {}) };

  if (!page || !s || s.heightM === null || s.ts === null) {
    return new ImageResponse(
      (
        <div style={{ ...base, alignItems: "center", padding: 80, fontSize: 64 }}>
          <div style={{ display: "flex", ...ST, fontSize: 120 }}>regla</div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const heightM = s.heightM;
  const lowest = Math.min(heightM, ...page.series.map((p) => p.heightM));
  const sc = heroScale(heightM, s.alertM, s.evacuationM, lowest);
  const yOf = (h: number) => (1 - sc.pos(h)) * H;
  const { surface, water } = buildSurface({
    points: page.series,
    from: page.from,
    to: page.to,
    now: { ts: s.ts, heightM },
    yOf,
    width: W,
    height: H,
  });
  const levelY = yOf(heightM);

  // Regla: un "E" cada 10 cm, con el número cada 20 cm.
  const pxPerM = H / sc.span;
  const marks: string[] = [];
  const labels: { y: number; text: string }[] = [];
  for (let d = Math.round(sc.bottom * 10); d < Math.round(sc.top * 10); d++) {
    const y = (sc.top - (d + 1) / 10) * pxPerM;
    const u = pxPerM * 0.05;
    const b = L.markW * 0.3;
    const p = L.markW - b;
    marks.push(`M0 ${y}h${b}v${u}h-${b}z`, `M${b} ${y}h${p}v${u / 5}h-${p}z`, `M${b} ${y + (2 * u) / 5}h${p}v${u / 5}h-${p}z`, `M${b} ${y + (4 * u) / 5}h${p}v${u / 5}h-${p}z`);
    if (d % 2 === 0) labels.push({ y: yOf(d / 10), text: (d / 10).toFixed(1).replace(".", ",") });
  }

  const line = (h: number | null, color: string, dashed: boolean, text: string) =>
    h === null ? null : (
      <div style={{ position: "absolute", left: STAFF_W, right: 0, top: yOf(h) - 3, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 0, borderTop: `${dashed ? 5 : 6}px ${dashed ? "dashed" : "solid"} ${color}` }} />
        <div style={{ display: "flex", alignSelf: "flex-start", marginLeft: 14, marginTop: 6, padding: "0 6px", background: C.wall, color, fontSize: L.lineText, ...ST, letterSpacing: 1 }}>
          {text}
        </div>
      </div>
    );

  const when = `Lectura de Prefectura del ${formatArt(new Date(s.ts))}`;

  return new ImageResponse(
    (
      <div style={base}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.riverTop} />
              <stop offset="0.35" stopColor={C.river} />
              <stop offset="1" stopColor={C.riverDeep} />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={STAFF_W} height={H} fill={C.staff} />
          <path d={marks.join("")} fill={C.paint} />
          <path d={toPath(water) + "Z"} fill="url(#g)" fillOpacity={0.92} />
          <path d={toPath(surface)} fill="none" stroke={C.riverLine} strokeWidth={4} strokeLinejoin="round" />
          <path d={toPath(surface)} fill="none" stroke={C.glint} strokeWidth={2} strokeDasharray="4 60 18 110" strokeLinecap="round" />
        </svg>
        {labels.map((l) => (
          <div key={l.text} style={{ position: "absolute", left: L.labelX, top: l.y - L.labelSize * 0.55, display: "flex", fontSize: L.labelSize, ...ST, color: C.paint }}>
            {l.text}
          </div>
        ))}

        {line(s.evacuationM, C.evac, false, `EVACUACIÓN ${s.evacuationM === null ? "" : fmtM(s.evacuationM)}`)}
        {line(s.alertM, C.alert, true, `ALERTA ${s.alertM === null ? "" : fmtM(s.alertM)}`)}

        <div style={{ position: "absolute", left: STAFF_W + 26, top: 22, display: "flex", fontSize: L.logo, ...ST }}>regla</div>

        <div style={{ position: "absolute", right: L.pad, bottom: H - levelY + 6, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: L.unit, color: C.paintSoft }}>metros en {s.name}</div>
          <div style={{ display: "flex", fontSize: L.number, lineHeight: 0.8, ...ST }}>{fmtM(heightM)}</div>
        </div>

        {/* La imagen vertical va limpia: solo la pared y los niveles, sin frases. */}
        {format === "card" && (
          <div style={{ position: "absolute", left: STAFF_W + 26, right: L.pad, bottom: 26, display: "flex", flexDirection: "column", color: C.onRiver }}>
            {s.trend && <div style={{ display: "flex", fontSize: 54, ...ST }}>{TREND_LABEL[s.trend]}</div>}
            <div style={{ display: "flex", fontSize: 24 }}>{when}. Sitio no oficial.</div>
          </div>
        )}
      </div>
    ),
    { ...size, fonts },
  );
}
