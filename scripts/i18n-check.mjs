import fs from "node:fs";

function flatten(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.push(key);
  }
  return out;
}

export function diffKeys(a, b) {
  const ka = new Set(flatten(a));
  const kb = new Set(flatten(b));
  return {
    missingInB: [...ka].filter((k) => !kb.has(k)).sort(),
    missingInA: [...kb].filter((k) => !ka.has(k)).sort(),
  };
}

// Run directly (prebuild): warn-only, never fails the build.
if (import.meta.url === `file://${process.argv[1]}`) {
  const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf-8"));
  const en = read("../src/i18n/locales/en.json");
  const ru = read("../src/i18n/locales/ru.json");
  const { missingInB, missingInA } = diffKeys(en, ru);
  if (missingInB.length) console.warn(`[i18n] keys in en.json missing from ru.json:\n  ${missingInB.join("\n  ")}`);
  if (missingInA.length) console.warn(`[i18n] keys in ru.json missing from en.json:\n  ${missingInA.join("\n  ")}`);
  if (!missingInB.length && !missingInA.length) console.log("[i18n] locale keysets match ✓");
}
