# Build-time i18n (RU/EN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a single-language static build selected at build time by `SITE_LANG` (`ru`|`en`, default `en`), so `SITE_LANG=ru npm run build` ships the Russian site and `SITE_LANG=en npm run build` ships the English site.

**Architecture:** Resolve the language once in `astro.config.mjs`, expose the active locale dictionary through a Vite virtual module (`virtual:i18n`) so both `.astro` (SSG) and React islands share one build-time-resolved dictionary with only the active locale shipped to the client. A real `t()` helper replaces the no-op stub. All hardcoded copy is extracted into `src/i18n/locales/{en,ru}.json`. RU values mirror EN as placeholders for now (a few real RU strings already exist and are reused).

**Tech Stack:** Astro 5, React 18 islands, Vite, Node 22 built-in test runner (`node:test`), plain JSON locale files. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-05-29-build-time-i18n-design.md`

---

## Conventions used throughout

- **Key style:** dotted namespaces, `<section>.<element>` (e.g. `nav.overview`). Replaces the old natural-language-key usages in `Footer`/`donate`/`Base64Converter`.
- **Plain strings:** rendered `{t("key")}`. Astro auto-escapes, so store literal characters (`&`, normal spaces).
- **Rich strings** (contain inline markup like `<a>`, `<b>`, `<br/>`): the **full HTML** is stored in the JSON value and rendered with `set:html={t("key")}`. HTML entities (`&amp;`, `&nbsp;`) are fine inside these.
- **Proper nouns / tech tokens stay literal** and are NOT extracted: brand names (HodlHodl, Cube, Muse Group, Skyeng, Medialooks, BBob), tech labels from `src/data/tech.ts`, `JS`, `11`, `3 kyu`, `@jilizart`, crypto tickers, URLs.
- **Commits:** Conventional Commits, one per task.

## File Structure

**Create:**
- `src/i18n/resolve.mjs` — pure `resolveLang(env)`. Imported by `astro.config.mjs` (Node) and the virtual-module plugin.
- `src/i18n/resolve.test.mjs` — `node:test` for `resolveLang`.
- `src/i18n/translator.mjs` — pure `createTranslator({dict, enDict}) -> { t }`. Plain JS so `node:test` runs it without a TS loader.
- `src/i18n/translator.d.ts` — type declarations for `translator.mjs` (consumed by the TS wrapper).
- `src/i18n/translator.test.mjs` — `node:test` for the translator.
- `src/i18n/locales/en.json` — canonical English strings.
- `src/i18n/locales/ru.json` — Russian strings (mostly EN placeholders + a few real RU).
- `src/i18n/virtual-i18n.d.ts` — ambient declaration for `declare module "virtual:i18n"`.
- `scripts/i18n-check.mjs` — key-parity checker. Exports `diffKeys(a,b)`; run as prebuild.
- `scripts/i18n-check.test.mjs` — `node:test` for `diffKeys`.
- `docs/deploy-cloudflare.md` — CF Pages env/build documentation.

**Modify:**
- `src/helpers/t.ts` — replace stub with real wiring over `translator.mjs` + `virtual:i18n`.
- `astro.config.mjs` — add virtual-module plugin, set `site` from resolved lang.
- `package.json` — add `test` + `prebuild` scripts; remove `astro-i18next` and `i18next` deps.
- `src/components/Navbar.astro`, `src/components/sections/Overview.astro`, `Experience.astro`, `Crafts.astro`, `src/components/ContactBlock.astro`, `src/components/SiteFooter.astro`, `src/layouts/BaseLayout.astro`, `src/pages/support.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`, `src/pages/color.astro`, `src/pages/base64.astro`, `src/pages/tanks.astro`, `src/islands/Base64Converter.tsx`, `src/pages/donate.astro` — swap literals for `t()`.

**Delete:**
- `src/components/Footer.astro` — dead (not imported anywhere; superseded by `SiteFooter.astro`).
- `public/locales/` — partial/broken stubs, superseded by `src/i18n/locales/`.

---

## Phase 1 — Mechanism (TDD)

### Task 1: Language resolver

**Files:**
- Create: `src/i18n/resolve.mjs`
- Test: `src/i18n/resolve.test.mjs`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Write the failing test**

Create `src/i18n/resolve.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLang } from "./resolve.mjs";

test("explicit SITE_LANG=ru wins", () => {
  assert.equal(resolveLang({ SITE_LANG: "ru" }), "ru");
});
test("explicit SITE_LANG=en wins", () => {
  assert.equal(resolveLang({ SITE_LANG: "en" }), "en");
});
test("SITE_LANG is case-insensitive and trimmed", () => {
  assert.equal(resolveLang({ SITE_LANG: " RU " }), "ru");
});
test("unknown SITE_LANG falls back to en", () => {
  assert.equal(resolveLang({ SITE_LANG: "fr" }), "en");
});
test("CF_PAGES_URL ru hint used when SITE_LANG unset", () => {
  assert.equal(resolveLang({ CF_PAGES_URL: "https://artkost-ru.pages.dev" }), "ru");
  assert.equal(resolveLang({ CF_PAGES_URL: "https://artkost.ru" }), "ru");
});
test("CF_PAGES_URL without ru hint -> en", () => {
  assert.equal(resolveLang({ CF_PAGES_URL: "https://artkost.dev" }), "en");
  assert.equal(resolveLang({ CF_PAGES_URL: "https://truth.pages.dev" }), "en");
});
test("empty env -> en", () => {
  assert.equal(resolveLang({}), "en");
});
test("explicit SITE_LANG beats CF_PAGES_URL", () => {
  assert.equal(resolveLang({ SITE_LANG: "en", CF_PAGES_URL: "https://artkost.ru" }), "en");
});
```

- [ ] **Step 2: Add the `test` script and run to verify it fails**

Edit `package.json` `scripts` — add:

```json
"test": "node --test"
```

Run: `npm test`
Expected: FAIL — `Cannot find module './resolve.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `src/i18n/resolve.mjs`:

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `resolve.test.mjs` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/resolve.mjs src/i18n/resolve.test.mjs package.json
git commit -m "feat(i18n): add SITE_LANG resolver with CF_PAGES_URL fallback"
```

---

### Task 2: Translator factory

**Files:**
- Create: `src/i18n/translator.mjs`, `src/i18n/translator.d.ts`
- Test: `src/i18n/translator.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/i18n/translator.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTranslator } from "./translator.mjs";

