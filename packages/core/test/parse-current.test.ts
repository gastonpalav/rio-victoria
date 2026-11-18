import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCurrentTable } from "../src/parse-current";
import { ParseError } from "../src/errors";

const html = readFileSync(new URL("./fixtures/main.html", import.meta.url), "utf8");

describe("parseCurrentTable", () => {
  const { rows, skipped } = parseCurrentTable(html);

  it("lee los 91 puertos (filas + salteadas)", () => {
    expect(rows.length + skipped.length).toBe(91);
  });
  it("lee Victoria completa", () => {
    const v = rows.find((r) => r.name === "VICTORIA")!;
    expect(v).toMatchObject({
      prefecturaId: 260, river: "PARANA", heightM: 4.85, variationM: 0.01, periodHours: 2,
      alertM: 4.6, evacuationM: 4.9, prevHeightM: 4.84, stateText: "ALERTA CRECE",
    });
    expect(v.ts.toISOString()).toBe("2026-11-18T19:00:00.000Z");
    expect(v.prevTs!.toISOString()).toBe("2026-11-18T17:00:00.000Z");
  });
  it("saca el id del link de historial", () => {
    expect(rows.find((r) => r.name === "ROSARIO")!.prefecturaId).toBe(280);
  });
  it("variación negativa con signo", () => {
    expect(rows.find((r) => r.name === "LIBERTAD")!.variationM).toBe(-0.6);
  });
  it("umbrales '-' quedan null (puertos de Brasil)", () => {
    const g = rows.find((r) => r.name === "GUAYRA (BRASIL)")!;
    expect(g.alertM).toBeNull();
    expect(g.evacuationM).toBeNull();
  });
  it("los puertos del Delta sí traen umbrales", () => {
    expect(rows.find((r) => r.name === "SAN PEDRO")).toMatchObject({ alertM: 3.4, evacuationM: 3.6 });
  });
  it("las filas S/E van a skipped", () => {
    expect(skipped.filter((s) => /S\/E/.test(s.reason)).length).toBe(2);
  });
  it("una fila rota se saltea sin romper el resto", () => {
    const broken = html.replace(/(VICTORIA<\/th>[\s\S]*?Ultimo Registro:"[^>]*>)4\.85/, "$1S/D");
    const r2 = parseCurrentTable(broken);
    expect(r2.rows.find((r) => r.name === "VICTORIA")).toBeUndefined();
    expect(r2.skipped).toContainEqual(expect.objectContaining({ name: "VICTORIA" }));
    expect(r2.rows.length).toBe(rows.length - 1);
  });
  it("página sin tabla lanza ParseError", () => {
    expect(() => parseCurrentTable("<html><body>Mantenimiento</body></html>")).toThrow(ParseError);
  });
});

describe("parseCurrentTable: cambios de estructura fallan ruidosamente", () => {
  it("si cambia el formato de fecha y se saltean casi todas las filas, lanza", () => {
    const broken = html.replace(/(\d{2})\/([A-Z]{3})\/(\d{2}) - (\d{4})/g, "$1-$2-$3 $4");
    expect(() => parseCurrentTable(broken)).toThrow(ParseError);
  });
  it("si desaparece la columna Alerta, lanza (no pisa umbrales con null)", () => {
    expect(() => parseCurrentTable(html.replaceAll('data-label="Alerta:"', 'data-label="Nivel Alerta:"'))).toThrow(ParseError);
  });
});

describe("parseCurrentTable: orden dentro del río", () => {
  it("una fila salteada no corre el orden de las demás", () => {
    const { rows } = parseCurrentTable(html);
    const diamante = rows.find((r) => r.name === "DIAMANTE")!.riverOrder;
    const broken = html.replace(/(SANTA FE<\/th>[\s\S]*?Ultimo Registro:"[^>]*>)[\d.]+/, "$1S/D");
    const r2 = parseCurrentTable(broken);
    expect(r2.rows.find((r) => r.name === "SANTA FE")).toBeUndefined();
    expect(r2.rows.find((r) => r.name === "DIAMANTE")!.riverOrder).toBe(diamante);
    expect(rows.find((r) => r.name === "SANTA FE")!.riverOrder).toBe(diamante - 1);
  });
});
