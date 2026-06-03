export const SUPPORTED_LANGS: readonly ["en", "ru"];
export function resolveLang(env?: Record<string, string | undefined>): "en" | "ru";
export function resolveRuntimeLang(hostname: string): "en" | "ru";
