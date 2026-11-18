import { describe, it, expect } from "vitest";
import { slugify, displayName } from "../src/slug";

describe("slug y nombres", () => {
  it("slugify", () => {
    expect(slugify("SANTA FE")).toBe("santa-fe");
    expect(slugify("REPRESA ITAIPÚ (BRASIL)")).toBe("represa-itaipu-brasil");
    expect(slugify("VICTORIA")).toBe("victoria");
  });
  it("displayName", () => {
    expect(displayName("PARANA")).toBe("Paraná");
    expect(displayName("SAN LORENZO")).toBe("San Lorenzo");
  });
});
