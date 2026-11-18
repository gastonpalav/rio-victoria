import { describe, it, expect } from "vitest";
import { triggerScrape, modeForNow } from "../src/trigger";

describe("triggerScrape", () => {
  it("hace POST con el secreto y devuelve el resultado", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true, inserted: 3 }), { status: 200 });
    };
    const r = await triggerScrape("https://x.vercel.app/api/internal/scrape", "s3", "scrape", fakeFetch as typeof fetch);
    expect(r).toMatchObject({ ok: true, inserted: 3 });
    expect(calls[0]!.url).toBe("https://x.vercel.app/api/internal/scrape?mode=scrape");
    expect(calls[0]!.init.method).toBe("POST");
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer s3");
  });
  it("lanza si la ruta responde error", async () => {
    const fakeFetch = async () => new Response(JSON.stringify({ ok: false, error: "timeout" }), { status: 502 });
    await expect(triggerScrape("https://x/api", "s3", "scrape", fakeFetch as unknown as typeof fetch)).rejects.toThrow(/502.*timeout/);
  });
});

describe("modeForNow", () => {
  it("gapfill una vez por día a las 06 UTC", () => {
    expect(modeForNow(new Date("2026-11-19T06:10:00Z"))).toBe("gapfill");
    expect(modeForNow(new Date("2026-11-19T06:40:00Z"))).toBe("scrape");
    expect(modeForNow(new Date("2026-11-19T12:00:00Z"))).toBe("scrape");
  });
});
