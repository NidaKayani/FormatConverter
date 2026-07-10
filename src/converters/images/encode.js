import { encodeBmp } from './bmp.js'
import { encodeIco } from './ico.js'

const CANVAS_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
const NO_ALPHA = new Set(['jpg', 'bmp'])

/** Optionally resize, and flatten transparency for formats without alpha. */
export function prepareCanvas(canvas, { width, background = '#ffffff', flatten = false } = {}) {
  const targetW = width ? Math.round(Number(width)) : canvas.width
  const targetH = width
    ? Math.max(1, Math.round(canvas.height * (targetW / canvas.width)))
    : canvas.height

  if (targetW === canvas.width && !flatten) return canvas

  const out = document.createElement('canvas')
  out.width = targetW
  out.height = targetH
  const ctx = out.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (flatten) {
    ctx.fillStyle = background || '#ffffff'
    ctx.fillRect(0, 0, targetW, targetH)
  }
  ctx.drawImage(canvas, 0, 0, targetW, targetH)
  return out
}

export async function encodeCanvas(canvas, to, options = {}) {
  const prepared = prepareCanvas(canvas, {
    width: options.width,
    background: options.background,
    flatten: NO_ALPHA.has(to),
  })

  if (to === 'bmp') return encodeBmp(prepared)
  if (to === 'ico') return encodeIco(prepared, options.sizes)

  const mime = CANVAS_MIME[to]
  if (!mime) throw new Error(`Cannot encode to ${to} in the browser.`)
  const quality = to === 'png' ? undefined : Number(options.quality ?? 0.92)

  return new Promise((resolve, reject) => {
    prepared.toBlob(
      (blob) => {
        if (blob && blob.type === mime) resolve(blob)
        else if (blob) reject(new Error(`Your browser cannot encode ${to.toUpperCase()} images.`))
        else reject(new Error(`Encoding to ${to.toUpperCase()} failed.`))
      },
      mime,
      quality
    )
  })
}
