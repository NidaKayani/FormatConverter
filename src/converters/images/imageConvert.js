import { decodeImage } from './decode.js'
import { encodeCanvas } from './encode.js'

/** Any raster/vector image → PNG/JPEG/WebP/BMP/ICO via full decode + re-encode. */
export default async function imageConvert(file, options, onProgress) {
  onProgress({ stage: 'decode' })
  const canvas = await decodeImage(file, options.from)
  onProgress({ stage: 'encode' })
  return encodeCanvas(canvas, options.to, options)
}
