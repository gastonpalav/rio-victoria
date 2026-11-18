import { describe, it, expect } from "vitest";
import { publicError } from "@/lib/public-error";

describe("publicError", () => {
  it("no expone detalles de la base", () => {
    expect(publicError('Failed query: select ... connect ECONNREFUSED 10.0.0.3:5432 user "postgres"')).toBe("error interno");
  });
  it("traduce los errores de Prefectura", () => {
    expect(publicError("Prefectura respondió 503 para https://...")).toBe("Prefectura respondió 503");
    expect(publicError("The operation was aborted due to timeout")).toBe("Prefectura no respondió a tiempo");
    expect(publicError("Se saltearon 80 de 91 filas — ¿cambió el formato?")).toBe("cambió el formato de la página de Prefectura");
  });
  it("null queda null", () => {
    expect(publicError(null)).toBeNull();
  });
});
