import { jsPDF } from 'jspdf'
import { decodeImage } from './decode.js'

/** Image → single-page PDF, fitted and centered within page margins. */
export default async function imageToPdf(file, options, onProgress) {
  onProgress({ stage: 'decode' })
  const canvas = await decodeImage(file, options.from)

  const doc = new jsPDF({
    unit: 'pt',
    format: options.pageSize || 'a4',
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    compress: true,
  })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 36

  const scale = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height, 1)
  const w = canvas.width * scale
  const h = canvas.height * scale

  onProgress({ stage: 'encode' })
  // JPEG keeps photo-sized PDFs small; PNG preserves transparency
  const hasAlpha = canvasHasAlpha(canvas)
  const type = hasAlpha ? 'PNG' : 'JPEG'
  const dataUrl = canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', 0.92)
  doc.addImage(dataUrl, type, (pageW - w) / 2, (pageH - h) / 2, w, h)

  return doc.output('blob')
}

function canvasHasAlpha(canvas) {
  const { width, height } = canvas
  // Sample the alpha channel on a grid — checking every pixel of a large photo is wasteful
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data
  const step = Math.max(1, Math.floor((width * height) / 10000)) * 4
  for (let i = 3; i < data.length; i += step) {
    if (data[i] < 255) return true
  }
  return false
}
