import { createTranslator } from "@/i18n/translator";
import { resolveRuntimeLang } from "@/i18n/resolve";
import { buildLang, enDict, ruDict } from "virtual:i18n";

function pickLang(): "en" | "ru" {
  if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)

      if (searchParams.has('l')) {
          const lang = searchParams.get('l')

          if (lang === 'en') {
              return 'en'
          }

          if (lang === 'ru') {
              return 'ru'
          }
      }

      return resolveRuntimeLang(window.location.hostname);
  }
  return buildLang;
}

export const LANG = pickLang();
const dict = LANG === "ru" ? ruDict : enDict;

const translator = createTranslator({ dict, enDict });

console.log({
    dict,
    LANG,
    translator
})

export const t = translator.t;