const dict = { hero: { title: "Привет" }, greet: "Hi {{name}}" };
const enDict = { hero: { title: "Hello" }, only: "EN only", greet: "Hi {{name}}" };
const { t } = createTranslator({ dict, enDict });

test("nested dotted lookup", () => assert.equal(t("hero.title"), "Привет"));
test("interpolates {{vars}}", () => assert.equal(t("greet", { name: "Nik" }), "Hi Nik"));
test("missing in active dict falls back to enDict", () => assert.equal(t("only"), "EN only"));
test("missing everywhere returns the key", () => assert.equal(t("nope.here"), "nope.here"));
test("unknown interpolation var is left intact", () =>
  assert.equal(t("greet", {}), "Hi {{name}}"));
test("non-string node returns the key", () => assert.equal(t("hero"), "hero"));
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './translator.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `src/i18n/translator.mjs`:

```js
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
```

Create `src/i18n/translator.d.ts`:

```ts
export interface Translator {
  t(key: string, vars?: Record<string, string | number>): string;
}
export function createTranslator(opts: {
  dict: Record<string, unknown>;
  enDict: Record<string, unknown>;
}): Translator;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/translator.mjs src/i18n/translator.d.ts src/i18n/translator.test.mjs
git commit -m "feat(i18n): add pure translator factory with enDict fallback"
```

---

### Task 3: Locale data

**Files:**
- Create: `src/i18n/locales/en.json`, `src/i18n/locales/ru.json`

> Note: `ru.json` has the **identical keyset** to `en.json`. Most values are English placeholders to be translated later (per scope). The `meta.*`, `overview.eyebrow`, and `overview.role` keys carry real Russian taken from the existing inline meta — leave those as written.

- [ ] **Step 1: Create `src/i18n/locales/en.json`**

```json
{
  "nav": {
    "overview": "Overview",
    "experience": "Experience",
    "crafts": "Crafts",
    "support": "Support",
    "cta": "@email me ›"
  },
  "overview": {
    "eyebrow": "Hey, I'm Nikolay 👋",
    "role": "JavaScript Developer",
    "intro": "I specialize in building exceptional web applications and creating efficient JavaScript solutions. Currently focusing on exciting new projects and open‑source contributions. ✨",
    "stackLabel": "Stack",
    "stackPrimary": "Primary language<br />since 2013",
    "frameworksLabel": "Frameworks",
    "openSourceLabel": "Open source",
    "bbobDesc": "Blazing‑fast BBCode parser. Transforms to AST, then to HTML, React, or Vue.",
    "yearsUnit": "years",
    "yearsCaption": "building for the web",
    "codewarsDesc": "Algorithmic puzzles & katas.",
    "specialityLabel": "Speciality",
    "specialityValue": "Frontend infrastructure",
    "langLabel": "Languages & Frameworks",
    "buildLabel": "Styling, Testing & Build",
    "infraLabel": "Infrastructure & DevOps",
    "reachLabel": "Reach out"
  },
  "experience": {
    "eyebrow": "Experience",
    "title": "Places I've helped build.",
    "hodl": "Reimagined frontend infrastructure on top of Next.js — faster builds, cleaner data layer, a design system that scales with the team.",
    "cube": "Helped built the UI Kit that backs Cube's SaaS, created JSON to SQL tokenizer and visualizer.",
    "muse": "Improved Musescore & Ultimate Guitar — tablature rendering & BBCode pipelines from seconds to 15 ms.",
    "skyeng": "Helped to built learner‑facing product surfaces for CIS largest online English school..",
    "medialooks": "Designed single‑page applications for streaming and media‑production tooling."
  },
  "crafts": {
    "eyebrow": "Open source",
    "title": "A few things I've made.",
    "bbobTag": "📦 Library",
    "bbobTitle": "<a href=\"https://github.com/jilizart/bbob\">BBob</a>",
    "bbobP1": "A JavaScript library for parsing BBCode. Converts <span class=\"mono\" style=\"color: var(--ink);\">bbcode → AST → React</span>. Renders tablature at <a href=\"https://ultimate-guitar.com\">ultimate‑guitar.com</a> with cord tooltips and two‑column printing that keeps chords and verses aligned.",
    "bbobP2": "Later adopted by <a href=\"https://musescore.com\">musescore.com</a> for comments &amp; posts after the PHP pipeline OOM'd at ~1&nbsp;GB. Moving rendering to the client took page‑wide BBCode from seconds to <b>15&nbsp;ms</b>.",
    "bnetTag": "🎮 R&D",
    "bnetTitle": "<a href=\"https://github.com/w3gh/ghost.js\">Battle.net · reversed</a>",
    "bnetP1": "As part of R&amp;D, I reverse‑engineered (via Wireshark) and implemented the Battle.net protocol for Warcraft&nbsp;3 in Node.js. Some native C libraries are wired in via <a href=\"https://github.com/node-ffi/node-ffi\">node‑ffi</a>.",
    "bnetP2": "A study in binary protocols, packet framing, and keeping a long‑running Node process honest."
  },
  "contact": {
    "eyebrow": "Get in touch",
    "title": "Let's make something worth using.",
    "body": "I'm taking on new frontend and infrastructure work. The fastest way to reach me is email or Telegram — I usually reply within a day.",
    "cv": "Download CV"
  },
  "footer": {
    "tagline": "JavaScript developer, based remote. Building for the web since 2013.",
    "directLabel": "Direct",
    "codeLabel": "Code",
    "elsewhereLabel": "Elsewhere",
    "email": "Email",
    "support": "Support my work",
    "rights": "© {{year}} Nikolay Kost. All rights reserved.",
    "crafted": "Designed with care in HTML & CSS."
  },
  "support": {
    "metaTitle": "Support my work — Nikolay Kost",
    "metaDescription": "If something I've made was useful, you can chip in. Crypto addresses for BTC, ETH, TON, USDT.",
    "back": "← Back to home",
    "eyebrow": "Support my work",
    "title": "If something I've made was useful, you can chip in.",
    "lede": "Most of what I build is open source. If BBob saved your team an afternoon, or a post helped you debug at 2 AM, a small tip keeps the lights on for the next thing.",
    "noteStrong": "One ask:",
    "note": " double‑check the network before sending. USDT on TRC‑20 is not the same as USDT on ERC‑20 — sending to the wrong chain loses the funds. If you're unsure, ping me on <a href=\"https://t.me/jilizart\">Telegram</a> first.",
    "thanks": "Thank you. Genuinely. — Nikolay"
  },
  "blog": {
    "metaTitle": "Writing — Nikolay Kost",
    "metaDescription": "Long-form essays on frontend infrastructure, open source, and shipping software that holds up.",
    "back": "← Back to home",
    "eyebrow": "Writing",
    "title": "Notes from the build.",
    "lede": "Long-form essays on frontend infrastructure, open source, and the process of shipping software that holds up. Updated when I have something worth saying."
  },
  "post": {
    "back": "← All posts",
    "authorBio": "JavaScript Developer · Building for the web since 2013"
  },
  "donate": {
    "metaTitle": "Donate - Nikolay Kost",
    "title": "Support My Work 🙏",
    "intro": "If you find my work valuable and would like to support my open-source contributions, you can donate using cryptocurrency. Your support helps me dedicate more time to creating useful content and tools.",
    "copy": "Copy"
  },
  "tools": {
    "colorTitle": "Color Converter",
    "base64Title": "Base64 Image Converter",
    "base64Transparent": "Transparent",
    "tanksTitle": "Nikolay Kost — JavaScript Developer"
  },
  "meta": {
    "defaultDescription": "Nikolay Kost — JavaScript Developer. Building for the web since 2013.",
    "homeTitle": "Nikolay Kost — JavaScript Developer",
    "ogTitle": "Nikolay Kost - JavaScript Developer",
    "ogDescription": "Nikolay Kost - JavaScript Developer specializing in web applications and efficient JavaScript solutions",
    "twitterTitle": "Nikolay Kost - JavaScript Developer",
    "twitterDescription": "I specialize in building exceptional web applications and creating efficient JavaScript solutions. Currently focusing on exciting new projects and open-source contributions. ✨",
    "twitterImageAlt": "Nikolay Kost - JavaScript Developer"
  }
}
```

