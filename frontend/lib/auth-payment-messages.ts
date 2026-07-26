/** Pure helpers for auth/payment UI copy — kept free of axios for unit tests. */

export function paymentErrorMessage(detail: string): string | null {
  if (detail === "payments_not_configured") {
    return "In-app payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.";
  }
  if (detail === "invalid_signature" || detail === "invalid_webhook_signature") {
    return "Payment verification failed. Please try again or contact support.";
  }
  if (detail === "order_not_found") {
    return "Payment order not found for this account.";
  }
  return null;
}

export function authErrorMessage(detail: string): string | null {
  if (detail === "invalid_refresh" || detail === "wrong_token_type") {
    return "Your session expired. Please sign in again.";
  }
  if (detail === "captcha_required" || detail === "captcha_failed") {
    return "Please complete the security check and try again.";
  }
  if (detail === "org_admin_required") {
    return "Only organization administrators can manage this setting.";
  }
  return null;
}
