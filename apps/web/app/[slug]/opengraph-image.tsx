import { ogSize, stationOgImage } from "@/lib/og";

export const alt = "Altura del río en este puerto";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return stationOgImage(slug);
}
