import { renderPdfPages } from '../pdfRender.js'
import { encodeCanvas } from './encode.js'

/**
 * PDF → PNG/JPEG. Each page is rendered at the chosen scale. A single-page
 * PDF returns one image; multi-page PDFs return a .zip of numbered pages.
 */
export default async function pdfToImages(file, options, onProgress) {
  const scale = Number(options.scale) || 2
  const canvases = await renderPdfPages(file, scale, onProgress)

  const blobs = []
  for (const canvas of canvases) {
    blobs.push(await encodeCanvas(canvas, options.to, options))
  }

  if (blobs.length === 1) return blobs[0]

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const ext = options.to === 'jpg' ? 'jpg' : 'png'
  const pad = String(blobs.length).length
  blobs.forEach((blob, i) => {
    zip.file(`page-${String(i + 1).padStart(pad, '0')}.${ext}`, blob)
  })
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { blob: zipBlob, ext: 'zip' }
}
