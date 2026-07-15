/**
 * Assert sitemap URL count matches registry conversions + tools + home/developers.
 * Run: node scripts/docs-check.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { listConversions } = await import(pathToFileURL(join(root, 'src/converters/registry.js')).href)
const { listTools } = await import(pathToFileURL(join(root, 'src/converters/tools.js')).href)

const expected = 2 + listConversions().length + listTools().length // home + developers
const sitemap = readFileSync(join(root, 'public', 'sitemap.xml'), 'utf8')
const locs = [...sitemap.matchAll(/<loc>/g)].length

if (locs !== expected) {
  console.error(`docs-check failed: sitemap has ${locs} URLs, registry expects ${expected}`)
  console.error('Run: node scripts/generate-sitemap.mjs')
  process.exit(1)
}

console.log(`docs-check OK: ${locs} sitemap URLs match registry`)
