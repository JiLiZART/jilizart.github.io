declare module "virtual:i18n" {
  export const lang: "en" | "ru";
  export const dict: Record<string, unknown>;
  export const enDict: Record<string, unknown>;
}
