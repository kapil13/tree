/** Normalize Indian mobile input to 10-digit local part for display/API. */
export function sanitizePhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length >= 12) {
    digits = digits.slice(-10);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function formatPhoneDisplay(digits: string): string {
  const d = sanitizePhoneDigits(digits);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

export function phoneForApi(digits: string): string {
  const d = sanitizePhoneDigits(digits);
  if (d.length !== 10) {
    throw new Error("invalid_phone");
  }
  return d;
}

export function isValidIndianMobile(digits: string): boolean {
  const d = sanitizePhoneDigits(digits);
  return d.length === 10 && /^[6-9]/.test(d);
}
