export const SUPPORTED_LANGS = ["en", "ru"];

// Boundary-aware match so "truth" / "peru-something" don't false-positive.
const RU_HINT = /(^|[.\/-])ru([.\/-]|$)/i;

export function resolveLang(env = {}) {
  const explicit = String(env.SITE_LANG || "").trim().toLowerCase();
  if (SUPPORTED_LANGS.includes(explicit)) return explicit;
  if (explicit) {
    console.warn(`[i18n] Unknown SITE_LANG="${env.SITE_LANG}", falling back to "en".`);
  }
  if (RU_HINT.test(String(env.CF_PAGES_URL || ""))) return "ru";
  return "en";
}

/** Browser-side: pick lang from window.location.hostname. */
export function resolveRuntimeLang(hostname) {
  return String(hostname || "").toLowerCase().endsWith(".ru") ? "ru" : "en";
}
