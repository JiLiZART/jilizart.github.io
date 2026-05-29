export interface Translator {
  t(key: string, vars?: Record<string, string | number>): string;
}
export function createTranslator(opts: {
  dict: Record<string, unknown>;
  enDict: Record<string, unknown>;
}): Translator;
