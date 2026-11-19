import { stationOgImage } from "@/lib/og";

/** La imagen vertical para compartir (estados de WhatsApp, historias). Misma caché que el resto: 5 minutos. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const img = await stationOgImage(slug, "story");
  const headers = new Headers(img.headers);
  headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  headers.set("Content-Disposition", `inline; filename="regla-${slug}.png"`);
  return new Response(img.body, { status: img.status, headers });
}