- [ ] **Step 2: Create `src/i18n/locales/ru.json`**

Identical keyset. Real RU is filled for `meta.*`, `overview.eyebrow`, `overview.role`; every other value is the English placeholder copied verbatim from `en.json` (translate later).

```json
{
  "nav": {
    "overview": "Overview",
    "experience": "Experience",
    "crafts": "Crafts",
    "support": "Support",
    "cta": "@email me ›"
  },
  "overview": {
    "eyebrow": "Привет, я Николай 👋",
    "role": "JavaScript Разработчик",
    "intro": "I specialize in building exceptional web applications and creating efficient JavaScript solutions. Currently focusing on exciting new projects and open‑source contributions. ✨",
    "stackLabel": "Stack",
    "stackPrimary": "Primary language<br />since 2013",
    "frameworksLabel": "Frameworks",
    "openSourceLabel": "Open source",
    "bbobDesc": "Blazing‑fast BBCode parser. Transforms to AST, then to HTML, React, or Vue.",
    "yearsUnit": "years",
    "yearsCaption": "building for the web",
    "codewarsDesc": "Algorithmic puzzles & katas.",
    "specialityLabel": "Speciality",
    "specialityValue": "Frontend infrastructure",
    "langLabel": "Languages & Frameworks",
    "buildLabel": "Styling, Testing & Build",
    "infraLabel": "Infrastructure & DevOps",
    "reachLabel": "Reach out"
  },
  "experience": {
    "eyebrow": "Experience",
    "title": "Places I've helped build.",
    "hodl": "Reimagined frontend infrastructure on top of Next.js — faster builds, cleaner data layer, a design system that scales with the team.",
    "cube": "Helped built the UI Kit that backs Cube's SaaS, created JSON to SQL tokenizer and visualizer.",
    "muse": "Improved Musescore & Ultimate Guitar — tablature rendering & BBCode pipelines from seconds to 15 ms.",
    "skyeng": "Helped to built learner‑facing product surfaces for CIS largest online English school..",
    "medialooks": "Designed single‑page applications for streaming and media‑production tooling."
  },
  "crafts": {
    "eyebrow": "Open source",
    "title": "A few things I've made.",
    "bbobTag": "📦 Library",
    "bbobTitle": "<a href=\"https://github.com/jilizart/bbob\">BBob</a>",
    "bbobP1": "A JavaScript library for parsing BBCode. Converts <span class=\"mono\" style=\"color: var(--ink);\">bbcode → AST → React</span>. Renders tablature at <a href=\"https://ultimate-guitar.com\">ultimate‑guitar.com</a> with cord tooltips and two‑column printing that keeps chords and verses aligned.",
    "bbobP2": "Later adopted by <a href=\"https://musescore.com\">musescore.com</a> for comments &amp; posts after the PHP pipeline OOM'd at ~1&nbsp;GB. Moving rendering to the client took page‑wide BBCode from seconds to <b>15&nbsp;ms</b>.",
    "bnetTag": "🎮 R&D",
    "bnetTitle": "<a href=\"https://github.com/w3gh/ghost.js\">Battle.net · reversed</a>",
    "bnetP1": "As part of R&amp;D, I reverse‑engineered (via Wireshark) and implemented the Battle.net protocol for Warcraft&nbsp;3 in Node.js. Some native C libraries are wired in via <a href=\"https://github.com/node-ffi/node-ffi\">node‑ffi</a>.",
    "bnetP2": "A study in binary protocols, packet framing, and keeping a long‑running Node process honest."
  },
  "contact": {
    "eyebrow": "Get in touch",
    "title": "Let's make something worth using.",
    "body": "I'm taking on new frontend and infrastructure work. The fastest way to reach me is email or Telegram — I usually reply within a day.",
    "cv": "Download CV"
  },
  "footer": {
    "tagline": "JavaScript developer, based remote. Building for the web since 2013.",
    "directLabel": "Direct",
    "codeLabel": "Code",
    "elsewhereLabel": "Elsewhere",
    "email": "Email",
    "support": "Support my work",
    "rights": "© {{year}} Nikolay Kost. All rights reserved.",
    "crafted": "Designed with care in HTML & CSS."
  },
  "support": {
    "metaTitle": "Support my work — Nikolay Kost",
    "metaDescription": "If something I've made was useful, you can chip in. Crypto addresses for BTC, ETH, TON, USDT.",
    "back": "← Back to home",
    "eyebrow": "Support my work",
    "title": "If something I've made was useful, you can chip in.",
    "lede": "Most of what I build is open source. If BBob saved your team an afternoon, or a post helped you debug at 2 AM, a small tip keeps the lights on for the next thing.",
    "noteStrong": "One ask:",
    "note": " double‑check the network before sending. USDT on TRC‑20 is not the same as USDT on ERC‑20 — sending to the wrong chain loses the funds. If you're unsure, ping me on <a href=\"https://t.me/jilizart\">Telegram</a> first.",
    "thanks": "Thank you. Genuinely. — Nikolay"
  },
  "blog": {
    "metaTitle": "Writing — Nikolay Kost",
    "metaDescription": "Long-form essays on frontend infrastructure, open source, and shipping software that holds up.",
    "back": "← Back to home",
    "eyebrow": "Writing",
    "title": "Notes from the build.",
    "lede": "Long-form essays on frontend infrastructure, open source, and the process of shipping software that holds up. Updated when I have something worth saying."
  },
  "post": {
    "back": "← All posts",
    "authorBio": "JavaScript Developer · Building for the web since 2013"
  },
  "donate": {
    "metaTitle": "Donate - Nikolay Kost",
    "title": "Support My Work 🙏",
    "intro": "If you find my work valuable and would like to support my open-source contributions, you can donate using cryptocurrency. Your support helps me dedicate more time to creating useful content and tools.",
    "copy": "Copy"
  },
  "tools": {
    "colorTitle": "Color Converter",
    "base64Title": "Base64 Image Converter",
    "base64Transparent": "Transparent",
    "tanksTitle": "Nikolay Kost — JavaScript Developer"
  },
  "meta": {
    "defaultDescription": "Николай Костюрин — JavaScript разработчик. Делаю для веба с 2013 года.",
    "homeTitle": "Николай Костюрин — JavaScript Разработчик",
    "ogTitle": "Николай Костюрин — JavaScript Разработчик",
    "ogDescription": "Николай Костюрин — разработчик JavaScript, специализирующийся на веб-приложениях и эффективных решениях JavaScript",
    "twitterTitle": "Николай Костюрин — JavaScript Разработчик",
    "twitterDescription": "Я специализируюсь на создании исключительных веб-приложений и создании эффективных решений JavaScript. В настоящее время сосредоточен на новых интересных проектах и вкладах в open-source. ✨",
    "twitterImageAlt": "Николай Костюрин — JavaScript Разработчик"
  }
}
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json')); JSON.parse(require('fs').readFileSync('src/i18n/locales/ru.json')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/ru.json
git commit -m "feat(i18n): add en/ru locale dictionaries"
```

