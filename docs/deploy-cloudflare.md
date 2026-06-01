# Cloudflare Pages — dual-language deploy

Two Cloudflare Pages projects build from this one repo:

| Project | Custom domain | Build env       | Build command   | Output |
|---------|---------------|-----------------|-----------------|--------|
| EN      | artkost.dev   | `SITE_LANG=en`  | `npm run build` | `dist` |
| RU      | artkost.ru    | `SITE_LANG=ru`  | `npm run build` | `dist` |

Set `SITE_LANG` under **Settings → Environment variables → Production** (and Preview) for each project. `CF_PAGES_URL` is only a fallback hint; with `SITE_LANG` set explicitly it is never consulted.

Local equivalents:

- `SITE_LANG=ru npm run build` → Russian site
- `SITE_LANG=en npm run build` (or unset) → English site
