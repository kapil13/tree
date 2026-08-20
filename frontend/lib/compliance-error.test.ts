import { describe, expect, it } from "vitest";
import axios, { AxiosError } from "axios";
import { errorMessage } from "./api";

describe("compliance error messages", () => {
  it("reads compliance_errors from error.details when message is generic", () => {
    const err = new AxiosError("Request failed", "ERR_BAD_REQUEST");
    err.response = {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: {} as AxiosError["config"],
      data: {
        error: {
          code: "http_error",
          message: "Error",
          details: {
            compliance_errors: [
              {
                violation_type: "species_not_allowed",
                severity: "block",
                message:
                  "Species 'Test' is not in the approved list for this work area.",
              },
            ],
            mode: "strict",
          },
        },
      },
    };
    expect(errorMessage(err)).toBe(
      "Species 'Test' is not in the approved list for this work area.",
    );
  });

  it("uses readable message from backend when present", () => {
    const err = new AxiosError("Request failed", "ERR_BAD_REQUEST");
    err.response = {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: {} as AxiosError["config"],
      data: {
        error: {
          code: "compliance_failed",
          message: "Species 'Neem' is not in the approved list for this work area.",
          details: {
            compliance_errors: [
              {
                message: "Species 'Neem' is not in the approved list for this work area.",
              },
            ],
          },
        },
      },
    };
    expect(errorMessage(err)).toContain("Neem");
  });
});
