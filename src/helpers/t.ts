import { createTranslator } from "../i18n/translator.mjs";
import { lang, dict, enDict } from "virtual:i18n";

export const LANG = lang;

const translator = createTranslator({ dict, enDict });
export const t = translator.t;
