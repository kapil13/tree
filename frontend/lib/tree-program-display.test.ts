import { describe, expect, it } from "vitest";
import {
  buildProgramNameMap,
  formatProgramCode,
  programTooltip,
} from "./tree-program-display";

describe("formatProgramCode", () => {
  it("uppercases known program codes", () => {
    expect(formatProgramCode("byot")).toBe("BYOT");
    expect(formatProgramCode("nhai_highway")).toBe("NHAI_HIGHWAY");
  });

  it("returns dash when missing", () => {
    expect(formatProgramCode(null)).toBe("—");
    expect(formatProgramCode("")).toBe("—");
  });
});

describe("programTooltip", () => {
  const names = buildProgramNameMap([{ code: "byot", name: "BYOT Public" }]);

  it("includes catalog name when available", () => {
    expect(programTooltip("byot", names)).toBe("BYOT · BYOT Public");
  });

  it("falls back to code only", () => {
    expect(programTooltip("campa", names)).toBe("CAMPA");
  });
});
