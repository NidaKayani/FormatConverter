/**
 * After Vite build: emit prerendered HTML shells for every convert pair, tool,
 * home, and developers page. Each shell has a complete <head> (title, description,
 * canonical, JSON-LD) and the same SPA script tags as dist/index.html so the app
 * hydrates client-side.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://formatconvert.quantumlogicslimited.com'
const dist = join(root, 'dist')
const indexPath = join(dist, 'index.html')

if (!existsSync(indexPath)) {
  console.error('dist/index.html missing — run vite build first')
  process.exit(1)
}

const { listConversions, FORMATS } = await import(
  pathToFileURL(join(root, 'src/converters/registry.js')).href
)
const { listTools } = await import(pathToFileURL(join(root, 'src/converters/tools.js')).href)

const DESCRIPTIONS = {
  'pdf-txt': 'Extracts real text using each character’s position on the page.',
  'pdf-md': 'Rebuilds document structure from PDF into Markdown.',
  'pdf-html': 'Structured PDF extraction rendered as HTML.',
  'md-pdf': 'Typesets Markdown into a proper PDF in your browser.',
  'html-pdf': 'Renders HTML content into a typeset PDF.',
  'txt-pdf': 'Preserves line structure with clean PDF typesetting.',
  'pdf-png': 'Renders each PDF page to a high-resolution PNG.',
  'pdf-jpg': 'Renders each PDF page to a high-resolution JPEG.',
  'pdf-webp': 'Renders each PDF page to WebP.',
  'pdf-avif': 'Renders each PDF page to AVIF.',
  'toml-json': 'Parses TOML into JSON — types preserved in your browser.',
  'json-toml': 'Converts JSON objects into TOML client-side.',
  'ass-srt': 'Converts ASS/SSA dialogue cues into SRT subtitles.',
  'srt-ass': 'Builds an ASS subtitle script from SRT cues.',
}

const KIND_FALLBACK = {
  image: 'Full decode and re-encode with quality and size options.',
  data: 'Parses and re-serializes structured data entirely in your browser.',
  ebook: 'Reads or builds EPUB 3 packages with real chapter structure.',
  subtitle: 'Converts subtitle cues with accurate timestamps.',
  audio: 'Transcodes audio with ffmpeg.wasm running locally.',
  video: 'Transcodes or extracts from video with ffmpeg.wasm.',
  document: 'A real structural conversion, processed entirely in your browser.',
}

function describe(from, to) {
  const key = `${from}-${to}`
  if (DESCRIPTIONS[key]) return DESCRIPTIONS[key]
  const kind = FORMATS[from]?.kind
  if (FORMATS[to]?.kind === 'image' || kind === 'image') return KIND_FALLBACK.image
  return KIND_FALLBACK[kind] || KIND_FALLBACK.document
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildShell(indexHtml, { title, description, path, breadcrumbs }) {
  const fullTitle = title.includes('FormatConvert') ? title : `${title} | FormatConvert`
  const canonical = `${ORIGIN}${path}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'FormatConvert',
        url: ORIGIN,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.url,
        })),
      },
    ],
  }

  let html = indexHtml
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`)

  const headInject = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${escapeHtml(fullTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `

  if (/<meta\s+name=["']description["']/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, '')
  }
  html = html.replace(/<\/head>/i, `${headInject}</head>`)

  // Visible fallback for crawlers that do not execute JS
  const crawlerBody = `<noscript><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></noscript>`
  html = html.replace(/<div id="root"><\/div>/i, `<div id="root"></div>${crawlerBody}`)

  return html
}

const indexHtml = readFileSync(indexPath, 'utf8')
const routes = []

routes.push({
  path: '/',
  out: join(dist, 'index.prerender.html'),
  title: 'FormatConvert — Convert files in your browser',
  description:
    'Client-side file converter for documents, images, data, ebooks, subtitles, and media. Nothing uploaded.',
  breadcrumbs: [{ name: 'Home', url: `${ORIGIN}/` }],
})

routes.push({
  path: '/developers',
  out: join(dist, 'developers', 'index.html'),
  title: 'Developer API',
  description:
    'Use FormatConvert conversions in your own site with the browser SDK — no uploads, no API keys.',
  breadcrumbs: [
    { name: 'Home', url: `${ORIGIN}/` },
    { name: 'Developers', url: `${ORIGIN}/developers` },
  ],
})

for (const { from, to } of listConversions()) {
  const title = `${FORMATS[from].label} to ${FORMATS[to].label} Converter`
  const description = describe(from, to)
  const path = `/convert/${from}-to-${to}`
  routes.push({
    path,
    out: join(dist, 'convert', `${from}-to-${to}`, 'index.html'),
    title,
    description,
    breadcrumbs: [
      { name: 'Home', url: `${ORIGIN}/` },
      { name: title, url: `${ORIGIN}${path}` },
    ],
  })
}

for (const tool of listTools()) {
  const path = `/tools/${tool.id}`
  routes.push({
    path,
    out: join(dist, 'tools', tool.id, 'index.html'),
    title: `${tool.label} | FormatConvert`,
    description: tool.description,
    breadcrumbs: [
      { name: 'Home', url: `${ORIGIN}/` },
      { name: tool.label, url: `${ORIGIN}${path}` },
    ],
  })
}

const meta = []
for (const route of routes) {
  mkdirSync(dirname(route.out), { recursive: true })
  const html = buildShell(indexHtml, route)
  // Don't overwrite the main SPA index.html shell used for `/`
  if (route.path === '/') {
    writeFileSync(join(dist, 'prerender-home.html'), html)
  } else {
    writeFileSync(route.out, html)
  }
  meta.push({ path: route.path, title: route.title })
}

writeFileSync(join(dist, 'prerender-meta.json'), JSON.stringify({ count: meta.length, routes: meta }, null, 2))
console.log(`SEO prerender: ${meta.length} shells written under dist/`)
