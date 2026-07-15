/**
 * After Vite build: emit prerendered HTML shells for every convert pair, tool,
 * home, and developers page; inject home meta into dist/index.html; write OG SVG
 * cards under dist/og/.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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
const {
  ORIGIN,
  HOME_TITLE,
  HOME_DESCRIPTION,
  DEVELOPERS_TITLE,
  DEVELOPERS_DESCRIPTION,
  describePair,
  ogImageUrl,
  CONVERTER_FAQ,
} = await import(pathToFileURL(join(root, 'src/seo/copy.js')).href)

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ogSvg({ title, subtitle }) {
  const t = escapeXml(title).slice(0, 60)
  const sub = escapeXml(subtitle || 'Convert in your browser — nothing uploaded').slice(0, 90)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#1a2744"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="48" y="48" width="1104" height="534" rx="24" fill="none" stroke="#3d5a80" stroke-width="2"/>
  <text x="96" y="180" fill="#7dd3fc" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="36" font-weight="600">FormatConvert</text>
  <text x="96" y="280" fill="#f8fafc" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="52" font-weight="700">${t}</text>
  <text x="96" y="360" fill="#94a3b8" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28">${sub}</text>
  <text x="96" y="520" fill="#64748b" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22">quantumlogicslimited.com</text>
</svg>
`
}

function buildShell(indexHtml, { title, description, path, breadcrumbs, faq }) {
  const fullTitle = title.includes('FormatConvert') ? title : `${title} | FormatConvert`
  const canonical = `${ORIGIN}${path}`
  const image = ogImageUrl(path)
  const graph = [
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
  ]
  if (faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    })
  }
  const jsonLd = { '@context': 'https://schema.org', '@graph': graph }

  let html = indexHtml
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`)

  const headInject = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${escapeHtml(fullTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:site_name" content="FormatConvert" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `

  if (/<meta\s+name=["']description["']/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, '')
  }
  html = html.replace(/<\/head>/i, `${headInject}</head>`)

  const crawlerBody = `<noscript><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></noscript>`
  html = html.replace(/<div id="root"><\/div>/i, `<div id="root"></div>${crawlerBody}`)

  return html
}

const indexHtml = readFileSync(indexPath, 'utf8')
const ogDir = join(dist, 'og')
mkdirSync(ogDir, { recursive: true })

// Also copy default OG into public for dev server convenience
const publicOg = join(root, 'public', 'og')
mkdirSync(publicOg, { recursive: true })

const routes = []

routes.push({
  path: '/',
  out: null, // inject into index.html
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  breadcrumbs: [{ name: 'Home', url: `${ORIGIN}/` }],
  ogName: 'default.svg',
  ogTitle: 'Convert files in your browser',
  ogSubtitle: 'Documents, images, data, media — nothing uploaded',
})

routes.push({
  path: '/developers',
  out: join(dist, 'developers', 'index.html'),
  title: DEVELOPERS_TITLE,
  description: DEVELOPERS_DESCRIPTION,
  breadcrumbs: [
    { name: 'Home', url: `${ORIGIN}/` },
    { name: 'Developers', url: `${ORIGIN}/developers` },
  ],
  ogName: 'developers.svg',
  ogTitle: 'Developer API',
  ogSubtitle: 'Browser SDK — no uploads, no API keys',
})

for (const { from, to } of listConversions()) {
  const title = `${FORMATS[from].label} to ${FORMATS[to].label} Converter`
  const description = describePair(from, to, FORMATS)
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
    faq: CONVERTER_FAQ,
    ogName: `convert-${from}-to-${to}.svg`,
    ogTitle: `${FORMATS[from].label} → ${FORMATS[to].label}`,
    ogSubtitle: description,
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
    faq: CONVERTER_FAQ,
    ogName: `tools-${tool.id}.svg`,
    ogTitle: tool.label,
    ogSubtitle: tool.description,
  })
}

const meta = []
for (const route of routes) {
  const svg = ogSvg({ title: route.ogTitle, subtitle: route.ogSubtitle })
  writeFileSync(join(ogDir, route.ogName), svg)
  if (route.ogName === 'default.svg') {
    writeFileSync(join(publicOg, 'default.svg'), svg)
  }

  const html = buildShell(indexHtml, route)
  if (route.path === '/') {
    // Inject home SEO into the SPA entry so `/` gets correct meta without a separate shell
    writeFileSync(indexPath, html)
  } else {
    mkdirSync(dirname(route.out), { recursive: true })
    writeFileSync(route.out, html)
  }
  meta.push({ path: route.path, title: route.title, og: `/og/${route.ogName}` })
}

writeFileSync(join(dist, 'prerender-meta.json'), JSON.stringify({ count: meta.length, routes: meta }, null, 2))
console.log(`SEO prerender: ${meta.length} shells + OG cards written under dist/`)
console.log('Note: On Vercel, static files (e.g. /convert/.../index.html) take priority over SPA rewrites.')
