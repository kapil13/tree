import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { isNetworkFailure } from "@/lib/offline/tree-registration-sync";

describe("tree-registration-sync", () => {
  it("detects axios network failures", () => {
    const err = new AxiosError("Network Error", "ERR_NETWORK");
    expect(isNetworkFailure(err)).toBe(true);
  });

  it("ignores HTTP error responses", () => {
    const err = new AxiosError("Bad Request", "ERR_BAD_REQUEST");
    err.response = {
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config: { headers: {} as never },
      data: {},
    };
    expect(isNetworkFailure(err)).toBe(false);
  });
});
