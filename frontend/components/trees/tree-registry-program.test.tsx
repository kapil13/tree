import { describe, expect, it } from "vitest";
import { formatProgramCode, programTooltip } from "@/lib/tree-program-display";

describe("tree registry program column", () => {
  it("renders BYOT program codes in uppercase", () => {
    expect(formatProgramCode("byot")).toBe("BYOT");
  });

  it("shows catalog name in tooltip when available", () => {
    const names = new Map([["byot", "BYOT Public"]]);
    expect(programTooltip("byot", names)).toBe("BYOT · BYOT Public");
  });
});
