import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { createTestDb } from "@rio/core/testing";

const mainHtml = readFileSync(new URL("../../../packages/core/test/fixtures/main.html", import.meta.url), "utf8");
const revalidateTag = vi.fn();
let db: Awaited<ReturnType<typeof createTestDb>>;

vi.mock("next/cache", () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a), cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@rio/scraper/fetch", async (importOriginal) => ({ ...(await importOriginal<object>()), fetchPrefectura: async () => mainHtml }));
vi.mock("@/lib/data", () => ({ getDb: () => db, READINGS_TAG: "readings" }));

const { POST } = await import("@/app/api/internal/scrape/route");
const req = (auth?: string) =>
  new NextRequest("http://localhost/api/internal/scrape?mode=scrape", { method: "POST", headers: auth ? { authorization: auth } : {} });

beforeEach(async () => {
  db = await createTestDb();
  revalidateTag.mockClear();
  process.env.SCRAPE_SECRET = "s3cr3t";
});

describe("POST /api/internal/scrape", () => {
  it("sin el secreto responde 401 y no toca nada", async () => {
    expect((await POST(req())).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("con el secreto lee, guarda y expira la caché de inmediato", async () => {
    const res = await POST(req("Bearer s3cr3t"));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("readings", { expire: 0 });
  });
});
