import { describe, expect, it } from "vitest";
import { authErrorMessage, paymentErrorMessage } from "@/lib/auth-payment-messages";

describe("paymentErrorMessage", () => {
  it("explains missing Razorpay config", () => {
    expect(paymentErrorMessage("payments_not_configured")).toMatch(/RAZORPAY_KEY/);
  });

  it("maps verify failures", () => {
    expect(paymentErrorMessage("invalid_signature")).toMatch(/verification failed/i);
    expect(paymentErrorMessage("order_not_found")).toMatch(/not found/i);
  });

  it("returns null for unknown codes", () => {
    expect(paymentErrorMessage("other")).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it("maps refresh/session failures", () => {
    expect(authErrorMessage("invalid_refresh")).toMatch(/sign in again/i);
  });

  it("maps captcha failures", () => {
    expect(authErrorMessage("captcha_failed")).toMatch(/security check/i);
  });

  it("maps org-admin RBAC", () => {
    expect(authErrorMessage("org_admin_required")).toMatch(/administrators/i);
  });
});
