declare module "virtual:i18n" {
  export const buildLang: "en" | "ru";
  export const enDict: Record<string, unknown>;
  export const ruDict: Record<string, unknown>;
}
