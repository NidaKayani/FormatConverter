# Contributing converters

Requires **Node.js ≥ 22.13**.

```bash
npm install
npm run dev
npm run docs:check   # sitemap ↔ registry
npm run build && npm run e2e
```

## Add a conversion pair

1. **Implement** a default export under `src/converters/…`:

   ```js
   export default async function myConvert(file, options = {}, onProgress = () => {}) {
     // return Blob or { blob, filename?, ext? }
     return new Blob([…], { type: '…' })
   }
   ```

2. **Register** in [`src/converters/registry.js`](../src/converters/registry.js):

   ```js
   register('from', 'to', () => import('./path/myConvert.js'), [/* option schemas */], {
     env: 'main', // or 'worker' if DOM-free
   })
   ```

3. **Worker** (only if `env: 'worker'`): add a matching loader in [`src/workers/loaders.js`](../src/workers/loaders.js). Anything using canvas, pdf.js, jsPDF, mammoth, xlsx, or ffmpeg must stay on `main`.

4. **Options** — reuse `OPT_*` constants or add schemas with `key`, `label`, `type`, `default`, optional `choices` / `help`. The UI Options panel and SDK docs pick these up automatically.

5. **SEO** — sitemap and prerender import the registry; no manual URL list. After registering, run `npm run docs:check`.

6. **Tests** — extend [`tests/e2e.mjs`](../tests/e2e.mjs) with a focused `check(…)` for the pair.

## Add a multi-file tool

Use `registerTool` in [`src/converters/tools.js`](../src/converters/tools.js) (not the pair matrix). Tools are one-to-many / many-to-one ops (merge, split, watermark).

## Document IR conventions

- Prefer **Markdown** as an intermediate for rich doc → PDF (`mdToPdf` / `PdfBuilder`).
- Prefer **`extractPages` / `pdfToMarkdown`** for PDF → text-like formats.
- Prefer shared **tabular** model for CSV/XLSX and friends.

## Style

Match existing modules: small files, clear defaults, no unnecessary deps. Do not commit secrets or generated `public/tesseract|wasm|ffmpeg|fonts`.
