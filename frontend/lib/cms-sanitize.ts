import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "blockquote",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

/** Sanitize CMS rich-text HTML with a strict allowlist (no script/style/handlers). */
export function sanitizeCmsHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
  });
}

/**
 * Sanitize CMS hrefs. Allows relative `/…` (not `//`), `#…`, `https:`, and `mailto:`.
 * Rejects `javascript:`, `data:`, `vbscript:`, and protocol-relative URLs.
 */
export function sanitizeCmsHref(href: string): string {
  const raw = (href ?? "").trim();
  if (!raw) return "/";

  if (raw.startsWith("#")) return raw;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  const lower = raw.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return "/";
  }
  if (raw.startsWith("//")) return "/";

  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "mailto:") {
      return raw;
    }
  } catch {
    return "/";
  }

  return "/";
}
