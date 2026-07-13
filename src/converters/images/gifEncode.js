import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { prepareCanvas } from './encode.js'

/** Encode a canvas as a (possibly single-frame) GIF. */
export function encodeGif(canvas, options = {}) {
  const prepared = prepareCanvas(canvas, {
    width: options.width,
    background: options.background || '#ffffff',
    flatten: true,
  })
  const { width, height } = prepared
  const rgba = prepared.getContext('2d').getImageData(0, 0, width, height).data
  const palette = quantize(rgba, Math.min(256, Number(options.colors) || 256))
  const index = applyPalette(rgba, palette)
  const gif = GIFEncoder()
  gif.writeFrame(index, width, height, {
    palette,
    delay: Number(options.delay) || 0,
    repeat: 0,
  })
  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}

/** Animated GIF from multiple image files (ordered). */
export default async function imagesToGif(files, options = {}, onProgress = () => {}) {
  if (!files?.length) throw new Error('Add at least one image.')
  const { decodeImage } = await import('./decode.js')
  const { detectFormat } = await import('../detect.js')
  const delay = Number(options.delay) || 100

  const frames = []
  let width = 0
  let height = 0
  for (let i = 0; i < files.length; i++) {
    onProgress({ stage: 'decode', page: i + 1, total: files.length, file: files[i] })
    const format = await detectFormat(files[i])
    const canvas = await decodeImage(files[i], format)
    if (!width) {
      width = canvas.width
      height = canvas.height
    }
    const prepared = prepareCanvas(canvas, {
      width: options.width || width,
      background: '#ffffff',
      flatten: true,
    })
    // Match first frame size
    if (prepared.width !== width || prepared.height !== height) {
      const fitted = document.createElement('canvas')
      fitted.width = width
      fitted.height = height
      const ctx = fitted.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      const scale = Math.min(width / prepared.width, height / prepared.height)
      const w = prepared.width * scale
      const h = prepared.height * scale
      ctx.drawImage(prepared, (width - w) / 2, (height - h) / 2, w, h)
      frames.push(fitted)
    } else {
      frames.push(prepared)
    }
  }

  onProgress({ stage: 'encode' })
  const gif = GIFEncoder()
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const rgba = frame.getContext('2d').getImageData(0, 0, width, height).data
    const palette = quantize(rgba, 256)
    const index = applyPalette(rgba, palette)
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: i === 0 ? 0 : undefined,
    })
  }
  gif.finish()
  return {
    blob: new Blob([gif.bytes()], { type: 'image/gif' }),
    filename: 'animation.gif',
    ext: 'gif',
  }
}
