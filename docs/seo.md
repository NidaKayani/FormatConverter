# SEO maintenance

## Sources of truth

| Concern | File |
| --- | --- |
| Pair / kind descriptions, FAQ, origin | [`src/seo/copy.js`](../src/seo/copy.js) |
| Runtime head tags | [`src/components/Seo.jsx`](../src/components/Seo.jsx) |
| Sitemap + robots | [`scripts/generate-sitemap.mjs`](../scripts/generate-sitemap.mjs) |
| Prerender shells + OG SVGs + home `index.html` inject | [`scripts/generate-seo.mjs`](../scripts/generate-seo.mjs) |

`prebuild` regenerates the sitemap; `npm run build` runs Vite then `generate-seo.mjs`.

## Checklist when adding a convert pair or tool

1. Register in `registry.js` / `tools.js` (URLs follow automatically).
2. Optionally add a keyed entry to `DESCRIPTIONS` in `src/seo/copy.js`.
3. Run `npm run docs:check` (regenerates sitemap and asserts URL count).
4. Build once and spot-check `dist/convert/…/index.html` (title, canonical, `og:image`).

## Hosting note (Vercel)

`vercel.json` SPA-rewrites `/(.*)` → `/index.html`. **Existing static files win** — prerendered
`/convert/pdf-to-txt/index.html` and `/og/*.svg` are served as files. On hosts that always force
the SPA shell, crawlers would only see the home meta; prefer “static file first, then SPA fallback”
(as Vercel does).

## noindex

`/embed` and the 404 page set `noindex` via `<Seo noindex />`. Robots also `Disallow: /embed`.

## OG images

Build writes SVG cards under `dist/og/` (and `public/og/default.svg` for local/dev). Titles and
descriptions still differentiate pages when a crawler ignores SVG images.
