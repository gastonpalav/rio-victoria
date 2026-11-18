import { getStationsData } from "@/lib/data";

const HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "Access-Control-Allow-Origin": "*",
};

export async function GET() {
  return Response.json(await getStationsData(), { headers: HEADERS });
}
