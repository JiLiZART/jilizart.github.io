import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import fs from "node:fs";
import { resolveLang } from "./src/i18n/resolve.mjs";

const lang = resolveLang(process.env);
const SITE = lang === "ru" ? "https://artkost.ru" : "https://artkost.dev";

function i18nVirtual() {
  const virtualId = "virtual:i18n";
  const resolvedId = "\0" + virtualId;
  const readLocale = (l) =>
    JSON.parse(fs.readFileSync(new URL(`./src/i18n/locales/${l}.json`, import.meta.url), "utf-8"));
  return {
    name: "i18n-virtual",
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      const dict = readLocale(lang);
      const enDict = lang === "en" ? dict : readLocale("en");
      return (
        `export const lang = ${JSON.stringify(lang)};\n` +
        `export const dict = ${JSON.stringify(dict)};\n` +
        `export const enDict = ${JSON.stringify(enDict)};\n`
      );
    },
  };
}

const https = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

export default defineConfig({
  site: SITE,
  integrations: [react(), tailwind()],
  vite: {
    plugins: [i18nVirtual()],
    css: { devSourcemap: true },
    server: { https },
    define: {
      "import.meta.env.CF_PAGES_URL": JSON.stringify(process.env.CF_PAGES_URL),
      "import.meta.env.CF_PAGES_COMMIT_SHA": JSON.stringify(process.env.CF_PAGES_COMMIT_SHA),
    },
  },
});