---

### Task 4: Key-parity check (prebuild)

**Files:**
- Create: `scripts/i18n-check.mjs`, `scripts/i18n-check.test.mjs`
- Modify: `package.json` (add `prebuild` script)

- [ ] **Step 1: Write the failing test**

Create `scripts/i18n-check.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { diffKeys } from "./i18n-check.mjs";

test("identical keysets -> no diffs", () => {
  const a = { x: "1", n: { y: "2" } };
  const b = { x: "a", n: { y: "b" } };
  assert.deepEqual(diffKeys(a, b), { missingInB: [], missingInA: [] });
});
test("missing nested key in b is reported", () => {
  const a = { n: { y: "2", z: "3" } };
  const b = { n: { y: "2" } };
  assert.deepEqual(diffKeys(a, b), { missingInB: ["n.z"], missingInA: [] });
});
test("extra key in b is reported as missingInA", () => {
  const a = { x: "1" };
  const b = { x: "1", extra: "2" };
  assert.deepEqual(diffKeys(a, b), { missingInB: [], missingInA: ["extra"] });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './i18n-check.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/i18n-check.mjs`:

```js
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
```

- [ ] **Step 4: Run test + wire prebuild**

Run: `npm test`
Expected: PASS.

Edit `package.json` `scripts` — add:

```json
"i18n:check": "node scripts/i18n-check.mjs",
"prebuild": "node scripts/i18n-check.mjs"
```

- [ ] **Step 5: Verify the checker runs clean against the real locales**

Run: `npm run i18n:check`
Expected: `[i18n] locale keysets match ✓`.

- [ ] **Step 6: Commit**

```bash
git add scripts/i18n-check.mjs scripts/i18n-check.test.mjs package.json
git commit -m "feat(i18n): add locale key-parity check as prebuild step"
```

---

### Task 5: Virtual module + astro.config wiring

**Files:**
- Modify: `astro.config.mjs`
- Create: `src/i18n/virtual-i18n.d.ts`

- [ ] **Step 1: Add the ambient type for the virtual module**

Create `src/i18n/virtual-i18n.d.ts`:

```ts
declare module "virtual:i18n" {
  export const lang: "en" | "ru";
  export const dict: Record<string, unknown>;
  export const enDict: Record<string, unknown>;
}
```

- [ ] **Step 2: Rewrite `astro.config.mjs`**

Replace the whole file with:

```js
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
  },
});
```

- [ ] **Step 3: Verify the virtual module resolves (build still green before any extraction)**

