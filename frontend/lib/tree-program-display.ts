/** Display helpers for planting program codes on tree registry rows. */

export function formatProgramCode(code?: string | null): string {
  if (!code) return "—";
  return code.toUpperCase();
}

export function programTooltip(
  code: string | null | undefined,
  nameByCode: ReadonlyMap<string, string>,
): string | undefined {
  if (!code) return undefined;
  const name = nameByCode.get(code);
  return name ? `${formatProgramCode(code)} · ${name}` : formatProgramCode(code);
}

export function buildProgramNameMap(
  programs: Array<{ code: string; name: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const program of programs) {
    map.set(program.code, program.name);
  }
  return map;
}
