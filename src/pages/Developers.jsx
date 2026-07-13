import { useState } from 'react'
import { FORMATS, listConversions, KINDS, listTools } from '../converters/index.js'

const ORIGIN = 'https://formatconvert.quantumlogicslimited.com'

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="codeblock">
      <button className="codeblock-copy" onClick={copy}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

const QUICKSTART = `<input type="file" id="picker" />

<script type="module">
  import { convert } from '${ORIGIN}/sdk.js'

  document.getElementById('picker').addEventListener('change', async (e) => {
    const file = e.target.files[0]

    // Convert anything to anything — input format is auto-detected
    const { blob, filename } = await convert(file, 'pdf')

    // Do whatever you want with the result: download it, upload it, preview it
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  })
</script>`

const OPTIONS_EXAMPLE = `import { convert } from '${ORIGIN}/sdk.js'

// Markdown → PDF on US Letter paper
const pdf = await convert(mdFile, 'pdf', { pageSize: 'letter' })

// JPEG → WebP at 80% quality, resized to 1200px wide
const webp = await convert(photo, 'webp', { quality: 0.8, width: 1200 })

// PNG → favicon.ico with three embedded sizes
const ico = await convert(logo, 'ico', { sizes: [16, 32, 48] })

// PDF → PNG at 3× resolution, with page-by-page progress
const images = await convert(pdfFile, 'png', {
  scale: 3,
  onProgress: ({ page, total }) => console.log(\`page \${page}/\${total}\`),
})

// Word → Markdown, and Markdown → a real .docx
const md = await convert(docxFile, 'md')
const docx = await convert(mdFile, 'docx')

// A photo of text → the text itself (OCR runs locally too)
const text = await convert(photoOfReceipt, 'txt', { ocrLanguage: 'eng' })`

const BATCH_EXAMPLE = `import { convertMany, zipResults } from '${ORIGIN}/sdk.js'

const ac = new AbortController()
const results = await convertMany(fileList, 'pdf', {
  concurrency: 2, // default 2, max 4
  signal: ac.signal, // optional AbortSignal
  onProgress: ({ fileIndex, fileCount, page, total }) =>
    console.log(\`file \${fileIndex + 1}/\${fileCount}\`),
})

// results: [{ file, ok, result?, error? }] — one failure doesn't stop the rest
const failed = results.filter((r) => !r.ok)

// Bundle everything that succeeded into one zip
const { blob, filename } = await zipResults(results, 'converted.zip')`

const DETECT_EXAMPLE = `import { detectFormat, targetsFor, listConversions, FORMATS } from '${ORIGIN}/sdk.js'

const format = await detectFormat(file)     // e.g. 'pdf' (magic bytes, not extension)
const targets = targetsFor(format)          // e.g. ['txt', 'md', 'html', 'png', 'jpg']
const matrix = listConversions()            // every supported { from, to, options } pair
console.log(FORMATS[format].label)          // human-readable name`

const GLOBAL_EXAMPLE = `<script type="module" src="${ORIGIN}/sdk.js"></script>
<script type="module">
  // The module also registers a window.FormatConvert global
  const { blob, filename } = await window.FormatConvert.convert(file, 'md')
</script>`

const EMBED_EXAMPLE = `<iframe
  src="${ORIGIN}/embed?from=pdf&to=md&theme=light"
  width="480" height="420" style="border:0; border-radius:12px"
></iframe>

<script>
  // Receive the converted file from the iframe
  window.addEventListener('message', (event) => {
    if (event.origin !== '${ORIGIN}') return
    if (event.data?.type !== 'formatconvert:result') return
    const { blob, filename, from, to } = event.data
    // blob is a real Blob — save it, upload it, read it
  })
</script>`

