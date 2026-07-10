import pdfjsLib from '../pdfjs.js'
import { encodeCanvas } from './encode.js'

/**
 * PDF → PNG/JPEG. Each page is rendered at the chosen scale. A single-page
 * PDF returns one image; multi-page PDFs return a .zip of numbered pages.
 */
export default async function pdfToImages(file, options, onProgress) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const total = pdf.numPages
  const scale = Number(options.scale) || 2

  const blobs = []
  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    blobs.push(await encodeCanvas(canvas, options.to, options))
    onProgress({ page: pageNum, total, stage: 'render' })
  }

  if (blobs.length === 1) return blobs[0]

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const ext = options.to === 'jpg' ? 'jpg' : 'png'
  const pad = String(total).length
  blobs.forEach((blob, i) => {
    zip.file(`page-${String(i + 1).padStart(pad, '0')}.${ext}`, blob)
  })
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { blob: zipBlob, ext: 'zip' }
}
