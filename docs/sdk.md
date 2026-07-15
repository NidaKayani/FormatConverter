# FormatConvert SDK

Origin: `https://formatconvert.quantumlogicslimited.com`

Import as an ES module (CORS enabled on the host):

```js
import {
  convert,
  convertMany,
  zipResults,
  detectFormat,
  listConversions,
  targetsFor,
  FORMATS,
  KINDS,
  runTool,
  listTools,
} from 'https://formatconvert.quantumlogicslimited.com/sdk.js'
```

Or via global after a module script load: `window.FormatConvert`.

## convert(file, to, options?)

- `file` — `File` or `Blob` (prefer `File` so names stick)
- `to` — target format id (`'pdf'`, `'txt'`, `'webp'`, …)
- `options` — see option schemas from `listConversions()` / the Developers page

Returns `Promise<{ blob, filename, from, to, ext? }>`.

```js
const { blob, filename } = await convert(file, 'pdf', {
  pageSize: 'letter',
  font: 'noto',
  fontSize: 12,
  pageNumbers: 'off',
})
```

Notable document options:

| Option | Pairs | Notes |
| --- | --- | --- |
| `ocr` | PDF → txt/md/html/docx | `auto` \| `force` \| `off` |
| `pageBreaks` | PDF → txt | `marker` \| `formfeed` \| `none` |
| `mode` | TXT → pdf | `plain` \| `markdown` \| `detect` |
| `font` | * → pdf | `helvetica` \| `times` \| `courier` \| `noto` |
| `fontSize`, `margin`, `lineHeight`, `pageNumbers` | * → pdf | Typesetting |

## convertMany(files, to, options?)

Batch with `concurrency` (1–4) and optional `signal`. One failure does not abort the rest.

## zipResults(results, filename?)

Bundle successful `convertMany` outputs into one zip.

## detectFormat / targetsFor / listConversions

Capability discovery from the same registry as the UI.

## runTool(id, files, options?)

Multi-input tools (`merge-pdf`, `split-pdf`, …). See `listTools()`.

## Embed iframe

```html
<iframe
  src="https://formatconvert.quantumlogicslimited.com/embed?from=pdf&to=txt&theme=light"
  width="480" height="420" style="border:0"
></iframe>
```

Parent listens for `message` events with `type: 'formatconvert:result'` and checks `event.origin`.

## Limits

- Fully client-side — memory and WASM size matter for AV (`ffmpeg.wasm` ~31 MB).
- Keep media under ~500 MB when possible (hard refuse above 600 MB).
- CJK PDF fonts are best-effort; prefer `font: 'noto'` for Latin Extended / symbols.
- Public `/sdk.js` always runs converters on the main thread (worker routing is app-only).