export default function Developers() {
  const conversions = listConversions()
  const tools = listTools()
  const sources = [...new Set(conversions.map((c) => c.from))]
  const kindsWithSources = KINDS.filter((kind) =>
    sources.some((from) => FORMATS[from].kind === kind.id)
  )

  return (
    <div className="docs">
      <header className="header">
        <h1>Developer API</h1>
        <p>
          Use every FormatConvert conversion in your own site or app with one import. The SDK runs
          entirely in the user&apos;s browser — no uploads, no API keys, no rate limits, no backend.
        </p>
      </header>

      <section className="section">
        <h2>Quick start</h2>
        <p>
          Import the SDK straight from <code>{ORIGIN}/sdk.js</code> — no install step, no build
          tooling required:
        </p>
        <CodeBlock code={QUICKSTART} />
        <p>
          <code>convert(file, to, options?)</code> returns{' '}
          <code>{'Promise<{ blob, filename, from, to }>'}</code>. The input format is detected from
          the file&apos;s magic bytes; pass <code>options.from</code> to override it.
        </p>
      </section>

      <section className="section">
        <h2>Conversion options</h2>
        <CodeBlock code={OPTIONS_EXAMPLE} />
        <table className="docs-table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Applies to</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>pageSize</code></td><td>any → PDF</td><td><code>'a4'</code> (default) or <code>'letter'</code></td></tr>
            <tr><td><code>quality</code></td><td>→ JPEG / WebP</td><td>0.1 – 1, default 0.92</td></tr>
            <tr><td><code>width</code></td><td>image → image</td><td>Resize to this width in px, aspect kept</td></tr>
            <tr><td><code>background</code></td><td>→ JPEG / BMP</td><td>Fill for transparent areas, default <code>#ffffff</code></td></tr>
            <tr><td><code>sizes</code></td><td>→ ICO</td><td>Array of icon sizes, default <code>[16, 32, 48]</code>, max 256</td></tr>
            <tr><td><code>scale</code></td><td>PDF → image</td><td>Render resolution multiplier: 1, 2 (default) or 3</td></tr>
            <tr><td><code>ocr</code></td><td>PDF → text formats</td><td><code>'auto'</code> (default: OCR scanned PDFs with no text layer) or <code>'off'</code></td></tr>
            <tr><td><code>ocrLanguage</code></td><td>OCR conversions</td><td>Tesseract language code, default <code>'eng'</code> (bundled); others stream on first use</td></tr>
            <tr><td><code>from</code></td><td>all</td><td>Force the input format instead of auto-detecting</td></tr>
            <tr><td><code>onProgress</code></td><td>all</td><td>Callback receiving <code>{'{ page, total, stage }'}</code></td></tr>
            <tr><td><code>signal</code></td><td>convert / convertMany / runTool</td><td><code>AbortSignal</code> to cancel in-flight work</td></tr>
            <tr><td><code>concurrency</code></td><td>convertMany</td><td>Parallelism 1–4 (default 2)</td></tr>
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Batch conversion</h2>
        <p>Convert many files at once and bundle the results:</p>
        <CodeBlock code={BATCH_EXAMPLE} />
      </section>

      <section className="section">
        <h2>Detection &amp; capability discovery</h2>
        <CodeBlock code={DETECT_EXAMPLE} />
      </section>

      <section className="section">
        <h2>Global build</h2>
        <p>Prefer not to use import statements? The module also registers a global:</p>
        <CodeBlock code={GLOBAL_EXAMPLE} />
      </section>

      <section className="section">
        <h2>Drop-in iframe widget</h2>
        <p>
          Want the full UI without writing any conversion code? Embed the converter and listen for
          the result:
        </p>
        <CodeBlock code={EMBED_EXAMPLE} />
        <p>
          Query params: <code>from</code> and <code>to</code> select the conversion (defaults:{' '}
          <code>pdf</code> → <code>txt</code>). Optional <code>theme=light|dark</code> forces the
          embed color scheme.
        </p>
      </section>

      <section className="section">
        <h2>Supported conversions</h2>
        <p>Generated live from the converter registry — this table is always accurate.</p>
        {kindsWithSources.map((kind) => {
          const kindSources = sources.filter((from) => FORMATS[from].kind === kind.id)
          return (
            <div key={kind.id} data-kind={kind.id}>
              <h3>{kind.label}</h3>
              <table className="docs-table matrix">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                  </tr>
                </thead>
                <tbody>
                  {kindSources.map((from) => (
                    <tr key={from}>
                      <td>
                        <strong>{FORMATS[from].label}</strong>
                      </td>
                      <td>
                        {conversions
                          .filter((c) => c.from === from)
                          .map((c) => FORMATS[c.to].label)
                          .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </section>

      <section className="section">
        <h2>Tools API</h2>
        <p>
          Multi-input operations (merge, split, combine) use <code>runTool</code> /{' '}
          <code>listTools</code> — additive to <code>convert()</code>, which stays one-file in /
          one-file out.
        </p>
        <CodeBlock
          code={`import { runTool, listTools } from '${ORIGIN}/sdk.js'

const tools = listTools() // [{ id, label, description, inputs, output, options }]
const { blob, filename } = await runTool('merge-pdf', pdfFiles)`}
        />
        {tools.length === 0 ? (
          <p className="meta">No multi-input tools registered yet — coming in later v4 phases.</p>
        ) : (
          <ul className="docs-notes">
            {tools.map((t) => (
              <li key={t.id}>
                <code>{t.id}</code> — {t.label}: {t.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2>Notes</h2>
        <ul className="docs-notes">
          <li>
            <strong>Privacy:</strong> conversions run entirely in the browser — including WebAssembly
            engines for OCR (Tesseract), AVIF, and audio/video (ffmpeg.wasm). Files are never sent to
            our servers (there are none).
          </li>
          <li>
            <strong>SDK threading:</strong> the public <code>/sdk.js</code> bundle always runs
            converters on the main thread. Cross-origin module workers are not constructible, so
            worker routing is app-only. Heavy work (pdf.js, Tesseract, ffmpeg) still uses each
            library&apos;s own workers where available.
          </li>
          <li>
            <strong>PDF worker:</strong> PDF conversions load{' '}
            <code>{ORIGIN}/pdf.worker.min.mjs</code>. If your site&apos;s CSP blocks cross-origin
            workers, pdf.js automatically falls back to main-thread processing.
          </li>
          <li>
            <strong>OCR:</strong> scanned PDFs and photos of text are recognized locally with
            Tesseract (wasm), self-hosted from <code>{ORIGIN}/tesseract/</code>. First OCR use
            downloads ~8 MB of engine + English data, cached afterwards. Other languages stream
            from the tesseract.js data CDN.
          </li>
          <li>
            <strong>Data formats:</strong> CSV/TSV/XLSX use a shared tabular model. JSON/YAML/TOML/XML
            preserve tree types when converting among themselves; non-tabular trees refuse
            table targets with an actionable error. XML attributes use the <code>@_</code> prefix.
            TIFF encode is uncompressed. SheetJS (XLSX) stays on the main thread; other data pairs
            can run in the app worker.
          </li>
          <li>
            <strong>Audio &amp; video:</strong> powered by single-thread ffmpeg.wasm (~31 MB,
            cached in IndexedDB after the first download from <code>{ORIGIN}/ffmpeg/</code>).
            Keep media under ~500 MB (hard refuse above 600 MB). Video can extract to
            mp3/wav/ogg/flac/m4a. WebM output is gated on libvpx in the bundled core — if missing,
            use MP4.
          </li>
          <li>
            <strong>SEO shells:</strong> build-time prerender writes static HTML under{' '}
            <code>/convert/…</code> and <code>/tools/…</code> with title, description, canonical,
            and JSON-LD. The SPA still hydrates in the browser; dynamic OG images remain client-side.
          </li>
          <li>
            <strong>Install as an app:</strong> the site is a PWA — installed, it converts fully
            offline (OCR and ffmpeg too, once their assets have been cached). Share Target opens
            shared files in the home detector.
          </li>
          <li>
            <strong>Browser support:</strong> evergreen browsers (Chrome, Edge, Firefox, Safari
            16+). AVIF encode and some media codecs vary by browser.
          </li>
          <li>
            <strong>Input-only note:</strong> SVG, HEIC, and MOV are supported as inputs where
            listed; WebM is both input and output when the engine includes libvpx.
          </li>
        </ul>
      </section>
    </div>
  )
}
