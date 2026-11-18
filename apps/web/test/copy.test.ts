import { describe, it, expect } from "vitest";
import { cm } from "@/lib/copy";

describe("cm", () => {
  it("menos de un metro en centímetros", () => {
    expect(cm(0.05)).toBe("5 cm");
    expect(cm(-0.71)).toBe("71 cm");
  });
  it("un metro o más en metros, con coma", () => {
    expect(cm(1.4)).toBe("1,40 m");
    expect(cm(-2.05)).toBe("2,05 m");
  });
});
