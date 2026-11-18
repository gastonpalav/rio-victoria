import type { NextRequest } from "next/server";
import { getReadingsData, roundedNowIso } from "@/lib/data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sp = request.nextUrl.searchParams;
  const r = await getReadingsData(slug, sp.get("from"), sp.get("to"), roundedNowIso());
  return Response.json(r.body, {
    status: r.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      ...(r.status === 200 ? { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } : {}),
    },
  });
}
