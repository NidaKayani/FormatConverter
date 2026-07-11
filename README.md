# FormatConvert

A universal file converter that runs entirely in the browser — deployed at
[formatconvert.quantumlogicslimited.com](https://formatconvert.quantumlogicslimited.com).
No server, no uploads: every conversion is a real parse + re-render done locally with JavaScript.

## Supported conversions

**Documents** — real structural transforms, never renames:

| From | To |
| --- | --- |
| PDF | TXT, Markdown, HTML, Word, PNG, JPEG |
| Word (DOCX) | PDF, Markdown, TXT, HTML |
| TXT | PDF, Markdown, HTML, Word |
| Markdown | PDF, TXT, HTML, Word |
| HTML | PDF, Markdown, TXT, Word |

- PDF → text rebuilds lines from character positions so columns and tables stay readable.
- PDF → Markdown infers headings from font sizes, keeps bold text, and detects bullet lists.
- Markdown/HTML → PDF is typeset by a custom layout engine on jsPDF: headings, lists, tables,
  fenced code blocks, blockquotes, links, page numbers, word wrap and page breaks.
- Word documents are parsed with `mammoth` on the way in and generated as real .docx
  (headings, lists, tables, hyperlinks, code shading) with the `docx` library on the way out.

**OCR** — scanned PDFs with no text layer automatically fall back to Tesseract (wasm, fully
self-hosted under `/tesseract/`), and photos/scans convert directly to text
(PNG/JPEG/WebP/BMP/GIF/HEIC → TXT). English is bundled; other languages stream on first use.

**Images** — full decode → canvas → re-encode with quality/resize options:

| Inputs | Outputs |
| --- | --- |
| PNG, JPEG, WebP, BMP, GIF, SVG, HEIC, ICO | PNG, JPEG, WebP, BMP, ICO, PDF |

BMP and ICO encoders are written by hand (browsers can't encode them), HEIC is decoded with
`heic2any`, and PDF pages can be rasterized to images (multi-page → zip).

**Batch** — drop any number of files on a converter page; each converts independently with a
per-file queue, and results download individually or as one zip. Also in the SDK as
`convertMany()` + `zipResults()`.

**PWA** — installable, works fully offline (app shell precached; OCR assets cached on first
use). Paste input with Ctrl+V; last-used options are remembered per conversion.

## Routes

Client-side routing via React Router:

- `/` — universal dropzone with format auto-detection + all converter tiles
- `/convert/:pair` — e.g. `/convert/pdf-to-md`, one page per conversion
- `/developers` — SDK & embed documentation for developers
- `/embed` — chrome-less iframe widget (`?from=pdf&to=txt`), posts results to the parent window

## Developer SDK

The same converters ship as a standalone ES module at `/sdk.js`:

```js
import { convert } from 'https://formatconvert.quantumlogicslimited.com/sdk.js'

const { blob, filename } = await convert(file, 'md') // input format auto-detected
```

See `/developers` on the site for the full API (`convert`, `detectFormat`, `listConversions`,
`targetsFor`, `FORMATS`), all options, and the iframe embed protocol.

## Development

Requires Node.js 18+.

```bash
npm install
npm run dev        # app at http://localhost:5173
npm run e2e        # browser end-to-end suite (uses your installed Chrome, needs `npm run build` + `npm run preview` running)
```

`predev`/`prebuild` copy the Tesseract OCR runtime (worker, wasm cores, English data) from
node_modules into `public/tesseract/` — that directory is generated, gitignored, and safe to
delete.

## Build & deploy

```bash
npm run build      # builds the app AND dist/sdk.js (+ pdf.worker.min.mjs)
npm run preview
```

`dist/` is fully static — deploy anywhere.

**Vercel:** just import the repo — the included `vercel.json` already configures the SPA
fallback rewrite, CORS headers for `/sdk.js` + `/pdf.worker.min.mjs` (so other sites can
import the SDK), and long-term caching for hashed assets. Vercel auto-detects Vite and runs
`npm run build`, which produces both the app and the SDK.

**Other hosts**, two notes:

1. **SPA fallback:** client-side routes need a rewrite of all paths to `/index.html`
   (Netlify `_redirects`: `/* /index.html 200`; nginx `try_files`).
2. **SDK CORS (optional):** to let other sites import `/sdk.js`, serve `sdk.js` and
   `pdf.worker.min.mjs` with `Access-Control-Allow-Origin: *`.

## Project structure

```
src/
├── converters/          # framework-free conversion engine (shared by app + SDK)
│   ├── index.js         # convert(file, to, options) entry point
│   ├── registry.js      # format metadata + conversion matrix + option schemas
│   ├── detect.js        # magic-byte format detection
│   ├── docs/            # PDF/TXT/MD/HTML converters + jsPDF layout engine
│   └── images/          # canvas pipeline, BMP/ICO encoders, HEIC, PDF↔image
├── sdk/                 # entry for the standalone dist/sdk.js build
├── pages/               # Home, Convert, Developers, Embed, NotFound
├── components/          # Layout, Dropzone, ConverterWidget, OptionsPanel, ...
└── main.jsx             # React Router setup
```
