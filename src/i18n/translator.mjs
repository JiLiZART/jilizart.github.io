function lookup(dict, key) {
  return key.split(".").reduce(
    (acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined),
    dict,
  );
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/**
 * @param {{ dict: Record<string, unknown>, enDict: Record<string, unknown> }} opts
 */
export function createTranslator({ dict, enDict }) {
  function t(key, vars) {
    let raw = lookup(dict, key);
    if (raw == null) raw = lookup(enDict, key);
    if (typeof raw !== "string") {
      console.warn(`[i18n] missing or non-string key: ${key}`);
      return key;
    }
    return interpolate(raw, vars);
  }
  return { t };
}
