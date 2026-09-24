export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "link"; label: string; href: string };

/** Relative in-site paths only, so copy can carry `[anchor](/path)` without external URLs. */
const INLINE_LINK = /\[([^\]]+)\]\((\/[A-Za-z0-9/_-]+)\)/g;

export function splitInlineLinks(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const re = new RegExp(INLINE_LINK.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", text: text.slice(last, match.index) });
    }
    segments.push({ type: "link", label: match[1], href: match[2] });
    last = match.index + match[0].length;
  }

  if (last < text.length || segments.length === 0) {
    segments.push({ type: "text", text: text.slice(last) });
  }

  return segments;
}
