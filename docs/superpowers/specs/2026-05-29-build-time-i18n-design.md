# Build-time i18n (RU/EN) — Design

**Date:** 2026-05-29
**Status:** Approved (pending spec review)
**Topic:** Single-language static builds selected by `SITE_LANG` env var

## Problem

The site must ship as a **single-language static build** chosen at build time: `SITE_LANG=ru` produces the Russian site, `SITE_LANG=en` (or unset) produces the English site. The two builds deploy to two Cloudflare Pages projects bound to `artkost.ru` and `artkost.dev`.

Current i18n is half-wired and broken:
- `src/helpers/t.ts` is a no-op stub: `t(key)` returns the key verbatim.
- `src/pages/donate.astro` imports `t` from `"i18next"`, which is never initialized.
- `public/locales/{en,ru}/translation.json` are partial stubs; the `ru` file contains English text and has duplicate keys.
- Almost all visible copy is hardcoded English literals across `.astro` components.
- `astro-i18next` is a dependency but is not configured anywhere.

## Scope

**In scope** (decided):
- Build the full ENV → language → lookup mechanism.
- Extract **all** hardcoded visible strings into locale keys.
- `ru.json` values may mirror English as placeholders for now; actual Russian copy is filled in later. This plan is pure engineering — no translation authoring.
- Update deploy configuration for dual Cloudflare Pages deploys.

**Out of scope:**
- Writing real Russian translations (placeholders only).
- Translating blog post markdown content (`src/content/posts/*.md`) — UI chrome only; post bodies stay as authored.
- Runtime language switching / path-based routing (`/en`, `/ru`). Language is fixed per build.

## Requirements (locked)

| Decision | Value |
|---|---|
| ENV var | `SITE_LANG`, values `ru` \| `en` |
| Default when unset/invalid | `en` (forgiving, never fails the build on this) |
| Resolution precedence | explicit `SITE_LANG` → `CF_PAGES_URL` hint → `en` |
| Translation scope | mechanism + extract ALL strings; RU placeholders OK |
| Hosting | Cloudflare Pages, single repo, `SITE_LANG` set per CF project |
| CF_PAGES_URL role | last-resort hint only |

## Chosen approach

**Lightweight custom build-time i18n** (rejected alternatives: `astro-i18next` — beta, Astro 3/4 routing model, likely broken on Astro 5; Astro 5 native `i18n` — a URL-routing system, wrong shape for single-language builds).

Language is resolved **once** at config load and injected as compile-time data via a Vite virtual module, so the same mechanism serves both `.astro` (Node/SSG) and React islands (client bundle) with only the active locale shipped.

## Architecture

### Units

1. **`src/i18n/resolve.mjs`** — pure `resolveLang(env) -> "ru" | "en"`.
   - `env.SITE_LANG ∈ {ru, en}` → return it.
   - else if `env.CF_PAGES_URL` contains the configured RU hint (default regex `/(^|[.\/-])ru([.\/-]|$)/i`, e.g. matches `artkost.ru` or an `-ru` project subdomain) → `ru`.
   - else `en`. Unrecognized `SITE_LANG` → `console.warn` + `en`.
   - Note: since `SITE_LANG` is set per CF project, the `CF_PAGES_URL` branch is a genuine last resort and normally never fires.
   - No side effects; unit-testable.

2. **Vite virtual-module plugin** (in `astro.config.mjs`) — exposes `virtual:i18n`.
   - Calls `resolveLang(process.env)` → `lang`.
   - Reads `src/i18n/locales/<lang>.json` (active `dict`) and `src/i18n/locales/en.json` (`enDict`, fallback).
   - Emits: `export const lang = "<lang>"; export const dict = {...}; export const enDict = {...};`
   - Result is baked into both server render and client island bundles. Only the active locale (+ `en` fallback) ships to the client.

