import { decodeImage } from '../images/decode.js'
import { ocrCanvases } from './ocr.js'

/** Photo/scan → text via OCR. */
export default async function imageToTxt(file, options, onProgress) {
  onProgress({ stage: 'decode' })
  const canvas = await decodeImage(file, options.from)
  const [text] = await ocrCanvases([canvas], options, onProgress)
  if (!text) throw new Error('No readable text was found in this image.')
  return new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' })
}
