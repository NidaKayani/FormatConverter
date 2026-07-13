import { PDFDocument } from 'pdf-lib'
import pdfjs from '../pdfjs.js'
import { jsPDF } from 'jspdf'

async function loadPdfLib(file) {
  const bytes = await file.arrayBuffer()
  try {
    return await PDFDocument.load(bytes)
  } catch (e) {
    const msg = e?.message || String(e)
    if (/encrypt|password|encrypted/i.test(msg)) {
      throw new Error('This PDF is encrypted. Decrypt it first, then try again.')
    }
    throw new Error(`Could not read PDF: ${msg}`)
  }
}

/**
 * Compress a PDF.
 * - lossless: pdf-lib re-save with object streams
 * - smaller: rasterize pages via pdf.js → JPEG rebuild (lossy)
 */
export default async function compressPdf(files, options = {}, onProgress = () => {}) {
  const file = files[0]
  if (!file) throw new Error('Choose a PDF to compress.')
  const mode = options.mode || 'lossless'
  const name = (file.name || 'document').replace(/\.pdf$/i, '') + '-compressed.pdf'

  if (mode === 'lossless') {
    onProgress({ stage: 'encode' })
    const doc = await loadPdfLib(file)
    const bytes = await doc.save({ useObjectStreams: true })
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name, ext: 'pdf' }
  }

  // Lossy: rasterize
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const quality = Math.min(1, Math.max(0.4, Number(options.quality) || 0.72))
  const scale = Math.min(2, Math.max(0.5, Number(options.scale) || 1.25))

  let outDoc = null
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress({ stage: 'render', page: i, total: pdf.numPages })
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise

    const w = canvas.width
    const h = canvas.height
    if (!outDoc) {
      outDoc = new jsPDF({ unit: 'pt', format: [w, h], compress: true })
    } else {
      outDoc.addPage([w, h])
    }
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    outDoc.addImage(dataUrl, 'JPEG', 0, 0, w, h)
  }

  return { blob: outDoc.output('blob'), filename: name, ext: 'pdf' }
}
