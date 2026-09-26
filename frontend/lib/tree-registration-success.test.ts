import { describe, expect, it, vi } from "vitest";
import { notifyTreeRegistered } from "./tree-registration-success";

vi.mock("@/components/toast", () => ({
  showToast: vi.fn(),
}));

describe("notifyTreeRegistered", () => {
  it("shows a map deep link after registration", async () => {
    const { showToast } = await import("@/components/toast");
    notifyTreeRegistered({
      id: "tree-1",
      public_code: "BYOT-K84T-J2WD",
      latitude: 26.876,
      longitude: 75.744,
    });

    expect(showToast).toHaveBeenCalledWith("BYOT-K84T-J2WD registered.", {
      action: {
        label: "View on map",
        href: "/map?tree=tree-1&lat=26.876&lng=75.744",
      },
      durationMs: 8000,
    });
  });
});
