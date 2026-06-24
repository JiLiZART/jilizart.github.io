# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal portfolio for Nikolay Kost (`@jilizart`) — static site built with **Astro 5** + **React 18 islands**, styled with **Tailwind** (class dark mode, Inter font). Served bilingually from two domains: `artkost.dev` (en) and `artkost.ru` (ru).

## Commands

```bash
npm run dev      # dev server on https://localhost:4322 (HTTPS, see note below)
npm run build    # static build to ./dist
npm run preview  # serve the built ./dist locally
npm run astro    # Astro CLI (e.g. npm run astro -- add <integration>)
```

- **No test runner, linter, or formatter is configured.** Type safety comes only from the strict `tsconfig` (extends `astro/tsconfigs/strict`) via the editor / `astro check` (the `@astrojs/check` package is not installed, so `astro check` needs `npx astro check` which will pull it in).
- **Package manager mismatch:** `package.json` pins `pnpm@9`, but the CI deploy workflow runs `npm install`. The committed lockfile is `package-lock.json`. Prefer `npm` to match CI unless changing this deliberately.

## Dev server HTTPS

`astro.config.mjs` forces HTTPS in dev using `localhost.pem` / `localhost-key.pem` at the repo root (read synchronously at config load). If those files are missing the dev server won't start — regenerate them (e.g. with `mkcert`) before running `npm run dev`.

## Deploy

`.github/workflows/ghpages.yml` builds and deploys to **GitHub Pages** on every push to `main` (uploads `./dist`). No staging — a merge to `main` ships to production.

## Architecture

### Page composition
- Routes are files in `src/pages/` (Astro routing). Every page wraps content in `src/layouts/BaseLayout.astro`.
- The home page (`src/pages/index.astro`) is assembled from section components in `src/components/sections/` (`Overview`, `Experience`, `Crafts`, plus `ContactBlock`). `BlogStrip` is currently commented out.
- `BaseLayout.astro` owns the document shell: `<head>` SEO/OG/Twitter meta, dual (en+ru) JSON-LD person schema, `hreflang` links to the sibling domain, `ViewTransitions`, the `Navbar`/`SiteFooter`, and the PostHog snippet. Visual content goes through `<slot />` inside `<main class="wrap-wide">`.

### Islands (React in Astro)
- `src/islands/*.tsx` are interactive React components. They are explicitly hydrated where used with `client:load` (tools/games) or `client:visible` (`CopyButton`). Astro renders everything else as static HTML — keep logic in `.astro` unless interactivity is required.
- **Active islands:** `ColorConverter` (`/color`), `Base64Converter` (`/base64`), `TankGame` (`/tanks`), `PostsSearch` (`/blog`), `CopyButton` (`/support`).
- **Dormant islands:** `TweaksPanel`, `ClickSpark`, `Cursor`, `Cursors` are implemented but not mounted anywhere. `Cursors` is a Pusher-backed multiplayer-cursor demo. Don't assume they run in the live site.

### Theming
- Theme + accent color live in CSS custom properties (`oklch`-based) in `src/styles/global.css` (~1k lines, the single global stylesheet). Dark mode = `dark` class on `<html>`.
- Tweak state (theme, `accentHue`) is persisted to `localStorage` under the key **`__tweaks`**. An inline `is:inline` script in `BaseLayout.astro` reads it and applies the `dark` class + accent variables **before first paint** (avoids FOUC). `TweaksPanel.tsx` is the UI that writes the same key. If you change the tweak shape, update **both** the pre-paint script and the panel.

### Content
- Blog posts are an Astro **content collection** (`src/content/posts/*.md`), schema in `src/content/config.ts`: `title`, `excerpt`, `date`, `tag` (enum: Engineering | Open source | Process | Craft), `readTime`, optional `draft`. `/blog` lists them; `/blog/[...slug].astro` renders each.

### Data & helpers
- `src/data/socials.ts` — `SOCIALS`, `CRYPTO_ADDRESSES`, and inline brand SVG path strings (`SOCIAL_PATHS`). `src/data/tech.ts` — tech stack chips. Edit these rather than hardcoding links/icons in components.
- `src/games/` — `TankGame.tsx` split into `render.ts` / `util.ts` / `types.ts`.
- Path alias: **`@/*` → `src/*`** (tsconfig).

### i18n (important caveat)
- `astro-i18next` and `public/locales/{en,ru}/translation.json` exist, but `src/helpers/t.ts` is a **no-op stub** — `t(key)` returns the key verbatim and `Trans` returns children unchanged. Translation is **not** wired through the helper. Bilingual behavior today is achieved via the two domains + duplicated en/ru meta in `BaseLayout`, not runtime string lookup. Don't trust `t()` to localize.

### Third-party services
Declared env vars (`src/env.d.ts`, all `PUBLIC_`): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`. `@supabase/supabase-js`, `pusher-js`, and `posthog-js` are dependencies; PostHog loads via `src/components/Posthog.astro`.
