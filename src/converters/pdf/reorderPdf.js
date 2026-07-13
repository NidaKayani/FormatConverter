import { PDFDocument } from 'pdf-lib'

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

/** Parse "3,1,2" or "reverse" into 0-based indices. */
function orderIndices(raw, pageCount) {
  const s = String(raw || '').trim().toLowerCase()
  if (!s || s === 'reverse') {
    return Array.from({ length: pageCount }, (_, i) => pageCount - 1 - i)
  }
  const parts = s.split(/[,;\s]+/).filter(Boolean)
  const indices = parts.map((p) => {
    const n = Number(p)
    if (!Number.isInteger(n) || n < 1 || n > pageCount) {
      throw new Error(`Invalid page number "${p}". Use 1–${pageCount}.`)
    }
    return n - 1
  })
  if (!indices.length) throw new Error('Provide a page order, e.g. 3,1,2 or reverse.')
  return indices
}

export default async function reorderPdf(files, options = {}, onProgress = () => {}) {
  const file = files[0]
  if (!file) throw new Error('Choose a PDF to reorder.')
  const src = await loadPdf(file)
  const pageCount = src.getPageCount()
  const order = orderIndices(options.order, pageCount)

  const out = await PDFDocument.create()
  onProgress({ stage: 'encode', page: 0, total: order.length })
  const copied = await out.copyPages(src, order)
  for (let i = 0; i < copied.length; i++) {
    out.addPage(copied[i])
    onProgress({ stage: 'encode', page: i + 1, total: order.length })
  }

  const bytes = await out.save({ useObjectStreams: true })
  const name = (file.name || 'reordered.pdf').replace(/\.pdf$/i, '') + '-reordered.pdf'
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name, ext: 'pdf' }
}
