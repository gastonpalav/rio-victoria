import { createDb, parseCurrentTable } from "@rio/core";
import { migrateDb } from "@rio/core/migrate";
import { fetchPrefectura, PREFECTURA_BASE } from "./fetch";
import { runBackfill, runScrape } from "./jobs";
import { modesForNow, triggerScrape } from "./trigger";

const mode = process.argv[2] ?? process.env.SCRAPER_MODE ?? "scrape";

async function main() {
  if (mode === "probe") {
    const t = Date.now();
    const html = await fetchPrefectura(PREFECTURA_BASE);
    const { rows, skipped } = parseCurrentTable(html);
    const v = rows.find((r) => r.name === "VICTORIA");
    console.log(`[probe] ok ${html.length} bytes en ${Date.now() - t} ms · ${rows.length} filas, ${skipped.length} salteadas · Victoria ${v?.heightM} m (${v?.ts.toISOString()})`);
    return;
  }

  if (mode === "trigger") {
    const target = process.env.SCRAPE_URL;
    const secret = process.env.SCRAPE_SECRET;
    if (!target || !secret) throw new Error("Faltan SCRAPE_URL o SCRAPE_SECRET");
    for (const m of modesForNow(new Date())) {
      const r = await triggerScrape(target, secret, m);
      console.log(`[trigger] ${m} ok`, JSON.stringify(r));
    }
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");

  if (mode === "migrate") {
    await migrateDb(url);
    console.log("[migrate] ok");
    return;
  }

  const db = createDb(url, { max: 2 });
  if (mode === "scrape") {
    const r = await runScrape(db, fetchPrefectura);
    console.log(`[scrape] ok · ${r.inserted} lecturas nuevas · ${r.skipped} salteadas`);
    const now = new Date();
    if (now.getUTCHours() === 6 && now.getUTCMinutes() < 30) {
      const g = await runBackfill(db, fetchPrefectura, { days: 7 });
      console.log(`[gapfill] ${g.ok ? "ok" : "con errores"} · ${g.inserted} nuevas`);
    }
  } else if (mode === "backfill" || mode === "gapfill") {
    const r = await runBackfill(db, fetchPrefectura, { days: mode === "backfill" ? 365 : 7 });
    console.log(`[${mode}] ${r.ok ? "ok" : "con errores"} · ${r.inserted} nuevas · ${r.skipped} estaciones fallidas`);
    if (!r.ok) process.exitCode = 1;
  } else {
    throw new Error(`Modo desconocido: ${mode} (trigger | scrape | backfill | gapfill | probe | migrate)`);
  }
  process.exit(process.exitCode ?? 0);
}

main().catch((e) => {
  console.error(`[${mode}] ERROR`, e);
  process.exit(1);
});