Run: `SITE_LANG=ru npm run build`
Expected: build succeeds. (Nothing imports `virtual:i18n` yet — this just proves the config + plugin load without error and `prebuild` runs.)

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs src/i18n/virtual-i18n.d.ts
git commit -m "feat(i18n): expose active locale via virtual:i18n + set site per lang"
```

---

### Task 6: Rewrite the `t()` helper

**Files:**
- Modify: `src/helpers/t.ts`

> Verified during planning: nothing imports `Trans` — it is removed (not re-exported).

- [ ] **Step 1: Replace `src/helpers/t.ts` entirely**

```ts
import { createTranslator } from "../i18n/translator.mjs";
import { lang, dict, enDict } from "virtual:i18n";

export const LANG = lang;

const translator = createTranslator({ dict, enDict });
export const t = translator.t;
```

- [ ] **Step 2: Smoke-test both builds**

Run: `SITE_LANG=en npm run build`
Expected: success.
Run: `SITE_LANG=ru npm run build`
Expected: success.

(`Footer.astro` and `Base64Converter.tsx` already import `t` from this module; they now receive the real `t`. They still pass natural-language keys — those resolve to the key string via fallback, which is fine until their extraction tasks run.)

- [ ] **Step 3: Commit**

```bash
git add src/helpers/t.ts
git commit -m "feat(i18n): wire real t() over virtual:i18n, drop no-op stub"
```

---

## Phase 2 — String extraction

> Each task swaps literals for `t()` against keys already defined in Task 3. Verification per task: `SITE_LANG=ru npm run build` must succeed with **no `[i18n] missing` warnings**, then commit. Rich strings use `set:html`.

### Task 7: Navbar

**Files:** Modify `src/components/Navbar.astro`

- [ ] **Step 1: Add the frontmatter import**

At the top frontmatter (`---` block), add:

```astro
import { t } from "@/helpers/t";
```

- [ ] **Step 2: Replace the nav link/CTA text**

| Old | New |
|---|---|
| `>Overview</a>` | `>{t("nav.overview")}</a>` |
| `<li><a href="/#experience">Experience</a></li>` | `<li><a href="/#experience">{t("nav.experience")}</a></li>` |
| `<li><a href="/#crafts">Crafts</a></li>` | `<li><a href="/#crafts">{t("nav.crafts")}</a></li>` |
| `>Support</a>` (the `/support` link) | `>{t("nav.support")}</a>` |
| `>@email me ›</a>` | `>{t("nav.cta")}</a>` |

Leave the brand `Nikolay Kost` literal.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/components/Navbar.astro
git commit -m "i18n: extract Navbar strings"
```

---

### Task 8: Overview section

**Files:** Modify `src/components/sections/Overview.astro`

- [ ] **Step 1: Add import** — in frontmatter add `import { t } from "@/helpers/t";`

- [ ] **Step 2: Replace strings**

| Location | Old | New |
|---|---|---|
| eyebrow | `Hey, I'm Nikolay 👋` | `{t("overview.eyebrow")}` |
| h2 | `JavaScript Developer` | `{t("overview.role")}` |
| intro `<p>` | the two-line intro text | `{t("overview.intro")}` |
| caption | `Stack` | `{t("overview.stackLabel")}` |
| "Primary language" block (`Primary language<br />since 2013`) | replace inner markup with `<Fragment set:html={t("overview.stackPrimary")} />` |
| caption | `Frameworks` | `{t("overview.frameworksLabel")}` |
| caption (×2 over open-source tile) | `Open source` | `{t("overview.openSourceLabel")}` |
| bbob caption | `Blazing‑fast BBCode parser. Transforms to AST, then to HTML, React, or Vue.` | `{t("overview.bbobDesc")}` |
| years unit `<span>` | `years` | `{t("overview.yearsUnit")}` |
| caption | `building for the web` | `{t("overview.yearsCaption")}` |
| codewars caption | `Algorithmic puzzles &amp; katas.` | `{t("overview.codewarsDesc")}` |
| caption | `Speciality` | `{t("overview.specialityLabel")}` |
| tile-title | `Frontend infrastructure` | `{t("overview.specialityValue")}` |
| caption | `Languages &amp; Frameworks` | `{t("overview.langLabel")}` |
| caption | `Styling, Testing &amp; Build` | `{t("overview.buildLabel")}` |
| caption | `Infrastructure &amp; DevOps` | `{t("overview.infraLabel")}` |
| caption | `Reach out` | `{t("overview.reachLabel")}` |

Leave literal: `JS`, `Codewars`, `3 kyu`, `11`, `@jilizart`, the React/Next/Node/Redux/Vite/Jest labels, `{KEY_SKILLS}` chips, `<TechChips>`, `<SocialRow>`.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/components/sections/Overview.astro
git commit -m "i18n: extract Overview strings"
```

---

### Task 9: Experience section

**Files:** Modify `src/components/sections/Experience.astro`

- [ ] **Step 1: Add import** — `import { t } from "@/helpers/t";`

- [ ] **Step 2: Replace strings**

| Old | New |
|---|---|
| `<div class="eyebrow">Experience</div>` | `<div class="eyebrow">{t("experience.eyebrow")}</div>` |
| `Places I've helped build.` (h2) | `{t("experience.title")}` |
| HodlHodl `<p class="exp-card-desc">…</p>` | `<p class="exp-card-desc">{t("experience.hodl")}</p>` |
| Cube desc | `{t("experience.cube")}` |
| Muse desc (`…15&nbsp;ms.`) | `{t("experience.muse")}` |
| Skyeng desc | `{t("experience.skyeng")}` |
| Medialooks desc | `{t("experience.medialooks")}` |

