import { jsPDF } from 'jspdf'
import { decodeImage } from '../images/decode.js'
import { detectFormat } from '../detect.js'

function canvasHasAlpha(canvas) {
  const { width, height } = canvas
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data
  const step = Math.max(1, Math.floor((width * height) / 10000)) * 4
  for (let i = 3; i < data.length; i += step) {
    if (data[i] < 255) return true
  }
  return false
}

/** Combine multiple images into one multi-page PDF (fit/center per page). */
export default async function imagesToPdf(files, options = {}, onProgress = () => {}) {
  if (!files?.length) throw new Error('Add at least one image.')
  const pageSize = options.pageSize || 'a4'
  let doc = null

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress({ stage: 'decode', page: i + 1, total: files.length, file, fileIndex: i, fileCount: files.length })
    const format = (await detectFormat(file)) || options.from
    const canvas = await decodeImage(file, format)

    const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait'
    if (!doc) {
      doc = new jsPDF({ unit: 'pt', format: pageSize, orientation, compress: true })
    } else {
      doc.addPage(pageSize, orientation)
    }

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 36
    const scale = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height, 1)
    const w = canvas.width * scale
    const h = canvas.height * scale

    onProgress({ stage: 'encode', page: i + 1, total: files.length })
    const hasAlpha = canvasHasAlpha(canvas)
    const type = hasAlpha ? 'PNG' : 'JPEG'
    const dataUrl = canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', 0.92)
    doc.addImage(dataUrl, type, (pageW - w) / 2, (pageH - h) / 2, w, h)
  }

  return {
    blob: doc.output('blob'),
    filename: 'images.pdf',
    ext: 'pdf',
  }
}
