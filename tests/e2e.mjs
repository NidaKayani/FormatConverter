/**
 * Browser end-to-end suite. Drives the real built app in your installed
 * Chrome/Edge (no browser download):
 *
 *   npm run build && npm run e2e
 *
 * Starts `vite preview` itself, imports /sdk.js inside the page, and checks
 * every conversion family plus the UI routes, embed protocol, batch UI,
 * OCR and offline PWA behavior.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)
const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!executablePath) {
  console.error('No Chrome/Edge found. Set CHROME_PATH.')
  process.exit(1)
}

// --- start vite preview and wait for its URL ---------------------------------
const preview = spawn('npm', ['run', 'preview'], { shell: true })
const BASE = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('vite preview did not start')), 30000)
  let buffer = ''
  preview.stdout.on('data', (chunk) => {
    // eslint-disable-next-line no-control-regex
    buffer += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')
    const m = /Local:\s*(http:\/\/localhost:\d+)/.exec(buffer)
    if (m) {
      clearTimeout(timer)
      resolve(m[1])
    }
  })
})
const stopPreview = () => {
  try {
    process.platform === 'win32'
      ? spawn('taskkill', ['/pid', preview.pid, '/f', '/t'], { shell: true })
      : preview.kill('SIGTERM')
  } catch {
    // best effort
  }
}

const results = []
const log = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext()
const page = await context.newPage()
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))

await page.goto(BASE + '/', { waitUntil: 'networkidle' })

// -----------------------------------------------------------------------------
// 1. SDK conversion matrix (documents, images, docx, batch, detection)
// -----------------------------------------------------------------------------
const sdkReport = await page.evaluate(async () => {
  const out = []
  const sdk = await import('/sdk.js')
  const { convert, convertMany, zipResults, detectFormat, listConversions } = sdk

  const MD = `# Report Title

Intro paragraph with **bold**, *italic*, \`code\`, and a [link](https://example.com).

## Features

- first bullet
- second bullet with more words to wrap around the line maybe
1. numbered one
2. numbered two

> A blockquote about conversion quality.

\`\`\`js
function hello() { return 42 }
\`\`\`

| Col A | Col B |
| ----- | ----- |
| a1    | b1    |
| a2    | b2    |

Final paragraph UNIQUEMARKER123.
`
  const TXT = `Chapter One

This is plain text with special md chars: *stars* and _underscores_ and # hash.

# this leading hash is not a heading
- this leading dash is not a bullet

Second paragraph line one
second paragraph line two`
  const HTML = `<!doctype html><html><head><title>T</title><style>p{color:red}</style></head>
<body><h1>Doc Heading</h1><p>Para with <strong>bold</strong> and <a href="https://x.com">link</a>.</p>
<ul><li>item one</li><li>item two</li></ul>
<table><tr><th>H1</th><th>H2</th></tr><tr><td>c1</td><td>c2</td></tr></table>
<script>ignore_me()</script></body></html>`

  const mdFile = new File([MD], 'sample.md', { type: 'text/markdown' })
  const txtFile = new File([TXT], 'sample.txt', { type: 'text/plain' })
  const htmlFile = new File([HTML], 'sample.html', { type: 'text/html' })

  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 120
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 200, 0)
  grad.addColorStop(0, 'rgba(255,0,0,1)')
  grad.addColorStop(1, 'rgba(0,0,255,0.5)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 200, 120)
  const pngBlob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const pngFile = new File([pngBlob], 'img.png', { type: 'image/png' })

  const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="tomato"/></svg>`
  const svgFile = new File([SVG], 'img.svg', { type: 'image/svg+xml' })
  const gifBytes = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0))
  const gifFile = new File([gifBytes], 'img.gif', { type: 'image/gif' })

  const magic = async (blob, ...bytes) => {
    const head = new Uint8Array(await blob.slice(0, bytes.length).arrayBuffer())
    return bytes.every((b, i) => (typeof b === 'string' ? String.fromCharCode(head[i]) === b : head[i] === b))
  }

  const check = async (name, fn) => {
    try {
      const r = await fn()
      out.push({ name, ok: r === undefined || !!r, detail: typeof r === 'string' ? r : '' })
    } catch (e) {
      out.push({ name, ok: false, detail: e.message })
    }
  }

  // --- documents ---
  let mdPdf
  await check('md → pdf', async () => {
    mdPdf = await convert(mdFile, 'pdf')
    return (await magic(mdPdf.blob, '%', 'P', 'D', 'F')) && mdPdf.filename === 'sample.pdf'
  })
  await check('md → txt (content survives)', async () => {
    const t = await (await convert(mdFile, 'txt')).blob.text()
    return t.includes('Report Title') && t.includes('UNIQUEMARKER123') && t.includes('- first bullet') && !t.includes('**')
  })
  await check('md → html', async () => {
    const t = await (await convert(mdFile, 'html')).blob.text()
    return t.includes('<h1') && t.includes('<table>') && t.includes('UNIQUEMARKER123')
  })
  await check('txt → pdf', async () => magic((await convert(txtFile, 'pdf')).blob, '%', 'P', 'D', 'F'))
  await check('txt → md (escaping)', async () => {
    const t = await (await convert(txtFile, 'md')).blob.text()
    return t.includes('\\*stars\\*') && t.includes('\\# this leading hash') &&
      t.includes('\\- this leading dash') && t.includes('and # hash')
  })
  await check('txt → html', async () => {
    const t = await (await convert(txtFile, 'html')).blob.text()
    return t.includes('<p>') && t.includes('Chapter One')
  })
  await check('html → md (structure + gfm table, scripts stripped)', async () => {
    const t = await (await convert(htmlFile, 'md')).blob.text()
    return t.includes('# Doc Heading') && t.includes('**bold**') && t.includes('| H1') && !t.includes('ignore_me')
  })
  await check('html → txt', async () => {
    const t = await (await convert(htmlFile, 'txt')).blob.text()
    return t.includes('Doc Heading') && t.includes('- item one') && !t.includes('<') && !t.includes('color:red')
  })
  await check('html → pdf', async () => magic((await convert(htmlFile, 'pdf')).blob, '%', 'P', 'D', 'F'))

  // --- PDF round-trips ---
  const pdfFile = new File([mdPdf.blob], 'gen.pdf', { type: 'application/pdf' })
  await check('pdf → txt (real extraction)', async () => {
    const t = await (await convert(pdfFile, 'txt')).blob.text()
    return t.includes('Report Title') && t.includes('UNIQUEMARKER123')
  })
  await check('pdf → md (headings reconstructed)', async () => {
    const t = await (await convert(pdfFile, 'md')).blob.text()
    return t.includes('# Report Title') && t.includes('## Features')
  })
  await check('pdf → html', async () => {
    const t = await (await convert(pdfFile, 'html')).blob.text()
    return t.includes('<h1') && t.includes('Report Title')
  })
  await check('pdf → png (page render)', async () => {
    const r = await convert(pdfFile, 'png', { scale: 1 })
    return (await magic(r.blob, 0x89, 'P', 'N', 'G')) || r.filename.endsWith('.zip')
  })
  await check('pdf → jpg', async () => {
    const r = await convert(pdfFile, 'jpg', { scale: 1 })
    return (await magic(r.blob, 0xff, 0xd8, 0xff)) || r.filename.endsWith('.zip')
  })
  await check('multi-page pdf → png = zip', async () => {
    const longMd = new File(['# Long\n\n' + 'lorem ipsum dolor sit amet\n\n'.repeat(200)], 'long.md')
    const pdf = await convert(longMd, 'pdf')
    const imgs = await convert(new File([pdf.blob], 'long.pdf'), 'png', { scale: 1 })
    return imgs.filename.endsWith('.zip') && (await magic(imgs.blob, 'P', 'K'))
  })

  // --- DOCX (v3) ---
  let mdDocx
  await check('md → docx (real OOXML zip)', async () => {
    mdDocx = await convert(mdFile, 'docx')
    if (!(await magic(mdDocx.blob, 'P', 'K'))) return false
    // a real OOXML container lists word/document.xml in its zip directory
    const buf = new Uint8Array(await mdDocx.blob.arrayBuffer())
    const asText = new TextDecoder('latin1').decode(buf)
    return asText.includes('word/document.xml')
  })
  await check('docx → md (round-trip: structure survives)', async () => {
    const back = await convert(new File([mdDocx.blob], 'x.docx'), 'md')
    const t = await back.blob.text()
    return t.includes('# Report Title') && t.includes('UNIQUEMARKER123') && t.includes('**bold**')
  })
  await check('docx → txt', async () => {
    const t = await (await convert(new File([mdDocx.blob], 'x.docx'), 'txt')).blob.text()
    return t.includes('Report Title') && t.includes('UNIQUEMARKER123')
  })
  await check('docx → html', async () => {
    const t = await (await convert(new File([mdDocx.blob], 'x.docx'), 'html')).blob.text()
    return t.includes('Report Title')
  })
  await check('docx → pdf', async () => magic((await convert(new File([mdDocx.blob], 'x.docx'), 'pdf')).blob, '%', 'P', 'D', 'F'))
  await check('detect docx by container (wrong extension)', async () =>
    (await detectFormat(new File([mdDocx.blob], 'liar.zip'))) === 'docx')

  // --- images ---
  await check('png → jpg (flattened)', async () => magic((await convert(pngFile, 'jpg')).blob, 0xff, 0xd8, 0xff))
  await check('png → webp', async () => magic((await convert(pngFile, 'webp', { quality: 0.8 })).blob, 'R', 'I', 'F', 'F'))
  let bmpR
  await check('png → bmp (hand-written encoder)', async () => {
    bmpR = await convert(pngFile, 'bmp')
    return magic(bmpR.blob, 'B', 'M')
  })
  let icoR
  await check('png → ico (multi-size)', async () => {
    icoR = await convert(pngFile, 'ico', { sizes: [16, 32, 48] })
    const head = new Uint8Array(await icoR.blob.slice(0, 6).arrayBuffer())
    return head[0] === 0 && head[2] === 1 && head[4] === 3
  })
  await check('png → pdf', async () => magic((await convert(pngFile, 'pdf')).blob, '%', 'P', 'D', 'F'))
  await check('png resize width=50', async () => {
    const r = await convert(pngFile, 'jpg', { width: 50 })
    const bmp2 = await createImageBitmap(r.blob)
    return bmp2.width === 50 && bmp2.height === 30
  })
  await check('bmp → png (round-trip decode)', async () =>
    magic((await convert(new File([bmpR.blob], 'x.bmp'), 'png')).blob, 0x89, 'P', 'N', 'G'))
  await check('ico → png', async () =>
    magic((await convert(new File([icoR.blob], 'x.ico'), 'png')).blob, 0x89, 'P', 'N', 'G'))
  await check('svg → png (rasterized)', async () => {
    const r = await convert(svgFile, 'png')
    const b = await createImageBitmap(r.blob)
    return (await magic(r.blob, 0x89, 'P', 'N', 'G')) && b.width === 1024
  })
  await check('gif → png', async () => magic((await convert(gifFile, 'png')).blob, 0x89, 'P', 'N', 'G'))
  await check('webp → png', async () => {
    const webp = await convert(pngFile, 'webp')
    return magic((await convert(new File([webp.blob], 'x.webp'), 'png')).blob, 0x89, 'P', 'N', 'G')
  })

  // --- OCR (v3) ---
  const textCanvas = document.createElement('canvas')
  textCanvas.width = 600
  textCanvas.height = 160
  const tctx = textCanvas.getContext('2d')
  tctx.fillStyle = '#fff'
  tctx.fillRect(0, 0, 600, 160)
  tctx.fillStyle = '#000'
  tctx.font = 'bold 48px Arial'
  tctx.fillText('HELLO WORLD 42', 40, 95)
  const textPng = await new Promise((r) => textCanvas.toBlob(r, 'image/png'))

  await check('image → txt via OCR', async () => {
    const r = await convert(new File([textPng], 'scan.png'), 'txt')
    const t = (await r.blob.text()).toUpperCase()
    return t.includes('HELLO') && t.includes('WORLD') && t.includes('42')
  })
  await check('scanned pdf → txt auto-OCR fallback', async () => {
    const imgPdf = await convert(new File([textPng], 'scan.png'), 'pdf')
    const r = await convert(new File([imgPdf.blob], 'scan.pdf'), 'txt')
    const t = (await r.blob.text()).toUpperCase()
    return t.includes('HELLO') && t.includes('WORLD')
  })

  // --- batch (v3) ---
  await check('convertMany + zipResults', async () => {
    const files = [1, 2, 3].map((n) => new File([`# Doc ${n}\n\nbody ${n}`], `doc${n}.md`))
    const progressFiles = new Set()
    const results = await convertMany(files, 'txt', {
      onProgress: (p) => progressFiles.add(p.fileIndex),
    })
    if (results.length !== 3 || !results.every((r) => r.ok)) return false
    if (progressFiles.size !== 3) return false
    const zip = await zipResults(results)
    return magic(zip.blob, 'P', 'K')
  })
  await check('convertMany isolates failures', async () => {
    // 0xFF is invalid UTF-8, so this file is genuinely undetectable
    const files = [new File(['# ok'], 'good.md'), new File([new Uint8Array([0xff, 0x00, 0xff])], 'bad.bin')]
    const results = await convertMany(files, 'pdf')
    return results[0].ok && !results[1].ok
  })

  // --- detection & API surface ---
  await check('detectFormat ignores extension', async () => {
    const d1 = await detectFormat(new File([mdPdf.blob], 'liar.txt'))
    const d2 = await detectFormat(new File([pngBlob], 'liar.pdf'))
    const d3 = await detectFormat(new File([SVG], 'liar.txt'))
    const d4 = await detectFormat(new File([icoR.blob], 'liar.png'))
    return d1 === 'pdf' && d2 === 'png' && d3 === 'svg' && d4 === 'ico'
  })
  await check('unsupported pair rejects', async () => {
    try {
      await convert(pngFile, 'md')
      return false
    } catch (e) {
      return e.message.includes('not supported')
    }
  })
  await check('listConversions > 60 pairs', () => listConversions().length > 60)
  await check('window.FormatConvert global registered', () => typeof window.FormatConvert?.convertMany === 'function')

  return out
})
for (const r of sdkReport) log('SDK: ' + r.name, r.ok, r.detail)

// -----------------------------------------------------------------------------
// 2. UI flows
// -----------------------------------------------------------------------------
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
log('UI: home renders', (await page.locator('.card').count()) >= 13, (await page.locator('.card').count()) + ' cards')

await page.setInputFiles('input[type=file]', {
  name: 'notes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Hi\n\ntext'),
})
await page.waitForSelector('.detect-panel', { timeout: 5000 })
log('UI: home auto-detect offers targets', (await page.locator('.detect-panel .chip').count()) >= 3)

await page.locator('.detect-panel .chip', { hasText: 'Text' }).click()
await page.waitForSelector('.output', { timeout: 10000 })
log('UI: home → convert page hand-off converts', (await page.locator('.output').inputValue()).includes('Hi'))

// Batch UI: 3 files through md → pdf
await page.goto(BASE + '/convert/md-to-pdf', { waitUntil: 'networkidle' })
await page.setInputFiles('input[type=file]', [1, 2, 3].map((n) => ({
  name: `doc${n}.md`, mimeType: 'text/markdown', buffer: Buffer.from(`# Doc ${n}\n\nbody`),
})))
await page.waitForSelector('.queue', { timeout: 5000 })
await page.locator('button', { hasText: 'Convert 3 files' }).click()
await page.waitForSelector('.queue .btn-link', { timeout: 20000 })
const batchRows = await page.locator('.queue-row').count()
const zipBtn = await page.locator('button', { hasText: 'Download all' }).count()
log('UI: batch queue converts 3 files + zip-all offered', batchRows === 3 && zipBtn === 1)

await page.goto(BASE + '/convert/pdf-to-nonsense', { waitUntil: 'networkidle' })
log('UI: bad pair shows 404', (await page.locator('h1').textContent()) === '404')

await page.goto(BASE + '/developers', { waitUntil: 'networkidle' })
const devContent = await page.content()
log('UI: developers page (docx row + batch + ocr docs)',
  (await page.locator('.matrix tbody tr').count()) === 13 &&
  devContent.includes('convertMany') && devContent.includes('ocrLanguage'))

// -----------------------------------------------------------------------------
// 3. Embed + postMessage protocol
// -----------------------------------------------------------------------------
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate((base) => {
  window.__embedResult = new Promise((resolve) => {
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'formatconvert:result') resolve({ filename: e.data.filename, size: e.data.blob?.size, to: e.data.to })
    })
  })
  const f = document.createElement('iframe')
  f.src = base + '/embed?from=txt&to=md'
  f.id = 'emb'
  document.body.appendChild(f)
}, BASE)
const frame = page.frameLocator('#emb')
await frame.locator('input[type=file]').setInputFiles({
  name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hello *embed*'),
})
await frame.locator('.output').waitFor({ timeout: 10000 })
const embedResult = await page.evaluate(() => window.__embedResult)
log('Embed: postMessage result received', embedResult.filename === 'note.md' && embedResult.size > 0 && embedResult.to === 'md')

// -----------------------------------------------------------------------------
// 4. PWA: service worker + offline conversion
// -----------------------------------------------------------------------------
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
const swOk = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  return !!reg.active
})
log('PWA: service worker active', swOk)
await page.waitForTimeout(2500) // let precache finish

await context.setOffline(true)
await page.goto(BASE + '/convert/md-to-txt', { waitUntil: 'domcontentloaded' }).catch(() => {})
const offlineRendered = (await page.locator('h1').count()) > 0
let offlineConverted = false
if (offlineRendered) {
  await page.setInputFiles('input[type=file]', {
    name: 'off.md', mimeType: 'text/markdown', buffer: Buffer.from('# Offline\n\nworks'),
  })
  try {
    await page.waitForSelector('.output', { timeout: 10000 })
    offlineConverted = (await page.locator('.output').inputValue()).includes('Offline')
  } catch {
    offlineConverted = false
  }
}
log('PWA: offline app shell + md→txt conversion', offlineRendered && offlineConverted)
await context.setOffline(false)

await browser.close()
stopPreview()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(' | '))
  process.exit(1)
}
process.exit(0)