Leave the `<h3>` company names literal.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/components/sections/Experience.astro
git commit -m "i18n: extract Experience strings"
```

---

### Task 10: Crafts section (rich strings)

**Files:** Modify `src/components/sections/Crafts.astro`

- [ ] **Step 1: Add import** — `import { t } from "@/helpers/t";`

- [ ] **Step 2: Replace strings**

Plain:
| Old | New |
|---|---|
| `<div class="eyebrow">Open source</div>` | `<div class="eyebrow">{t("crafts.eyebrow")}</div>` |
| `A few things I've made.` | `{t("crafts.title")}` |
| `<span class="craft-tag">📦 Library</span>` | `<span class="craft-tag">{t("crafts.bbobTag")}</span>` |
| `<span class="craft-tag">🎮 R&amp;D</span>` | `<span class="craft-tag">{t("crafts.bnetTag")}</span>` |

Rich (replace the element's inner markup with `set:html`):
- bbob `<h3>`: `<h3 set:html={t("crafts.bbobTitle")} />`
- bbob first `<p>…</p>`: `<p set:html={t("crafts.bbobP1")} />`
- bbob second `<p>…</p>`: `<p set:html={t("crafts.bbobP2")} />`
- bnet `<h3>`: `<h3 set:html={t("crafts.bnetTitle")} />`
- bnet first `<p>…</p>`: `<p set:html={t("crafts.bnetP1")} />`
- bnet second `<p>…</p>`: `<p set:html={t("crafts.bnetP2")} />`

Leave the `.pills` `<span class="pill">…</span>` tech tags literal.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/components/sections/Crafts.astro
git commit -m "i18n: extract Crafts strings (set:html for rich copy)"
```

---

### Task 11: ContactBlock

**Files:** Modify `src/components/ContactBlock.astro`

- [ ] **Step 1: Add import** — in the frontmatter (after the `Props` block) add `import { t } from "@/helpers/t";`

- [ ] **Step 2: Replace strings**

| Old | New |
|---|---|
| `<div class="eyebrow">Get in touch</div>` | `<div class="eyebrow">{t("contact.eyebrow")}</div>` |
| `Let's make something worth using.` | `{t("contact.title")}` |
| the `<p class="body-l">…</p>` body | `{t("contact.body")}` |
| `>Download CV</a>` | `>{t("contact.cv")}</a>` |

Leave the `nk@artkost.dev` email link literal.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/components/ContactBlock.astro
git commit -m "i18n: extract ContactBlock strings"
```

---

### Task 12: SiteFooter

**Files:** Modify `src/components/SiteFooter.astro`

- [ ] **Step 1: Add import** — in frontmatter add `import { t } from "@/helpers/t";`

- [ ] **Step 2: Replace strings**

| Old | New |
|---|---|
| tagline `<p>JavaScript developer, based remote. Building for the web since 2013.</p>` | `{t("footer.tagline")}` |
| `<h4>Direct</h4>` | `<h4>{t("footer.directLabel")}</h4>` |
| `<a href="mailto:nk@artkost.dev">Email</a>` | `<a href="mailto:nk@artkost.dev">{t("footer.email")}</a>` |
| `<h4>Code</h4>` | `<h4>{t("footer.codeLabel")}</h4>` |
| `<h4>Elsewhere</h4>` | `<h4>{t("footer.elsewhereLabel")}</h4>` |
| `<a href="/support">Support my work</a>` | `<a href="/support">{t("footer.support")}</a>` |
| `© {year} Nikolay Kost. All rights reserved.` | `{t("footer.rights", { year })}` |
| `Designed with care in HTML &amp; CSS.` | `{t("footer.crafted")}` |

Leave literal: `Nikolay Kost` brand, `Telegram`, `CV`, `GitHub`, `BBob`, `Codewars · 3 kyu`, `X / Twitter`, `LinkedIn`, and `{sha}`.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/components/SiteFooter.astro
git commit -m "i18n: extract SiteFooter strings"
```

---

### Task 13: BaseLayout meta, `lang`, canonical, JSON-LD

**Files:** Modify `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Update the frontmatter**

Add `t` + `LANG` imports and lang-derived values. Change the `description` default to the locale string:

```astro
import { t, LANG } from "@/helpers/t";
// ...existing imports...

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
}

const {
  title = t("meta.homeTitle"),
  description = t("meta.defaultDescription"),
} = Astro.props;

const canonical = LANG === "ru" ? "https://artkost.ru" : "https://artkost.dev";
const ogLocale = LANG === "ru" ? "ru_RU" : "en_US";
```

- [ ] **Step 2: Update `<html>` and canonical**

| Old | New |
|---|---|
| `<html lang="en" class="font-sans font-['Inter']">` | `<html lang={LANG} class="font-sans font-['Inter']">` |
| `<link rel="canonical" href="https://artkost.dev" />` | `<link rel="canonical" href={canonical} />` |

- [ ] **Step 3: Collapse the duplicated OG/Twitter meta to single lang-driven tags**

Remove every `lang="ru"`-suffixed duplicate meta tag. Replace the English ones with `t()` calls and add `og:locale`:

```astro
<meta property="og:url" content={canonical + "/"} />
<meta property="og:type" content="website" />
<meta property="og:locale" content={ogLocale} />
<meta property="og:title" content={t("meta.ogTitle")} />
<meta property="og:description" content={t("meta.ogDescription")} />
<meta property="og:image" content="android-chrome-192x192.png" />

