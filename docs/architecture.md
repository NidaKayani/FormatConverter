# Architecture

```
UI / SDK / Embed
       │
       ▼
 converters/index.js   convert · convertMany · runTool
       │
       ├─ registry.js  FORMATS · option schemas · register()
       ├─ tools.js     multi-input tools
       ├─ detect.js    magic-byte detection
       └─ modules      docs/ · images/ · data/ · ocr/ · av/ · ebook/ …
              │
              ├─ main thread (pdf.js, jsPDF, canvas OCR, ffmpeg, mammoth, xlsx)
              └─ worker (DOM-free pairs via convert.worker.js + loaders.js)
```

## Document pipeline highlights

| Path | Key modules |
| --- | --- |
| PDF → TXT/MD/HTML/DOCX | `pdfExtract` (column-aware lines) → structure builders; OCR via `pdfOcr` |
| TXT → PDF | `textToPdf` → `PdfBuilder`; optional Markdown mode → `mdToPdf` |
| MD/HTML/DOCX → PDF | Normalize to Markdown where needed → `PdfBuilder` (+ optional Noto font) |

`PdfBuilder` (`docs/pdfLayout.js`) is the shared typesetter: wrap, headings, lists, tables, code, quotes, page numbers. Unicode uses lazily loaded `/fonts/NotoSans-*.ttf` from `copy-assets.mjs`.

## App vs SDK

- App build (`vite.config.js`): React Router UI, PWA, optional worker routing (`__SDK__ = false`).
- SDK build (`vite.sdk.config.js`): `src/sdk/entry.js` → `/sdk.js`, always main-thread converters.

## Assets (generated)

| Path | Source |
| --- | --- |
| `public/tesseract/` | tesseract.js + eng data |
| `public/wasm/` | @jsquash/avif |
| `public/ffmpeg/` | @ffmpeg/core |
| `public/fonts/` | Noto Sans Regular/Bold (download) |

All are gitignored and refreshed by `predev` / `prebuild` → `scripts/copy-assets.mjs`.

## SEO

See [seo.md](./seo.md). Meta copy lives in `src/seo/copy.js` (shared by UI and build scripts).
