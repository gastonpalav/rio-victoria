import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseHistory } from "../src/parse-history";
import { ParseError } from "../src/errors";

const hist = readFileSync(new URL("./fixtures/hist-260.html", import.meta.url), "utf8");

describe("parseHistory", () => {
  const pts = parseHistory(hist);
  it("lee el año completo de Victoria", () => {
    expect(pts.length).toBe(715);
  });
  it("devuelve orden ascendente", () => {
    expect(pts[0]).toEqual({ ts: new Date("2025-11-18T15:00:00Z"), heightM: 3.37 });
    expect(pts.at(-1)).toEqual({ ts: new Date("2026-11-18T09:00:00Z"), heightM: 4.74 });
  });
  it("tabla vacía devuelve []", () => {
    expect(parseHistory('<table class="table fpTable"><tbody></tbody></table>')).toEqual([]);
  });
  it("sin tabla lanza ParseError", () => {
    expect(() => parseHistory("<html></html>")).toThrow(ParseError);
  });
});
