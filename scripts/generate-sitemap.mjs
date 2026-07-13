/**
 * Emit public/sitemap.xml + robots.txt from the converter registry + tools.
 * Both modules are DOM-free so this can run at build time in Node.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://formatconvert.quantumlogicslimited.com'

const { listConversions } = await import(pathToFileURL(join(root, 'src/converters/registry.js')).href)
const { listTools } = await import(pathToFileURL(join(root, 'src/converters/tools.js')).href)

const urls = [
  { loc: `${ORIGIN}/`, priority: '1.0' },
  { loc: `${ORIGIN}/developers`, priority: '0.8' },
]

for (const { from, to } of listConversions()) {
  urls.push({ loc: `${ORIGIN}/convert/${from}-to-${to}`, priority: '0.7' })
}
for (const tool of listTools()) {
  urls.push({ loc: `${ORIGIN}/tools/${tool.id}`, priority: '0.7' })
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`

const robots = `User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`

const outDir = join(root, 'public')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'sitemap.xml'), sitemap)
writeFileSync(join(outDir, 'robots.txt'), robots)
console.log(`Sitemap written with ${urls.length} URLs`)
