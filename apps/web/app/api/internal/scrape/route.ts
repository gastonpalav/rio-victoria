import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { runBackfill, runScrape } from "@rio/scraper/jobs";
import { fetchPrefectura } from "@rio/scraper/fetch";
import { getDb, READINGS_TAG } from "@/lib/data";
import { checkSecret } from "@/lib/secret";

export const maxDuration = 300;

/** Lo llama el cron de Railway cada 30 min. Corre en gru1 (San Pablo): Prefectura bloquea otras IPs. */
export async function POST(request: NextRequest) {
  if (!checkSecret(request.headers.get("authorization"), process.env.SCRAPE_SECRET)) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }
  const mode = request.nextUrl.searchParams.get("mode") ?? "scrape";
  try {
    const db = getDb();
    const result =
      mode === "gapfill"
        ? await runBackfill(db, fetchPrefectura, { days: 7, pauseMs: 300 })
        : await runScrape(db, fetchPrefectura);
    revalidateTag(READINGS_TAG, "max");
    return Response.json({ mode, ...result }, { status: result.ok ? 200 : 207 });
  } catch (e) {
    return Response.json({ mode, ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