<meta property="twitter:domain" content={LANG === "ru" ? "artkost.ru" : "artkost.dev"} />
<meta property="twitter:url" content={canonical + "/"} />
<meta name="twitter:site" content="@jilizart" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content={t("meta.twitterTitle")} />
<meta name="twitter:description" content={t("meta.twitterDescription")} />
<meta name="twitter:image" content="android-chrome-192x192.png" />
<meta name="twitter:image:alt" content={t("meta.twitterImageAlt")} />
```

Keep the two `hreflang` alternate `<link>`s (they intentionally point at both domains). Keep the `ahrefs-site-verification`, font, and pre-paint theme `<script>` untouched.

- [ ] **Step 4: Render only the active-language JSON-LD block**

Replace the two `<script type="application/ld+json">` blocks (the `lang="en"` and `lang="ru"` ones) with a single conditional. Keep both JSON objects but emit only one:

```astro
{LANG === "ru" ? (
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://json-ld.org/contexts/person.jsonld",
    name: "Николай Костюрин", nickname: "jilizart", born: "1989-12-29",
    email: "mailto:nk@artkost.ru", url: "https://artkost.ru",
    jobTitle: "JavaScript Разработчик", image: "https://artkost.ru/profile.jpeg",
    homepage: "https://artkost.ru",
    sameAs: ["https://github.com/jilizart","https://x.com/jilizart","https://linkedin.com/in/nkostyurin","https://t.me/jilizart","https://twitter.com/jilizart"],
  })} />
) : (
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://json-ld.org/contexts/person.jsonld",
    name: "Nikolay Kosturin", nickname: "jilizart", born: "1989-12-29",
    email: "mailto:nk@artkost.dev", url: "https://artkost.dev",
    jobTitle: "JavaScript Developer", image: "https://artkost.dev/profile.jpeg",
    homepage: "https://artkost.dev",
    sameAs: ["https://github.com/jilizart","https://x.com/jilizart","https://linkedin.com/in/nkostyurin","https://t.me/jilizart","https://twitter.com/jilizart"],
  })} />
)}
```

- [ ] **Step 5: Verify both builds + inspect output**

```bash
SITE_LANG=ru npm run build
grep -o '<html lang="[a-z]*"' dist/index.html        # expect lang="ru"
grep -c 'artkost.ru' dist/index.html                  # canonical/og present
SITE_LANG=en npm run build
grep -o '<html lang="[a-z]*"' dist/index.html        # expect lang="en"
```

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "i18n: drive BaseLayout meta/lang/canonical/JSON-LD from active locale"
```

---

### Task 14: Support page

**Files:** Modify `src/pages/support.astro`

- [ ] **Step 1: Add import** — in frontmatter add `import { t } from "@/helpers/t";`

- [ ] **Step 2: Replace strings**

| Old | New |
|---|---|
| `<BaseLayout title="Support my work — Nikolay Kost" description="If something…USDT.">` | `<BaseLayout title={t("support.metaTitle")} description={t("support.metaDescription")}>` |
| `← Back to home` | `{t("support.back")}` |
| `<span class="support-eyebrow">Support my work</span>` | `<span class="support-eyebrow">{t("support.eyebrow")}</span>` |
| `<h1 class="support-title">If something…chip in.</h1>` | `{t("support.title")}` |
| `<p class="support-lede">…2&nbsp;AM…</p>` | `{t("support.lede")}` |
| support-note block `<strong>One ask:</strong> double‑check…first.` | replace the whole inner content with `<strong>{t("support.noteStrong")}</strong><Fragment set:html={t("support.note")} />` |
| `<div class="support-thanks">Thank you. Genuinely. — Nikolay</div>` | `{t("support.thanks")}` |

