import UTIF from 'utif2'
import { prepareCanvas } from './encode.js'

/** Decode TIFF (first IFD) to a canvas. Encode is uncompressed — documented. */
export async function decodeTiff(file) {
  const buf = await file.arrayBuffer()
  const ifds = UTIF.decode(buf)
  if (!ifds?.length) throw new Error('Could not decode TIFF.')
  UTIF.decodeImage(buf, ifds[0])
  const rgba = UTIF.toRGBA8(ifds[0])
  const canvas = document.createElement('canvas')
  canvas.width = ifds[0].width
  canvas.height = ifds[0].height
  const ctx = canvas.getContext('2d')
  const imageData = new ImageData(new Uint8ClampedArray(rgba), canvas.width, canvas.height)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export function encodeTiff(canvas, options = {}) {
  const prepared = prepareCanvas(canvas, {
    width: options.width,
    background: options.background || '#ffffff',
    flatten: false,
  })
  const { width, height } = prepared
  const rgba = prepared.getContext('2d').getImageData(0, 0, width, height).data
  const buf = UTIF.encodeImage(new Uint8Array(rgba.buffer), width, height)
  return new Blob([buf], { type: 'image/tiff' })
}
