/** Locale-aware Indian number formatting (lakh / crore vs million). */

export function formatIndianNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (locale.startsWith("hi") || locale.startsWith("mr") || locale.startsWith("bn")) {
    return new Intl.NumberFormat("en-IN", options).format(value);
  }
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCompactIndian(value: number, locale: string): string {
  return formatIndianNumber(value, locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}