Leave `{a.name}`, `{a.ticker}`, `{a.network}`, `{a.address}` (data-driven) and `<CopyButton>` untouched.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/pages/support.astro
git commit -m "i18n: extract support page strings"
```

---

### Task 15: Blog index + post template

**Files:** Modify `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`

- [ ] **Step 1: blog/index.astro** — add `import { t } from "@/helpers/t";`, then:

| Old | New |
|---|---|
| `<BaseLayout title="Writing — Nikolay Kost" description="Long-form…holds up.">` | `<BaseLayout title={t("blog.metaTitle")} description={t("blog.metaDescription")}>` |
| `← Back to home` | `{t("blog.back")}` |
| `<div class="eyebrow" …>Writing</div>` | `{t("blog.eyebrow")}` |
| `Notes from the build.` (h1) | `{t("blog.title")}` |
| the lede `<p class="body-l">…</p>` | `{t("blog.lede")}` |

Leave `<PostsSearch>` and the `posts` data untouched.

- [ ] **Step 2: blog/[...slug].astro** — add `import { t, LANG } from "@/helpers/t";`, then:

- Localize the date formatter locale:

| Old | New |
|---|---|
| `d.toLocaleDateString("en-US", {` | `d.toLocaleDateString(LANG === "ru" ? "ru-RU" : "en-US", {` |
| `← All posts` | `{t("post.back")}` |
| `<div class="post-author-bio">JavaScript Developer · Building for the web since 2013</div>` | `{t("post.authorBio")}` |

Leave `{post.data.title}`, `{post.data.excerpt}`, `{post.data.tag}`, `{post.data.readTime}`, the page `title`/`description` (driven by post data), and `Nikolay Kost` author name literal.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/pages/blog/index.astro src/pages/blog/[...slug].astro
git commit -m "i18n: extract blog index/post strings + localize post date"
```

---

### Task 16: Tool page titles + Base64Converter island

**Files:** Modify `src/pages/color.astro`, `src/pages/base64.astro`, `src/pages/tanks.astro`, `src/islands/Base64Converter.tsx`

- [ ] **Step 1: Page titles** — in each page frontmatter add `import { t } from "@/helpers/t";` and replace the `<BaseLayout title="…">`:

| File | Old | New |
|---|---|---|
| color.astro | `title="Color Converter"` | `title={t("tools.colorTitle")}` |
| base64.astro | `title="Base64 Image Converter"` | `title={t("tools.base64Title")}` |
| tanks.astro | `title="Nikolay Kost — JavaScript Developer"` | `title={t("tools.tanksTitle")}` |

- [ ] **Step 2: Base64Converter.tsx** — it already imports `t` from `../helpers/t`. Change the natural-language key:

| Old | New |
|---|---|
| `{ label: t("Transparent"), value: "transparent", …}` | `{ label: t("tools.base64Transparent"), value: "transparent", …}` |

(Confirm there are no other `t("…")` natural-language calls in this file; if any plain UI labels exist, add matching keys under `tools.base64*` in both locale files and update Task 4's parity expectation.)

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/pages/color.astro src/pages/base64.astro src/pages/tanks.astro src/islands/Base64Converter.tsx
git commit -m "i18n: extract tool page titles + Base64Converter label"
```

---

### Task 17: Donate page (fix broken i18next import)

**Files:** Modify `src/pages/donate.astro`

> This page currently does `import { t } from "i18next"`, which breaks once `i18next` is removed in Task 18. Convert it to the project `t()` with dotted keys.

- [ ] **Step 1: Replace the import**

| Old | New |
|---|---|
| `import { t } from "i18next";` | `import { t } from "@/helpers/t";` |

- [ ] **Step 2: Replace the key strings**

| Old | New |
|---|---|
| `title={t("Donate - Nikolay Kost")}` | `title={t("donate.metaTitle")}` |
| `{t("Support My Work 🙏")}` | `{t("donate.title")}` |
| `{t("If you find my work valuable…tools.")}` | `{t("donate.intro")}` |
| `{t("Copy")}` | `{t("donate.copy")}` |

Leave the hardcoded crypto `name`/`address` values and the inline copy script untouched.

- [ ] **Step 3: Verify + commit**

```bash
SITE_LANG=ru npm run build
git add src/pages/donate.astro
git commit -m "i18n: convert donate page off bare i18next to project t()"
```

---

## Phase 3 — Cleanup & verification

### Task 18: Remove dead code and unused deps

**Files:** Delete `src/components/Footer.astro`, delete `public/locales/`; modify `package.json`

- [ ] **Step 1: Confirm `Footer.astro` is unused, then delete**

```bash
grep -rn "components/Footer" src ; echo "exit: $?"   # expect no matches
git rm src/components/Footer.astro
```

- [ ] **Step 2: Delete the superseded public locale stubs**

```bash
git rm -r public/locales
```

- [ ] **Step 3: Remove unused deps**

Edit `package.json` — delete these two lines from `dependencies`:

```json
"astro-i18next": "1.0.0-beta.21",
"i18next": "24.1.2",
```

Then refresh the lockfile:

```bash
npm install
```

- [ ] **Step 4: Verify no lingering references**

```bash
grep -rn "i18next" src ; echo "exit: $?"             # expect no matches
SITE_LANG=ru npm run build                            # expect success
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(i18n): remove dead Footer, public/locales, i18next deps"
```

---

### Task 19: Dual-build verification + Cloudflare deploy doc

**Files:** Create `docs/deploy-cloudflare.md`; decide `.github/workflows/ghpages.yml` fate

- [ ] **Step 1: Full unit test run**

Run: `npm test`
Expected: all `resolve`, `translator`, `i18n-check` tests PASS.

- [ ] **Step 2: Build EN and confirm no leaked keys / correct lang**

```bash
SITE_LANG=en npm run build
grep -rn 'overview\.\|nav\.\|crafts\.\|experience\.\|contact\.\|footer\.\|support\.\|blog\.\|meta\.' dist --include="*.html" ; echo "exit: $?"
# exit 1 (no matches) = no raw dotted keys leaked into HTML
grep -o '<html lang="[a-z]*"' dist/index.html         # expect lang="en"
```

- [ ] **Step 3: Build RU and spot-check**

```bash
SITE_LANG=ru npm run build
grep -o '<html lang="[a-z]*"' dist/index.html          # expect lang="ru"
grep -c 'Николай' dist/index.html                       # >=1 (RU meta/hero present)
```

- [ ] **Step 4: Manual preview of one island per language**

```bash
SITE_LANG=ru npm run preview
```
Open `/`, `/support`, `/base64` (Base64Converter island), `/donate`. Confirm pages render, the Base64 "Transparent" label resolves (not the raw key), RU hero/meta show Russian, body copy shows English placeholders. Ctrl-C when done. Repeat with `SITE_LANG=en`.

- [ ] **Step 5: Write the deploy doc**

Create `docs/deploy-cloudflare.md`:

```markdown
# Cloudflare Pages — dual-language deploy

Two Cloudflare Pages projects build from this one repo:

| Project | Custom domain | Build env | Build command | Output |
|---|---|---|---|---|
| EN | artkost.dev | `SITE_LANG=en` | `npm run build` | `dist` |
| RU | artkost.ru  | `SITE_LANG=ru` | `npm run build` | `dist` |

Set `SITE_LANG` under **Settings → Environment variables → Production** (and Preview) for each project.
`CF_PAGES_URL` is only a fallback hint; with `SITE_LANG` set explicitly it is never consulted.

Local equivalents:
- `SITE_LANG=ru npm run build` → Russian site
- `SITE_LANG=en npm run build` (or unset) → English site
```

- [ ] **Step 6: Remove the now-redundant GitHub Pages workflow**

The site deploys via Cloudflare Pages; the GitHub Pages workflow is redundant.

```bash
git rm .github/workflows/ghpages.yml
```

- [ ] **Step 7: Commit**

```bash
git add docs/deploy-cloudflare.md
git commit -m "docs(i18n): document dual-lang Cloudflare deploy; drop GH Pages workflow"
```

---

## Self-Review

**Spec coverage:**
- ENV contract (`SITE_LANG` default `en`, precedence) → Task 1.
- Compile-time injection / `virtual:i18n` → Task 5.
- `t()` rewrite over pure factory → Tasks 2, 6.
- Extract ALL strings, RU placeholders → Tasks 3, 7–17.
- BaseLayout meta/lang/canonical/JSON-LD → Task 13.
- Site URL per lang → Task 5.
- Cloudflare dual deploy / `SITE_LANG` per project → Task 19.
- Key-parity check (warn-only) → Task 4.
- Remove `astro-i18next`/`i18next`, fix `donate` import, delete `public/locales` → Tasks 17, 18.
- `ghpages.yml` removal (the flagged decision) → Task 19.
- Verification strategy → Tasks 6, 13, 19.

**Placeholder scan:** No "TBD/TODO". Every code step shows full content. RU body values are intentional EN placeholders per approved scope (documented in Task 3), not plan placeholders.

**Type/name consistency:** `resolveLang`, `createTranslator({dict, enDict}) -> { t }`, `virtual:i18n` exports `{ lang, dict, enDict }`, `helpers/t.ts` exports `{ t, LANG }`. Consistent across Tasks 1–6 and all consumers. Key names in extraction tasks (7–17) all exist in the Task 3 dictionaries.
