import { describe, expect, it } from "vitest";

import { splitInlineLinks } from "./inline-links";

describe("splitInlineLinks", () => {
  it("returns plain text unchanged", () => {
    expect(splitInlineLinks("Audit-prep evidence only.")).toEqual([
      { type: "text", text: "Audit-prep evidence only." },
    ]);
  });

  it("splits a relative keyword anchor", () => {
    expect(
      splitInlineLinks(
        "Read [plantation MRV software India](/resources/plantation-mrv-software-india) before you pilot.",
      ),
    ).toEqual([
      { type: "text", text: "Read " },
      {
        type: "link",
        label: "plantation MRV software India",
        href: "/resources/plantation-mrv-software-india",
      },
      { type: "text", text: " before you pilot." },
    ]);
  });

  it("leaves external and protocol-relative targets as text", () => {
    const external = "See [outreach](https://example.com) and [other](//example.com/path).";
    expect(splitInlineLinks(external)).toEqual([{ type: "text", text: external }]);
  });
});
