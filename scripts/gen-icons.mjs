// Rasterizes public/icons/icon.svg into the PWA icon set using headless
// Chrome. Run once when the icon changes: node scripts/gen-icons.mjs
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/icons/icon.svg'), 'utf8')

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const page = await browser.newPage()

const render = (size, maskablePad = 0) =>
  page.evaluate(
    async ({ svg, size, maskablePad }) => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const img = new Image()
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      await new Promise((ok, err) => {
        img.onload = ok
        img.onerror = err
        img.src = url
      })
      if (maskablePad) {
        // Maskable icons need the artwork inside the safe zone on a solid bg
        ctx.fillStyle = '#090a0f'
        ctx.fillRect(0, 0, size, size)
        const inner = size - maskablePad * 2
        ctx.drawImage(img, maskablePad, maskablePad, inner, inner)
      } else {
        ctx.drawImage(img, 0, 0, size, size)
      }
      return canvas.toDataURL('image/png').split(',')[1]
    },
    { svg, size, maskablePad }
  )

const targets = [
  ['icon-192.png', await render(192)],
  ['icon-512.png', await render(512)],
  ['icon-maskable-512.png', await render(512, 60)],
]
for (const [name, b64] of targets) {
  writeFileSync(join(root, 'public/icons', name), Buffer.from(b64, 'base64'))
  console.log('wrote', name)
}
await browser.close()
