import type { Metadata } from "next";
import { formatArt } from "@rio/core";
import { fmtM, TREND_LABEL } from "./copy";
import { cacheLife, cacheTag } from "next/cache";
import { getStationPage, READINGS_TAG } from "./data";

export async function stationMetadata(slug: string, path: string): Promise<Metadata> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  cacheTag(READINGS_TAG);
  const page = await getStationPage(slug);
  if (!page) return { title: "Puerto no encontrado — regla" };
  const s = page.station;
  const title = s.heightM !== null ? `${s.name}: ${fmtM(s.heightM)} m — regla` : `${s.name} — regla`;
  const description =
    s.heightM !== null && s.ts && s.trend
      ? `Río ${s.river === "PARANA" ? "Paraná" : s.river.toLowerCase()} en ${s.name}: ${fmtM(s.heightM)} m, ${TREND_LABEL[s.trend].toLowerCase()}. Lectura de Prefectura del ${formatArt(new Date(s.ts))}.`
      : `Altura del río en ${s.name}, con datos de Prefectura Naval Argentina.`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, locale: "es_AR" } };
}
