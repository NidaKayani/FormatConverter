import { PDFDocument } from 'pdf-lib'
import { parsePageRanges } from '../../lib/pageRanges.js'

async function loadPdf(file) {
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

export default async function extractPages(files, options = {}, onProgress = () => {}) {
  const file = files[0]
  if (!file) throw new Error('Choose a PDF.')
  const doc = await loadPdf(file)
  const pages = parsePageRanges(options.pages || '1', doc.getPageCount())
  onProgress({ stage: 'extract', page: 0, total: pages.length })

  const out = await PDFDocument.create()
  const copied = await out.copyPages(doc, pages.map((n) => n - 1))
  for (const p of copied) out.addPage(p)
  onProgress({ stage: 'encode', page: pages.length, total: pages.length })

  const bytes = await out.save({ useObjectStreams: true })
  const name = (file.name || 'document').replace(/\.pdf$/i, '') + '-extract.pdf'
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name, ext: 'pdf' }
}
