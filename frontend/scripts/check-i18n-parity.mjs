#!/usr/bin/env node
/**
 * Ensures frontend/messages/en.json and hi.json have identical key sets.
 * Exit 1 on drift so CI can block merges with missing translations.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
const hi = JSON.parse(readFileSync(join(root, "messages/hi.json"), "utf8"));

function flatten(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const enKeys = new Set(flatten(en));
const hiKeys = new Set(flatten(hi));
const missingHi = [...enKeys].filter((k) => !hiKeys.has(k));
const missingEn = [...hiKeys].filter((k) => !enKeys.has(k));

if (missingHi.length || missingEn.length) {
  console.error(`i18n parity failed: en=${enKeys.size} hi=${hiKeys.size}`);
  for (const k of missingHi.slice(0, 20)) console.error(`  missing in hi: ${k}`);
  for (const k of missingEn.slice(0, 20)) console.error(`  missing in en: ${k}`);
  if (missingHi.length > 20 || missingEn.length > 20) {
    console.error(`  …and ${missingHi.length + missingEn.length - 20} more`);
  }
  process.exit(1);
}

console.log(`i18n parity OK (${enKeys.size} keys)`);