3. **`src/helpers/t.ts`** — rewrite the stub (keep the path; `Footer.astro` and `Base64Converter.tsx` already import it).
   - `import { lang, dict, enDict } from "virtual:i18n"`.
   - `export const LANG = lang`.
   - `t(key: string, vars?: Record<string, string | number>): string` — dotted-path lookup in `dict` → fallback `enDict` → fallback raw `key`; then `{{var}}` interpolation; `\n` preserved.
   - `tRich(key: string, hrefs: string[]): string` — replaces numbered placeholders `<0>text</0>`, `<1>…</1>` with `<a href={hrefs[n]} …>text</a>`; returned as an HTML string for use with `set:html`. (Crafts strings use this convention; avoids a heavy `<Trans>` component.)
   - Missing key → `console.warn` during build.

4. **`src/i18n/locales/en.json` + `ru.json`** — canonical locale data, namespaced by section/page. Supersede and remove `public/locales/*`.

5. **Consuming components** — swap hardcoded literals for `t()` / `tRich()`. No logic changes.

### Language resolution flow

```
astro.config.mjs (Node, has process.env)
  └─> resolveLang(process.env) -> lang
        └─> virtual:i18n plugin loads locales/<lang>.json (+ en.json)
              └─> server render uses dict
              └─> client island bundle inlines dict (active locale only)
```

## String extraction

Replace literals with keys across: `Overview`, `Experience`, `Crafts`, `ContactBlock`, `Navbar`, `SiteFooter`, `Footer`, `BaseLayout` meta, `donate`, `support`, `color`, `base64`, `tanks`, and the blog index/`[...slug]` chrome.

- `en.json`: real English for every key.
- `ru.json`: identical keyset, values mirror EN placeholder (except already-known RU strings).
- Key naming: `<section>.<element>` (e.g. `overview.title`, `nav.blog`, `contact.cta`).

## BaseLayout meta

- `<html lang={LANG}>`.
- `title` / `description` / OG / Twitter copy via `t()`.
- Render **only** the active-language JSON-LD person block (drop the dual blocks).
- `canonical` = active domain; keep both `hreflang` alternate links; `og:locale` = `ru_RU` / `en_US`.

## Site URL

`astro.config.mjs` sets `site` = `https://artkost.ru` (ru) or `https://artkost.dev` (en) from `resolvedLang`, so canonical URLs and any sitemap are correct per build.

## Deploy (Cloudflare Pages)

- Two CF Pages projects, same repo. RU project env `SITE_LANG=ru`; EN project env `SITE_LANG=en`.
- Build command `npm run build`; output dir `dist`. CF injects `SITE_LANG` → correct single-language `dist`.
- **`.github/workflows/ghpages.yml`:** now redundant under Cloudflare. **Recommendation: remove it.** (Confirm: if `artkost.dev` will stay on GitHub Pages instead of CF, keep it and only point RU at CF.)

## Build safety / cleanup

- Prebuild **key-parity check**: compare `en.json` vs `ru.json` keysets → `console.warn` listing any diffs. Forgiving (does not fail the build), matching the default-`en` philosophy.
- Remove dead deps `astro-i18next` and `i18next` from `package.json`.
- Delete the broken `import { t } from "i18next"` in `donate.astro` (replace with `@/helpers/t`).

## Error handling

- Unknown `SITE_LANG` → warn, fall back to `en`.
- Missing translation key → active `dict` → `enDict` → raw key string; warn at build.
- Missing locale JSON file → build fails loudly (it is a committed asset; absence is a real error).

## Verification (no test runner is configured)

1. `SITE_LANG=ru npm run build` and `SITE_LANG=en npm run build` both succeed.
2. Grep `dist/` for leaked raw keys (no `section.key` literals in output HTML).
3. `<html lang>`, `canonical`, and `hreflang` correct for each build.
4. Confirm only the active locale JSON is present in client/island assets.
5. `npm run preview` for each language; spot-check home sections, `donate`, and the `Base64Converter` island (uses `t`).
6. Key-parity check reports no missing keys (after placeholder fill).

## Units summary (isolation)

- `resolve.mjs` — pure lang resolution; testable without Astro.
- virtual-module plugin — provides `virtual:i18n`; depends on `resolve.mjs` + locale files.
- `t.ts` — `t` / `tRich` / `LANG`; pure given the injected dict.
- locale JSONs — data only.
- components — consume `t()`; no i18n logic of their own.
