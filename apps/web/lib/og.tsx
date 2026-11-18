import { ImageResponse } from "next/og";
import { formatArt } from "@rio/core";
import { fmtM, TREND_LABEL } from "./copy";
import { getStationPage } from "./data";
import { heroScale } from "./scale";
import { buildSurface } from "./surface";

export const ogSize = { width: 1200, height: 630 };
const W = ogSize.width;
const H = ogSize.height;
const STAFF_W = 64;

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
 * La tarjeta que aparece al compartir el link: la misma pared, con el agua de la última semana.
 * Lleva la hora de la lectura para que un link viejo no parezca actual.
 */
export async function stationOgImage(slug: string) {
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
      { ...ogSize, fonts },
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
    marks.push(`M0 ${y}h12v${u}h-12z`, `M12 ${y}h26v${u / 5}h-26z`, `M12 ${y + (2 * u) / 5}h26v${u / 5}h-26z`, `M12 ${y + (4 * u) / 5}h26v${u / 5}h-26z`);
    if (d % 2 === 0) labels.push({ y: yOf(d / 10), text: (d / 10).toFixed(1).replace(".", ",") });
  }

  const line = (h: number | null, color: string, dashed: boolean, text: string) =>
    h === null ? null : (
      <div style={{ position: "absolute", left: STAFF_W, right: 0, top: yOf(h) - 3, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", height: 0, borderTop: `${dashed ? 5 : 6}px ${dashed ? "dashed" : "solid"} ${color}` }} />
        <div style={{ display: "flex", alignSelf: "flex-start", marginLeft: 14, marginTop: 6, padding: "0 6px", background: C.wall, color, fontSize: 26, ...ST, letterSpacing: 1 }}>
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
          <div key={l.text} style={{ position: "absolute", left: 40, top: l.y - 9, display: "flex", fontSize: 16, ...ST, color: C.paint }}>
            {l.text}
          </div>
        ))}

        {line(s.evacuationM, C.evac, false, `EVACUACIÓN ${s.evacuationM === null ? "" : fmtM(s.evacuationM)}`)}
        {line(s.alertM, C.alert, true, `ALERTA ${s.alertM === null ? "" : fmtM(s.alertM)}`)}

        <div style={{ position: "absolute", left: STAFF_W + 26, top: 22, display: "flex", fontSize: 52, ...ST }}>regla</div>

        <div style={{ position: "absolute", right: 34, bottom: H - levelY + 6, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 30, color: C.paintSoft }}>metros en {s.name}</div>
          <div style={{ display: "flex", fontSize: 270, lineHeight: 0.8, ...ST }}>{fmtM(heightM)}</div>
        </div>

        <div style={{ position: "absolute", left: STAFF_W + 26, right: 34, bottom: 26, display: "flex", flexDirection: "column", color: C.onRiver }}>
          {s.trend && <div style={{ display: "flex", fontSize: 54, ...ST }}>{TREND_LABEL[s.trend]}</div>}
          <div style={{ display: "flex", fontSize: 24 }}>{when}. Sitio no oficial.</div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  );
}
