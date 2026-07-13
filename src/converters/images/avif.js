import decodeAvif, { init as initDecode } from '@jsquash/avif/decode'
import encodeAvif, { init as initEncode } from '@jsquash/avif/encode'
import { prepareCanvas } from './encode.js'

let inited = false

async function ensureAvif() {
  if (inited) return
  await initDecode({ locateFile: (path) => `/wasm/${path}` })
  await initEncode({ locateFile: (path) => `/wasm/${path}` })
  inited = true
}

/** Prefer native decode; fall back to jsquash. */
export async function decodeAvifFile(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext('2d').drawImage(bitmap, 0, 0)
      bitmap.close?.()
      return canvas
    } catch {
      // fall through to wasm
    }
  }
  await ensureAvif()
  const imageData = await decodeAvif(await file.arrayBuffer())
  if (!imageData) throw new Error('Could not decode AVIF.')
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  return canvas
}

export async function encodeAvifFile(canvas, options = {}) {
  await ensureAvif()
  const prepared = prepareCanvas(canvas, {
    width: options.width,
    background: options.background || '#ffffff',
    flatten: false,
  })
  const { width, height } = prepared
  const imageData = prepared.getContext('2d').getImageData(0, 0, width, height)
  const quality = Math.round((Number(options.quality) ?? 0.8) * 100)
  const buf = await encodeAvif(imageData, { quality, speed: 6 })
  return new Blob([buf], { type: 'image/avif' })
}
